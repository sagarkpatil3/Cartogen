# Progress

Current status of the build. Updated at the end of each working session.

---

## Current phase

**Phase 2 — Editing layer.** The base map is complete and rendering correctly.

---

## Completed

### Foundation
- Vite + React project scaffold
- `lib/projection.js` — WGS84 ⇄ local-meter conversion via `makeProjector()`, including
  the `cos(latitude)` correction for longitude
- `store/scene-store.js` — Zustand store holding `origin`, `nodes`, and `selectedId`
- `lib/geometry.js` — `extrudeFootprint`, `ribbon`, `fillPolygon`, `centroid`, `pointInPolygon`

### Base map
- `ui/MapPicker.jsx` — MapLibre location picker; clicking sets the scene origin
- `osm/overpass.js` — `fetchArea()` queries buildings, highways, parking, leisure,
  landuse, and water within a bounding box
- `osm/parse-osm.js` — classifies raw OSM tags into typed scene nodes:
  building (with `kind`), path (with `pathClass`), surface (with `material`)
- `render/Building.jsx` — extruded footprints colored by building kind, click to select
- `render/Path.jsx` — two-ribbon rendering (casing beneath, fill above) producing
  bordered roads and walkways
- `render/Surface.jsx` — filled polygons for grass, parking, water, and sports pitches
- `render/SceneNodes.jsx` — iterates the node list and dispatches to the correct renderer
- `render/Viewport.jsx` — Canvas, camera, lighting, ground plane, orbit controls
- `render/theme.js` — single source of truth for colors, height layers, widths, lighting
- Art direction: ACES filmic tone mapping, directional sun with hemisphere fill, shadows
- Contrast-tuned palette: dark asphalt for roads and parking, bright lawns, light
  buildings, near-white walkways with dark borders
- Resolved: camera far-plane clipping, backface culling on flat geometry, z-fighting
  between overlapping ground layers

### Trees
- `render/Tree.jsx` — low-poly tree (cylinder trunk, cone foliage) grouped as one object
- `ops/scatter-trees.js` — first scene operation. Scatters trees across an area with
  placement validation: rejects positions inside building footprints, with an optional
  grass-only mode

---

## In progress

- Wiring the scatter operation to place trees near the currently selected node
- Store actions required by the editing UI: `updateNode`, `deleteNode`,
  `operationsLog` + `addLog`, `gizmoMode`

---

## Next

1. **Store actions** — `updateNode(id, patch)`, `deleteNode(id)`, `addLog(message)`,
   `gizmoMode` state
2. **Sidebar** — brand header, actions, prompt input, node inspector, operations log
3. **Select and transform** — `TransformControls` for move/rotate/scale, with changes
   committed back to the store
4. **Instancing** — `InstancedMesh` so large tree counts render in a single draw call
5. **Prompt layer** — Zod operation schema, validator, deterministic keyword parser,
   then a language model behind the same interface

---

## Open questions

- Which model to use for the prompt layer (Gemini for GCP alignment vs. alternatives)
- Tree variety: single model now, multiple species later
- How much manual editing to build before shifting focus to the prompt layer
- Whether published maps report usage analytics or remain fully static

---

## Session handoff

**Last session:** Completed the base map — OSM buildings, roads, paths, and surfaces
rendering with a tuned art direction. Resolved a chain of rendering bugs (documented in
`GOTCHAS.md`). Built the tree component and the first scene operation with placement
validation.

**Current state:** Base map complete. Tree rendering verified. Scatter operation written
and unit-tested, not yet wired to the UI.

**Next step:** Add the store actions, then build the sidebar around them.

**Watch out for:** `setNodes()` replaces the entire node array, so loading an area wipes
manually placed trees. Decide whether area loading should merge or replace.
