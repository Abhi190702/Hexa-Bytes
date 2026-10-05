// The four weather signals shown on the landing page and the /map UI: the
// Signals carousel, the index builder and the map all read this list, so names,
// colours and weights can't drift apart. Weights carry over the published
// 30/25/20/25 split by position.

export type SignalKey = 'humidity' | 'wind' | 'solar' | 'temperature';

export interface Signal {
  key: SignalKey;
  label: string;
  unit: string;
  color: string;
  weight: number; // share of the ESI, 0–1; the four sum to 1
}

export const SIGNALS: Signal[] = [
  { key: 'humidity', label: 'Relative humidity', unit: '%', color: '#1abc9c', weight: 0.3 },
  { key: 'wind', label: 'Wind speed', unit: 'm/s', color: '#5dade2', weight: 0.25 },
  { key: 'solar', label: 'Solar radiation', unit: 'W/m²', color: '#f1c40f', weight: 0.2 },
  { key: 'temperature', label: 'Temperature', unit: '°C', color: '#e74c3c', weight: 0.25 },
];
