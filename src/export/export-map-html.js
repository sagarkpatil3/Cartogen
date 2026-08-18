// @ts-check
import { serializeScene } from './serialize-scene.js';

/**
 * EXPORT MAP AS HTML PIPELINE — Standalone MapLibre GL + Three.js 3D Map Exporter.
 * Packages scene JSON into an interactive OpenStreetMap basemap with 3D custom layer rendering at [lat, lng].
 *
 * @param {Array<object>} nodes Scene nodes array
 * @param {{ lat: number, lng: number, name?: string }} origin Geographic origin coordinates
 * @param {{ projectName?: string, themeMode?: string, showGrid?: boolean }} [settings] Scene settings
 */
export function exportMapAsHtml(nodes, origin, settings = {}) {
  const scenePayload = serializeScene(nodes, origin, settings);
  const title = settings.projectName || 'Cartogen Site Plan';

  // Security: Escape script closing tags to prevent XSS / script termination injection
  const safeJson = JSON.stringify(scenePayload, null, 2).replace(/</g, '\\u003c');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} — Cartogen 3D Map</title>
  
  <!-- MapLibre GL CSS & JS -->
  <link href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" rel="stylesheet" />
  <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
  
  <!-- Three.js Library -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>

  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; overflow: hidden; background: #070a12; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    
    #brand-badge {
      position: fixed; top: 16px; left: 16px; z-index: 100;
      display: flex; align-items: center; gap: 8px;
      padding: 8px 14px; background: rgba(11, 15, 25, 0.85);
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px;
      color: #ffffff; font-size: 13px; font-weight: 600;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5);
    }
    #brand-badge span.location { font-size: 11px; font-weight: 400; color: #38bdf8; background: rgba(56,189,248,0.1); padding: 2px 6px; border-radius: 4px; }

    #wayfinding-widget {
      position: fixed; top: 70px; left: 16px; z-index: 100; w-width: 320px; width: 320px;
      padding: 14px; background: rgba(11, 15, 25, 0.9);
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 14px;
      color: #ffffff; font-size: 12px;
      box-shadow: 0 20px 40px -10px rgba(0,0,0,0.6);
    }
    #wayfinding-widget select, #wayfinding-widget button {
      width: 100%; font-size: 12px; padding: 6px 10px; border-radius: 8px; margin-top: 6px;
    }
    #wayfinding-widget select { background: #070a12; border: 1px solid rgba(255,255,255,0.15); color: #fff; }
    #wayfinding-widget .btn-ada { background: rgba(56,189,248,0.2); border: 1px solid #38bdf8; color: #38bdf8; font-weight: 600; cursor: pointer; }
    #wayfinding-widget .btn-std { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: #ccc; font-weight: 600; cursor: pointer; }
    #wayfinding-widget .active-prof { background: #0284c7 !important; color: #fff !important; }

    #attribution {
      position: fixed; bottom: 12px; right: 12px; z-index: 100;
      font-size: 11px; color: #94a3b8;
      background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px);
      padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08);
    }
    #attribution a { color: #38bdf8; text-decoration: none; font-weight: 500; }
    #attribution a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div id="map"></div>

  <!-- Brand Badge Header -->
  <div id="brand-badge">
    <div>${escapeHtml(title)}</div>
    ${scenePayload.origin.name ? `<span class="location">📍 ${escapeHtml(scenePayload.origin.name)}</span>` : ''}
  </div>

  <!-- Wayfinding Route Finder Widget -->
  <div id="wayfinding-widget">
    <div style="font-weight: 600; font-size: 13px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
      <span>🧭 Campus Navigation</span>
      <span style="font-size: 10px; color: #38bdf8; background: rgba(56,189,248,0.15); padding: 2px 6px; border-radius: 4px;">ADA Wayfinding</span>
    </div>

    <div style="display: flex; gap: 6px; margin-bottom: 8px;">
      <button id="btn-prof-ada" class="btn-ada active-prof" onclick="setExportProfile('accessible')">♿ ADA Route</button>
      <button id="btn-prof-std" class="btn-std" onclick="setExportProfile('standard')">🚶 Standard</button>
    </div>

    <label style="color: #94a3b8; font-size: 10px; font-weight: 600; text-transform: uppercase;">Start Location</label>
    <select id="select-start" onchange="runExportRoute()"></select>

    <label style="color: #94a3b8; font-size: 10px; font-weight: 600; text-transform: uppercase; margin-top: 8px; display: block;">Destination</label>
    <select id="select-end" onchange="runExportRoute()"></select>

    <div id="route-result" style="margin-top: 10px; padding: 8px; background: rgba(0,0,0,0.4); border-radius: 8px; font-size: 11px; display: none;"></div>
  </div>

  <!-- OSM Compliance Attribution -->
  <div id="attribution">
    © <a href="https://openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors | Cartogen 3D Map
  </div>

  <!-- Embedded Scene Data -->
  <script type="application/json" id="cartogen-map-scene">${safeJson}</script>

  <!-- Map + 3D Custom Layer Runtime Script -->
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      try {
        const sceneData = JSON.parse(document.getElementById('cartogen-map-scene').textContent);
        initCartogenMapViewer(sceneData, 'map');
      } catch (err) {
        console.error('Failed to initialize 3D Map viewer:', err);
      }
    });

    function initCartogenMapViewer(sceneData, containerId) {
      if (!window.maplibregl || !window.THREE) return;

      const originLng = sceneData.origin?.lng || -117.3223;
      const originLat = sceneData.origin?.lat || 34.1819;

      const map = new maplibregl.Map({
        container: containerId,
        style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
        center: [originLng, originLat],
        zoom: 16.5,
        pitch: 60,
        bearing: -20,
        antialias: true
      });

      map.addControl(new maplibregl.NavigationControl(), 'top-right');

      // MapLibre GL 3D Custom Layer for Cartogen Scene Graph
      const customLayer = {
        id: 'cartogen-3d-scene',
        type: 'custom',
        renderingMode: '3d',
        onAdd: function (map, gl) {
          this.camera = new THREE.Camera();
          this.scene = new THREE.Scene();

          const modelOrigin = [originLng, originLat];
          const modelAltitude = 0;
          const mercator = maplibregl.MercatorCoordinate.fromLngLat(modelOrigin, modelAltitude);

          this.modelTransform = {
            translateX: mercator.x,
            translateY: mercator.y,
            translateZ: mercator.z,
            scale: mercator.meterInMercatorCoordinateUnits()
          };

          // Lighting
          const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
          this.scene.add(ambientLight);

          const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.2);
          sunLight.position.set(200, 300, 150);
          this.scene.add(sunLight);

          // Add 3D Nodes
          (sceneData.nodes || []).forEach((node) => {
            try {
              const group = buildMapNodeMesh(node, THREE);
              if (group) this.scene.add(group);
            } catch (err) {
              console.warn('Map node render error:', err);
            }
          });

          this.renderer = new THREE.WebGLRenderer({
            canvas: map.getCanvas(),
            context: gl,
            antialias: true
          });
          this.renderer.autoClear = false;
        },
        render: function (gl, matrix) {
          const rotationX = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);
          const m = new THREE.Matrix4().fromArray(matrix);
          const l = new THREE.Matrix4()
            .makeTranslation(this.modelTransform.translateX, this.modelTransform.translateY, this.modelTransform.translateZ)
            .scale(new THREE.Vector3(this.modelTransform.scale, -this.modelTransform.scale, this.modelTransform.scale))
            .multiply(rotationX);

          this.camera.projectionMatrix = m.multiply(l);
          this.renderer.resetState();
          this.renderer.render(this.scene, this.camera);
          map.triggerRepaint();
        }
      };

      map.on('style.load', () => {
        map.addLayer(customLayer);
      });
    }

    function buildMapNodeMesh(node, THREE) {
      const group = new THREE.Group();

      if (node.type === 'building' && node.footprint?.length >= 3) {
        const height = node.height || 10;
        const floors = node.floors || Math.max(1, Math.round(height / 3.2));
        const kind = node.kind || 'default';

        const KIND_STYLES = {
          default:     { color: '#d9d6cf', roof: '#c2beb4' },
          civic:       { color: '#d3d7dc', roof: '#b9bcc2' },
          commercial:  { color: '#d0d4cf', roof: '#b6bab4' },
          residential: { color: '#cf9f83', roof: '#a9573f' },
          landmark:    { color: '#e0d3bd', roof: '#cbb592' },
        };

        const style = KIND_STYLES[kind] || KIND_STYLES.default;
        const wallColor = node.wallColor || style.color;
        const roofColor = node.roofColor || style.roof;

        // 1) Extruded Building Main Body
        const shape = new THREE.Shape();
        node.footprint.forEach(([x, z], i) => (i === 0 ? shape.moveTo(x, -z) : shape.lineTo(x, -z)));
        const geom = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
        geom.rotateX(-Math.PI / 2);

        const mat = new THREE.MeshStandardMaterial({
          color: wallColor,
          roughness: 0.8,
          polygonOffset: true
        });

        const mesh = new THREE.Mesh(geom, mat);
        group.add(mesh);

        // 2) Floor Ledges
        if (floors > 1) {
          const ledgesGeom = buildMapFloorLedgesGeom(node.footprint, height, floors, 0.25, THREE);
          if (ledgesGeom) {
            const ledgesMesh = new THREE.Mesh(ledgesGeom, new THREE.MeshStandardMaterial({ color: '#71717a', roughness: 0.6, metalness: 0.2 }));
            group.add(ledgesMesh);
          }
        }

        // 3) Glass Window Facade Columns
        if (['commercial', 'civic', 'landmark'].includes(kind)) {
          const windowsGeom = buildMapWindowColumnsGeom(node.footprint, height, floors, THREE);
          if (windowsGeom) {
            const windowsMesh = new THREE.Mesh(windowsGeom, new THREE.MeshStandardMaterial({
              color: '#38bdf8',
              emissive: '#38bdf8',
              emissiveIntensity: 0.25,
              roughness: 0.2,
              metalness: 0.8,
              side: THREE.DoubleSide
            }));
            group.add(windowsMesh);
          }
        }

        // 4) Top Roof Parapet Wall
        if (floors >= 2) {
          const parapetGeom = buildMapRoofParapetGeom(node.footprint, height, 0.8, 0.3, THREE);
          if (parapetGeom) {
            const parapetMesh = new THREE.Mesh(parapetGeom, new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.7 }));
            group.add(parapetMesh);
          }
        }

        // 5) Rooftop Penthouse Box
        if (['commercial', 'civic'].includes(kind) && height > 12) {
          const penthouseGeom = buildMapRoofPenthouseGeom(node.footprint, height, 3.2, THREE);
          if (penthouseGeom) {
            const penthouseMesh = new THREE.Mesh(penthouseGeom, new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.6 }));
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
          polygonOffsetUnits: -1
        });

        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.y = 0.15;
        group.add(mesh);
      }
      else if (node.type === 'path' && node.polyline?.length >= 2) {
        const pathClass = node.pathClass || 'street';
        const width = node.widthOverride || (pathClass === 'major' ? 13 : pathClass === 'walkway' ? 4.2 : 8);
        const border = pathClass === 'major' ? 3.5 : pathClass === 'walkway' ? 2.2 : 2.6;
        const yBase = 0.40 + (node.elevation || 0);

        // Casing border underneath
        const casingGeom = buildMapRibbonGeom(node.polyline, width + border, THREE);
        if (casingGeom) {
          const casingColor = node.casingColor || (pathClass === 'major' ? '#26262b' : pathClass === 'walkway' ? '#a98f5f' : '#333338');
          const casingMat = new THREE.MeshStandardMaterial({
            color: casingColor,
            roughness: 0.9,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1,
            side: THREE.DoubleSide
          });
          const casingMesh = new THREE.Mesh(casingGeom, casingMat);
          casingMesh.position.y = yBase - 0.01;
          group.add(casingMesh);
        }

        // Road fill on top
        const fillGeom = buildMapRibbonGeom(node.polyline, width, THREE);
        if (fillGeom) {
          const fillColor = node.fillColor || (pathClass === 'major' ? '#3f3f46' : pathClass === 'walkway' ? '#f6f0e2' : '#55555c');
          const fillMat = new THREE.MeshStandardMaterial({
            color: fillColor,
            roughness: 0.8,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2,
            side: THREE.DoubleSide
          });
          const fillMesh = new THREE.Mesh(fillGeom, fillMat);
          fillMesh.position.y = yBase;
          group.add(fillMesh);
        }
      }
      else if (node.type === 'composed') {
        const [cx, cz] = node.position || [0, 0];
        group.position.set(cx, 0, cz);
        if (node.rotation) group.rotation.y = node.rotation;

        (node.parts || []).forEach((part) => {
          let partGeom = null; const size = part.size || [1, 1, 1];
          if (part.shape === 'cylinder') { const r = part.radius ?? (size[0]/2); const h = part.height ?? size[1]; partGeom = new THREE.CylinderGeometry(r, r, h, 16); }
          else if (part.shape === 'sphere') { const r = part.radius ?? (size[0]/2); partGeom = new THREE.SphereGeometry(r, 16, 16); }
          else { partGeom = new THREE.BoxGeometry(size[0], size[1], size[2]); }

          const matProps = {
            matte:   { roughness: 0.8, metalness: 0.1, opacity: 1, transparent: false },
            glossy:  { roughness: 0.2, metalness: 0.1, opacity: 1, transparent: false },
            metal:   { roughness: 0.3, metalness: 0.8, opacity: 1, transparent: false },
            glass:   { roughness: 0.1, metalness: 0.9, opacity: 0.4, transparent: true },
            water:   { roughness: 0.05, metalness: 0.1, opacity: 0.7, transparent: true },
          }[part.material || 'matte'] || { roughness: 0.8, metalness: 0.1, opacity: 1, transparent: false };

          const mat = new THREE.MeshStandardMaterial({
            color: part.color || '#94a3b8',
            roughness: matProps.roughness,
            metalness: matProps.metalness,
            opacity: matProps.opacity,
            transparent: matProps.transparent,
            side: THREE.DoubleSide
          });
          const mesh = new THREE.Mesh(partGeom, mat);
          const [px, py, pz] = part.position || [0, 0, 0];
          mesh.position.set(px, py, pz);
          group.add(mesh);
        });
      }
      else if (node.type === 'tree') {
        const [tx, tz] = node.position || [0, 0];
        const h = node.height || 6, r = node.radius || 2.5;
        const trunkMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, h * 0.4, 8), new THREE.MeshStandardMaterial({ color: '#5c4033', roughness: 0.9 }));
        trunkMesh.position.set(tx, (h * 0.4) / 2, tz); group.add(trunkMesh);
        const canopyMesh = new THREE.Mesh(new THREE.ConeGeometry(r, h * 0.7, 8), new THREE.MeshStandardMaterial({ color: '#5f9142', roughness: 0.8 }));
        canopyMesh.position.set(tx, h * 0.4 + (h * 0.7) / 2, tz); group.add(canopyMesh);
      }

      return group;
    }

    function buildMapRibbonGeom(points, width, THREE) {
      if (!points || points.length < 2) return null;
      const hw = width / 2; const pos = [];
      for (let i = 0; i < points.length - 1; i++) {
        const [ax, az] = points[i], [bx, bz] = points[i + 1];
        let dx = bx - ax, dz = bz - az; const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
        const nx = -dz * hw, nz = dx * hw;
        pos.push(ax + nx, 0, az + nz, ax - nx, 0, az - nz, bx + nx, 0, bz + nz);
        pos.push(ax - nx, 0, az - nz, bx - nx, 0, bz - nz, bx + nx, 0, bz + nz);
      }
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geom.computeVertexNormals();
      return geom;
    }

    function buildMapFloorLedgesGeom(ring, height, floors, ledgeWidth, THREE) {
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

    function buildMapWindowColumnsGeom(ring, height, floors, THREE) {
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

    function buildMapRoofParapetGeom(ring, height, parapetHeight, parapetWidth, THREE) {
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

    function buildMapRoofPenthouseGeom(ring, height, penthouseHeight, THREE) {
      let cx = 0, cz = 0;
      ring.forEach(([x, z]) => { cx += x; cz += z; });
      cx /= ring.length; cz /= ring.length;
      const geom = new THREE.BoxGeometry(6, penthouseHeight, 5);
      geom.translate(cx, height + penthouseHeight / 2, cz);
      return geom;
    }

    function escapeHtml(str) {
      return String(str || '').replace(/[&<>"']/g, (m) => {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
      });
    }
  </script>
</body>
</html>`;

  downloadFile(html, `${(title || 'cartogen-map').toLowerCase().replace(/\s+/g, '-')}-map.html`);
}

/** Helper: Trigger browser download */
function downloadFile(content, filename) {
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (m) => {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}
