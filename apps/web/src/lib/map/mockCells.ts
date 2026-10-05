import { cellToLatLng, polygonToCells } from 'h3-js';
import { SIGNALS } from '@/lib/evocomb/signals';
import type { MapCell, MapScores } from '@/lib/map/cells';
import type { Bounds } from '@/stores/map-store';

// TEMPORARY stand-in for /stress/cells while the API isn't serving data: real H3
// cells covering the viewport, with deterministic illustrative values. Remove
// once the live feed is back — nothing here is measured.

// Cell budget per viewport; resolution drops until the bbox fits under it.
const MAX_CELLS = 12_000;

// Finest resolution worth drawing at each zoom (res 9 ≈ 150 m cells).
function resolutionForZoom(zoom: number): number {
  if (zoom >= 12) return 9;
  if (zoom >= 11) return 8;
  if (zoom >= 9.5) return 7;
  if (zoom >= 8) return 6;
  if (zoom >= 6) return 5;
  if (zoom >= 4) return 4;
  return 3;
}

// Smooth, deterministic 0–1 field over lat/lng: sine octaves from continent scale
// (~0.7 cycles/°) down to street scale (~190 cycles/°), so it varies at every zoom,
// neighbouring cells look alike and the same place always gets the same value.
const FREQS = [0.7, 3, 12, 48, 190];
const AMPS = [0.3, 0.25, 0.25, 0.25, 0.2];
const AMP_SUM = AMPS.reduce((a, b) => a + b, 0);

function field(lat: number, lng: number, seed: number): number {
  let f = 0;
  FREQS.forEach((fk, k) => {
    f +=
      AMPS[k]! *
      Math.sin(lat * fk + seed * (k + 1)) *
      Math.cos(lng * fk * 1.3 - seed * 2 * (k + 1));
  });
  return Math.min(1, Math.max(0, 0.5 + f / AMP_SUM));
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const score = (v: number) => Math.round(v * 1000) / 10;

// Per-signal seeds for the illustrative field.
const SEEDS: Record<keyof MapScores, number> = {
  humidity: 1.7,
  wind: 4.2,
  solar: 7.9,
  temperature: 2.6,
};

/** Illustrative cells for the viewport, scored on the four display signals. */
export function mockCells(bounds: Bounds, zoom: number): MapCell[] {
  // Clamp to valid lat/lng and avoid antimeridian-spanning boxes.
  const west = Math.max(-179.99, bounds.minLng);
  const east = Math.min(179.99, bounds.maxLng);
  const south = Math.max(-85, bounds.minLat);
  const north = Math.min(85, bounds.maxLat);
  if (east <= west || north <= south) return [];

  const ring: [number, number][] = [
    [south, west],
    [south, east],
    [north, east],
    [north, west],
    [south, west],
  ];

  let res = resolutionForZoom(zoom);
  let ids = polygonToCells(ring, res);
  while (ids.length > MAX_CELLS && res > 0) {
    res -= 1;
    ids = polygonToCells(ring, res);
  }

  const now = new Date().toISOString();
  return ids.map((h3) => {
    const [lat, lng] = cellToLatLng(h3);
    // One shared base field keeps the scores correlated, so averaging them doesn't
    // flatten the ESI; each score adds its own variation on top.
    const base = field(lat, lng, 5.1);
    const scores = {} as MapScores;
    let mix = 0;
    for (const s of SIGNALS) {
      const v = clamp01(base + 0.35 * (field(lat, lng, SEEDS[s.key]) - 0.5));
      scores[s.key] = score(v);
      mix += s.weight * v;
    }
    const greenery = field(lat, lng, 9.3) * 0.6;
    // Weighted mix, contrast-stretched around 50 so all five ESI colour bands show up.
    const esi = Math.min(100, Math.max(0, 50 + (mix - 0.5) * 160 - greenery * 15));
    return {
      h3,
      lat,
      lng,
      esi: Math.round(esi * 10) / 10,
      scores,
      confidence: 0.3,
      greenery: Math.round(greenery * 100) / 100,
      locality: null,
      updated_at: now,
    };
  });
}
