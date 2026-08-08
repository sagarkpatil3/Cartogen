import { useState, useEffect } from 'react';
import Header from './ui/Header.jsx';
import Sidebar from './ui/Sidebar.jsx';
import MapPicker from './ui/MapPicker.jsx';
import Viewport from './render/Viewport.jsx';
import { useSceneStore } from './store/scene-store.js';
import { fetchArea } from './osm/overpass.js';
import { parseArea } from './osm/parse-osm.js';

export default function App() {
  const [mapOpen, setMapOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input/textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;
      
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      
      if (cmdOrCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          useSceneStore.getState().redo();
        } else {
          useSceneStore.getState().undo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-surface text-slate-100 font-sans">
      <Header onOpenMap={() => setMapOpen(true)} />
      <div className="flex flex-1 min-h-0 relative">
        <Sidebar onOpenMap={() => setMapOpen(true)} />
        <main className="flex-1 h-full relative">
          <Viewport />
        </main>
      </div>
      <MapPicker open={mapOpen} onClose={() => setMapOpen(false)} onConfirm={handleConfirmLocation}/>
    </div>
  );
}