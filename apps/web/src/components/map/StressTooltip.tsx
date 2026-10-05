'use client';

import { esiBand, STRESS_LAYER_LABELS, type StressLayerKey } from '@platform/shared-types';
import { SIGNALS } from '@/lib/evocomb/signals';
import type { MapCell } from '@/lib/map/cells';
import { stressLayerValue } from '@/components/map/layers/stressHexLayer';

export interface HoverInfo {
  x: number;
  y: number;
  cell: MapCell;
}

const fmt = (v: number | null | undefined) => (v == null ? '—' : Math.round(v).toString());

// Hover card: locality name + ESI band + per-signal scores + confidence.
// A '—' score means that signal has no data for this cell.
export function StressTooltip({
  info,
  activeLayer,
}: {
  info: HoverInfo | null;
  activeLayer: StressLayerKey;
}) {
  if (!info) return null;
  const cell = info.cell;
  const band = esiBand(cell.esi);
  const activeValue = stressLayerValue(cell, activeLayer);

  return (
    <div
      className="pointer-events-none absolute z-20 max-w-[240px] rounded-md border border-white/10 bg-neutral-900/95 px-3 py-2 text-xs text-white shadow-lg"
      style={{ left: info.x + 14, top: info.y + 14 }}
    >
      <div className="font-semibold">{cell.locality ?? 'Unknown area'}</div>
      <div className="mt-0.5">
        {STRESS_LAYER_LABELS[activeLayer]} <span className="font-semibold">{fmt(activeValue)}</span>
        /100
        {activeLayer === 'esi' ? ` · ${band.label}` : ''}
      </div>
      <div className="mt-1 space-y-0.5 text-neutral-300">
        {SIGNALS.map((s) => (
          <div key={s.key} className="flex justify-between gap-3">
            <span>{s.label}</span>
            <span className="tabular-nums">{fmt(cell.scores[s.key])}</span>
          </div>
        ))}
        {cell.greenery != null && cell.greenery > 0 && (
          <div>Greenery relief {Math.round(cell.greenery * 100)}%</div>
        )}
      </div>
      <div className="mt-1 text-neutral-400">Confidence {Math.round(cell.confidence * 100)}%</div>
    </div>
  );
}
