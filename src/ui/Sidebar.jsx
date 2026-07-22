// @ts-check
import { useSceneStore } from '../store/scene-store.js';
import { scatterTrees } from '../ops/scatter-trees.js';
import { centroid } from '../lib/geometry.js';
import SectionLabel from './sidebar/SectionLabel.jsx';
import Inspector from './sidebar/Inspector.jsx';
import PromptBar from './sidebar/PromptBar.jsx';
import OperationsLog from './sidebar/OperationsLog.jsx';

/**
 * SIDEBAR — the control panel shell.
 *
 * This file only composes sections and owns the scene-level actions. Each section
 * (inspector, prompt, log) is its own component with its own state and store reads.
 *
 * @param {{ onOpenMap: () => void, onLoadArea: () => void }} props
 */
export default function Sidebar({ onOpenMap, onLoadArea }) {
  const nodes = useSceneStore((s) => s.nodes);
  const selectedId = useSceneStore((s) => s.selectedId);
  const addNodes = useSceneStore((s) => s.addNodes);
  const addLog = useSceneStore((s) => s.addLog);

  const counts = nodes.reduce((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1;
    return acc;
  }, /** @type {Record<string, number>} */ ({}));

  function handleScatter() {
    const sel = nodes.find((n) => n.id === selectedId);
    const center = sel?.footprint
      ? centroid(sel.footprint)
      : sel?.polygon
        ? centroid(sel.polygon)
        : sel?.position || [0, 0];

    const trees = scatterTrees({ count: 30, center, radius: 80, nodes });
    addNodes(trees);
    addLog(`Placed ${trees.length} trees`);
  }

  return (
    <aside className="flex h-full w-80 shrink-0 select-none flex-col border-r border-edge bg-surface text-slate-200">
      {/* header */}
      <header className="flex items-center justify-between border-b border-edge p-4">
        <div>
          <h1 className="text-base font-semibold tracking-tight text-white">Cartogen</h1>
          <p className="text-[11px] text-slate-500">3D map builder</p>
        </div>
        <button
          onClick={onOpenMap}
          className="rounded-lg border border-edge bg-surface-raised px-2.5 py-1.5 text-[11px] text-slate-300 transition hover:border-slate-600 hover:text-white"
        >
          Location
        </button>
      </header>

      {/* scene summary + actions */}
      <section className="flex flex-col gap-2.5 border-b border-edge p-3.5">
        <SectionLabel>Scene</SectionLabel>
        <p className="font-mono text-[11px] text-slate-400">
          {counts.building || 0} buildings · {counts.path || 0} paths · {counts.surface || 0} surfaces · {counts.tree || 0} trees
        </p>
        <div className="flex gap-2">
          <button
            onClick={onLoadArea}
            className="flex-1 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white transition hover:bg-accent-hover"
          >
            Load area
          </button>
          <button
            onClick={handleScatter}
            className="flex-1 rounded-lg border border-edge bg-surface-raised px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-slate-600"
          >
            Add trees
          </button>
        </div>
      </section>

      <PromptBar />

      {/* inspector fills the remaining space */}
      <section className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-3.5">
        <SectionLabel>Inspector</SectionLabel>
        <Inspector />
      </section>

      <OperationsLog />
    </aside>
  );
}