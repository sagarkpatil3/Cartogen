// @ts-check
/**
 * THEME — single source of truth for the map's look. Clean & light, Concept3D style.
 * Tuned for CONTRAST: roads are dark asphalt (like the parking lots that read so
 * well), walkways are bright cream with a strong border, and paths sit well above
 * the grass so nothing buries them.
 */

export const theme = {
  background: '#eef1ef',
  fog: { color: '#eef1ef', near: 700, far: 6500 },

  ground: '#9aa877',

  lighting: {
    sky: '#ffffff',
    groundFill: '#8a9470',
    ambient: 0.5,
    sun: '#fff4e2',
    sunIntensity: 1.35,
    sunPosition: [200, 280, 140],
  },

  building: {
    default: { color: '#d9d6cf', roof: '#c2beb4' },
    civic: { color: '#d3d7dc', roof: '#b9bcc2' },
    commercial: { color: '#d0d4cf', roof: '#b6bab4' },
    residential: { color: '#cf9f83', roof: '#a9573f' },
    landmark: { color: '#e0d3bd', roof: '#cbb592' },
    selected: '#f0913f',
    glass: '#38bdf8',
    glassFrame: '#334155',
    entrance: '#0284c7',
    canopy: '#1e293b',
    parapet: '#a1a1aa',
    ledge: '#71717a',
  },


  surface: {
    water:      { color: '#7fb4dd', y: 0.02 },
    light_soil: { color: '#d9cbb7', y: 0.05 },
    soil:       { color: '#d9cbb7', y: 0.05 },
    mud:        { color: '#a3917b', y: 0.05 },
    sand:       { color: '#e4d6ad', y: 0.07 },
    bare:       { color: '#c7b78f', y: 0.09 },
    dry_grass:  { color: '#b5c48b', y: 0.11 },
    lawn:       { color: '#93c46f', y: 0.14 },
    grass:      { color: '#93c46f', y: 0.14 },
    forest:     { color: '#5f8f4e', y: 0.16 },
    parking:    { color: '#525866', y: 0.20 },
    pitch:      { color: '#6fae5a', y: 0.22 },
    plaza:      { color: '#e6ddcb', y: 0.25 },
  },

  path: {
    major: { color: '#3f3f46', casing: '#26262b', border: 3.5, y: 0.40, width: 13 },
    street: { color: '#55555c', casing: '#333338', border: 2.6, y: 0.39, width: 8 },
    walkway: { color: '#f6f0e2', casing: '#a98f5f', border: 2.2, y: 0.42, width: 4.2 },
    selected: '#f0913f',
    selectedGlow: '#00f0ff',
    pillar: '#52525b',
    handle: '#00f0ff',
    centerline: '#facc15',
    centerlineSecondary: '#ffffff',
    guardrail: '#94a3b8',
    guardrailPost: '#475569',
  },


  tree: {
    trunk: '#7d5a3c',
    foliage: ['#5f9142', '#6fa04d', '#548539'],
  },
};

export const buildingStyle = (kind) => theme.building[kind] || theme.building.default;
export const surfaceStyle = (m) => theme.surface[m] || theme.surface.lawn;
export const pathStyle = (c) => theme.path[c] || theme.path.walkway;