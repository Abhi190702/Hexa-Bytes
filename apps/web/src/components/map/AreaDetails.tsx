'use client';

import { motion } from 'framer-motion';
import { esiBand } from '@platform/shared-types';
import { GREENERY } from '@/lib/heuristics';
import { SIGNALS } from '@/lib/evocomb/signals';
import type { MapCell } from '@/lib/map/cells';
import { useDisplayCells } from '@/hooks/useDisplayCells';

const rgba = (c: readonly number[]) => `rgb(${c[0]},${c[1]},${c[2]})`;

// Greenery relief fraction — mirrors GREENERY_RELIEF in the backend methodology.
const GREENERY_RELIEF_PCT = 60;

function summarize(cell: MapCell): string {
  const present = SIGNALS.filter((h) => cell.scores[h.key] != null);
  const ranked = [...present].sort(
    (a, b) => (cell.scores[b.key] ?? 0) * b.weight - (cell.scores[a.key] ?? 0) * a.weight,
  );
  const drivers = ranked
    .filter((h) => (cell.scores[h.key] ?? 0) >= 40)
    .slice(0, 2)
    .map((h) => h.label.toLowerCase());
  let s = drivers.length
    ? `Stress here is driven mainly by ${drivers.join(' and ')}.`
    : 'This area is relatively calm across all factors.';
  if (cell.greenery && cell.greenery > 0) s += ' Nearby greenery offsets some of it.';
  return s;
}

export function AreaDetails({ cell }: { cell: MapCell }) {
  const { cells, isDemo } = useDisplayCells();
  const avg = cells.length ? cells.reduce((s, c) => s + c.esi, 0) / cells.length : null;
  const diff = avg != null ? Math.round(cell.esi - avg) : null;

  const band = esiBand(cell.esi);
  const localityLabel = cell.locality ?? (isDemo ? 'Demo cell (illustrative)' : 'Unknown area');

  const compare =
    diff == null
      ? null
      : diff > 2
        ? `${diff} pts above the area average`
        : diff < -2
          ? `${Math.abs(diff)} pts below the area average`
          : 'about the area average';

  return (
    <motion.div
      key={cell.h3}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-4"
    >
      <div className="pr-6">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Area</p>
        <h2 className="text-base font-semibold leading-tight text-card-foreground">
          {localityLabel}
        </h2>
      </div>

      <div className="flex items-center gap-3">
        <div
          className="flex h-16 w-16 flex-col items-center justify-center rounded-xl text-white"
          style={{ backgroundColor: rgba(band.color) }}
        >
          <span className="text-2xl font-bold leading-none">{Math.round(cell.esi)}</span>
          <span className="text-[10px] opacity-90">/ 100</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-card-foreground">{band.label} stress</p>
          {compare && <p className="text-xs text-muted-foreground">{compare}</p>}
        </div>
      </div>

      <p className="rounded-md bg-muted/50 p-2 text-xs leading-relaxed text-muted-foreground">
        {summarize(cell)}
      </p>

      <div className="space-y-2.5">
        {SIGNALS.map((h) => {
          const score = cell.scores[h.key];
          return (
            <div key={h.key}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-card-foreground">{h.label}</span>
                <span className="font-medium text-card-foreground">
                  {score == null ? 'no data' : `${Math.round(score)} / 100`}
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: h.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${score ?? 0}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {cell.greenery != null && cell.greenery > 0 && (
        <div
          className="rounded-lg p-2 text-xs"
          style={{ backgroundColor: `${GREENERY.color}14`, color: GREENERY.color }}
        >
          🌳 Greenery here lowers the score by {Math.round(cell.greenery * GREENERY_RELIEF_PCT)}%.
        </div>
      )}

      <p className="text-[11px] leading-snug text-muted-foreground">
        {isDemo
          ? 'Demo data: these values are illustrative, not measured.'
          : 'Scores are 0–100 for this hexagon. Temperature comes from the live feed; humidity, wind and solar radiation have no live source yet.'}{' '}
        Confidence {Math.round(cell.confidence * 100)}%.
      </p>
    </motion.div>
  );
}
