'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';

interface LayerDef {
  label: string;
  color: string;
  at: [number, number];
  pos: [number, number];
}

const LAYERS: LayerDef[] = [
  { label: 'Noise', color: '#e67e22', at: [0.05, 0.3], pos: [32, 42] },
  { label: 'Pollution', color: '#8b9bb0', at: [0.2, 0.45], pos: [62, 38] },
  { label: 'Heat', color: '#e74c3c', at: [0.35, 0.6], pos: [48, 64] },
  { label: 'Crowding', color: '#9b59b6', at: [0.5, 0.75], pos: [70, 66] },
];

function RevealLayer({ layer, progress }: { layer: LayerDef; progress: MotionValue<number> }) {
  const opacity = useTransform(progress, layer.at, [0, 0.5]);
  const scale = useTransform(progress, layer.at, [0.6, 1]);
  return (
    <motion.div
      style={{
        opacity,
        scale,
        background: `radial-gradient(circle at ${layer.pos[0]}% ${layer.pos[1]}%, ${layer.color}, transparent 55%)`,
      }}
      className="absolute inset-0 mix-blend-screen"
    />
  );
}

export function CinematicReveal() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const labelsOpacity = useTransform(scrollYProgress, [0.0, 0.15], [0, 1]);

  return (
    <section ref={ref} className="relative h-[280vh] bg-[#0a0b0d]">
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,rgba(255,255,255,0.04),transparent_60%)]" />
        {LAYERS.map((l) => (
          <RevealLayer key={l.label} layer={l} progress={scrollYProgress} />
        ))}
        <div className="absolute inset-0 bg-[#0a0b0d]/30" />

        <div className="relative z-10 max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
            Cities look calm on the surface.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-white/70">
            Beneath them lie invisible fields of noise, pollution, heat and crowding. Scroll, and
            they emerge — layering into one continuous map of environmental burden.
          </p>
          <motion.div
            style={{ opacity: labelsOpacity }}
            className="mt-8 flex flex-wrap justify-center gap-2"
          >
            {LAYERS.map((l) => (
              <span
                key={l.label}
                className="rounded-full border px-3 py-1 text-xs font-medium"
                style={{ borderColor: `${l.color}66`, color: l.color }}
              >
                {l.label}
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
