# EvoComb — scroll-driven WebGL landing

A cinematic, data-driven landing experience: one fixed WebGL backdrop that
evolves as you scroll while eight content sections float above it. The live map
stays at `/map`; this is the story that leads people there.

## Architecture

```
app/page.tsx                       → <Experience/>
components/site/
  Experience.tsx                   client root: smooth-scroll + storyboard + canvas + sections
  StressCanvas.tsx                 fixed WebGL host — lazy-imports Three.js, DPR cap, pause-on-hidden
  StressCanvasFallback.tsx         static SVG hex field for reduced-motion / low-end / no-WebGL
  HexGlobe.tsx                     06 · Map draggable hex globe (lazy lib/webgl/HexGlobeController, SVG fallback)
  SceneHUD.tsx                     technical chrome: ESI legend, scroll rail
  SiteNav.tsx
  sections/                        Hero · WhatItMeasures · WhyItMatters · Formula · Pipeline ·
                                   MapPreview · EvidenceLayer · FinalCTA · SiteFooter
  ui/                              Reveal (GSAP) · AnimatedNumber (anime) · EvidenceMarker (anime)
hooks/
  useReducedMotion / useDeviceProfile   capability gating
  useSmoothScroll                  Lenis ↔ GSAP ScrollTrigger sync
  useStoryboard                    one scrubbed trigger drives the whole scene
lib/webgl/
  scene-state.ts                   SceneBus (scroll → render channel) + color palette
  SceneController.ts               Three.js: instanced hex field + ground FX + crowd particles
  glsl.ts                          shader chunks (ESI ramp, fbm, hex, ground, particles)
  field.ts                         procedural "city" hex data + particle homes
lib/evocomb/
  storyboard.ts                    keyframed total-scroll → SceneState
  factors.ts / evidence.ts         copy + real, sourced data
```

### Why a SceneBus + single storyboard

Scroll position is decoupled from rendering. `useStoryboard` samples one
keyframed timeline from total page progress and patches a plain `SceneBus`
object. The Three.js controller reads the bus each frame and eases toward it.
Benefits: no per-section uniform fights, perfectly scroll-locked motion, and the
choreography still runs (harmlessly) when WebGL is disabled.

### The four layers + ESI blend

The instanced hex field carries per-cell `noise / crowd / heat / pollution / esi`
attributes. Uniforms `uNoiseL…uPollutionL` fade each factor's color + height in;
`uEsiBlend` cross-fades the whole field to the green→amber→red ESI ramp at the
climax. Noise rings, heat shimmer and pollution haze share one additive ground
plane; crowding is a GPU particle system. Weights/colors come straight from the
published `HEURISTICS`, so the visuals match the formula.

## Accessibility

- **Reduced motion** (`prefers-reduced-motion`): Lenis is skipped (native
  scroll), GSAP/Anime timelines are guarded per-component and render their final
  state instantly, the WebGL loop never starts (a single static frame / SVG
  fallback shows instead), and a global CSS rule neutralizes long transitions.
- **Keyboard**: the Formula factor chips are `role="slider"` with arrow-key
  control and visible focus rings. All actions are real links/buttons.
- **Semantics**: the canvas + HUD are `aria-hidden`; the hex preview has an
  `aria-label`; headings are ordered; numbers animate but the final value is the
  text content (announced correctly).
- **Zoom**: pinch-zoom is allowed (`maximumScale: 5`).
- **Contrast**: a radial scrim sits over the canvas and text sits on
  semi-opaque panels so copy meets contrast over the moving scene.

## Performance checklist

- [x] Three.js code-split & lazy-imported — `/` First Load ≈ 199 kB (map is 633 kB)
- [x] `devicePixelRatio` capped (1.5 mobile / 1.75 desktop)
- [x] Device-tier gating: `full` / `lite` (fewer particles) / `static` (no WebGL)
- [x] WebGL probe before mounting; static SVG fallback on failure
- [x] RAF paused on `visibilitychange` (tab hidden)
- [x] Instanced geometry for ~1.3 k hexes (one draw call)
- [x] Effects folded into 3 materials; additive, `depthWrite: false`
- [x] Uniform easing instead of per-frame GSAP tween churn
- [x] No blocking 3D assets — geometry is generated, shaders are inline strings
- [x] Fonts via `next/font` (self-hosted, swap)
- [x] Full GPU teardown on unmount (`dispose()`)
```
