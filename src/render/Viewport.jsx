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
    groundColor: '#c7b78f',
    skyLight: '#ffffff',
    groundLight: '#b3a37b',
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
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
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
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-left={-4000}
        shadow-camera-right={4000}
        shadow-camera-top={4000}
        shadow-camera-bottom={-4000}
        shadow-camera-near={1}
        shadow-camera-far={6000}
        shadow-bias={-0.0001}
        shadow-normalBias={0.03}
      />
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.2, 0]} receiveShadow>
        <planeGeometry args={[30000, 30000]} />
        <meshStandardMaterial
          color={env.groundColor}
          roughness={0.9}
        />
      </mesh>

      {showGrid && (
        <gridHelper args={[4000, 160, '#38bdf8', '#334155']} position={[0, 0.05, 0]} />
      )}

      <SceneNodes />
      <Transformer />

      <OrbitControls
        makeDefault
        target={[0, 0, 0]}
        maxPolarAngle={Math.PI / 2.15}
        maxDistance={4000}
        screenSpacePanning={true}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN
        }}
      />
    </Canvas>
  );
}