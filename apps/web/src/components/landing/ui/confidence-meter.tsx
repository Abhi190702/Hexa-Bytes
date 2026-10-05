import { cn } from '@/lib/utils';

const SEGMENTS = 5;

/** Segmented confidence bar (0–1). */
export function ConfidenceMeter({ value }: { value: number }) {
  const filled = Math.round(value * SEGMENTS);
  const label = value >= 0.8 ? 'High' : value >= 0.55 ? 'Medium' : 'Low';
  const color = value >= 0.8 ? 'bg-emerald-400' : value >= 0.55 ? 'bg-amber-400' : 'bg-rose-400';
  return (
    <div>
      <div className="flex gap-1">
        {Array.from({ length: SEGMENTS }).map((_, i) => (
          <span
            key={i}
            className={cn('h-1.5 flex-1 rounded-full', i < filled ? color : 'bg-white/12')}
          />
        ))}
      </div>
      <span className="mt-1.5 block text-[11px] text-white/45">{label} confidence</span>
    </div>
  );
}
