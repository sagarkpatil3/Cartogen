// src/render/ComposedObject.jsx
import * as THREE from 'three';

const MATERIAL_PRESETS = {
    matte: { roughness: 0.8, metalness: 0.1, transparent: false, opacity: 1.0 },
    glossy: { roughness: 0.2, metalness: 0.1, transparent: false, opacity: 1.0 },
    metal: { roughness: 0.3, metalness: 0.8, transparent: false, opacity: 1.0 },
    glass: { roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.6 },
    water: { roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.75 },
};

function createWedgeGeometry(width = 1, height = 1, depth = 1) {
    const shape = new THREE.Shape();
    const hw = width / 2;
    const hh = height / 2;
    shape.moveTo(-hw, -hh);
    shape.lineTo(hw, -hh);
    shape.lineTo(0, hh);
    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    geometry.center();
    return geometry;
}

export default function ComposedObject({ node, selected, onSelect }) {
    const [cx, cz] = node.position || [0, 0];
    const parts = node.parts || [];
    const scale = node.scale ?? 1;

    return (
        <group
            position={[cx, 0, cz]}
            rotation={[0, node.rotation || 0, 0]}
            onClick={(e) => {
                e.stopPropagation();
                onSelect?.(node.id);
            }}
            scale={typeof scale === 'number' ? [scale, scale, scale] : scale}
        >
            {parts.map((part, idx) => {
                const [px, py, pz] = part.position || [0, 0, 0];
                const rotY = ((part.rotationY || 0) * Math.PI) / 180;
                const matProps = MATERIAL_PRESETS[part.material] || MATERIAL_PRESETS.matte;

                return (
                    <mesh
                        key={idx}
                        position={[px, py, pz]}
                        rotation={[0, rotY, 0]}
                        castShadow
                        receiveShadow
                    >
                        {part.shape === 'box' && (
                            <boxGeometry args={part.size || [1, 1, 1]} />
                        )}
                        {part.shape === 'cylinder' && (
                            <cylinderGeometry args={[part.radius, part.radius, part.height, 16]} />
                        )}
                        {part.shape === 'sphere' && (
                            <sphereGeometry args={[part.radius, 16, 16]} />
                        )}
                        {part.shape === 'wedge' && (
                            <primitive object={createWedgeGeometry(...(part.size || [1, 1, 1]))} attach="geometry" />
                        )}
                        <meshStandardMaterial
                            color={part.color}
                            roughness={matProps.roughness}
                            metalness={matProps.metalness}
                            transparent={matProps.transparent}
                            opacity={matProps.opacity}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                );
            })}
        </group>
    );
}
