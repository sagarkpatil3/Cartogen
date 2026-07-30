// @ts-check
import { useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from '../store/scene-store.js';
import { moveWaypoint, insertWaypoint } from '../lib/geometry.js';
import { makeProjector } from '../lib/projection.js';
import { pathStyle } from './theme.js';

/**
 * PATH WAYPOINT HANDLE — interactive 3D handle sphere for dragging a single vertex.
 */
function WaypointHandle({ index, position, yBase, node, origin, updateNode, onSelectWaypoint, isSelected }) {
  const controls = useThree((s) => s.controls);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), -yBase));
  const intersectPoint = useRef(new THREE.Vector3());
  const lastPos = useRef([position[0], position[1]]);

  const handlePointerDown = (e) => {
    e.stopPropagation();
    try {
      e.target.setPointerCapture(e.pointerId);
    } catch (err) {}
    setDragging(true);
    if (controls) controls.enabled = false;
    if (onSelectWaypoint) onSelectWaypoint(index);
    lastPos.current = [position[0], position[1]];
  };

  const handlePointerMove = (e) => {
    if (!dragging) return;
    e.stopPropagation();

    // Use R3F's built-in raycaster ray which accurately factors in canvas DOM bounds & sidebar width!
    dragPlane.current.constant = -yBase;
    const ray = e.ray;
    if (ray && ray.intersectPlane(dragPlane.current, intersectPoint.current)) {
      const nx = Math.round(intersectPoint.current.x * 5) / 5;
      const nz = Math.round(intersectPoint.current.z * 5) / 5;

      if (nx !== lastPos.current[0] || nz !== lastPos.current[1]) {
        lastPos.current = [nx, nz];
        const updatedPolyline = moveWaypoint(node.polyline, index, [nx, nz]);
        const proj = makeProjector(origin);
        const updatedPolylineGeo = updatedPolyline.map((pt) => proj.toGeo(pt));

        updateNode(node.id, {
          polyline: updatedPolyline,
          polylineGeo: updatedPolylineGeo,
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
      position={[position[0], yBase + 0.4, position[1]]}
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
      <sphereGeometry args={[isSelected ? 0.7 : hovered || dragging ? 0.6 : 0.45, 16, 16]} />
      <meshStandardMaterial
        color={dragging ? '#ff3366' : isSelected ? '#00f0ff' : hovered ? '#00d2ff' : '#f0913f'}
        emissive={isSelected || dragging || hovered ? '#0088cc' : '#331100'}
        emissiveIntensity={0.6}
        roughness={0.2}
      />
    </mesh>
  );
}


/**
 * SEGMENT SUBDIVIDE HANDLE — "+" sphere handle placed at segment midpoints to split segment.
 */
function SubdivideHandle({ segmentIndex, posA, posB, yBase, node, origin, updateNode }) {
  const [hovered, setHovered] = useState(false);
  const midX = (posA[0] + posB[0]) / 2;
  const midZ = (posA[1] + posB[1]) / 2;

  const handleClick = (e) => {
    e.stopPropagation();
    const updatedPolyline = insertWaypoint(node.polyline, segmentIndex);
    const proj = makeProjector(origin);
    const updatedPolylineGeo = updatedPolyline.map((pt) => proj.toGeo(pt));

    updateNode(node.id, {
      polyline: updatedPolyline,
      polylineGeo: updatedPolylineGeo,
    });
  };

  return (
    <mesh
      position={[midX, yBase + 0.35, midZ]}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[hovered ? 0.4 : 0.28, 12, 12]} />
      <meshStandardMaterial
        color={hovered ? '#10b981' : '#64748b'}
        emissive={hovered ? '#059669' : '#1e293b'}
        emissiveIntensity={0.5}
      />
    </mesh>
  );
}

/**
 * PATH EDITOR — renders interactive 3D handles when a path node is selected.
 */
export default function PathEditor({ selectedWaypointIndex, onSelectWaypoint }) {
  const nodes = useSceneStore((s) => s.nodes);
  const selectedId = useSceneStore((s) => s.selectedId);
  const updateNode = useSceneStore((s) => s.updateNode);
  const origin = useSceneStore((s) => s.origin);

  const node = nodes.find((n) => n.id === selectedId);
  if (!node || node.type !== 'path' || !node.polyline) return null;

  const style = pathStyle(node.pathClass);
  const elevation = node.elevation || 0;
  const yBase = style.y + elevation;

  return (
    <group key={`path-editor-${node.id}`}>
      {/* Waypoint vertex handles */}
      {node.polyline.map((pt, idx) => (
        <WaypointHandle
          key={`wp-${idx}`}
          index={idx}
          position={pt}
          yBase={yBase}
          node={node}
          origin={origin}
          updateNode={updateNode}
          onSelectWaypoint={onSelectWaypoint}
          isSelected={selectedWaypointIndex === idx}
        />
      ))}

      {/* Subdivide midpoint handles between consecutive waypoints */}
      {node.polyline.slice(0, -1).map((pt, idx) => (
        <SubdivideHandle
          key={`sub-${idx}`}
          segmentIndex={idx}
          posA={pt}
          posB={node.polyline[idx + 1]}
          yBase={yBase}
          node={node}
          origin={origin}
          updateNode={updateNode}
        />
      ))}
    </group>
  );
}
