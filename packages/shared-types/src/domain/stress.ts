// The four measurable environmental burdens that constitute the Environmental Stress
// Index. NOTE: "stress" = environmental burden, not human psychological stress. These keys
// are the stable identifiers shared across the API, realtime channels, and the map; they
// mirror the backend `app.domain.methodology.Metric` enum.

export const STRESS_METRICS = {
  noise: 'noise',
  density: 'density', // BLE-density crowding proxy
  heat: 'heat', // heat stress derived from temperature
  aqi: 'aqi', // air quality index
} as const;

export type StressMetricKey = (typeof STRESS_METRICS)[keyof typeof STRESS_METRICS];

export const STRESS_METRIC_KEYS = Object.values(STRESS_METRICS) as StressMetricKey[];

export const STRESS_METRIC_LABELS: Record<StressMetricKey, string> = {
  noise: 'Noise',
  density: 'Crowding',
  heat: 'Heat',
  aqi: 'Air Quality',
};
