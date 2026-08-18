// @ts-check

/**
 * VIEWER RUNTIME — Standalone browser runtime for Cartogen HTML exports.
 * Renders serialized 3D scene graphs using Three.js and OrbitControls.
 * Includes interactive navigation, lighting presets, node inspection tooltips, and OSM attribution.
 */
export function initCartogenViewer(sceneData, container) {
  if (!container || !window.THREE) {
    console.error('Cartogen Viewer: Missing container or Three.js library');
    return;
  }

  const THREE = window.THREE;
  const OrbitControls = window.THREE.OrbitControls || window.OrbitControls;

  // 1. SCENE SETUP
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 1.0, 30000);
  camera.position.set(200, 180, 250);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  container.appendChild(renderer.domElement);

  // 2. ORBIT CONTROLS
  let controls = null;
  if (OrbitControls) {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 4000;
    controls.minDistance = 5;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.target.set(0, 0, 0);
  }

  // 3. LIGHTING PRESETS
  const themeMode = sceneData.settings?.themeMode || 'day';
  const LIGHTING_PRESETS = {
    day: {
      bg: '#0f172a',
      ground: '#9aa877',
      ambient: '#ffffff',
      ambientIntensity: 0.7,
      sunColor: '#fffbeb',
      sunIntensity: 1.2,
      sunPos: [200, 300, 150],
    },
    sunset: {
      bg: '#1e1b2e',
      ground: '#2a2438',
      ambient: '#fed7aa',
      ambientIntensity: 0.5,
      sunColor: '#f97316',
      sunIntensity: 1.5,
      sunPos: [300, 80, -200],
    },
    night: {
      bg: '#030712',
      ground: '#0b0f19',
      ambient: '#38bdf8',
      ambientIntensity: 0.25,
      sunColor: '#818cf8',
      sunIntensity: 0.4,
      sunPos: [100, 200, -100],
    },
  };

  const preset = LIGHTING_PRESETS[themeMode] || LIGHTING_PRESETS.day;
  scene.background = new THREE.Color(preset.bg);

  const ambLight = new THREE.AmbientLight(preset.ambient, preset.ambientIntensity);
  scene.add(ambLight);

  const dirLight = new THREE.DirectionalLight(preset.sunColor, preset.sunIntensity);
  dirLight.position.set(...preset.sunPos);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 10;
  dirLight.shadow.camera.far = 2000;
  dirLight.shadow.camera.left = -600;
  dirLight.shadow.camera.right = 600;
  dirLight.shadow.camera.top = 600;
  dirLight.shadow.camera.bottom = -600;
  scene.add(dirLight);

  // 4. INFINITE GROUND PLANE
  const groundGeo = new THREE.PlaneGeometry(30000, 30000);
  const groundMat = new THREE.MeshStandardMaterial({
    color: preset.ground,
    roughness: 1,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = -0.2;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  // 5. GRID HELPER
  if (sceneData.settings?.showGrid !== false) {
    const grid = new THREE.GridHelper(4000, 160, '#38bdf8', '#334155');
    grid.position.y = 0.05;
    scene.add(grid);
  }

  // 6. NODE MESH GENERATOR
  const clickableMeshes = [];

  (sceneData.nodes || []).forEach((node) => {
    try {
      const group = buildNodeMesh(node, THREE);
      if (group) {
        scene.add(group);
        group.traverse((child) => {
          if (child.isMesh) {
            child.userData.node = node;
            clickableMeshes.push(child);
          }
        });
      }
    } catch (err) {
      console.warn('Failed to build export node:', node, err);
    }
  });

  // 7. INTERACTIVE HOVER / CLICK TOOLTIP
  const tooltipEl = document.createElement('div');
  tooltipEl.style.position = 'fixed';
  tooltipEl.style.display = 'none';
  tooltipEl.style.pointerEvents = 'none';
  tooltipEl.style.zIndex = '1000';
  tooltipEl.style.padding = '6px 12px';
  tooltipEl.style.background = 'rgba(15, 23, 42, 0.9)';
  tooltipEl.style.border = '1px solid rgba(255, 255, 255, 0.15)';
  tooltipEl.style.borderRadius = '8px';
  tooltipEl.style.color = '#ffffff';
  tooltipEl.style.fontFamily = 'sans-serif';
  tooltipEl.style.fontSize = '12px';
  tooltipEl.style.backdropFilter = 'blur(10px)';
  tooltipEl.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.5)';
  document.body.appendChild(tooltipEl);

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(clickableMeshes);

    if (intersects.length > 0) {
      const node = intersects[0].object.userData.node;
      if (node && (node.name || node.type)) {
        tooltipEl.style.display = 'block';
        tooltipEl.style.left = `${e.clientX + 14}px`;
        tooltipEl.style.top = `${e.clientY + 14}px`;
        tooltipEl.innerHTML = `
          <div style="font-weight: 600; color: #38bdf8;">${escapeHtml(node.name || node.type.toUpperCase())}</div>
          <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">Type: ${node.type}</div>
        `;
        return;
      }
    }
    tooltipEl.style.display = 'none';
  });

  // 8. RESIZE & ANIMATION LOOP
  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    renderer.render(scene, camera);
  }
  animate();
}

