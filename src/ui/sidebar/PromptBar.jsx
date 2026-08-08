// @ts-check
import { useState } from 'react';
import { useSceneStore } from '../../store/scene-store.js';
import { interpretPrompt } from '../../lib/ai-interpreter.js';
import { centroid } from '../../lib/geometry.js';
import SectionLabel from './SectionLabel.jsx';

/**
 * PROMPT BAR — Enterprise AI Command Layer.
 * Turns natural language requests into 3D scene geometry.
 */
export default function PromptBar() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const nodes = useSceneStore((s) => s.nodes);
  const selectedId = useSceneStore((s) => s.selectedId);
  const addNodes = useSceneStore((s) => s.addNodes);
  const addLog = useSceneStore((s) => s.addLog);

  /** Target center point near selection, falling back to scene origin. */
  function targetCenter() {
    const sel = nodes.find((n) => n.id === selectedId);
    if (sel?.footprint) return centroid(sel.footprint);
    if (sel?.polygon) return centroid(sel.polygon);
    if (sel?.position) return sel.position;
    return [0, 0];
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const input = text.trim();
    if (!input || loading) return;

    setLoading(true);
    try {
      const result = await interpretPrompt(input, nodes, targetCenter());
      if (result && result.created?.length > 0) {
        addNodes(result.created);
        addLog(`AI: ${result.message}`);
        setText('');
      } else {
        addLog(`AI Query: Not understood "${input}"`);
      }
    } catch (err) {
      addLog(`AI Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  const SUGGESTIONS = [
    '5-storey glass office building',
    'scatter 40 trees on grass',
    '30m civic library',
  ];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 border-b border-white/[0.08] p-3.5 bg-slate-950/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <SectionLabel>AI Command Assistant</SectionLabel>
        </div>
        {loading && (
          <span className="animate-pulse text-[10px] font-mono font-medium text-sky-400">
            Generating 3D model...
          </span>
        )}
      </div>

      <div className="relative flex items-center">
        <input
          value={text}
          disabled={loading}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe a 3D building, plaza, or site edit..."
          className="w-full rounded-xl border border-white/10 bg-slate-900/90 pl-3 pr-24 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/40 disabled:opacity-50 transition shadow-inner"
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="absolute right-1.5 top-1.5 bottom-1.5 flex items-center justify-center rounded-lg bg-sky-500 px-3 text-[11px] font-semibold text-white transition hover:bg-sky-400 disabled:opacity-30 shadow-sm shadow-sky-500/30"
        >
          Generate
        </button>
      </div>

      {/* Clickable prompt suggestions */}
      <div className="flex flex-wrap gap-1 mt-0.5">
        {SUGGESTIONS.map((sug, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setText(sug)}
            className="rounded-md border border-white/[0.06] bg-slate-900/60 px-2 py-0.5 text-[10px] font-medium text-slate-400 hover:border-sky-500/40 hover:bg-slate-800 hover:text-sky-300 transition"
          >
            + {sug}
          </button>
        ))}
      </div>
    </form>
  );
}
