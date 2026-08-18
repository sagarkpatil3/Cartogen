// @ts-check

/**
 * SERIALIZE SCENE — Converts internal scene store nodes & spatial metadata into a pure, clean JSON structure.
 * Pure function: no Three.js imports, completely testable in any environment.
 * 
 * @param {Array<object>} nodes Array of scene nodes (buildings, surfaces, paths, composed, trees)
 * @param {{ lat: number, lng: number, name?: string }} origin Geographic origin coordinates
 * @param {{ projectName?: string, themeMode?: string, showGrid?: boolean }} [settings] Scene visual options
 * @returns {object} Clean serializable scene graph payload
 */
export function serializeScene(nodes = [], origin = { lat: 34.1819, lng: -117.3223 }, settings = {}) {
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    projectName: settings.projectName || 'Cartogen Site Plan',
    origin: {
      lat: origin.lat,
      lng: origin.lng,
      name: origin.name || '',
    },
    settings: {
      themeMode: settings.themeMode || 'day',
      showGrid: settings.showGrid ?? true,
    },
    nodes: nodes.map(serializeNode),
  };
}

/**
 * Clean & sanitize a single scene node for JSON export.
 * @param {object} node 
 * @returns {object}
 */
function serializeNode(node) {
  if (!node || typeof node !== 'object') return {};

  const base = {
    id: node.id,
    type: node.type,
    name: node.name || '',
  };

  switch (node.type) {
    case 'building':
      return {
        ...base,
        footprint: node.footprint || [],
        height: node.height ?? 10,
        kind: node.kind || 'default',
        wallColor: node.wallColor,
        roofColor: node.roofColor,
      };

    case 'surface':
      return {
        ...base,
        polygon: node.polygon || [],
        material: node.material || 'grass',
      };

    case 'path':
      return {
        ...base,
        polyline: node.polyline || [],
        pathClass: node.pathClass || 'street',
        widthOverride: node.widthOverride,
        elevation: node.elevation || 0,
        showCenterline: node.showCenterline,
        showRailings: node.showRailings,
        showLamps: node.showLamps,
        fillColor: node.fillColor,
        casingColor: node.casingColor,
      };

    case 'composed':
      return {
        ...base,
        position: node.position || [0, 0],
        rotation: node.rotation || 0,
        scale: node.scale || 1,
        massing: node.massing || '',
        parts: Array.isArray(node.parts)
          ? node.parts.map((p) => ({
              shape: p.shape || 'box',
              position: p.position || [0, 0, 0],
              size: p.size || [1, 1, 1],
              radius: p.radius,
              height: p.height,
              rotationY: p.rotationY || 0,
              color: p.color || '#cccccc',
              material: p.material || 'matte',
            }))
          : [],
      };

    case 'tree':
      return {
        ...base,
        position: node.position || [0, 0],
        height: node.height || 6,
        radius: node.radius || 2.5,
      };

    default:
      return { ...node };
  }
}
