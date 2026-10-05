'use client';

import { RESEARCH } from '@/lib/landing/research';
import { Section, Reveal, RevealGroup, RevealItem } from './ui/section';
import { CitationCard } from './ui/citation-card';

export function Research() {
  return (
    <Section id="research">
      <Reveal className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-white/40">Research</p>
        <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
          Grounded in published science.
        </h2>
        <p className="mt-6 text-lg leading-relaxed text-white/65">
          Every health claim on this page traces to a peer-reviewed study or WHO guideline. The full
          reference list:
        </p>
      </Reveal>

      <div className="mt-12 space-y-10">
        {RESEARCH.map((g) => (
          <div key={g.group}>
            <Reveal>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/50">
                {g.group}
              </h3>
            </Reveal>
            <RevealGroup className="grid gap-4 md:grid-cols-2">
              {g.items.map((c) => (
                <RevealItem key={c.title}>
                  <CitationCard citation={c} />
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        ))}
      </div>
    </Section>
  );
}
