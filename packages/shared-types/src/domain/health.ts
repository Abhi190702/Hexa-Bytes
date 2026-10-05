// Environmental Health Risk Layer — RENDER mirror of the authoritative methodology in
// apps/api/src/app/domain/health.py. The frontend computes the population-level health
// context client-side from the per-cell scores already in the payload (no extra API cost).
// Keep thresholds/weights in sync with the Python source of truth.
//
// GUARDRAILS (same as the backend): population-level & associational only; anchored to
// published guidelines (EPA AQI / WHO AQG 2021 / WHO noise 2018); evidence-weighted and
// measurement-confidence-gated; urban density EXCLUDED from health-risk; AQLI is a
// population-average "if sustained year-round" figure, never an individual lifespan.

export type RiskBand = 'low' | 'moderate' | 'elevated' | 'high';
const BAND_ORDER: RiskBand[] = ['low', 'moderate', 'elevated', 'high'];

export const RISK_BAND_META: Record<RiskBand, { label: string; color: string }> = {
  low: { label: 'Low', color: '#27ae60' },
  moderate: { label: 'Moderate', color: '#f1c40f' },
  elevated: { label: 'Elevated', color: '#e67e22' },
  high: { label: 'High', color: '#c0392b' },
};

// Published anchors (mirror health.py).
export const WHO_PM25_ANNUAL = 5.0; // µg/m³, WHO AQG 2021
export const WHO_NOISE_LDEN = 53.0; // dB, WHO 2018 road-traffic
export const AQLI_YEARS_PER_UGM3 = 0.098; // AQLI (Greenstone/Ebenstein)

// ESI normalisation anchors (mirror methodology.py) — to invert scores back to exposures.
const AQI_MAX = 300;
const NOISE_MIN_DB = 40;
const NOISE_MAX_DB = 100;
const HEAT_MIN_C = 25;
const HEAT_MAX_C = 45;

export type HealthMetric = 'aqi' | 'noise' | 'heat';

const EVIDENCE_WEIGHT: Record<HealthMetric, number> = { aqi: 1.0, heat: 0.8, noise: 0.8 };
const MEASUREMENT_CONFIDENCE: Record<HealthMetric, number> = { aqi: 0.7, heat: 0.6, noise: 0.35 };
const BAND_CONFIDENCE_FLOOR = 0.5; // noise (0.35) is shown but cannot drive the headline

const clampScore = (s: number) => Math.max(0, Math.min(100, s));

export const usAqiFromScore = (aqiScore: number) => Math.max(0, aqiScore) / 100 * AQI_MAX;
export const noiseDbFromScore = (s: number) => NOISE_MIN_DB + clampScore(s) / 100 * (NOISE_MAX_DB - NOISE_MIN_DB);
export const tempCFromScore = (s: number) => HEAT_MIN_C + clampScore(s) / 100 * (HEAT_MAX_C - HEAT_MIN_C);

// US EPA PM2.5 AQI breakpoints (AQI_lo, AQI_hi, C_lo, C_hi µg/m³).
const AQI_PM25_BREAKPOINTS: [number, number, number, number][] = [
  [0, 50, 0.0, 12.0],
  [51, 100, 12.1, 35.4],
  [101, 150, 35.5, 55.4],
  [151, 200, 55.5, 150.4],
  [201, 300, 150.5, 250.4],
  [301, 500, 250.5, 500.4],
];

export function pm25FromUsAqi(usAqi: number): number {
  const a = Math.max(0, Math.min(500, usAqi));
  for (const [aLo, aHi, cLo, cHi] of AQI_PM25_BREAKPOINTS) {
    if (a >= aLo && a <= aHi) return cLo + ((a - aLo) / (aHi - aLo)) * (cHi - cLo);
  }
  return 500.4;
}

export function aqiBand(aqiScore: number | null | undefined): RiskBand | null {
  if (aqiScore == null) return null;
  const aqi = usAqiFromScore(aqiScore);
  if (aqi <= 50) return 'low';
  if (aqi <= 100) return 'moderate';
  if (aqi <= 150) return 'elevated';
  return 'high';
}

