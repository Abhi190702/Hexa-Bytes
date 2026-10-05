import * as THREE from 'three';
import {
  HEX_VERTEX,
  HEX_FRAGMENT,
  GROUND_VERTEX,
  GROUND_FRAGMENT,
  PARTICLE_VERTEX,
  PARTICLE_FRAGMENT,
} from './glsl';
import { buildHexField, buildParticleHomes, type HexField } from './field';
import { SCENE_COLORS, type SceneBus } from './scene-state';

const v3 = (c: readonly number[]) => new THREE.Color(c[0] ?? 0, c[1] ?? 0, c[2] ?? 0);

type N = { value: number };
type C = { value: THREE.Color };

// Eased value that chases a target each frame — smooths scroll scrubbing further.
class Eased {
  constructor(public value: number) {}
  to(target: number, rate: number) {
    this.value += (target - this.value) * rate;
    return this.value;
  }
}

interface HexUniforms {
  uTime: N;
  uReveal: N;
  uNoiseL: N;
  uCrowdL: N;
  uHeatL: N;
  uPollutionL: N;
  uEsiBlend: N;
  uGlow: N;
  uFocus: N;
  uBase: C;
  uFog: C;
  uCNoise: C;
  uCCrowd: C;
  uCHeat: C;
  uCPollution: C;
  uEsiLow: C;
  uEsiMid: C;
  uEsiHigh: C;
  [k: string]: THREE.IUniform;
}
interface GroundUniforms {
  uTime: N;
  uNoiseL: N;
  uHeatL: N;
  uPollutionL: N;
  uReveal: N;
  uCNoise: C;
  uCHeat: C;
  uCPollution: C;
  [k: string]: THREE.IUniform;
}
interface ParticleUniforms {
  uTime: N;
  uCrowdL: N;
  uReveal: N;
  uSize: N;
  uColor: C;
  [k: string]: THREE.IUniform;
}

/**
 * Owns the entire WebGL scene: an instanced H3-style hex field, an additive
 * ground-FX plane (noise rings / heat / pollution haze) and a crowd particle
 * system. It reads target values from the SceneBus every frame and eases the
 * uniforms toward them. All choreography lives in the scroll layer; this class
 * only renders the given SceneState.
 */
export class SceneController {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private raf = 0;
  private running = false;
  private disposed = false;
  private field: HexField = buildHexField(21, 1.0);

  private hexU: HexUniforms;
  private groundU: GroundUniforms;
  private particleU: ParticleUniforms;

  private e = {
    reveal: new Eased(0),
    noise: new Eased(0),
    crowd: new Eased(0),
    heat: new Eased(0),
    pollution: new Eased(0),
    esi: new Eased(0),
    glow: new Eased(0),
    dolly: new Eased(0.18),
    pan: new Eased(0),
    focus: new Eased(0),
  };

