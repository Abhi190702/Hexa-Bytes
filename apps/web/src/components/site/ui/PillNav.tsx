'use client';

/**
 * PillNav — adapted from React Bits (reactbits.dev/r/PillNav-TS-TW). Kept: the
 * GSAP hover circle + label swap, the load-in animation and the mobile
 * hamburger popover. Changed for this site: next/link instead of react-router,
 * a ReactNode logo (only `logo` spins, `logoLabel` stays put), in-page `#`
 * anchors routed through `onAnchorNavigate` (Lenis), a dark backplate decoupled
 * from the hover colour, an optional per-item icon, and reduced-motion support.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { cn } from '@/lib/utils';

export type PillNavItem = {
  label: string;
  href: string;
  ariaLabel?: string;
  icon?: ReactNode;
};

export interface PillNavProps {
  /** The mark that spins on hover. */
  logo: ReactNode;
  /** Text beside the mark; does not spin. */
  logoLabel?: ReactNode;
  logoHref?: string;
  logoAriaLabel?: string;
  items: PillNavItem[];
  activeHref?: string;
  className?: string;
  ease?: string;
  /** Hover-circle fill, active dot and hamburger lines. */
  baseColor?: string;
  pillColor?: string;
  hoveredPillTextColor?: string;
  pillTextColor?: string;
  /** Backplate behind the pill row, the logo pill, hamburger and mobile menu. */
  navBgColor?: string;
  borderColor?: string;
  /** Called for `#id` hrefs instead of the native jump; return false to fall back. */
  onAnchorNavigate?: (href: string) => boolean;
  onMobileMenuClick?: () => void;
  initialLoadAnimation?: boolean;
}

const isHashLink = (href: string) => href.startsWith('#');
const isExternalLink = (href: string) =>
  href.startsWith('http://') ||
  href.startsWith('https://') ||
  href.startsWith('//') ||
  href.startsWith('mailto:') ||
  href.startsWith('tel:');
