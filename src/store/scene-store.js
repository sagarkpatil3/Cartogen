import { create } from 'zustand';

export const useSceneStore = create((set, get) => ({
  origin: { lng: -117.3223, lat: 34.1819 },
  selectedId: null,
  nodes: [],

  // /** @type {'translate'|'rotate'|'scale'} which transform gizmo is active */
  gizmoMode: 'translate',

  // /** @type {{time:string, message:string}[]} */  
  operationsLog: [],

  // ── selection & view ───────────────────────────────────────────────
  setOrigin: (origin) => set({ origin }),
  select: (id) => set({ selectedId: id }),
  setGizmoMode: (mode) => set({ gizmoMode: mode }),

  // ── node CRUD ──────────────────────────────────────────────────────
  setNodes: (nodes) => set({ nodes }),
 
  addNode: (node) => set((s) => ({ nodes: [...s.nodes, node] })),
 
  /** Append many nodes at once (what operations return). */
  addNodes: (newNodes) => set((s) => ({ nodes: [...s.nodes, ...newNodes] })),
 
   /**
   * Merge a partial patch into one node.
   * `updateNode('b1', { height: 30 })` changes ONLY height.
   * This is the single path through which every edit — manual or generated — flows.
   */
  updateNode: (id, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    })),
 
  deleteNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),
 
  clear: () => set({ nodes: [], selectedId: null }),
 
  // ── operations log ─────────────────────────────────────────────────
  /** Record what happened, with a timestamp, capped at the last 50 entries. */
  addLog: (message) =>
    set((s) => ({
      operationsLog: [
        ...s.operationsLog,
        { time: new Date().toLocaleTimeString([], { hour12: false }), message },
      ].slice(-50),
    })),
 
  // ── convenience ────────────────────────────────────────────────────
  /** The currently selected node object, or null. */
  getSelected: () => {
    const { nodes, selectedId } = get();
    return nodes.find((n) => n.id === selectedId) || null;
  },
}));