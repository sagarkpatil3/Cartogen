import { create } from 'zustand';

export const useSceneStore = create((set) => ({
  origin: { lng: -117.3223, lat: 34.1819 },

  nodes: [
    { id: 'b1', type: 'building', footprint: [[-20, -15], [20, -15], [20, 15], [-20, 15]], height: 18 },
    { id: 'b2', type: 'building', footprint: [[40, 10], [70, 10], [70, 50], [40, 50]], height: 32 },
    { id: 'b3', type: 'building', footprint: [[-70, 20], [-30, 20], [-30, 45], [-70, 45]], height: 11 },
  ],

  setOrigin: (origin) => set({ origin }),
  addNode: (node) => set((s) => ({ nodes: [...s.nodes, node] })),
  clear: () => set({ clear: [] }),
  setNodes: (nodes) => set({ nodes }),
}));