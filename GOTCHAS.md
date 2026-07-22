# Troubleshooting Notes

Bugs that were expensive to diagnose and are cheap to fix once recognized. Worth reading
before deep-debugging anything that appears correct but does not work.

---

## Filename capitalization can produce two modules

**Symptom.** A file is edited and saved, the page reloads, and nothing changes —
repeatedly, across multiple attempts.

**Cause.** `Theme.js` and `theme.js` both existed. macOS and Windows filesystems are
case-insensitive but case-preserving, so both import paths resolve, while the bundler may
treat them as separate modules. Components were split across the two, and edits landed in
a file the running application never loaded.

**Resolution.** Use one canonical casing per filename. Lowercase throughout. To confirm a
suspected duplicate:

```js
Promise.all([
  import('/src/render/theme.js').catch(() => 'missing'),
  import('/src/render/Theme.js').catch(() => 'missing'),
]).then(([a, b]) => console.log(a?.theme?.path?.street, b?.theme?.path?.street));
```

---

## Backface culling renders flat geometry invisible

**Symptom.** Geometry reports valid vertex counts, throws no errors, and is entirely
invisible from above.

**Cause.** Only the front face of a triangle is drawn. When a generated ribbon's triangles
are wound such that their normals point downward, the visible side is the back face.

**Resolution.** Set `side={THREE.DoubleSide}` on the material — acceptable and common for
flat map features — or correct the winding order in the geometry builder.

**Fast diagnosis.** Replace the mesh with simple boxes at the same coordinates. If the
boxes appear and the original geometry does not, the problem is winding or normals, not
data or position.

---

## Z-fighting between overlapping flat layers

**Symptom.** Ground surfaces, parking areas, or paths shimmer and flicker as the camera
moves, worsening with distance.

**Cause.** The depth buffer cannot resolve surfaces separated by only a few centimeters,
especially far from the camera. Both surfaces compete for the same pixels.

**Resolution.** Either introduce real vertical separation — dropping the ground plane to
`y = -0.5` places it clearly beneath every map feature — or apply
`polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2}` to the material that
should take precedence. Both approaches can be combined.

---

## Temporary debug code is the hardest class of bug to locate

**Symptom.** Every inspected value is correct, every isolated test passes, and the rendered
result is still wrong.

**Cause.** A debug mesh remained in place — a hardcoded color, a raised position, and
disabled depth testing. The actual geometry was rendering far above the scene while only a
secondary element remained visible at ground level.

**Resolution and practice.** Revert each temporary modification immediately after its test
concludes. Change one variable, evaluate, restore. Never accumulate debug edits.

---

## Camera far plane clips distant geometry

**Symptom.** Objects on the far side of the scene disappear when the camera tilts upward.

**Cause.** A perspective camera renders only between its `near` and `far` planes. Tilting
increases the distance to far objects beyond the default `far` value, culling them.

**Resolution.** Set both explicitly: `camera={{ near: 0.5, far: 8000 }}`. Nearby geometry
disappearing or flickering instead indicates `near` is set too small.

---

## Bundler module cache persists across reloads

**Symptom.** Source changes do not take effect even after a hard browser refresh.

**Resolution.**

```bash
# stop the dev server
rm -rf node_modules/.vite
npm run dev
```

Follow with a hard reload in the browser.

---

## Replacing the node array discards prior additions

**Symptom.** Manually placed objects disappear after loading a new area.

**Cause.** `setNodes(nodes)` overwrites the entire array, removing anything added by hand
or by a scene operation.

**Resolution.** Choose explicitly between merging (`[...current, ...incoming]`) and
replacing, and label the triggering control accordingly.

---

## External geospatial data contains malformed geometry

**Symptom.** `THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN`,
repeating every frame.

**Cause.** OpenStreetMap is crowd-sourced. A small number of elements carry geometry that
projects to non-finite coordinates.

**Resolution.** Validate at the boundary where external data enters the system — the parser
— rather than downstream:

```js
const local = geo.map(proj.toLocal)
  .filter(pt => Number.isFinite(pt[0]) && Number.isFinite(pt[1]));
if (local.length < 2) continue;   // skip degenerate elements
```

The general principle — validate untrusted input at the edge — applies equally to generated
operations later, which is the purpose of the Zod schema layer.

---

## Browser console cannot access module scope

**Symptom.** `useSceneStore is not defined` when pasting diagnostic code into the console.

**Cause.** ES module imports are scoped to the importing file. The console evaluates in
global scope.

**Resolution.** For development only, expose the store deliberately:
`window.store = useSceneStore;`. Remove before shipping.

---

## Diagnostic method

When behavior contradicts an apparently correct implementation, bisect the pipeline and
identify the first stage that fails rather than hypothesizing about causes.

1. **Data** — is it present? `store.getState().nodes.filter(...)`
2. **Component** — is it executing? A log statement at the top of the render function
3. **Geometry** — is it valid? `geometry.attributes.position.count`
4. **Visibility** — substitute primitive boxes at the same coordinates
5. **Module identity** — check for duplicate filename casings; clear the bundler cache

Each step eliminates an entire class of causes. The first failure is the defect.
