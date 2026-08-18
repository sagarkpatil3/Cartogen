// @ts-check
import { useMemo } from 'react';
import * as THREE from 'three';
import { useSceneStore } from '../store/scene-store.js';
import { ribbon } from '../lib/geometry.js';

/**
 * PODIUM TERRACE SLAB — Synthesizes solid 3D concrete base floor terrace slabs
 * for elevation plateaus (Y_plateau > 0), bridging stairs to building facades cleanly.
 */
export default function PodiumTerrace() {
  const nodes = useSceneStore((s) => s.nodes);

  const plateauNodes = useMemo(() => {
    return nodes.filter((n) => n.type === 'path' && n.elevation > 0.1 && n.polyline && n.polyline.length >= 2);
  }, [nodes]);

  const terraceGeometries = useMemo(() => {
    if (plateauNodes.length === 0) return [];

    return plateauNodes.map((node) => {
      const elevation = node.elevation || 0;
      const width = (node.widthOverride || 4.2) + 2.0; // 2m extra buffer for terrace plaza
      const topRibbon = ribbon(node.polyline, width);

      // Create vertical side walls extruding from Y_plateau down to ground (Y = 0)
      const wallPos = [];
      const hw = width / 2;

      for (let i = 0; i < node.polyline.length - 1; i++) {
        const [ax, az] = node.polyline[i];
        const [bx, bz] = node.polyline[i + 1];
        const len = Math.hypot(bx - ax, bz - az) || 1;
        const dx = (bx - ax) / len, dz = (bz - az) / len;
        const nx = -dz * hw, nz = dx * hw;

        // Left vertical terrace wall
        wallPos.push(
          ax + nx, 0, az + nz,  ax + nx, elevation, az + nz,  bx + nx, elevation, bz + nz,
          ax + nx, 0, az + nz,  bx + nx, elevation, bz + nz,  bx + nx, 0, bz + nz
        );

        // Right vertical terrace wall
        wallPos.push(
          ax - nx, 0, az - nz,  bx - nx, elevation, bz - nz,  ax - nx, elevation, az - nz,
          ax - nx, 0, az - nz,  bx - nx, 0, bz - nz,          bx - nx, elevation, bz - nz
        );
      }

      const wallGeo = new THREE.BufferGeometry();
      wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(wallPos, 3));
      wallGeo.computeVertexNormals();

      return { id: node.id, elevation, topRibbon, wallGeo };
    });
  }, [plateauNodes]);

  if (terraceGeometries.length === 0) return null;

  return (
    <group key="podium-terrace-group">
      {terraceGeometries.map((t) => (
        <group key={`terrace-${t.id}`} position={[0, 0, 0]}>
          {/* Top Terrace Floor Surface */}
          <mesh geometry={t.topRibbon} position={[0, t.elevation + 0.01, 0]} receiveShadow castShadow>
            <meshStandardMaterial color="#cbd5e1" roughness={0.6} side={THREE.DoubleSide} />
          </mesh>

          {/* Solid Vertical Concrete Terrace Walls down to ground */}
          {t.wallGeo && (
            <mesh geometry={t.wallGeo} position={[0, 0, 0]} receiveShadow castShadow>
              <meshStandardMaterial color="#64748b" roughness={0.8} side={THREE.DoubleSide} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}
