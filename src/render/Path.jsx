import { useMemo } from 'react';
import { ribbon } from '../lib/geometry.js';

export default function Path({ node, preset }) {
  const geometry = useMemo(() => ribbon(node.polyline, node.width), [node.polyline, node.width]);
  const color = node.material === 'road' ? '#b9b3a8' : '#d9cdb6';
  return (
    <mesh geometry={geometry} position={[0, 0.05, 0]} receiveShadow>
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}