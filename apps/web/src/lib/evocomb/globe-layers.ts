// Layer metadata and colour ramps for the landing-page hex globe. Kept apart from
// the cell generator (and its land mask) so the section can render its chips and
// legend without pulling the globe data into the initial bundle.

import { SIGNALS } from './signals';

// 'esi' or one of the SIGNALS keys.
export type GlobeLayer = string;

export interface GlobeLayerMeta {
  key: GlobeLayer;
  label: string;
  color: string;
}

// Same five stops as the section's original ESI ramp (calm → high burden).
export const ESI_STOPS = ['#27ae60', '#7aa83a', '#e6b41e', '#e67e22', '#c0392b'];

// Each signal fades up from this near-black, so low scores sit quietly on the globe.
export const RAMP_BASE = '#1a1d23';

export const GLOBE_LAYERS: GlobeLayerMeta[] = [
  { key: 'esi', label: 'ESI', color: '#e6b41e' },
  ...SIGNALS.map((s) => ({ key: s.key, label: s.label, color: s.color })),
];

/** CSS gradient for the legend bar of a layer. */
export function layerGradient(layer: GlobeLayer): string {
  if (layer === 'esi') return `linear-gradient(90deg, ${ESI_STOPS.join(', ')})`;
  const color = GLOBE_LAYERS.find((l) => l.key === layer)?.color ?? '#888888';
  return `linear-gradient(90deg, ${RAMP_BASE}, ${color})`;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1, 7), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function mix(a: [number, number, number], b: [number, number, number], t: number) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t] as [
    number,
    number,
    number,
  ];
}

const ESI_RGB = ESI_STOPS.map(hexToRgb);
const BASE_RGB = hexToRgb(RAMP_BASE);

/** sRGB 0–1 triple for a 0–100 score on the given layer's ramp. */
export function layerColor(layer: GlobeLayer, score: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, score / 100));
  if (layer === 'esi') {
    const x = t * (ESI_RGB.length - 1);
    const i = Math.min(ESI_RGB.length - 2, Math.floor(x));
    return mix(ESI_RGB[i]!, ESI_RGB[i + 1]!, x - i);
  }
  const color = GLOBE_LAYERS.find((l) => l.key === layer)?.color ?? '#888888';
  // Slightly steeper than linear so high scores stand out from the middle.
  return mix(BASE_RGB, hexToRgb(color), Math.pow(t, 1.15));
}
