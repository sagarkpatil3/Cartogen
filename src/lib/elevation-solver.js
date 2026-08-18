// @ts-check

/**
 * ELEVATION PLATEAU FLOOD-FILL SOLVER
 * Propagates top-of-stair elevations across connected path networks, creating level campus elevation plateaus.
 * Paths connected to stair tops lift to Y_plateau and meet building facades seamlessly.
 */

/**
 * Solve elevation plateaus for scene nodes.
 * @param {Array<object>} nodes
 * @returns {Array<object>} updated nodes with solved elevations
 */
export function solveElevationPlateaus(nodes) {
  if (!nodes || !Array.isArray(nodes)) return nodes;

  const pathNodes = nodes.filter((n) => n.type === 'path' && n.polyline && n.polyline.length >= 2);
  if (pathNodes.length === 0) return nodes;

  // 1) Spatial Vertex Map & Adjacency Graph Construction
  const tolerance = 2.5; // 2.5m vertex merge distance
  const vertices = []; // { id, x, z, y }

  function getOrCreateVertex(x, z, defaultY = 0) {
    for (const v of vertices) {
      if (Math.hypot(v.x - x, v.z - z) <= tolerance) {
        return v;
      }
    }
    const newV = { id: `v-${vertices.length}`, x, z, y: defaultY };
    vertices.push(newV);
    return newV;
  }

  // Register all path vertices into spatial graph
  const nodeVertexMap = new Map(); // nodeId -> array of vertex objects

  pathNodes.forEach((node) => {
    const defaultY = node.elevation || 0;
    const vList = node.polyline.map(([x, z]) => getOrCreateVertex(x, z, defaultY));
    nodeVertexMap.set(node.id, vList);
  });

  // Build Adjacency Graph: vertexId -> array of { neighborId, node, isTransition, deltaY }
  const adj = new Map();
  vertices.forEach((v) => adj.set(v.id, []));

  pathNodes.forEach((node) => {
    const vList = nodeVertexMap.get(node.id);
    if (!vList || vList.length < 2) return;

    const isStairs = node.pathType === 'stairs';
    const isRamp = node.pathType === 'accessible_ramp';
    const isTransition = isStairs || isRamp;

    let deltaY = 0;
    if (isStairs) {
      const stepCount = node.stepCount || 8;
      deltaY = stepCount * 0.18; // 18cm riser height
    } else if (isRamp) {
      const p1 = vList[0], p2 = vList[vList.length - 1];
      const run = Math.hypot(p2.x - p1.x, p2.z - p1.z);
      deltaY = Math.min(2.5, run * 0.08); // 8% ADA ramp slope
    }

    for (let i = 0; i < vList.length - 1; i++) {
      const u = vList[i], v = vList[i + 1];
      const segmentDelta = isTransition ? deltaY / (vList.length - 1) : 0;

      adj.get(u.id).push({ to: v.id, node, isTransition, deltaY: segmentDelta, direction: 1 });
      adj.get(v.id).push({ to: u.id, node, isTransition, deltaY: -segmentDelta, direction: -1 });
    }
  });

  // 2) BFS Flood-Fill from Top-of-Stair Transitions
  const transitionNodes = pathNodes.filter((n) => n.pathType === 'stairs' || n.pathType === 'accessible_ramp');

  transitionNodes.forEach((node) => {
    const vList = nodeVertexMap.get(node.id);
    if (!vList || vList.length < 2) return;

    // Top vertex is at the end of the transition polyline (or higher Y)
    const topV = vList[vList.length - 1];
    const stepCount = node.stepCount || 8;
    const riseHeight = node.pathType === 'stairs' ? stepCount * 0.18 : 1.5;

    const plateauY = (node.elevation || 0) + riseHeight;
    topV.y = Math.max(topV.y, plateauY);

    // BFS Flood-fill across non-transition path network
    const queue = [topV.id];
    const visited = new Set([topV.id]);

    while (queue.length > 0) {
      const currId = queue.shift();
      const currV = vertices.find((v) => v.id === currId);
      if (!currV) continue;

      const neighbors = adj.get(currId) || [];
      for (const edge of neighbors) {
        if (visited.has(edge.to)) continue;

        // Stop flood-fill at other stair or ramp boundaries
        if (edge.isTransition) continue;

        visited.add(edge.to);
        const targetV = vertices.find((v) => v.id === edge.to);
        if (targetV) {
          targetV.y = currV.y; // Assign plateau elevation
          queue.push(edge.to);
        }
      }
    }
  });

  // 3) Update Path Nodes with Solved Plateau Elevations
  const updatedNodes = nodes.map((node) => {
    if (node.type !== 'path') return node;

    const vList = nodeVertexMap.get(node.id);
    if (!vList || vList.length === 0) return node;

    // Calculate average plateau Y for this path segment
    const avgY = vList.reduce((sum, v) => sum + v.y, 0) / vList.length;

    if (avgY > 0.05) {
      return {
        ...node,
        elevation: Math.round(avgY * 100) / 100,
      };
    }

    return node;
  });

  return updatedNodes;
}
