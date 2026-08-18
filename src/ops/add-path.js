// @ts-check

/**
 * ADD PATH OPERATION EXECUTOR
 * Creates a path, road, staircase, or ADA ramp node in the scene graph.
 *
 * @param {object} parameters
 * @param {[number, number]} center
 * @returns {Array<object>} new path node array
 */
export function executeAddPath(parameters = {}, center = [0, 0]) {
  const [cx, cz] = center;
  const name = parameters.name || 'New Path';
  const pathClass = parameters.pathClass || 'walkway';
  const pathType = parameters.pathType || 'standard';
  const elevation = Number(parameters.elevation) || 0;
  const stepCount = Number(parameters.stepCount) || (pathType === 'stairs' ? 6 : 0);
  const isAccessible = parameters.isAccessible !== false && pathType !== 'stairs';
  const handrail = parameters.handrail === true || pathType === 'stairs';

  const polyline = [
    [cx - 20, cz],
    [cx + 20, cz],
  ];

  const node = {
    id: `path-${Date.now()}`,
    type: 'path',
    name,
    pathClass,
    pathType,
    elevation,
    stepCount,
    isAccessible,
    handrail,
    polyline,
  };

  return [node];
}
