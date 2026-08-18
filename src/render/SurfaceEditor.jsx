// @ts-check
import { useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from '../store/scene-store.js';
import { moveFootprintVertex, insertFootprintVertex } from '../lib/geometry.js';
import { makeProjector } from '../lib/projection.js';

/**
 * SURFACE / SLAB CORNER HANDLE — interactive 3D handle sphere for pulling & stretching slab floor corners.
 */
function SlabCornerHandle({ index, position, yTop, node, origin, updateNode }) {
  const controls = useThree((s) => s.controls);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), -yTop));
  const intersectPoint = useRef(new THREE.Vector3());
  const lastPos = useRef([position[0], position[1]]);

  const handlePointerDown = (e) => {
    e.stopPropagation();
    try {
      e.target.setPointerCapture(e.pointerId);
    } catch (err) {}
    setDragging(true);
    if (controls) controls.enabled = false;
    lastPos.current = [position[0], position[1]];
  };

  const handlePointerMove = (e) => {
    if (!dragging) return;
    e.stopPropagation();

    dragPlane.current.constant = -yTop;
    const ray = e.ray;
    if (ray && ray.intersectPlane(dragPlane.current, intersectPoint.current)) {
      const nx = Math.round(intersectPoint.current.x * 5) / 5;
      const nz = Math.round(intersectPoint.current.z * 5) / 5;

      if (nx !== lastPos.current[0] || nz !== lastPos.current[1]) {
        lastPos.current = [nx, nz];
        const updatedPolygon = moveFootprintVertex(node.polygon, index, [nx, nz]);
        const proj = makeProjector(origin);
        const updatedPolygonGeo = updatedPolygon.map((pt) => proj.toGeo(pt));

        updateNode(node.id, {
          polygon: updatedPolygon,
          polygonGeo: updatedPolygonGeo,
        });
      }
    }
  };

  const handlePointerUp = (e) => {
    if (dragging) {
      e.stopPropagation();
      try {
        e.target.releasePointerCapture(e.pointerId);
      } catch (err) {}
      setDragging(false);
      if (controls) controls.enabled = true;
    }
  };

  return (
    <mesh
      position={[position[0], yTop, position[1]]}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[hovered || dragging ? 0.65 : 0.5, 16, 16]} />
      <meshStandardMaterial
        color={dragging ? '#ff3366' : hovered ? '#00d2ff' : '#38bdf8'}
        emissive={dragging || hovered ? '#0284c7' : '#0369a1'}
        emissiveIntensity={0.6}
        roughness={0.2}
      />
    </mesh>
  );
}

/**
 * SURFACE / SLAB EDITOR — Renders interactive corner handles and edge midpoints to pull & stretch slab floor surfaces.
 */
export default function SurfaceEditor() {
  const nodes = useSceneStore((s) => s.nodes);
  const selectedId = useSceneStore((s) => s.selectedId);
  const updateNode = useSceneStore((s) => s.updateNode);
  const origin = useSceneStore((s) => s.origin);

  const selectedNode = nodes.find((n) => n.id === selectedId && n.type === 'surface');

  if (!selectedNode || !selectedNode.polygon || selectedNode.polygon.length < 3) {
    return null;
  }

  const polygon = selectedNode.polygon;
  const corners = polygon.slice(0, -1);
  const elevation = selectedNode.elevation || 0;
  const height = selectedNode.height || 0;
  const yTop = elevation + height + 0.3;

  return (
    <group key={`slab-editor-${selectedNode.id}`}>
      {/* Interactive Corner Pulling Handles */}
      {corners.map(([x, z], idx) => (
        <SlabCornerHandle
          key={`corner-${idx}`}
          index={idx}
          position={[x, z]}
          yTop={yTop}
          node={selectedNode}
          origin={origin}
          updateNode={updateNode}
        />
      ))}
    </group>
  );
}
