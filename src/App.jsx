import { useState } from 'react';
import Sidebar from './ui/Sidebar.jsx';
import MapPicker from './ui/MapPicker.jsx';
import Viewport from './render/Viewport.jsx';
import { useSceneStore } from './store/scene-store.js';
import { fetchArea } from './osm/overpass.js';
import { parseArea } from './osm/parse-osm.js';

export default function App() {
  const [mapOpen, setMapOpen] = useState(false);

  async function loadArea() {
    const { origin, setNodes, addLog } = useSceneStore.getState();
    addLog('Fetching area…');
    const elements = await fetchArea(origin);
    const parsed = parseArea(elements, origin);
    setNodes(parsed);
    addLog(`Loaded ${parsed.length} nodes`);
  }

  async function handleConfirmLocation(coords) {
    const { setOrigin, setNodes, addLog } = useSceneStore.getState();
    setOrigin(coords);
    setMapOpen(false);
    addLog('Fetching area…');
    const elements = await fetchArea(coords);   // pass coords directly
    const parsed = parseArea(elements, coords);
    setNodes(parsed);
    addLog(`Loaded ${parsed.length} nodes`);
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface text-slate-100 font-sans">
      <Sidebar onOpenMap={() => setMapOpen(true)} onLoadArea={loadArea} />
      <main className="flex-1 h-full relative">
        <Viewport />
      </main>
      <MapPicker open={mapOpen} onClose={() => setMapOpen(false)} onConfirm={handleConfirmLocation}/>
    </div>
  );
}