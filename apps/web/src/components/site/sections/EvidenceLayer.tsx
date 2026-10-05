'use client';

import { useRef, useState } from 'react';
import anime from 'animejs';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { EVIDENCE, CONFIDENCE_META, type EvidenceCard } from '@/lib/evocomb/evidence';
import { EvidenceMarker } from '../ui/EvidenceMarker';
import { Reveal } from '../ui/Reveal';

// Section 7. The Evidence Layer — one compact, sourced fact per signal. Each opens a
// drawer (Anime.js) with the source detail, DOI and a confidence note.
export function EvidenceLayer() {
  return (
    <section id="evidence" className="relative z-10 py-28">
      <div className="mx-auto w-full max-w-7xl px-5 md:px-8">
        <Reveal className="max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/45">07 · Evidence</p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
            The evidence, organized.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-white/60">
            Every claim here traces to a published source. Open any card for the detail, DOI and how
            far we trust it.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {EVIDENCE.map((c) => (
            <EvidenceItem key={c.id} card={c} />
          ))}
        </div>
      </div>
    </section>
  );
}

function EvidenceItem({ card }: { card: EvidenceCard }) {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const conf = CONFIDENCE_META[card.confidence];

  const toggle = () => {
    const el = drawerRef.current;
    if (!el) return setOpen((o) => !o);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const next = !open;
    setOpen(next);

    if (reduced) {
      el.style.height = next ? 'auto' : '0px';
      el.style.opacity = next ? '1' : '0';
      return;
    }
    anime.remove(el);
    if (next) {
      el.style.height = 'auto';
      const target = el.offsetHeight;
      el.style.height = '0px';
      anime({ targets: el, height: [0, target], opacity: [0, 1], duration: 480, easing: 'easeOutCubic', complete: () => (el.style.height = 'auto') });
    } else {
      anime({ targets: el, height: [el.offsetHeight, 0], opacity: [1, 0], duration: 380, easing: 'easeInCubic' });
    }
  };

  return (
    <article
      className="flex flex-col rounded-2xl border bg-[#0a0b0d]/85 p-6 transition-colors"
      style={{ borderColor: open ? `${card.accent}55` : 'rgba(255,255,255,0.09)' }}
    >
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border" style={{ borderColor: `${card.accent}44`, background: `${card.accent}12` }}>
          <EvidenceMarker type={card.marker} color={card.accent} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium leading-snug text-white">{card.claim}</p>
          <p className="mt-2 font-mono text-[11px] text-white/45">
            {card.source} · {card.institution} · {card.year}
          </p>
        </div>
      </div>

      {/* Confidence row */}
      <div className="mt-4 flex items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: conf.color }}>
          {conf.label}
        </span>
        <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
          <span className="block h-full rounded-full" style={{ width: `${conf.level * 100}%`, background: conf.color }} />
        </span>
        <button
          onClick={toggle}
          aria-expanded={open}
          className="inline-flex items-center gap-1 font-mono text-[11px] text-white/60 transition-colors hover:text-white"
        >
          {open ? 'Hide' : 'View evidence'}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Drawer */}
      <div ref={drawerRef} className="h-0 overflow-hidden opacity-0">
        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="text-[13px] leading-relaxed text-white/70">{card.detail}</p>
          <p className="mt-3 text-[12px] leading-relaxed text-white/50">
            <span className="text-white/40">Note · </span>
            {card.note}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 font-mono text-[11px]">
            {card.doi && (
              <span className="rounded border border-white/15 px-2 py-1 text-white/55">DOI {card.doi}</span>
            )}
            <a
              href={card.link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-white/70 transition-colors hover:text-white"
              style={{ background: `${card.accent}18` }}
            >
              Open source
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
