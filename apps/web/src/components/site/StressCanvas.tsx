'use client';

import { useEffect, useRef, useState } from 'react';
import { getSceneBus } from '@/lib/webgl/scene-state';
import { useReducedMotion, useDeviceProfile } from '@/hooks/useReducedMotion';
import { StressCanvasFallback } from './StressCanvasFallback';
import type { SceneController } from '@/lib/webgl/SceneController';

/**
 * Fixed full-screen WebGL backdrop. The scene is lazy-loaded (Three.js is only
 * imported on capable devices, after mount), capped DPR, and paused whenever
 * the tab is hidden. Reduced-motion / low-end devices get the static fallback
 * and never download or run the 3D code.
 */
export function StressCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<SceneController | null>(null);
  const reduced = useReducedMotion();
  const profile = useDeviceProfile(reduced);
  const [failed, setFailed] = useState(false);

  const useStatic = profile?.tier === 'static' || failed;

  useEffect(() => {
    if (!profile || profile.tier === 'static' || failed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let controller: SceneController | null = null;
    let cancelled = false;

    // Lazy import keeps Three.js out of the initial bundle.
    import('@/lib/webgl/SceneController')
      .then(({ SceneController: SC }) => {
        if (cancelled) return;
        controller = new SC(canvas, getSceneBus(), {
          dprCap: profile.dprCap,
          particles: profile.particles,
          reducedMotion: false,
        });
        controllerRef.current = controller;
        controller.start();
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    const onResize = () => controller?.resize();
    const onVisibility = () => {
      if (document.hidden) controller?.stop();
      else controller?.start();
    };
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      controller?.dispose();
      controllerRef.current = null;
    };
  }, [profile, failed]);

  return (
    <div className="fixed inset-0 z-0" aria-hidden>
      {useStatic ? (
        <StressCanvasFallback />
      ) : (
        <canvas ref={canvasRef} className="block h-full w-full" />
      )}
      {/* Legibility scrim so overlaid text always meets contrast. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(10,11,13,0.55)_85%)]" />
    </div>
  );
}