export function noiseBand(noiseScore: number | null | undefined): RiskBand | null {
  if (noiseScore == null) return null;
  const db = noiseDbFromScore(noiseScore);
  if (db < WHO_NOISE_LDEN) return 'low';
  if (db < 60) return 'moderate';
  if (db < 70) return 'elevated';
  return 'high';
}

export function heatBand(heatScore: number | null | undefined): RiskBand | null {
  if (heatScore == null) return null;
  const t = tempCFromScore(heatScore);
  if (t < 32) return 'low';
  if (t < 37) return 'moderate';
  if (t < 41) return 'elevated';
  return 'high';
}

/** AQLI population-average life-expectancy loss (years) from an ANNUAL-AVERAGE PM2.5 (µg/m³),
 *  vs the WHO 5 µg/m³ guideline — the correct AQLI input. Linear, no threshold.
 *  Verified: 0.098 yr/µg/m³ (Ebenstein et al., PNAS 2017; AQLI). Population-average only. */
export function aqliYearsFromAnnualPm25(annualPm25: number | null | undefined): number | null {
  if (annualPm25 == null || Number.isNaN(annualPm25)) return null;
  return Math.round(AQLI_YEARS_PER_UGM3 * Math.max(0, annualPm25 - WHO_PM25_ANNUAL) * 10) / 10;
}

/** @deprecated Uses a CURRENT AQI as if annual → overstates. Use aqliYearsFromAnnualPm25. */
export function lifeExpectancyLossYears(aqiScore: number | null | undefined): number | null {
  if (aqiScore == null) return null;
  const pm25 = pm25FromUsAqi(usAqiFromScore(aqiScore));
  return Math.round(AQLI_YEARS_PER_UGM3 * Math.max(0, pm25 - WHO_PM25_ANNUAL) * 100) / 100;
}

export interface FactorHealth {
  metric: HealthMetric;
  band: RiskBand | null;
  evidenceWeight: number;
  confidence: number;
  drivesBand: boolean;
}

export interface HealthAssessment {
  band: RiskBand;
  dominant: HealthMetric | null;
  factors: FactorHealth[];
  lifeExpectancyLossYears: number | null;
  confidence: number;
}

export interface HealthScores {
  aqi?: number | null;
  noise?: number | null;
  heat?: number | null;
}

const BAND_FN: Record<HealthMetric, (s: number | null | undefined) => RiskBand | null> = {
  aqi: aqiBand,
  noise: noiseBand,
  heat: heatBand,
};

/** Population-level environmental-health assessment for one cell. Density is excluded by
 *  design; noise is reported but cannot drive the headline (crude proxy). */
export function assessHealth(scores: HealthScores): HealthAssessment {
  const factors: FactorHealth[] = (['aqi', 'noise', 'heat'] as HealthMetric[]).map((metric) => {
    const band = BAND_FN[metric](scores[metric]);
    const evidenceWeight = EVIDENCE_WEIGHT[metric];
    const confidence = MEASUREMENT_CONFIDENCE[metric];
    return {
      metric,
      band,
      evidenceWeight,
      confidence,
      drivesBand: band != null && evidenceWeight > 0 && confidence >= BAND_CONFIDENCE_FLOOR,
    };
  });

  const driving = factors.filter((f) => f.drivesBand && f.band);
  if (driving.length === 0) {
    return { band: 'low', dominant: null, factors, lifeExpectancyLossYears: lifeExpectancyLossYears(scores.aqi), confidence: 0 };
  }
  const rank = (b: RiskBand) => BAND_ORDER.indexOf(b);
  const headline = driving.reduce<RiskBand>((acc, f) => (rank(f.band!) > rank(acc) ? f.band! : acc), 'low');
  const dominant = driving
    .filter((f) => f.band === headline)
    .reduce((best, f) => (f.evidenceWeight * f.confidence > best.evidenceWeight * best.confidence ? f : best)).metric;
  const confidence = Math.round((driving.reduce((s, f) => s + f.confidence, 0) / driving.length) * 1000) / 1000;

  return { band: headline, dominant, factors, lifeExpectancyLossYears: lifeExpectancyLossYears(scores.aqi), confidence };
}
