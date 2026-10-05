'use client';

import { SIGNALS } from '@/lib/evocomb/signals';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { Reveal } from '../ui/Reveal';

interface Impact {
  key: string;
  /** Sourced headline figure on the observed trend. */
  stat: {
    value: number;
    decimals: number;
    prefix?: string;
    suffix: string;
    caption: string;
    source: string;
    link: string;
  };
  info: string;
}

// How each signal reaches the index, with a sourced figure on its observed trend.
const IMPACTS: Impact[] = [
  {
    key: 'temperature',
    stat: {
      value: 1.55,
      decimals: 2,
      prefix: '+',
      suffix: '°C',
      caption:
        'global temperature in 2024 above the 1850–1900 average — the warmest year on record',
      source: 'WMO · State of the Global Climate 2024 (2025)',
      link: 'https://wmo.int/publication-series/state-of-global-climate/state-of-global-climate-2024',
    },
    info: 'Heat compounds with the other signals: warm air feels heavier when humid and harsher under strong sun, so hot cells rarely score high on temperature alone.',
  },
  {
    key: 'solar',
    stat: {
      value: 0.4,
      decimals: 1,
      prefix: '+',
      suffix: '%',
      caption:
        'more sunlight absorbed by Earth in 2013–2022 than in 2000–2010 (+0.9 W/m²), doubling its energy imbalance',
      source: 'Loeb NG, et al. · Surveys in Geophysics (2024), NASA CERES',
      link: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11671437/',
    },
    info: 'Incoming sunlight heats the ground and the air above it, so sunny cells usually score higher on temperature too — solar radiation lifts the index through both terms.',
  },
  {
    key: 'humidity',
    stat: {
      value: 1,
      decimals: 0,
      prefix: '+',
      suffix: '%',
      caption:
        'more water vapour in the global atmosphere per decade (1988–2014), though relative humidity over land has fallen since ~2000 as land warms faster',
      source: 'Allan RP, et al. · J. Geophys. Res. Atmospheres (2022)',
      link: 'https://doi.org/10.1029/2022JD036728',
    },
    info: 'Humid air holds heat and slows cooling, so high-humidity cells tend to stay high on temperature too, compounding the score.',
  },
];

// Section 3. Three signals: a large animated figure on the observed trend, then
// how the signal feeds the index.
export function WhyItMatters() {
  return (
    <section id="evidence-why" className="relative z-10 py-28">
      <div className="mx-auto w-full max-w-7xl px-5 md:px-8">
        <Reveal className="max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/45">
            03 · Why it matters
          </p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
            How each signal moves the index.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] md:grid-cols-3">
          {IMPACTS.map(({ key, stat, info }) => {
            const s = SIGNALS.find((x) => x.key === key);
            if (!s) return null;
            return (
              <article key={key} className="flex flex-col bg-[#0a0b0d]/85 p-7">
                <div className="mb-5 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-white/50">
                    {s.label}
                  </span>
                </div>

                <div
                  className="text-5xl font-semibold tracking-tight md:text-6xl"
                  style={{ color: s.color }}
                >
                  <AnimatedNumber
                    value={stat.value}
                    decimals={stat.decimals}
                    prefix={stat.prefix ?? ''}
                    suffix={stat.suffix}
                  />
                </div>

                <p className="mt-4 text-[15px] leading-relaxed text-white/75">{stat.caption}</p>

                <p className="mt-6 border-t border-white/10 pt-5 text-[14px] leading-relaxed text-white/60">
                  {info}
                </p>

                <a
                  href={stat.link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-auto pt-6 font-mono text-[11px] leading-relaxed text-white/40 transition-colors hover:text-white/70"
                >
                  {stat.source} ↗
                </a>
              </article>
            );
          })}
        </div>

        <Reveal className="mt-6">
          <p className="font-mono text-[11px] text-white/40">
            Built for planning, research and public-health context — not diagnosis.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
