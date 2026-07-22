// @ts-check
import { useEffect, useRef } from 'react';
import { useSceneStore } from '../../store/scene-store.js';
import SectionLabel from './SectionLabel.jsx';

/**
 * OPERATIONS LOG — a running record of what happened, newest last.
 * Matters more than it looks: when the prompt layer performs an action, this is
 * how the user sees what it actually did.
 */
export default function OperationsLog() {
  const entries = useSceneStore((s) => s.operationsLog);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  return (
    <div className="flex h-32 flex-col gap-1.5 border-t border-edge bg-surface-sunk p-3">
      <SectionLabel>Log</SectionLabel>
      <div className="flex-1 overflow-y-auto font-mono text-[10px] leading-relaxed">
        {entries.length === 0 && (
          <div className="text-[11px] text-slate-600">No operations yet.</div>
        )}
        {entries.map((entry, i) => (
          <div key={i} className="text-slate-300">
            <span className="mr-1.5 text-slate-600">{entry.time}</span>
            {entry.message}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}