// @ts-check
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import SceneNodes from './SceneNodes.jsx';
import Transformer from './Transformer.jsx';
import { useSceneStore } from '../store/scene-store.js';

const ENVIRONMENT_PRESETS = {
  day: {
    background: '#0b0f19',
    groundColor: '#9aa877',
    skyLight: '#ffffff',
    groundLight: '#8a9470',
    ambientIntensity: 0.5,
    sunColor: '#fff4e2',
    sunIntensity: 1.35,
    sunPosition: /** @type {[number, number, number]} */ ([200, 280, 140]),
  },
  sunset: {
    background: '#1a162b',
    groundColor: '#7c5844',
    skyLight: '#fdba74',
    groundLight: '#431407',
    ambientIntensity: 0.4,
    sunColor: '#f97316',
    sunIntensity: 1.8,
    sunPosition: /** @type {[number, number, number]} */ ([300, 80, 100]),
  },
  night: {
    background: '#060911',
    groundColor: '#1e293b',
    skyLight: '#38bdf8',
    groundLight: '#020617',
    ambientIntensity: 0.25,
    sunColor: '#818cf8',
    sunIntensity: 0.5,
    sunPosition: /** @type {[number, number, number]} */ ([-100, 200, -100]),
  },
};

export default function Viewport() {
  const themeMode = useSceneStore((s) => s.themeMode) || 'day';
  const showGrid = useSceneStore((s) => s.showGrid);
  
  const env = ENVIRONMENT_PRESETS[themeMode] || ENVIRONMENT_PRESETS.day;

  return (
    <Canvas
      shadows
      camera={{ position: [220, 200, 300], fov: 45, near: 0.5, far: 30000 }}
      style={{ background: env.background }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0;
      }}
      onPointerMissed={() => {
        useSceneStore.getState().select(null);
      }}
    >
      <hemisphereLight args={[env.skyLight, env.groundLight, 0.6]} />
      <ambientLight intensity={env.ambientIntensity} />
      <directionalLight
        position={env.sunPosition}
        intensity={env.sunIntensity}
        color={env.sunColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-1200}
        shadow-camera-right={1200}
        shadow-camera-top={1200}
        shadow-camera-bottom={-1200}
        shadow-camera-far={3000}
      />
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.2, 0]} receiveShadow>
        <planeGeometry args={[30000, 30000]} />
        <meshStandardMaterial
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
          color={env.groundColor}
          roughness={1}
        />
      </mesh>
      
      {showGrid && (
        <gridHelper args={[4000, 160, '#38bdf8', '#334155']} position={[0, 0.05, 0]} />
      )}

      <SceneNodes />
      <Transformer />

      <OrbitControls target={[0, 0, 0]} maxPolarAngle={Math.PI / 2.15} maxDistance={4000} makeDefault />
    </Canvas>
  );
}