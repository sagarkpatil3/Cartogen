import * as THREE from 'three';
export function extrudeFootprint(ring, height) {
  const shape = new THREE.Shape();
  ring.forEach(([x, z], i) => (i === 0 ? shape.moveTo(x, -z) : shape.lineTo(x, -z)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  return g;
}
export function fillPolygon(ring) {
  const shape = new THREE.Shape();
  ring.forEach(([x, z], i) => (i === 0 ? shape.moveTo(x, -z) : shape.lineTo(x, -z)));
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2);
  return g;
}
/**
 * CHAIKIN POLYLINE SMOOTHING — Subdivides sharp 90-degree or jagged vertices into smooth rounded curves.
 * @param {Array<[number, number]>} points
 * @param {number} [iterations=2]
 * @returns {Array<[number, number]>}
 */
export function smoothPolyline(points, iterations = 2) {
  if (!points || points.length <= 2) return points;

  let current = points;
  for (let iter = 0; iter < iterations; iter++) {
    const next = [current[0]];
    for (let i = 0; i < current.length - 1; i++) {
      const p0 = current[i];
      const p1 = current[i + 1];

      const q = [0.75 * p0[0] + 0.25 * p1[0], 0.75 * p0[1] + 0.25 * p1[1]];
      const r = [0.25 * p0[0] + 0.75 * p1[0], 0.25 * p0[1] + 0.75 * p1[1]];

      next.push(q, r);
    }
    next.push(current[current.length - 1]);
    current = next;
  }
  return current;
}

/**
 * MITERED RIBBON GENERATOR — Extrudes 3D polyline with mitered corner joints.
 * @param {Array<[number, number]>} points
 * @param {number} width
 * @returns {THREE.BufferGeometry}
 */
export function ribbon(points, width) {
  if (!points || points.length < 2) return new THREE.BufferGeometry();

  const hw = width / 2;
  const n = points.length;
  const leftPts = [];
  const rightPts = [];

  for (let i = 0; i < n; i++) {
    let nx = 0, nz = 0;

    if (i === 0) {
      const dx = points[1][0] - points[0][0];
      const dz = points[1][1] - points[0][1];
      const len = Math.hypot(dx, dz) || 1;
      nx = -dz / len;
      nz = dx / len;
    } else if (i === n - 1) {
      const dx = points[n - 1][0] - points[n - 2][0];
      const dz = points[n - 1][1] - points[n - 2][1];
      const len = Math.hypot(dx, dz) || 1;
      nx = -dz / len;
      nz = dx / len;
    } else {
      const dx1 = points[i][0] - points[i - 1][0];
      const dz1 = points[i][1] - points[i - 1][1];
      const len1 = Math.hypot(dx1, dz1) || 1;
      const n1x = -dz1 / len1, n1z = dx1 / len1;

      const dx2 = points[i + 1][0] - points[i][0];
      const dz2 = points[i + 1][1] - points[i][1];
      const len2 = Math.hypot(dx2, dz2) || 1;
      const n2x = -dz2 / len2, n2z = dx2 / len2;

      nx = (n1x + n2x) / 2;
      nz = (n1z + n2z) / 2;
      const miterLen = Math.hypot(nx, nz) || 1;
      const scale = Math.min(1.5, 1 / miterLen);
      nx = (nx / miterLen) * scale;
      nz = (nz / miterLen) * scale;
    }

    leftPts.push([points[i][0] + nx * hw, points[i][1] + nz * hw]);
    rightPts.push([points[i][0] - nx * hw, points[i][1] - nz * hw]);
  }

  const pos = [];
  for (let i = 0; i < n - 1; i++) {
    const l1 = leftPts[i], r1 = rightPts[i];
    const l2 = leftPts[i + 1], r2 = rightPts[i + 1];

    pos.push(
      l1[0], 0, l1[1],   r1[0], 0, r1[1],   l2[0], 0, l2[1],
      r1[0], 0, r1[1],   r2[0], 0, r2[1],   l2[0], 0, l2[1]
    );
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * CENTROID — the average center point of a ring of [x,z] points.
 * Used to find "the middle" of a building so we can place things near it.
 * @param {[number,number][]} ring
 * @returns {[number,number]}
 */
export function centroid(ring) {
  let x = 0, z = 0;
  for (const [px, pz] of ring) {
    x += px;
    z += pz;
  }
  return [x / ring.length, z / ring.length];
}

/**
 * POINT-IN-POLYGON — is point [x,z] inside the polygon ring?
 * Classic ray-casting algorithm: shoot a ray to the right, count how many polygon
 * edges it crosses. Odd = inside, even = outside. Works for any shape.
 * @param {[number,number]} point   [x, z]
 * @param {[number,number][]} ring  polygon as [x,z] points
 * @returns {boolean}
 */
export function pointInPolygon(point, ring) {
  const [px, pz] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i];
    const [xj, zj] = ring[j];
    const intersects = (zi > pz) !== (zj > pz) &&
      px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/**
 * Move a waypoint at index to new [x, z] coordinates.
 * @param {[number, number][]} polyline
 * @param {number} index
 * @param {[number, number]} newPt
 * @returns {[number, number][]}
 */
export function moveWaypoint(polyline, index, [nx, nz]) {
  return polyline.map((pt, i) => (i === index ? [nx, nz] : pt));
}

/**
 * Insert a new waypoint at the midpoint of segment between index and index+1.
 * @param {[number, number][]} polyline
 * @param {number} segmentIndex
 * @returns {[number, number][]}
 */
export function insertWaypoint(polyline, segmentIndex) {
  if (segmentIndex < 0 || segmentIndex >= polyline.length - 1) return polyline;
  const [ax, az] = polyline[segmentIndex];
  const [bx, bz] = polyline[segmentIndex + 1];
  const mid = [(ax + bx) / 2, (az + bz) / 2];
  const next = [...polyline];
  next.splice(segmentIndex + 1, 0, mid);
  return next;
}

/**
 * Remove a waypoint at index (keeps at least 2 points).
 * @param {[number, number][]} polyline
 * @param {number} index
 * @returns {[number, number][]}
 */
export function removeWaypoint(polyline, index) {
  if (polyline.length <= 2) return polyline;
  return polyline.filter((_, i) => i !== index);
}




/**
 * OFFSET POLYLINE — generates a parallel polyline offset to the left (+) or right (-).
 * Used for guardrails, sidewalk edges, and street lamp alignment.
 * @param {[number, number][]} points
 * @param {number} distance
 * @returns {[number, number][]}
 */
export function offsetPolyline(points, distance) {
  if (!points || points.length < 2) return points;
  const result = [];
  for (let i = 0; i < points.length; i++) {
    let nx = 0, nz = 0;
    if (i < points.length - 1) {
      const [ax, az] = points[i];
      const [bx, bz] = points[i + 1];
      const dx = bx - ax, dz = bz - az;
      const len = Math.hypot(dx, dz) || 1;
      nx += -dz / len;
      nz += dx / len;
    }
    if (i > 0) {
      const [ax, az] = points[i - 1];
      const [bx, bz] = points[i];
      const dx = bx - ax, dz = bz - az;
      const len = Math.hypot(dx, dz) || 1;
      nx += -dz / len;
      nz += dx / len;
    }
    const len = Math.hypot(nx, nz) || 1;
    nx = (nx / len) * distance;
    nz = (nz / len) * distance;
    result.push([points[i][0] + nx, points[i][1] + nz]);
  }
  return result;
}

/**
 * DASHED CENTERLINE GEOMETRY — generates ribbon geometry with gaps for road centerlines.
 * @param {[number, number][]} points
 * @param {number} dashWidth
 * @param {number} dashLength
 * @param {number} gapLength
 * @returns {THREE.BufferGeometry}
 */
export function dashedCenterlineGeometry(points, dashWidth = 0.4, dashLength = 3, gapLength = 2) {
  const hw = dashWidth / 2;
  const pos = [];

  let drawing = true;
  let remainingInState = dashLength;

  for (let i = 0; i < points.length - 1; i++) {
    let [ax, az] = points[i];
    const [bx, bz] = points[i + 1];
    let segDx = bx - ax;
    let segDz = bz - az;
    let segLen = Math.hypot(segDx, segDz);
    if (segLen === 0) continue;

    let dirX = segDx / segLen;
    let dirZ = segDz / segLen;
    let normalX = -dirZ * hw;
    let normalZ = dirX * hw;

    let covered = 0;
    while (covered < segLen) {
      const step = Math.min(segLen - covered, remainingInState);
      const nextX = ax + dirX * step;
      const nextZ = az + dirZ * step;

      if (drawing) {
        pos.push(
          ax + normalX, 0, az + normalZ,
          ax - normalX, 0, az - normalZ,
          nextX + normalX, 0, nextZ + normalZ,
          ax - normalX, 0, az - normalZ,
          nextX - normalX, 0, nextZ - normalZ,
          nextX + normalX, 0, nextZ + normalZ
        );
      }

      covered += step;
      remainingInState -= step;
      ax = nextX;
      az = nextZ;

      if (remainingInState <= 0.001) {
        drawing = !drawing;
        remainingInState = drawing ? dashLength : gapLength;
      }
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * GENERATE FLOOR LEDGES — 3D ribbon ledges at floor boundaries up the building facade.
 * @param {[number, number][]} ring
 * @param {number} height
 * @param {number} floors
 * @param {number} [ledgeWidth=0.25]
 * @returns {THREE.BufferGeometry}
 */
export function generateFloorLedges(ring, height, floors, ledgeWidth = 0.25) {
  const numFloors = Math.max(1, Math.round(floors));
  const floorHeight = height / numFloors;
  const pos = [];

  for (let f = 1; f < numFloors; f++) {
    const y = f * floorHeight;
    for (let i = 0; i < ring.length - 1; i++) {
      const [ax, az] = ring[i];
      const [bx, bz] = ring[i + 1];
      let dx = bx - ax, dz = bz - az;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len; dz /= len;
      const nx = -dz * ledgeWidth, nz = dx * ledgeWidth;

      // 3D ledge band geometry (horizontal strip projecting slightly outward)
      pos.push(
        ax, y, az,
        ax + nx, y, az + nz,
        bx + nx, y, bz + nz,
        ax, y, az,
        bx + nx, y, bz + nz,
        bx, y, bz
      );
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * GENERATE ROOF PARAPET — top perimeter border wall extrusion on building roof.
 * @param {[number, number][]} ring
 * @param {number} height
 * @param {number} [parapetHeight=0.8]
 * @param {number} [parapetWidth=0.3]
 * @returns {THREE.BufferGeometry}
 */
export function generateRoofParapet(ring, height, parapetHeight = 0.8, parapetWidth = 0.3) {
  const pos = [];
  const yTop = height + parapetHeight;

  for (let i = 0; i < ring.length - 1; i++) {
    const [ax, az] = ring[i];
    const [bx, bz] = ring[i + 1];
    let dx = bx - ax, dz = bz - az;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len; dz /= len;
    const nx = -dz * parapetWidth, nz = dx * parapetWidth;

    // Vertical wall strip for parapet border
    pos.push(
      ax, height, az,
      ax, yTop, az,
      bx, yTop, bz,
      ax, height, az,
      bx, yTop, bz,
      bx, height, bz,
      // Top cap
      ax, yTop, az,
      ax + nx, yTop, az + nz,
      bx + nx, yTop, bz + nz,
      ax, yTop, az,
      bx + nx, yTop, bz + nz,
      bx, yTop, bz
    );
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * GET BUILDING ENTRANCE TRANSFORM — finds front facade segment to place entrance doors & canopy.
 * @param {[number, number][]} ring
 * @returns {{ position: [number, number, number], rotationY: number, wallLength: number } | null}
 */
export function getBuildingEntranceTransform(ring) {
  if (!ring || ring.length < 3) return null;
  
  // Find the longest segment of the building footprint ring (typically main front facade)
  let longestIdx = 0;
  let maxLen = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [ax, az] = ring[i];
    const [bx, bz] = ring[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    if (len > maxLen) {
      maxLen = len;
      longestIdx = i;
    }
  }

  const [ax, az] = ring[longestIdx];
  const [bx, bz] = ring[longestIdx + 1];
  const midX = (ax + bx) / 2;
  const midZ = (az + bz) / 2;
  const dx = bx - ax;
  const dz = bz - az;
  const angle = Math.atan2(dx, dz);

  return {
    position: [midX, 0, midZ],
    rotationY: angle,
    wallLength: maxLen,
  };
}

/**
 * GENERATE WINDOW COLUMNS — 3D glass window panes & vertical window slits matching Concept3D style.
 * @param {[number, number][]} ring
 * @param {number} height
 * @param {number} floors
 * @param {'vertical' | 'grid' | 'curtain'} windowStyle
 * @returns {THREE.BufferGeometry}
 */
export function generateWindowColumns(ring, height, floors, windowStyle = 'vertical') {
  const pos = [];
  const numFloors = Math.max(1, Math.round(floors));
  const floorHeight = height / numFloors;
  const normalOffset = 0.08; // slightly out from wall face to avoid z-fighting

  for (let i = 0; i < ring.length - 1; i++) {
    const [ax, az] = ring[i];
    const [bx, bz] = ring[i + 1];
    let dx = bx - ax, dz = bz - az;
    const segLen = Math.hypot(dx, dz);
    if (segLen < 2) continue;
    dx /= segLen; dz /= segLen;
    const nx = -dz * normalOffset, nz = dx * normalOffset;

    if (windowStyle === 'curtain') {
      // Full glass wall panel
      for (let f = 0; f < numFloors; f++) {
        const yBottom = f * floorHeight + 0.3;
        const yTop = (f + 1) * floorHeight - 0.3;
        pos.push(
          ax + nx, yBottom, az + nz,
          bx + nx, yBottom, bz + nz,
          bx + nx, yTop, bz + nz,
          ax + nx, yBottom, az + nz,
          bx + nx, yTop, bz + nz,
          ax + nx, yTop, az + nz
        );
      }
    } else {
      // Vertical window columns / slits or grid panes
      const colWidth = 1.4;
      const colGap = 1.6;
      const totalColStep = colWidth + colGap;
      const numCols = Math.max(1, Math.floor((segLen - 0.8) / totalColStep));

      for (let c = 0; c < numCols; c++) {
        const startDist = 0.6 + c * totalColStep;
        const endDist = Math.min(segLen - 0.4, startDist + colWidth);
        if (endDist <= startDist) continue;

        const wx1 = ax + dx * startDist + nx;
        const wz1 = az + dz * startDist + nz;
        const wx2 = ax + dx * endDist + nx;
        const wz2 = az + dz * endDist + nz;

        if (windowStyle === 'vertical') {
          // Continuous vertical window slit across all floors
          const yBottom = 1.0;
          const yTop = height - 0.8;
          pos.push(
            wx1, yBottom, wz1,
            wx2, yBottom, wz2,
            wx2, yTop, wz2,
            wx1, yBottom, wz1,
            wx2, yTop, wz2,
            wx1, yTop, wz1
          );
        } else {
          // Rectangular window grid pane per floor
          for (let f = 0; f < numFloors; f++) {
            const yBottom = f * floorHeight + 0.6;
            const yTop = (f + 1) * floorHeight - 0.6;
            if (yTop <= yBottom) continue;

            pos.push(
              wx1, yBottom, wz1,
              wx2, yBottom, wz2,
              wx2, yTop, wz2,
              wx1, yBottom, wz1,
              wx2, yTop, wz2,
              wx1, yTop, wz1
            );
          }
        }
      }
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * GENERATE ROOF PENTHOUSE — scaled rooftop HVAC / mechanical structure extrusion.
 * @param {[number, number][]} ring
 * @param {number} buildingHeight
 * @param {number} [penthouseHeight=3.2]
 * @returns {THREE.BufferGeometry | null}
 */
export function generateRoofPenthouse(ring, buildingHeight, penthouseHeight = 3.2) {
  if (!ring || ring.length < 3) return null;
  const [cx, cz] = centroid(ring);
  const scale = 0.45; // 45% footprint size centered on roof

  // Scale ring around centroid
  const scaledRing = ring.map(([px, pz]) => [
    cx + (px - cx) * scale,
    cz + (pz - cz) * scale,
  ]);

  const shape = new THREE.Shape();
  scaledRing.forEach(([x, z], i) => (i === 0 ? shape.moveTo(x, -z) : shape.lineTo(x, -z)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: penthouseHeight, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  g.translate(0, buildingHeight, 0);
  return g;
}

/**
 * MOVE FOOTPRINT VERTEX — moves a corner vertex while maintaining closed polygon ring.
 * @param {[number, number][]} ring
 * @param {number} index
 * @param {[number, number]} newPt
 * @returns {[number, number][]}
 */
export function moveFootprintVertex(ring, index, [nx, nz]) {
  if (!ring || ring.length < 3) return ring;
  const next = ring.map((pt, i) => (i === index ? [nx, nz] : pt));
  // If editing start or end point of closed ring, keep closed ring in sync
  if (index === 0) {
    next[next.length - 1] = [nx, nz];
  } else if (index === ring.length - 1) {
    next[0] = [nx, nz];
  }
  return next;
}

/**
 * INSERT FOOTPRINT VERTEX — inserts a new corner vertex at wall segment midpoint.
 * @param {[number, number][]} ring
 * @param {number} segmentIndex
 * @returns {[number, number][]}
 */
export function insertFootprintVertex(ring, segmentIndex) {
  if (!ring || segmentIndex < 0 || segmentIndex >= ring.length - 1) return ring;
  const [ax, az] = ring[segmentIndex];
  const [bx, bz] = ring[segmentIndex + 1];
  const mid = [(ax + bx) / 2, (az + bz) / 2];
  const next = [...ring];
  next.splice(segmentIndex + 1, 0, mid);
  return next;
}

/**
 * REMOVE FOOTPRINT VERTEX — removes a corner vertex (keeps at least 3 unique vertices).
 * @param {[number, number][]} ring
 * @param {number} index
 * @returns {[number, number][]}
 */
export function removeFootprintVertex(ring, index) {
  if (!ring || ring.length <= 4) return ring; // 3 unique vertices + 1 closing point = 4
  const next = ring.filter((_, i) => i !== index);
  // Ensure closed ring contract
  if (index === 0) {
    next[next.length - 1] = next[0];
  } else if (index === ring.length - 1) {
    next[0] = next[next.length - 1];
  }
  return next;
}