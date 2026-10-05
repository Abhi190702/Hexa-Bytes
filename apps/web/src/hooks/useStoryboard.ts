'use client';

import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getSceneBus } from '@/lib/webgl/scene-state';
import { sampleStoryboard } from '@/lib/evocomb/storyboard';

/**
 * Drives the whole WebGL backdrop from one scrubbed ScrollTrigger spanning the
 * page, sampling the keyframed storyboard and patching the SceneBus. Single
 * authority = no per-section uniform fights, perfectly scroll-locked motion.
 */
export function useStoryboard(targetRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    gsap.registerPlugin(ScrollTrigger);
    const bus = getSceneBus();

    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => bus.patch(sampleStoryboard(self.progress)),
    });

    bus.patch(sampleStoryboard(0));
    return () => st.kill();
  }, [targetRef]);
}
