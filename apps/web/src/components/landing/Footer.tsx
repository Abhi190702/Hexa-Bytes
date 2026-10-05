import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0a0b0d] px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">
            Evo<span className="text-emerald-400">Comb</span>
          </p>
          <p className="mt-1 text-xs text-white/45">
            Urban Environmental Stress Mapping · Delhi NCR
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/50">
          <Link href="/map" className="hover:text-white">
            Live map
          </Link>
          <a
            href="https://github.com/aksh08022006/EvoComb"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white"
          >
            GitHub
          </a>
          <span>Data: OpenStreetMap · Open-Meteo · MET Norway</span>
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-6xl text-[11px] leading-relaxed text-white/35">
        EvoComb estimates regional environmental exposure for research and planning. It is not
        medical advice and does not represent exact conditions at any single location.
      </p>
    </footer>
  );
}
