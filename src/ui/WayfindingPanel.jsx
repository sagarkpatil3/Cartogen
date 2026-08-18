// @ts-check
import { useState, useEffect } from 'react';
import { useSceneStore } from '../store/scene-store.js';
import { findWayfindingRoute } from '../lib/wayfinding.js';

/**
 * WAYFINDING STUDIO PANEL
 * Campus Wayfinding & ADA Navigation Tool Suite.
 * Allows campus facilities managers and users to simulate ADA routes, author staircases & ramps,
 * and inspect path accessibility properties.
 */
export default function WayfindingPanel() {
  const nodes = useSceneStore((s) => s.nodes);
  const addNode = useSceneStore((s) => s.addNode);
  const selectedId = useSceneStore((s) => s.selectedId);
  const getSelected = useSceneStore((s) => s.getSelected);
  const updateNode = useSceneStore((s) => s.updateNode);
  const addLog = useSceneStore((s) => s.addLog);

  const wayfindingActive = useSceneStore((s) => s.wayfindingActive);
  const setWayfindingActive = useSceneStore((s) => s.setWayfindingActive);
  const wayfindingProfile = useSceneStore((s) => s.wayfindingProfile);
  const setWayfindingProfile = useSceneStore((s) => s.setWayfindingProfile);
  const wayfindingStartId = useSceneStore((s) => s.wayfindingStartId);
  const setWayfindingStartId = useSceneStore((s) => s.setWayfindingStartId);
  const wayfindingEndId = useSceneStore((s) => s.wayfindingEndId);
  const setWayfindingEndId = useSceneStore((s) => s.setWayfindingEndId);
  const wayfindingRoute = useSceneStore((s) => s.wayfindingRoute);
  const setWayfindingRoute = useSceneStore((s) => s.setWayfindingRoute);
  const clearWayfinding = useSceneStore((s) => s.clearWayfinding);

  const [activeTab, setActiveTab] = useState('navigate'); // 'navigate' | 'author'

  const selectedNode = getSelected();
  const selectableNodes = nodes.filter((n) => n.type === 'building' || n.type === 'path' || n.type === 'composed');

  // Trigger route calculation whenever start, end, or profile changes
  useEffect(() => {
    if (!wayfindingStartId || !wayfindingEndId) {
      setWayfindingRoute(null);
      return;
    }

    const route = findWayfindingRoute(nodes, wayfindingStartId, wayfindingEndId, {
      profile: wayfindingProfile,
    });

    setWayfindingRoute(route);

    if (route.success) {
      addLog(`Wayfinding Route: ${route.totalDistanceMeters}m (${route.estimatedMinutes} min, ${route.profile.toUpperCase()})`);
    }
  }, [wayfindingStartId, wayfindingEndId, wayfindingProfile, nodes]);

  if (!wayfindingActive) return null;

  function handleAddStairs() {
    const id = `stairs-${Date.now()}`;
    addNode({
      id,
      type: 'path',
      name: 'Campus Staircase',
      pathClass: 'walkway',
      pathType: 'stairs',
      isAccessible: false,
      stepCount: 8,
      handrail: true,
      incline: 'steep',
      polyline: [[-20, -20], [20, 20]],
    });
    addLog('Added 3D Staircase node');
  }

  function handleAddRamp() {
    const id = `ramp-${Date.now()}`;
    addNode({
      id,
      type: 'path',
      name: 'ADA Accessible Ramp',
      pathClass: 'walkway',
      pathType: 'accessible_ramp',
      isAccessible: true,
      stepCount: 0,
      handrail: true,
      incline: 'gentle',
      polyline: [[-25, 0], [25, 0]],
    });
    addLog('Added ADA Accessible Ramp node');
  }

  return (
    <div className="absolute top-16 right-4 z-40 w-96 rounded-xl border border-white/10 bg-slate-900/90 p-4 shadow-2xl backdrop-blur-xl text-slate-100 font-sans transition-all">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Campus Wayfinding Studio</h3>
            <p className="text-[11px] text-slate-400">ADA Accessible Navigation & Authoring</p>
          </div>
        </div>
        <button
          onClick={() => setWayfindingActive(false)}
          className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Mode Switch Tabs */}
      <div className="mt-3 flex rounded-lg bg-slate-950/60 p-1 border border-white/5">
        <button
          onClick={() => setActiveTab('navigate')}
          className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${activeTab === 'navigate' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
        >
          🧭 Route Simulator
        </button>
        <button
          onClick={() => setActiveTab('author')}
          className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${activeTab === 'author' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
        >
          🛠️ Author Tools
        </button>
      </div>

      {/* TAB 1: ROUTE SIMULATOR */}
      {activeTab === 'navigate' && (
        <div className="mt-3 space-y-3">
          {/* Profile Switcher */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Routing Profile
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setWayfindingProfile('accessible')}
                className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition ${wayfindingProfile === 'accessible' ? 'border-sky-500 bg-sky-500/20 text-sky-300 shadow-sm' : 'border-white/10 bg-slate-800/40 text-slate-400 hover:border-white/20 hover:text-white'}`}
              >
                <span>♿</span> ADA Accessible
              </button>
              <button
                onClick={() => setWayfindingProfile('standard')}
                className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition ${wayfindingProfile === 'standard' ? 'border-sky-500 bg-sky-500/20 text-sky-300 shadow-sm' : 'border-white/10 bg-slate-800/40 text-slate-400 hover:border-white/20 hover:text-white'}`}
              >
                <span>🚶</span> Standard Walk
              </button>
            </div>
          </div>

          {/* Start Location Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Start Location
            </label>
            <select
              value={wayfindingStartId || ''}
              onChange={(e) => setWayfindingStartId(e.target.value || null)}
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
            >
              <option value="">-- Select Start Node --</option>
              {selectableNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name || n.id} ({n.type})
                </option>
              ))}
            </select>
          </div>

          {/* Destination Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Destination Location
            </label>
            <select
              value={wayfindingEndId || ''}
              onChange={(e) => setWayfindingEndId(e.target.value || null)}
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
            >
              <option value="">-- Select Destination --</option>
              {selectableNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name || n.id} ({n.type})
                </option>
              ))}
            </select>
          </div>

          {/* Route Calculation Result Box */}
          {wayfindingRoute && (
            <div className="mt-3 rounded-lg border border-white/10 bg-slate-950/80 p-3 text-xs">
              {wayfindingRoute.success ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between font-semibold text-sky-400">
                    <span>Route Calculated</span>
                    <span className="rounded bg-sky-500/20 px-2 py-0.5 text-[10px] text-sky-300">
                      {wayfindingRoute.profile === 'accessible' ? '♿ ADA Wheelchair Compliant' : '🚶 Standard Walk'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-300 text-[11px] pt-1 border-t border-white/5">
                    <div>📏 Distance: <strong className="text-white">{wayfindingRoute.totalDistanceMeters}m</strong> ({wayfindingRoute.totalDistanceFeet}ft)</div>
                    <div>⏱️ Time: <strong className="text-white">{wayfindingRoute.estimatedMinutes} min</strong></div>
                  </div>
                  {wayfindingRoute.stepCount > 0 ? (
                    <div className="text-[11px] text-amber-400 bg-amber-500/10 p-1.5 rounded border border-amber-500/20">
                      ⚠️ Route contains {wayfindingRoute.stepCount} steps.
                    </div>
                  ) : (
                    <div className="text-[11px] text-emerald-400 bg-emerald-500/10 p-1.5 rounded border border-emerald-500/20">
                      ✅ 100% Step-Free Accessible Route.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-rose-400 text-[11px]">
                  ⚠️ {wayfindingRoute.reason || 'No valid route found.'}
                </div>
              )}
            </div>
          )}

          {wayfindingRoute && (
            <button
              onClick={clearWayfinding}
              className="w-full rounded-lg border border-white/10 bg-slate-800/60 py-1.5 text-xs text-slate-400 hover:text-white transition"
            >
              Clear Active Route
            </button>
          )}
        </div>
      )}

      {/* TAB 2: AUTHORING TOOLS */}
      {activeTab === 'author' && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleAddStairs}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-white/10 bg-slate-800/40 p-3 text-xs font-semibold text-slate-200 hover:border-sky-500/50 hover:bg-sky-500/10 transition"
            >
              <span className="text-lg">🪜</span>
              <span>Add 3D Stairs</span>
            </button>
            <button
              onClick={handleAddRamp}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-white/10 bg-slate-800/40 p-3 text-xs font-semibold text-slate-200 hover:border-sky-500/50 hover:bg-sky-500/10 transition"
            >
              <span className="text-lg">♿</span>
              <span>Add ADA Ramp</span>
            </button>
          </div>

          {/* Selected Path Accessibility Property Inspector */}
          {selectedNode && selectedNode.type === 'path' && (
            <div className="mt-3 rounded-lg border border-white/10 bg-slate-950/80 p-3 space-y-2 text-xs">
              <div className="font-semibold text-sky-400 border-b border-white/10 pb-1">
                Path Accessibility Inspector ({selectedNode.name || selectedNode.id})
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Path Type</label>
                <select
                  value={selectedNode.pathType || 'standard'}
                  onChange={(e) => updateNode(selectedNode.id, { pathType: e.target.value })}
                  className="w-full rounded bg-slate-900 border border-white/10 px-2 py-1 text-white"
                >
                  <option value="standard">Standard Walkway</option>
                  <option value="stairs">Staircase / Steps</option>
                  <option value="accessible_ramp">ADA Accessible Ramp</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-300">ADA Wheelchair Accessible</span>
                <input
                  type="checkbox"
                  checked={selectedNode.isAccessible !== false}
                  onChange={(e) => updateNode(selectedNode.id, { isAccessible: e.target.checked })}
                  className="rounded border-white/20 bg-slate-900 text-sky-500"
                />
              </div>

              {selectedNode.pathType === 'stairs' && (
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Step Count</label>
                  <input
                    type="number"
                    value={selectedNode.stepCount || 6}
                    onChange={(e) => updateNode(selectedNode.id, { stepCount: parseInt(e.target.value, 10) || 1 })}
                    className="w-full rounded bg-slate-900 border border-white/10 px-2 py-1 text-white"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-300">Metallic Safety Handrails</span>
                <input
                  type="checkbox"
                  checked={selectedNode.handrail !== false}
                  onChange={(e) => updateNode(selectedNode.id, { handrail: e.target.checked })}
                  className="rounded border-white/20 bg-slate-900 text-sky-500"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
