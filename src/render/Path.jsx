// @ts-check
import { useMemo } from 'react';
import { ribbon, smoothPolyline, offsetPolyline, dashedCenterlineGeometry } from '../lib/geometry.js';
import { pathStyle, theme } from './theme.js';
import StreetLamp from './StreetLamp.jsx';
import * as THREE from 'three';

/**
 * PATH — renders roads, streets, and walkways as ribbon geometry.
 * Features curve smoothing, dashed centerlines, overpass guardrails, street lamps, and custom styling.
 */
export default function Path({ node, selected = false, onSelect }) {
  const style = pathStyle(node.pathClass);
  const elevation = node.elevation || 0;
  const width = node.widthOverride ?? style.width;
  const yBase = style.y + elevation;

  // 1) Geometry points: apply Catmull-Rom curve smoothing if requested
  const smoothnessLevel = node.smoothness ?? (node.smooth ? 3 : 0);
  const points = useMemo(() => {
    if (!node.polyline || node.polyline.length < 2) return [];
    return smoothnessLevel > 0 ? smoothPolyline(node.polyline, smoothnessLevel) : node.polyline;
  }, [node.polyline, smoothnessLevel]);


  const casing = useMemo(
    () => ribbon(points, width + style.border),
    [points, width, style.border]
  );
  const fill = useMemo(
    () => ribbon(points, width),
    [points, width]
  );
  const highlight = useMemo(
    () => ribbon(points, width + style.border + 1.2),
    [points, width, style.border]
  );
  const hitMeshGeo = useMemo(
    () => ribbon(points, Math.max(width + 4, 8)),
    [points, width]
  );

  // 2) Dashed Centerline (yellow for major/street, white for walkway)
  const showCenterline = node.showCenterline ?? (node.pathClass === 'major');
  const centerlineGeo = useMemo(() => {
    if (!showCenterline || points.length < 2) return null;
    return dashedCenterlineGeometry(points, Math.min(0.5, width * 0.08), 3.5, 2.5);
  }, [showCenterline, points, width]);

  // 3) Left & Right Guardrail Offset Lines (for overpasses/bridges)
  const showRailings = node.showRailings ?? (elevation > 0);
  const leftRail = useMemo(() => {
    if (!showRailings || points.length < 2) return null;
    return offsetPolyline(points, (width + style.border) / 2);
  }, [showRailings, points, width, style.border]);

  const rightRail = useMemo(() => {
    if (!showRailings || points.length < 2) return null;
    return offsetPolyline(points, -(width + style.border) / 2);
  }, [showRailings, points, width, style.border]);

  // Guardrail ribbon mesh geometry
  const leftRailGeo = useMemo(() => leftRail ? ribbon(leftRail, 0.3) : null, [leftRail]);
  const rightRailGeo = useMemo(() => rightRail ? ribbon(rightRail, 0.3) : null, [rightRail]);

  // 4) Street Lamp Placement Positions along left offset line
  const lampPositions = useMemo(() => {
    if (!node.showLamps || points.length < 2) return [];
    const leftOffset = offsetPolyline(points, width / 2 + 1.2);
    const result = [];
    let distAcc = 0;
    const interval = 22; // place lamp every 22 meters

    for (let i = 0; i < leftOffset.length - 1; i++) {
      const [ax, az] = leftOffset[i];
      const [bx, bz] = leftOffset[i + 1];
      const segLen = Math.hypot(bx - ax, bz - az);
      distAcc += segLen;
      if (i === 0 || distAcc >= interval) {
        result.push([ax, az]);
        distAcc = 0;
      }
    }
    return result;
  }, [node.showLamps, points, width]);

  const handleClick = (e) => {
    e.stopPropagation();
    if (onSelect) onSelect(node.id);
  };

  const fillColor = node.fillColor || style.color;
  const casingColor = node.casingColor || (selected ? theme.path.selected : style.casing);

  return (
    <group onClick={handleClick}>
      {/* Invisible wider hit mesh for easy clicking */}
      <mesh geometry={hitMeshGeo} position={[0, yBase, 0]} visible={false}>
        <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>

      {/* Selection highlight outline */}
      {selected && (
        <mesh geometry={highlight} position={[0, yBase - 0.005, 0]}>
          <meshBasicMaterial color={theme.path.selectedGlow || '#00f0ff'} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Casing border underneath */}
      <mesh geometry={casing} position={[0, yBase, 0]} receiveShadow castShadow={elevation > 0}>
        <meshStandardMaterial
          polygonOffset
          color={casingColor}
          roughness={0.9}
        />
      </mesh>

      {/* Colored fill just above casing */}
      <mesh geometry={fill} position={[0, yBase + 0.015, 0]} receiveShadow castShadow={elevation > 0}>
        <meshStandardMaterial
          color={fillColor}
          roughness={0.9}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Dashed Centerline overlay */}
      {centerlineGeo && (
        <mesh geometry={centerlineGeo} position={[0, yBase + 0.025, 0]}>
          <meshStandardMaterial
            color={node.pathClass === 'major' ? theme.path.centerline : theme.path.centerlineSecondary}
            roughness={0.5}
            polygonOffset
            polygonOffsetFactor={-4}
            polygonOffsetUnits={-4}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Overpass Guardrail Safety Railings */}
      {leftRailGeo && (
        <mesh geometry={leftRailGeo} position={[0, yBase + 0.6, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={theme.path.guardrail || '#94a3b8'} roughness={0.4} metalness={0.8} />
        </mesh>
      )}
      {rightRailGeo && (
        <mesh geometry={rightRailGeo} position={[0, yBase + 0.6, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={theme.path.guardrail || '#94a3b8'} roughness={0.4} metalness={0.8} />
        </mesh>
      )}

      {/* Support pillars for elevated overpasses/bridges */}
      {elevation > 0 && node.polyline.map(([px, pz], idx) => {
        const pillarHeight = yBase;
        return (
          <mesh
            key={`pillar-${idx}`}
            position={[px, pillarHeight / 2, pz]}
            castShadow
            receiveShadow
          >
            <cylinderGeometry args={[0.35, 0.45, pillarHeight, 8]} />
            <meshStandardMaterial color={theme.path.pillar || '#52525b'} roughness={0.7} />
          </mesh>
        );
      })}

      {/* Scattered Street Lamp Posts */}
      {lampPositions.map(([lx, lz], idx) => (
        <StreetLamp key={`lamp-${idx}`} position={[lx, yBase, lz]} />
      ))}
    </group>
  );
}



