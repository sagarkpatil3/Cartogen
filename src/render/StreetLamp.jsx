// @ts-check
import * as THREE from 'three';

/**
 * STREET LAMP — low-poly street lamp post with emissive bulb.
 * @param {{ position: [number, number, number] }} props
 */
export default function StreetLamp({ position }) {
  const [x, y, z] = position;
  const poleHeight = 4.2;

  return (
    <group position={[x, y, z]}>
      {/* Base flange */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.22, 0.3, 0.3, 8]} />
        <meshStandardMaterial color="#334155" roughness={0.6} />
      </mesh>

      {/* Main vertical pole */}
      <mesh position={[0, poleHeight / 2, 0]}>
        <cylinderGeometry args={[0.08, 0.14, poleHeight, 8]} />
        <meshStandardMaterial color="#475569" roughness={0.4} metalness={0.7} />
      </mesh>

      {/* Lamp fixture head */}
      <mesh position={[0, poleHeight + 0.1, 0]}>
        <cylinderGeometry args={[0.45, 0.12, 0.25, 12]} />
        <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Emissive light bulb fixture */}
      <mesh position={[0, poleHeight - 0.05, 0]}>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshStandardMaterial
          color="#fef08a"
          emissive="#fde047"
          emissiveIntensity={2.5}
          roughness={0.1}
        />
      </mesh>
    </group>
  );
}
