// @ts-check
import { theme } from './theme.js';

/**
 * TREE — one low-poly tree = a trunk (cylinder) + foliage (cone), grouped.
 * A <group> lets us treat both shapes as ONE object: position/scale the group and
 * both move together. `node.scale` uniformly resizes the whole tree ("make it bigger").
 *
 * The tree is authored at a ~5m base height, sitting on the ground (y=0 at the base).
 * @param {{ node:any, selected?:boolean, onSelect?:(id:string)=>void }} props
 */
export default function Tree({ node, selected, onSelect }) {
  const [x, z] = node.position;          // [x, z] in local meters
  const s = node.scale ?? 1;             // uniform scale (defaults to 1)

  return (
    <group
      position={[x, 0, z]}
      scale={s}
      rotation={[0, node.rotation ?? 0, 0]}   // ← [xTilt, ySpin, zTilt] — only y
      onClick={(e) => { e.stopPropagation(); onSelect?.(node.id); }}
    >
      {/* trunk: a thin cylinder, its base at y=0 */}
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.35, 2, 6]} />
        <meshStandardMaterial color={theme.tree.trunk} roughness={1} />
      </mesh>

      {/* foliage: a cone sitting on top of the trunk */}
      <mesh position={[0, 3.4, 0]} castShadow>
        <coneGeometry args={[1.8, 3.6, 8]} />
        <meshStandardMaterial
          color={selected ? theme.building.selected : node.color || theme.tree.foliage[0]}
          roughness={1}
          flatShading
        />
      </mesh>
    </group>
  );
}