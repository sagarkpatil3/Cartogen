import Viewport from './render/Viewport.jsx';
import MapPicker from './ui/MapPicker.jsx';
import { useSceneStore } from './store/scene-store.js';
console.log('store import:', useSceneStore);
import { fetchArea } from './osm/overpass.js';
import { parseArea } from './osm/parse-osm.js';
import { scatterTrees } from './ops/scatter-trees.js';
import { centroid } from './lib/geometry.js';
import Sidebar from './ui/Sidebar.jsx';

export default function App() {
  const origin = useSceneStore((s) => s.origin);   // read from the store
  

  return (
      <div className="flex h-full">
        <Sidebar
          onOpenMap={() => setMapOpen(true)}
          onLoadArea={async () => {
            const origin = useSceneStore.getState().origin;
            const elements = await fetchArea(origin);
            const parsed = parseArea(elements, origin);
            useSceneStore.getState().setNodes(parsed);
            useSceneStore.getState().addLog(`Loaded ${parsed.length} nodes`);
          }}
        />
        <main className="flex-1"><Viewport /></main>
      </div>
  );
}