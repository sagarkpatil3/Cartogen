// @ts-check
import { makeProjector } from '../lib/projection.js';

/**
 * PARSE-OSM — turn raw Overpass elements into typed scene nodes.
 *
 * This is the partner of theme.js. The theme can only style categories that the
 * parser actually produces, so this classifies each OSM element into:
 *   - building + a `kind` (civic / residential / commercial / landmark)
 *   - path + a `class`   (major / street / walkway)
 *   - surface + a `material` (grass / forest / water / sand / plaza / parking / pitch)
 *
 * Every node keeps its WGS84 geometry (the SOURCE OF TRUTH) and a derived
 * `_local` [x,z] cache for rendering.
 */

// ── classifiers: raw OSM tags -> our clean categories ──────────────

/** Map an OSM building tag to one of our theme "kinds". */
function buildingKind(tags) {
  const b = (tags.building || '').toLowerCase();
  const amenity = (tags.amenity || '').toLowerCase();
  if (['university', 'school', 'college', 'hospital', 'government', 'civic', 'public'].includes(b) ||
      ['university', 'school', 'hospital', 'townhall', 'library'].includes(amenity)) return 'civic';
  if (['stadium', 'museum', 'cathedral', 'church', 'temple', 'monument'].includes(b) ||
      tags.tourism === 'museum' || tags.historic) return 'landmark';
  if (['house', 'residential', 'dormitory', 'apartments', 'detached', 'terrace'].includes(b)) return 'residential';
  if (['commercial', 'retail', 'office', 'shop', 'supermarket'].includes(b) || tags.shop || tags.office) return 'commercial';
  return 'default';
}

/** Estimate a building height (meters) from tags, with sane fallbacks by kind. */
function buildingHeight(tags, kind) {
  if (tags.height) return parseFloat(tags.height) || 8;
  const levels = parseFloat(tags['building:levels']);
  if (levels) return levels * 3.4;
  if (kind === 'landmark') return 16 + Math.random() * 6;
  if (kind === 'civic') return 14 + Math.random() * 6;
  if (kind === 'residential') return 7 + Math.random() * 2;
  return 9 + Math.random() * 3;
}

/** Map an OSM highway tag to a path class. */
function pathClass(highway) {
  const h = highway.toLowerCase();
  if (['motorway', 'trunk', 'primary', 'secondary'].includes(h)) return 'major';
  if (['footway', 'path', 'pedestrian', 'steps', 'cycleway', 'track'].includes(h)) return 'walkway';
  return 'street'; // tertiary, residential, service, unclassified, etc.
}

/** Map leisure/landuse/natural tags to a surface material. Returns null if not a surface. */
function surfaceMaterial(tags) {
  if (tags.amenity === 'parking' || tags.parking) return 'parking';
  if (tags.leisure === 'pitch' || tags.sport) return 'pitch';
  if (tags.natural === 'water' || tags.water || tags.landuse === 'reservoir') return 'water';
  if (tags.natural === 'sand' || tags.natural === 'beach') return 'sand';
  if (tags.landuse === 'forest' || tags.natural === 'wood') return 'forest';
  if (tags.landuse === 'grass' || tags.leisure === 'park' || tags.leisure === 'garden' ||
      tags.landuse === 'meadow' || tags.leisure === 'common' || tags.landuse === 'recreation_ground') return 'grass';
  if (['pedestrian', 'square'].includes(tags.highway) || tags.place === 'square') return 'plaza';
  if (tags.landuse === 'bare_rock' || tags.natural === 'bare_rock') return 'bare';
  return null;
}

// ── helpers ────────────────────────────────────────────────────────

/** Ensure a polygon ring is closed (first point == last point). */
function closeRing(ring) {
  const a = ring[0], b = ring[ring.length - 1];
  if (a[0] !== b[0] || a[1] !== b[1]) return [...ring, a];
  return ring;
}

// ── main ────────────────────────────────────────────────────────────

/**
 * @param {Array} elements   raw Overpass `elements` (ways with inline geometry)
 * @param {{lng:number, lat:number}} origin
 * @returns {Array} scene nodes
 */
export function parseArea(elements, origin) {
  const proj = makeProjector(origin);
  const nodes = [];

  for (const el of elements) {
    if (el.type !== 'way' || !el.geometry || el.geometry.length < 2) continue;

    const tags = el.tags || {};
    const geo = el.geometry.map((p) => [p.lon, p.lat]);           // WGS84 (truth)
    const local = geo.map((p) => proj.toLocal(p)).filter(pt => Number.isFinite(pt[0]) && Number.isFinite(pt[1]));
    if (local.length < 2) continue;   // skip degenerate elements               // meters (derived)

    // 1) BUILDING
    if (tags.building) {
      const kind = buildingKind(tags);
      const rawEle = parseFloat(tags.ele || tags['gnis:ele']);
      const elevation = Number.isFinite(rawEle) ? Math.max(0, Math.round(rawEle - 454)) : 0;
      const height = Math.round(buildingHeight(tags, kind));

      nodes.push({
        id: `building-${el.id}`, type: 'building', name: tags.name,
        kind,
        elevation,
        footprintGeo: closeRing(geo),
        footprint: closeRing(local),
        height,
      });
      continue;
    }

    // 2) SURFACE (check before highway so pedestrian squares become plazas)
    const material = surfaceMaterial(tags);
    if (material && el.geometry.length >= 3) {
      nodes.push({
        id: `surface-${el.id}`, type: 'surface', name: tags.name,
        material,
        polygonGeo: closeRing(geo),
        polygon: closeRing(local),
      });
      continue;
    }

    // 3) PATH / ROAD / STAIRS
    if (tags.highway) {
      const isSteps = tags.highway === 'steps';
      const isRamp = tags.ramp === 'yes' || tags.wheelchair === 'yes';
      const pathTypeVal = isSteps ? 'stairs' : isRamp ? 'accessible_ramp' : 'standard';

      // Calculate horizontal run length
      let runMeters = 0;
      for (let i = 0; i < local.length - 1; i++) {
        runMeters += Math.hypot(local[i + 1][0] - local[i][0], local[i + 1][1] - local[i][1]);
      }

      let stepCountVal = parseInt(tags.step_count, 10);
      if (!stepCountVal && isSteps) {
        stepCountVal = runMeters <= 15 ? Math.max(4, Math.round(runMeters / 0.30)) : Math.max(8, Math.round(runMeters / 0.80));
      } else if (!stepCountVal) {
        stepCountVal = 0;
      }

      const isAccessibleVal = !isSteps && tags.wheelchair !== 'no';

      nodes.push({
        id: `path-${el.id}`, type: 'path', name: tags.name,
        pathClass: pathClass(tags.highway),
        pathType: pathTypeVal,
        isAccessible: isAccessibleVal,
        stepCount: stepCountVal,
        handrail: tags.handrail === 'yes' || isSteps,
        incline: tags.incline || (isSteps ? 'steep' : 'flat'),
        polylineGeo: geo,
        polyline: local,
      });
      continue;
    }
  }

  return nodes;
}