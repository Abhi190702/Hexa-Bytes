// ESI *render* constants shared with the frontend. The authoritative computation lives in
// the backend (apps/api/src/app/domain/methodology.py); this file only mirrors what the UI
// needs to draw and explain results. Keep weights/ramp in sync with the backend.

export const H3_RESOLUTION = 9;

// For display in tooltips/legend. Source of truth for the math is the backend.
export const ESI_WEIGHTS = {
  noise: 0.3,
  density: 0.25,
  heat: 0.2,
  aqi: 0.25,
} as const;

export type RGBA = [number, number, number, number];

export interface EsiColorBand {
  min: number;
  max: number;
  label: string;
  color: RGBA;
}

// 0–20 green, 20–40 yellow, 40–60 orange, 60–80 red, 80–100 dark red.
export const ESI_COLOR_RAMP: EsiColorBand[] = [
  { min: 0, max: 20, label: 'Low', color: [38, 166, 91, 180] },
  { min: 20, max: 40, label: 'Moderate', color: [241, 196, 15, 180] },
  { min: 40, max: 60, label: 'Elevated', color: [230, 126, 34, 190] },
  { min: 60, max: 80, label: 'High', color: [231, 76, 60, 200] },
  { min: 80, max: 100, label: 'Severe', color: [120, 24, 24, 210] },
];

/** Map an ESI value (0–100) to its color band. */
export function esiBand(esi: number): EsiColorBand {
  const clamped = Math.max(0, Math.min(100, esi));
  return ESI_COLOR_RAMP.find((b) => clamped < b.max) ?? ESI_COLOR_RAMP[ESI_COLOR_RAMP.length - 1]!;
}
