'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { GREENERY, HEURISTICS } from '@/lib/heuristics';
import { Section, Reveal, RevealGroup, RevealItem } from './ui/section';

const PIPELINE = [
  { step: 'Collect', detail: 'Live APIs + open geospatial data' },
  { step: 'Normalize', detail: 'Each factor → a 0–100 score' },
  { step: 'Weight', detail: 'Blend by research-based weights' },
  { step: 'Aggregate', detail: 'Roll up to H3 hexagonal cells' },
];

export function Methodology() {
  return (
    <Section id="method">
      <Reveal className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-white/40">How it works</p>
        <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
          One transparent index. No black box.
        </h2>
        <p className="mt-6 text-lg leading-relaxed text-white/65">
          The <span className="text-white">Environmental Stress Index (ESI)</span> is a plain
          weighted formula — not a trained model and not human stress. Every input and weight is
          published.
        </p>
      </Reveal>

      {/* Weights */}
      <Reveal className="mt-14 rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
        <p className="mb-5 text-sm font-medium text-white/70">Factor weights</p>
        <div className="space-y-4">
          {HEURISTICS.map((h) => (
            <div key={h.key}>
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="text-white/80">{h.label}</span>
                <span className="font-mono text-white/50">{Math.round(h.weight * 100)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: h.color }}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${h.weight * 100}%` }}
                  viewport={{ once: true, margin: '-15%' }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Formula */}
        <div className="mt-7 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-white/50">ESI =</span>
          {HEURISTICS.map((h, i) => (
            <span key={h.key} className="flex items-center gap-1.5">
              <span className="rounded px-2 py-0.5 font-medium text-white" style={{ backgroundColor: h.color }}>
                {Math.round(h.weight * 100)}% {h.label}
              </span>
              {i < HEURISTICS.length - 1 && <span className="text-white/40">+</span>}
            </span>
          ))}
          <span
            className="ml-1 rounded px-2 py-0.5 font-medium text-white"
            style={{ backgroundColor: GREENERY.color }}
          >
            − greenery
          </span>
        </div>
      </Reveal>

      {/* Pipeline */}
      <RevealGroup className="mt-8 grid gap-3 md:grid-cols-7 md:items-stretch">
        {PIPELINE.map((p, i) => (
          <RevealItem key={p.step} className={i < PIPELINE.length - 1 ? 'md:col-span-2' : 'md:col-span-1'}>
            <div className="flex h-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div>
                <p className="text-sm font-semibold text-white">{p.step}</p>
                <p className="text-xs text-white/50">{p.detail}</p>
              </div>
              {i < PIPELINE.length - 1 && (
                <ArrowRight className="ml-auto hidden h-4 w-4 shrink-0 text-white/30 md:block" />
              )}
            </div>
          </RevealItem>
        ))}
      </RevealGroup>
    </Section>
  );
}
