// GLSL building blocks shared by the scene's three materials. Kept as plain
// template strings so there is no shader-loader/build-step dependency.

/** Smooth value-noise + 4-octave fbm. Cheap, no textures. */
export const GLSL_NOISE = /* glsl */ `
  vec2 hash2(vec2 p){
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }
  float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = dot(hash2(i + vec2(0.0,0.0)), f - vec2(0.0,0.0));
    float b = dot(hash2(i + vec2(1.0,0.0)), f - vec2(1.0,0.0));
    float c = dot(hash2(i + vec2(0.0,1.0)), f - vec2(0.0,1.0));
    float d = dot(hash2(i + vec2(1.0,1.0)), f - vec2(1.0,1.0));
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
  }
  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for(int i = 0; i < 4; i++){ v += a * vnoise(p); p *= 2.02; a *= 0.5; }
    return v;
  }
`;

/** ESI 0–1 → green→amber→red, matching the map ramp. */
export const GLSL_ESI_RAMP = /* glsl */ `
  uniform vec3 uEsiLow;
  uniform vec3 uEsiMid;
  uniform vec3 uEsiHigh;
  vec3 esiRamp(float t){
    t = clamp(t, 0.0, 1.0);
    vec3 c = mix(uEsiLow, uEsiMid, smoothstep(0.0, 0.5, t));
    c = mix(c, uEsiHigh, smoothstep(0.5, 1.0, t));
    return c;
  }
`;

