// @ts-check
import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { extrudeFootprint, generateFloorLedges, generateRoofParapet, getBuildingEntranceTransform, generateWindowColumns, generateRoofPenthouse, centroid } from '../lib/geometry.js';
import { generateParametricFacadeGeometry } from './facade.js';
import { buildingStyle, theme } from './theme.js';
import * as THREE from 'three';

/**
 * BUILDING — Concept3D architectural renderer.
 * Features 3D window columns, floor ledges, roof penthouses, entrance canopies, and floating text labels.
 */
export default function Building({ node, selected, onSelect }) {
  const style = buildingStyle(node.kind);
  const height = node.height || 10;
  const floors = node.floors || Math.max(1, Math.round(height / 3.2));

  // 1) Main extruded building body
  const geometry = useMemo(
    () => extrudeFootprint(node.footprint, height),
    [node.footprint, height]
  );

  // 2) Horizontal floor divider ledges
  const showLedges = node.showLedges ?? (floors > 1);
  const ledgesGeometry = useMemo(() => {
    if (!showLedges || !node.footprint) return null;
    return generateFloorLedges(node.footprint, height, floors, 0.25);
  }, [showLedges, node.footprint, height, floors]);

  // 3) 3D Window Facade Columns / Slits (Concept3D style or Parametric CGA split)
  const windowStyle = node.windowStyle ?? (['commercial', 'civic', 'landmark'].includes(node.kind) ? 'vertical' : 'none');
  const windowsGeometry = useMemo(() => {
    if (!windowStyle || windowStyle === 'none' || !node.footprint) return null;
    if (windowStyle === 'parametric' || node.glazingRatio !== undefined || node.bayWidth !== undefined) {
      return generateParametricFacadeGeometry(node.footprint, height, floors, node.bayWidth ?? 4, node.glazingRatio ?? 0.65);
    }
    return generateWindowColumns(node.footprint, height, floors, windowStyle);
  }, [windowStyle, node.footprint, height, floors, node.bayWidth, node.glazingRatio]);

  // 4) Top roof parapet wall
  const hasParapet = node.hasParapet ?? (floors >= 2);
  const parapetGeometry = useMemo(() => {
    if (!hasParapet || !node.footprint) return null;
    return generateRoofParapet(node.footprint, height, 0.8, 0.3);
  }, [hasParapet, node.footprint, height]);

  // 5) Rooftop Mechanical Penthouse / HVAC Box
  const hasPenthouse = node.hasRoofPenthouse ?? (['commercial', 'civic'].includes(node.kind) && height > 12);
  const penthouseGeometry = useMemo(() => {
    if (!hasPenthouse || !node.footprint) return null;
    return generateRoofPenthouse(node.footprint, height, 3.2);
  }, [hasPenthouse, node.footprint, height]);

  // 6) Ground floor main entrance transform (canopy & glass doors)
  const entranceTransform = useMemo(() => {
    if (!node.hasEntrance || !node.footprint) return null;
    return getBuildingEntranceTransform(node.footprint);
  }, [node.hasEntrance, node.footprint]);

  // 7) Building Centroid for 3D Text Label
  const center = useMemo(() => {
    if (!node.footprint || node.footprint.length < 3) return [0, 0];
    return centroid(node.footprint);
  }, [node.footprint]);

  const wallColor = node.wallColor || (selected ? theme.building.selected : style.color);
  const labelText = node.label || node.name || (selected ? `Building #${node.id.slice(-4)}` : null);
  const showLabel = node.showLabel ?? (!!labelText && selected);

  return (
    <group onClick={(e) => { e.stopPropagation(); onSelect?.(node.id); }}>
      {/* Main Extruded Building Body */}
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          polygonOffset
          color={wallColor}
          roughness={0.8}
        />
      </mesh>

      {/* Horizontal Floor Ledge Bands */}
      {ledgesGeometry && (
        <mesh geometry={ledgesGeometry} castShadow receiveShadow>
          <meshStandardMaterial
            color={theme.building.ledge || '#71717a'}
            roughness={0.6}
            metalness={0.2}
          />
        </mesh>
      )}

      {/* 3D Window Facade Columns / Slits */}
      {windowsGeometry && (
        <mesh geometry={windowsGeometry} castShadow receiveShadow>
          <meshStandardMaterial
            color={theme.building.glass || '#0284c7'}
            emissive={theme.building.glass || '#0284c7'}
            emissiveIntensity={0.25}
            roughness={0.2}
            metalness={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Roof Parapet Border Wall */}
      {parapetGeometry && (
        <mesh geometry={parapetGeometry} castShadow receiveShadow>
          <meshStandardMaterial
            color={node.roofColor || style.roof || theme.building.parapet}
            roughness={0.7}
          />
        </mesh>
      )}

      {/* Rooftop Mechanical Penthouse */}
      {penthouseGeometry && (
        <mesh geometry={penthouseGeometry} castShadow receiveShadow>
          <meshStandardMaterial
            color={theme.building.parapet || '#94a3b8'}
            roughness={0.6}
          />
        </mesh>
      )}

      {/* Ground Floor Main Entrance Doors & Canopy */}
      {entranceTransform && (
        <group position={entranceTransform.position} rotation={[0, entranceTransform.rotationY, 0]}>
          {/* Canopy Awning Roof */}
          <mesh position={[0, 3.1, 0.8]} castShadow receiveShadow>
            <boxGeometry args={[Math.min(5, entranceTransform.wallLength * 0.4), 0.25, 1.8]} />
            <meshStandardMaterial color={theme.building.canopy || '#1e293b'} roughness={0.3} metalness={0.8} />
          </mesh>

          {/* Glass Entrance Door Frame */}
          <mesh position={[0, 1.4, 0.1]}>
            <boxGeometry args={[Math.min(4.2, entranceTransform.wallLength * 0.35), 2.7, 0.2]} />
            <meshStandardMaterial color={theme.building.entrance || '#0284c7'} roughness={0.1} metalness={0.9} transparent opacity={0.85} />
          </mesh>
        </group>
      )}

      {/* Concept3D Floating 3D Building Label */}
      {(showLabel || node.showLabel) && labelText && (
        <Html
          position={[center[0], height + (hasPenthouse ? 4.5 : 1.5), center[1]]}
          center
          distanceFactor={250}
          zIndexRange={[100, 0]}
        >
          <div className="pointer-events-none flex select-none flex-col items-center">
            <div className="whitespace-nowrap rounded-md bg-slate-900/90 px-2.5 py-1 font-sans text-xs font-bold tracking-wide text-white shadow-lg backdrop-blur-sm border border-slate-700/80">
              {labelText}
            </div>
            <div className="h-2 w-0.5 bg-slate-400/80" />
          </div>
        </Html>
      )}
    </group>
  );
}