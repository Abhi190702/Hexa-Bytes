import type { components } from '@platform/shared-types';
import { env } from '@/lib/env';
import type { Bounds } from '@/stores/map-store';

// Types come straight from the API's OpenAPI schema (single source of truth).
export type StressCellCollection = components['schemas']['StressCellCollection'];
export type StressCell = components['schemas']['StressCellOut'];

/** Fetch ESI cells within a viewport bbox. */
export async function fetchStressCells(bounds: Bounds): Promise<StressCellCollection> {
  const bbox = `${bounds.minLng},${bounds.minLat},${bounds.maxLng},${bounds.maxLat}`;
  const url = new URL('/api/v1/stress/cells', env.NEXT_PUBLIC_API_URL);
  url.searchParams.set('bbox', bbox);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Failed to fetch stress cells: ${res.status}`);
  }
  return res.json() as Promise<StressCellCollection>;
}
