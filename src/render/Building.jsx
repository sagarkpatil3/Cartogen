import { useMemo } from 'react';
import { extrudeFootprint } from '../lib/geometry.js';

export default function Building({node}){
    const geometry = useMemo(
        () => extrudeFootprint(node.footprint, node.height),
        [node.footprint, node.height]
    )

    return (
        <mesh geometry={geometry} castShadow receiveShadow>
            <meshStandardMaterial color="#bcb6ab" roughness={0.85} />
        </mesh>
    )
}