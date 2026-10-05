'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// Honeycomb intro: hexagons pop in (centre → ring), the wordmark fades up, then the whole
// splash lifts away to reveal the map. Click to skip.

const R = 16; // hex radius
const D = Math.sqrt(3) * R; // distance to ring neighbours (pointy-top)

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 90);
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
}

const RING_COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444', '#b91c1c', '#14b8a6'];

const HEXES = [
  { x: 0, y: 0, color: '#0f172a' },
  ...Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (30 + 60 * i);
    return {
      x: Number((D * Math.cos(a)).toFixed(2)),
      y: Number((D * Math.sin(a)).toFixed(2)),
      color: RING_COLORS[i],
    };
  }),
];

export function SplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2400);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          onClick={() => setVisible(false)}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center"
          style={{ background: 'radial-gradient(circle at 50% 42%, #ffffff, #eef1f4)' }}
        >
          <motion.svg
            width="150"
            height="150"
            viewBox="-52 -52 104 104"
            initial={{ rotate: -8 }}
            animate={{ rotate: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            {HEXES.map((h, i) => (
              <motion.polygon
                key={i}
                points={hexPoints(h.x, h.y, R)}
                fill={h.color}
                stroke="#ffffff"
                strokeWidth={2}
                strokeLinejoin="round"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 + i * 0.09, type: 'spring', stiffness: 280, damping: 13 }}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              />
            ))}
          </motion.svg>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95, duration: 0.5 }}
            className="mt-5 text-3xl font-bold tracking-tight text-slate-900"
          >
            Evo<span className="text-emerald-600">Comb</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.25, duration: 0.5 }}
            className="mt-1 text-sm text-slate-500"
          >
            Urban Environmental Stress · Delhi NCR
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
