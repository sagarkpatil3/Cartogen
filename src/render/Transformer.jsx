// @ts-check
import { useRef, useEffect, useState } from 'react';
import { TransformControls } from '@react-three/drei';
import { useSceneStore } from '../store/scene-store.js';
import { centroid } from '../lib/geometry.js';
import { makeProjector } from '../lib/projection.js';

/**
 * TRANSFORMER — attaches 3D Move / Rotate / Scale transform gizmo to the selected node (Tree or Building).
 */
export default function Transformer() {
  const controlsRef = useRef(null);
  const [target, setTarget] = useState(null);

  const nodes = useSceneStore((s) => s.nodes);
  const selectedId = useSceneStore((s) => s.selectedId);
  const gizmoMode = useSceneStore((s) => s.gizmoMode);
  const updateNode = useSceneStore((s) => s.updateNode);
  const origin = useSceneStore((s) => s.origin);

  const node = nodes.find((n) => n.id === selectedId);

  // Read centroid for building or position for tree
  const center = node?.type === 'building' && node.footprint
    ? centroid(node.footprint)
    : node?.position || [0, 0];

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls || !node || !target) return;

    const onDragEnd = () => {
      const obj = target;
      if (!obj) return;

      if (node.type === 'tree' || node.type === 'composed') {
        updateNode(node.id, {
          position: [obj.position.x, obj.position.z],
          scale: obj.scale.x,
          rotation: obj.rotation.y,
        });
      } else if (node.type === 'building' && node.footprint) {
        // Compute delta translation, rotation, and scale from gizmo
        const dx = obj.position.x - center[0];
        const dz = obj.position.z - center[1];
        const dRot = obj.rotation.y;
        const dScaleX = obj.scale.x;
        const dScaleZ = obj.scale.z;

        const [cx, cz] = center;
        const proj = makeProjector(origin);

        const newFootprint = node.footprint.map(([x, z]) => {
          // 1. Scale around centroid
          let rx = (x - cx) * dScaleX;
          let rz = (z - cz) * dScaleZ;

          // 2. Rotate around centroid
          if (Math.abs(dRot) > 0.001) {
            const cos = Math.cos(dRot);
            const sin = Math.sin(dRot);
            const nx = rx * cos - rz * sin;
            const nz = rx * sin + rz * cos;
            rx = nx;
            rz = nz;
          }

          // 3. Translate
          return [cx + rx + dx, cz + rz + dz];
        });

        const newFootprintGeo = newFootprint.map((pt) => proj.toGeo(pt));

        updateNode(node.id, {
          footprint: newFootprint,
          footprintGeo: newFootprintGeo,
        });

        // Reset local gizmo object transform
        obj.position.set(cx + dx, 0, cz + dz);
        obj.rotation.set(0, 0, 0);
        obj.scale.set(1, 1, 1);
      }
    };

    controls.addEventListener('mouseUp', onDragEnd);
    return () => controls.removeEventListener('mouseUp', onDragEnd);
  }, [node, center, origin, updateNode, target]);

  if (!node || (node.type !== 'tree' && node.type !== 'building' && node.type !== 'composed')) return null;
  if (gizmoMode === 'none') return null;

  const yPos = node.type === 'building' ? (node.height || 10) / 2 : 0;
  const nodeRotation = node.rotation || 0;
  const nodeScale = node.scale ?? 1;
  return (
    <>
      {target && (
        <TransformControls
          ref={controlsRef}
          object={target}
          mode={gizmoMode}
          showX={gizmoMode !== 'rotate'}
          showZ={gizmoMode !== 'rotate'}
        />
      )}
      <group
        ref={setTarget}
        position={[center[0], yPos, center[1]]}
        rotation={[0, nodeRotation, 0]}
        scale={typeof nodeScale === 'number' ? [nodeScale, nodeScale, nodeScale] : nodeScale}
      >
        <mesh visible={false}>
          <boxGeometry args={[4, node.height || 6, 4]} />
        </mesh>
      </group>
    </>
  );
}