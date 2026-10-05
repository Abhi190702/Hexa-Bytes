'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { ScatterplotLayer } from '@deck.gl/layers';
import { esiBand } from '@platform/shared-types';

// Self-contained hero visualization: a dark Delhi basemap with synthetic environmental
// "hotspots" that pulse — no live API/data dependency, so it always renders.

const DELHI: [number, number] = [77.209, 28.6139];
const STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

interface Hotspot {
  position: [number, number];
  intensity: number; // 0–100 -> ESI ramp color
  phase: number;
  base: number; // base radius (m)
}

function makeHotspots(): Hotspot[] {
  // Deterministic-ish spread around Delhi NCR (generated client-side only).
  const spots: Hotspot[] = [];
  for (let i = 0; i < 44; i++) {
    const r = Math.pow(Math.random(), 0.7) * 0.42; // denser toward centre
    const a = Math.random() * Math.PI * 2;
    spots.push({
      position: [DELHI[0] + r * Math.cos(a) * 1.1, DELHI[1] + r * Math.sin(a)],
      intensity: 30 + Math.random() * 65,
      phase: Math.random() * Math.PI * 2,
      base: 1400 + Math.random() * 3200,
    });
  }
  return spots;
}

export function HeroMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = new maplibregl.Map({
      container,
      style: STYLE,
      center: DELHI,
      zoom: 9.4,
      interactive: false, // background only; let the page scroll
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.on('error', () => {}); // tiles are best-effort for the hero

    const overlay = new MapboxOverlay({ interleaved: false, layers: [] });
    map.addControl(overlay as unknown as maplibregl.IControl);

    const hotspots = makeHotspots();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const render = (time: number) => {
      const t = time / 1000;
      const layers = [
        // soft glow
        new ScatterplotLayer<Hotspot>({
          id: 'glow',
          data: hotspots,
          getPosition: (d) => d.position,
          getRadius: (d) => d.base * (reduce ? 2 : 2 + 0.8 * Math.sin(t * 0.9 + d.phase)),
          getFillColor: (d) => {
            const c = esiBand(d.intensity).color;
            return [c[0], c[1], c[2], 38];
          },
          radiusUnits: 'meters',
          updateTriggers: { getRadius: reduce ? 0 : Math.floor(t * 30) },
        }),
        // core
        new ScatterplotLayer<Hotspot>({
          id: 'core',
          data: hotspots,
          getPosition: (d) => d.position,
          getRadius: (d) => d.base * (reduce ? 0.6 : 0.55 + 0.18 * Math.sin(t * 0.9 + d.phase)),
          getFillColor: (d) => {
            const c = esiBand(d.intensity).color;
            return [c[0], c[1], c[2], 190];
          },
          radiusUnits: 'meters',
          radiusMinPixels: 2,
          updateTriggers: { getRadius: reduce ? 0 : Math.floor(t * 30) },
        }),
      ];
      overlay.setProps({ layers });
    };

    render(0);
    let raf = 0;
    if (!reduce) {
      const loop = (time: number) => {
        render(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}
