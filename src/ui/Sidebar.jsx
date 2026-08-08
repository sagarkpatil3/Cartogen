// @ts-check
import { useSceneStore } from '../store/scene-store.js';
import SectionLabel from './sidebar/SectionLabel.jsx';
import Inspector from './sidebar/Inspector.jsx';
import PromptBar from './sidebar/PromptBar.jsx';
import OperationsLog from './sidebar/OperationsLog.jsx';

/**
 * SIDEBAR — the control panel shell.
 *
 * @param {{ onOpenMap: () => void }} props
 */
export default function Sidebar({ onOpenMap }) {
  const nodes = useSceneStore((s) => s.nodes);
  const counts = nodes.reduce((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1;
    return acc;
  }, /** @type {Record<string, number>} */({}));

  return (
    <aside className="flex h-full w-80 shrink-0 select-none flex-col border-r border-edge bg-surface text-slate-200">

      {/* scene summary */}
      <section className="flex flex-col gap-2.5 border-b border-edge p-3.5">
        <SectionLabel>Scene</SectionLabel>
        <p className="font-mono text-[11px] text-slate-400">
          {counts.building || 0} buildings · {counts.composed || 0} composed · {counts.path || 0} paths · {counts.surface || 0} surfaces · {counts.tree || 0} trees
        </p>
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