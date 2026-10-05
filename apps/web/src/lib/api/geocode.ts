import type { components } from '@platform/shared-types';
import { env } from '@/lib/env';

export type Locality = components['schemas']['LocalityOut'];

/** Reverse-geocode a coordinate to a locality name (proxied + cached by the API). */
export async function fetchLocality(lat: number, lng: number): Promise<Locality> {
  const url = new URL('/api/v1/geocode/reverse', env.NEXT_PUBLIC_API_URL);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lng', String(lng));

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Failed to reverse geocode: ${res.status}`);
  }
  return res.json() as Promise<Locality>;
}
