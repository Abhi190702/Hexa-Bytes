// The cinematic storyboard. One keyframed timeline maps total page-scroll
// progress (0–1) to a full SceneState, so the WebGL backdrop evolves as a
// single continuous shot instead of disjoint per-section states fighting over
// the same uniforms.
//
// Beats (aligned to the eight sections, each ~one viewport tall):
//   hero → factor layers emerge → why-it-matters blend → ESI climax →
//   pipeline pull-back → map-preview focus → evidence recede → quiet settle.

import { SCENE_DEFAULT, type SceneState } from '@/lib/webgl/scene-state';

interface Keyframe {
  p: number;
  s: SceneState;
}

const k = (p: number, s: Partial<SceneState>): Keyframe => ({ p, s: { ...SCENE_DEFAULT, ...s } });

export const KEYFRAMES: Keyframe[] = [
  // 1 · Hero — quiet dark field, slow breathing.
  k(0.0, { reveal: 0.28, camDolly: 0.16 }),
  k(0.08, { reveal: 0.5, camDolly: 0.26 }),
  // 2 · What it measures — four layers emerge in sequence (factor colors).
  k(0.11, { reveal: 0.72, camDolly: 0.32, noise: 0 }),
  k(0.16, { reveal: 0.85, camDolly: 0.36, noise: 1 }),
  k(0.2, { reveal: 0.92, camDolly: 0.4, noise: 1, crowd: 1 }),
  k(0.25, { reveal: 0.96, camDolly: 0.42, noise: 1, crowd: 1, heat: 1 }),
  k(0.3, { reveal: 1, camDolly: 0.44, noise: 1, crowd: 1, heat: 1, pollution: 1 }),
  // 3 · Why it matters — begin blending the four into one index.
  k(0.38, {
    reveal: 1,
    camDolly: 0.5,
    noise: 0.5,
    crowd: 0.5,
    heat: 0.5,
    pollution: 0.5,
    esi: 0.55,
    glow: 0.35,
  }),
  // 4 · Formula — ESI climax: pure ramp, hexes rise and glow green→amber→red.
  k(0.48, { reveal: 1, camDolly: 0.55, camPan: 0.1, esi: 1, glow: 0.85 }),
  // 5 · Pipeline — pull back to a wide survey of the finished surface.
  k(0.6, { reveal: 1, camDolly: 0.72, camPan: -0.1, esi: 0.85, glow: 0.4 }),
  // 6 · Map preview — tighten focus, saturate the ramp behind the hex map.
  k(0.7, { reveal: 1, camDolly: 0.5, camPan: 0, esi: 1, glow: 0.5, focus: 1 }),
  // 7 · Evidence — recede so the cards lead.
  k(0.82, { reveal: 0.95, camDolly: 0.68, esi: 0.55, glow: 0.2, focus: 0.3 }),
  // 8 · Final CTA — quiet, settled index.
  k(0.93, { reveal: 0.9, camDolly: 0.4, esi: 0.7, glow: 0.35 }),
  k(1.0, { reveal: 0.9, camDolly: 0.4, esi: 0.7, glow: 0.35 }),
];

const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const KEYS = Object.keys(SCENE_DEFAULT) as (keyof SceneState)[];

/** Sample the full SceneState at a normalized scroll progress. */
export function sampleStoryboard(progress: number): SceneState {
  const p = Math.max(0, Math.min(1, progress));
  let a = KEYFRAMES[0]!;
  let b = KEYFRAMES[KEYFRAMES.length - 1]!;
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    const cur = KEYFRAMES[i]!;
    const nxt = KEYFRAMES[i + 1]!;
    if (p >= cur.p && p <= nxt.p) {
      a = cur;
      b = nxt;
      break;
    }
  }
  const span = b.p - a.p || 1;
  const t = smooth((p - a.p) / span);
  const out = { ...SCENE_DEFAULT };
  for (const key of KEYS) out[key] = lerp(a.s[key], b.s[key], t);
  return out;
}
