'use client';

import { motion } from 'framer-motion';
import { ESI_COLOR_RAMP } from '@platform/shared-types';
import { GREENERY } from '@/lib/heuristics';
import { SIGNALS } from '@/lib/evocomb/signals';
import { SIGNAL_INFO } from '@/lib/map/signal-info';

// Plain-language, animated explanation: what each input is, how raw measurements become a
// 0–100 score, the blend formula, a worked example, and what the final number means.

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const card = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const rgb = (c: readonly number[]) => `rgb(${c[0]},${c[1]},${c[2]})`;

const BAND_ANALOGIES = [
  'a mild, breezy day',
  'typical warm-season conditions',
  'a hot, still afternoon',
  'a humid heatwave day',
  'extreme heat with little wind relief',
];

export function HeuristicExplainer() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-3 pr-4">
      <motion.div variants={card}>
        <h2 className="text-sm font-semibold text-card-foreground">How this map works</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          “Environmental stress” = how much environmental burden a place carries — how humid,
          windy, sunny and hot it is. We score four signals for every ~150&nbsp;m patch.
        </p>
      </motion.div>

      {SIGNALS.map((h) => {
        const Icon = SIGNAL_INFO[h.key].icon;
        return (
          <motion.div key={h.key} variants={card} className="rounded-lg border bg-background/60 p-3">
            <div className="flex items-center gap-2">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-md"
                style={{ backgroundColor: `${h.color}22`, color: h.color }}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium text-card-foreground">{h.label}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {Math.round(h.weight * 100)}%
              </span>
            </div>
            <p className="mt-2 text-xs leading-snug text-muted-foreground">
              {SIGNAL_INFO[h.key].plain}
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: h.color }}
                initial={{ width: 0 }}
                animate={{ width: `${h.weight * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              />
            </div>
          </motion.div>
        );
      })}

      <motion.div
        variants={card}
        className="rounded-lg border p-3"
        style={{ backgroundColor: `${GREENERY.color}14`, borderColor: `${GREENERY.color}55` }}
      >
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md"
            style={{ backgroundColor: `${GREENERY.color}22`, color: GREENERY.color }}
          >
            <GREENERY.icon className="h-4 w-4" />
          </span>
          <span className="text-sm font-medium text-card-foreground">{GREENERY.label}</span>
          <span className="ml-auto text-xs font-medium" style={{ color: GREENERY.color }}>
            −up to 50%
          </span>
        </div>
        <p className="mt-2 text-xs leading-snug text-muted-foreground">{GREENERY.plain}</p>
      </motion.div>

      {/* The formula, in plain terms */}
      <motion.div variants={card} className="rounded-lg bg-muted/50 p-3">
        <p className="text-xs font-semibold text-card-foreground">How we blend them</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Each is scored 0–100, then weighted and added — then greenery gives a discount:
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px] font-medium">
          <span className="text-muted-foreground">Score =</span>
          {SIGNALS.map((h, i) => (
            <span key={h.key} className="flex items-center gap-1">
              <span
                className="rounded px-1.5 py-0.5 text-white"
                style={{ backgroundColor: h.color }}
              >
                {Math.round(h.weight * 100)}% {h.label}
              </span>
              {i < SIGNALS.length - 1 && <span className="text-muted-foreground">+</span>}
            </span>
          ))}
          <span className="rounded px-1.5 py-0.5 text-white" style={{ backgroundColor: GREENERY.color }}>
            − greenery
          </span>
        </div>
        <p className="mt-3 rounded-md bg-background/70 p-2 text-[11px] leading-relaxed text-muted-foreground">
          <strong className="text-card-foreground">Example — a hot, humid afternoon:</strong>{' '}
          Humidity 80, Wind 60, Solar 70, Temperature 50 →
          <br />
          0.30×80 + 0.25×60 + 0.20×70 + 0.25×50 = <strong className="text-card-foreground">66 / 100</strong>{' '}
          (High).
        </p>
      </motion.div>

      {/* What the number means */}
      <motion.div variants={card} className="rounded-lg border p-3">
        <p className="text-xs font-semibold text-card-foreground">What your score means</p>
        <div className="mt-2 space-y-1">
          {ESI_COLOR_RAMP.map((band, i) => (
            <div key={band.label} className="flex items-center gap-2 text-[11px]">
              <span
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: rgb(band.color) }}
              />
              <span className="w-12 shrink-0 text-muted-foreground">
                {band.min}–{band.max}
              </span>
              <span className="font-medium text-card-foreground">{band.label}</span>
              <span className="text-muted-foreground">· like {BAND_ANALOGIES[i]}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={card} className="rounded-lg bg-muted/50 p-3">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Note: each signal is shown as a 0–100 score, not in its raw unit, so the four can be
          blended on one scale.
        </p>
        <p className="mt-2 text-[11px] font-medium text-card-foreground">
          Tip: click any hexagon to see that area’s breakdown.
        </p>
      </motion.div>
    </motion.div>
  );
}
