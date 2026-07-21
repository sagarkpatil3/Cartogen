// @ts-check
import { useMemo } from 'react';
import { extrudeFootprint } from '../lib/geometry.js';
import { buildingStyle, theme } from './theme.js';

/**
 * BUILDING — extrudes one footprint node and colors it by its `kind`.
 * The component decides HOW to draw (geometry); the theme decides how it LOOKS.
 * @param {{ node:any, selected?:boolean, onSelect?:(id:string)=>void }} props
 */
export default function Building({ node, selected, onSelect }) {
  // rebuild geometry only when the footprint/height changes (not every render)
  const geometry = useMemo(
    () => extrudeFootprint(node.footprint, node.height),
    [node.footprint, node.height]
  );

  const style = buildingStyle(node.kind);              // look up color by kind

  return (
    <mesh
      geometry={geometry}
      castShadow
      receiveShadow
      onClick={(e) => { e.stopPropagation(); onSelect?.(node.id); }}
    >
      <meshStandardMaterial
        polygonOffset
        color={selected ? theme.building.selected : style.color}
        roughness={0.9}
      />
    </mesh>
  );
}