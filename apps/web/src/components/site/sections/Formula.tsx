'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import anime from 'animejs';
import { GREENERY } from '@/lib/heuristics';
import { SIGNALS } from '@/lib/evocomb/signals';
import ScrubField from '../ui/ScrubField';
import { Reveal } from '../ui/Reveal';

// Local green→amber→red ramp so the sample cell needs no map import.
function esiColor(v: number): { hex: string; band: string } {
  const t = Math.max(0, Math.min(100, v)) / 100;
  if (t < 0.34) return { hex: '#27ae60', band: 'Calm' };
  if (t < 0.5) return { hex: '#7aa83a', band: 'Low' };
  if (t < 0.66) return { hex: '#e6b41e', band: 'Moderate' };
  if (t < 0.82) return { hex: '#e67e22', band: 'Elevated' };
  return { hex: '#c0392b', band: 'High burden' };
}

// Black or white text, whichever has the higher WCAG contrast on `hex`.
function inkOn(hex: string): string {
  const n = parseInt(hex.slice(1, 7), 16);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return (l + 0.05) / 0.05 >= 1.05 / (l + 0.05) ? '#0a0b0d' : '#ffffff';
}

// 0–100 input scores the sample cell starts with.
const INITIAL: Record<string, number> = { humidity: 64, wind: 38, solar: 72, temperature: 80 };
// Greenery is a discount, not a signal: its score subtracts at this weight.
const GREEN_WEIGHT = 0.25;

