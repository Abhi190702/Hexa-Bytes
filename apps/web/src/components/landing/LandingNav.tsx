'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '#what', label: 'What' },
  { href: '#science', label: 'Science' },
  { href: '#method', label: 'Method' },
  { href: '#data', label: 'Data' },
  { href: '#research', label: 'Research' },
];

export function LandingNav() {
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-colors duration-300',
        solid ? 'border-b border-white/10 bg-[#0a0b0d]/80 backdrop-blur' : 'border-b border-transparent',
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="text-sm font-semibold tracking-tight text-white">
          Evo<span className="text-emerald-400">Comb</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-white/55 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="transition-colors hover:text-white">
              {l.label}
            </a>
          ))}
        </nav>
        <Link
          href="/map"
          className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-black transition-transform hover:scale-105"
        >
          Open map
        </Link>
      </div>
    </header>
  );
}
