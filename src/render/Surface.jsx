import { useMemo } from 'react';
import { fillPolygon } from '../lib/geometry.js';

export default function Surface({ node, preset }) {
  const geometry = useMemo(() => fillPolygon(node.polygon), [node.polygon]);
  const color = node.material === 'water' ? '#7fa8c9' : '#93b07e';
  return (
    <mesh geometry={geometry} position={[0, 0.02, 0]} receiveShadow>
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}