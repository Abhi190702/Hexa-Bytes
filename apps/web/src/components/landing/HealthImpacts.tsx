'use client';

import { HEALTH_IMPACTS } from '@/lib/landing/research';
import { Section, Reveal, RevealGroup, RevealItem } from './ui/section';
import { AnimatedNumber } from './ui/animated-number';
import { CitationCard } from './ui/citation-card';

export function HealthImpacts() {
  return (
    <Section id="science">
      <Reveal className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-white/40">Why it matters</p>
        <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
          The science is unambiguous.
        </h2>
        <p className="mt-6 text-lg leading-relaxed text-white/65">
          Decades of peer-reviewed research link these everyday environmental burdens to serious
          health outcomes. EvoComb maps <span className="text-white">exposure</span>, so cities can
          act on it.
        </p>
      </Reveal>

      <RevealGroup className="mt-14 grid gap-6 md:grid-cols-3">
        {HEALTH_IMPACTS.map((h) => (
          <RevealItem key={h.factor}>
            <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <p className="text-xs uppercase tracking-wide text-white/40">{h.factor}</p>
              <AnimatedNumber
                value={h.value}
                decimals={h.decimals ?? 0}
                prefix={h.prefix}
                suffix={h.suffix}
                className="mt-2 bg-gradient-to-r from-emerald-300 via-amber-300 to-rose-400 bg-clip-text text-4xl font-bold text-transparent md:text-5xl"
              />
              <p className="mt-2 text-sm leading-snug text-white/55">{h.caption}</p>
              <p className="mt-4 text-sm leading-relaxed text-white/70">{h.body}</p>
              <div className="mt-5 flex-1" />
              <CitationCard citation={h.citation} />
            </div>
          </RevealItem>
        ))}
      </RevealGroup>

      <Reveal className="mt-8">
        <p className="max-w-3xl text-xs leading-relaxed text-white/40">
          These are population-level associations from the cited studies, not individual diagnoses.
          EvoComb estimates environmental exposure — it is not medical advice.
        </p>
      </Reveal>
    </Section>
  );
}
