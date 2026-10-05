import Link from 'next/link';
import { SIGNALS } from '@/lib/evocomb/signals';

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-[#0a0b0d]/80 backdrop-blur-sm">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-14 md:grid-cols-[1.2fr_1fr_1fr] md:px-8">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="h-3 w-3 rotate-12 bg-gradient-to-br from-emerald-400 via-amber-300 to-rose-500 [clip-path:polygon(25%_0,75%_0,100%_50%,75%_100%,25%_100%,0_50%)]" />
            <span className="font-mono text-sm font-semibold text-white">EvoComb</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/50">
            An open Environmental Stress Index for The Globe — relative humidity, wind speed, solar
            radiation and temperature on one H3 hex grid.
          </p>
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">Explore</p>
          <ul className="mt-4 space-y-2 text-sm text-white/60">
            <li><Link href="/map" className="hover:text-white">Live map</Link></li>
            <li><a href="#measure" className="hover:text-white">The four signals</a></li>
            <li><a href="#formula" className="hover:text-white">ESI formula</a></li>
            <li><a href="#evidence" className="hover:text-white">Evidence</a></li>
          </ul>
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">Signals</p>
          <ul className="mt-4 space-y-2 font-mono text-[12px] text-white/50">
            {SIGNALS.map((s) => (
              <li key={s.key} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
                {s.label} · {s.unit}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-5 font-mono text-[11px] text-white/40 md:px-8">
          <span>© 2026 EvoComb · ESI is a transparent weighted index, not a diagnosis.</span>
          <span>Modelled where labelled · refreshed hourly where sources allow.</span>
        </div>
      </div>
    </footer>
  );
}
