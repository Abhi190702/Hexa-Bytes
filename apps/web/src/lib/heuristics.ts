import { Thermometer, Trees, Users, Volume2, Wind, type LucideIcon } from 'lucide-react';
import type { StressMetricKey } from '@platform/shared-types';

// Plain-language descriptions of each input — shared by the explainer and the details panel.
// No jargon: this is what we tell a non-technical user about how the score is built.

export interface Heuristic {
  key: StressMetricKey;
  label: string;
  weight: number; // share of the score
  color: string; // bar color
  icon: LucideIcon;
  plain: string;
  how: string; // where the number comes from
  anchor: string; // how the raw measurement maps to 0–100
  rawMin: number; // 0-score real value
  rawMax: number; // 100-score real value
  unit: string; // real-value unit/suffix
}

/** Convert a 0–100 score back to an approximate real measurement for display. */
export function formatRaw(h: Heuristic, score: number | null | undefined): string {
  if (score == null) return 'no data';
  const value = Math.round(h.rawMin + (score / 100) * (h.rawMax - h.rawMin));
  return h.key === 'density' ? `~${value} ${h.unit}` : `${value} ${h.unit}`;
}

export const HEURISTICS: Heuristic[] = [
  {
    key: 'noise',
    label: 'Noise',
    weight: 0.3,
    color: '#e67e22',
    icon: Volume2,
    plain: 'How loud a place is. Traffic and busy streets make it noisier.',
    how: 'Estimated from how close the area sits to major roads.',
    anchor: 'Quiet 40 dB → 0   ·   Jackhammer 100 dB → 100',
    rawMin: 40,
    rawMax: 100,
    unit: 'dB',
  },
  {
    key: 'density',
    label: 'Crowding',
    weight: 0.25,
    color: '#9b59b6',
    icon: Users,
    plain: 'How packed a place gets with people and activity.',
    how: 'Counted from shops, eateries and stops nearby — more of them, more people.',
    anchor: 'Empty → 0   ·   50+ places nearby → 100',
    rawMin: 0,
    rawMax: 50,
    unit: 'places',
  },
  {
    key: 'heat',
    label: 'Heat',
    weight: 0.2,
    color: '#e74c3c',
    icon: Thermometer,
    plain: 'How hot it is. Concrete traps heat; open and green areas stay cooler.',
    how: 'Live temperature for the area.',
    anchor: 'Pleasant 25°C → 0   ·   Scorching 45°C → 100',
    rawMin: 25,
    rawMax: 45,
    unit: '°C',
  },
  {
    key: 'aqi',
    label: 'Air quality',
    weight: 0.25,
    color: '#7f8c8d',
    icon: Wind,
    plain: 'How clean or polluted the air is to breathe.',
    how: 'Live air-quality (AQI) readings.',
    anchor: 'Clean 0 → 0   ·   Hazardous 300 → 100',
    rawMin: 0,
    rawMax: 300,
    unit: 'AQI',
  },
];

export const GREENERY = {
  label: 'Greenery',
  color: '#27ae60',
  icon: Trees,
  plain: 'Parks and trees cool a place down and soften the heat around them.',
  how: 'Green areas get a discount on their stress score.',
};
