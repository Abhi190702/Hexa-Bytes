'use client';

// React Bits "MagicBento" (reactbits.dev, TS + Tailwind variant), adapted for the landing
// page: the hard-coded demo cards are replaced by an `items` prop, each card may carry its own
// glow tint, the effects are toned down via props, and everything heavy (spotlight, particles,
// tilt, magnetism, ripple) switches off under prefers-reduced-motion, on narrow screens and on
// touch / no-hover devices — leaving a static bordered grid.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

export interface BentoItem {
  /** Stable key, also used for the card's accessible name when needed. */
  id: string;
  /** Free-form card body (number, icon, copy …). */
  content: React.ReactNode;
  /** Grid placement / sizing classes for this card. */
  className?: string;
  /** "r, g, b" glow tint for this card's border glow, particles and ripple. */
  glowColor?: string;
  /** Card background. */
  background?: string;
}

export interface BentoProps {
  items: BentoItem[];
  className?: string;
  enableStars?: boolean;
  enableSpotlight?: boolean;
  enableBorderGlow?: boolean;
  disableAnimations?: boolean;
  spotlightRadius?: number;
  /** Peak opacity of the cursor spotlight (0–1). */
  spotlightOpacity?: number;
  particleCount?: number;
  enableTilt?: boolean;
  /** Max tilt in degrees. */
  tiltStrength?: number;
  /** Fraction of the cursor's offset from centre the card follows. */
  magnetStrength?: number;
  /** "r, g, b" — spotlight colour and the fallback card tint. */
  glowColor?: string;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
}

const DEFAULT_PARTICLE_COUNT = 12;
const DEFAULT_SPOTLIGHT_RADIUS = 300;
const DEFAULT_GLOW_COLOR = '132, 0, 255';
const MOBILE_BREAKPOINT = 768;

const createParticleElement = (
  x: number,
  y: number,
  color: string = DEFAULT_GLOW_COLOR,
): HTMLDivElement => {
  const el = document.createElement('div');
  el.className = 'magic-bento__particle';
  el.style.cssText = `
    position: absolute;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: rgba(${color}, 0.9);
    box-shadow: 0 0 6px rgba(${color}, 0.5);
    pointer-events: none;
    z-index: 100;
    left: ${x}px;
    top: ${y}px;
  `;
  return el;
};

const calculateSpotlightValues = (radius: number) => ({
  proximity: radius * 0.5,
  fadeDistance: radius * 0.75,
});

const updateCardGlowProperties = (
  card: HTMLElement,
  mouseX: number,
  mouseY: number,
  glow: number,
  radius: number,
) => {
  const rect = card.getBoundingClientRect();
  const relativeX = ((mouseX - rect.left) / rect.width) * 100;
  const relativeY = ((mouseY - rect.top) / rect.height) * 100;

  card.style.setProperty('--glow-x', `${relativeX}%`);
  card.style.setProperty('--glow-y', `${relativeY}%`);
  card.style.setProperty('--glow-intensity', glow.toString());
  card.style.setProperty('--glow-radius', `${radius}px`);
};

const ParticleCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  disableAnimations?: boolean;
  style?: React.CSSProperties;
  particleCount?: number;
  glowColor?: string;
  enableTilt?: boolean;
  tiltStrength?: number;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
  magnetStrength?: number;
}> = ({
  children,
  className = '',
  disableAnimations = false,
  style,
  particleCount = DEFAULT_PARTICLE_COUNT,
  glowColor = DEFAULT_GLOW_COLOR,
  enableTilt = true,
  tiltStrength = 10,
  clickEffect = false,
  enableMagnetism = false,
  magnetStrength = 0.05,
}) => {
  const cardRef = useRef<HTMLLIElement>(null);
  const particlesRef = useRef<HTMLDivElement[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isHoveredRef = useRef(false);
  const memoizedParticles = useRef<HTMLDivElement[]>([]);
  const particlesInitialized = useRef(false);
  const magnetismAnimationRef = useRef<gsap.core.Tween | null>(null);

  const initializeParticles = useCallback(() => {
    if (particlesInitialized.current || !cardRef.current) return;

    const { width, height } = cardRef.current.getBoundingClientRect();
    memoizedParticles.current = Array.from({ length: particleCount }, () =>
      createParticleElement(Math.random() * width, Math.random() * height, glowColor),
    );
    particlesInitialized.current = true;
  }, [particleCount, glowColor]);

  const clearAllParticles = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    magnetismAnimationRef.current?.kill();

    particlesRef.current.forEach((particle) => {
      gsap.killTweensOf(particle);
      gsap.to(particle, {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        ease: 'back.in(1.7)',
        onComplete: () => {
          particle.parentNode?.removeChild(particle);
        },
      });
    });
    particlesRef.current = [];
  }, []);

  const animateParticles = useCallback(() => {
    if (!cardRef.current || !isHoveredRef.current) return;

    if (!particlesInitialized.current) {
      initializeParticles();
    }

    memoizedParticles.current.forEach((particle, index) => {
      const timeoutId = setTimeout(() => {
        if (!isHoveredRef.current || !cardRef.current) return;

        const clone = particle.cloneNode(true) as HTMLDivElement;
        cardRef.current.appendChild(clone);
        particlesRef.current.push(clone);

        gsap.fromTo(
          clone,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' },
        );

        gsap.to(clone, {
          x: (Math.random() - 0.5) * 80,
          y: (Math.random() - 0.5) * 80,
          rotation: Math.random() * 360,
          duration: 3 + Math.random() * 3,
          ease: 'none',
          repeat: -1,
          yoyo: true,
        });

        gsap.to(clone, {
          opacity: 0.25,
          duration: 1.8,
          ease: 'power2.inOut',
          repeat: -1,
          yoyo: true,
        });
      }, index * 120);

      timeoutsRef.current.push(timeoutId);
    });
  }, [initializeParticles]);

  useEffect(() => {
    if (disableAnimations || !cardRef.current) return;

    const element = cardRef.current;

    const handleMouseEnter = () => {
      isHoveredRef.current = true;
      if (particleCount > 0) animateParticles();
    };

    const handleMouseLeave = () => {
      isHoveredRef.current = false;
      clearAllParticles();

      if (enableTilt) {
        gsap.to(element, { rotateX: 0, rotateY: 0, duration: 0.4, ease: 'power2.out' });
      }

      if (enableMagnetism) {
        gsap.to(element, { x: 0, y: 0, duration: 0.4, ease: 'power2.out' });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!enableTilt && !enableMagnetism) return;

      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      if (enableTilt) {
        const rotateX = ((y - centerY) / centerY) * -tiltStrength;
        const rotateY = ((x - centerX) / centerX) * tiltStrength;

        gsap.to(element, {
          rotateX,
          rotateY,
          duration: 0.2,
          ease: 'power2.out',
          transformPerspective: 1000,
        });
      }

      if (enableMagnetism) {
        magnetismAnimationRef.current = gsap.to(element, {
          x: (x - centerX) * magnetStrength,
          y: (y - centerY) * magnetStrength,
          duration: 0.4,
          ease: 'power2.out',
        });
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (!clickEffect) return;

      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const maxDistance = Math.max(
        Math.hypot(x, y),
        Math.hypot(x - rect.width, y),
        Math.hypot(x, y - rect.height),
        Math.hypot(x - rect.width, y - rect.height),
      );

      const ripple = document.createElement('div');
      ripple.style.cssText = `
        position: absolute;
        width: ${maxDistance * 2}px;
        height: ${maxDistance * 2}px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(${glowColor}, 0.18) 0%, rgba(${glowColor}, 0.08) 30%, transparent 70%);
        left: ${x - maxDistance}px;
        top: ${y - maxDistance}px;
        pointer-events: none;
        z-index: 1000;
      `;

      element.appendChild(ripple);

      gsap.fromTo(
        ripple,
        { scale: 0, opacity: 1 },
        {
          scale: 1,
          opacity: 0,
          duration: 0.8,
          ease: 'power2.out',
          onComplete: () => ripple.remove(),
        },
      );
    };

    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('click', handleClick);

    return () => {
      isHoveredRef.current = false;
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('click', handleClick);
      clearAllParticles();
      // Drop any tilt / magnet offset left behind when effects get switched off.
      gsap.set(element, { clearProps: 'transform' });
    };
  }, [
    animateParticles,
    clearAllParticles,
    disableAnimations,
    particleCount,
    enableTilt,
    tiltStrength,
    enableMagnetism,
    magnetStrength,
    clickEffect,
    glowColor,
  ]);

  return (
    <li
      ref={cardRef}
      className={`${className} relative overflow-hidden`}
      style={{ ...style, position: 'relative', overflow: 'hidden' }}
    >
      {children}
    </li>
  );
};

