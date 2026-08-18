// @ts-check

/**
 * CAMPUS WAYFINDING & ADA ROUTING ENGINE
 * Constructs a spatial graph from path polylines and building/wayfinding nodes,
 * performing A* pathfinding for Standard and ADA Accessible (wheelchair-friendly) routes.
 */

/**
 * @typedef {{ id: string, x: number, z: number }} GraphVertex
 * @typedef {{ from: string, to: string, distance: number, pathType: string, isAccessible: boolean, stepCount: number, incline: string, nodeRefId: string }} GraphEdge
 */

/**
 * Build spatial graph from scene nodes.
 * @param {Array<object>} nodes
 */
export function buildWayfindingGraph(nodes) {
  /** @type {Map<string, GraphVertex>} */
  const vertices = new Map();
  /** @type {Array<GraphEdge>} */
  const edges = [];

  const toleranceMeters = 3.5; // Snap nearby endpoints together

  function getOrCreateVertexId(x, z) {
    for (const [id, v] of vertices.entries()) {
      if (Math.hypot(v.x - x, v.z - z) <= toleranceMeters) {
        return id;
      }
    }
    const id = `v_${Math.round(x * 10)}_${Math.round(z * 10)}_${vertices.size}`;
    vertices.set(id, { id, x, z });
    return id;
  }

  // 1. Process Path Polylines into Edges
  (nodes || []).forEach((node) => {
    if (node.type === 'path' && node.polyline && node.polyline.length >= 2) {
      const isSteps = node.pathType === 'stairs';
      const isAccessible = node.isAccessible !== false && !isSteps;
      const pathType = node.pathType || (isSteps ? 'stairs' : 'standard');
      const stepCount = node.stepCount || (isSteps ? 6 : 0);
      const incline = node.incline || (isSteps ? 'steep' : 'flat');

      for (let i = 0; i < node.polyline.length - 1; i++) {
        const [x1, z1] = node.polyline[i];
        const [x2, z2] = node.polyline[i + 1];

        const v1Id = getOrCreateVertexId(x1, z1);
        const v2Id = getOrCreateVertexId(x2, z2);
        const dist = Math.hypot(x2 - x1, z2 - z1);

        // Slope gradient percentage = (heightRise / dist) * 100
        const heightRise = isSteps ? (stepCount * 0.18) : (incline === 'steep' ? 2.5 : 0);
        const gradientPercent = dist > 0 ? Math.round((heightRise / dist) * 100) : 0;
        const isAdaCompliant = isAccessible && pathType !== 'stairs' && gradientPercent <= 8.33;

        if (dist > 0.01 && v1Id !== v2Id) {
          edges.push({
            from: v1Id,
            to: v2Id,
            distance: dist,
            pathType,
            isAccessible: isAdaCompliant,
            gradientPercent,
            stepCount,
            incline,
            nodeRefId: node.id,
          });
          edges.push({
            from: v2Id,
            to: v1Id,
            distance: dist,
            pathType,
            isAccessible: isAdaCompliant,
            gradientPercent,
            stepCount,
            incline,
            nodeRefId: node.id,
          });
        }
      }
    }
  });

  return { vertices, edges };
}

/**
 * Find closest vertex in graph to given [x, z] coordinate
 * @param {Map<string, GraphVertex>} vertices
 * @param {number} targetX
 * @param {number} targetZ
 */
function findClosestVertex(vertices, targetX, targetZ) {
  let closestId = null;
  let minDistance = Infinity;

  for (const [id, v] of vertices.entries()) {
    const dist = Math.hypot(v.x - targetX, v.z - targetZ);
    if (dist < minDistance) {
      minDistance = dist;
      closestId = id;
    }
  }

  return closestId;
}

/**
 * Find route between two nodes or coordinates
 * @param {Array<object>} nodes
 * @param {[number, number] | string} startTarget [x, z] or nodeId
 * @param {[number, number] | string} endTarget [x, z] or nodeId
 * @param {{ profile?: 'accessible' | 'standard' }} [options]
 */
