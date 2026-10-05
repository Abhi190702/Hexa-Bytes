// The single source of truth that connects scroll position to the WebGL scene.
//
// Scroll sections write target values onto a SceneBus; the Three.js controller
// reads the bus every frame and eases toward it. Because the bus is a plain
// object with no Three.js dependency, the scroll choreography still runs when
// WebGL is disabled (reduced-motion / low-end devices) — it just has no listener.

export interface SceneState {
  /** 0 = dark flat field, 1 = hexes fully emerged. Drives the hero "breathing". */
  reveal: number;
  /** Per-factor layer intensity, 0–1. Tint + height contribution of each signal. */
  noise: number;
  crowd: number;
  heat: number;
  pollution: number;
  /** 0 = factor colors, 1 = blended ESI green→amber→red ramp. */
  esi: number;
  /** Extra emissive lift on the ESI surface (used at the climax + map preview). */
  glow: number;
  /** Camera framing, 0 = low cinematic angle, 1 = high wide survey. */
  camDolly: number;
  /** Lateral camera pan, -1 … 1. */
  camPan: number;
  /** Map-preview focus: tightens fog + saturates the ramp. */
  focus: number;
}

export const SCENE_DEFAULT: SceneState = {
  reveal: 0,
  noise: 0,
  crowd: 0,
  heat: 0,
  pollution: 0,
  esi: 0,
  glow: 0,
  camDolly: 0.18,
  camPan: 0,
  focus: 0,
};

// Color-by-meaning palette. Kept in sync with the ESI heuristics + map ramp.
// sRGB 0–1 triplets so they drop straight into GLSL uniforms.
export const SCENE_COLORS = {
  noise: [0.902, 0.494, 0.133], // #e67e22 orange
  crowd: [0.608, 0.349, 0.714], // #9b59b6 purple
  heat: [0.906, 0.298, 0.235], // #e74c3c red
  pollution: [0.498, 0.549, 0.553], // #7f8c8d blue-grey
  // ESI ramp stops: green (calm) → amber (pressure) → red (high burden)
  esiLow: [0.153, 0.682, 0.376], // #27ae60
  esiMid: [0.945, 0.769, 0.059], // #f1c40f
  esiHigh: [0.753, 0.224, 0.169], // #c0392b
  base: [0.043, 0.047, 0.055], // #0b0c0e field base
} as const;

type Listener = (s: Readonly<SceneState>) => void;

/** Decoupled scroll → render channel. One instance is shared app-wide. */
export class SceneBus {
  readonly state: SceneState = { ...SCENE_DEFAULT };
  private listeners = new Set<Listener>();

  patch(partial: Partial<SceneState>): void {
    Object.assign(this.state, partial);
    for (const fn of this.listeners) fn(this.state);
  }

  reset(): void {
    Object.assign(this.state, SCENE_DEFAULT);
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

let singleton: SceneBus | null = null;
export function getSceneBus(): SceneBus {
  if (!singleton) singleton = new SceneBus();
  return singleton;
}
