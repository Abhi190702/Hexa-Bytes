'use client';

import { useMemo } from 'react';
import { buildGlobeCells, latLonToUnit, type GlobeCells } from '@/lib/evocomb/globe-cells';
import { layerColor, type GlobeLayer } from '@/lib/evocomb/globe-layers';

// Still, orthographic SVG of the hex globe for devices that don't get the live
// WebGL one (no WebGL, or a static device tier). Same cells, same opening view
// (India), same colours; cells are batched into one <path> per colour bucket so
// the DOM stays small.

const DEG = Math.PI / 180;
const YAW = -78 * DEG;
const PITCH = 0.36;
const SCORE_BINS = 12;
const SHADE_BINS = 4;

let cache: GlobeCells | null = null;

function toHex([r, g, b]: [number, number, number]) {
  const h = (v: number) =>
    Math.round(Math.max(0, Math.min(1, v)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

export default function HexGlobeFallback({ layer }: { layer: GlobeLayer }) {
  const paths = useMemo(() => {
    cache ??= buildGlobeCells();
    const cells = cache;
    const scores = cells.scores[layer] ?? cells.scores.esi;
    const hexR = ((cells.spacing * DEG) / Math.sqrt(3)) * 0.86;
    const [cy, sy, cp, sp] = [Math.cos(YAW), Math.sin(YAW), Math.cos(PITCH), Math.sin(PITCH)];
    const project = (x: number, y: number, z: number): [number, number, number] => {
      const x1 = x * cy + z * sy;
      const z1 = -x * sy + z * cy;
      return [x1, y * cp - z1 * sp, y * sp + z1 * cp];
    };
    const buckets = new Map<string, string[]>();
    for (let i = 0; i < cells.count; i++) {
      const n = latLonToUnit(cells.lat[i] ?? 0, cells.lon[i] ?? 0);
      const c = project(n[0], n[1], n[2]);
      if (c[2] < 0.08) continue; // back hemisphere and the grazing limb
      const e: [number, number, number] = [n[2], 0, -n[0]];
      const el = Math.hypot(e[0], e[2]) || 1;
      e[0] /= el;
      e[2] /= el;
      const no: [number, number, number] = [
        n[1] * e[2] - n[2] * e[1],
        n[2] * e[0] - n[0] * e[2],
        n[0] * e[1] - n[1] * e[0],
      ];
      let d = '';
      for (let k = 0; k < 6; k++) {
        const a = (30 + 60 * k) * DEG;
        const ca = Math.cos(a) * hexR;
        const sa = Math.sin(a) * hexR;
        const p = project(
          n[0] + ca * e[0] + sa * no[0],
          n[1] + sa * no[1],
          n[2] + ca * e[2] + sa * no[2],
        );
        d += `${k ? 'L' : 'M'}${p[0].toFixed(3)} ${(-p[1]).toFixed(3)}`;
      }
      const sb = Math.min(SCORE_BINS - 1, Math.floor(((scores[i] ?? 0) / 100) * SCORE_BINS));
      const hb = Math.min(SHADE_BINS - 1, Math.floor(Math.pow(c[2], 0.7) * SHADE_BINS));
      const key = `${sb}:${hb}`;
      const list = buckets.get(key) ?? [];
      list.push(`${d}Z`);
      buckets.set(key, list);
    }
    return Array.from(buckets, ([key, ds]) => {
      const [sb = 0, hb = 0] = key.split(':').map(Number);
      const rgb = layerColor(layer, ((sb + 0.5) / SCORE_BINS) * 100);
      const shade = 0.32 + 0.68 * ((hb + 0.5) / SHADE_BINS);
      return { key, d: ds.join(''), fill: toHex([rgb[0] * shade, rgb[1] * shade, rgb[2] * shade]) };
    });
  }, [layer]);

  return (
    <svg
      viewBox="-1.2 -1.2 2.4 2.4"
      className="absolute inset-0 h-full w-full"
      role="img"
      aria-label="Static globe of illustrative Environmental Stress cells, centred on India"
    >
      <defs>
        <radialGradient id="globe-atmo" r="0.5">
          <stop offset="0.8" stopColor="#5dade2" stopOpacity="0.22" />
          <stop offset="1" stopColor="#5dade2" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle r="1.18" fill="url(#globe-atmo)" />
      <circle r="1" fill="#0b0d11" />
      {paths.map((p) => (
        <path key={p.key} d={p.d} fill={p.fill} />
      ))}
    </svg>
  );
}
