import { useMemo } from 'react';
import { fillPolygon } from '../lib/geometry.js';
import { surfaceStyle } from './theme.js';
 
export default function Surface({ node }) {
  const geometry = useMemo(() => fillPolygon(node.polygon), [node.polygon]);
  const style = surfaceStyle(node.material);   // { color, y }
 
  return (
    <mesh geometry={geometry} position={[0, style.y, 0]} receiveShadow>
      <meshStandardMaterial polygonOffset color={style.color} roughness={1} />
    </mesh>
  );
}