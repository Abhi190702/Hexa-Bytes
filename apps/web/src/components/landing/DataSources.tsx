'use client';

import { DATA_SOURCES } from '@/lib/landing/content';
import { Section, Reveal, RevealGroup, RevealItem } from './ui/section';
import { ConfidenceMeter } from './ui/confidence-meter';

export function DataSources() {
  return (
    <Section id="data">
      <Reveal className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-white/40">Data sources</p>
        <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
          Honest about every input.
        </h2>
        <p className="mt-6 text-lg leading-relaxed text-white/65">
          Each factor comes from a stated source with stated limits and a confidence rating.
          Where live sensors don&apos;t exist yet, we say so.
        </p>
      </Reveal>

      <RevealGroup className="mt-12 grid gap-5 sm:grid-cols-2">
        {DATA_SOURCES.map((d) => (
          <RevealItem key={d.name}>
            <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="text-lg font-semibold text-white">{d.name}</h3>
              <p className="mt-1 text-sm text-white/60">{d.source}</p>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-white/40">Update</dt>
                  <dd className="text-right text-white/70">{d.frequency}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-white/40">Precision</dt>
                  <dd className="text-right text-white/70">{d.precision}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-white/40">Limitation</dt>
                  <dd className="text-right text-white/70">{d.limitation}</dd>
                </div>
              </dl>
              <div className="mt-5 flex-1" />
              <ConfidenceMeter value={d.confidence} />
            </div>
          </RevealItem>
        ))}
      </RevealGroup>

      <Reveal className="mt-6">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-sm font-semibold text-white">How fresh is the data?</p>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/60">
            EvoComb serves periodic <span className="text-white/80">snapshots</span>, refreshed on a
            schedule (target: every few hours). <span className="text-white/80">Air quality and heat</span>{' '}
            shift through the day, while noise, crowding and greenery are structural and change
            slowly. It is <span className="text-white/80">not yet a real-time sensor feed</span> —
            live ESP32 streaming over MQTT/WebSockets is on the roadmap.
          </p>
        </div>
      </Reveal>
    </Section>
  );
}
