import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { extrudeFootprint } from '../lib/geometry.js';
import SceneNodes from './SceneNodes.jsx';
import * as THREE from 'three';
import { PRESETS } from './presets.js';


export default function Viewport() {
  const preset = PRESETS.day;
  return (
    <Canvas camera={{ position: [90, 80, 1200], fov: 45  }} style={{background: preset.bg}}  onCreated={({ gl }) => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.0;
  }}>
      <hemisphereLight args={['#ffffff', '#6b7158', 0.6]} />
<directionalLight
  position={[80, 120, 50]}
  intensity={1.4}
  color="#fff2dc"
  castShadow
  shadow-mapSize-width={2048}
  shadow-mapSize-height={2048}
  shadow-camera-left={-400}
  shadow-camera-right={400}
  shadow-camera-top={400}
  shadow-camera-bottom={-400}
  shadow-camera-far={600}
/>
<ambientLight intensity={0.3} />
      <SceneNodes preset={preset} />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>

        <planeGeometry args={[3000, 3000]} />
        <meshStandardMaterial color={preset.ground} roughness={1} />
      </mesh>

      <OrbitControls />
    </Canvas>
  );
}