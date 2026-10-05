import type { SignalKey } from '@/lib/evocomb/signals';
import type { StressCell } from '@/lib/api/stress';

// What the map draws: an API cell with its scores re-keyed onto the four display
// signals. The API still reports noise / density / heat / aqi, so until the backend
// moves to the new signals only temperature has a live source (the API's `heat`
// score is derived from air temperature); the other three are null ("no data").

export type MapScores = Record<SignalKey, number | null>;

export type MapCell = Omit<StressCell, 'scores'> & { scores: MapScores };

export function fromApiCell(cell: StressCell): MapCell {
  return {
    ...cell,
    scores: {
      humidity: null,
      wind: null,
      solar: null,
      temperature: cell.scores.heat ?? null,
    },
  };
}
