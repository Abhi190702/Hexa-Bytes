'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { scrollToAnchor } from '@/hooks/useSmoothScroll';
import PillNav from './ui/PillNav';
import type { PillNavItem } from './ui/PillNav';

const SECTIONS: PillNavItem[] = [
  { href: '#measure', label: 'Signals' },
  { href: '#evidence-why', label: 'Why' },
  { href: '#formula', label: 'Index' },
  { href: '#pipeline', label: 'Pipeline' },
  { href: '#evidence', label: 'Evidence' },
];

const ITEMS: PillNavItem[] = [
  ...SECTIONS,
  {
    href: '/map',
    label: 'Live map',
    ariaLabel: 'Open the live map',
    icon: <ArrowUpRight className="h-3 w-3" aria-hidden="true" />,
  },
];

/**
 * Href of the listed section crossing a thin band ~40% down the viewport, or
 * undefined when none is (hero, map preview, CTA). Watching the section box
 * rather than its content means the 180vh sticky Signals section stays active
 * for its whole scroll length.
 */
function useActiveSection(hrefs: string[]): string | undefined {
  const [active, setActive] = useState<string>();

  useEffect(() => {
    const els = hrefs
      .map((h) => document.getElementById(h.slice(1)))
      .filter((el): el is HTMLElement => el !== null);
    const inBand = new Set<string>();

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) inBand.add(e.target.id);
          else inBand.delete(e.target.id);
        }
        setActive(hrefs.find((h) => inBand.has(h.slice(1))));
      },
      { rootMargin: '-40% 0px -59% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [hrefs]);

  return active;
}

const SECTION_HREFS = SECTIONS.map((s) => s.href);

/**
 * Floating pill nav. No full-width bar: every group (logo, pill row,
 * hamburger) carries its own blurred dark plate, so it stays legible over the
 * canvas and content without a solid-on-scroll header.
 */
export function SiteNav() {
  const activeHref = useActiveSection(SECTION_HREFS);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-5 pt-3 md:px-8">
      <PillNav
        className="mx-auto max-w-7xl"
        logo={
          <span className="h-3 w-3 rotate-12 bg-gradient-to-br from-emerald-400 via-amber-300 to-rose-500 [clip-path:polygon(25%_0,75%_0,100%_50%,75%_100%,25%_100%,0_50%)]" />
        }
        logoLabel={
          <>
            <span className="font-mono text-[13px] font-semibold tracking-tight text-white">
              EvoComb
            </span>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-white/35 sm:inline md:hidden lg:inline">
              / ESI
            </span>
          </>
        }
        logoAriaLabel="EvoComb home"
        items={ITEMS}
        activeHref={activeHref}
        baseColor="#fff"
        pillColor="#15171b"
        pillTextColor="rgba(255, 255, 255, 0.7)"
        hoveredPillTextColor="#0a0b0d"
        onAnchorNavigate={scrollToAnchor}
      />
    </header>
  );
}
