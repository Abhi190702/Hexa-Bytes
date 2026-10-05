import * as THREE from 'three';
import {
  buildGlobeCells,
  latLonToUnit,
  nearestCell,
  type GlobeCells,
} from '@/lib/evocomb/globe-cells';
import { layerColor, type GlobeLayer } from '@/lib/evocomb/globe-layers';

// Three.js scene for the "06 · Map" hex globe: a dark sphere with a rim glow and
// ~5k instanced hex discs on land (one draw call). Interaction (drag + inertia,
// ctrl+wheel zoom, arrow keys, idle auto-rotate, hover picking) lives here so the
// React host only wires lifecycle, visibility and the tooltip.
//
// Rendering is on demand: the RAF loop runs only while something moves (spin,
// inertia, zoom easing, a drag) and the canvas is visible, and draws only when
// the frame is dirty.

export interface HexGlobeOptions {
  dprCap: number;
  reducedMotion: boolean;
  layer: GlobeLayer;
  /** Hovered cell index (−1 = none) and pointer position in canvas CSS pixels. */
  onHover?: (index: number, x: number, y: number) => void;
}

const DEG = Math.PI / 180;
const PITCH_LIMIT = 1.2; // ~69°, keeps the poles from flipping over
const AUTO_SPEED = 0.07; // rad/s idle spin
const IDLE_RESUME_MS = 3500;
const DIST_MAX = 4.7;
const DIST_MIN = 3.3;
const FOV = 30;
const CELL_LIFT = 1.004;

const landVert = /* glsl */ `
  uniform int uHover;
  varying vec3 vColor;
  varying float vShade;
  varying float vHover;
  void main() {
    float h = gl_InstanceID == uHover ? 1.0 : 0.0;
    vec3 p = position * (1.0 + 0.45 * h);
    p.z += 0.01 * h;
    vec4 world = modelMatrix * instanceMatrix * vec4(p, 1.0);
    vec3 n = normalize((modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz);
    vec3 v = normalize(cameraPosition - world.xyz);
    vShade = 0.32 + 0.68 * pow(max(dot(n, v), 0.0), 0.7);
    vColor = instanceColor;
    vHover = h;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const landFrag = /* glsl */ `
  varying vec3 vColor;
  varying float vShade;
  varying float vHover;
  void main() {
    vec3 c = mix(vColor * vShade, vec3(1.0), vHover * 0.55);
    gl_FragColor = vec4(c, 1.0);
  }
`;

const globeVert = /* glsl */ `
  varying vec3 vN;
  varying vec3 vW;
  varying vec3 vL;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    vL = position;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const globeFrag = /* glsl */ `
  varying vec3 vN;
  varying vec3 vW;
  varying vec3 vL;
  void main() {
    vec3 v = normalize(cameraPosition - vW);
    float facing = max(dot(normalize(vN), v), 0.0);
    vec3 base = vec3(0.045, 0.052, 0.066);
    // Faint dot grid on the ocean, ~4° pitch.
    vec3 l = normalize(vL);
    float lat = asin(clamp(l.y, -1.0, 1.0));
    float lon = atan(l.x, l.z);
    vec2 g = vec2(lon * cos(lat), lat) / 0.0698;
    float d = length(fract(g) - 0.5);
    float dots = (1.0 - smoothstep(0.06, 0.13, d)) * 0.05 * facing;
    float rim = pow(1.0 - facing, 3.0);
    vec3 c = base + vec3(dots) + vec3(0.25, 0.5, 0.65) * rim * 0.35;
    gl_FragColor = vec4(c, 1.0);
  }
`;

const atmoVert = /* glsl */ `
  varying vec3 vN;
  void main() {
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmoFrag = /* glsl */ `
  varying vec3 vN;
  void main() {
    // Back faces: -n.z is 0 at the shell's silhouette and ~0.53 at the globe's
    // limb, so the glow fades out softly instead of ending in a hard ring.
    float a = pow(clamp(-vN.z / 0.53, 0.0, 1.0), 2.2) * 0.42;
    gl_FragColor = vec4(vec3(0.36, 0.68, 0.89), a);
  }
