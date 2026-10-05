// Hex cells for the landing-page globe, with illustrative per-cell scores.
//
// Cells sit on staggered latitude rings (a near-hex packing), are kept only where
// the Natural Earth land mask says "land", and get deterministic procedural
// 0–100 scores for the four SIGNALS plus greenery. Nothing here is measured data:
// it is seeded noise shaped by latitude so the picture looks plausible (warm,
// sunny tropics; dry subtropical deserts; windy mid-latitudes). Being seeded, the
// same cells and values come out on every load and every device.

import { isLand } from './land-mask';
import { SIGNALS } from './signals';

// Greenery is a discount, not a signal: its score subtracts at this weight
// (same as the Formula section).
export const GREEN_WEIGHT = 0.25;

export interface GlobeCells {
  count: number;
  /** Angular spacing between neighbouring cells, degrees. */
  spacing: number;
  lat: Float32Array;
  lon: Float32Array;
  /** 0–100 scores keyed by 'esi', 'greenery' and each SIGNALS key. */
  scores: { esi: Float32Array; greenery: Float32Array } & Record<string, Float32Array>;
  /** Ring lookup for nearest-cell picking: per ring, lattice column → cell index (−1 = sea). */
  rings: { lat: number; step: number; offset: number; cols: Int32Array }[];
  rowStep: number;
}

// --- seeded value noise on the unit sphere ---------------------------------

function hash3(x: number, y: number, z: number, seed: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647) ^ seed;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function valueNoise(x: number, y: number, z: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const s = (t: number) => t * t * (3 - 2 * t);
  const fx = s(x - xi);
  const fy = s(y - yi);
  const fz = s(z - zi);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz, seed);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), fx), l(c(0, 1, 0), c(1, 1, 0), fx), fy),
    l(l(c(0, 0, 1), c(1, 0, 1), fx), l(c(0, 1, 1), c(1, 1, 1), fx), fy),
    fz,
  );
}

/** Three-octave fBm, roughly 0–1 (centred near 0.5). */
function fbm(p: [number, number, number], freq: number, seed: number): number {
  let sum = 0;
  let amp = 0.5;
  let f = freq;
  for (let o = 0; o < 3; o++) {
    sum += amp * valueNoise(p[0] * f + 17.3, p[1] * f + 5.1, p[2] * f + 9.7, seed + o * 101);
    f *= 2.1;
    amp *= 0.5;
  }
  return sum / 0.875;
}

const clamp = (v: number) => Math.max(0, Math.min(100, v));
const bump = (x: number, mu: number, sigma: number) => Math.exp(-(((x - mu) / sigma) ** 2));
const rad = Math.PI / 180;

export function latLonToUnit(lat: number, lon: number): [number, number, number] {
  // y up; lon 0 faces +z, east is +x.
  const c = Math.cos(lat * rad);
  return [c * Math.sin(lon * rad), Math.sin(lat * rad), c * Math.cos(lon * rad)];
}

// Delhi NCR — the project's home turf gets a mild hotspot so the opening view
// has something to say.
const HOME: [number, number, number] = latLonToUnit(28.6, 77.2);

function scoresAt(lat: number, lon: number) {
  const p = latLonToUnit(lat, lon);
  const a = Math.abs(lat);
  const c = Math.cos(lat * rad);
  const n = (seed: number, freq = 2.4) => fbm(p, freq, seed) - 0.5; // ≈ −0.5…0.5

  const desert = bump(a, 24, 8); // subtropical high-pressure belt
  const itcz = bump(lat, 4, 12); // wet, convective equatorial band
  const westerlies = bump(a, 52, 14);
  // Shared regional term: hotspots lift every signal together and thin the greenery.
  const region = n(7, 1.7) * 120;
  const home = Math.max(0, HOME[0] * p[0] + HOME[1] * p[1] + HOME[2] * p[2]);
  const hot = 22 * Math.pow(home, 120); // ≈ 10° radius

  const temperature = clamp(4 + 68 * c * c + 8 * desert + region * 0.8 + n(11) * 28 + hot);
  const solar = clamp(6 + 62 * Math.pow(c, 1.4) + 14 * desert + region * 0.6 + n(23) * 24 + hot);
  const humidity = clamp(48 + 34 * itcz - 34 * desert + region * 0.8 + n(31) * 40 + hot);
  const wind = clamp(18 + 42 * westerlies + 14 * (a > 62 ? 1 : 0) + n(43, 3.1) * 40);
  const greenery = clamp(
    (62 * itcz + 40 * westerlies - 30 * desert + 22 - region * 0.8 + n(59) * 44 - hot) *
      (1 - Math.min(1, Math.max(0, (a - 58) / 16))),
  );
  return { humidity, wind, solar, temperature, greenery };
}

/** Builds the land cells. ~5k cells at the default 1.6° spacing. */
export function buildGlobeCells(spacing = 1.6): GlobeCells {
  const rowStep = (spacing * Math.sqrt(3)) / 2;
  const kMax = Math.floor((90 - rowStep / 2) / rowStep);
  const rings: GlobeCells['rings'] = [];
  const lat: number[] = [];
  const lon: number[] = [];
  const keys = [...SIGNALS.map((s) => s.key), 'greenery', 'esi'];
  const raw: Record<string, number[]> = Object.fromEntries(keys.map((k) => [k, []]));

  for (let k = -kMax; k <= kMax; k++) {
    const rl = k * rowStep;
    const n = Math.max(1, Math.round((360 * Math.cos(rl * rad)) / spacing));
    const step = 360 / n;
    const offset = (k & 1 ? step / 2 : 0) - 180;
    const cols = new Int32Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      const lo = offset + i * step;
      if (!isLand(rl, lo)) continue;
      cols[i] = lat.length;
      lat.push(rl);
      lon.push(lo);
      const s = scoresAt(rl, lo);
      let esi = -s.greenery * GREEN_WEIGHT;
      for (const sig of SIGNALS) {
        const v = s[sig.key as keyof typeof s];
        raw[sig.key]?.push(v);
        esi += sig.weight * v;
      }
      raw.greenery?.push(s.greenery);
      raw.esi?.push(clamp(esi));
    }
    rings.push({ lat: rl, step, offset, cols });
  }

  return {
    count: lat.length,
    spacing,
    lat: Float32Array.from(lat),
    lon: Float32Array.from(lon),
    scores: Object.fromEntries(
      keys.map((k) => [k, Float32Array.from(raw[k] ?? [])]),
    ) as GlobeCells['scores'],
    rings,
    rowStep,
  };
}

/** Nearest land cell to a lat/lon, or −1 if the nearest lattice point is sea. */
export function nearestCell(cells: GlobeCells, lat: number, lon: number): number {
  const kMax = (cells.rings.length - 1) / 2;
  const k0 = Math.round(lat / cells.rowStep);
  const q = latLonToUnit(lat, lon);
  let best = -1;
  let bestDot = Math.cos(cells.spacing * 0.62 * rad);
  for (let k = k0 - 1; k <= k0 + 1; k++) {
    const ring = cells.rings[k + kMax];
    if (!ring) continue;
    const n = ring.cols.length;
    const i = (((Math.round((lon - ring.offset) / ring.step) % n) + n) % n) | 0;
    const lo = ring.offset + i * ring.step;
    const p = latLonToUnit(ring.lat, lo);
    const d = p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
    if (d > bestDot) {
      bestDot = d;
      best = ring.cols[i] ?? -1;
    }
  }
  return best;
}
