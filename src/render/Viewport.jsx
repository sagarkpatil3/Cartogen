import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { extrudeFootprint } from '../lib/geometry.js';
import SceneNodes from './SceneNodes.jsx';
import * as THREE from 'three';

export default function Viewport() {
  return (
    <Canvas camera={{ position: [60, 50, 70], fov: 45  }}  onCreated={({ gl }) => {
    // gl.toneMapping = THREE.ACESFilmicToneMapping;
    // gl.toneMappingExposure = 1.0;
  }}>
      <hemisphereLight args={['#ffffff', '#6b7158', 0.6]} />
      <directionalLight
  position={[80, 120, 50]}
  intensity={1.3}
  color="#fff2dc"
  castShadow
  shadow-mapSize-width={2048}
  shadow-mapSize-height={2048}
/>
<ambientLight intensity={0.25} />
      <SceneNodes />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>

        <planeGeometry args={[3000, 3000]} />
        <meshStandardMaterial color="#8fa971" roughness={1} />
      </mesh>

      <OrbitControls />
    </Canvas>
  );
}