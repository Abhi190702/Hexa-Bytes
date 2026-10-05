import { ExternalLink } from 'lucide-react';
import type { Citation } from '@/lib/landing/research';

export function CitationCard({ citation }: { citation: Citation }) {
  return (
    <a
      href={citation.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-lg border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20 hover:bg-white/[0.06]"
    >
      <p className="text-[11px] uppercase tracking-wide text-white/40">
        {citation.journal} · {citation.year}
      </p>
      <p className="mt-1.5 text-sm font-medium leading-snug text-white">{citation.title}</p>
      <p className="mt-1.5 flex items-center gap-1 text-xs text-white/50">
        {citation.authors}
        <ExternalLink className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
      </p>
    </a>
  );
}
