'use client';

import { AUDIENCES } from '@/lib/landing/content';
import { Section, Reveal, RevealGroup, RevealItem } from './ui/section';

export function Audiences() {
  return (
    <Section>
      <Reveal className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-white/40">Who it&apos;s for</p>
        <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
          Built for the people who shape cities.
        </h2>
      </Reveal>

      <RevealGroup className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {AUDIENCES.map((a) => {
          const Icon = a.icon;
          return (
            <RevealItem key={a.title}>
              <div className="group h-full rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition-all hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.05]">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/5 text-emerald-300">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-white">{a.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{a.useCase}</p>
              </div>
            </RevealItem>
          );
        })}
      </RevealGroup>
    </Section>
  );
}
