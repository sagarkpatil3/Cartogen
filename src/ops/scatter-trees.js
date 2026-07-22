// @ts-check
import { theme } from '../render/theme.js';
import { pointInPolygon } from '../lib/geometry.js';

/**
 * SCATTER-TREES — place trees in an area, avoiding buildings (and optionally only
 * on grass). Takes the current nodes so it can check placement against real geometry.
 *
 * The AI will later call this with the SAME params parsed from a prompt:
 *   "add 30 trees near the library" -> { count:30, center:<library>, radius:60 }
 *
 * @param {{
 *   count?:number, center?:[number,number], radius?:number,
 *   nodes?:Array, onlyOnGrass?:boolean
 * }} params
 * @returns {Array} new tree nodes
 */
export function scatterTrees({
  count = 30, center = [0, 0], radius = 80, nodes = [], onlyOnGrass = false,
} = {}) {
  const [cx, cz] = center;

  // pull out the polygons we care about, ONCE (not per-tree)
  const buildings = nodes.filter((n) => n.type === 'building').map((n) => n._local || n.footprint);
  const grass = nodes
    .filter((n) => n.type === 'surface' && (n.material === 'grass' || n.material === 'lawn'))
    .map((n) => n._local || n.polygon);

  const isBlocked = (p) => buildings.some((poly) => poly && pointInPolygon(p, poly));
  const isOnGrass = (p) => grass.some((poly) => poly && pointInPolygon(p, poly));

  const trees = [];
  let attempts = 0;
  const maxAttempts = count * 15; // give up eventually so we never loop forever

  while (trees.length < count && attempts < maxAttempts) {
    attempts++;
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * radius;
    const p = /** @type {[number,number]} */ ([cx + Math.cos(angle) * r, cz + Math.sin(angle) * r]);

    if (isBlocked(p)) continue;                 // never on a building
    if (onlyOnGrass && !isOnGrass(p)) continue; // if requested, ONLY on grass

    trees.push({
      id: `tree-${Date.now()}-${trees.length}`,
      type: 'tree',
      position: p,
      scale: 0.8 + Math.random() * 0.6,
      color: theme.tree.foliage[Math.floor(Math.random() * theme.tree.foliage.length)],
    });
  }

  return trees;
}