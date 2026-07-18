import Viewport from './render/Viewport.jsx';
import MapPicker from './ui/MapPicker.jsx';
import { useSceneStore } from './store/scene-store.js';
console.log('store import:', useSceneStore);
import { fetchBuildings } from './osm/overpass.js';
import { parseBuildings } from './osm/parse-osm.js';

export default function App() {
  const origin = useSceneStore((s) => s.origin);   // read from the store

  return (
    <div style={{ height: '100%', display: 'flex', background: '#0f172a', color: 'white' }}>
      <aside style={{ width: 320, padding: 16, borderRight: '1px solid #1e293b' }}>
        <h1 style={{ fontSize: 18, margin: 0 }}>Cartogen</h1>
        <p style={{ fontSize: 12, opacity: 0.6 }}>Map builder</p>

        <MapPicker />
        <button onClick={async () => {
          const origin = useSceneStore.getState().origin;
          const elements = await fetchBuildings(origin);
          const nodes = parseBuildings(elements, origin);
          useSceneStore.getState().setNodes(nodes);
          console.log(`loaded ${nodes.length} buildings`);
        }}>Load buildings</button>

        <p style={{ fontSize: 12, fontFamily: 'monospace', opacity: 0.7 }}>
          origin: {origin.lat.toFixed(4)}, {origin.lng.toFixed(4)}
        </p>
      </aside>

      <main style={{ flex: 1 }}>
        <Viewport />
      </main>
    </div>
  );
}