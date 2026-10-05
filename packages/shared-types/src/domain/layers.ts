// Stable identifiers for map layers. Used by the frontend layer registry/store and
// (later) by server-driven layer configuration. Kept here so both sides agree.

export const MAP_LAYER_IDS = {
  base: 'base',
  heatmap: 'stress-heatmap',
  hexagon: 'stress-hexagon',
  hotspots: 'stress-hotspots',
} as const;

export type MapLayerId = (typeof MAP_LAYER_IDS)[keyof typeof MAP_LAYER_IDS];

// The mutually exclusive data views rendered by the H3 layer, each a 0–100 score, so
// switching views never duplicates geometry. These are the map's DISPLAY signals
// (humidity / wind / solar / temperature). They intentionally differ from the API's
// metric keys in ./stress.ts (noise / density / heat / aqi) until the backend moves to
// the new signals; the web app adapts API cells onto these keys.
export const STRESS_LAYER_KEYS = {
  esi: 'esi',
  humidity: 'humidity',
  wind: 'wind',
  solar: 'solar',
  temperature: 'temperature',
} as const;

export type StressLayerKey = (typeof STRESS_LAYER_KEYS)[keyof typeof STRESS_LAYER_KEYS];

export const STRESS_LAYER_LABELS: Record<StressLayerKey, string> = {
  esi: 'Combined ESI',
  humidity: 'Relative humidity',
  wind: 'Wind speed',
  solar: 'Solar radiation',
  temperature: 'Temperature',
};

// Mirrors the signal colours in apps/web/src/lib/evocomb/signals.ts.
export const STRESS_LAYER_COLORS: Record<
  Exclude<StressLayerKey, 'esi'>,
  readonly [number, number, number]
> = {
  humidity: [26, 188, 156],
  wind: [93, 173, 226],
  solar: [241, 196, 15],
  temperature: [231, 76, 60],
};
