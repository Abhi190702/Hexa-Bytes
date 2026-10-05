// The four ESI signals, with the copy the "What it measures" section needs.
// Weights/colors come from the published heuristics; precision/limitation from
// the honest data-source descriptions. One place, so the section and the
// formula never drift apart.

import { HEURISTICS } from '@/lib/heuristics';
import { DATA_SOURCES } from '@/lib/landing/content';

export interface Factor {
  key: string;
  label: string;
  weight: number;
  color: string;
  unit: string;
  measures: string; // plain "what"
  source: string; // "how / where from"
  precision: string;
  limitation: string;
  scene: 'noise' | 'crowd' | 'heat' | 'pollution'; // which uniform it maps to
}

const src = (name: string) => {
  const found = DATA_SOURCES.find((d) => d.name === name);
  if (!found) throw new Error(`Unknown data source: ${name}`);
  return found;
};

const heuristic = (key: string) => {
  const found = HEURISTICS.find((h) => h.key === key);
  if (!found) throw new Error(`Unknown heuristic: ${key}`);
  return found;
};

// (key, scene-uniform, source-name, unit, plain "what") — weight/color come
// from the published heuristic, precision/limitation from the data source.
const SPEC: [string, Factor['scene'], string, string, string][] = [
  ['noise', 'noise', 'Noise', 'dB', 'How loud a place is — traffic and busy corridors drive it up.'],
  ['density', 'crowd', 'Crowd density', 'places', 'How packed an area gets with people and activity.'],
  ['heat', 'heat', 'Heat', '°C', 'How hot it runs — concrete traps heat, greenery cools it.'],
  ['aqi', 'pollution', 'Air quality (AQI)', 'AQI', 'How clean or polluted the air is to breathe.'],
];

export const FACTORS: Factor[] = SPEC.map(([key, scene, sourceName, unit, measures]) => {
  const h = heuristic(key);
  const s = src(sourceName);
  return {
    key,
    label: h.label,
    weight: h.weight,
    color: h.color,
    unit,
    measures,
    source: s.source,
    precision: s.precision,
    limitation: s.limitation,
    scene,
  };
});
