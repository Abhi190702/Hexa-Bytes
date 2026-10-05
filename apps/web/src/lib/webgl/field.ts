// Procedurally builds a city-like H3-style hex field. The goal is not real H3
// geometry but a believable spatial structure: dense noisy cores, road
// corridors, heat islands and a broad pollution gradient — so the emerging
// layers and the final ESI surface read like an actual city, not random noise.

import { HEURISTICS } from '@/lib/heuristics';

export interface HexField {
  count: number;
  offsets: Float32Array; // vec2 xz per hex
  noise: Float32Array;
  crowd: Float32Array;
  heat: Float32Array;
  pollution: Float32Array;
  esi: Float32Array;
  seed: Float32Array;
  extent: number; // world-space radius the field occupies
}

// ESI weights pulled straight from the published heuristics so the surface
// matches the formula shown in the Formula section.
const W = Object.fromEntries(HEURISTICS.map((h) => [h.key, h.weight])) as Record<string, number>;

// Activity centers (markets, transit, business districts). Hand-placed so the
// crowd particles and noise rings line up with visible clusters.
const CENTERS = [
  { x: -10, z: 8, r: 9 },
  { x: 14, z: -6, r: 8 },
  { x: 2, z: -16, r: 7 },
  { x: -18, z: -10, r: 6 },
  { x: 20, z: 14, r: 7 },
];

function smoothNoise(x: number, z: number, f: number): number {
  // Cheap deterministic value noise (sin hash). Range ~0–1.
  const s = Math.sin(x * f * 1.7 + z * f * 0.9) * 43758.5453;
  const t = Math.sin(x * f * 0.6 - z * f * 1.3 + 2.1) * 24634.6345;
  return (((s - Math.floor(s)) + (t - Math.floor(t))) * 0.5);
}

function roadProximity(x: number, z: number): number {
  // Mirrors the GLSL roadField so noise rings and hex noise agree spatially.
  let d = 1e3;
  d = Math.min(d, Math.abs(z + 2 * Math.sin(x * 0.05)));
  d = Math.min(d, Math.abs(x - 3 * Math.sin(z * 0.045)));
  d = Math.min(d, Math.abs((x + z) * 0.7071 + 4));
  d = Math.min(d, Math.abs((x - z) * 0.7071 - 6));
  return Math.max(0, 1 - d / 5); // 1 on a road, 0 far away
}

/** Build the field for an axial hex grid of the given radius. */
export function buildHexField(radius = 21, hexR = 1.0): HexField {
  const offs: number[] = [];
  const noise: number[] = [];
  const crowd: number[] = [];
  const heat: number[] = [];
  const poll: number[] = [];
  const esi: number[] = [];
  const seed: number[] = [];

  const sqrt3 = Math.sqrt(3);
  let extent = 0;

  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) > radius) continue;
      // Pointy-top axial → world position.
      const x = hexR * sqrt3 * (q + r / 2);
      const z = hexR * 1.5 * r;
      const dist = Math.hypot(x, z);
      if (dist > radius * 1.55) continue;
      extent = Math.max(extent, dist);

      // Crowd: sum of gaussian activity centers.
      let crowdV = 0;
      for (const c of CENTERS) {
        const dd = Math.hypot(x - c.x, z - c.z);
        crowdV += Math.exp(-(dd * dd) / (2 * c.r * c.r));
      }
      crowdV = Math.min(1, crowdV);

      // Noise: roads + crowd, jittered.
      const noiseV = Math.min(1, roadProximity(x, z) * 0.85 + crowdV * 0.4 + smoothNoise(x, z, 0.05) * 0.15);

      // Heat: two heat islands + concrete (inverse of edge greenery) + broad gradient.
      const h1 = Math.exp(-(Math.hypot(x + 10, z - 8) ** 2) / 120);
      const h2 = Math.exp(-(Math.hypot(x - 14, z + 6) ** 2) / 150);
      const heatV = Math.min(1, h1 * 0.9 + h2 * 0.9 + crowdV * 0.25 + 0.15);

      // Pollution: broad NW→SE gradient + fbm-ish drift, the way regional AQI behaves.
      const grad = (x + z + radius * 2) / (radius * 4);
      const pollV = Math.min(1, Math.max(0, grad * 0.8 + smoothNoise(x, z, 0.03) * 0.3 + 0.1));

      // Greenery discount near the quiet edges / low-activity zones.
      const greenery = Math.max(0, (1 - crowdV) * 0.35 * (dist / (radius * 1.4)));

      // Published ESI: weighted blend minus greenery, clamped.
      const e = Math.max(
        0,
        Math.min(
          1,
          noiseV * (W.noise ?? 0.3) +
            crowdV * (W.density ?? 0.25) +
            heatV * (W.heat ?? 0.2) +
            pollV * (W.aqi ?? 0.25) -
            greenery,
        ),
      );

      offs.push(x, z);
      noise.push(noiseV);
      crowd.push(crowdV);
      heat.push(heatV);
      poll.push(pollV);
      esi.push(e);
      seed.push(Math.random());
    }
  }

  return {
    count: esi.length,
    offsets: new Float32Array(offs),
    noise: new Float32Array(noise),
    crowd: new Float32Array(crowd),
    heat: new Float32Array(heat),
    pollution: new Float32Array(poll),
    esi: new Float32Array(esi),
    seed: new Float32Array(seed),
    extent,
  };
}

/** Crowd-particle home points sampled around the activity centers. */
export function buildParticleHomes(n: number): { homes: Float32Array; seeds: Float32Array } {
  const homes = new Float32Array(n * 3);
  const seeds = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const c = CENTERS[i % CENTERS.length]!;
    const a = Math.random() * Math.PI * 2;
    const rad = Math.sqrt(Math.random()) * c.r;
    homes[i * 3] = c.x + Math.cos(a) * rad;
    homes[i * 3 + 1] = 0;
    homes[i * 3 + 2] = c.z + Math.sin(a) * rad;
    seeds[i] = Math.random();
  }
  return { homes, seeds };
}
