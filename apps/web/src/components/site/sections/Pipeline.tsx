'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import anime from 'animejs';
import type { LucideIcon } from 'lucide-react';
import { Database, SlidersHorizontal, Scale, Hexagon } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import MagicBento, { type BentoItem } from '../ui/MagicBento';
import { Reveal } from '../ui/Reveal';

interface Step {
  icon: LucideIcon;
  label: string;
  detail: string;
  /** "r, g, b" glow tint — steps walk the site's emerald-300 → amber-300 accent. */
  tint: string;
}

const STEPS: Step[] = [
  {
    icon: Database,
    label: 'Collect',
    detail: 'Relative humidity, wind speed, solar radiation and temperature — pulled per ingest.',
    tint: '110, 231, 183',
  },
  {
    icon: SlidersHorizontal,
    label: 'Normalize',
    detail: 'Each raw signal mapped to a comparable 0–100 score.',
    tint: '157, 224, 148',
  },
  {
    icon: Scale,
    label: 'Weight',
    detail: 'Blended by published weights; greenery subtracts.',
    tint: '205, 218, 112',
  },
  {
    icon: Hexagon,
    label: 'Aggregate',
    detail: 'Rolled up to H3 r9 hexagonal cells for the map.',
    tint: '252, 211, 77',
  },
];