// Section 4. The published ESI formula, made tangible: scrub each signal's 0–100
// score and the sample cell recomputes live. Greenery subtracts.
export function Formula() {
  const [values, setValues] = useState<Record<string, number>>(INITIAL);
  const [green, setGreen] = useState(20);
  const cellRef = useRef<HTMLDivElement>(null);

  const esi = useMemo(() => {
    const sum = SIGNALS.reduce((acc, s) => acc + s.weight * (values[s.key] ?? 0), 0);
    return Math.max(0, Math.min(100, sum - green * GREEN_WEIGHT));
  }, [values, green]);

  const { hex, band } = esiColor(esi);

  const bump = useCallback(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    anime({
      targets: cellRef.current,
      scale: [1.04, 1],
      duration: 420,
      easing: 'easeOutElastic(1, .6)',
    });
  }, []);

  const setValue = (key: string, value: number) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    bump();
  };

  return (
    <section id="formula" className="relative z-10 py-28">
      <div className="mx-auto w-full max-w-7xl px-5 md:px-8">
        <Reveal className="max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/45">
            04 · The index
          </p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
            One transparent formula. No black box.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-white/60">
            The Environmental Stress Index is a published weighted sum — drag a factor to see the
            cell respond. It is not a trained model, and not human stress.
          </p>
        </Reveal>

        <div className="mt-14 grid items-center gap-12 lg:grid-cols-[1.3fr_0.7fr] lg:gap-8">
          {/* Builder */}
          <div className="rounded-2xl border border-white/10 bg-[#0c0d10]/80 p-5 backdrop-blur-md md:p-8">
            <ul className="space-y-3">
              {SIGNALS.map((s) => (
                <li key={s.key}>
                  <FieldRow
                    label={s.label}
                    color={s.color}
                    value={values[s.key] ?? 0}
                    onChange={(v) => setValue(s.key, v)}
                  />
                </li>
              ))}
            </ul>

            {/* Greenery discount */}
            <div className="mt-4 border-t border-white/10 pt-4">
              <FieldRow
                label={GREENERY.label}
                color={GREENERY.color}
                value={green}
                onChange={(v) => {
                  setGreen(v);
                  bump();
                }}
              />
            </div>
            <p className="mt-4 font-mono text-[10px] text-white/35">
              Drag a field sideways · ↑/↓ to nudge · Shift ×10 · Alt ×0.1
            </p>
          </div>

          {/* Live sample cell — floats on the page, no panel */}
          <div className="flex flex-col items-center justify-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/60 [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]">
              Sample cell · H3
            </p>
            <div
              ref={cellRef}
              role="img"
              aria-label={`Sample cell: ESI ${Math.round(esi)}, ${band}`}
              className="relative mt-6 w-[200px] md:w-[232px]"
            >
              <HexPrism color={hex} />
              {/* Number sits on the centre of the top face. */}
              <span
                aria-hidden="true"
                className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl font-semibold tabular-nums transition-colors duration-300 md:text-5xl"
                style={{
                  top: `${(CY / VIEW_H) * 100}%`,
                  color: inkOn(hex),
                  textShadow: '0 1px 0 rgba(255,255,255,0.15)',
                }}
              >
                {Math.round(esi)}
              </span>
            </div>
            <p
              className="mt-7 rounded-full border bg-[#0e1013]/85 px-3 py-1 font-mono text-sm transition-colors duration-300"
              style={{
                borderColor: `${hex}66`,
                color: `color-mix(in srgb, ${hex} 55%, white)`,
              }}
            >
              {band}
            </p>
            <p className="mt-2 font-mono text-[10px] text-white/60 [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]">
              ESI 0–100
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/** One factor: a ScrubField for its 0–100 score. Dragging across the field's full
 *  width spans the full range, so the fill edge tracks the pointer 1:1. */
function FieldRow({
  label,
  color,
  value,
  onChange,
}: {
  label: string;
  color: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [sensitivity, setSensitivity] = useState(2);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSensitivity(Math.max(1, el.getBoundingClientRect().width / 100));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="font-mono text-white">
      <ScrubField
        label={label}
        suffix=""
        value={value}
        min={0}
        max={100}
        step={1}
        size="lg"
        sensitivity={sensitivity}
        accent={color}
        chipColor="#15171b"
        className="w-full! shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
        onChange={onChange}
      />
    </div>
  );
}

// Regular flat-top hexagon (circumradius R, so width:height = 2:√3), extruded
// straight down by DEPTH into a prism. The three lower side faces are the band
// colour darkened; the top face gets a light-from-above gradient and a bright
// rim. Fills transition so the prism recolours smoothly across ESI bands.
const R = 100;
const H = (R * Math.sqrt(3)) / 2;
const DEPTH = 24;
const CX = 110;
const CY = 10 + H;
const TOP = [
  [CX + R, CY],
  [CX + R / 2, CY + H],
  [CX - R / 2, CY + H],
  [CX - R, CY],
  [CX - R / 2, CY - H],
  [CX + R / 2, CY - H],
] as const;
const pts = (list: readonly (readonly [number, number])[]) =>
  list.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
const down = ([x, y]: readonly [number, number]) => [x, y + DEPTH] as const;
// Visible side faces: lower-right, bottom (front), lower-left.
const SIDES = [
  { face: [TOP[0], TOP[1], down(TOP[1]), down(TOP[0])], shade: 0.55 },
  { face: [TOP[1], TOP[2], down(TOP[2]), down(TOP[1])], shade: 0.4 },
  { face: [TOP[2], TOP[3], down(TOP[3]), down(TOP[2])], shade: 0.62 },
];
const VIEW_H = CY + H + DEPTH + 10;

function HexPrism({ color }: { color: string }) {
  return (
    <svg
      viewBox={`0 0 220 ${VIEW_H.toFixed(2)}`}
      className="block h-auto w-full overflow-visible transition-[filter] duration-300"
      style={{
        filter: `drop-shadow(0 16px 18px rgba(0,0,0,0.55)) drop-shadow(0 22px 34px ${color}55) drop-shadow(0 0 40px ${color}33)`,
      }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="esi-hex-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.34" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="1" stopColor="#000" stopOpacity="0.16" />
        </linearGradient>
        <linearGradient id="esi-hex-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {SIDES.map(({ face, shade }, i) => (
        <g key={i}>
          <polygon
            points={pts(face)}
            className="transition-[fill] duration-300"
            style={{ fill: color }}
          />
          <polygon points={pts(face)} fill="#000" fillOpacity={shade} />
        </g>
      ))}
      {/* Crisp edge between the front and side faces */}
      <polyline
        points={pts([down(TOP[0]), down(TOP[1]), down(TOP[2]), down(TOP[3])])}
        fill="none"
        stroke="#000"
        strokeOpacity="0.35"
        strokeWidth="1"
      />

      <polygon
        points={pts(TOP)}
        className="transition-[fill] duration-300"
        style={{ fill: color }}
      />
      <polygon points={pts(TOP)} fill="url(#esi-hex-top)" />
      <polygon
        points={pts(TOP)}
        fill="none"
        stroke="url(#esi-hex-rim)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
