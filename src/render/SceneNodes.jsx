import { useSceneStore } from '../store/scene-store.js';
import Building from './Building.jsx';
import Path from './Path.jsx';
import Surface from './Surface.jsx';

export default function SceneNodes({ preset }) {
  const nodes = useSceneStore((s) => s.nodes);
  const selectedId = useSceneStore((s) => s.selectedId);   // ← was missing
  const select = useSceneStore((s) => s.select);           // ← was missing

  return nodes.map((node) => {
    if (node.type === 'building')
      return <Building key={node.id} node={node} preset={preset} selected={node.id === selectedId} onSelect={select} />;
    if (node.type === 'path')
      return <Path key={node.id} node={node} preset={preset} />;
    if (node.type === 'surface')
      return <Surface key={node.id} node={node} preset={preset} />;
    return null;
  });
}