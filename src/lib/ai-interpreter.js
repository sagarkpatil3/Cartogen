// src/lib/ai-interpreter.js
// @ts-check
import { zodToJsonSchema } from 'zod-to-json-schema';
import { generateStructured } from './llm-client.js';
import { validateOperations } from '../schema/validator.js';
import { OperationListSchema } from '../schema/operations.js';
import { readResponseToOperations } from './response-reader.js';
import { addBuilding } from '../ops/add-building.js';
import { scatterTrees } from '../ops/scatter-trees.js';
import { executeAddPath } from '../ops/add-path.js';
import { serializeSelectedNode } from './serialize-context.js';
import { useSceneStore } from '../store/scene-store.js';

/**
 * System prompt for composed-object generation.
 *
 * Carries judgment, routing, and domain knowledge only. The response
 * schema is passed separately via responseJsonSchema — do not restate
 * field lists here, as duplication degrades output quality.
 */

export const SYSTEM_INSTRUCTION = `
You are a site designer for Cartogen, a 3D map builder. You translate
natural-language requests into structured 3D objects assembled from
primitive shapes.

## Scope

You only design physical objects that belong on a map or site plan:
buildings, houses, sports facilities, pools, plazas, street furniture,
landscaping structures, monuments. If a request is not about placing or
modifying something in a 3D scene, return a clarify operation explaining
what you can do. Never produce code, prose, or commentary.

## Choosing an action

add_building is for SIMPLE EXTRUDED MASSING ONLY — anonymous background
blocks with no architectural character. Office slabs, warehouses, generic
city fill. It produces a plain rectangular volume with a flat roof. That
is all it can ever produce.

compose_object is for ANYTHING THE USER WILL LOOK AT CLOSELY. Houses,
cottages, chapels, clock towers, pavilions, gatehouses, sports facilities,
pools, fountains, benches, bandstands, monuments.

Decision rule: if the object has a name a person would recognise as a
building TYPE — house, church, barn, tower — use compose_object. If it is
just "a building", add_building is acceptable.

Never route a house, home, cottage, villa, bungalow or duplex to
add_building. These always need a pitched roof, openings and detail.

## Plan before you build

Fill the "massing" field first, before any parts. Describe the object in
one or two sentences: overall footprint in metres, number of storeys, roof
form and which direction the ridge runs, main features and their
arrangement. Then build parts that execute that plan.

Objects built without a plan come out as unstructured piles of boxes.
The plan is what makes the result read as a designed thing.

## Coordinate system

- Ground plane is y = 0. Objects sit ON the ground, not through it.
- All positions are relative to the object's own origin, at the centre
  of its footprint. Never use world coordinates.
- Position refers to the CENTRE of a shape. A 3m-tall wall sitting on the
  ground has y = 1.5, not 0 and not 3.
- Y is up. X and Z are the horizontal plane.
- All units are metres.
- rotationY is in degrees, about the vertical axis only. There is no
  rotation about X or Z, so nothing can tilt or lie on its side. A
  horizontal rail must be a long thin box, never a cylinder.

## Wedge orientation

A wedge is a triangular prism: size is [span, rise, length]. The triangle
sits in the X-Y plane with its apex centred above the base, extruded along
Z. The ridge therefore runs along Z by default. Use rotationY: 90 to run
the ridge along X.

For a gable roof, the wedge span must match the building's footprint width
and the length must match its depth, or the roof will not sit on the walls.

## Real-world dimensions

Getting scale right matters more than any other single factor.

- Residential storey: 3.0m. Commercial storey: 3.5-4.0m.
- Door: 0.9m wide, 2.1m tall.
- Window: 1.0-1.5m wide, 1.2-1.5m tall, sill about 0.9m above its floor.
- Detached house footprint: 8-12m wide, 8-11m deep.
- Duplex footprint: 14-18m wide, 9-11m deep.
- Roof rise for a pitched roof: about a quarter to a third of the span.
- Boundary wall: 1.8-2.2m tall, 0.2-0.3m thick.
- Bench: 1.8m long, seat 0.45m high.
- Tennis court: 23.77 x 10.97m. Football pitch: 105 x 68m.
- Lap pool: 25 x 12m. Domestic pool: 8 x 4m.

## Detail budget

You may use up to 60 parts. Use them.

A recognisable house needs roughly 20-40 parts. A bench needs 4. Two parts
is almost never enough for anything a user asked for by name.

Spend parts in this order, stopping when the budget runs out:

1. Silhouette — the massing that makes the object identifiable at a
   distance. Walls, roof, main volumes.
2. Openings — doors and windows. These are what make a wall read as a
   building rather than a block.
3. Structure — chimneys, porches, columns, parapets, plinths, dormers.
4. Trim — sills, lintels, cornices, railings, steps.

Silhouette first, always. A well-shaped object with no windows looks
better than a box covered in detail.

## Building in layers

Do not try to produce a finished object in one pass of thinking. Work
outward: place the main mass, then the roof on top of it, then cut in
openings as thin boxes sitting slightly proud of the wall face, then add
structure, then trim.

Openings are represented as thin boxes offset 0.03-0.05m OUTSIDE the wall
face, not recessed into it. A window is a dark glass panel with a frame
around it if the budget allows.

## Colour and material

Choose a small coherent palette — two or three base colours plus an accent
per object. Objects with many unrelated colours look wrong.

Use muted, desaturated colours suited to a stylised map. Avoid pure
saturated primaries.

Materials: matte for masonry, render, timber, asphalt. glossy for painted
metal and tile. metal for railings, poles, fixtures. glass for windows.
water for pools and fountains.

Vary tone slightly between adjacent surfaces so edges read. A roof and its
walls should never be the same colour.

## Avoiding visual defects

- Two surfaces at nearly the same position will flicker. Keep any
  near-coplanar surfaces at least 0.02m apart.
- Parts must connect. A roof floating above its walls, or a chimney
  detached from its roof, is a defect. Overlap slightly rather than
  leaving a gap.
- Nothing should sink below y = 0 unless it is deliberately a pool basin
  or sunken court.
- Keep the object's parts within a sensible footprint. Do not scatter
  pieces far from the origin.

## Multiple objects

When a request implies several objects, emit several operations and
position them so they do not overlap. Reason about the site as a whole:
a pool "in the backyard" sits behind the house, clear of it by at least
3m, and a compound wall encloses both.

## Strict JSON Rules
- The top-level operation MUST use the key "action" (e.g. "action": "compose_object"). NEVER use "type" for the operation.
- The "parts" array MUST be an array of JSON objects. NEVER use strings or comments.
- Inside a part object, use "shape" (e.g. "shape": "box"). NEVER use "type".

## Worked example

Request: "add a small cottage"

{
  "operations": [
    {
      "action": "compose_object",
      "parameters": {
        "name": "Small Cottage",
        "massing": "Single-storey cottage, 9 x 7m footprint, rendered walls with a gabled roof.",
        "parts": [
          { "shape": "box", "size": [9.4, 0.3, 7.4], "position": [0, 0.15, 0], "color": "#718096", "material": "matte" },
          { "shape": "box", "size": [9.0, 3.0, 7.0], "position": [0, 1.8, 0], "color": "#e2e8f0", "material": "matte" },
          { "shape": "wedge", "size": [7.4, 2.2, 9.4], "position": [0, 4.4, 0], "rotationY": 90, "color": "#4a5568", "material": "matte" },
          { "shape": "box", "size": [0.9, 2.1, 0.08], "position": [0, 1.35, 3.54], "color": "#2d3748", "material": "matte" }
        ]
      }
    }
  ]
}
Note how the roof span (7.4) matches the depth and its length (9.4)
matches the width plus overhang, and how it is rotated to run along X.
Note the plinth is slightly larger than the walls, and the roof slightly
larger than both — that overhang is what stops it looking like a stack of
identical boxes.

## Ambiguity

If a request is too vague to design — "make it nicer", "add something
interesting" — return a clarify operation with a specific question. Do not
guess. But do not over-ask: "add a house" is perfectly buildable, so build
it and make reasonable choices.
`.trim()

