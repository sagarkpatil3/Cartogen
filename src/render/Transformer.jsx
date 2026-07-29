// @ts-check
import { useRef, useEffect } from 'react';
import { TransformControls } from '@react-three/drei';
import { useSceneStore } from '../store/scene-store.js';

/**
 * TRANSFORMER — wraps the selected TREE with a move/rotate/scale gizmo.
 * Reads gizmoMode from the store; commits the new transform back via updateNode
 * when the drag ends. Only trees are transformable for now (they have a simple
 * position + scale). Buildings/paths come later (they're defined by geometry).
 */
export default function Transformer() {
  const controlsRef = useRef(null);
  const groupRef = useRef(null);

  const nodes = useSceneStore((s) => s.nodes);
  const selectedId = useSceneStore((s) => s.selectedId);
  const gizmoMode = useSceneStore((s) => s.gizmoMode);
  const updateNode = useSceneStore((s) => s.updateNode);

  const node = nodes.find((n) => n.id === selectedId);
  const isTree = node?.type === 'tree';

  // when the drag finishes, read the object's transform and write it to the store
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const onDragEnd = () => {
        const obj = groupRef.current;
        if (!obj || !node) return;
        updateNode(node.id, {
            position: [obj.position.x, obj.position.z],
            scale: obj.scale.x,
            rotation: obj.rotation.y,     // ← Y-axis spin (around the vertical)
        });
    };

    // 'mouseUp' fires when you release the gizmo
    controls.addEventListener('mouseUp', onDragEnd);
    return () => controls.removeEventListener('mouseUp', onDragEnd);
  }, [node, updateNode]);

  if (!isTree) return null;

  return (
    <>
    <TransformControls ref={controlsRef} object={groupRef} mode={gizmoMode} />
    <group ref={groupRef} position={[node.position[0], 0, node.position[1]]}>
        <mesh visible={false}><boxGeometry args={[2,6,2]} /></mesh>
    </group>
    </>
  );
}