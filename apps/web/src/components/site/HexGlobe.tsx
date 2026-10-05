'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useDeviceProfile, useReducedMotion } from '@/hooks/useReducedMotion';
import { SIGNALS } from '@/lib/evocomb/signals';
import type { GlobeLayer } from '@/lib/evocomb/globe-layers';
import type { HexGlobeController } from '@/lib/webgl/HexGlobeController';

// Static SVG still for no-WebGL / low-end devices; loaded only when needed.
const HexGlobeFallback = dynamic(() => import('./HexGlobeFallback'), { ssr: false });

interface HoverInfo {
  index: number;
  lat: number;
  lon: number;
  rows: [string, number][];
}

const fmtLat = (v: number) => `${Math.abs(v).toFixed(0)}°${v >= 0 ? 'N' : 'S'}`;
const fmtLon = (v: number) => `${Math.abs(v).toFixed(0)}°${v >= 0 ? 'E' : 'W'}`;

/**
 * Draggable hex globe for the "06 · Map" section. Three.js is lazy-imported on
 * capable devices only, DPR is capped, and the render loop stops whenever the
 * globe is off-screen or the tab is hidden. Reduced motion keeps the live globe
 * (drag still rotates directly) but drops the idle spin and inertia.
 */
export function HexGlobe({ layer }: { layer: GlobeLayer }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<HexGlobeController | null>(null);
  const layerRef = useRef(layer);
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  // Hardware tier only: reduced motion is handled inside the live globe instead.
  const profile = useDeviceProfile(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState<HoverInfo | null>(null);

  const useStatic = profile?.tier === 'static' || failed;

  useEffect(() => {
    layerRef.current = layer;
    controllerRef.current?.setLayer(layer);
  }, [layer]);

  useEffect(() => {
    reducedRef.current = reduced;
    controllerRef.current?.setReducedMotion(reduced);
  }, [reduced]);

  useEffect(() => {
    if (!profile || profile.tier === 'static' || failed) return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    let controller: HexGlobeController | null = null;
    let cancelled = false;
    let inView = false;
    let lastIndex = -1;

    const sync = () => controller?.setVisible(inView && !document.hidden);

    const onHover = (index: number, x: number, y: number) => {
      const tip = tipRef.current;
      if (index < 0) {
        if (lastIndex !== -1) setHover(null);
        lastIndex = -1;
        return;
      }
      if (tip) {
        // Flip to the other side of the cursor near the right/bottom edges.
        const w = wrap.clientWidth;
        const h = wrap.clientHeight;
        const tx = x + 16 + tip.offsetWidth > w ? x - 16 - tip.offsetWidth : x + 16;
        const ty = y + 16 + tip.offsetHeight > h ? y - 16 - tip.offsetHeight : y + 16;
        tip.style.transform = `translate(${Math.round(tx)}px, ${Math.round(ty)}px)`;
      }
      if (index === lastIndex || !controller) return;
      lastIndex = index;
      const { lat, lon, scores } = controller.cells;
      setHover({
        index,
        lat: lat[index] ?? 0,
        lon: lon[index] ?? 0,
        rows: [
          ['ESI', scores.esi[index] ?? 0],
          ...SIGNALS.map((s) => [s.label, scores[s.key]?.[index] ?? 0] as [string, number]),
        ],
      });
    };

    import('@/lib/webgl/HexGlobeController')
      .then(({ HexGlobeController: HGC }) => {
        if (cancelled) return;
        controller = new HGC(canvas, {
          dprCap: profile.dprCap,
          reducedMotion: reducedRef.current,
          layer: layerRef.current,
          onHover,
        });
        controllerRef.current = controller;
        if (process.env.NODE_ENV !== 'production') {
          (canvas as HTMLCanvasElement & { __globe?: HexGlobeController }).__globe = controller;
        }
        sync();
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry?.isIntersecting ?? false;
        sync();
      },
      { rootMargin: '100px' },
    );
    io.observe(wrap);
    document.addEventListener('visibilitychange', sync);

    return () => {
      cancelled = true;
      io.disconnect();
      document.removeEventListener('visibilitychange', sync);
      controller?.dispose();
      controllerRef.current = null;
    };
  }, [profile, failed]);

  if (useStatic) return <HexGlobeFallback layer={layer} />;

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label="Interactive 3D globe of illustrative Environmental Stress cells. Drag or use the arrow keys to rotate; plus and minus zoom."
        className={`block h-full w-full cursor-grab touch-pan-y touch-pinch-zoom rounded-full outline-none transition-opacity duration-700 focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-white/30 ${
          ready ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        ref={tipRef}
        aria-hidden
        className={`pointer-events-none absolute left-0 top-0 whitespace-nowrap font-mono text-[10px] leading-[1.6] text-white/55 transition-opacity duration-150 ${
          hover ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {hover && (
          <div className="rounded-md bg-[#0a0b0d]/80 px-2.5 py-2 backdrop-blur-sm">
            <div className="mb-1 text-white/40">
              ≈ {fmtLat(hover.lat)} {fmtLon(hover.lon)}
            </div>
            {hover.rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-5">
                <span>{label}</span>
                <span className="tabular-nums text-white/85">{Math.round(value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
