'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Reveal } from '../ui/Reveal';

// Section 8. Quiet, confident close.
export function FinalCTA() {
  return (
    <section id="deploy" className="relative z-10 flex min-h-[80vh] items-center py-28">
      <div className="mx-auto w-full max-w-3xl px-5 text-center md:px-8">
        <Reveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/45">08 · Start</p>
          <h2 className="mt-5 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-white md:text-6xl">
            See The Globe as one{' '}
            <span className="bg-gradient-to-r from-emerald-300 via-amber-300 to-rose-400 bg-clip-text text-transparent">
              stress layer.
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/60">
            Street-level where data allows. Honest where it does not. Built for planning, research and
            public-health context.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/map"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-black transition-transform hover:scale-[1.03]"
            >
              Explore the live map
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#evidence"
              className="rounded-full border border-white/20 px-7 py-3.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/5"
            >
              Review the evidence
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
