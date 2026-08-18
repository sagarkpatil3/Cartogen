// @ts-check
import { useMemo } from 'react';
import * as THREE from 'three';
import { fillPolygon, ribbon } from '../lib/geometry.js';
import { surfaceStyle } from './theme.js';

export default function Surface({ node, selected = false, onSelect }) {
  const geometry = useMemo(() => fillPolygon(node.polygon), [node.polygon]);
  const style = surfaceStyle(node.material); // { color, y }
  const elevation = node.elevation || 0;
  const height = node.height || 0;
  const yBase = style.y + elevation;

  const surfaceColor = node.color || style.color;

  // 3D Extruded Slab Platform Retaining Side Walls
  const sideWallsGeometry = useMemo(() => {
    if (height <= 0 || !node.polygon || node.polygon.length < 3) return null;

    const wallPos = [];
    const polygon = node.polygon;

    for (let i = 0; i < polygon.length - 1; i++) {
      const [ax, az] = polygon[i];
      const [bx, bz] = polygon[i + 1];

      // Vertical quad face for slab side wall
      wallPos.push(
        ax, 0, az,       bx, 0, bz,       bx, height, bz,
        ax, 0, az,       bx, height, bz,   ax, height, az
      );
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(wallPos, 3));
    g.computeVertexNormals();
    return g;
  }, [node.polygon, height]);

  // Architectural Curb Border for Parking Lots
  const borderGeometry = useMemo(() => {
    if (node.material !== 'parking' || !node.polygon || node.polygon.length < 3) return null;
    return ribbon(node.polygon, 1.0); // 1m concrete curb border outline
  }, [node.material, node.polygon]);

  // Interior Parking Bay Stall Markings
  const parkingStallGeometry = useMemo(() => {
    if (node.material !== 'parking' || !node.polygon || node.polygon.length < 3) return null;
    
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [x, z] of node.polygon) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }

    const width = maxX - minX;
    const heightBound = maxZ - minZ;
    if (width < 8 || heightBound < 8) return null;

    const pos = [];
    const stallSpacing = 4.5;
    const hw = 0.1;

    for (let x = minX + 3; x < maxX - 3; x += stallSpacing) {
      for (let z = minZ + 3; z < maxZ - 3; z += 12) {
        pos.push(
          x - hw, 0, z,       x + hw, 0, z,       x + hw, 0, z + 5,
          x - hw, 0, z,       x + hw, 0, z + 5,   x - hw, 0, z + 5
        );
      }
    }

    if (pos.length === 0) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  }, [node.material, node.polygon]);

  const isParking = node.material === 'parking';

  const handleClick = (e) => {
    e.stopPropagation();
    if (onSelect) onSelect(node.id);
  };

  return (
    <group position={[0, yBase, 0]} onClick={handleClick}>
      {/* Top Surface Slab Floor */}
      <mesh geometry={geometry} position={[0, height, 0]} receiveShadow castShadow={height > 0}>
        <meshStandardMaterial
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
          color={selected ? '#38bdf8' : surfaceColor}
          roughness={isParking ? 0.85 : 0.7}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Solid Extruded Slab Side Retaining Walls */}
      {sideWallsGeometry && (
        <mesh geometry={sideWallsGeometry} position={[0, 0, 0]} receiveShadow castShadow>
          <meshStandardMaterial
            color="#64748b"
            roughness={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Concrete Curb Perimeter Outline */}
      {borderGeometry && (
        <mesh geometry={borderGeometry} position={[0, height + 0.005, 0]}>
          <meshStandardMaterial
            color="#94a3b8"
            roughness={0.7}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
          />
        </mesh>
      )}

      {/* Interior Parking Bay Marking Lines */}
      {parkingStallGeometry && (
        <mesh geometry={parkingStallGeometry} position={[0, height + 0.01, 0]}>
          <meshStandardMaterial
            color="#f8fafc"
            roughness={0.4}
            polygonOffset
            polygonOffsetFactor={-3}
            polygonOffsetUnits={-3}
          />
        </mesh>
      )}
    </group>
  );
}