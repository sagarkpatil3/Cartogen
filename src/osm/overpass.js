/** Fetch OSM buildings inside a box around the origin. */
export async function fetchBuildings(origin, radiusDeg = 0.004) {
  const s = origin.lat - radiusDeg * 0.75;
  const n = origin.lat + radiusDeg * 0.75;
  const w = origin.lng - radiusDeg;
  const e = origin.lng + radiusDeg;

  const query = `[out:json][timeout:25];
    (way["building"](${s},${w},${n},${e}););
    out geom;`;

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query,
  });
  if (!res.ok) throw new Error(`Overpass error ${res.status}`);
  const data = await res.json();
  return data.elements || [];
}

export async function fetchArea(origin, radiusDeg = 0.008) {   // ← wider (was 0.004)
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

  const res = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: query });
  if (!res.ok) throw new Error(`Overpass error ${res.status}`);
  const data = await res.json();
  return data.elements || [];
}