// @ts-check
import { useMemo } from 'react';
import { ribbon } from '../lib/geometry.js';
import { pathStyle } from './theme.js';
import * as THREE from 'three';
export default function Path({ node }) {
  const style = pathStyle(node.pathClass);

  const casing = useMemo(
    () => ribbon(node.polyline, style.width + style.border),
    [node.polyline, style.width, style.border]
  );
  const fill = useMemo(
    () => ribbon(node.polyline, style.width),
    [node.polyline, style.width]
  );

  return (
    <group>
      {/* border underneath */}
      <mesh geometry={casing} position={[0, style.y, 0]} receiveShadow>
        <meshStandardMaterial polygonOffset color={style.casing} roughness={1} />
      </mesh>
      {/* colored fill just above the casing */}
      <mesh geometry={fill} position={[0, style.y + 0.015, 0]} receiveShadow>
        <meshStandardMaterial color={style.color} roughness={1}  polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2} 
          side={THREE.DoubleSide}/>
      </mesh>
    </group>
  );
}

