'use client';

import { Section, Reveal } from './ui/section';

const HEX = '50,3 93,28 93,72 50,97 7,72 7,28';

export function Precision() {
  return (
    <Section>
      <div className="grid items-center gap-12 md:grid-cols-2">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">Precision</p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
            Regional intensity, not point precision.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-white/65">
            EvoComb estimates the environmental burden of an <span className="text-white">area</span>
            {' '}— each ~100–300&nbsp;m H3 hexagon — not the exact condition at a single address.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-white/65">
            <li className="flex gap-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              Sensors and stations are sparse, so values are spread across space by inverse-distance
              interpolation.
            </li>
            <li className="flex gap-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              Some sources are coarse (AQI ~km, temperature ~km) — honest about that resolution.
            </li>
            <li className="flex gap-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
              Every cell carries a <span className="text-white">confidence score</span> reflecting how
              much real data backs it.
            </li>
          </ul>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center">
              <svg viewBox="0 0 100 100" className="mx-auto h-24 w-24">
                <circle cx="50" cy="50" r="3.5" className="fill-white/60" />
              </svg>
              <p className="mt-3 text-sm font-medium text-white/80">A single point</p>
              <p className="mt-1 text-xs text-white/45">Not what we claim</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center">
              <svg viewBox="0 0 100 100" className="mx-auto h-24 w-24">
                <polygon points={HEX} fill="rgba(230,126,34,0.35)" stroke="rgba(230,126,34,0.9)" strokeWidth="2" />
              </svg>
              <p className="mt-3 text-sm font-medium text-white/80">A ~150 m cell</p>
              <p className="mt-1 text-xs text-white/45">What we map</p>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
