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

  // 1) Geometry points: apply Chaikin corner smoothing for beautiful rounded turns
  const points = useMemo(() => {
    if (!node.polyline || node.polyline.length < 2) return [];
    const level = node.smoothness ?? 2;
    return level > 0 ? smoothPolyline(node.polyline, level) : node.polyline;
  }, [node.polyline, node.smoothness]);


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
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
          color={casingColor}
          roughness={0.9}
        />
      </mesh>

      {/* Colored fill just above casing */}
      {node.pathType === 'stairs' ? (
        <StairsMesh points={points} width={width} stepCount={node.stepCount} handrail={node.handrail} yBase={yBase} selected={selected} />
      ) : (
        <mesh geometry={fill} position={[0, yBase + 0.015, 0]} receiveShadow castShadow={elevation > 0}>
          <meshStandardMaterial
            polygonOffset
            polygonOffsetFactor={-3}
            polygonOffsetUnits={-3}
            color={fillColor}
            roughness={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Accessible Ramp ADA Accent Ribbon */}
      {node.pathType === 'accessible_ramp' && (
        <mesh geometry={fill} position={[0, yBase + 0.025, 0]}>
          <meshStandardMaterial color="#0284c7" emissive="#0284c7" emissiveIntensity={0.2} roughness={0.4} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Dashed Centerline */}
      {showCenterline && centerlineGeo && (
        <mesh geometry={centerlineGeo} position={[0, yBase + 0.03, 0]}>
          <meshBasicMaterial color={node.pathClass === 'walkway' ? '#ffffff' : theme.path.centerline || '#facc15'} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Handrails for Stairs and Ramps */}
      {(node.handrail || node.pathType === 'stairs' || node.pathType === 'accessible_ramp') && leftRailGeo && rightRailGeo && (
        <group position={[0, yBase + 0.9, 0]}>
          <mesh geometry={leftRailGeo}>
            <meshStandardMaterial color={node.pathType === 'accessible_ramp' ? '#0284c7' : '#94a3b8'} roughness={0.3} metalness={0.8} side={THREE.DoubleSide} />
          </mesh>
          <mesh geometry={rightRailGeo}>
            <meshStandardMaterial color={node.pathType === 'accessible_ramp' ? '#0284c7' : '#94a3b8'} roughness={0.3} metalness={0.8} side={THREE.DoubleSide} />
          </mesh>
        </group>
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

/** Flat Architectural Staircase Component (Zero Elevation Gain, Editable Step Count) */
function StairsMesh({ points, width, stepCount, handrail, yBase, selected }) {
  const { treadsGeo, risersGeo, handrailsGeo } = useMemo(() => {
    if (!points || points.length < 2) return { treadsGeo: null, risersGeo: null, handrailsGeo: null };
    const numSteps = Math.max(3, stepCount || 8);
    const treadPos = [];
    const riserPos = [];
    const railPos = [];

    const hw = width / 2;
    const railHeight = 0.85; // 85cm handrail height

    for (let i = 0; i < points.length - 1; i++) {
      const [ax, az] = points[i], [bx, bz] = points[i + 1];
      const segLen = Math.hypot(bx - ax, bz - az);
      if (segLen < 0.2) continue;

      let dx = (bx - ax) / segLen, dz = (bz - az) / segLen;
      const nx = -dz * hw, nz = dx * hw;

      for (let s = 0; s < numSteps; s++) {
        const t1 = s / numSteps;
        const t2 = (s + 0.82) / numSteps; // 82% step tread surface
        const t3 = (s + 1.0) / numSteps;  // 18% dark contrast riser line

        const x1 = ax + (bx - ax) * t1, z1 = az + (bz - az) * t1;
        const x2 = ax + (bx - ax) * t2, z2 = az + (bz - az) * t2;
        const x3 = ax + (bx - ax) * t3, z3 = az + (bz - az) * t3;

        // 1) Flat Step Tread Surface (Light Stone / Concrete)
        treadPos.push(
          x1 + nx, 0, z1 + nz,  x1 - nx, 0, z1 - nz,  x2 - nx, 0, z2 - nz,
          x1 + nx, 0, z1 + nz,  x2 - nx, 0, z2 - nz,  x2 + nx, 0, z2 + nz
        );

        // 2) Dark Riser Contrast Line (Separates each step)
        riserPos.push(
          x2 + nx, 0, z2 + nz,  x2 - nx, 0, z2 - nz,  x3 - nx, 0, z3 - nz,
          x2 + nx, 0, z2 + nz,  x3 - nx, 0, z3 - nz,  x3 + nx, 0, z3 + nz
        );

        // 3) Metallic Handrails (If enabled)
        if (handrail) {
          const ry = railHeight;
          // Left rail
          railPos.push(
            x1 + nx, ry, z1 + nz,  x3 + nx, ry, z3 + nz,  x3 + nx, ry + 0.04, z3 + nz,
            x1 + nx, ry, z1 + nz,  x3 + nx, ry + 0.04, z3 + nz,  x1 + nx, ry + 0.04, z1 + nz
          );
          // Right rail
          railPos.push(
            x1 - nx, ry, z1 - nz,  x3 - nx, ry + 0.04, z3 - nz,  x3 - nx, ry, z3 - nz,
            x1 - nx, ry, z1 - nz,  x1 - nx, ry + 0.04, z1 - nz,  x3 - nx, ry + 0.04, z3 - nz
          );

          // Support stanchion post every 4 steps
          if (s % 4 === 0) {
            railPos.push(
              x1 + nx - 0.02, 0, z1 + nz - 0.02,  x1 + nx + 0.02, 0, z1 + nz + 0.02,  x1 + nx + 0.02, ry, z1 + nz + 0.02,
              x1 + nx - 0.02, 0, z1 + nz - 0.02,  x1 + nx + 0.02, ry, z1 + nz + 0.02,  x1 + nx - 0.02, ry, z1 + nz - 0.02
            );
            railPos.push(
              x1 - nx - 0.02, 0, z1 - nz - 0.02,  x1 - nx + 0.02, ry, z1 - nz + 0.02,  x1 - nx + 0.02, 0, z1 - nz + 0.02,
              x1 - nx - 0.02, 0, z1 - nz - 0.02,  x1 - nx - 0.02, ry, z1 - nz - 0.02,  x1 - nx + 0.02, ry, z1 - nz + 0.02
            );
          }
        }
      }
    }

    const gTreads = new THREE.BufferGeometry();
    gTreads.setAttribute('position', new THREE.Float32BufferAttribute(treadPos, 3));
    gTreads.computeVertexNormals();

    const gRisers = new THREE.BufferGeometry();
    gRisers.setAttribute('position', new THREE.Float32BufferAttribute(riserPos, 3));
    gRisers.computeVertexNormals();

    const gRails = handrail && railPos.length > 0 ? new THREE.BufferGeometry() : null;
    if (gRails) {
      gRails.setAttribute('position', new THREE.Float32BufferAttribute(railPos, 3));
      gRails.computeVertexNormals();
    }

    return { treadsGeo: gTreads, risersGeo: gRisers, handrailsGeo: gRails };
  }, [points, width, stepCount, handrail]);

  if (!treadsGeo) return null;

  return (
    <group position={[0, yBase + 0.02, 0]}>
      {/* Flat Light Step Treads */}
      <mesh geometry={treadsGeo} receiveShadow>
        <meshStandardMaterial
          color={selected ? '#38bdf8' : '#f8fafc'}
          roughness={0.4}
          side={THREE.DoubleSide}
          polygonOffset
          polygonOffsetFactor={-3}
          polygonOffsetUnits={-3}
        />
      </mesh>

      {/* Dark Step Riser Contrast Lines */}
      {risersGeo && (
        <mesh geometry={risersGeo}>
          <meshStandardMaterial
            color="#334155"
            roughness={0.8}
            side={THREE.DoubleSide}
            polygonOffset
            polygonOffsetFactor={-4}
            polygonOffsetUnits={-4}
          />
        </mesh>
      )}

      {/* Metallic Handrails */}
      {handrailsGeo && (
        <mesh geometry={handrailsGeo} castShadow receiveShadow>
          <meshStandardMaterial
            color={selected ? '#0ea5e9' : '#475569'}
            metalness={0.8}
            roughness={0.2}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
