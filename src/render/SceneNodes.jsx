import { useSceneStore } from '../store/scene-store.js';
import Building from './Building.jsx';
import BuildingEditor from './BuildingEditor.jsx';
import Path from './Path.jsx';
import PathEditor from './PathEditor.jsx';
import Surface from './Surface.jsx';
import SurfaceEditor from './SurfaceEditor.jsx';
import Tree from './Tree.jsx';
import ComposedObject from './ComposedObject.jsx';
import WayfindingRoute from './WayfindingRoute.jsx';

export default function SceneNodes() {
  const nodes = useSceneStore((s) => s.nodes);
  const selectedId = useSceneStore((s) => s.selectedId);
  const select = useSceneStore((s) => s.select);

  const surfaces = nodes.filter((n) => n.type === 'surface');
  const paths = nodes.filter((n) => n.type === 'path');
  const buildings = nodes.filter((n) => n.type === 'building');
  const trees = nodes.filter((n) => n.type === 'tree');
  const composed = nodes.filter((n) => n.type === 'composed');

  return (
    <>
      {surfaces.map((n) => (
        <Surface key={n.id} node={n} selected={n.id === selectedId} onSelect={select} />
      ))}
      {paths.map((n) => (
        <Path key={n.id} node={n} selected={n.id === selectedId} onSelect={select} />
      ))}
      {trees.map((n) => (
        <Tree key={n.id} node={n} selected={n.id === selectedId} onSelect={select} />
      ))}
      {buildings.map((n) => (
        <Building key={n.id} node={n} selected={n.id === selectedId} onSelect={select} />
      ))}
      {composed.map((n) => (
        <ComposedObject
          key={n.id}
          node={n}
          selected={n.id === selectedId}
          onSelect={select}
        />
      ))}
      <WayfindingRoute />
      <BuildingEditor />
      <PathEditor />
      <SurfaceEditor />
    </>
  );
}