const isRouterLink = (href: string) => !isHashLink(href) && !isExternalLink(href);

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function PillNav({
  logo,
  logoLabel,
  logoHref = '/',
  logoAriaLabel = 'Home',
  items,
  activeHref,
  className,
  ease = 'power3.easeOut',
  baseColor = '#fff',
  pillColor = '#120F17',
  hoveredPillTextColor = '#120F17',
  pillTextColor,
  navBgColor = 'rgba(10, 11, 13, 0.72)',
  borderColor = 'rgba(255, 255, 255, 0.1)',
  onAnchorNavigate,
  onMobileMenuClick,
  initialLoadAnimation = true,
}: PillNavProps) {
  const resolvedPillTextColor = pillTextColor ?? baseColor;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const circleRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const tlRefs = useRef<Array<gsap.core.Timeline | null>>([]);
  const activeTweenRefs = useRef<Array<gsap.core.Tween | null>>([]);
  const logoMarkRef = useRef<HTMLSpanElement | null>(null);
  const logoTweenRef = useRef<gsap.core.Tween | null>(null);
  const hamburgerRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const navItemsRef = useRef<HTMLDivElement | null>(null);
  const logoRef = useRef<HTMLAnchorElement | null>(null);
  const reducedRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedRef.current = mq.matches;
    const on = () => (reducedRef.current = mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // Layout effect so the load-in starting state is applied before first paint.
  useLayoutEffect(() => {
    const layout = () => {
      circleRefs.current.forEach((circle) => {
        if (!circle?.parentElement) return;

        const pill = circle.parentElement;
        const { width: w, height: h } = pill.getBoundingClientRect();
        // Hidden (mobile) pills measure 0; the resize handler lays them out later.
        if (!w || !h) return;
        const R = ((w * w) / 4 + h * h) / (2 * h);
        const D = Math.ceil(2 * R) + 2;
        const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;
        const originY = D - delta;

        circle.style.width = `${D}px`;
        circle.style.height = `${D}px`;
        circle.style.bottom = `-${delta}px`;

        gsap.set(circle, {
          xPercent: -50,
          scale: 0,
          transformOrigin: `50% ${originY}px`,
        });

        const label = pill.querySelector<HTMLElement>('.pill-label');
        const hover = pill.querySelector<HTMLElement>('.pill-label-hover');

        if (label) gsap.set(label, { y: 0 });
        if (hover) gsap.set(hover, { y: h + 12, opacity: 0 });

        const index = circleRefs.current.indexOf(circle);
        if (index === -1) return;

        tlRefs.current[index]?.kill();
        const tl = gsap.timeline({ paused: true });

        tl.to(circle, { scale: 1.2, xPercent: -50, duration: 2, ease, overwrite: 'auto' }, 0);

        if (label) {
          tl.to(label, { y: -(h + 8), duration: 2, ease, overwrite: 'auto' }, 0);
        }

        if (hover) {
          gsap.set(hover, { y: Math.ceil(h + 100), opacity: 0 });
          tl.to(hover, { y: 0, opacity: 1, duration: 2, ease, overwrite: 'auto' }, 0);
        }

        tlRefs.current[index] = tl;
      });
    };

    layout();

    window.addEventListener('resize', layout);
    document.fonts?.ready.then(layout).catch(() => {});

    const menu = mobileMenuRef.current;
    if (menu) {
      gsap.set(menu, { visibility: 'hidden', opacity: 0, scaleY: 1, y: 0 });
    }

    if (initialLoadAnimation && !prefersReducedMotion()) {
      const logoEl = logoRef.current;
      const navItems = navItemsRef.current;

      if (logoEl) {
        gsap.fromTo(logoEl, { scale: 0 }, { scale: 1, duration: 0.6, ease });
      }

      if (navItems) {
        gsap.fromTo(
          navItems,
          { width: 0, overflow: 'hidden' },
          { width: 'auto', duration: 0.6, ease },
        );
      }
    }

    return () => window.removeEventListener('resize', layout);
  }, [items, ease, initialLoadAnimation]);

  // Reduced motion: the menu and hover still change state, but snap instead of easing.
  const tweenTime = (seconds: number) => (reducedRef.current ? 0 : seconds);

  // tweenTo treats `duration: 0` as unset and falls back to the timeline's own
  // length, so reduced motion jumps the playhead instead of tweening.
  const handleEnter = (i: number) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    if (reducedRef.current) {
      tl.progress(1);
      return;
    }
    activeTweenRefs.current[i] = tl.tweenTo(tl.duration(), {
      duration: 0.3,
      ease,
      overwrite: 'auto',
    });
  };

  const handleLeave = (i: number) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    if (reducedRef.current) {
      tl.progress(0);
      return;
    }
    activeTweenRefs.current[i] = tl.tweenTo(0, {
      duration: 0.2,
      ease,
      overwrite: 'auto',
    });
  };

  const handleLogoEnter = () => {
    const mark = logoMarkRef.current;
    if (!mark || reducedRef.current) return;
    logoTweenRef.current?.kill();
    gsap.set(mark, { rotate: 0 });
    logoTweenRef.current = gsap.to(mark, {
      rotate: 360,
      duration: 0.2,
      ease,
      overwrite: 'auto',
    });
  };

  const setMobileMenu = (open: boolean) => {
    setIsMobileMenuOpen(open);

    const hamburger = hamburgerRef.current;
    const menu = mobileMenuRef.current;
    const d = (s: number) => tweenTime(s);

    if (hamburger) {
      const [top, bottom] = Array.from(hamburger.querySelectorAll('.hamburger-line'));
      if (top) gsap.to(top, { rotation: open ? 45 : 0, y: open ? 3 : 0, duration: d(0.3), ease });
      if (bottom) {
        gsap.to(bottom, { rotation: open ? -45 : 0, y: open ? -3 : 0, duration: d(0.3), ease });
      }
    }

    if (menu) {
      if (open) {
        gsap.set(menu, { visibility: 'visible' });
        gsap.fromTo(
          menu,
          { opacity: 0, y: 10, scaleY: 1 },
          { opacity: 1, y: 0, scaleY: 1, duration: d(0.3), ease, transformOrigin: 'top center' },
        );
      } else {
        gsap.to(menu, {
          opacity: 0,
          y: 10,
          scaleY: 1,
          duration: d(0.2),
          ease,
          transformOrigin: 'top center',
          onComplete: () => {
            gsap.set(menu, { visibility: 'hidden' });
          },
        });
      }
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenu(!isMobileMenuOpen);
    onMobileMenuClick?.();
  };

  const onAnchorClick = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (onAnchorNavigate?.(href)) e.preventDefault();
  };

  const onMobileItemClick = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (isHashLink(href)) onAnchorClick(e, href);
    setMobileMenu(false);
  };

  const cssVars = {
    ['--base']: baseColor,
    ['--pill-bg']: pillColor,
    ['--hover-text']: hoveredPillTextColor,
    ['--pill-text']: resolvedPillTextColor,
    ['--nav-bg']: navBgColor,
    ['--nav-border']: borderColor,
    ['--nav-h']: '40px',
    ['--pill-pad-x']: '16px',
    ['--pill-gap']: '3px',
  } as CSSProperties;

  const plate: CSSProperties = {
    background: 'var(--nav-bg)',
    border: '1px solid var(--nav-border)',
  };

  return (
    <div className={cn('relative', className)} style={cssVars}>
      <nav className="box-border flex w-full items-center justify-between" aria-label="Primary">
        <Link
          href={logoHref}
          aria-label={logoAriaLabel}
          onMouseEnter={handleLogoEnter}
          ref={logoRef}
          className="pointer-events-auto inline-flex items-center gap-2 whitespace-nowrap rounded-full pl-[3px] pr-4 backdrop-blur-md"
          style={{ ...plate, height: 'var(--nav-h)' }}
        >
          <span
            ref={logoMarkRef}
            className="grid shrink-0 place-items-center rounded-full"
            style={{
              width: 'calc(var(--nav-h) - 8px)',
              height: 'calc(var(--nav-h) - 8px)',
              background: 'var(--pill-bg)',
            }}
          >
            {logo}
          </span>
          {logoLabel}
        </Link>

        <div
          ref={navItemsRef}
          className="pointer-events-auto relative ml-2 hidden items-center rounded-full backdrop-blur-md md:flex"
          style={{ ...plate, height: 'var(--nav-h)' }}
        >
          <ul
            className="m-0 flex h-full list-none items-stretch p-[3px]"
            style={{ gap: 'var(--pill-gap)' }}
          >
            {items.map((item, i) => {
              const isActive = activeHref === item.href;

              const pillStyle: CSSProperties = {
                background: 'var(--pill-bg)',
                color: isActive ? 'var(--base)' : 'var(--pill-text)',
                paddingLeft: 'var(--pill-pad-x)',
                paddingRight: 'var(--pill-pad-x)',
              };

              const labelInner = (
                <>
                  {item.label}
                  {item.icon}
                </>
              );

              const pillContent = (
                <>
                  <span
                    className="hover-circle pointer-events-none absolute bottom-0 left-1/2 z-[1] block rounded-full"
                    style={{ background: 'var(--base)', willChange: 'transform' }}
                    aria-hidden="true"
                    ref={(el) => {
                      circleRefs.current[i] = el;
                    }}
                  />
                  <span className="label-stack relative z-[2] inline-block leading-[1]">
                    <span
                      className="pill-label relative z-[2] inline-flex items-center gap-1 leading-[1]"
                      style={{ willChange: 'transform' }}
                    >
                      {labelInner}
                    </span>
                    <span
                      className="pill-label-hover absolute left-0 top-0 z-[3] inline-flex items-center gap-1"
                      // Hidden until GSAP lays it out, so the server-rendered pill isn't doubled.
                      style={{
                        color: 'var(--hover-text)',
                        opacity: 0,
                        willChange: 'transform, opacity',
                      }}
                      aria-hidden="true"
                    >
                      {labelInner}
                    </span>
                  </span>
                  {isActive && (
                    <span
                      className="absolute -bottom-[6px] left-1/2 z-[4] h-3 w-3 -translate-x-1/2 rounded-full"
                      style={{ background: 'var(--base)' }}
                      aria-hidden="true"
                    />
                  )}
                </>
              );

              const pillProps = {
                className:
                  'relative box-border inline-flex h-full cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap rounded-full px-0 font-mono text-[11px] font-medium uppercase leading-[0] tracking-[0.12em] no-underline',
                style: pillStyle,
                'aria-label': item.ariaLabel ?? item.label,
                'aria-current': isActive ? ('location' as const) : undefined,
                onMouseEnter: () => handleEnter(i),
                onMouseLeave: () => handleLeave(i),
              };

              return (
                <li key={item.href} className="flex h-full">
                  {isRouterLink(item.href) ? (
                    <Link href={item.href} {...pillProps}>
                      {pillContent}
                    </Link>
                  ) : (
                    <a
                      href={item.href}
                      {...pillProps}
                      onClick={
                        isHashLink(item.href) ? (e) => onAnchorClick(e, item.href) : undefined
                      }
                    >
                      {pillContent}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <button
          type="button"
          ref={hamburgerRef}
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
          aria-controls="pillnav-mobile-menu"
          className="pointer-events-auto relative flex cursor-pointer flex-col items-center justify-center gap-1 rounded-full p-0 backdrop-blur-md md:hidden"
          style={{ ...plate, width: 'var(--nav-h)', height: 'var(--nav-h)' }}
        >
          <span
            className="hamburger-line h-0.5 w-4 origin-center rounded"
            style={{ background: 'var(--base)' }}
          />
          <span
            className="hamburger-line h-0.5 w-4 origin-center rounded"
            style={{ background: 'var(--base)' }}
          />
        </button>
      </nav>

      <div
        id="pillnav-mobile-menu"
        ref={mobileMenuRef}
        className="pointer-events-auto absolute left-0 right-0 top-[calc(100%+8px)] z-[998] origin-top rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md md:hidden"
        style={plate}
      >
        <ul className="m-0 flex list-none flex-col gap-[3px] p-[3px]">
          {items.map((item) => {
            const isActive = activeHref === item.href;
            const defaultStyle: CSSProperties = {
              background: 'var(--pill-bg)',
              color: isActive ? 'var(--base)' : 'var(--pill-text)',
            };
            const hoverIn = (e: MouseEvent<HTMLAnchorElement>) => {
              e.currentTarget.style.background = 'var(--base)';
              e.currentTarget.style.color = 'var(--hover-text)';
            };
            const hoverOut = (e: MouseEvent<HTMLAnchorElement>) => {
              e.currentTarget.style.background = 'var(--pill-bg)';
              e.currentTarget.style.color = isActive ? 'var(--base)' : 'var(--pill-text)';
            };

            const linkProps = {
              className:
                'flex items-center gap-1.5 rounded-[50px] px-4 py-3 font-mono text-[12px] font-medium uppercase tracking-[0.12em] transition-colors duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]',
              style: defaultStyle,
              'aria-current': isActive ? ('location' as const) : undefined,
              onMouseEnter: hoverIn,
              onMouseLeave: hoverOut,
              onClick: (e: MouseEvent<HTMLAnchorElement>) => onMobileItemClick(e, item.href),
            };

            return (
              <li key={item.href}>
                {isRouterLink(item.href) ? (
                  <Link href={item.href} {...linkProps}>
                    {item.label}
                    {item.icon}
                  </Link>
                ) : (
                  <a href={item.href} {...linkProps}>
                    {item.label}
                    {item.icon}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
