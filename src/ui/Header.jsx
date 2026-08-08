// @ts-check
import { useState, useRef } from 'react';
import { useSceneStore } from '../store/scene-store.js';

/**
 * HEADER TOOLBAR — Production Grade Top Command Bar.
 * Clean, glassmorphic design inspired by Figma, Vercel & Linear.
 *
 * @param {{ onOpenMap: () => void }} props
 */
export default function Header({ onOpenMap }) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const fileInputRef = useRef(null);

  const nodes = useSceneStore((s) => s.nodes);
  const origin = useSceneStore((s) => s.origin);
  const originName = useSceneStore((s) => s.originName);
  const clear = useSceneStore((s) => s.clear);
  const setNodes = useSceneStore((s) => s.setNodes);
  const setOrigin = useSceneStore((s) => s.setOrigin);
  const addLog = useSceneStore((s) => s.addLog);

  const projectName = useSceneStore((s) => s.projectName);
  const setProjectName = useSceneStore((s) => s.setProjectName);
  const showGrid = useSceneStore((s) => s.showGrid);
  const setShowGrid = useSceneStore((s) => s.setShowGrid);
  const themeMode = useSceneStore((s) => s.themeMode);
  const setThemeMode = useSceneStore((s) => s.setThemeMode);

  const displayLocationLabel = originName || origin.name || `${origin.lat.toFixed(4)}°, ${origin.lng.toFixed(4)}°`;

  // ── EXPORT SCENE JSON ───────────────────────────────────────────────
  function handleExportJSON() {
    const sceneData = {
      version: '1.0',
      projectName: projectName || 'Cartogen Site Plan',
      exportDate: new Date().toISOString(),
      origin,
      nodes,
    };
    const blob = new Blob([JSON.stringify(sceneData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(projectName || 'cartogen-site').toLowerCase().replace(/\s+/g, '-')}.cartogen.json`;
    a.click();
    URL.revokeObjectURL(url);
    addLog(`Exported scene file (${nodes.length} objects)`);
  }

  // ── IMPORT SCENE JSON ───────────────────────────────────────────────
  function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(/** @type {string} */ (event.target?.result));
        if (data.nodes && Array.isArray(data.nodes)) {
          setNodes(data.nodes);
          if (data.origin) setOrigin(data.origin);
          if (data.projectName) setProjectName(data.projectName);
          addLog(`Loaded scene file "${file.name}" (${data.nodes.length} objects)`);
        } else {
          alert('Invalid Cartogen scene file.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <header className="flex h-12 w-full shrink-0 select-none items-center justify-between border-b border-white/[0.08] bg-[#070a12]/90 px-4 backdrop-blur-xl text-slate-200 z-30 shadow-sm">
      {/* 1. Left: Brand & Project Name Input */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-heading text-sm font-bold tracking-tight text-white">Cartogen</span>
          <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-500/20">
            PRO
          </span>
        </div>

        <div className="h-4 w-[1px] bg-white/10" />

        {/* Project Name Input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Untitled Site Plan"
            className="rounded-md bg-transparent px-2 py-1 text-xs font-medium text-slate-200 hover:bg-white/[0.05] focus:bg-white/[0.08] focus:outline-none focus:ring-1 focus:ring-sky-400 transition w-48 truncate placeholder-slate-500"
          />
          <span className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[10px] font-mono text-slate-400 border border-white/[0.06]">
            {nodes.length} objects
          </span>
        </div>
      </div>

      {/* 2. Center: Enterprise Location Selector Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenMap}
          className="group flex items-center gap-2.5 rounded-lg border border-white/10 bg-slate-900/80 px-3 py-1.5 text-xs text-white shadow-sm transition-all hover:border-sky-400/50 hover:bg-slate-800/90 active:scale-[0.98] cursor-pointer"
          title="Click to search and change location"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-sky-500/10 text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition-colors">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 group-hover:text-sky-300">
                Location
              </span>
              <span className="font-semibold text-white max-w-[170px] truncate text-xs">
                {displayLocationLabel}
              </span>
            </div>
          </div>

          <span className="ml-0.5 text-slate-500 group-hover:text-slate-300 transition">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>
      </div>

      {/* 3. Right: Environment, Export, Clear & Help Tools */}
      <div className="flex items-center gap-2">
        {/* Environment Lighting Modes */}
        <div className="flex items-center rounded-lg border border-white/10 bg-slate-900/60 p-0.5">
          <button
            onClick={() => setThemeMode('day')}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition ${themeMode === 'day' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            title="Day Lighting"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </button>
          <button
            onClick={() => setThemeMode('sunset')}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition ${themeMode === 'sunset' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            title="Sunset Lighting"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364l-1.414-1.414M7.05 7.05L5.636 5.636m12.728 0l-1.414 1.414M7.05 16.95l-1.414 1.414M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          </button>
          <button
            onClick={() => setThemeMode('night')}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition ${themeMode === 'night' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            title="Night Lighting"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </button>
        </div>

        {/* 3D Grid Toggle */}
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition ${showGrid ? 'border-sky-500/40 bg-sky-500/10 text-sky-400' : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-slate-200'}`}
          title="Toggle 3D Grid"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16M6 4v16M12 4v16M18 4v16" />
          </svg>
          <span className="text-[11px]">Grid</span>
        </button>

        <div className="h-4 w-[1px] bg-white/10" />

        {/* File Actions: Import & Export */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImportFile}
          accept=".json,.cartogen.json"
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/60 px-2.5 py-1 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:text-white"
          title="Import Scene JSON"
        >
          <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Import
        </button>

        <button
          onClick={handleExportJSON}
          className="flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 px-3 py-1 text-xs font-semibold text-white transition shadow-sm shadow-sky-500/20"
          title="Export Scene JSON"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export
        </button>

        {/* Clear Scene Button */}
        <button
          onClick={() => setShowClearConfirm(true)}
          className="rounded-lg border border-white/10 bg-slate-900/60 p-1.5 text-slate-400 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400 transition"
          title="Clear Scene"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>

        {/* Keyboard Shortcuts Trigger */}
        <button
          onClick={() => setShowHelpModal(true)}
          className="rounded-lg border border-white/10 bg-slate-900/60 p-1.5 text-slate-400 hover:text-white transition"
          title="Shortcuts & Help"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      {/* ── CONFIRM CLEAR MODAL ────────────────────────────────────── */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f172a] p-6 shadow-2xl">
            <h3 className="text-sm font-semibold text-white">Clear Active Scene?</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              This will remove all {nodes.length} objects from your scene. You can undo this action with <kbd className="font-mono text-cyan-300">⌘Z</kbd>.
            </p>
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="rounded-lg border border-white/10 bg-slate-800 px-3.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clear();
                  addLog('Cleared scene');
                  setShowClearConfirm(false);
                }}
                className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 transition shadow-sm shadow-rose-600/30"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── KEYBOARD SHORTCUTS MODAL ───────────────────────────────── */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f172a] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
              <h3 className="text-sm font-semibold text-white">Keyboard Shortcuts & Navigation</h3>
              <button onClick={() => setShowHelpModal(false)} className="text-slate-400 hover:text-white transition">✕</button>
            </div>
            
            <div className="mt-4 space-y-3 text-xs text-slate-300">
              <div className="flex justify-between items-center py-1.5 border-b border-white/[0.06]">
                <span>Undo / Redo</span>
                <span className="font-mono bg-slate-800 border border-white/10 px-2 py-0.5 rounded text-sky-300">⌘Z / ⌘Shift+Z</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-white/[0.06]">
                <span>Transform Gizmos (Move / Rotate / Scale)</span>
                <span className="font-mono bg-slate-800 border border-white/10 px-2 py-0.5 rounded text-slate-200">Select object → Inspector</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-white/[0.06]">
                <span>Rotate 3D View</span>
                <span className="font-mono bg-slate-800 border border-white/10 px-2 py-0.5 rounded text-slate-200">Right Click Drag</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-white/[0.06]">
                <span>Pan 3D View</span>
                <span className="font-mono bg-slate-800 border border-white/10 px-2 py-0.5 rounded text-slate-200">Shift + Left Click Drag</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span>Deselect Object</span>
                <span className="font-mono bg-slate-800 border border-white/10 px-2 py-0.5 rounded text-slate-200">Click empty ground</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="rounded-lg bg-sky-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-400 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
