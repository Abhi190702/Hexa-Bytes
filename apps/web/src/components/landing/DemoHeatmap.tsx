'use client';

import { useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { esiBand } from '@platform/shared-types';
import { Section, Reveal } from './ui/section';

const SIZE = 22;
const COLS = 18;
const ROWS = 9;
const STEP_X = SIZE * 1.5;
const STEP_Y = SIZE * Math.sqrt(3);
const W = SIZE + COLS * STEP_X;
const H = SIZE + ROWS * STEP_Y + STEP_Y / 2;

function hexPoints(cx: number, cy: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i);
    return `${(cx + SIZE * Math.cos(a)).toFixed(1)},${(cy + SIZE * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

export function DemoHeatmap() {
  const cells = useMemo(() => {
    const out: { cx: number; cy: number; points: string }[] = [];
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const cx = SIZE + c * STEP_X;
        const cy = SIZE + r * STEP_Y + (c % 2) * (STEP_Y / 2);
        out.push({ cx, cy, points: hexPoints(cx, cy) });
      }
    }
    return out;
  }, []);

  const refs = useRef<(SVGPolygonElement | null)[]>([]);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const s = (0.36 * W) ** 2;

    const paint = (time: number) => {
      const t = time / 1000;
      const h1x = W * (0.5 + 0.32 * Math.sin(t * 0.5));
      const h1y = H * (0.5 + 0.28 * Math.cos(t * 0.37));
      const h2x = W * (0.5 + 0.34 * Math.cos(t * 0.31 + 1));
      const h2y = H * (0.5 + 0.3 * Math.sin(t * 0.43 + 2));
      cells.forEach((cell, i) => {
        const el = refs.current[i];
        if (!el) return;
        const d1 = (cell.cx - h1x) ** 2 + (cell.cy - h1y) ** 2;
        const d2 = (cell.cx - h2x) ** 2 + (cell.cy - h2y) ** 2;
        const v = 14 + 78 * Math.exp(-d1 / s) + 58 * Math.exp(-d2 / (s * 0.7));
        const c = esiBand(Math.min(100, v)).color;
        el.setAttribute('fill', `rgb(${c[0]},${c[1]},${c[2]})`);
      });
    };

    paint(0);
    if (reduce) return;
    let raf = 0;
    let last = 0;
    const loop = (time: number) => {
      if (time - last > 40) {
        paint(time);
        last = time;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [cells]);

  return (
    <Section>
      <Reveal className="mx-auto max-w-3xl text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-white/40">Live, hexagon by hexagon</p>
        <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
          Hotspots, as they emerge.
        </h2>
        <p className="mt-6 text-lg leading-relaxed text-white/65">
          Stress is aggregated onto Uber H3 hexagons and rendered with GPU-accelerated deck.gl —
          green where a place is calm, red where burden concentrates.
        </p>
      </Reveal>

      <Reveal delay={0.1} className="mt-12">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-3">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Animated stress heatmap preview">
            {cells.map((cell, i) => (
              <polygon
                key={i}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                points={cell.points}
                fill="#22c55e"
                stroke="#0a0b0d"
                strokeWidth={1.5}
              />
            ))}
          </svg>
        </div>
        <div className="mt-8 flex justify-center">
          <Link
            href="/map"
            className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.03]"
          >
            Open Live Environmental Stress Map
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </Reveal>
    </Section>
  );
}
