'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { AreaDetails } from '@/components/map/AreaDetails';
import { HeuristicExplainer } from '@/components/layout/HeuristicExplainer';
import { useMapStore } from '@/stores/map-store';

// Popup panel — hidden until you open the explainer (button) or click a hexagon (details).
// Slides in from the right; content switches between the two with a crossfade.
export function Sidebar() {
  const selected = useMapStore((s) => s.selectedCell);
  const explainerOpen = useMapStore((s) => s.explainerOpen);
  const setSelectedCell = useMapStore((s) => s.setSelectedCell);
  const setExplainerOpen = useMapStore((s) => s.setExplainerOpen);

  const open = selected !== null || explainerOpen;
  const close = () => {
    setSelectedCell(null);
    setExplainerOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="panel"
          initial={{ x: 380, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 380, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="pointer-events-auto absolute bottom-4 right-4 top-4 z-20 flex w-[340px] max-w-[calc(100vw-2rem)] flex-col rounded-xl border bg-card/95 shadow-xl backdrop-blur"
        >
          <button
            onClick={close}
            className="absolute right-3 top-3 z-10 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="overflow-y-auto p-4">
            <AnimatePresence mode="wait">
              {selected ? (
                <AreaDetails key={`details-${selected.h3}`} cell={selected} />
              ) : (
                <motion.div
                  key="explainer"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <HeuristicExplainer />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
