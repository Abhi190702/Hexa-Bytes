'use client';

import { useState } from 'react';
import { ChevronDown, ExternalLink, HeartPulse } from 'lucide-react';
import {
  assessHealth,
  aqliYearsFromAnnualPm25,
  pm25FromUsAqi,
  usAqiFromScore,
  RISK_BAND_META,
  WHO_PM25_ANNUAL,
  type HealthMetric,
} from '@platform/shared-types';
import { HEALTH_EVIDENCE, AQLI_SOURCE, DENSITY_NOTE } from '@/lib/evocomb/health-evidence';
import { annualPm25At } from '@/lib/evocomb/annual-pm25';
import type { StressCell } from '@/lib/api/stress';

const METRIC_LABEL: Record<HealthMetric, string> = {
  aqi: 'Air quality',
  noise: 'Noise',
  heat: 'Heat',
};

const GRADE_COLOR: Record<string, string> = {
  High: '#27ae60',
  Moderate: '#f1c40f',
  Low: '#7f8c8d',
  Limitation: '#7f8c8d',
};

/**
 * Population-level environmental-health context for one cell. Associational only — never an
 * individual prediction. Computed client-side from the cell's scores (mirror of
 * apps/api/src/app/domain/health.py); no extra API payload.
 */
export function HealthRiskPanel({ cell }: { cell: StressCell }) {
  const [openEvidence, setOpenEvidence] = useState(false);
  const h = assessHealth({ aqi: cell.scores.aqi, noise: cell.scores.noise, heat: cell.scores.heat });
  const band = RISK_BAND_META[h.band];

  const aqiScore = cell.scores.aqi;
  const pm25 = aqiScore != null ? pm25FromUsAqi(usAqiFromScore(aqiScore)) : null;
  const pmMultiple = pm25 != null ? pm25 / WHO_PM25_ANNUAL : null;

  // AQLI life-expectancy from this cell's ANNUAL-AVERAGE PM2.5 (the correct AQLI input),
  // IDW'd from the committed annual grid — not the current reading.
  const annualPm25 = annualPm25At(cell.lat, cell.lng);
  const leLoss = aqliYearsFromAnnualPm25(annualPm25);

  const dominantEvidence = h.dominant ? (HEALTH_EVIDENCE[h.dominant] ?? []) : [];

  return (
    <section className="space-y-3 border-t border-border pt-4">
      <div className="flex items-center gap-2">
        <HeartPulse className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Environmental health context
        </p>
      </div>

      {/* Headline band */}
      <div className="flex items-center gap-2.5">
        <span
          className="rounded-md px-2.5 py-1 text-xs font-semibold text-white"
          style={{ backgroundColor: band.color }}
        >
          {band.label} concern
        </span>
        {h.dominant && (
          <span className="text-xs text-muted-foreground">
            driven by {METRIC_LABEL[h.dominant].toLowerCase()}
          </span>
        )}
      </div>

      {/* Per-factor health context, guideline-anchored */}
      <dl className="space-y-1.5 text-xs">
        {pmMultiple != null && (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Air pollution</dt>
            <dd className="text-right font-medium text-card-foreground">
              PM2.5 ≈ {pmMultiple < 1 ? '<1' : `${pmMultiple.toFixed(0)}×`} the WHO guideline
            </dd>
          </div>
        )}
        {cell.scores.heat != null && (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Heat</dt>
            <dd className="text-right text-card-foreground">current/seasonal conditions</dd>
          </div>
        )}
        {cell.scores.noise != null && (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Noise</dt>
            <dd className="text-right text-card-foreground/70">modeled · low confidence</dd>
          </div>
        )}
      </dl>

      {/* AQLI per-cell — from this cell's ANNUAL-AVERAGE PM2.5 (the correct AQLI input),
          not the current reading. Population-average, vs the WHO guideline. */}
      {leLoss != null && leLoss > 0 && (
        <div className="rounded-lg bg-muted/50 p-2.5">
          <p className="text-xs leading-relaxed text-card-foreground">
            <span className="font-semibold">≈ {leLoss} years</span> lower{' '}
            <span className="text-muted-foreground">population-average</span> life expectancy here
            — from an annual-average PM2.5 of ~{Math.round(annualPm25)} µg/m³ vs the WHO guideline
            of 5.
          </p>
          <a
            href={AQLI_SOURCE.link}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-card-foreground"
          >
            Air Quality Life Index (AQLI), {AQLI_SOURCE.institution} ↗
          </a>
        </div>
      )}

      {/* Evidence for the dominant driver */}
      {dominantEvidence.length > 0 && (
        <div>
          <button
            onClick={() => setOpenEvidence((o) => !o)}
            aria-expanded={openEvidence}
            className="flex w-full items-center justify-between text-xs font-medium text-card-foreground"
          >
            <span>Research insights ({dominantEvidence.length})</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openEvidence ? 'rotate-180' : ''}`} />
          </button>
          {openEvidence && (
            <ul className="mt-2 space-y-2">
              {dominantEvidence.slice(0, 3).map((e) => (
                <li key={e.id} className="rounded-md border border-border p-2">
                  <p className="text-xs leading-snug text-card-foreground">{e.claim}</p>
                  {e.effect && <p className="mt-1 font-mono text-[10px] text-muted-foreground">{e.effect}</p>}
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {e.source} · {e.year}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span
                        className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white"
                        style={{ backgroundColor: GRADE_COLOR[e.grade] ?? '#7f8c8d' }}
                      >
                        {e.grade}
                      </span>
                      <a href={e.link} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-card-foreground">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </span>
                  </div>
                  {!e.verified && (
                    <p className="mt-1 text-[9px] text-amber-600/80">Pending source re-verification</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Density exclusion + disclaimer */}
      <p className="text-[10px] leading-snug text-muted-foreground">{DENSITY_NOTE}</p>
      <p className="text-[10px] leading-snug text-muted-foreground">
        Population-level &amp; associational, based on published studies — not a prediction,
        diagnosis, or medical advice for any individual.
      </p>
    </section>
  );
}
