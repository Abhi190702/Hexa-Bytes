'use client';

import { useEffect, useMemo, useState } from 'react';
import { SIGNALS, type Signal } from '@/lib/evocomb/signals';
import { CircularCarousel } from '../ui/CircularCarousel';
import { Reveal } from '../ui/Reveal';

// Section 2. Four weather signals on a 3D carousel, title + unit only. The
// section keeps its 180vh height (the storyboard times the four 3D layers across
// it) while the heading + carousel stay pinned.

// Card sizes are the size the content is laid out at; the carousel scales the
// whole ring down to fit its box.
const CARD = {
  desktop: { width: 340, aspectRatio: 0.85 },
  mobile: { width: 300, aspectRatio: 0.78 },
};

function useIsDesktop() {
  const [desktop, setDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return desktop;
}

function SignalCard({ s, index }: { s: Signal; index: number }) {
  return (
    <article
      className="flex h-full w-full flex-col rounded-2xl border p-5 md:p-6"
      style={{
        borderColor: `${s.color}59`,
        background: `linear-gradient(160deg, ${s.color}1f 0%, ${s.color}08 45%, transparent 75%), #0e1013`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05), inset 0 0 48px ${s.color}14`,
      }}
    >
      <header className="flex items-center justify-between">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: s.color, boxShadow: `0 0 12px ${s.color}` }}
        />
        <span className="font-mono text-xs text-white/45">
          {String(index + 1).padStart(2, '0')}
        </span>
      </header>
      <div className="mt-auto">
        <p className="font-mono text-5xl font-semibold tracking-tight" style={{ color: s.color }}>
          {s.unit}
        </p>
        <h3 className="mt-3 border-t border-white/10 pt-4 text-2xl font-semibold text-white">
          {s.label}
        </h3>
      </div>
    </article>
  );
}

export function WhatItMeasures() {
  const [active, setActive] = useState(0);
  const desktop = useIsDesktop();
  const card = desktop ? CARD.desktop : CARD.mobile;

  const items = useMemo(
    () =>
      SIGNALS.map((s, i) => ({
        key: s.key,
        label: s.label,
        content: <SignalCard s={s} index={i} />,
      })),
    [],
  );

  return (
    <section id="measure" className="relative z-10 min-h-[180vh]">
      <div className="sticky top-0 flex min-h-[100svh] items-center pt-14">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-8 px-5 md:grid-cols-[0.8fr_1.2fr] md:gap-12 md:px-8">
          {/* Intro */}
          <div>
            <Reveal>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/45">
                02 · Signals
              </p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
                Four signals, measured separately.
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-white/60">
                Each layer is scored 0–100 on its own terms before anything is combined. Some are
                sensor-grade; some are open-data proxies. We say which.
              </p>
            </Reveal>

            <div className="mt-8 flex gap-1.5">
              {SIGNALS.map((s, i) => (
                <span
                  key={s.key}
                  className="h-1 flex-1 rounded-full transition-all duration-500"
                  style={{
                    background: i === active ? s.color : 'rgba(255,255,255,0.12)',
                    boxShadow: i === active ? `0 0 10px ${s.color}99` : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Carousel — fills its box. On mobile it bleeds past the viewport so
              the front card stays large; the side cards are clipped. */}
          <div className="relative -mx-5 h-[440px] overflow-hidden md:mx-0 md:h-[560px] md:overflow-visible">
            <div className="absolute inset-y-0 left-1/2 w-[160%] -translate-x-1/2 md:w-full">
              <CircularCarousel
                items={items}
                preset="cylinder"
                intro="rise"
                speed={14}
                gap={25}
                tilt={-5}
                curve={0.35}
                perspective={2500}
                autoplay="drift"
                direction="left"
                momentum={0.6}
                snap
                pauseOnHover
                focusOnClick
                draggable
                parallax={0.3}
                stretch={0.5}
                depthFade={0.55}
                innerShade={0.6}
                captions={false}
                fadeColor="#0a0b0d"
                cornerRadius={16}
                cardWidth={card.width}
                aspectRatio={card.aspectRatio}
                onChange={setActive}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
