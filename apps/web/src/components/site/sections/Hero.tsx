'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { gsap } from 'gsap';

// Section 1. Minimal copy over the breathing hex field. The headline draws in
// word-by-word with GSAP; everything else is restrained.
export function Hero() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const items = el.querySelectorAll('[data-anim]');
    if (reduced) {
      gsap.set(items, { opacity: 1, y: 0 });
      return;
    }
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(items, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, delay: 0.15 });
    return () => {
      tl.kill();
    };
  }, []);

  return (
    <section id="hero" className="relative z-10 flex min-h-[100svh] items-center">
      <div ref={ref} className="mx-auto w-full max-w-7xl px-5 md:px-8">
        <div className="max-w-3xl">
          <h1
            data-anim
            className="text-balance text-[2.6rem] font-semibold leading-[1.02] tracking-tight text-white sm:text-6xl md:text-7xl"
          >
            Four signals.
            <br />
            One global-scale{' '}
            <span className="bg-gradient-to-r from-emerald-300 via-amber-300 to-rose-400 bg-clip-text text-transparent">
              stress layer.
            </span>
          </h1>

          <p data-anim className="mt-7 max-w-xl text-pretty text-base leading-relaxed text-white/65 md:text-lg">
            EvoComb blends relative humidity, wind speed, solar radiation and temperature into a
            single Environmental Stress Index across The Globe — street-level where data allows,
            honest where it does not.
          </p>

          <div data-anim className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/map"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.03]"
            >
              Explore the live map
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#measure"
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/5"
            >
              How it works
            </a>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
        scroll to reveal ↓
      </div>
    </section>
  );
}
