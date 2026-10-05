'use client';

import { motion } from 'framer-motion';
import { Thermometer, Users, Volume2, Wind } from 'lucide-react';
import { Section, Reveal, RevealGroup, RevealItem } from './ui/section';

const BURDENS = [
  { icon: Volume2, label: 'Noise', color: '#e67e22', desc: 'Traffic and machinery — a constant acoustic load.' },
  { icon: Users, label: 'Crowding', color: '#9b59b6', desc: 'Concentrated human activity and footfall.' },
  { icon: Thermometer, label: 'Heat', color: '#e74c3c', desc: 'Thermal load from concrete and lost greenery.' },
  { icon: Wind, label: 'Pollution', color: '#8b9bb0', desc: 'Airborne particulates you breathe every day.' },
];

export function WhatIsStress() {
  return (
    <Section id="what">
      <Reveal className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-white/40">What it is</p>
        <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
          Environmental stress is not{' '}
          <span className="text-white/40 line-through decoration-rose-400/60">psychological stress</span>.
        </h2>
        <p className="mt-6 text-lg leading-relaxed text-white/65">
          It&apos;s the measurable <span className="text-white">environmental burden</span> a place
          carries — how loud, crowded, hot and polluted it is. Four invisible forces, layered over
          every street:
        </p>
      </Reveal>

      <RevealGroup className="mt-12 space-y-3">
        {BURDENS.map((b) => {
          const Icon = b.icon;
          return (
            <RevealItem key={b.label}>
              <div className="group relative flex items-center gap-4 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-4 md:p-5">
                {/* flowing layer */}
                <motion.div
                  className="pointer-events-none absolute inset-0 opacity-30"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${b.color}55, transparent)`,
                    backgroundSize: '50% 100%',
                  }}
                  animate={{ backgroundPositionX: ['-50%', '150%'] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
                />
                <span
                  className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${b.color}22`, color: b.color }}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="relative">
                  <p className="text-base font-semibold text-white">{b.label}</p>
                  <p className="text-sm text-white/55">{b.desc}</p>
                </div>
              </div>
            </RevealItem>
          );
        })}
      </RevealGroup>
    </Section>
  );
}
