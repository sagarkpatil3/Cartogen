// @ts-check
import { useSceneStore } from '../../store/scene-store.js';
import Field from './Field.jsx';

const INPUT =
  'w-[150px] rounded-md border border-edge bg-surface-sunk px-2 py-1 text-xs ' +
  'text-white outline-none focus:border-accent';

const GIZMOS = /** @type {const} */ ([
  ['translate', 'Move'],
  ['rotate', 'Rotate'],
  ['scale', 'Scale'],
]);

const SURFACE_MATERIALS = ['grass', 'parking', 'water', 'sand', 'plaza', 'pitch', 'forest'];

/**
 * INSPECTOR — edits the selected node.
 *
 * Renders different controls per node type. Every change writes through
 * `updateNode(id, patch)`, which is the single mutation path for the whole app.
 */
export default function Inspector() {
  const nodes = useSceneStore((s) => s.nodes);
  const selectedId = useSceneStore((s) => s.selectedId);
  const gizmoMode = useSceneStore((s) => s.gizmoMode);
  const setGizmoMode = useSceneStore((s) => s.setGizmoMode);
  const updateNode = useSceneStore((s) => s.updateNode);
  const deleteNode = useSceneStore((s) => s.deleteNode);
  const addLog = useSceneStore((s) => s.addLog);

  const node = nodes.find((n) => n.id === selectedId);

  if (!node) {
    return (
      <div className="rounded-lg border border-dashed border-edge py-6 text-center text-xs text-slate-500">
        Nothing selected.
        <br />
        Click an object in the scene.
      </div>
    );
  }

  const patch = (fields) => updateNode(node.id, fields);

  return (
    <div className="flex flex-col gap-3">
      {/* identity */}
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[13px] font-semibold text-white">
          {node.name || node.id}
        </span>
        <span className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
          {node.type}
        </span>
      </div>

      {/* transform tool */}
      <div className="flex gap-1 rounded-lg bg-surface-sunk p-1">
        {GIZMOS.map(([mode, label]) => (
          <button
            key={mode}
            onClick={() => setGizmoMode(mode)}
            className={`flex-1 rounded-md py-1 text-[11px] font-medium transition ${
              gizmoMode === mode
                ? 'bg-accent text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* every node can be renamed */}
      <Field label="Name">
        <input
          className={INPUT}
          value={node.name || ''}
          placeholder="Untitled"
          onChange={(e) => patch({ name: e.target.value })}
        />
      </Field>

      {node.type === 'building' && (
        <Field label="Height (m)">
          <input
            type="number"
            min="1"
            className={INPUT}
            value={node.height ?? 10}
            onChange={(e) => patch({ height: Math.max(1, Number(e.target.value) || 1) })}
          />
        </Field>
      )}

      {node.type === 'tree' && (
        <Field label={`Scale ${(node.scale ?? 1).toFixed(1)}×`}>
          <input
            type="range"
            min="0.4"
            max="4"
            step="0.1"
            className="w-[150px] accent-accent"
            value={node.scale ?? 1}
            onChange={(e) => patch({ scale: Number(e.target.value) })}
          />
        </Field>
      )}

      {node.type === 'path' && (
        <Field label="Class">
          <select
            className={INPUT}
            value={node.pathClass || 'walkway'}
            onChange={(e) => patch({ pathClass: e.target.value })}
          >
            <option value="major">Major road</option>
            <option value="street">Street</option>
            <option value="walkway">Walkway</option>
          </select>
        </Field>
      )}

      {node.type === 'surface' && (
        <Field label="Material">
          <select
            className={INPUT}
            value={node.material || 'grass'}
            onChange={(e) => patch({ material: e.target.value })}
          >
            {SURFACE_MATERIALS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>
      )}

      <button
        onClick={() => {
          addLog(`Deleted ${node.name || node.type}`);
          deleteNode(node.id);
        }}
        className="mt-1 rounded-lg border border-red-900 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-950/40"
      >
        Delete
      </button>
    </div>
  );
}