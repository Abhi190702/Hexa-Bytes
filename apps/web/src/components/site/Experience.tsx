'use client';

import { useRef } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSmoothScroll } from '@/hooks/useSmoothScroll';
import { useStoryboard } from '@/hooks/useStoryboard';
import { StressCanvas } from './StressCanvas';
import { SceneHUD } from './SceneHUD';
import { SiteNav } from './SiteNav';
import { Hero } from './sections/Hero';
import { WhatItMeasures } from './sections/WhatItMeasures';
import { WhyItMatters } from './sections/WhyItMatters';
import { Formula } from './sections/Formula';
import { Pipeline } from './sections/Pipeline';
import { MapPreview } from './sections/MapPreview';
import { EvidenceLayer } from './sections/EvidenceLayer';
import { FinalCTA } from './sections/FinalCTA';
import { SiteFooter } from './sections/SiteFooter';

/**
 * Client root for the EvoComb experience. Owns the smooth-scroll engine, the
 * single storyboard ScrollTrigger that drives the WebGL backdrop, and the eight
 * content sections that float above the fixed canvas.
 */
export function Experience() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useSmoothScroll(reduced);
  useStoryboard(scrollRef);

  return (
    <div ref={scrollRef} className="relative bg-[#0a0b0d] text-white antialiased">
      {/* Fixed full-screen WebGL backdrop (lazy, capability-gated). */}
      <StressCanvas />
      <SceneHUD />
      <SiteNav />

      <main className="relative">
        <Hero />
        <WhatItMeasures />
        <WhyItMatters />
        <Formula />
        <Pipeline />
        <MapPreview />
        <EvidenceLayer />
        <FinalCTA />
      </main>

      <SiteFooter />
    </div>
  );
}
