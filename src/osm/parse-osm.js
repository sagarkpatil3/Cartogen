import { makeProjector } from '../lib/projection.js';

export function parseBuildings(elements, origin) {
  const proj = makeProjector(origin);

  return elements
    .filter((el) => el.geometry && el.geometry.length >= 3)
    .map((el) => {
      const tags = el.tags || {};

      // WGS84 — the source of truth
      const footprintGeo = el.geometry.map((p) => [p.lon, p.lat]);

      // meters — derived, cached once for rendering
      const footprint = footprintGeo.map((p) => proj.toLocal(p));

      // height: real tag, else levels * 3.4m, else a default
      const levels = parseFloat(tags['building:levels']);
      const height = parseFloat(tags.height) || (levels ? levels * 3.4 : 8);

      return {
        id: `building-${el.id}`,
        type: 'building',
        name: tags.name,
        footprintGeo,   // truth
        footprint,      // derived cache (what Building.jsx draws)
        height,
      };
    });
}