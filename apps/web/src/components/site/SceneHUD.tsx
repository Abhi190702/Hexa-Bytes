'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Fixed technical chrome over the canvas — the ESI legend and scroll-progress
 * rail.
 */
export function SceneHUD() {
  const [pct, setPct] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const on = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setPct(max > 0 ? window.scrollY / max : 0);
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-30 hidden md:block" aria-hidden>
      {/* Right scroll-progress rail */}
      <div className="absolute right-8 top-1/2 flex -translate-y-1/2 flex-col items-center gap-2">
        <span className="font-mono text-[9px] tracking-widest text-white/35">ESI</span>
        <div className="relative h-40 w-[3px] overflow-hidden rounded-full bg-white/10">
          <div
            ref={barRef}
            className="absolute inset-x-0 top-0 rounded-full bg-gradient-to-b from-emerald-400 via-amber-300 to-rose-500"
            style={{ height: `${Math.round(pct * 100)}%` }}
          />
        </div>
        <span className="font-mono text-[9px] tabular-nums text-white/45">
          {String(Math.round(pct * 100)).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}