  constructor(
    canvas: HTMLCanvasElement,
    private bus: SceneBus,
    private opts: { dprCap: number; particles: number; reducedMotion: boolean },
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: opts.dprCap > 1.5,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, opts.dprCap));
    this.scene.background = v3(SCENE_COLORS.base);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    this.camera.position.set(0, 14, 30);

    this.hexU = {
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uNoiseL: { value: 0 },
      uCrowdL: { value: 0 },
      uHeatL: { value: 0 },
      uPollutionL: { value: 0 },
      uEsiBlend: { value: 0 },
      uGlow: { value: 0 },
      uFocus: { value: 0 },
      uBase: { value: v3(SCENE_COLORS.base) },
      uFog: { value: v3(SCENE_COLORS.base) },
      uCNoise: { value: v3(SCENE_COLORS.noise) },
      uCCrowd: { value: v3(SCENE_COLORS.crowd) },
      uCHeat: { value: v3(SCENE_COLORS.heat) },
      uCPollution: { value: v3(SCENE_COLORS.pollution) },
      uEsiLow: { value: v3(SCENE_COLORS.esiLow) },
      uEsiMid: { value: v3(SCENE_COLORS.esiMid) },
      uEsiHigh: { value: v3(SCENE_COLORS.esiHigh) },
    };
    this.groundU = {
      uTime: { value: 0 },
      uNoiseL: { value: 0 },
      uHeatL: { value: 0 },
      uPollutionL: { value: 0 },
      uReveal: { value: 0 },
      uCNoise: { value: v3(SCENE_COLORS.noise) },
      uCHeat: { value: v3(SCENE_COLORS.heat) },
      uCPollution: { value: v3(SCENE_COLORS.pollution) },
    };
    this.particleU = {
      uTime: { value: 0 },
      uCrowdL: { value: 0 },
      uReveal: { value: 0 },
      uSize: { value: 2.4 },
      uColor: { value: v3(SCENE_COLORS.crowd) },
    };

    this.buildField();
    this.buildGround();
    this.buildParticles();
    this.resize();

    if (opts.reducedMotion) {
      this.applyStatic(0.85, 0.7, 0.4, 0.55, 0.2);
    }
  }

  private buildField() {
    const base = new THREE.CylinderGeometry(0.94, 0.94, 1, 6);
    base.translate(0, 0.5, 0);

    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    if (base.attributes.position) geo.setAttribute('position', base.attributes.position);
    if (base.attributes.normal) geo.setAttribute('normal', base.attributes.normal);
    geo.instanceCount = this.field.count;

    const ia = (arr: Float32Array, size: number) => new THREE.InstancedBufferAttribute(arr, size);
    geo.setAttribute('aOffset', ia(this.field.offsets, 2));
    geo.setAttribute('aNoise', ia(this.field.noise, 1));
    geo.setAttribute('aCrowd', ia(this.field.crowd, 1));
    geo.setAttribute('aHeat', ia(this.field.heat, 1));
    geo.setAttribute('aPollution', ia(this.field.pollution, 1));
    geo.setAttribute('aEsi', ia(this.field.esi, 1));
    geo.setAttribute('aSeed', ia(this.field.seed, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: HEX_VERTEX,
      fragmentShader: HEX_FRAGMENT,
      uniforms: this.hexU,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    this.scene.add(mesh);
  }

  private buildGround() {
    const geo = new THREE.PlaneGeometry(120, 120, 1, 1);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({
      vertexShader: GROUND_VERTEX,
      fragmentShader: GROUND_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: this.groundU,
    });
    const plane = new THREE.Mesh(geo, mat);
    plane.position.y = 0.04;
    plane.frustumCulled = false;
    this.scene.add(plane);
  }

  private buildParticles() {
    const n = this.opts.particles;
    const { homes, seeds } = buildParticleHomes(n);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute('aHome', new THREE.BufferAttribute(homes, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    const mat = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERTEX,
      fragmentShader: PARTICLE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: this.particleU,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    this.scene.add(pts);
  }

  start() {
    if (this.running || this.opts.reducedMotion || this.disposed) return;
    this.running = true;
    this.clock.start();
    this.loop();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private loop = () => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    this.frame();
  };

  private frame() {
    const t = this.clock.getElapsedTime();
    const s = this.bus.state;
    const k = 0.08;

    const reveal = this.e.reveal.to(s.reveal, k);
    const noise = this.e.noise.to(s.noise, k);
    const crowd = this.e.crowd.to(s.crowd, k);
    const heat = this.e.heat.to(s.heat, k);
    const pollution = this.e.pollution.to(s.pollution, k);
    const esi = this.e.esi.to(s.esi, k);
    const glow = this.e.glow.to(s.glow, k);
    const dolly = this.e.dolly.to(s.camDolly, k);
    const pan = this.e.pan.to(s.camPan, k);
    const focus = this.e.focus.to(s.focus, k);

    this.write(t, reveal, noise, crowd, heat, pollution, esi, glow, focus);
    this.updateCamera(t, dolly, pan, focus);
    this.renderer.render(this.scene, this.camera);
  }

  private write(
    t: number,
    reveal: number,
    noise: number,
    crowd: number,
    heat: number,
    pollution: number,
    esi: number,
    glow: number,
    focus: number,
  ) {
    const h = this.hexU;
    h.uTime.value = t;
    h.uReveal.value = reveal;
    h.uNoiseL.value = noise;
    h.uCrowdL.value = crowd;
    h.uHeatL.value = heat;
    h.uPollutionL.value = pollution;
    h.uEsiBlend.value = esi;
    h.uGlow.value = glow;
    h.uFocus.value = focus;

    const g = this.groundU;
    g.uTime.value = t;
    g.uNoiseL.value = noise;
    g.uHeatL.value = heat;
    g.uPollutionL.value = pollution;
    g.uReveal.value = reveal;

    const p = this.particleU;
    p.uTime.value = t;
    p.uCrowdL.value = crowd;
    p.uReveal.value = reveal;
  }

  private updateCamera(t: number, dolly: number, pan: number, focus: number) {
    const radius = THREE.MathUtils.lerp(26, 40, dolly);
    const height = THREE.MathUtils.lerp(8, 34, dolly);
    const drift = Math.sin(t * 0.12) * 1.2 * (1 - focus);
    this.camera.position.set(pan * 18 + drift, height, radius);
    this.camera.lookAt(pan * 6, THREE.MathUtils.lerp(1.5, -1, focus), 0);
  }

  /** Single representative frame for reduced-motion (no animation loop). */
  private applyStatic(reveal: number, esi: number, glow: number, dolly: number, focus: number) {
    this.bus.patch({ reveal, esi, glow, camDolly: dolly, focus });
    this.write(0, reveal, 0, 0, 0, 0, esi, glow, focus);
    this.updateCamera(0, dolly, 0, focus);
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (!this.running) this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    this.stop();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    this.renderer.dispose();
  }
}
