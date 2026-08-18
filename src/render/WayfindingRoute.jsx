// @ts-check
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ribbon, smoothPolyline } from '../lib/geometry.js';
import { useSceneStore } from '../store/scene-store.js';
import * as THREE from 'three';

/**
 * WAYFINDING ROUTE — Renders animated glowing 3D path ribbon (#00f0ff / #38bdf8)
 * for live campus navigation and ADA accessible routing.
 */
export default function WayfindingRoute() {
  const wayfindingRoute = useSceneStore((s) => s.wayfindingRoute);
  const pulseRef = useRef();

  const points = useMemo(() => {
    if (!wayfindingRoute || !wayfindingRoute.pathPoints || wayfindingRoute.pathPoints.length < 2) return null;
    return smoothPolyline(wayfindingRoute.pathPoints, 2);
  }, [wayfindingRoute]);

  const mainRibbonGeo = useMemo(() => points ? ribbon(points, 3.8) : null, [points]);
  const glowRibbonGeo = useMemo(() => points ? ribbon(points, 5.2) : null, [points]);

  useFrame(({ clock }) => {
    if (pulseRef.current) {
      const t = clock.getElapsedTime();
      pulseRef.current.opacity = 0.55 + Math.sin(t * 4) * 0.25;
    }
  });

  if (!points || !mainRibbonGeo) return null;

  const isAccessible = wayfindingRoute.isAccessible !== false;
  const routeColor = isAccessible ? '#00f0ff' : '#f59e0b';

  return (
    <group position={[0, 0.65, 0]}>
      {/* Outer Glow Ribbon */}
      <mesh geometry={glowRibbonGeo}>
        <meshBasicMaterial
          ref={pulseRef}
          color={routeColor}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Core Glowing Navigation Path Ribbon */}
      <mesh geometry={mainRibbonGeo}>
        <meshStandardMaterial
          color={routeColor}
          emissive={routeColor}
          emissiveIntensity={0.8}
          roughness={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
