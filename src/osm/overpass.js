// @ts-check

/**
 * OVERPASS API CLIENT — Multi-endpoint failover and body-level error inspection.
 * Fetches OSM buildings, highways, surfaces, and terrain geometries with high availability.
 */

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

/**
 * Execute Overpass QL query with multi-endpoint failover and body error validation.
 * @param {string} query
 * @returns {Promise<Array<object>>}
 */
async function executeOverpassQuery(query) {
  let lastError = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: query,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} from ${endpoint}`);
      }

      const rawText = await res.text();

      // Check if response is HTML error page (Overpass sometimes returns HTTP 200 with HTML error body)
      if (rawText.trim().startsWith('<') || rawText.toLowerCase().includes('<html>')) {
        throw new Error(`Overpass returned HTML error body from ${endpoint}`);
      }

      const data = JSON.parse(rawText);

      // Check body-level Overpass remark errors
      if (data.remark && (data.remark.includes('error') || data.remark.includes('timed out'))) {
        throw new Error(`Overpass remark error: ${data.remark}`);
      }

      if (Array.isArray(data.elements)) {
        return data.elements;
      }
    } catch (err) {
      console.warn(`[Overpass Client] Endpoint failed (${endpoint}):`, err.message);
      lastError = err;
    }
  }

  throw new Error(`All Overpass API endpoints failed. ${lastError?.message || ''}`);
}

/** Fetch OSM buildings inside a box around the origin. */
export async function fetchBuildings(origin, radiusDeg = 0.004) {
  const s = origin.lat - radiusDeg * 0.75;
  const n = origin.lat + radiusDeg * 0.75;
  const w = origin.lng - radiusDeg;
  const e = origin.lng + radiusDeg;

  const query = `[out:json][timeout:25];
    (way["building"](${s},${w},${n},${e}););
    out geom;`;

  return executeOverpassQuery(query);
}

/** Fetch area buildings, highways, parking, parks, and water features around origin. */
export async function fetchArea(origin, radiusDeg = 0.008) {
  const s = origin.lat - radiusDeg * 0.75;
  const n = origin.lat + radiusDeg * 0.75;
  const w = origin.lng - radiusDeg;
  const e = origin.lng + radiusDeg;
  const bbox = `${s},${w},${n},${e}`;

  const query = `[out:json][timeout:30];
    (
      way["building"](${bbox});
      way["highway"](${bbox});
      way["amenity"="parking"](${bbox});
      way["leisure"~"park|garden|pitch"](${bbox});
      way["landuse"~"grass|forest|meadow|recreation_ground"](${bbox});
      way["natural"~"water|wood"](${bbox});
    );
    out geom;`;

  return executeOverpassQuery(query);
}