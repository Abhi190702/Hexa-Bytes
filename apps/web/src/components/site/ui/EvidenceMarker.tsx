'use client';

import { useEffect, useRef } from 'react';
import anime from 'animejs';
import type { EvidenceMarker as MarkerType } from '@/lib/evocomb/evidence';

/**
 * A small, looping signal marker per evidence card. Each marker animates in the
 * language of its factor: noise = pulse rings, pollution = drifting haze,
 * heat = throb, PM2.5 = a bar crossing a threshold line, limitation = a hex
 * grid lighting unevenly. Pauses entirely under reduced-motion.
 */
export function EvidenceMarker({ type, color }: { type: MarkerType; color: string }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const anims: anime.AnimeInstance[] = [];
    const q = (s: string) => el.querySelectorAll(s);

    if (type === 'wave') {
      anims.push(
        anime({
          targets: q('.ring'),
          r: [4, 17],
          opacity: [0.9, 0],
          easing: 'easeOutSine',
          duration: 1800,
          delay: anime.stagger(600),
          loop: true,
        }),
      );
    } else if (type === 'haze') {
      anims.push(
        anime({
          targets: q('.puff'),
          translateX: [-3, 3],
          translateY: [1, -2],
          opacity: [0.3, 0.8, 0.3],
          direction: 'alternate',
          easing: 'easeInOutSine',
          duration: 2200,
          delay: anime.stagger(250),
          loop: true,
        }),
      );
    } else if (type === 'heat') {
      anims.push(
        anime({ targets: q('.core'), scale: [0.7, 1.1], opacity: [0.6, 1], direction: 'alternate', easing: 'easeInOutQuad', duration: 900, loop: true }),
      );
    } else if (type === 'threshold') {
      anims.push(
        anime({ targets: q('.bar'), height: [4, 22], translateY: [18, 0], direction: 'alternate', easing: 'easeInOutQuad', duration: 1400, loop: true }),
      );
    } else if (type === 'grid') {
      anims.push(
        anime({ targets: q('.cell'), opacity: [0.2, 1], scale: [0.85, 1], delay: anime.stagger(180, { from: 'center' }), direction: 'alternate', easing: 'easeInOutSine', duration: 700, loop: true }),
      );
    }
    return () => anims.forEach((a) => a.pause());
  }, [type]);

  const common = { width: 40, height: 40, viewBox: '0 0 40 40' } as const;

  return (
    <svg ref={ref} {...common} fill="none" aria-hidden className="shrink-0">
      {type === 'wave' &&
        [0, 1, 2].map((i) => <circle key={i} className="ring" cx="20" cy="20" r="4" stroke={color} strokeWidth="2" />)}

      {type === 'haze' &&
        [8, 16, 24, 32].map((x, i) => (
          <circle key={i} className="puff" cx={x} cy={20 + (i % 2 ? 4 : -3)} r="5" fill={color} opacity="0.5" />
        ))}

      {type === 'heat' && (
        <>
          <circle cx="20" cy="20" r="16" stroke={color} strokeWidth="1.5" opacity="0.3" />
          <circle className="core" cx="20" cy="20" r="9" fill={color} style={{ transformOrigin: '20px 20px' }} />
        </>
      )}

      {type === 'threshold' && (
        <>
          <line x1="6" y1="14" x2="34" y2="14" stroke={color} strokeWidth="1.5" strokeDasharray="3 3" />
          {[10, 18, 26].map((x, i) => (
            <rect key={i} className="bar" x={x} y={18} width="5" height="18" rx="1.5" fill={color} opacity={0.5 + i * 0.2} style={{ transformOrigin: `${x}px 36px` }} />
          ))}
        </>
      )}

      {type === 'grid' &&
        ([
          [14, 13],
          [26, 13],
          [20, 20],
          [14, 27],
          [26, 27],
        ] as [number, number][]).map(([cx, cy], i) => (
          <polygon
            key={i}
            className="cell"
            points={Array.from({ length: 6 }, (_, k) => {
              const a = (Math.PI / 180) * (60 * k - 90);
              return `${cx + 6 * Math.cos(a)},${cy + 6 * Math.sin(a)}`;
            }).join(' ')}
            fill={color}
            opacity="0.5"
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
        ))}
    </svg>
  );
}
