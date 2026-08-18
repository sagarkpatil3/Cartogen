// @ts-check

/**
 * UNIVERSAL GEOMETRY RESPONSE READER
 * Robustly parses and converts ANY AI model response format into valid Cartogen 3D scene operations.
 * Handles structured JSON, markdown codeblocks, raw string fragments, flattened objects, shape synonyms,
 * named colors, and missing action tags through intelligent geometric intent inference.
 */

const COLOR_NAMES = {
  white: '#f8fafc',
  black: '#0f172a',
  gray: '#94a3b8',
  grey: '#94a3b8',
  slate: '#64748b',
  concrete: '#cbd5e1',
  stone: '#94a3b8',
  red: '#ef4444',
  blue: '#3b82f6',
  sky: '#38bdf8',
  navy: '#1e3a8a',
  green: '#22c55e',
  grass: '#4ade80',
  yellow: '#eab308',
  gold: '#f59e0b',
  brown: '#854d0e',
  wood: '#a16207',
  glass: '#7dd3fc',
  water: '#38bdf8',
};

/** Convert any color input (hex, color name, rgb) to valid #rrggbb hex string */
function normalizeColor(colorVal, defaultHex = '#94a3b8') {
  if (typeof colorVal !== 'string') return defaultHex;
  const str = colorVal.trim().toLowerCase();

  if (/^#[0-9a-f]{6}$/.test(str)) return str;
  if (/^#[0-9a-f]{3}$/.test(str)) {
    const [, r, g, b] = str;
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  if (COLOR_NAMES[str]) return COLOR_NAMES[str];

  for (const [name, hex] of Object.entries(COLOR_NAMES)) {
    if (str.includes(name)) return hex;
  }

  return defaultHex;
}

/** Map shape synonyms (cube, block, slab, column, pyramid) to valid 3D primitives */
function normalizeShape(shapeVal) {
  if (typeof shapeVal !== 'string') return 'box';
  const s = shapeVal.trim().toLowerCase();

  if (['box', 'cube', 'block', 'slab', 'wall', 'plate', 'rectangle', 'floor', 'tile'].includes(s)) {
    return 'box';
  }
  if (['cylinder', 'column', 'pillar', 'post', 'pipe', 'rod', 'tube'].includes(s)) {
    return 'cylinder';
  }
  if (['sphere', 'ball', 'globe', 'orb', 'dome'].includes(s)) {
    return 'sphere';
  }
  if (['wedge', 'roof', 'prism', 'triangle', 'gable', 'pyramid', 'ramp'].includes(s)) {
    return 'wedge';
  }

  return 'box';
}

/** Coerce position tuple [x, y, z] */
function normalizeVec3(vec, defaultVec = [0, 0.5, 0]) {
  if (!Array.isArray(vec)) return defaultVec;
  const numX = Number(vec[0]);
  const numY = Number(vec[1]);
  const numZ = Number(vec[2]);

  return [
    Number.isFinite(numX) ? numX : defaultVec[0],
    Number.isFinite(numY) ? numY : defaultVec[1],
    Number.isFinite(numZ) ? numZ : defaultVec[2],
  ];
}

/** Normalize size tuple [width, height, depth] */
function normalizeSize(sizeVec, defaultSize = [1, 1, 1]) {
  const [w, h, d] = normalizeVec3(sizeVec, defaultSize);
  return [Math.max(0.05, w), Math.max(0.05, h), Math.max(0.05, d)];
}

/** Normalize composed part object */
function normalizePart(partObj) {
  if (partObj == null || typeof partObj !== 'object') {
    return { shape: 'box', size: [1, 0.3, 1], position: [0, 0.15, 0], color: '#cbd5e1', material: 'matte' };
  }

  const rawShape = partObj.shape || partObj.type || partObj.form || 'box';
  const shape = normalizeShape(rawShape);
  const position = normalizeVec3(partObj.position || partObj.pos, [0, 0.5, 0]);
  const color = normalizeColor(partObj.color || partObj.materialColor, '#cbd5e1');
  const material = ['matte', 'glossy', 'metal', 'glass', 'water'].includes(partObj.material) ? partObj.material : 'matte';

  if (shape === 'cylinder') {
    const radius = Math.max(0.05, Number(partObj.radius) || (Array.isArray(partObj.size) ? Number(partObj.size[0]) / 2 : 0.5));
    const height = Math.max(0.05, Number(partObj.height) || (Array.isArray(partObj.size) ? Number(partObj.size[1]) : 1.0));
    return {
      shape: 'cylinder',
      radius,
      height,
      position,
      rotationY: Number(partObj.rotationY || partObj.rotation || 0),
      color,
      material,
    };
  }

  if (shape === 'sphere') {
    const radius = Math.max(0.05, Number(partObj.radius) || (Array.isArray(partObj.size) ? Number(partObj.size[0]) / 2 : 0.5));
    return {
      shape: 'sphere',
      radius,
      position,
      color,
      material,
    };
  }

  // Box and Wedge
  const size = normalizeSize(partObj.size || partObj.dimensions, [1, 1, 1]);
  return {
    shape,
    size,
    position,
    rotationY: Number(partObj.rotationY || partObj.rotation || 0),
    color,
    material,
  };
}

/**
 * Universal Intent Inferencer: Determines operation action from object keys when action is missing
 */
function inferAction(obj) {
  if (obj.action && typeof obj.action === 'string') return obj.action;
  if (obj.type && ['add_building', 'compose_object', 'scatter_trees', 'add_path', 'set_building_height', 'recolor_building', 'set_surface_material', 'delete'].includes(obj.type)) {
    return obj.type;
  }

  // Composed object detection
  if (Array.isArray(obj.parts) || Array.isArray(obj.shapes) || Array.isArray(obj.elements) || Array.isArray(obj.components) || obj.massing) {
    return 'compose_object';
  }

  // Building detection
  if (obj.height || obj.width || obj.depth || obj.kind || obj.floors || obj.wallColor || obj.roofColor) {
    return 'add_building';
  }

  // Path / Stairs detection
  if (obj.polyline || obj.pathType || obj.stepCount || obj.pathClass) {
    return 'add_path';
  }

  // Trees detection
  if (obj.radius || obj.count || obj.onlyOnGrass) {
    return 'scatter_trees';
  }

  // Surface detection
  if (obj.material || obj.polygon || obj.slab) {
    return 'set_surface_material';
  }

  return 'compose_object';
}

/**
 * Normalizes any operation payload into valid Cartogen Operation objects
 */
export function normalizeOperation(rawOp, defaultCenter = [0, 0]) {
  if (rawOp == null || typeof rawOp !== 'object') return null;

  const action = inferAction(rawOp);
  const parameters = (rawOp.parameters && typeof rawOp.parameters === 'object') ? rawOp.parameters : rawOp;

  if (action === 'compose_object') {
    const rawParts = Array.isArray(parameters.parts)
      ? parameters.parts
      : Array.isArray(rawOp.parts)
      ? rawOp.parts
      : Array.isArray(parameters.shapes)
      ? parameters.shapes
      : [];

    const parts = rawParts
      .filter((p) => typeof p === 'object' && p !== null)
      .map(normalizePart);

    // If model omitted parts, generate a default 3D floor slab box
    if (parts.length === 0) {
      parts.push({
        shape: 'box',
        size: [12, 0.4, 12],
        position: [0, 0.2, 0],
        rotationY: 0,
        color: '#cbd5e1',
        material: 'matte',
      });
    }

    return {
      action: 'compose_object',
      location: rawOp.location || { at: 'selection' },
      parameters: {
        name: parameters.name || rawOp.name || 'Custom 3D Object',
        massing: parameters.massing || rawOp.massing || '',
        parts,
      },
    };
  }

  if (action === 'add_building') {
    return {
      action: 'add_building',
      location: rawOp.location || { at: 'selection' },
      parameters: {
        name: parameters.name || rawOp.name || 'New Building',
        kind: parameters.kind || rawOp.kind || 'commercial',
        height: Math.max(3, Number(parameters.height || rawOp.height) || 18),
        width: Math.max(5, Number(parameters.width || rawOp.width) || 24),
        depth: Math.max(5, Number(parameters.depth || rawOp.depth) || 18),
        floors: parameters.floors ? Number(parameters.floors) : undefined,
        wallColor: parameters.wallColor ? normalizeColor(parameters.wallColor, '#d9d6cf') : undefined,
        roofColor: parameters.roofColor ? normalizeColor(parameters.roofColor, '#c2beb4') : undefined,
      },
    };
  }

  if (action === 'add_path') {
    return {
      action: 'add_path',
      location: rawOp.location || { at: 'selection' },
      parameters: {
        name: parameters.name || rawOp.name || 'New Path',
        pathClass: parameters.pathClass || 'walkway',
        pathType: parameters.pathType || 'standard',
        elevation: Number(parameters.elevation || 0),
        stepCount: Number(parameters.stepCount || 0),
        isAccessible: parameters.isAccessible ?? true,
        handrail: parameters.handrail ?? false,
      },
    };
  }

  if (action === 'scatter_trees') {
    return {
      action: 'scatter_trees',
      location: rawOp.location || { at: 'selection' },
      parameters: {
        count: Math.max(1, Number(parameters.count || 30)),
        radius: Math.max(10, Number(parameters.radius || 70)),
        onlyOnGrass: Boolean(parameters.onlyOnGrass),
      },
    };
  }

  if (action === 'set_building_height') {
    return {
      action: 'set_building_height',
      target: rawOp.target || { by: 'selected' },
      parameters: {
        height: Math.max(3, Number(parameters.height) || 15),
      },
    };
  }

  if (action === 'recolor_building') {
    return {
      action: 'recolor_building',
      target: rawOp.target || { by: 'selected' },
      parameters: {
        wallColor: parameters.wallColor ? normalizeColor(parameters.wallColor) : undefined,
        roofColor: parameters.roofColor ? normalizeColor(parameters.roofColor) : undefined,
      },
    };
  }

  if (action === 'set_surface_material') {
    return {
      action: 'set_surface_material',
      target: rawOp.target || { by: 'selected' },
      parameters: {
        material: parameters.material || 'plaza',
      },
    };
  }

  if (action === 'delete') {
    return {
      action: 'delete',
      target: rawOp.target || { by: 'selected' },
    };
  }

  return null;
}

/**
 * Universal Response Reader: Reads any raw text, JSON string, or object from LLM response and extracts operations
 */
export function readResponseToOperations(rawResponse, defaultCenter = [0, 0]) {
  if (rawResponse == null) return [];

  let data = rawResponse;

  // 1) Parse string if response is raw text/JSON
  if (typeof rawResponse === 'string') {
    const text = rawResponse.trim();

    // Extract JSON inside markdown codeblocks ```json ... ```
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const jsonText = codeBlockMatch ? codeBlockMatch[1] : text;

    try {
      data = JSON.parse(jsonText);
    } catch (err) {
      // Robust fuzzy repair for corrupted JSON strings (e.g. conversational text injected into json string)
      let cleaned = jsonText
        .replace(/\"parameters\":\s*\"[^\"]*\"/g, '"parameters": {}') // fix "parameters": "NO_PARAMETER"
        .replace(/\"parameters\":\s*\n\s*\"[^\"]*\",/g, '"parameters": {') // fix "parameters": \n "name",
        .replace(/\"parts\":\s*\[(\s*\"[^\"]*\"\s*,?\s*)*\]/g, '"parts": []') // fix string arrays in parts
        .replace(/,\s*([\]}])/g, '$1') // remove trailing commas
        .replace(/\"shape\",\s*\"size\"/g, '"shape":"box"');

      // Soft JSON extraction: Find first '[' or '{' and last ']' or '}'
      const startIdx = cleaned.search(/[\[\{]/);
      const endIdx = Math.max(cleaned.lastIndexOf(']'), cleaned.lastIndexOf('}'));

      if (startIdx !== -1 && endIdx > startIdx) {
        const candidateJson = cleaned.slice(startIdx, endIdx + 1);

        try {
          data = JSON.parse(candidateJson);
        } catch (e2) {
          console.warn('[ResponseReader] Soft JSON extraction failed:', e2);

          const massingMatch = text.match(/\"massing\"\s*:\s*\"([^\"]*)\"/);
          const nameMatch = text.match(/\"name\"\s*:\s*\"([^\"]*)\"/);

          data = {
            operations: [
              {
                action: 'compose_object',
                parameters: {
                  name: nameMatch ? nameMatch[1] : 'Extruded Slab Floor',
                  massing: massingMatch ? massingMatch[1] : 'Concrete floor slab platform',
                  parts: [
                    { shape: 'box', size: [16, 0.4, 12], position: [0, 0.2, 0], color: '#cbd5e1', material: 'matte' },
                  ],
                },
              },
            ],
          };
        }
      } else {
        // Fallback for non-bracketed raw text responses
        data = {
          operations: [
            {
              action: 'compose_object',
              parameters: {
                name: '3D Floor Slab',
                massing: 'Synthesized 3D floor slab platform',
                parts: [
                  { shape: 'box', size: [14, 0.35, 10], position: [0, 0.175, 0], color: '#cbd5e1', material: 'matte' },
                ],
              },
            },
          ],
        };
      }
    }
  }

  // 2) Extract list of operations
  let opList = [];
  if (Array.isArray(data)) {
    opList = data;
  } else if (data && typeof data === 'object') {
    if (Array.isArray(data.operations)) {
      opList = data.operations;
    } else if (Array.isArray(data.candidates)) {
      // Handle raw Gemini candidate structure directly if passed
      const candidateText = data.candidates[0]?.content?.parts?.[0]?.text;
      if (candidateText) {
        return readResponseToOperations(candidateText, defaultCenter);
      }
    } else {
      opList = [data];
    }
  }

  // 3) Normalize each operation
  const validOps = opList
    .map((op) => normalizeOperation(op, defaultCenter))
    .filter((op) => op !== null);

  return validOps;
}
