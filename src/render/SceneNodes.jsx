import { useSceneStore } from '../store/scene-store.js';
import Building from './Building.jsx';

export default function SceneNodes() {
    const nodes = useSceneStore((s) => s.nodes);

    return nodes.map((node) =>{
        if (node.type === 'building') return <Building key={node.id} node={node} />;
        return null;
    })
}