const GlobalSpotlight: React.FC<{
  gridRef: React.RefObject<HTMLOListElement | null>;
  disableAnimations?: boolean;
  enabled?: boolean;
  spotlightRadius?: number;
  spotlightOpacity?: number;
  glowColor?: string;
}> = ({
  gridRef,
  disableAnimations = false,
  enabled = true,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  spotlightOpacity = 0.8,
  glowColor = DEFAULT_GLOW_COLOR,
}) => {
  useEffect(() => {
    const grid = gridRef.current;
    if (disableAnimations || !grid || !enabled) return;

    const spotlight = document.createElement('div');
    spotlight.className = 'magic-bento__spotlight';
    spotlight.setAttribute('aria-hidden', 'true');
    spotlight.style.cssText = `
      position: fixed;
      width: 800px;
      height: 800px;
      border-radius: 50%;
      pointer-events: none;
      background: radial-gradient(circle,
        rgba(${glowColor}, 0.15) 0%,
        rgba(${glowColor}, 0.08) 15%,
        rgba(${glowColor}, 0.04) 25%,
        rgba(${glowColor}, 0.02) 40%,
        rgba(${glowColor}, 0.01) 65%,
        transparent 70%
      );
      z-index: 200;
      opacity: 0;
      transform: translate(-50%, -50%);
      mix-blend-mode: screen;
    `;
    document.body.appendChild(spotlight);

    const cards = () => grid.querySelectorAll<HTMLElement>('.magic-bento__card');

    const handleMouseMove = (e: MouseEvent) => {
      const rect = grid.getBoundingClientRect();
      const mouseInside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (!mouseInside) {
        gsap.to(spotlight, { opacity: 0, duration: 0.3, ease: 'power2.out' });
        cards().forEach((card) => card.style.setProperty('--glow-intensity', '0'));
        return;
      }

      const { proximity, fadeDistance } = calculateSpotlightValues(spotlightRadius);
      let minDistance = Infinity;

      cards().forEach((card) => {
        const cardRect = card.getBoundingClientRect();
        const centerX = cardRect.left + cardRect.width / 2;
        const centerY = cardRect.top + cardRect.height / 2;
        const distance =
          Math.hypot(e.clientX - centerX, e.clientY - centerY) -
          Math.max(cardRect.width, cardRect.height) / 2;
        const effectiveDistance = Math.max(0, distance);

        minDistance = Math.min(minDistance, effectiveDistance);

        let glowIntensity = 0;
        if (effectiveDistance <= proximity) {
          glowIntensity = 1;
        } else if (effectiveDistance <= fadeDistance) {
          glowIntensity = (fadeDistance - effectiveDistance) / (fadeDistance - proximity);
        }

        updateCardGlowProperties(card, e.clientX, e.clientY, glowIntensity, spotlightRadius);
      });

      gsap.to(spotlight, { left: e.clientX, top: e.clientY, duration: 0.1, ease: 'power2.out' });

      const targetOpacity =
        minDistance <= proximity
          ? spotlightOpacity
          : minDistance <= fadeDistance
            ? ((fadeDistance - minDistance) / (fadeDistance - proximity)) * spotlightOpacity
            : 0;

      gsap.to(spotlight, {
        opacity: targetOpacity,
        duration: targetOpacity > 0 ? 0.2 : 0.5,
        ease: 'power2.out',
      });
    };

    const handleMouseLeave = () => {
      cards().forEach((card) => card.style.setProperty('--glow-intensity', '0'));
      gsap.to(spotlight, { opacity: 0, duration: 0.3, ease: 'power2.out' });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      gsap.killTweensOf(spotlight);
      spotlight.remove();
      cards().forEach((card) => card.style.setProperty('--glow-intensity', '0'));
    };
  }, [gridRef, disableAnimations, enabled, spotlightRadius, spotlightOpacity, glowColor]);

  return null;
};

