import { makeProjector } from '../lib/projection.js';

export function parseArea(elements, origin) {
  const proj = makeProjector(origin);
  const nodes = [];

  for (const el of elements) {
    if (!el.geometry || el.geometry.length < 2) continue;

    const tags = el.tags || {};
    const geo = el.geometry.map((p) => [p.lon, p.lat]);      // WGS84 (truth)
    const local = geo.map((p) => proj.toLocal(p));            // meters (derived)

    // ── BUILDING → extruded ──
    if (tags.building) {
      const levels = parseFloat(tags['building:levels']);
      const height = parseFloat(tags.height) || (levels ? levels * 3.4 : 8);
      nodes.push({
        id: `building-${el.id}`, type: 'building',
        name: tags.name, footprintGeo: geo, footprint: local, height,
      });
    }

    // ── ROAD / PATH → ribbon ──
    else if (tags.highway) {
      const walk = ['footway', 'path', 'pedestrian', 'steps', 'cycleway'];
      const isWalk = walk.includes(tags.highway);
      nodes.push({
        id: `path-${el.id}`, type: 'path',
        name: tags.name, polylineGeo: geo, polyline: local,
        width: isWalk ? 2.5 : 6,
        material: isWalk ? 'walkway' : 'road',
      });
    }

    // ── PARK / WATER → flat surface ──
    else {
      const isWater = tags.natural === 'water';
      nodes.push({
        id: `surface-${el.id}`, type: 'surface',
        name: tags.name, polygonGeo: geo, polygon: local,
        material: isWater ? 'water' : 'grass',
      });
    }
  }

  return nodes;
}