/** Helper: Escape raw strings to prevent HTML injection */
function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (m) => {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}

/** Helper: Construct Three.js meshes from node JSON definitions */
function buildNodeMesh(node, THREE) {
  const group = new THREE.Group();

  if (node.type === 'building' && node.footprint?.length >= 3) {
    const height = node.height || 10;
    const floors = node.floors || Math.max(1, Math.round(height / 3.2));
    const kind = node.kind || 'default';

    const KIND_STYLES = {
      default: { color: '#d9d6cf', roof: '#c2beb4' },
      civic: { color: '#d3d7dc', roof: '#b9bcc2' },
      commercial: { color: '#d0d4cf', roof: '#b6bab4' },
      residential: { color: '#cf9f83', roof: '#a9573f' },
      landmark: { color: '#e0d3bd', roof: '#cbb592' },
    };

    const style = KIND_STYLES[kind] || KIND_STYLES.default;
    const wallColor = node.wallColor || style.color;
    const roofColor = node.roofColor || style.roof;

    // 1) Main extruded building body
    const shape = new THREE.Shape();
    node.footprint.forEach(([x, z], i) => (i === 0 ? shape.moveTo(x, -z) : shape.lineTo(x, -z)));
    const geom = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
    geom.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.8, polygonOffset: true });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    // 2) Floor divider ledges
    if (floors > 1) {
      const ledgesGeom = buildFloorLedgesGeom(node.footprint, height, floors, 0.25, THREE);
      if (ledgesGeom) {
        const ledgesMat = new THREE.MeshStandardMaterial({ color: '#71717a', roughness: 0.6, metalness: 0.2 });
        const ledgesMesh = new THREE.Mesh(ledgesGeom, ledgesMat);
        ledgesMesh.castShadow = true; ledgesMesh.receiveShadow = true;
        group.add(ledgesMesh);
      }
    }

    // 3) Glass Window Facade Columns
    if (['commercial', 'civic', 'landmark'].includes(kind)) {
      const windowsGeom = buildWindowColumnsGeom(node.footprint, height, floors, THREE);
      if (windowsGeom) {
        const windowsMat = new THREE.MeshStandardMaterial({
          color: '#38bdf8',
          emissive: '#38bdf8',
          emissiveIntensity: 0.25,
          roughness: 0.2,
          metalness: 0.8,
          side: THREE.DoubleSide,
        });
        const windowsMesh = new THREE.Mesh(windowsGeom, windowsMat);
        windowsMesh.castShadow = true; windowsMesh.receiveShadow = true;
        group.add(windowsMesh);
      }
    }

    // 4) Top Roof Parapet Wall
    if (floors >= 2) {
      const parapetGeom = buildRoofParapetGeom(node.footprint, height, 0.8, 0.3, THREE);
      if (parapetGeom) {
        const parapetMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.7 });
        const parapetMesh = new THREE.Mesh(parapetGeom, parapetMat);
        parapetMesh.castShadow = true; parapetMesh.receiveShadow = true;
        group.add(parapetMesh);
      }
    }

    // 5) Rooftop Penthouse Box
    if (['commercial', 'civic'].includes(kind) && height > 12) {
      const penthouseGeom = buildRoofPenthouseGeom(node.footprint, height, 3.2, THREE);
      if (penthouseGeom) {
        const penthouseMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.6 });
        const penthouseMesh = new THREE.Mesh(penthouseGeom, penthouseMat);
        penthouseMesh.castShadow = true; penthouseMesh.receiveShadow = true;
        group.add(penthouseMesh);
      }
    }
  }

  else if (node.type === 'surface' && node.polygon?.length >= 3) {
    const shape = new THREE.Shape();
    node.polygon.forEach(([x, z], i) => (i === 0 ? shape.moveTo(x, -z) : shape.lineTo(x, -z)));
    const geom = new THREE.ShapeGeometry(shape);
    geom.rotateX(-Math.PI / 2);

    const matColors = {
      lawn: '#93c46f', grass: '#93c46f', dry_grass: '#b5c48b', forest: '#5f8f4e', water: '#7fb4dd',
      sand: '#e4d6ad', plaza: '#e6ddcb', parking: '#3a3a40', pitch: '#6fae5a', bare: '#c7b78f',
      light_soil: '#d9cbb7', mud: '#a3917b', soil: '#d9cbb7',
    };

    const mat = new THREE.MeshStandardMaterial({
      color: matColors[node.material] || '#93c46f',
      roughness: 0.9,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.y = 0.15;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  else if (node.type === 'path' && node.polyline?.length >= 2) {
    const pathClass = node.pathClass || 'street';
    const width = node.widthOverride || (pathClass === 'major' ? 13 : pathClass === 'walkway' ? 4.2 : 8);
    const border = pathClass === 'major' ? 3.5 : pathClass === 'walkway' ? 2.2 : 2.6;
    const yBase = 0.40 + (node.elevation || 0);

    // Casing border underneath
    const casingGeom = buildRibbonGeom(node.polyline, width + border, THREE);
    if (casingGeom) {
      const casingColor = node.casingColor || (pathClass === 'major' ? '#26262b' : pathClass === 'walkway' ? '#a98f5f' : '#333338');
      const casingMat = new THREE.MeshStandardMaterial({
        color: casingColor,
        roughness: 0.9,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
        side: THREE.DoubleSide,
      });
      const casingMesh = new THREE.Mesh(casingGeom, casingMat);
      casingMesh.position.y = yBase - 0.01;
      casingMesh.receiveShadow = true;
      group.add(casingMesh);
    }

    // Colored road fill on top
    const fillGeom = buildRibbonGeom(node.polyline, width, THREE);
    if (fillGeom) {
      const fillColor = node.fillColor || (pathClass === 'major' ? '#3f3f46' : pathClass === 'walkway' ? '#f6f0e2' : '#55555c');
      const fillMat = new THREE.MeshStandardMaterial({
        color: fillColor,
        roughness: 0.8,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
        side: THREE.DoubleSide,
      });
      const fillMesh = new THREE.Mesh(fillGeom, fillMat);
      fillMesh.position.y = yBase;
      fillMesh.receiveShadow = true;
      group.add(fillMesh);
    }
  }

  else if (node.type === 'composed') {
    const [cx, cz] = node.position || [0, 0];
    group.position.set(cx, 0, cz);
    if (node.rotation) group.rotation.y = node.rotation;

    (node.parts || []).forEach((part) => {
      let partGeom = null;
      const size = part.size || [1, 1, 1];

      if (part.shape === 'cylinder') {
        const r = part.radius ?? (size[0] / 2);
        const h = part.height ?? size[1];
        partGeom = new THREE.CylinderGeometry(r, r, h, 16);
      } else if (part.shape === 'sphere') {
        const r = part.radius ?? (size[0] / 2);
        partGeom = new THREE.SphereGeometry(r, 16, 16);
      } else {
        partGeom = new THREE.BoxGeometry(size[0], size[1], size[2]);
      }

      const mat = new THREE.MeshStandardMaterial({
        color: part.color || '#94a3b8',
        roughness: part.material === 'glass' ? 0.1 : 0.6,
        transparent: part.material === 'glass',
        opacity: part.material === 'glass' ? 0.6 : 1.0,
      });

      const mesh = new THREE.Mesh(partGeom, mat);
      const [px, py, pz] = part.position || [0, 0, 0];
      mesh.position.set(px, py, pz);
      if (part.rotationY) mesh.rotation.y = part.rotationY;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    });
  }

  else if (node.type === 'tree') {
    const [tx, tz] = node.position || [0, 0];
    const h = node.height || 6;
    const r = node.radius || 2.5;

    // Trunk
    const trunkGeom = new THREE.CylinderGeometry(0.3, 0.4, h * 0.4, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#5c4033', roughness: 0.9 });
    const trunkMesh = new THREE.Mesh(trunkGeom, trunkMat);
    trunkMesh.position.set(tx, (h * 0.4) / 2, tz);
    trunkMesh.castShadow = true;
    group.add(trunkMesh);

    // Canopy
    const canopyGeom = new THREE.ConeGeometry(r, h * 0.7, 8);
    const canopyMat = new THREE.MeshStandardMaterial({ color: '#2e7d32', roughness: 0.8 });
    const canopyMesh = new THREE.Mesh(canopyGeom, canopyMat);
    canopyMesh.position.set(tx, h * 0.4 + (h * 0.7) / 2, tz); canopyMesh.castShadow = true; group.add(canopyMesh);
  }

  return group;
}

/** Helper: Construct robust 3D ribbon geometry for roads & walkways */
function buildRibbonGeom(points, width, THREE) {
  if (!points || points.length < 2) return null;
  const hw = width / 2;
  const pos = [];

  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i];
    const [bx, bz] = points[i + 1];
    let dx = bx - ax, dz = bz - az;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len; dz /= len;
    const nx = -dz * hw, nz = dx * hw;

    pos.push(ax + nx, 0, az + nz, ax - nx, 0, az - nz, bx + nx, 0, bz + nz);
    pos.push(ax - nx, 0, az - nz, bx - nx, 0, bz - nz, bx + nx, 0, bz + nz);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geom.computeVertexNormals();
  return geom;
}

function buildFloorLedgesGeom(ring, height, floors, ledgeWidth, THREE) {
  const numFloors = Math.max(1, Math.round(floors));
  const floorHeight = height / numFloors;
  const pos = [];

  for (let f = 1; f < numFloors; f++) {
    const y = f * floorHeight;
    for (let i = 0; i < ring.length - 1; i++) {
      const [ax, az] = ring[i], [bx, bz] = ring[i + 1];
      let dx = bx - ax, dz = bz - az; const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
      const nx = -dz * ledgeWidth, nz = dx * ledgeWidth;
      pos.push(ax, y, az, ax + nx, y, az + nz, bx + nx, y, bz + nz, ax, y, az, bx + nx, y, bz + nz, bx, y, bz);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function buildWindowColumnsGeom(ring, height, floors, THREE) {
  const numFloors = Math.max(1, Math.round(floors));
  const floorHeight = height / numFloors;
  const pos = [];

  for (let i = 0; i < ring.length - 1; i++) {
    const [ax, az] = ring[i], [bx, bz] = ring[i + 1];
    const segLen = Math.hypot(bx - ax, bz - az);
    if (segLen < 3) continue;

    let dx = bx - ax, dz = bz - az;
    dx /= segLen; dz /= segLen;
    const nx = -dz * 0.08, nz = dx * 0.08;
    const spacing = 3.5;
    const numCols = Math.max(1, Math.floor(segLen / spacing));

    for (let c = 0; c < numCols; c++) {
      const t1 = (c + 0.3) / numCols;
      const t2 = (c + 0.7) / numCols;
      const wx1 = ax + dx * (t1 * segLen), wz1 = az + dz * (t1 * segLen);
      const wx2 = ax + dx * (t2 * segLen), wz2 = az + dz * (t2 * segLen);

      for (let f = 0; f < numFloors; f++) {
        const yBottom = f * floorHeight + 0.9;
        const yTop = (f + 1) * floorHeight - 0.4;
        if (yTop <= yBottom) continue;

        pos.push(
          wx1 + nx, yBottom, wz1 + nz, wx2 + nx, yBottom, wz2 + nz, wx2 + nx, yTop, wz2 + nz,
          wx1 + nx, yBottom, wz1 + nz, wx2 + nx, yTop, wz2 + nz, wx1 + nx, yTop, wz1 + nz
        );
      }
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function buildRoofParapetGeom(ring, height, parapetHeight, parapetWidth, THREE) {
  const pos = []; const yTop = height + parapetHeight;
  for (let i = 0; i < ring.length - 1; i++) {
    const [ax, az] = ring[i], [bx, bz] = ring[i + 1];
    let dx = bx - ax, dz = bz - az; const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
    const nx = -dz * parapetWidth, nz = dx * parapetWidth;
    pos.push(
      ax, height, az, ax, yTop, az, bx, yTop, bz, ax, height, az, bx, yTop, bz, bx, height, bz,
      ax, yTop, az, ax + nx, yTop, az + nz, bx + nx, yTop, bz + nz, ax, yTop, az, bx + nx, yTop, bz + nz, bx, yTop, bz
    );
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function buildRoofPenthouseGeom(ring, height, penthouseHeight, THREE) {
  let cx = 0, cz = 0;
  ring.forEach(([x, z]) => { cx += x; cz += z; });
  cx /= ring.length; cz /= ring.length;
  const geom = new THREE.BoxGeometry(6, penthouseHeight, 5);
  geom.translate(cx, height + penthouseHeight / 2, cz);
  return geom;
}
