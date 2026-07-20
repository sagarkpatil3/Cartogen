import * as THREE from 'three';

/**
 * Turn a flat footprint into a 3D building geometry.
 * @param {[number, number][]} footprint - corner points [x, z] in meters
 * @param {number} height - meters
 */
export function extrudeFootprint(footprint, height) {
  const shape = new THREE.Shape();
  footprint.forEach(([x, z], i) => {
    if (i === 0) shape.moveTo(x, -z);
    else shape.lineTo(x, -z);
  });
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
  });

  geometry.rotateX(-Math.PI / 2);

  return geometry;
}

// road: turn a line into a flat ribbon of the given width
export function ribbon(points, width) {
  const hw = width / 2;
  const pos = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i];
    const [bx, bz] = points[i + 1];
    let dx = bx - ax, dz = bz - az;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len; dz /= len;
    const nx = -dz * hw, nz = dx * hw;   // perpendicular to the segment
    pos.push(ax + nx, 0, az + nz,  ax - nx, 0, az - nz,  bx + nx, 0, bz + nz);
    pos.push(ax - nx, 0, az - nz,  bx - nx, 0, bz - nz,  bx + nx, 0, bz + nz);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// park/water: fill a polygon flat on the ground
export function fillPolygon(ring) {
  const shape = new THREE.Shape();
  ring.forEach(([x, z], i) => (i === 0 ? shape.moveTo(x, -z) : shape.lineTo(x, -z)));
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2);
  return g;
}