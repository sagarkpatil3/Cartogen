// @ts-check
import { useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from '../store/scene-store.js';
import { moveFootprintVertex, insertFootprintVertex } from '../lib/geometry.js';
import { makeProjector } from '../lib/projection.js';

/**
 * BUILDING CORNER HANDLE — 3D handle sphere at building footprint corners for reshaping walls & structure.
 */
function CornerHandle({ index, position, height, node, origin, updateNode, isSelected }) {
  const controls = useThree((s) => s.controls);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const yTop = (height || 10) + 0.4;
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
        const updatedFootprint = moveFootprintVertex(node.footprint, index, [nx, nz]);
        const proj = makeProjector(origin);
        const updatedFootprintGeo = updatedFootprint.map((pt) => proj.toGeo(pt));

        updateNode(node.id, {
          footprint: updatedFootprint,
          footprintGeo: updatedFootprintGeo,
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
      <sphereGeometry args={[isSelected ? 0.75 : hovered || dragging ? 0.65 : 0.5, 16, 16]} />
      <meshStandardMaterial
        color={dragging ? '#ff3366' : isSelected ? '#00f0ff' : hovered ? '#00d2ff' : '#38bdf8'}
        emissive={isSelected || dragging || hovered ? '#0284c7' : '#0369a1'}
        emissiveIntensity={0.6}
        roughness={0.2}
      />
    </mesh>
  );
}

/**
 * WALL SUBDIVIDE HANDLE — "+" sphere handle placed at wall midpoints to add a new corner/wing.
 */
function WallSubdivideHandle({ segmentIndex, posA, posB, height, node, origin, updateNode }) {
  const [hovered, setHovered] = useState(false);
  const yTop = (height || 10) + 0.35;
  const midX = (posA[0] + posB[0]) / 2;
  const midZ = (posA[1] + posB[1]) / 2;

  const handleClick = (e) => {
    e.stopPropagation();
    const updatedFootprint = insertFootprintVertex(node.footprint, segmentIndex);
    const proj = makeProjector(origin);
    const updatedFootprintGeo = updatedFootprint.map((pt) => proj.toGeo(pt));

    updateNode(node.id, {
      footprint: updatedFootprint,
      footprintGeo: updatedFootprintGeo,
    });
  };

  return (
    <mesh
      position={[midX, yTop, midZ]}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[hovered ? 0.42 : 0.3, 12, 12]} />
      <meshStandardMaterial
        color={hovered ? '#10b981' : '#64748b'}
        emissive={hovered ? '#059669' : '#1e293b'}
        emissiveIntensity={0.5}
      />
    </mesh>
  );
}

/**
 * BUILDING EDITOR — renders interactive 3D corner & wall subdivide handles when a building is selected.
 */
export default function BuildingEditor() {
  const nodes = useSceneStore((s) => s.nodes);
  const selectedId = useSceneStore((s) => s.selectedId);
  const updateNode = useSceneStore((s) => s.updateNode);
  const origin = useSceneStore((s) => s.origin);

  const node = nodes.find((n) => n.id === selectedId);
  if (!node || node.type !== 'building' || !node.footprint || node.footprint.length < 3) return null;

  // Closed polygon ring has last point == first point
  const corners = node.footprint.slice(0, -1);
  const height = node.height || 10;

  return (
    <group key={`building-editor-${node.id}`}>
      {/* Corner vertex handles */}
      {corners.map((pt, idx) => (
        <CornerHandle
          key={`corner-${idx}`}
          index={idx}
          position={pt}
          height={height}
          node={node}
          origin={origin}
          updateNode={updateNode}
          isSelected={false}
        />
      ))}

      {/* Wall subdivide midpoint handles */}
      {node.footprint.slice(0, -1).map((pt, idx) => (
        <WallSubdivideHandle
          key={`wall-sub-${idx}`}
          segmentIndex={idx}
          posA={pt}
          posB={node.footprint[idx + 1]}
          height={height}
          node={node}
          origin={origin}
          updateNode={updateNode}
        />
      ))}
    </group>
  );
}