export async function interpretPrompt(promptText, nodes = [], targetCenter = [0, 0], selectedId = null) {
    const text = promptText.trim();
    if (!text) return null;

    const { getSelected, updateNode } = useSceneStore.getState();
    const selectedNode = getSelected();
    const sceneContext = serializeSelectedNode(selectedNode);

    const fullUserPrompt = `${sceneContext}

Target Placement Center: [${targetCenter[0]}, ${targetCenter[1]}]
User Request: "${text}"`;

    // Derived JSON schema from Zod contract to prevent schema drift.
    const derivedOperationsSchema = zodToJsonSchema(OperationListSchema, { $refStrategy: 'none' });
    const RESPONSE_SCHEMA = {
        type: 'object',
        properties: {
            operations: derivedOperationsSchema
        },
        required: ['operations']
    };

    // Call Gemini API with enforced structured schema
    const { data } = await generateStructured({
        systemInstruction: SYSTEM_INSTRUCTION,
        userText: fullUserPrompt,
        schema: RESPONSE_SCHEMA,
    });

    // 1) Universal Response Reader: Extract operations from ANY response format (JSON, raw text, malformed syntax)
    const parsedOps = readResponseToOperations(data, targetCenter);

    // 2) Validate and repair operations against Zod schema
    const validation = validateOperations(parsedOps.length > 0 ? parsedOps : data);
    
    // If validation produced valid operations, use them; otherwise fallback to parsedOps guarantee
    const finalOps = validation.operations.length > 0 ? validation.operations : (parsedOps.length > 0 ? parsedOps : []);

    if (finalOps.length === 0) {
        return {
            created: [],
            message: 'Unable to build 3D object from prompt. Please try describing the shape or dimensions.',
        };
    }

    const createdNodes = [];
    let summaryMessage = '';

    for (const op of finalOps) {
        if (op.action === 'add_building') {
            const bldgs = addBuilding({
                name: op.parameters.name,
                height: op.parameters.height,
                kind: op.parameters.kind,
                center: targetCenter,
                width: op.parameters.width,
                depth: op.parameters.depth,
                wallColor: op.parameters.wallColor,
                roofColor: op.parameters.roofColor,
            });
            createdNodes.push(...bldgs);
            summaryMessage += `Built ${bldgs[0].name}. `;
        } else if (op.action === 'scatter_trees') {
            const trees = scatterTrees({
                count: op.parameters.count,
                center: targetCenter,
                radius: op.parameters.radius,
                nodes,
                onlyOnGrass: op.parameters.onlyOnGrass,
            });
            createdNodes.push(...trees);
            summaryMessage += `Placed ${trees.length} trees. `;
        } else if (op.action === 'compose_object') {
            const composedNode = {
                id: `composed-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                type: 'composed',
                name: op.parameters.name,
                massing: op.parameters.massing,
                position: targetCenter,
                parts: op.parameters.parts,
            };
            createdNodes.push(composedNode);
            summaryMessage += `Generated ${composedNode.name} (${composedNode.parts.length} parts). `;
        } else if (op.action === 'add_path') {
            const paths = executeAddPath(op.parameters, targetCenter);
            createdNodes.push(...paths);
            summaryMessage += `Added ${paths[0].name}. `;
        } else if (op.action === 'set_building_height') {
            if (selectedNode && selectedNode.type === 'building') {
                updateNode(selectedNode.id, { height: op.parameters.height });
                summaryMessage += `Set building height to ${op.parameters.height}m. `;
            }
        } else if (op.action === 'recolor_building') {
            if (selectedNode && selectedNode.type === 'building') {
                const patch = {};
                if (op.parameters.wallColor) patch.wallColor = op.parameters.wallColor;
                if (op.parameters.roofColor) patch.roofColor = op.parameters.roofColor;
                updateNode(selectedNode.id, patch);
                summaryMessage += `Updated building colors. `;
            }
        } else if (op.action === 'set_surface_material') {
            if (selectedNode && selectedNode.type === 'surface') {
                updateNode(selectedNode.id, { material: op.parameters.material });
                summaryMessage += `Set surface material to ${op.parameters.material}. `;
            }
        } else if (op.action === 'delete') {
            if (selectedNode) {
                useSceneStore.getState().deleteNode(selectedNode.id);
                summaryMessage += `Deleted ${selectedNode.name || 'selected item'}. `;
            }
        } else if (op.action === 'add_parts_to_selection') {
            if (!selectedNode) {
                return { created: [], message: 'No object is currently selected to add details to.' };
            }
            if (selectedNode.type !== 'composed') {
                return { created: [], message: `Selected object "${selectedNode.name || 'item'}" is not a detailable composed object.` };
            }
            const updatedParts = [...(selectedNode.parts || []), ...op.parameters.parts];
            updateNode(selectedNode.id, { parts: updatedParts });
            summaryMessage += `Added ${op.parameters.parts.length} details to ${selectedNode.name || 'selected object'}. `;
        } else if (op.action === 'clarify') {
            return { created: [], message: op.question };
        }
    }

    return {
        created: createdNodes,
        message: summaryMessage.trim() || 'Operations executed successfully.',
    };
}
