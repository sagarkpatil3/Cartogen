const M_PER_DEG_LAT = 111320;

/**
 * Build a converter anchored at an origin. The origin becomes (0,0) in 3D.
 */
export function makeProjector(origin) {
  // computed ONCE, using the origin's latitude
  const mPerDegLng = M_PER_DEG_LAT * Math.cos((origin.lat * Math.PI) / 180);

  return {
    /** [lng, lat] -> [x, z] in meters */
    toLocal([lng, lat]) {
      return [
        (lng - origin.lng) * mPerDegLng,
        -(lat - origin.lat) * M_PER_DEG_LAT,   // negate: north = -z in Three.js
      ];
    },
    /** [x, z] -> [lng, lat] */
    toGeo([x, z]) {
      return [origin.lng + x / mPerDegLng, origin.lat - z / M_PER_DEG_LAT];
    },
  };
}