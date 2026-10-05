import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchStressCells } from '@/lib/api/stress';
import { useMapStore } from '@/stores/map-store';

const round = (n: number) => Math.round(n * 100) / 100;

// Viewport-bounded server state. Re-queries when the (rounded) bounds change — rounding
// avoids a refetch storm on every sub-pixel pan. `keepPreviousData` keeps the current cells
// on screen while the next viewport loads, so the heatmap never blanks during zoom/pan.
export function useStressCells() {
  const bounds = useMapStore((s) => s.bounds);

  return useQuery({
    queryKey: [
      'stress-cells',
      bounds
        ? [round(bounds.minLng), round(bounds.minLat), round(bounds.maxLng), round(bounds.maxLat)]
        : null,
    ],
    queryFn: () => fetchStressCells(bounds!),
    enabled: bounds !== null,
    placeholderData: keepPreviousData,
    // During first-run ingestion the API intentionally returns an empty collection.
    // Poll only in that bootstrap state, then stop as soon as the first cells arrive.
    refetchInterval: (query) => (query.state.data?.cells.length === 0 ? 10_000 : false),
    refetchIntervalInBackground: true,
  });
}
