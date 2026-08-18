// @ts-check
import { useSceneStore } from '../../store/scene-store.js';
import Field from './Field.jsx';

const INPUT =
  'w-[150px] rounded-md border border-edge bg-surface-sunk px-2 py-1 text-xs ' +
  'text-white outline-none focus:border-accent';

const GIZMOS = /** @type {const} */ ([
  ['none', 'Select'],
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
  const select = useSceneStore((s) => s.select);

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
            onClick={() => {
              if (gizmoMode === mode) {
                select(null);
              } else {
                setGizmoMode(mode);
              }
            }}
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
        <>
          <Field label="Kind">
            <select
              className={INPUT}
              value={node.kind || 'default'}
              onChange={(e) => patch({ kind: e.target.value })}
            >
              <option value="default">Default</option>
              <option value="civic">Civic / Institutional</option>
              <option value="commercial">Commercial / Office</option>
              <option value="residential">Residential</option>
              <option value="landmark">Landmark</option>
            </select>
          </Field>

          <Field label="Height (m)">
            <input
              type="number"
              min="1"
              max="300"
              className={INPUT}
              value={node.height ?? 10}
              onChange={(e) => {
                const newHeight = Math.max(1, Number(e.target.value) || 1);
                patch({ height: newHeight });
              }}
            />
          </Field>

          <Field label={`Floors (${node.floors ?? 1})`}>
            <input
              type="range"
              min="1"
              max="50"
              step="1"
              className="w-[150px] accent-accent"
              value={node.floors ?? 1}
              onChange={(e) => {
                const newFloors = Math.max(1, Number(e.target.value) || 1);
                patch({ floors: newFloors });
              }}
            />
          </Field>


          <Field label="Window Style">
            <select
              className={INPUT}
              value={node.windowStyle ?? (['commercial', 'civic', 'landmark'].includes(node.kind) ? 'vertical' : 'none')}
              onChange={(e) => patch({ windowStyle: e.target.value })}
            >
              <option value="parametric">Parametric Splitter (CGA Grammar)</option>
              <option value="vertical">Vertical Columns (Concept3D)</option>
              <option value="grid">Rectangular Window Grid</option>
              <option value="curtain">Full Glass Curtain Wall</option>
              <option value="none">None (Solid Facade)</option>
            </select>
          </Field>

          {(node.windowStyle === 'parametric' || node.glazingRatio !== undefined || node.bayWidth !== undefined) && (
            <>
              <Field label={`Glazing Ratio (${Math.round((node.glazingRatio ?? 0.65) * 100)}%)`}>
                <input
                  type="range"
                  min="0.1"
                  max="0.95"
                  step="0.05"
                  className="w-[150px] accent-accent"
                  value={node.glazingRatio ?? 0.65}
                  onChange={(e) => patch({ glazingRatio: Number(e.target.value) })}
                />
              </Field>

              <Field label="Target Bay Width (m)">
                <input
                  type="number"
                  min="1.5"
                  max="12"
                  step="0.5"
                  className={INPUT}
                  value={node.bayWidth ?? 4}
                  onChange={(e) => patch({ bayWidth: Math.max(1, Number(e.target.value) || 4) })}
                />
              </Field>
            </>
          )}

          {/* Architectural Toggles */}
          <div className="flex flex-col gap-2 rounded-lg bg-surface-sunk p-2.5 mt-1 border border-edge">
            <span className="text-[11px] font-semibold text-slate-300">Architecture & Features</span>

            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span>Floor Band Ledges</span>
              <input
                type="checkbox"
                className="accent-accent h-3.5 w-3.5 rounded"
                checked={node.showLedges ?? ((node.floors || Math.round((node.height || 10) / 3.2)) > 1)}
                onChange={(e) => patch({ showLedges: e.target.checked })}
              />
            </label>

            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span>Main Entrance Canopy</span>
              <input
                type="checkbox"
                className="accent-accent h-3.5 w-3.5 rounded"
                checked={!!node.hasEntrance}
                onChange={(e) => patch({ hasEntrance: e.target.checked })}
              />
            </label>

            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span>Roof Parapet Border</span>
              <input
                type="checkbox"
                className="accent-accent h-3.5 w-3.5 rounded"
                checked={node.hasParapet ?? true}
                onChange={(e) => patch({ hasParapet: e.target.checked })}
              />
            </label>

            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span>Rooftop Penthouse / HVAC</span>
              <input
                type="checkbox"
                className="accent-accent h-3.5 w-3.5 rounded"
                checked={node.hasRoofPenthouse ?? (['commercial', 'civic'].includes(node.kind) && (node.height || 10) > 12)}
                onChange={(e) => patch({ hasRoofPenthouse: e.target.checked })}
              />
            </label>

            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span>Show 3D Text Label</span>
              <input
                type="checkbox"
                className="accent-accent h-3.5 w-3.5 rounded"
                checked={!!node.showLabel}
                onChange={(e) => patch({ showLabel: e.target.checked })}
              />
            </label>

            <div className="flex items-center justify-between text-xs text-slate-300 mt-1 pt-1 border-t border-edge/50">
              <span>Wall Color</span>
              <input
                type="color"
                className="h-6 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
                value={node.wallColor || '#d9d6cf'}
                onChange={(e) => patch({ wallColor: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Roof Color</span>
              <input
                type="color"
                className="h-6 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
                value={node.roofColor || '#c2beb4'}
                onChange={(e) => patch({ roofColor: e.target.value })}
              />
            </div>
          </div>

          {/* Footprint Corners Management */}
          <div className="flex flex-col gap-2 rounded-lg bg-surface-sunk p-2.5 mt-1 border border-edge">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
              <span>Footprint Corners ({node.footprint?.slice(0, -1).length || 0})</span>
              <button
                title="Add corner at wall midpoint"
                onClick={() => {
                  if (!node.footprint || node.footprint.length < 3) return;
                  const midIdx = Math.floor((node.footprint.length - 2) / 2);
                  const [ax, az] = node.footprint[midIdx];
                  const [bx, bz] = node.footprint[midIdx + 1];
                  const newPt = [(ax + bx) / 2, (az + bz) / 2];
                  const updated = [...node.footprint];
                  updated.splice(midIdx + 1, 0, newPt);
                  patch({ footprint: updated });
                }}
                className="rounded bg-surface-raised px-2 py-0.5 text-[10px] text-accent hover:bg-accent hover:text-white"
              >
                + Add Corner
              </button>
            </div>

            <div className="flex max-h-36 flex-col gap-1 overflow-y-auto pr-1">
              {node.footprint?.slice(0, -1).map(([x, z], idx) => (
                <div key={idx} className="flex items-center justify-between gap-1 text-[11px]">
                  <span className="font-mono text-slate-500 w-4">#{idx + 1}</span>
                  <input
                    type="number"
                    step="0.5"
                    className="w-16 rounded border border-edge bg-surface px-1 py-0.5 font-mono text-[10px] text-slate-200"
                    value={Math.round(x * 10) / 10}
                    onChange={(e) => {
                      const newX = Number(e.target.value) || 0;
                      const updated = node.footprint.map((pt, i) => (i === idx ? [newX, pt[1]] : pt));
                      if (idx === 0) updated[updated.length - 1] = [newX, updated[updated.length - 1][1]];
                      patch({ footprint: updated });
                    }}
                  />
                  <span className="text-slate-600">,</span>
                  <input
                    type="number"
                    step="0.5"
                    className="w-16 rounded border border-edge bg-surface px-1 py-0.5 font-mono text-[10px] text-slate-200"
                    value={Math.round(z * 10) / 10}
                    onChange={(e) => {
                      const newZ = Number(e.target.value) || 0;
                      const updated = node.footprint.map((pt, i) => (i === idx ? [pt[0], newZ] : pt));
                      if (idx === 0) updated[updated.length - 1] = [updated[updated.length - 1][0], newZ];
                      patch({ footprint: updated });
                    }}
                  />
                  {node.footprint.length > 4 && (
                    <button
                      onClick={() => {
                        const updated = node.footprint.filter((_, i) => i !== idx);
                        if (idx === 0) updated[updated.length - 1] = updated[0];
                        patch({ footprint: updated });
                      }}
                      className="text-red-400 hover:text-red-300 text-[11px] px-1"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
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
        <>
          <Field label="Path Type">
            <select
              className={INPUT}
              value={node.pathType || 'standard'}
              onChange={(e) => patch({ pathType: e.target.value })}
            >
              <option value="standard">Standard Path / Road</option>
              <option value="stairs">Stairs / Steps</option>
              <option value="accessible_ramp">Accessible Ramp</option>
            </select>
          </Field>

          {node.pathType === 'stairs' && (
            <div className="flex flex-col gap-2 rounded-lg bg-surface-sunk p-2.5 mt-1 border border-accent/40">
              <span className="text-[11px] font-semibold text-accent flex items-center gap-1">
                🪜 Staircase Settings
              </span>

              <Field label={`Step Count (${node.stepCount || 8})`}>
                <input
                  type="range"
                  min="3"
                  max="50"
                  step="1"
                  className="w-[150px] accent-accent"
                  value={node.stepCount || 8}
                  onChange={(e) => patch({ stepCount: Number(e.target.value) })}
                />
              </Field>

              <Field label="Step Count (Exact)">
                <input
                  type="number"
                  min="1"
                  max="100"
                  className={INPUT}
                  value={node.stepCount || 8}
                  onChange={(e) => patch({ stepCount: Math.max(1, Number(e.target.value) || 8) })}
                />
              </Field>

              <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                <span>Side Handrails</span>
                <input
                  type="checkbox"
                  className="accent-accent h-3.5 w-3.5 rounded"
                  checked={node.handrail ?? true}
                  onChange={(e) => patch({ handrail: e.target.checked })}
                />
              </label>
            </div>
          )}

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

          <Field label="Elevation (m)">
            <input
              type="number"
              min="0"
              max="30"
              step="0.5"
              className={INPUT}
              value={node.elevation ?? 0}
              placeholder="0 (Ground)"
              onChange={(e) => patch({ elevation: Math.max(0, Number(e.target.value) || 0) })}
            />
          </Field>

          <Field label="Custom Width (m)">
            <input
              type="number"
              min="1"
              max="50"
              step="0.5"
              className={INPUT}
              value={node.widthOverride ?? ''}
              placeholder="Default"
              onChange={(e) => {
                const val = e.target.value === '' ? undefined : Number(e.target.value);
                patch({ widthOverride: val });
              }}
            />
          </Field>

          {/* Style & Decor Toggles */}
          <div className="flex flex-col gap-2 rounded-lg bg-surface-sunk p-2.5 mt-1 border border-edge">
            <span className="text-[11px] font-semibold text-slate-300">Style & Features</span>
            
            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span>Smooth Corners</span>
              <input
                type="checkbox"
                className="accent-accent h-3.5 w-3.5 rounded"
                checked={!!node.smooth}
                onChange={(e) => patch({ smooth: e.target.checked, smoothness: e.target.checked ? (node.smoothness || 3) : 0 })}
              />
            </label>

            {node.smooth && (
              <div className="flex items-center justify-between text-xs text-slate-400 pl-2">
                <span>Smoothness ({node.smoothness || 3}×)</span>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  className="w-24 accent-accent"
                  value={node.smoothness || 3}
                  onChange={(e) => patch({ smoothness: Number(e.target.value) })}
                />
              </div>
            )}


            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span>Centerline Markings</span>
              <input
                type="checkbox"
                className="accent-accent h-3.5 w-3.5 rounded"
                checked={node.showCenterline ?? (node.pathClass === 'major')}
                onChange={(e) => patch({ showCenterline: e.target.checked })}
              />
            </label>

            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span>Street Lamps</span>
              <input
                type="checkbox"
                className="accent-accent h-3.5 w-3.5 rounded"
                checked={!!node.showLamps}
                onChange={(e) => patch({ showLamps: e.target.checked })}
              />
            </label>

            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span>Bridge Guardrails</span>
              <input
                type="checkbox"
                className="accent-accent h-3.5 w-3.5 rounded"
                checked={node.showRailings ?? ((node.elevation || 0) > 0)}
                onChange={(e) => patch({ showRailings: e.target.checked })}
              />
            </label>

            <div className="flex items-center justify-between text-xs text-slate-300 mt-1 pt-1 border-t border-edge/50">
              <span>Fill Color</span>
              <input
                type="color"
                className="h-6 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
                value={node.fillColor || '#f6f0e2'}
                onChange={(e) => patch({ fillColor: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Border Color</span>
              <input
                type="color"
                className="h-6 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
                value={node.casingColor || '#26262b'}
                onChange={(e) => patch({ casingColor: e.target.value })}
              />
            </div>
          </div>


          <div className="flex flex-col gap-2 rounded-lg bg-surface-sunk p-2.5 mt-1 border border-edge">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
              <span>Waypoints ({node.polyline?.length || 0})</span>
              <div className="flex gap-1">
                <button
                  title="Subdivide path center"
                  onClick={() => {
                    if (!node.polyline || node.polyline.length < 2) return;
                    const midIdx = Math.floor((node.polyline.length - 1) / 2);
                    const [ax, az] = node.polyline[midIdx];
                    const [bx, bz] = node.polyline[midIdx + 1];
                    const newPt = [(ax + bx) / 2, (az + bz) / 2];
                    const updated = [...node.polyline];
                    updated.splice(midIdx + 1, 0, newPt);
                    patch({ polyline: updated });
                  }}
                  className="rounded bg-surface-raised px-2 py-0.5 text-[10px] text-accent hover:bg-accent hover:text-white"
                >
                  + Add Point
                </button>
                <button
                  title="Reverse direction"
                  onClick={() => {
                    if (!node.polyline) return;
                    patch({ polyline: [...node.polyline].reverse() });
                  }}
                  className="rounded bg-surface-raised px-2 py-0.5 text-[10px] text-slate-400 hover:text-white"
                >
                  ⇄ Reverse
                </button>
              </div>
            </div>

            <div className="flex max-h-36 flex-col gap-1 overflow-y-auto pr-1">
              {node.polyline?.map(([x, z], idx) => (
                <div key={idx} className="flex items-center justify-between gap-1 text-[11px]">
                  <span className="font-mono text-slate-500 w-4">#{idx + 1}</span>
                  <input
                    type="number"
                    step="0.5"
                    className="w-16 rounded border border-edge bg-surface px-1 py-0.5 font-mono text-[10px] text-slate-200"
                    value={Math.round(x * 10) / 10}
                    onChange={(e) => {
                      const newX = Number(e.target.value) || 0;
                      const updated = node.polyline.map((pt, i) => (i === idx ? [newX, pt[1]] : pt));
                      patch({ polyline: updated });
                    }}
                  />
                  <span className="text-slate-600">,</span>
                  <input
                    type="number"
                    step="0.5"
                    className="w-16 rounded border border-edge bg-surface px-1 py-0.5 font-mono text-[10px] text-slate-200"
                    value={Math.round(z * 10) / 10}
                    onChange={(e) => {
                      const newZ = Number(e.target.value) || 0;
                      const updated = node.polyline.map((pt, i) => (i === idx ? [pt[0], newZ] : pt));
                      patch({ polyline: updated });
                    }}
                  />
                  {node.polyline.length > 2 && (
                    <button
                      onClick={() => {
                        const updated = node.polyline.filter((_, i) => i !== idx);
                        patch({ polyline: updated });
                      }}
                      className="text-red-400 hover:text-red-300 text-[11px] px-1"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}


      {node.type === 'surface' && (
        <>
          <Field label="Material">
            <select
              className={INPUT}
              value={node.material || 'plaza'}
              onChange={(e) => patch({ material: e.target.value })}
            >
              <option value="plaza">Plaza / Concrete Slab Floor</option>
              <option value="concrete">Polished Concrete</option>
              <option value="wood">Timber Wood Deck</option>
              <option value="asphalt">Asphalt Paving</option>
              <option value="parking">Parking Lot</option>
              <option value="grass">Grass Lawn</option>
              <option value="water">Water Surface</option>
              <option value="sand">Sand / Beach</option>
              <option value="pitch">Sports Pitch</option>
              <option value="forest">Forest Ground</option>
            </select>
          </Field>

          <Field label={`Slab Height / Thickness (${node.height || 0}m)`}>
            <input
              type="range"
              min="0"
              max="15"
              step="0.2"
              className="w-[150px] accent-accent"
              value={node.height || 0}
              onChange={(e) => patch({ height: Number(e.target.value) })}
            />
          </Field>

          <Field label="Slab Thickness (m)">
            <input
              type="number"
              min="0"
              max="30"
              step="0.1"
              className={INPUT}
              value={node.height ?? 0}
              placeholder="0 (Flat)"
              onChange={(e) => patch({ height: Math.max(0, Number(e.target.value) || 0) })}
            />
          </Field>

          <Field label="Elevation (m)">
            <input
              type="number"
              min="0"
              max="30"
              step="0.5"
              className={INPUT}
              value={node.elevation ?? 0}
              placeholder="0 (Ground)"
              onChange={(e) => patch({ elevation: Math.max(0, Number(e.target.value) || 0) })}
            />
          </Field>

          <Field label="Surface Color">
            <input
              type="color"
              className="h-6 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
              value={node.color || '#cbd5e1'}
              onChange={(e) => patch({ color: e.target.value })}
            />
          </Field>

          {/* Slab Footprint Corners Management */}
          <div className="flex flex-col gap-2 rounded-lg bg-surface-sunk p-2.5 mt-1 border border-edge">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
              <span>Slab Corners ({node.polygon?.slice(0, -1).length || 0})</span>
              <button
                title="Add corner at edge midpoint"
                onClick={() => {
                  if (!node.polygon || node.polygon.length < 3) return;
                  const midIdx = Math.floor((node.polygon.length - 2) / 2);
                  const [ax, az] = node.polygon[midIdx];
                  const [bx, bz] = node.polygon[midIdx + 1];
                  const newPt = [(ax + bx) / 2, (az + bz) / 2];
                  const updated = [...node.polygon];
                  updated.splice(midIdx + 1, 0, newPt);
                  patch({ polygon: updated });
                }}
                className="rounded bg-surface-raised px-2 py-0.5 text-[10px] text-accent hover:bg-accent hover:text-white"
              >
                + Add Corner
              </button>
            </div>

            <div className="flex max-h-36 flex-col gap-1 overflow-y-auto pr-1">
              {node.polygon?.slice(0, -1).map(([x, z], idx) => (
                <div key={idx} className="flex items-center justify-between gap-1 text-[11px]">
                  <span className="font-mono text-slate-500 w-4">#{idx + 1}</span>
                  <input
                    type="number"
                    step="0.5"
                    className="w-16 rounded border border-edge bg-surface px-1 py-0.5 font-mono text-[10px] text-slate-200"
                    value={Math.round(x * 10) / 10}
                    onChange={(e) => {
                      const newX = Number(e.target.value) || 0;
                      const updated = node.polygon.map((pt, i) => (i === idx ? [newX, pt[1]] : pt));
                      if (idx === 0) updated[updated.length - 1] = [newX, updated[updated.length - 1][1]];
                      patch({ polygon: updated });
                    }}
                  />
                  <span className="text-slate-600">,</span>
                  <input
                    type="number"
                    step="0.5"
                    className="w-16 rounded border border-edge bg-surface px-1 py-0.5 font-mono text-[10px] text-slate-200"
                    value={Math.round(z * 10) / 10}
                    onChange={(e) => {
                      const newZ = Number(e.target.value) || 0;
                      const updated = node.polygon.map((pt, i) => (i === idx ? [pt[0], newZ] : pt));
                      if (idx === 0) updated[updated.length - 1] = [updated[updated.length - 1][0], newZ];
                      patch({ polygon: updated });
                    }}
                  />
                  {node.polygon.length > 4 && (
                    <button
                      onClick={() => {
                        const updated = node.polygon.filter((_, i) => i !== idx);
                        if (idx === 0) updated[updated.length - 1] = updated[0];
                        patch({ polygon: updated });
                      }}
                      className="text-red-400 hover:text-red-300 text-[11px] px-1"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
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