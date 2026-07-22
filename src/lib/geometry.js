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
export function ribbon(points, width) {
  const hw = width / 2, pos = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i], [bx, bz] = points[i + 1];
    let dx = bx - ax, dz = bz - az; const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
    const nx = -dz * hw, nz = dx * hw;
    pos.push(ax+nx,0,az+nz, ax-nx,0,az-nz, bx+nx,0,bz+nz, ax-nx,0,az-nz, bx-nx,0,bz-nz, bx+nx,0,bz+nz);
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