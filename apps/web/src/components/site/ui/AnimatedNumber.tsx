'use client';

import { useEffect, useRef } from 'react';
import anime from 'animejs';

/**
 * Anime.js count-up. Triggers once when scrolled into view. A micro-interaction
 * example: it animates a plain object and writes formatted text each frame,
 * rather than animating the DOM number directly, so we keep full control of
 * decimals/locale.
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
  duration = 1600,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const format = (n: number) =>
      `${prefix}${n.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}${suffix}`;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      el.textContent = format(value);
      return;
    }

    el.textContent = format(0);
    const obj = { n: 0 };
    let started = false;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !started) {
          started = true;
          anime({
            targets: obj,
            n: value,
            duration,
            easing: 'easeOutExpo',
            update: () => {
              el.textContent = format(obj.n);
            },
          });
          io.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, decimals, prefix, suffix, duration]);

  return <span ref={ref} className={className} />;
}
