import { create } from 'zustand';

export const useSceneStore = create((set, get) => ({
  origin: { lng: -117.3223, lat: 34.1819, name: 'CSUSB' },
  originName: 'CSUSB',
  selectedId: null,
  nodes: [],
  projectName: '',
  showGrid: true,
  showWireframe: false,
  themeMode: 'day', // 'day' | 'sunset' | 'night'

  // Wayfinding Suite State
  wayfindingActive: false,
  wayfindingProfile: 'accessible', // 'accessible' | 'standard'
  wayfindingStartId: null,
  wayfindingEndId: null,
  wayfindingRoute: null,

  // /** @type {'translate'|'rotate'|'scale'|'none'} which transform gizmo is active */
  gizmoMode: 'none',

  // /** @type {{time:string, message:string}[]} */  
  operationsLog: [],

  // History stacks for Undo / Redo
  past: [],
  future: [],

  // ── selection & view ───────────────────────────────────────────────
  setOrigin: (origin) => set((s) => ({ 
    origin, 
    originName: origin.name !== undefined ? origin.name : s.originName 
  })),
  setOriginName: (originName) => set({ originName }),
  select: (id) => set({ selectedId: id }),
  setGizmoMode: (mode) => set({ gizmoMode: mode }),
  setProjectName: (projectName) => set({ projectName }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setShowWireframe: (showWireframe) => set({ showWireframe }),
  setThemeMode: (themeMode) => set({ themeMode }),

  // ── node CRUD ──────────────────────────────────────────────────────
  setNodes: (nodes) => set((s) => ({ 
    nodes, 
    past: [...s.past, s.nodes].slice(-20), 
    future: [] 
  })),
 
  addNode: (node) => set((s) => ({ 
    nodes: [...s.nodes, node], 
    past: [...s.past, s.nodes].slice(-20), 
    future: [] 
  })),
 
  /** Append many nodes at once (what operations return). */
  addNodes: (newNodes) => set((s) => ({ 
    nodes: [...s.nodes, ...newNodes], 
    past: [...s.past, s.nodes].slice(-20), 
    future: [] 
  })),
 
   /**
   * Merge a partial patch into one node.
   * `updateNode('b1', { height: 30 })` changes ONLY height.
   * This is the single path through which every edit — manual or generated — flows.
   */
  updateNode: (id, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
      past: [...s.past, s.nodes].slice(-20), 
      future: []
    })),
 
  deleteNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
      past: [...s.past, s.nodes].slice(-20), 
      future: []
    })),
 
  clear: () => set((s) => ({ 
    nodes: [], 
    selectedId: null,
    past: [...s.past, s.nodes].slice(-20), 
    future: [] 
  })),

  // ── history (undo/redo) ────────────────────────────────────────────
  undo: () => set((s) => {
    if (s.past.length === 0) return s;
    const previous = s.past[s.past.length - 1];
    const newPast = s.past.slice(0, -1);
    return {
      nodes: previous,
      past: newPast,
      future: [s.nodes, ...s.future]
    };
  }),

  redo: () => set((s) => {
    if (s.future.length === 0) return s;
    const next = s.future[0];
    const newFuture = s.future.slice(1);
    return {
      nodes: next,
      past: [...s.past, s.nodes],
      future: newFuture
    };
  }),
 
  // ── operations log ─────────────────────────────────────────────────
  /** Record what happened, with a timestamp, capped at the last 50 entries. */
  addLog: (message) =>
    set((s) => ({
      operationsLog: [
        ...s.operationsLog,
        { time: new Date().toLocaleTimeString([], { hour12: false }), message },
      ].slice(-50),
    })),
 
  // ── wayfinding actions ─────────────────────────────────────────────
  setWayfindingActive: (wayfindingActive) => set({ wayfindingActive }),
  setWayfindingProfile: (wayfindingProfile) => set({ wayfindingProfile }),
  setWayfindingStartId: (wayfindingStartId) => set({ wayfindingStartId }),
  setWayfindingEndId: (wayfindingEndId) => set({ wayfindingEndId }),
  setWayfindingRoute: (wayfindingRoute) => set({ wayfindingRoute }),
  clearWayfinding: () => set({ wayfindingStartId: null, wayfindingEndId: null, wayfindingRoute: null }),

  // ── convenience ────────────────────────────────────────────────────
  /** The currently selected node object, or null. */
  getSelected: () => {
    const { nodes, selectedId } = get();
    return nodes.find((n) => n.id === selectedId) || null;
  },
}));