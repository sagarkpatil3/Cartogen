import { create } from 'zustand';

export const useSceneStore = create((set) => ({
  origin: { lng: -117.3223, lat: 34.1819 },
  selectedId: null,

  nodes: [

  ],

  setOrigin: (origin) => set({ origin }),
  addNode: (node) => set((s) => ({ nodes: [...s.nodes, node] })),
  select: (id) => set({ selectedId: id }),
  setNodes: (nodes) => set({ nodes }),
  clear: () => set({ nodes: [], selectedId: null }),
}));