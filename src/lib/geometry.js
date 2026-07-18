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