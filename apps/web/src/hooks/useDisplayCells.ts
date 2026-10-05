import { useEffect, useMemo } from 'react';
import { useStressCells } from '@/hooks/useStressCells';
import { fromApiCell, type MapCell } from '@/lib/map/cells';
import { mockCells } from '@/lib/map/mockCells';
import { useMapStore } from '@/stores/map-store';

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * The cells the map should draw, keyed on the four display signals. Live API cells
 * (adapted) when the API returns some; otherwise (request failed, or an empty
 * snapshot) a TEMPORARY illustrative grid over the viewport, flagged `isDemo` so
 * the UI can label it.
 */
export function useDisplayCells(): {
  cells: MapCell[];
  isDemo: boolean;
  isLoading: boolean;
} {
  const { data, isLoading, isError } = useStressCells();
  const bounds = useMapStore((s) => s.bounds);
  const zoom = useMapStore((s) => s.viewport.zoom);
  const liveUnavailable = useMapStore((s) => s.liveUnavailable);
  const setLiveUnavailable = useMapStore((s) => s.setLiveUnavailable);

  // TanStack resets a never-successful query to "pending" on every refetch, so
  // `isError` blinks off during retries (each pan, each panel open). Track failure
  // in the shared store instead: set on error, cleared only by a real success.
  useEffect(() => {
    if (isError) setLiveUnavailable(true);
    else if (data && data.cells.length > 0) setLiveUnavailable(false);
  }, [isError, data, setLiveUnavailable]);

  const useDemo = liveUnavailable || isError || (data !== undefined && data.cells.length === 0);
  const live = useMemo(() => data?.cells.map(fromApiCell), [data]);

  // Rounded like the API query key, so small pans don't regenerate the grid.
  const key = bounds
    ? [round(bounds.minLng), round(bounds.minLat), round(bounds.maxLng), round(bounds.maxLat)]
    : null;
  const zoomStep = Math.round(zoom * 2) / 2;

  const demo = useMemo(
    () => (useDemo && bounds ? mockCells(bounds, zoomStep) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [useDemo, key?.join(','), zoomStep],
  );

  return {
    cells: useDemo ? demo : (live ?? []),
    isDemo: useDemo,
    isLoading: isLoading && !useDemo,
  };
}