`;

export class HexGlobeController {
  readonly cells: GlobeCells;
  /** Frames actually drawn — read by the dev harness to check the loop idles. */
  frames = 0;

  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private globe = new THREE.Group();
  private land: THREE.InstancedMesh;
  private landMat: THREE.ShaderMaterial;
  private uHover = { value: -1 };
  private colors: THREE.InstancedBufferAttribute;
  private raycaster = new THREE.Raycaster();
  private hitSphere = new THREE.Sphere(new THREE.Vector3(), CELL_LIFT);
  private ro: ResizeObserver;

  private yaw = -78 * DEG; // face India
  private pitch = 0.36;
  private velYaw = 0;
  private velPitch = 0;
  private dist = DIST_MAX;
  private targetDist = DIST_MAX;
  private autoRamp = 0;

  private visible = true;
  private disposed = false;
  private raf = 0;
  private last = 0;
  private dirty = true;
  private lastInteract = -Infinity;

  private drag: {
    id: number;
    axis: 'pending' | 'free';
    sx: number;
    sy: number;
    x: number;
    y: number;
    t: number;
    moved: boolean;
  } | null = null;
  private pointer: { x: number; y: number } | null = null;
  private hover = -1;

  constructor(
    private canvas: HTMLCanvasElement,
    private opts: HexGlobeOptions,
  ) {
    this.cells = buildGlobeCells();

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, opts.dprCap));
    this.renderer.setClearColor(0x000000, 0);

    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 50);
    this.camera.position.set(0, 0, this.dist);

    // Globe body + atmosphere.
    const globeGeo = new THREE.SphereGeometry(1, 96, 64);
    const globeMat = new THREE.ShaderMaterial({
      vertexShader: globeVert,
      fragmentShader: globeFrag,
    });
    this.globe.add(new THREE.Mesh(globeGeo, globeMat));

    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(1.18, 64, 48),
      new THREE.ShaderMaterial({
        vertexShader: atmoVert,
        fragmentShader: atmoFrag,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
      }),
    );
    this.scene.add(atmo);

    // Land cells: pointy-top hex discs, gap of ~14% between neighbours.
    const { count, lat, lon, spacing } = this.cells;
    const hexR = ((spacing * DEG) / Math.sqrt(3)) * 0.86;
    const hexGeo = new THREE.CircleGeometry(hexR, 6, Math.PI / 6);
    this.landMat = new THREE.ShaderMaterial({
      vertexShader: landVert,
      fragmentShader: landFrag,
      uniforms: { uHover: this.uHover },
    });
    this.land = new THREE.InstancedMesh(hexGeo, this.landMat, count);
    const m = new THREE.Matrix4();
    const n = new THREE.Vector3();
    const east = new THREE.Vector3();
    const north = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      n.fromArray(latLonToUnit(lat[i] ?? 0, lon[i] ?? 0));
      east.set(n.z, 0, -n.x).normalize();
      north.crossVectors(n, east);
      m.makeBasis(east, north, n).setPosition(n.x * CELL_LIFT, n.y * CELL_LIFT, n.z * CELL_LIFT);
      this.land.setMatrixAt(i, m);
    }
    this.colors = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
    this.land.instanceColor = this.colors;
    this.land.frustumCulled = false;
    this.globe.add(this.land);
    this.scene.add(this.globe);
    this.setLayer(opts.layer);

    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);

    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onUp);
    canvas.addEventListener('pointerleave', this.onLeave);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('keydown', this.onKey);

    this.request();
  }

  // --- public API -----------------------------------------------------------

  /** Recolours instances in place for a layer; geometry is untouched. */
  setLayer(layer: GlobeLayer) {
    const scores = this.cells.scores[layer];
    if (!scores) return;
    const arr = this.colors.array as Float32Array;
    for (let i = 0; i < scores.length; i++) {
      const c = layerColor(layer, scores[i] ?? 0);
      arr[i * 3] = c[0];
      arr[i * 3 + 1] = c[1];
      arr[i * 3 + 2] = c[2];
    }
    this.colors.needsUpdate = true;
    this.invalidate();
  }

  setReducedMotion(reduced: boolean) {
    this.opts.reducedMotion = reduced;
    if (reduced) {
      this.velYaw = 0;
      this.velPitch = 0;
    }
    this.invalidate();
  }

  /** In viewport and tab visible; the loop stops entirely otherwise. */
  setVisible(visible: boolean) {
    this.visible = visible;
    if (!visible) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    } else {
      this.request();
    }
  }

  get running() {
    return this.raf !== 0;
  }

  resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.camera.aspect = aspect;
    // Keep the whole globe in frame on portrait boxes.
    this.camera.fov = aspect < 1 ? (2 * Math.atan(Math.tan((FOV / 2) * DEG) / aspect)) / DEG : FOV;
    this.camera.updateProjectionMatrix();
    this.invalidate();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.ro.disconnect();
    const c = this.canvas;
    c.removeEventListener('pointerdown', this.onDown);
    c.removeEventListener('pointermove', this.onMove);
    c.removeEventListener('pointerup', this.onUp);
    c.removeEventListener('pointercancel', this.onUp);
    c.removeEventListener('pointerleave', this.onLeave);
    c.removeEventListener('wheel', this.onWheel);
    c.removeEventListener('keydown', this.onKey);
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    this.land.dispose();
    this.renderer.dispose();
  }

  // --- loop -----------------------------------------------------------------

  private invalidate() {
    this.dirty = true;
    this.request();
  }

  /** Starts the loop if idle; the frame clock restarts so a long pause isn't one big step. */
  private request() {
    if (this.raf || !this.visible || this.disposed) return;
    this.last = 0;
    this.raf = requestAnimationFrame(this.frame);
  }

  private clampPitch() {
    this.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, this.pitch));
  }

  private frame = (t: number) => {
    this.raf = 0;
    const dt = this.last ? Math.min(0.1, (t - this.last) / 1000) : 1 / 60;
    this.last = t;
    const reduced = this.opts.reducedMotion;
    let moving = false;

    if (!this.drag) {
      if (!reduced && (Math.abs(this.velYaw) > 1e-3 || Math.abs(this.velPitch) > 1e-3)) {
        this.yaw += this.velYaw * dt;
        this.pitch += this.velPitch * dt;
        const k = Math.exp(-dt * 3.5);
        this.velYaw *= k;
        this.velPitch *= k;
        moving = true;
      } else {
        this.velYaw = 0;
        this.velPitch = 0;
      }
      if (!reduced) {
        const idle = performance.now() - this.lastInteract > IDLE_RESUME_MS;
        this.autoRamp = idle ? Math.min(1, this.autoRamp + dt / 1.5) : 0;
        if (this.autoRamp > 0) {
          this.yaw += AUTO_SPEED * this.autoRamp * dt;
          moving = true;
        }
      }
    }

    const dd = this.targetDist - this.dist;
    if (Math.abs(dd) > 1e-3) {
      this.dist += reduced ? dd : dd * (1 - Math.exp(-dt * 10));
      moving = true;
    }

    this.clampPitch();
    if (moving || this.dirty) {
      this.globe.rotation.set(this.pitch, this.yaw, 0);
      this.scene.updateMatrixWorld();
      this.camera.position.set(0, 0, this.dist);
      if (this.pointer && !this.drag) this.pick(this.pointer.x, this.pointer.y);
      this.renderer.render(this.scene, this.camera);
      this.frames++;
      this.dirty = false;
    }

    // Non-reduced mode keeps ticking so the idle spin can resume by itself.
    if ((moving || !reduced) && this.visible && !this.disposed) {
      this.raf = requestAnimationFrame(this.frame);
    }
  };

  // --- picking --------------------------------------------------------------

  private ndc = new THREE.Vector2();
  private hit = new THREE.Vector3();

  private pick(x: number, y: number) {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.ndc.set((x / w) * 2 - 1, -(y / h) * 2 + 1);
    this.camera.position.set(0, 0, this.dist);
    this.camera.updateMatrixWorld();
    this.raycaster.setFromCamera(this.ndc, this.camera);
    let idx = -1;
    if (this.raycaster.ray.intersectSphere(this.hitSphere, this.hit)) {
      this.globe.worldToLocal(this.hit).normalize();
      const lat = Math.asin(this.hit.y) / DEG;
      const lon = Math.atan2(this.hit.x, this.hit.z) / DEG;
      idx = nearestCell(this.cells, lat, lon);
    }
    if (idx !== this.hover) {
      this.hover = idx;
      this.uHover.value = idx;
      this.dirty = true;
      this.canvas.style.cursor = this.drag ? 'grabbing' : idx >= 0 ? 'pointer' : 'grab';
    }
    this.opts.onHover?.(idx, x, y);
  }

  private clearHover() {
    if (this.hover !== -1) {
      this.hover = -1;
      this.uHover.value = -1;
      this.invalidate();
    }
    this.opts.onHover?.(-1, 0, 0);
  }

  // --- input ----------------------------------------------------------------

  private local(e: PointerEvent | WheelEvent) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const { x, y } = this.local(e);
    this.drag = {
      id: e.pointerId,
      axis: e.pointerType === 'mouse' ? 'free' : 'pending',
      sx: x,
      sy: y,
      x,
      y,
      t: performance.now(),
      moved: false,
    };
    if (e.pointerType === 'mouse') this.canvas.setPointerCapture(e.pointerId);
    this.velYaw = 0;
    this.velPitch = 0;
    this.lastInteract = performance.now();
    this.canvas.style.cursor = 'grabbing';
  };

  private onMove = (e: PointerEvent) => {
    const { x, y } = this.local(e);
    const d = this.drag;
    if (!d || d.id !== e.pointerId) {
      if (e.pointerType === 'mouse') {
        this.pointer = { x, y };
        this.lastInteract = performance.now();
        this.invalidate();
      }
      return;
    }
    if (d.axis === 'pending') {
      const tx = x - d.sx;
      const ty = y - d.sy;
      if (Math.hypot(tx, ty) < 6) return;
      // Touch: only mostly-horizontal drags rotate; vertical ones stay page scroll.
      if (Math.abs(tx) > Math.abs(ty) * 1.2) {
        d.axis = 'free';
        this.canvas.setPointerCapture(e.pointerId);
      } else {
        this.drag = null;
        return;
      }
    }
    const now = performance.now();
    const k = (2.4 / this.canvas.clientHeight) * (this.dist / DIST_MAX);
    const dYaw = (x - d.x) * k;
    const dPitch = (y - d.y) * k;
    this.yaw += dYaw;
    this.pitch += dPitch;
    this.clampPitch();
    const dt = Math.max(8, now - d.t) / 1000;
    this.velYaw = this.velYaw * 0.4 + (dYaw / dt) * 0.6;
    this.velPitch = this.velPitch * 0.4 + (dPitch / dt) * 0.6;
    d.x = x;
    d.y = y;
    d.t = now;
    d.moved = true;
    this.lastInteract = now;
    if (this.hover !== -1) this.clearHover();
    this.invalidate();
  };

  private onUp = (e: PointerEvent) => {
    const d = this.drag;
    if (!d || d.id !== e.pointerId) return;
    this.drag = null;
    if (this.canvas.hasPointerCapture(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId);
    const now = performance.now();
    // A pause before release means no fling.
    if (this.opts.reducedMotion || now - d.t > 90 || e.type === 'pointercancel') {
      this.velYaw = 0;
      this.velPitch = 0;
    }
    this.lastInteract = now;
    const { x, y } = this.local(e);
    this.canvas.style.cursor = 'grab';
    // Tap / click without moving inspects the cell under the pointer.
    if (!d.moved && e.type === 'pointerup') {
      this.pointer = { x, y };
    } else if (e.pointerType === 'mouse') {
      this.pointer = { x, y };
    }
    this.invalidate();
  };

  private onLeave = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || this.drag) return;
    this.pointer = null;
    this.clearHover();
  };

  private onWheel = (e: WheelEvent) => {
    // Plain wheel scrolls the page; only ctrl/⌘+wheel (and trackpad pinch) zooms.
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    this.targetDist = Math.max(
      DIST_MIN,
      Math.min(DIST_MAX, this.targetDist * (1 + Math.sign(e.deltaY) * 0.08)),
    );
    this.lastInteract = performance.now();
    this.invalidate();
  };

  private onKey = (e: KeyboardEvent) => {
    const step = 0.14;
    switch (e.key) {
      case 'ArrowLeft':
        this.yaw -= step;
        break;
      case 'ArrowRight':
        this.yaw += step;
        break;
      case 'ArrowUp':
        this.pitch -= step;
        break;
      case 'ArrowDown':
        this.pitch += step;
        break;
      case '+':
      case '=':
        this.targetDist = Math.max(DIST_MIN, this.targetDist * 0.9);
        break;
      case '-':
      case '_':
        this.targetDist = Math.min(DIST_MAX, this.targetDist / 0.9);
        break;
      default:
        return;
    }
    e.preventDefault();
    this.clampPitch();
    this.velYaw = 0;
    this.velPitch = 0;
    this.lastInteract = performance.now();
    this.invalidate();
  };
}
