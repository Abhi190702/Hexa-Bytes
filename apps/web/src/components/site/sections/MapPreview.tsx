'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { GLOBE_LAYERS, layerGradient, type GlobeLayer } from '@/lib/evocomb/globe-layers';
import { HexGlobe } from '../HexGlobe';
import { Reveal } from '../ui/Reveal';

// Section 6. A draggable hex globe of illustrative cells: pick which signal (or
// the ESI) colours the land, hover a cell for its numbers, then go to the live map.
export function MapPreview() {
  const [layer, setLayer] = useState<GlobeLayer>('esi');
  const active = GLOBE_LAYERS.find((l) => l.key === layer) ?? GLOBE_LAYERS[0];

  return (
    <section id="map-preview" className="relative z-10 py-28">
      <div className="mx-auto w-full max-w-7xl px-5 md:px-8">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/45">
              06 · Map
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
              Explore it cell by cell.
            </h2>
          </div>
          <Link
            href="/map"
            className="group inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-transform hover:scale-[1.03]"
          >
            Open the live map
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </Reveal>

        {/* Layer chips */}
        <div
          role="group"
          aria-label="Globe layer"
          className="mt-12 flex flex-wrap items-center justify-center gap-1.5"
        >
          {GLOBE_LAYERS.map((l) => {
            const on = l.key === layer;
            return (
              <button
                key={l.key}
                type="button"
                aria-pressed={on}
                onClick={() => setLayer(l.key)}
                className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-white/40 ${
                  on
                    ? 'bg-[#15171b]/90 text-white ring-1 ring-inset ring-white/20 backdrop-blur-md'
                    : 'bg-[#0a0b0d]/70 text-white/70 backdrop-blur-md hover:text-white'
                }`}
              >
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full transition-opacity"
                  style={{
                    background: l.key === 'esi' ? layerGradient('esi') : l.color,
                    opacity: on ? 1 : 0.55,
                  }}
                />
                {l.label}
              </button>
            );
          })}
        </div>

        {/* Globe */}
        <div className="relative mx-auto mt-6 aspect-square w-full max-w-[560px]">
          <HexGlobe layer={layer} />

          {/* Corner key + hint sit on small dark plates so they stay legible over the
              bright backdrop field. */}
          <div className="pointer-events-none absolute bottom-1 left-0 w-36 rounded-lg bg-[#0a0b0d]/75 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/80 backdrop-blur-md">
            <div className="truncate">{active?.label}</div>
            <div
              className="mt-1.5 h-[3px] rounded-full"
              style={{ background: layerGradient(layer) }}
            />
            <div className="mt-1 flex justify-between text-white/55">
              <span>0</span>
              <span>100</span>
            </div>
          </div>
          <p className="pointer-events-none absolute bottom-1 right-0 max-w-[9.5rem] rounded-lg bg-[#0a0b0d]/75 px-3 py-2 text-right md:max-w-none font-mono text-[10px] uppercase tracking-[0.14em] text-white/65 backdrop-blur-md">
            <span className="hidden md:inline">Drag to rotate · hover a cell</span>
            <span className="md:hidden">Swipe to rotate · tap a cell</span>
          </p>
        </div>

        <p className="mx-auto mt-6 w-fit rounded-full bg-[#0a0b0d]/75 px-3 py-1 text-center font-mono text-[10px] text-white/60 backdrop-blur-md">
          Globe is illustrative · the live map serves real ingested cells from /stress/cells.
        </p>
      </div>
    </section>
  );
}
