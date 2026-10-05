'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { HelpCircle } from 'lucide-react';
import {
  MAP_LAYER_IDS,
  STRESS_LAYER_KEYS,
  STRESS_LAYER_LABELS,
  type StressLayerKey,
} from '@platform/shared-types';
import { Button } from '@/components/ui/button';
import { useMapStore } from '@/stores/map-store';

const OUTLINE_TEXT =
  'border-neutral-400 bg-white text-neutral-900 hover:bg-neutral-100 hover:text-neutral-900';
const STRESS_LAYERS = Object.values(STRESS_LAYER_KEYS) as StressLayerKey[];

// Floating UI shell above the map: title, ESI heatmap toggle, and a button that opens the
// plain-language explainer popup.
export function MapChrome() {
  const hexVisible = useMapStore((s) => s.visibleLayers[MAP_LAYER_IDS.hexagon]);
  const activeStressLayer = useMapStore((s) => s.activeStressLayer);
  const toggleLayer = useMapStore((s) => s.toggleLayer);
  const setActiveStressLayer = useMapStore((s) => s.setActiveStressLayer);
  const toggleExplainer = useMapStore((s) => s.toggleExplainer);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="pointer-events-none absolute left-4 top-4 z-10"
    >
      <div className="pointer-events-auto max-w-[calc(100vw-2rem)] rounded-lg border bg-card/90 px-4 py-3 shadow-sm backdrop-blur">
        <Link href="/" className="text-sm font-semibold text-card-foreground hover:underline">
          ← EvoComb
        </Link>
        <p className="text-xs text-muted-foreground">Urban environmental stress · Delhi NCR</p>
        <div
          className="mt-3 flex flex-wrap gap-1"
          role="group"
          aria-label="Environmental data layer"
        >
          {STRESS_LAYERS.map((layer) => (
            <Button
              key={layer}
              size="sm"
              variant={activeStressLayer === layer ? 'default' : 'outline'}
              className={activeStressLayer === layer ? undefined : OUTLINE_TEXT}
              aria-pressed={activeStressLayer === layer}
              onClick={() => setActiveStressLayer(layer)}
            >
              {STRESS_LAYER_LABELS[layer]}
            </Button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className={OUTLINE_TEXT}
            onClick={() => toggleLayer(MAP_LAYER_IDS.hexagon)}
          >
            {hexVisible ? 'Hide layer' : 'Show layer'}
          </Button>
          <Button size="sm" variant="outline" className={OUTLINE_TEXT} onClick={toggleExplainer}>
            <HelpCircle className="h-4 w-4" />
            How it works
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