export const HEX_VERTEX = /* glsl */ `
  attribute vec2 aOffset;
  attribute float aNoise;
  attribute float aCrowd;
  attribute float aHeat;
  attribute float aPollution;
  attribute float aEsi;
  attribute float aSeed;

  uniform float uTime;
  uniform float uReveal;
  uniform float uNoiseL;
  uniform float uCrowdL;
  uniform float uHeatL;
  uniform float uPollutionL;
  uniform float uEsiBlend;
  uniform float uGlow;

  varying float vEsi;
  varying float vHeight;
  varying float vFactorW;
  varying vec3 vFactorCol;
  varying vec3 vNormal;
  varying float vView;
  varying float vSeed;

  uniform vec3 uCNoise;
  uniform vec3 uCCrowd;
  uniform vec3 uCHeat;
  uniform vec3 uCPollution;

  void main(){
    float ln = aNoise * uNoiseL;
    float lc = aCrowd * uCrowdL;
    float lh = aHeat * uHeatL;
    float lp = aPollution * uPollutionL;
    float layerW = ln + lc + lh + lp;

    vec3 fcol = uCNoise * ln + uCCrowd * lc + uCHeat * lh + uCPollution * lp;
    vFactorCol = layerW > 0.0001 ? fcol / layerW : vec3(0.0);
    vFactorW = clamp(layerW, 0.0, 1.0);

    // Idle breathing of the quiet field, then layered + ESI height.
    float breathe = 0.05 * sin(uTime * 0.55 + aSeed * 6.2831);
    float esiH = aEsi * uEsiBlend;
    float h = uReveal * (0.12 + layerW * 1.05 + esiH * 2.25 + esiH * uGlow * 0.6);
    h += breathe * uReveal * (0.4 + esiH);

    vec3 p = position;
    p.y *= max(h, 0.015);
    p.xz += aOffset;

    vEsi = aEsi;
    vHeight = h;
    vNormal = normal;
    vSeed = aSeed;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vView = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

export const HEX_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform float uEsiBlend;
  uniform float uGlow;
  uniform float uFocus;
  uniform vec3 uBase;
  uniform vec3 uFog;
  uniform float uTime;

  varying float vEsi;
  varying float vHeight;
  varying float vFactorW;
  varying vec3 vFactorCol;
  varying vec3 vNormal;
  varying float vView;
  varying float vSeed;

  ${GLSL_ESI_RAMP}

  void main(){
    vec3 esiCol = esiRamp(vEsi);
    esiCol = mix(esiCol, esiCol * 1.15 + 0.04, uFocus);

    vec3 col = uBase;
    col = mix(col, vFactorCol, vFactorW * 0.92);
    col = mix(col, esiCol, uEsiBlend);

    // Cheap directional shade from the prism normal (top faces read brightest).
    float lit = 0.45 + 0.55 * clamp(vNormal.y, 0.0, 1.0);
    col *= lit;

    // Emissive lift on tall, stressed hexes.
    col += esiCol * vHeight * (0.18 + 0.5 * uGlow) * uEsiBlend;

    // Faint top-edge rim flicker so the field feels alive, not static.
    float pulse = 0.5 + 0.5 * sin(uTime * 1.2 + vSeed * 6.2831);
    col += esiCol * vEsi * pulse * 0.04 * uEsiBlend;

    // Distance fog to the background for depth.
    float fog = clamp((vView - 14.0) / 42.0, 0.0, 1.0);
    fog *= (1.0 - 0.35 * uFocus);
    col = mix(col, uFog, fog);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export const GROUND_VERTEX = /* glsl */ `
  varying vec2 vWorld;
  void main(){
    vWorld = position.xz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Folds three field effects into one additive plane:
//   pollution = drifting blue-grey fbm haze
//   noise     = orange pulse rings travelling along procedural "roads"
//   heat      = red radial shimmer from hot zones
export const GROUND_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vWorld;

  uniform float uTime;
  uniform float uNoiseL;
  uniform float uHeatL;
  uniform float uPollutionL;
  uniform float uReveal;
  uniform vec3 uCNoise;
  uniform vec3 uCHeat;
  uniform vec3 uCPollution;

  ${GLSL_NOISE}

  // Distance to a set of road-like polylines (axis + diagonals through origin).
  float roadField(vec2 p){
    float d = 1e3;
    d = min(d, abs(p.y + 2.0 * sin(p.x * 0.05)));
    d = min(d, abs(p.x - 3.0 * sin(p.y * 0.045)));
    d = min(d, abs((p.x + p.y) * 0.7071 + 4.0));
    d = min(d, abs((p.x - p.y) * 0.7071 - 6.0));
    return d;
  }

  void main(){
    vec2 p = vWorld;
    float r = length(p);
    float falloff = smoothstep(46.0, 8.0, r); // fade at the field edge
    vec3 col = vec3(0.0);
    float alpha = 0.0;

    // Pollution haze
    float haze = fbm(p * 0.06 + vec2(uTime * 0.03, -uTime * 0.02));
    haze = smoothstep(-0.1, 0.6, haze);
    col += uCPollution * haze * uPollutionL * 0.9;
    alpha += haze * uPollutionL * 0.5;

    // Noise pulse rings along roads
    float rd = roadField(p);
    float road = smoothstep(2.4, 0.0, rd);
    float ring = 0.5 + 0.5 * sin(r * 0.6 - uTime * 1.6);
    float rings = pow(ring, 3.0) * road;
    col += uCNoise * rings * uNoiseL * 1.2;
    alpha += rings * uNoiseL * 0.6;

    // Heat shimmer from a couple of hot cores
    float h1 = exp(-length(p - vec2(-10.0, 8.0)) * 0.08);
    float h2 = exp(-length(p - vec2(14.0, -6.0)) * 0.09);
    float shimmer = (h1 + h2) * (0.7 + 0.3 * sin(uTime * 3.0 + p.x));
    col += uCHeat * shimmer * uHeatL * 1.1;
    alpha += shimmer * uHeatL * 0.55;

    alpha *= falloff * uReveal;
    col *= falloff;
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.85));
  }
`;

export const PARTICLE_VERTEX = /* glsl */ `
  attribute float aSeed;
  attribute vec3 aHome;
  uniform float uTime;
  uniform float uCrowdL;
  uniform float uSize;
  uniform float uReveal;
  varying float vA;
  void main(){
    vec3 pos = aHome;
    float t = uTime * 0.4 + aSeed * 6.2831;
    // Gentle clustering swirl around the activity home point.
    pos.x += sin(t) * (0.6 + aSeed);
    pos.z += cos(t * 1.1) * (0.6 + aSeed);
    pos.y += 0.6 + 1.8 * (0.5 + 0.5 * sin(t * 0.8)) * uCrowdL;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uCrowdL * (60.0 / -mv.z);
    vA = uCrowdL * uReveal * (0.4 + 0.6 * (0.5 + 0.5 * sin(t)));
  }
`;

export const PARTICLE_FRAGMENT = /* glsl */ `
  precision mediump float;
  uniform vec3 uColor;
  varying float vA;
  void main(){
    vec2 d = gl_PointCoord - 0.5;
    float r = dot(d, d);
    if(r > 0.25) discard;
    float a = smoothstep(0.25, 0.0, r) * vA;
    gl_FragColor = vec4(uColor, a);
  }
`;
