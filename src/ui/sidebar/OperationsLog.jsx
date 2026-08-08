// @ts-check
import { useEffect, useRef } from 'react';
import { useSceneStore } from '../../store/scene-store.js';
import SectionLabel from './SectionLabel.jsx';

/**
 * OPERATIONS LOG — Running terminal record of scene edits.
 */
export default function OperationsLog() {
  const entries = useSceneStore((s) => s.operationsLog);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  return (
    <div className="flex h-32 flex-col gap-1.5 border-t border-white/[0.08] bg-slate-950 p-3">
      <div className="flex items-center gap-1.5">
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <SectionLabel>Activity Stream</SectionLabel>
      </div>
      <div className="flex-1 overflow-y-auto font-mono text-[10px] leading-relaxed space-y-1 pr-1">
        {entries.length === 0 && (
          <div className="text-slate-600 italic">No system activity recorded yet.</div>
        )}
        {entries.map((entry, i) => (
          <div key={i} className="text-slate-300 flex items-start gap-1.5">
            <span className="text-slate-500 shrink-0 font-mono text-[9px]">{entry.time}</span>
            <span className="break-words">{entry.message}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}