/**
 * True on narrow viewports and on devices without a fine hovering pointer (touch), where the
 * cursor-driven effects either can't fire properly or cost more than they give.
 */
const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const coarse = window.matchMedia('(hover: none), (pointer: coarse)');
    const checkMobile = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT || coarse.matches);

    checkMobile();
    window.addEventListener('resize', checkMobile);
    coarse.addEventListener('change', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
      coarse.removeEventListener('change', checkMobile);
    };
  }, []);

  return isMobile;
};

// Static: per-card colours arrive as CSS custom properties, so nothing here is interpolated.
const BENTO_CSS = `
  .magic-bento__card--border-glow::after {
    content: '';
    position: absolute;
    inset: 0;
    padding: 1px;
    background: radial-gradient(var(--glow-radius) circle at var(--glow-x) var(--glow-y),
        rgba(var(--glow-color), calc(var(--glow-intensity) * 0.9)) 0%,
        rgba(var(--glow-color), calc(var(--glow-intensity) * 0.45)) 30%,
        transparent 70%);
    border-radius: inherit;
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask-composite: exclude;
    pointer-events: none;
    z-index: 1;
  }

  .magic-bento--animated .magic-bento__card--border-glow:hover {
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45), 0 0 28px rgba(var(--glow-color), 0.08);
  }

  .magic-bento__particle::before {
    content: '';
    position: absolute;
    inset: -2px;
    background: rgba(var(--glow-color), 0.15);
    border-radius: 50%;
    z-index: -1;
  }
`;

const MagicBento: React.FC<BentoProps> = ({
  items,
  className,
  enableStars = true,
  enableSpotlight = true,
  enableBorderGlow = true,
  disableAnimations = false,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  spotlightOpacity = 0.8,
  particleCount = DEFAULT_PARTICLE_COUNT,
  enableTilt = false,
  tiltStrength = 10,
  magnetStrength = 0.05,
  glowColor = DEFAULT_GLOW_COLOR,
  clickEffect = true,
  enableMagnetism = true,
}) => {
  const gridRef = useRef<HTMLOListElement>(null);
  const isMobile = useMobileDetection();
  const reducedMotion = useReducedMotion();
  const shouldDisableAnimations = disableAnimations || isMobile || reducedMotion;

  return (
    <>
      <style>{BENTO_CSS}</style>

      {enableSpotlight && (
        <GlobalSpotlight
          gridRef={gridRef}
          disableAnimations={shouldDisableAnimations}
          enabled={enableSpotlight}
          spotlightRadius={spotlightRadius}
          spotlightOpacity={spotlightOpacity}
          glowColor={glowColor}
        />
      )}

      <ol
        ref={gridRef}
        className={cn(
          'magic-bento relative grid select-none',
          !shouldDisableAnimations && 'magic-bento--animated',
          className,
        )}
      >
        {items.map((item) => {
          const tint = item.glowColor ?? glowColor;
          const cardStyle = {
            backgroundColor: item.background,
            '--glow-x': '50%',
            '--glow-y': '50%',
            '--glow-intensity': '0',
            '--glow-radius': '200px',
            '--glow-color': tint,
          } as React.CSSProperties;

          return (
            <ParticleCard
              key={item.id}
              className={cn(
                'magic-bento__card transition-[box-shadow,background-color] duration-300 ease-out',
                enableBorderGlow && 'magic-bento__card--border-glow',
                item.className,
              )}
              style={cardStyle}
              disableAnimations={shouldDisableAnimations}
              particleCount={enableStars ? particleCount : 0}
              glowColor={tint}
              enableTilt={enableTilt}
              tiltStrength={tiltStrength}
              clickEffect={clickEffect}
              enableMagnetism={enableMagnetism}
              magnetStrength={magnetStrength}
            >
              {item.content}
            </ParticleCard>
          );
        })}
      </ol>
    </>
  );
};

export default MagicBento;
