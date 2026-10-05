'use client';

import { useEffect, useState } from 'react';

/** Tracks `prefers-reduced-motion`, updating live if the user changes it. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

/**
 * Picks WebGL quality from device hints. Returns null until measured (so the
 * caller can render the static fallback first, then upgrade). `tier` decides
 * whether we mount the live scene at all.
 */
export interface DeviceProfile {
  tier: 'full' | 'lite' | 'static';
  dprCap: number;
  particles: number;
}

export function useDeviceProfile(reducedMotion: boolean): DeviceProfile | null {
  const [profile, setProfile] = useState<DeviceProfile | null>(null);
  useEffect(() => {
    if (reducedMotion) {
      setProfile({ tier: 'static', dprCap: 1, particles: 0 });
      return;
    }
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    const cores = navigator.hardwareConcurrency ?? 8;
    const mobile = window.matchMedia('(max-width: 768px)').matches;

    // Probe for a working WebGL context before committing to the live scene.
    let webgl = false;
    try {
      const c = document.createElement('canvas');
      webgl = !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      webgl = false;
    }

    if (!webgl || mem <= 2 || cores <= 2) {
      setProfile({ tier: 'static', dprCap: 1, particles: 0 });
    } else if (mobile || mem <= 4 || cores <= 4) {
      setProfile({ tier: 'lite', dprCap: 1.5, particles: 600 });
    } else {
      setProfile({ tier: 'full', dprCap: 1.75, particles: 1400 });
    }
  }, [reducedMotion]);
  return profile;
}
