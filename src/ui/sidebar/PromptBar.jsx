// @ts-check
import { useState } from 'react';
import { useSceneStore } from '../../store/scene-store.js';
import { scatterTrees } from '../../ops/scatter-trees.js';
import { centroid } from '../../lib/geometry.js';
import SectionLabel from './SectionLabel.jsx';

/**
 * PROMPT BAR — turns a typed request into a scene operation.
 *
 * The matching here is deliberately simple; it exists to prove the pipeline
 * (text -> operation -> nodes -> render -> log) end to end. A validated schema and
 * a language model replace `interpret()` later without touching anything else.
 */
export default function PromptBar() {
  const [text, setText] = useState('');
  const nodes = useSceneStore((s) => s.nodes);
  const selectedId = useSceneStore((s) => s.selectedId);
  const addNodes = useSceneStore((s) => s.addNodes);
  const addLog = useSceneStore((s) => s.addLog);

  /** Place new content near the selection, falling back to the scene origin. */
  function targetCenter() {
    const sel = nodes.find((n) => n.id === selectedId);
    if (sel?.footprint) return centroid(sel.footprint);
    if (sel?.polygon) return centroid(sel.polygon);
    if (sel?.position) return sel.position;
    return [0, 0];
  }

  function interpret(input) {
    if (!/tree/i.test(input)) return null;
    return scatterTrees({
      count: Number(input.match(/\d+/)?.[0] ?? 30),
      center: targetCenter(),
      radius: 80,
      nodes,
      onlyOnGrass: /grass|lawn/i.test(input),
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const input = text.trim();
    if (!input) return;
    setText('');

    const created = interpret(input);
    if (!created) return addLog(`Not understood: "${input}"`);

    addNodes(created);
    addLog(`Placed ${created.length} trees`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-b border-edge p-3.5">
      <SectionLabel>Describe a change</SectionLabel>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="add 40 trees on the grass"
        className="w-full rounded-lg border border-edge bg-surface-sunk px-3 py-2 text-xs
                   text-white placeholder:text-slate-600 outline-none focus:border-accent"
      />
    </form>
  );
}