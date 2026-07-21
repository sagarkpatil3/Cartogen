import { useSceneStore } from '../store/scene-store.js';
import Building from './Building.jsx';
import Path from './Path.jsx';
import Surface from './Surface.jsx';

export default function SceneNodes() {
  const nodes = useSceneStore((s) => s.nodes);
  const selectedId = useSceneStore((s) => s.selectedId);
  const select = useSceneStore((s) => s.select);
 
  const surfaces = nodes.filter((n) => n.type === 'surface');
  const paths = nodes.filter((n) => n.type === 'path');
  const buildings = nodes.filter((n) => n.type === 'building');
  console.log('SCENENODES: rendering', paths.length, 'paths'); 
  return (
    <>
      {surfaces.map((n) => <Surface key={n.id} node={n} />)}
      {paths.map((n) => <Path key={n.id} node={n} />)}
      {buildings.map((n) => (
        <Building key={n.id} node={n} selected={n.id === selectedId} onSelect={select} />
      ))}
    </>
  );
}
 