# Design Decisions

The reasoning behind the architecture. Consult this before changing any of it — most of
these were chosen deliberately over a considered alternative.

---

## Data model

### WGS84 is the source of truth; local meters are derived

Every node stores real-world `[lng, lat]` geometry. Local `[x, z]` meter coordinates are
a cached derivation used only for rendering.

Storing only projected meters would be faster to implement, but it permanently discards
the information needed to publish the map, export to GeoJSON or IMDF, or re-anchor the
scene to a different origin. Coordinates in meters are meaningless without the origin they
were measured from. Keeping both costs one extra field per node and preserves every
downstream capability.

### A single generic scene graph of typed nodes

The entire scene is one flat array of `{ id, type, ...typeSpecificFields }` objects.
Supporting a new kind of object — a bench, a lamp, a water feature — means adding a `type`
and a renderer, not modifying the engine.

This is what makes the scene trivially serializable, which is what makes save, publish,
and export straightforward. It is also what allows the prompt layer to add arbitrary
content without touching core code.

Current node shapes:

| Type | Geometry | Additional fields |
|---|---|---|
| `building` | `footprint: [[x,z], …]` | `height`, `kind` |
| `path` | `polyline: [[x,z], …]` | `pathClass` (major / street / walkway) |
| `surface` | `polygon: [[x,z], …]` | `material` (grass / parking / water / pitch …) |
| `tree` | `position: [x,z]` | `scale`, `color` |

Note that a tree is a **point**, not a footprint. Different node types legitimately carry
different geometry; the generic container is what matters.

### Scene operations are pure functions

An operation such as `scatterTrees({ count, center, radius, nodes })` returns new nodes.
It does not touch the store or React.

Pure functions are testable in isolation and reusable from any caller. More importantly,
this signature is the contract the prompt layer targets: interpreting a request reduces to
filling in parameters. The engine never changes. The rule this enforces is that the
language layer expresses *intent*, while deterministic generators produce *geometry*.

### Appearance is centralized in one theme module

`render/theme.js` holds every color, height layer, width, and lighting value. Render
components look up styles; they never hardcode appearance.

The entire map can therefore be restyled from a single file, which is the basis for the
product's core claim: a user with no design skill produces a map that looks designed,
because the design is a preset rather than per-object work.

---

## Rendering

### Deliberate height layering

Ground sits at `y = -0.5`, surfaces at `0.02–0.04`, path casings at `0.19–0.20`, and path
fills `0.015` above their casing.

Coplanar or near-coplanar surfaces cannot be resolved by the depth buffer, particularly at
distance. Real vertical separation — supplemented by `polygonOffset` where needed — is what
eliminates the resulting flicker.

### Paths render as two stacked ribbons

Each path draws a wider dark ribbon beneath a narrower colored one. The dark edge visible
at the margins reads as a border.

This is standard practice in map renderers and is the difference between paths that look
designed and paths that look like flat tape.

### Contrast is built on lightness, not hue

Roads and parking are dark asphalt, lawns are saturated green, buildings are light, and
walkways are near-white with a dark border.

Two colors of differing hue but similar brightness are difficult to distinguish. An earlier
palette failed for exactly this reason: every element sat at a similar mid-tone and the map
read as an undifferentiated mass.

---

## Product

### Published maps are immutable static bundles

Publishing bakes a `scene.json` and its assets to CDN storage. A single shared read-only
viewer loads any bundle by URL. Publishing flips an alias; rollback flips it back.

Static assets scale without practical limit at negligible marginal cost. A server-rendered
alternative would scale cost linearly with traffic. This is the most consequential
scalability decision in the system.

Export tiers, in order of expected usage:

1. `<iframe>` embed — one line, works on any site, requires no technical skill
2. Web component / script tag — closer integration, still no build step
3. Downloadable self-hosted bundle — for organizations that require it
4. Data export (GeoJSON, IMDF, glTF, 3D Tiles) — ensures customer data is not locked in

### The embed viewer is separate from the editor

The published bundle must not include editing code. Bundle size is the primary constraint
when a map is embedded in an existing page, so the viewer ships as a distinct, minimal
build.

### Published maps are pinned to a viewer version

A customer's embedded map is running on their site. A viewer update that breaks it is a
production incident on someone else's property, so published bundles reference a fixed
viewer version.

### Manual editing supports the prompt layer rather than replacing it

Established GIS tools have decades of investment in manual editing. The differentiator here
is describing a change in language and having it applied. Manual tools should be sufficient
to adjust generated output — select, move, resize, rename, recolor — with the primary
engineering effort directed at the prompt layer.

### Campuses are the initial market; the engine remains general

The architecture is location-agnostic by construction. Going to market horizontally,
however, tends to produce a generic demo and no first customer. Campuses provide a
concrete buyer, an identifiable incumbent, and an accessible pilot.

### Geospatial correctness is treated as a feature

Coordinate reference systems are stated explicitly, OSM's ODbL attribution is honored, and
authoritative data is distinguished from stylized representation. The product never implies
survey accuracy it does not have.

This is what allows the tool to be evaluated seriously by GIS practitioners, and what
positions it as complementary to established platforms rather than a naive competitor.

---

## Tooling

### JavaScript with JSDoc and Zod rather than TypeScript

The validation that matters most in this system is runtime validation of generated
operations, which static types cannot provide — that is Zod's role. JSDoc annotations
supply editor completion and inline documentation without a compilation step.

TypeScript migration remains available later and proceeds file by file, so this choice
forecloses nothing.