const ITEMS: BentoItem[] = STEPS.map((s, i) => {
  const Icon = s.icon;
  const n = String(i + 1).padStart(2, '0');
  return {
    id: s.label,
    glowColor: s.tint,
    className:
      'flex aspect-square flex-col justify-between rounded-2xl border border-white/10 bg-[#0e1013] p-6 md:aspect-auto',
    content: (
      <>
        <div className="relative z-[2] flex items-start justify-between gap-4">
          <span className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-[#15171b]">
            <Icon className="h-[18px] w-[18px] text-white/70" aria-hidden />
          </span>
          <span
            className="font-mono text-4xl font-light leading-none tabular-nums text-white/20 md:text-5xl"
            aria-hidden
          >
            {n}
          </span>
        </div>
        <div className="relative z-[2]">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/45">
            Step {n} / 04
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">{s.label}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-white/60">{s.detail}</p>
          {/* Reading-order hint: segments lit up to this step. */}
          <div className="mt-4 flex gap-1.5" aria-hidden>
            {STEPS.map((_, j) => (
              <span
                key={j}
                className="h-[2px] w-6 rounded-full"
                style={{
                  backgroundColor: j <= i ? `rgba(${s.tint}, 0.8)` : 'rgba(255, 255, 255, 0.1)',
                }}
              />
            ))}
          </div>
        </div>
      </>
    ),
  };
});

// --- Flow arrow ---------------------------------------------------------------------------
// One SVG path layered *under* the squares. On md+ it swings outside the cascade as an S of
// cubic Béziers: out of the outer side of each square, down into the top of the next (the
// short hops between those points run hidden behind the square itself). Once the squares
// stack it becomes a straight line down the left margin. Everything is measured from the
// live layout, so it follows any size change.

interface Pt {
  x: number;
  y: number;
}
interface Box extends Pt {
  w: number;
  h: number;
}
interface FlowGeom {
  w: number;
  h: number;
  d: string;
  start: Pt;
  end: Pt;
  /** Chevron polylines, one per hand-off (into 02, 03, 04). */
  heads: { points: string; color: string }[];
}

// emerald-400 → amber-300 → rose-400, the site's accent ramp.
const RAMP: [number, number, number][] = [
  [52, 211, 153],
  [252, 211, 77],
  [251, 113, 133],
];
function rampAt(t: number): string {
  const x = Math.max(0, Math.min(1, t)) * (RAMP.length - 1);
  const i = Math.min(Math.floor(x), RAMP.length - 2);
  const f = x - i;
  const a = RAMP[i]!;
  const b = RAMP[i + 1]!;
  const c = a.map((v, k) => Math.round(v + (b[k]! - v) * f));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

// Layout position of el inside root, ignoring transforms (tilt / magnetism / Reveal).
function offsetWithin(el: HTMLElement, root: HTMLElement): Pt {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

// Downward chevron with its tip at (x, y).
const chevronDown = (x: number, y: number) => `${x - 5},${y - 6} ${x},${y} ${x + 5},${y - 6}`;

function measureFlow(root: HTMLElement): FlowGeom | null {
  const cards = Array.from(root.querySelectorAll<HTMLElement>('.magic-bento__card'));
  if (cards.length < 2) return null;
  const boxes: Box[] = cards.map((c) => ({
    ...offsetWithin(c, root),
    w: c.offsetWidth,
    h: c.offsetHeight,
  }));
  const cx = (b: Box) => b.x + b.w / 2;
  const color = (i: number) => rampAt((i + 1) / (boxes.length - 1));
  const first = boxes[0]!;
  const last = boxes[boxes.length - 1]!;
  const geom = { w: root.offsetWidth, h: root.offsetHeight };

  // Stacked (mobile): a line down the left margin, chevrons centred in each gap.
  if (Math.abs(cx(boxes[1]!) - cx(first)) < 2) {
    const x = first.x / 2;
    const start = { x, y: first.y + 24 };
    const end = { x, y: last.y + last.h - 24 };
    const heads = boxes.slice(1).map((b, i) => {
      const prev = boxes[i]!;
      return { points: chevronDown(x, (prev.y + prev.h + b.y) / 2 + 4), color: color(i) };
    });
    return { ...geom, d: `M ${start.x} ${start.y} L ${end.x} ${end.y}`, start, end, heads };
  }

  // Cascade (md+): the S around the outside.
  let d = '';
  let start: Pt = { x: 0, y: 0 };
  let end: Pt = { x: 0, y: 0 };
  const heads: FlowGeom['heads'] = [];
  boxes.slice(0, -1).forEach((cur, i) => {
    const next = boxes[i + 1]!;
    const dir = cx(next) >= cx(cur) ? 1 : -1;
    // Leave a little above mid-height: a taller drop gives a rounder swing.
    const exit = { x: dir > 0 ? cur.x + cur.w : cur.x, y: cur.y + cur.h * 0.4 };
    const entry = { x: cx(next), y: next.y };
    const k = Math.min(cur.w, cur.h) * 0.45;
    if (i === 0) {
      start = exit;
      d = `M ${exit.x} ${exit.y}`;
    } else {
      d += ` L ${exit.x} ${exit.y}`; // hidden behind cur: its top centre → its outer side
    }
    d += ` C ${exit.x + dir * k} ${exit.y} ${entry.x} ${entry.y - k} ${entry.x} ${entry.y}`;
    end = entry;
    heads.push({ points: chevronDown(entry.x, entry.y - 3), color: color(i) });
  });
  return { ...geom, d, start, end, heads };
}

const DOTS = 3;
const LOOP_MS = 5200;

function FlowArrow({ rootRef }: { rootRef: RefObject<HTMLDivElement | null> }) {
  const [geom, setGeom] = useState<FlowGeom | null>(null);
  const reduced = useReducedMotion();
  const pathRef = useRef<SVGPathElement>(null);
  const headsRef = useRef<SVGGElement>(null);
  const dotsRef = useRef<SVGGElement>(null);
  // Survives re-measures: once drawn, a resize just re-lays the finished arrow.
  const drawnRef = useRef(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // Keep the previous object when nothing moved, so the animation effect doesn't restart.
    const update = () => {
      const next = measureFlow(root);
      setGeom((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(root);
    root.querySelectorAll('.magic-bento__card').forEach((c) => ro.observe(c));
    return () => ro.disconnect();
  }, [rootRef]);

  useEffect(() => {
    const root = rootRef.current;
    const path = pathRef.current;
    const heads = headsRef.current;
    const dotsG = dotsRef.current;
    if (!root || !path || !heads || !dotsG || !geom) return;

    const len = path.getTotalLength();
    const dots = Array.from(dotsG.querySelectorAll('circle'));
    path.style.strokeDasharray = `${len}`;

    const showFinished = () => {
      path.style.strokeDashoffset = '0';
      heads.style.opacity = '1';
    };

    if (reduced) {
      showFinished();
      dotsG.style.opacity = '0';
      return;
    }

    let raf = 0;
    let last = 0;
    let phase = 0;
    let visible = false;
    let running = false;

    const tick = (now: number) => {
      phase = (phase + (last ? now - last : 0) / LOOP_MS) % 1;
      last = now;
      dots.forEach((c, k) => {
        const t = (phase + k / dots.length) % 1;
        const p = path.getPointAtLength(t * len);
        c.setAttribute('cx', p.x.toFixed(1));
        c.setAttribute('cy', p.y.toFixed(1));
        c.setAttribute('fill', rampAt(t));
      });
      raf = requestAnimationFrame(tick);
    };

    // Dots run only once drawn, while the section is on screen and the tab is visible.
    const sync = () => {
      const should = drawnRef.current && visible && !document.hidden;
      if (should && !running) {
        running = true;
        last = 0;
        dotsG.style.opacity = '1';
        raf = requestAnimationFrame(tick);
      } else if (!should && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    };

    let draw: anime.AnimeTimelineInstance | null = null;
    if (drawnRef.current) {
      showFinished();
    } else {
      path.style.strokeDashoffset = `${len}`;
      heads.style.opacity = '0';
      dotsG.style.opacity = '0';
    }

    const io = new IntersectionObserver(
      (entries) => {
        visible = !!entries[0]?.isIntersecting;
        if (visible && !drawnRef.current && !draw) {
          draw = anime
            .timeline({
              complete: () => {
                drawnRef.current = true;
                sync();
              },
            })
            .add({
              targets: path,
              strokeDashoffset: [len, 0],
              duration: 1500,
              easing: 'easeInOutSine',
            })
            .add({ targets: heads, opacity: [0, 1], duration: 450, easing: 'linear' }, '-=300');
        }
        sync();
      },
      { threshold: 0.3 },
    );
    io.observe(root);
    document.addEventListener('visibilitychange', sync);

    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', sync);
      cancelAnimationFrame(raf);
      draw?.pause();
    };
  }, [geom, reduced, rootRef]);

  if (!geom) return null;
  const { start: first, end, d } = geom;

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0 z-0 overflow-visible"
      width={geom.w}
      height={geom.h}
      viewBox={`0 0 ${geom.w} ${geom.h}`}
      aria-hidden
    >
      <defs>
        {/* userSpaceOnUse: a straight vertical path has a zero-width bbox on mobile. */}
        <linearGradient
          id="pipe-flow"
          gradientUnits="userSpaceOnUse"
          x1={first.x}
          y1={first.y}
          x2={end.x + 0.01}
          y2={end.y}
        >
          <stop offset="0" stopColor={rampAt(0)} />
          <stop offset="0.5" stopColor={rampAt(0.5)} />
          <stop offset="1" stopColor={rampAt(1)} />
        </linearGradient>
      </defs>
      <path
        ref={pathRef}
        d={d}
        fill="none"
        stroke="url(#pipe-flow)"
        strokeOpacity={0.5}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <g ref={headsRef}>
        {geom.heads.map((h, i) => (
          <polyline
            key={i}
            points={h.points}
            fill="none"
            stroke={h.color}
            strokeOpacity={0.85}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </g>
      <g ref={dotsRef} style={{ filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.55))' }}>
        {Array.from({ length: DOTS }, (_, k) => (
          <circle key={k} r={2.5} cx={first.x} cy={first.y} fill={rampAt(0)} />
        ))}
      </g>
    </svg>
  );
}

// Cascade layout. md+: four equal squares (side --s) zig-zagging down, each one's top inner
// corner overlapping the previous square's bottom inner corner by --o; later steps sit
// on top. Grid tracks are cut at every square edge so each square spans an explicit area.
// Covered corners are always bottom ones, so every card keeps a clear bottom band of --o.
// Below md: one column of squares, inset from the left for the flow line.
const CASCADE_CSS = `
  .pipe-cascade {
    --s: 268px;
    --o: 48px;
    grid-template-columns: minmax(0, 1fr);
    row-gap: 1.75rem;
    padding-left: 1.5rem;
  }
  .pipe-cascade > li { width: 100%; max-width: 280px; }
  .pipe-cascade > :nth-child(1) { z-index: 1; }
  .pipe-cascade > :nth-child(2) { z-index: 2; }
  .pipe-cascade > :nth-child(3) { z-index: 3; }
  .pipe-cascade > :nth-child(4) { z-index: 4; }
  @media (min-width: 768px) {
    .pipe-cascade {
      padding-left: 0;
      row-gap: 0;
      justify-content: center;
      grid-template-columns:
        calc(var(--s) - var(--o)) var(--o) calc(var(--s) - var(--o));
      grid-template-rows:
        calc(var(--s) - var(--o)) var(--o) calc(var(--s) - 2 * var(--o)) var(--o)
        calc(var(--s) - 2 * var(--o)) var(--o) calc(var(--s) - var(--o));
    }
    .pipe-cascade > :nth-child(1) { grid-area: 1 / 1 / 3 / 3; }
    .pipe-cascade > :nth-child(2) { grid-area: 2 / 2 / 5 / 4; }
    .pipe-cascade > :nth-child(3) { grid-area: 4 / 1 / 7 / 3; }
    .pipe-cascade > :nth-child(4) { grid-area: 6 / 2 / 8 / 4; }
    .pipe-cascade > li { max-width: none; padding-bottom: calc(var(--o) + 0.75rem); }
  }
`;

// Section 5. Collect → Normalize → Weight → Aggregate as four overlapping squares, read
// 01 → 04. Cursor spotlight / border glow come from MagicBento and switch off for reduced
// motion and touch devices; the S-shaped flow arrow behind the squares marks the order.
export function Pipeline() {
  const bentoRef = useRef<HTMLDivElement>(null);

  return (
    <section id="pipeline" className="relative z-10 py-28">
      <div className="mx-auto w-full max-w-7xl px-5 md:px-8">
        <Reveal className="max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/45">
            05 · Pipeline
          </p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
            From raw feeds to a hex grid.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-white/60">
            Reproducible and open at every stage — the same path every cell takes, every ingest.
          </p>
        </Reveal>

        <Reveal className="mt-16">
          <div ref={bentoRef} className="relative isolate">
            <FlowArrow rootRef={bentoRef} />
            <style>{CASCADE_CSS}</style>
            <MagicBento
              items={ITEMS}
              className="pipe-cascade z-[1]"
              glowColor="255, 255, 255"
              spotlightRadius={260}
              spotlightOpacity={0.5}
              particleCount={6}
              enableTilt
              tiltStrength={2}
              enableMagnetism={false}
              clickEffect
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