export function findWayfindingRoute(nodes, startTarget, endTarget, options = {}) {
  const profile = options.profile || 'accessible';
  const { vertices, edges } = buildWayfindingGraph(nodes);

  if (vertices.size === 0) {
    return { success: false, reason: 'No navigable path graph available in scene.' };
  }

  // Resolve start/end coordinates
  let startX = 0, startZ = 0, endX = 0, endZ = 0;

  if (Array.isArray(startTarget)) {
    [startX, startZ] = startTarget;
  } else {
    const sNode = nodes.find((n) => n.id === startTarget);
    if (sNode) {
      const pos = sNode.position || (sNode.footprint ? sNode.footprint[0] : [0, 0]);
      [startX, startZ] = [pos[0], pos[1]];
    }
  }

  if (Array.isArray(endTarget)) {
    [endX, endZ] = endTarget;
  } else {
    const eNode = nodes.find((n) => n.id === endTarget);
    if (eNode) {
      const pos = eNode.position || (eNode.footprint ? eNode.footprint[0] : [0, 0]);
      [endX, endZ] = [pos[0], pos[1]];
    }
  }

  const startVId = findClosestVertex(vertices, startX, startZ);
  const endVId = findClosestVertex(vertices, endX, endZ);

  if (!startVId || !endVId) {
    return { success: false, reason: 'Could not connect start/destination to path network.' };
  }

  // Adjacency map
  /** @type {Map<string, Array<GraphEdge>>} */
  const adj = new Map();
  for (const edge of edges) {
    if (!adj.has(edge.from)) adj.set(edge.from, []);
    adj.get(edge.from).push(edge);
  }

  // A* Search
  const openSet = new Set([startVId]);
  const cameFrom = new Map();
  const gScore = new Map();
  const fScore = new Map();

  vertices.forEach((_, id) => {
    gScore.set(id, Infinity);
    fScore.set(id, Infinity);
  });

  gScore.set(startVId, 0);
  const endV = vertices.get(endVId);
  const heuristic = (id) => {
    const v = vertices.get(id);
    return v && endV ? Math.hypot(endV.x - v.x, endV.z - v.z) : 0;
  };
  fScore.set(startVId, heuristic(startVId));

  let stairsAvoidedCount = 0;

  while (openSet.size > 0) {
    // Find node with lowest fScore
    let currentId = null;
    let lowestF = Infinity;
    for (const id of openSet) {
      const f = fScore.get(id) ?? Infinity;
      if (f < lowestF) {
        lowestF = f;
        currentId = id;
      }
    }

    if (!currentId) break;
    if (currentId === endVId) {
      // Reconstruct path
      const pathIds = [currentId];
      let curr = currentId;
      while (cameFrom.has(curr)) {
        curr = cameFrom.get(curr);
        pathIds.unshift(curr);
      }

      const pathPoints = pathIds.map((id) => {
        const v = vertices.get(id);
        return [v.x, v.z];
      });

      let totalDist = 0;
      let totalSteps = 0;
      let accessibleRoute = true;

      for (let i = 0; i < pathIds.length - 1; i++) {
        const fromId = pathIds[i], toId = pathIds[i + 1];
        const edgeList = adj.get(fromId) || [];
        const edge = edgeList.find((e) => e.to === toId);
        if (edge) {
          totalDist += edge.distance;
          totalSteps += edge.stepCount || 0;
          if (!edge.isAccessible) accessibleRoute = false;
        }
      }

      const travelSpeedMps = profile === 'accessible' ? 1.1 : 1.35; // meters per second
      const estimatedMinutes = Math.max(1, Math.round((totalDist / travelSpeedMps) / 60));

      return {
        success: true,
        profile,
        pathPoints,
        totalDistanceMeters: Math.round(totalDist),
        totalDistanceFeet: Math.round(totalDist * 3.28084),
        estimatedMinutes,
        stepCount: totalSteps,
        isAccessible: accessibleRoute,
        stairsAvoidedCount,
      };
    }

    openSet.delete(currentId);
    const neighbors = adj.get(currentId) || [];

    for (const edge of neighbors) {
      // ADA Wheelchair Profile Enforcement:
      if (profile === 'accessible' && (!edge.isAccessible || edge.pathType === 'stairs')) {
        stairsAvoidedCount++;
        continue; // Skip inaccessible edges/stairs!
      }

      const tentativeG = (gScore.get(currentId) ?? Infinity) + edge.distance;

      if (tentativeG < (gScore.get(edge.to) ?? Infinity)) {
        cameFrom.set(edge.to, currentId);
        gScore.set(edge.to, tentativeG);
        fScore.set(edge.to, tentativeG + heuristic(edge.to));
        openSet.add(edge.to);
      }
    }
  }

  return {
    success: false,
    reason: profile === 'accessible'
      ? 'No fully accessible ADA route available between these locations. Standard route may require stairs.'
      : 'No connected path route found between these locations.',
  };
}
