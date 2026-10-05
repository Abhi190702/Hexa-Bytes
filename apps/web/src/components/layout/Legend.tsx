'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Layers, X } from 'lucide-react';
import { ESI_COLOR_RAMP, STRESS_LAYER_COLORS, STRESS_LAYER_LABELS } from '@platform/shared-types';
import { useMapStore } from '@/stores/map-store';

const rgba = (c: [number, number, number, number]) => `rgba(${c[0]},${c[1]},${c[2]},${c[3] / 255})`;

// Color-ramp legend as a toggle popup (hidden by default).
export function Legend() {
  const [open, setOpen] = useState(false);
  const activeLayer = useMapStore((s) => s.activeStressLayer);
  const factorColor = activeLayer === 'esi' ? null : STRESS_LAYER_COLORS[activeLayer];
  const factorRgb = factorColor ? `${factorColor[0]},${factorColor[1]},${factorColor[2]}` : '';

  return (
    <div className="pointer-events-none absolute bottom-6 left-4 z-10">
      <AnimatePresence mode="wait">
        {open ? (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-auto relative rounded-lg border bg-card/95 p-3 pr-8 shadow-lg backdrop-blur"
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted"
              aria-label="Close legend"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <p className="mb-2 text-xs font-semibold text-card-foreground">
              {STRESS_LAYER_LABELS[activeLayer]}
            </p>
            {activeLayer === 'esi' ? (
              <div className="flex flex-col gap-1">
                {ESI_COLOR_RAMP.map((band) => (
                  <div key={band.label} className="flex items-center gap-2 text-xs">
                    <span
                      className="inline-block h-3 w-4 rounded-sm"
                      style={{ background: rgba(band.color) }}
                    />
                    <span className="text-muted-foreground">
                      {band.min}–{band.max} · {band.label}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                <div
                  className="h-3 w-48 rounded-sm"
                  style={{
                    background: `linear-gradient(90deg, rgba(${factorRgb},0.12), rgba(${factorRgb},1))`,
                  }}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Low · 0</span>
                  <span>High · 100</span>
                </div>
              </div>
            )}
            <p className="mt-2 max-w-[190px] text-[10px] leading-snug text-muted-foreground">
              Normalized intensity over ~100–300m H3 cells — not point-level accuracy.
            </p>
          </motion.div>
        ) : (
          <motion.button
            key="btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(true)}
            className="pointer-events-auto flex items-center gap-2 rounded-full border bg-card/90 px-3 py-2 text-xs font-medium text-card-foreground shadow-sm backdrop-blur transition-colors hover:bg-card"
          >
            <Layers className="h-4 w-4" />
            Legend
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
