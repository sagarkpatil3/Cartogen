// @ts-check
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import SceneNodes from './SceneNodes.jsx';
import { theme } from './theme.js';


export default function Viewport() {
  return (
    <Canvas
      shadows
      camera={{ position: [220, 200, 300], fov: 45, near: 0.5, far: 8000 }}
      style={{ background: theme.background }}
      onCreated={({ gl }) => {
      gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0;
      }}
    >
      <hemisphereLight args={[theme.lighting.sky, theme.lighting.groundFill, 0.6]} />
      <ambientLight intensity={theme.lighting.ambient} />
      <directionalLight
        position={theme.lighting.sunPosition}
        intensity={theme.lighting.sunIntensity}
        color={theme.lighting.sun}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-600}
        shadow-camera-right={600}
        shadow-camera-top={600}
        shadow-camera-bottom={-600}
        shadow-camera-far={1500}
      />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[6000, 6000]} />
        <meshStandardMaterial color={theme.ground} roughness={1} />
      </mesh>
      <SceneNodes />

      <OrbitControls target={[0, 0, 0]} maxPolarAngle={Math.PI / 2.15} />
    </Canvas>
  );
}