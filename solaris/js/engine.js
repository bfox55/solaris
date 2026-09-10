/* Solaris — main engine (three.js)
 * Realistic Keplerian motion from J2000 elements (see orbital.js),
 * procedurally generated textures, shader sun, twinkling starfield,
 * glass HUD. No external assets — everything is generated at boot.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import * as O from './orbital.js';

/* ── value noise (shared by texture generation) ────────────── */
function makeNoise3(seed) {
  const rand = O.mulberry32(seed);
  const perm = new Uint8Array(512);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = (rand() * (i + 1)) | 0;
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const g = new Float32Array(256);
  for (let i = 0; i < 256; i++) g[i] = rand() * 2 - 1;
  const fade = (t) => t * t * (3 - 2 * t);
  const h = (x, y, z) => g[perm[(perm[(perm[x & 255] + y) & 255] + z) & 255]];
  return function noise(x, y, z) {
    const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
    const fx = x - X, fy = y - Y, fz = z - Z;
    const u = fade(fx), v = fade(fy), w = fade(fz);
    const A = h(X, Y, Z), B = h(X + 1, Y, Z), C = h(X, Y + 1, Z), D = h(X + 1, Y + 1, Z);
    const E = h(X, Y, Z + 1), F = h(X + 1, Y, Z + 1), G = h(X, Y + 1, Z + 1), H = h(X + 1, Y + 1, Z + 1);
    const l = (a, b, t) => a + (b - a) * t;
    return l(l(l(A, B, u), l(C, D, u), v), l(l(E, F, u), l(G, H, u), v), w);
  };
}
function fbm(nz, x, y, z, oct = 4, lac = 2.0, gain = 0.5) {
  let s = 0, amp = 1, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) {
    s += amp * nz(x * f, y * f, z * f);
    norm += amp; amp *= gain; f *= lac;
  }
  return s / norm; // -1..1
}

function canvasTex(w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
/** Equirect (u,v) texel -> point on the unit sphere; seamless at the wrap. */
function cylCoord(i, j, w, h) {
  const u = i / w, v = j / h;
  const phi = (0.5 - v) * Math.PI;
  const theta = u * O.TAU;
  return [Math.cos(phi) * Math.cos(theta), Math.sin(phi), Math.cos(phi) * Math.sin(theta)];
}

/* ── texture painters ──────────────────────────────────────── */
function paintRocky(w, h, seed, base, spot, craters) {
  return canvasTex(w, h, (ctx, W, H) => {
    const nz = makeNoise3(seed);
    const img = ctx.createImageData(W, H);
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        const [x, y, z] = cylCoord(i, j, W, H);
        const t = (fbm(nz, x * 2.2, y * 2.2, z * 2.2, 5) + 1) / 2;
        const cr = fbm(nz, x * 9 + 40, y * 9, z * 9, 4);
        let r = base[0], g = base[1], b = base[2];
        if (t > 0.62) { r = spot[0]; g = spot[1]; b = spot[2]; }
        const k = 0.72 + 0.55 * t + 0.08 * cr;
        const o = (j * W + i) * 4;
        img.data[o] = Math.min(255, r * k);
        img.data[o + 1] = Math.min(255, g * k);
        img.data[o + 2] = Math.min(255, b * k);
        img.data[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    if (craters) {
      const rr = O.mulberry32(seed + 7);
      for (let c = 0; c < 42; c++) {
        const cx = rr() * W, cy = H * (0.15 + rr() * 0.7), rad = 2 + rr() * 9;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        grad.addColorStop(0, 'rgba(20,16,14,0.30)');
        grad.addColorStop(0.75, 'rgba(20,16,14,0.12)');
        grad.addColorStop(1, 'rgba(255,240,220,0.10)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(cx, cy, rad, 0, O.TAU); ctx.fill();
      }
    }
  });
}
function paintBanded(w, h, seed, colors, bands, wobble, spot) {
  return canvasTex(w, h, (ctx, W, H) => {
    const nz = makeNoise3(seed);
    const img = ctx.createImageData(W, H);
    for (let j = 0; j < H; j++) {
      const v = j / H;
      for (let i = 0; i < W; i++) {
        const [x, y, z] = cylCoord(i, j, W, H);
        const wob = fbm(nz, x * 2 + 11, y * 2, z * 2, 3) * wobble;
        const t = 0.5 + 0.5 * Math.sin((v + wob) * O.TAU * bands - Math.PI / 2);
        const c1 = colors[0], c2 = colors[1];
        const fine = fbm(nz, x * 14, y * 14, z * 14, 3) * 0.06;
        let r = (c1[0] + (c2[0] - c1[0]) * t) * (1 + fine);
        let g = (c1[1] + (c2[1] - c1[1]) * t) * (1 + fine);
        let b = (c1[2] + (c2[2] - c1[2]) * t) * (1 + fine);
        const o = (j * W + i) * 4;
        img.data[o] = Math.min(255, r); img.data[o + 1] = Math.min(255, g);
        img.data[o + 2] = Math.min(255, b); img.data[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    if (spot) { // Great-Red-Spot style oval
      const cx = spot.x * W, cy = spot.y * H;
      const rx = spot.rx * W, ry = spot.ry * H;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(rx, ry);
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      grad.addColorStop(0, spot.color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(0, 0, 1, 0, O.TAU); ctx.fill();
      ctx.restore();
      ctx.save(); // wrapped copy
      ctx.translate(cx - W, cy); ctx.scale(rx, ry);
      const grad2 = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      grad2.addColorStop(0, spot.color); grad2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad2;
      ctx.beginPath(); ctx.arc(0, 0, 1, 0, O.TAU); ctx.fill();
      ctx.restore();
    }
  });
}
function paintEarth(w, h, seed) {
  return canvasTex(w, h, (ctx, W, H) => {
    const nz = makeNoise3(seed);
    const img = ctx.createImageData(W, H);
    for (let j = 0; j < H; j++) {
      const v = j / H;
      const lat = (0.5 - v) * Math.PI;
      const cap = Math.abs(lat) > 1.32 + fbm(nz, 0, v * 8, 5, 3) * 0.06;
      for (let i = 0; i < W; i++) {
        const [x, y, z] = cylCoord(i, j, W, H);
        const cont = fbm(nz, x * 1.6, y * 1.6, z * 1.6, 5);
        const detail = fbm(nz, x * 6 + 9, y * 6, z * 6, 4);
        let r, g, b;
        if (cap) { r = 232; g = 238; b = 244; }
        else if (cont + detail * 0.18 > 0.08) {
          r = 96 + 60 * Math.max(0, cont - 0.2);
          g = 92 + 70 * (0.5 + 0.5 * detail);
          b = 52;
          if (Math.abs(lat) > 1.15 && detail > 0.1) { r = 122; g = 112; b = 74; }
        } else {
          const depth = 0.5 + 0.5 * fbm(nz, x * 3, y * 3, z * 3, 3);
          r = 12 + 22 * depth; g = 44 + 36 * depth; b = 108 + 56 * depth;
        }
        const o = (j * W + i) * 4;
        img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  });
}
function paintClouds(w, h, seed) {
  return canvasTex(w, h, (ctx, W, H) => {
    const nz = makeNoise3(seed + 99);
    const img = ctx.createImageData(W, H);
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        const [x, y, z] = cylCoord(i, j, W, H);
        const c = fbm(nz, x * 2.4, y * 2.4, z * 2.4, 5);
        const a = Math.min(1, Math.max(0, c - 0.12) * 2.2);
        const o = (j * W + i) * 4;
        img.data[o] = 255; img.data[o + 1] = 255; img.data[o + 2] = 255;
        img.data[o + 3] = a * 210;
      }
    }
    ctx.putImageData(img, 0, 0);
  });
}
function paintRing(w, h, seed) {
  return canvasTex(w, h, (ctx, W, H) => {
    const nz = makeNoise3(seed);
    const img = ctx.createImageData(W, H);
    for (let i = 0; i < W; i++) {
      const t = i / W;
      const band = fbm(nz, t * 24, 0.5, 0.5, 4);
      let a = 0.55 + 0.45 * band;
      if (t < 0.10) a *= t / 0.10;
      if (t > 0.97) a *= (1 - t) / 0.03;
      if (t > 0.60 && t < 0.66) a *= 0.08; // Cassini division
      for (let r = 0; r < H; r++) {
        const o = (r * W + i) * 4;
        img.data[o] = 196 + 40 * band;
        img.data[o + 1] = 178 + 30 * band;
        img.data[o + 2] = 140 + 24 * band;
        img.data[o + 3] = a * 235;
      }
    }
    ctx.putImageData(img, 0, 0);
  });
}
function glowTex(stops, inner, outer) {
  return canvasTex(128, 128, (ctx, W) => {
    const g = ctx.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
    g.addColorStop(0, inner);
    for (const [p, c] of stops) g.addColorStop(p, c);
    g.addColorStop(1, outer);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, W);
  });
}
/** Comet tail ribbon: bright at the base (plane bottom, nucleus side),
 *  fading toward the tip. CanvasTexture flipY puts canvas row 0 at v=1,
 *  so the bright base lives at the BOTTOM rows of the canvas. */
function tailTex() {
  return canvasTex(64, 256, (ctx, W, H) => {
    const img = ctx.createImageData(W, H);
    for (let y = 0; y < H; y++) {
      const v = y / H; // 0 at canvas top (tip side), 1 at bottom (nucleus side)
      for (let x = 0; x < W; x++) {
        const u = (x + 0.5) / W;
        const aX = Math.pow(Math.max(0, 1 - Math.abs(u - 0.5) * 2.2), 1.6);
        const a = aX * Math.pow(v, 1.4) * 0.9;
        const o = (y * W + x) * 4;
        img.data[o] = 190; img.data[o + 1] = 220; img.data[o + 2] = 255;
        img.data[o + 3] = a * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  });
}

/* ── renderer / camera ─────────────────────────────────────── */
const wrap = document.getElementById('scene-wrap');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
wrap.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04050a);
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 8000);
camera.position.set(0, 62, 132);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 4;
controls.maxDistance = 900;

scene.add(new THREE.AmbientLight(0x404860, 1.15));
const sunLight = new THREE.PointLight(0xfff3d8, 3.4, 0, 0); // decay 0 = visual, not physical
scene.add(sunLight);

/* ── starfield ─────────────────────────────────────────────── */
function starField(count, radius, size, band, seed) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const siz = new Float32Array(count);
  const pha = new Float32Array(count);
  const rnd = O.mulberry32(seed);
  for (let i = 0; i < count; i++) {
    let v;
    if (band && rnd() < 0.82) {
      // milky-way band: cluster near a tilted great circle
      const th = rnd() * O.TAU;
      const off = (rnd() + rnd() + rnd() - 1.5) * 0.16;
      v = new THREE.Vector3(Math.cos(th), off, Math.sin(th)).normalize();
      v.applyAxisAngle(new THREE.Vector3(1, 0, 0), 0.45);
    } else {
      v = new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize();
    }
    const r = radius * (0.92 + rnd() * 0.16);
    pos.set([v.x * r, v.y * r, v.z * r], i * 3);
    const t = rnd();
    const c = t < 0.68 ? [1, 1, 1] : t < 0.85 ? [0.78, 0.86, 1] : t < 0.94 ? [1, 0.88, 0.72] : [1, 0.7, 0.62];
    const b = 0.35 + rnd() * 0.65;
    col.set([c[0] * b, c[1] * b, c[2] * b], i * 3);
    siz[i] = size * (0.5 + rnd() * rnd() * 1.6);
    pha[i] = rnd() * O.TAU;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(pha, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPx: { value: renderer.getPixelRatio() } },
    vertexShader: `
      attribute float aSize; attribute float aPhase; attribute vec3 aColor;
      varying vec3 vC; varying float vT;
      uniform float uTime; uniform float uPx;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float tw = 0.82 + 0.18 * sin(uTime * (0.6 + fract(aPhase * 7.0) * 1.4) + aPhase);
        vT = tw; vC = aColor;
        float ps = aSize * uPx * tw * (420.0 / max(-mv.z, 1.0));
        gl_PointSize = clamp(ps, 1.0, 9.0 * uPx);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vC; varying float vT;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.06, d) * vT;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vC, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geo, mat);
}
const starsMain = starField(4200, 2600, 1.5, true, 42);
const starsFaint = starField(1600, 2400, 0.8, false, 7);
scene.add(starsMain, starsFaint);

/* ── ecliptic grid ─────────────────────────────────────────── */
const grid = new THREE.Group();
{
  const matR = new THREE.LineBasicMaterial({ color: 0x4cc2ff, transparent: true, opacity: 0.07 });
  const matS = new THREE.LineBasicMaterial({ color: 0x8b94a7, transparent: true, opacity: 0.05 });
  for (let r = 30; r <= 240; r += 30) {
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * O.TAU;
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
    }
    grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), matR));
  }
  for (let s = 0; s < 24; s++) {
    const a = (s / 24) * O.TAU;
    grid.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(Math.cos(a) * 240, 0, Math.sin(a) * 240)]),
      matS));
  }
}
scene.add(grid);

/* ── sun ───────────────────────────────────────────────────── */
const SUN_R = 2.8;
const sunMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `
    varying vec3 vN; varying vec3 vW;
    void main() {
      vN = normalize(normal);
      vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `
    varying vec3 vN; varying vec3 vW; uniform float uTime;
    float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.123;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float vnoise(vec3 p) {
      vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      float n = mix(
        mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
        mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
      return n * 2.0 - 1.0;
    }
    float fbm(vec3 p) { float s = 0.0, a = 0.55; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p *= 2.15; a *= 0.5; } return s; }
    void main() {
      vec3 p = normalize(vW) * 3.2;
      float t = uTime * 0.05;
      float n = fbm(p + vec3(t, -t * 0.7, t * 0.4));
      vec3 c = mix(vec3(1.0, 0.55, 0.12), vec3(1.0, 0.93, 0.62), smoothstep(-0.35, 0.55, n));
      vec3 V = normalize(cameraPosition - vW);
      float limb = 0.42 + 0.58 * pow(max(dot(normalize(vN), V), 0.0), 0.55);
      gl_FragColor = vec4(c * 1.5 * limb, 1.0);
    }`,
});
const sun = new THREE.Mesh(new THREE.SphereGeometry(SUN_R, 64, 64), sunMat);
scene.add(sun);
sun.userData.key = 'sun';

const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: glowTex([[0.12, 'rgba(255,180,90,0.55)'], [0.4, 'rgba(255,140,50,0.14)']], 'rgba(255,220,150,0.8)', 'rgba(0,0,0,0)'),
  blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
}));
sunGlow.scale.setScalar(SUN_R * 7.5);
scene.add(sunGlow);

/* ── bodies ────────────────────────────────────────────────── */
const BODIES = O.BODIES;
const planetMesh = new Map();      // key -> pivot (positioned each frame)
const spinNode = new Map();        // key -> node that rotates (axial spin)
const pickMesh = new Map();        // key -> invisible hit sphere (follows pivot)
const bodyOrbitLine = new Map();   // key -> orbit line (moons: child of Earth pivot)
const SUN_DEF = { key: 'sun', name: 'Sun', type: 'G2V main-sequence star' };
const byKey = new Map([SUN_DEF, ...BODIES].map((b) => [b.key, b]));

function bodyMaterial(def) {
  switch (def.key) {
    case 'mercury': return new THREE.MeshStandardMaterial({ map: paintRocky(512, 256, 11, [128, 118, 108], [72, 64, 58], true), roughness: 1 });
    case 'venus':   return new THREE.MeshStandardMaterial({ map: paintBanded(512, 256, 22, [[212, 178, 122], [176, 132, 84]], 7, 0.05, null), roughness: 0.95 });
    case 'earth':   return new THREE.MeshStandardMaterial({ map: paintEarth(512, 256, 33), roughness: 0.9, metalness: 0.05 });
    case 'mars':    return new THREE.MeshStandardMaterial({ map: paintRocky(512, 256, 44, [178, 92, 54], [120, 52, 30], true), roughness: 1 });
    case 'jupiter': return new THREE.MeshStandardMaterial({
        map: paintBanded(512, 256, 55, [[226, 202, 166], [166, 110, 74]], 9, 0.045, { x: 0.30, y: 0.68, rx: 0.06, ry: 0.10, color: 'rgba(196,84,54,0.9)' }),
        roughness: 0.9 });
    case 'saturn':  return new THREE.MeshStandardMaterial({ map: paintBanded(512, 256, 66, [[232, 214, 172], [188, 158, 108]], 8, 0.03, null), roughness: 0.9 });
    case 'uranus':  return new THREE.MeshStandardMaterial({ map: paintBanded(512, 256, 77, [[168, 214, 216], [128, 178, 190]], 5, 0.02, null), roughness: 0.85 });
    case 'neptune': return new THREE.MeshStandardMaterial({ map: paintBanded(512, 256, 88, [[64, 118, 210], [34, 74, 168]], 6, 0.05, null), roughness: 0.85 });
    case 'moon':    return new THREE.MeshStandardMaterial({ map: paintRocky(256, 128, 99, [172, 170, 166], [96, 92, 88], true), roughness: 1 });
    case 'halley':  return new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 1 });
  }
}

const VIS_RADIUS = { mercury: 0.55, venus: 0.95, earth: 1.0, mars: 0.7, jupiter: 2.6, saturn: 2.15, uranus: 1.5, neptune: 1.45, moon: 0.3, halley: 0.45 };
const ORBIT_COLOR = { mercury: 0x9c8e80, venus: 0xe8c98f, earth: 0x4da6ff, mars: 0xe07a52, jupiter: 0xd9a066, saturn: 0xe8d5a3, uranus: 0x9fe8e8, neptune: 0x6f9fe8, moon: 0x9aa4b5, halley: 0x8fd4ff };
function makeOrbitLine(def, pts, parent) {
  const v = new Float32Array(pts.length * 3);
  pts.forEach((p, i) => v.set(p, i * 3));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(v, 3));
  if (def.key === 'halley') {
    const line = new THREE.Line(geo, new THREE.LineDashedMaterial({
      color: ORBIT_COLOR.halley, dashSize: 3.5, gapSize: 2.2, transparent: true, opacity: 0.55 }));
    line.computeLineDistances();
    (parent || scene).add(line);
    return line;
  }
  const line = new THREE.LineLoop(geo, new THREE.LineBasicMaterial({
    color: ORBIT_COLOR[def.key], transparent: true, opacity: def.key === 'moon' ? 0.3 : 0.4 }));
  (parent || scene).add(line);
  return line;
}

for (const def of BODIES) {
  const r = VIS_RADIUS[def.key];
  const pivot = new THREE.Group();
  scene.add(pivot);
  planetMesh.set(def.key, pivot);

  // axial-tilt group + spin node (so the tilt is preserved under rotation)
  const tilt = new THREE.Group();
  tilt.rotation.z = (def.tilt !== undefined ? def.tilt : 0) * O.DEG;
  pivot.add(tilt);
  let spin = tilt;
  let coma, nucleus, tail;
  if (def.key === 'halley') {
    // dedicated group: local +Y points AWAY from the sun (tail direction),
    // scaled along Y so the tail length can breathe with rAU
    spin = new THREE.Group();
    pivot.add(spin);
    nucleus = new THREE.Mesh(new THREE.SphereGeometry(r * 0.55, 16, 16), bodyMaterial(def));
    coma = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex([[0.3, 'rgba(150,200,255,0.35)']], 'rgba(220,240,255,0.5)', 'rgba(0,0,0,0)'),
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    }));
    coma.scale.setScalar(r * 6);
    // two crossed planes = cheap comet tail; each is a gradient ribbon in the
    // tail plane, so at least one is always reasonably face-on to the camera
    const tailMat = new THREE.MeshBasicMaterial({
      map: tailTex(), transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide,
    });
    tail = new THREE.Group();
    const mkPlane = (rotY) => {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1), tailMat);
      p.rotation.y = rotY;
      p.position.y = 0.5; // unit-length ribbon; group scale.y sets the tail length
      return p;
    };
    tail.add(mkPlane(Math.PI / 2), mkPlane(0));
    tilt.add(spin);
    spin.add(nucleus, coma, tail);
    pivot.userData.coma = coma;
    pivot.userData.nucleus = nucleus;
    pivot.userData.tail = tail;
  } else {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 48), bodyMaterial(def));
    tilt.add(ball);
    if (def.key === 'earth') {
      const clouds = new THREE.Mesh(
        new THREE.SphereGeometry(r * 1.015, 48, 48),
        new THREE.MeshStandardMaterial({ map: paintClouds(512, 256, 133), transparent: true, depthWrite: false, opacity: 0.85 }));
      tilt.add(clouds);
      pivot.userData.clouds = clouds;
      const atmo = new THREE.Mesh(
        new THREE.SphereGeometry(r * 1.06, 48, 48),
        new THREE.ShaderMaterial({
          vertexShader: `
            varying vec3 vN; varying vec3 vW;
            void main() {
              vN = normalize(normal);
              vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }`,
          fragmentShader: `
            varying vec3 vN; varying vec3 vW;
            void main() {
              vec3 V = normalize(cameraPosition - vW);
              float f = pow(1.0 - abs(dot(normalize(vN), V)), 2.6);
              gl_FragColor = vec4(vec3(0.35, 0.62, 1.0) * f * 1.6, f);
            }`,
          transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide,
        }));
      tilt.add(atmo);
    }
    if (def.key === 'saturn') {
      const inner = r * 1.35, outer = r * 2.35;
      const ringGeo = new THREE.RingGeometry(inner, outer, 96);
      // remap UVs radially so the 1x4 ring texture spans ring width
      const posA = ringGeo.attributes.position;
      const uv = ringGeo.attributes.uv;
      const v3 = new THREE.Vector3();
      for (let i = 0; i < posA.count; i++) {
        v3.fromBufferAttribute(posA, i);
        uv.setXY(i, (v3.length() - inner) / (outer - inner), 0.5);
      }
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshStandardMaterial({
        map: paintRing(512, 4, 210), side: THREE.DoubleSide, transparent: true, roughness: 0.8, metalness: 0,
      }));
      ring.rotation.x = Math.PI / 2;
      tilt.add(ring);
    }
    spin = tilt; // spin the tilted group
  }
  spinNode.set(def.key, spin);

  // invisible pick sphere (bigger hit area for small bodies)
  const pick = new THREE.Mesh(new THREE.SphereGeometry(Math.max(r, 1.2), 12, 12),
    new THREE.MeshBasicMaterial({ visible: false }));
  pick.userData.key = def.key;
  pivot.add(pick);
  pickMesh.set(def.key, pick);
}

// orbit lines — sampled from the real Kepler elements, radially compressed
for (const def of BODIES) {
  if (def.key === 'halley') continue;
  if (def.key === 'moon') {
    const mO = O.MOON.orbit;
    const pts = [];
    for (let i = 0; i < 128; i++) {
      const p = O.positionAt(mO, (i / 128) * mO.T);
      const rAU = Math.hypot(p.x, p.y, p.z) || 1e-9;
      const sp = O.toScene(p);
      pts.push([sp.x * O.MOON.visualA / rAU, sp.y * O.MOON.visualA / rAU, sp.z * O.MOON.visualA / rAU]);
    }
    bodyOrbitLine.set('moon', makeOrbitLine(def, pts, planetMesh.get('earth')));
    continue;
  }
  const N = 720;
  const pts = [];
  for (let i = 0; i < N; i++) {
    const t0 = def.orbit.M0 / def.orbit.n + (i / N) * def.orbit.T;
    const p = O.positionAt(def.orbit, t0);
    const rAU = Math.hypot(p.x, p.y, p.z);
    const s = O.scaleA(rAU) / rAU;
    const sp = O.toScene(p);
    pts.push([sp.x * s, sp.y * s, sp.z * s]);
  }
  bodyOrbitLine.set(def.key, makeOrbitLine(def, pts));
}
{
  const hO = O.HALLEY.orbit;
  const N = 1440;
  const pts = [];
  for (let i = 0; i < N; i++) {
    const p = O.positionAt(hO, (i / N) * hO.T);
    const rAU = Math.hypot(p.x, p.y, p.z);
    const s = O.scaleA(rAU) / rAU;
    const sp = O.toScene(p);
    pts.push([sp.x * s, sp.y * s, sp.z * s]);
  }
  bodyOrbitLine.set('halley', makeOrbitLine(O.HALLEY, pts));
}

/* ── labels ────────────────────────────────────────────────── */
const labelWrap = document.getElementById('labels');
const labels = new Map();
for (const def of BODIES) {
  const el = document.createElement('div');
  el.className = 'body-label' + (def.key === 'moon' ? ' moon' : '');
  el.textContent = def.name;
  labelWrap.appendChild(el);
  labels.set(def.key, el);
}

/* ── time state ────────────────────────────────────────────── */
const state = {
  simDays: 0,
  rate: 2, // days per visual second
  playing: true,
  follow: 'sun',
  selected: null,
};
let lastT = performance.now();

function positionOf(key, simDays) {
  if (key === 'sun') return { x: 0, y: 0, z: 0, rAU: 0 };
  const def = byKey.get(key);
  if (def.key === 'moon') {
    const e = positionOf('earth', simDays);
    const p = O.positionAt(def.orbit, simDays);
    const rAU = Math.hypot(p.x, p.y, p.z) || 1e-9;
    const sp = O.toScene(p);
    const s = O.MOON.visualA / rAU;
    return { x: e.x + sp.x * s, y: e.y + sp.y * s, z: e.z + sp.z * s, rAU: e.rAU };
  }
  const p = O.positionAt(def.orbit, simDays);
  const rAU = Math.hypot(p.x, p.y, p.z);
  const s = O.scaleA(rAU) / rAU;
  const sp = O.toScene(p);
  return { x: sp.x * s, y: sp.y * s, z: sp.z * s, rAU };
}
function scenePosFor(def, simDays) {
  return positionOf(def.key, simDays);
}

/* ── HUD wiring ────────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);
// shared scratch vectors (declared early: openSelection() -> applyFollow()
// runs at top level before the main-loop section is parsed)
const V = new THREE.Vector3();
const V2 = new THREE.Vector3();
const V3 = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const simDateEl = $('sim-date'), simRateEl = $('sim-rate');
const playBtn = $('play-pause'), iconPlay = $('icon-play'), iconPause = $('icon-pause');
const rateSlider = $('rate'), rateOut = $('rate-readout');
const selCard = $('selection');
const hintEl = $('hint');

function setPlaying(p) {
  state.playing = p;
  playBtn.classList.toggle('paused', !p);
  iconPause.style.display = p ? '' : 'none';
  iconPlay.style.display = p ? 'none' : '';
}
playBtn.addEventListener('click', () => setPlaying(!state.playing));

function syncChips() {
  document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', +c.dataset.rate === state.rate));
}
function setRate(dps, fromChip) {
  state.rate = dps;
  rateOut.textContent = O.formatRate(dps);
  rateSlider.value = Math.round(O.rateToSlider(dps));
  rateSlider.style.setProperty('--fill', rateSlider.value + '%');
  if (fromChip) syncChips();
}
rateSlider.addEventListener('input', () => {
  setRate(O.sliderToRate(+rateSlider.value));
  syncChips();
});
document.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => setRate(+c.dataset.rate, true)));

document.querySelectorAll('[data-toggle]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const on = btn.classList.toggle('on');
    const t = btn.dataset.toggle;
    if (t === 'orbits') bodyOrbitLine.forEach((l) => (l.visible = on));
    if (t === 'labels') labelWrap.style.display = on ? '' : 'none';
    if (t === 'grid') grid.visible = on;
    if (t === 'bloom') bloomEnabled = on;
  });
});
$('btn-reset').addEventListener('click', () => {
  state.follow = 'sun';
  controls.target.set(0, 0, 0);
  camera.position.set(0, 62, 132);
});
$('btn-home').addEventListener('click', () => { state.follow = 'sun'; });
$('sel-close').addEventListener('click', closeSelection);

function closeSelection() {
  state.selected = null;
  selCard.classList.remove('show');
}

function fmtPeriod(d) { return d >= 365 ? (d / 365.25).toFixed(1) + ' yr' : d.toFixed(1) + ' d'; }
function fmtDay(d) { return d >= 1 ? d.toFixed(2) + ' d' : (d * 24).toFixed(1) + ' h'; }

function openSelection(def) {
  state.selected = def.key;
  state.follow = def.key;
  $('sel-name').textContent = def.name;
  $('sel-sub').textContent = def.type;
  $('sel-live-label').textContent = def.key === 'moon' ? 'distance from Earth' : 'distance from Sun';
  applyFollow();
  const rows = def.key === 'sun'
    ? [['diameter', '1,392,700 km'], ['mass', '333,000 × Earth'], ['rotation', '25.4 d'], ['spectral', 'G2V · 5,772 K']]
    : def.key === 'moon'
      ? [['diameter', '3,474.8 km'], ['period', '27.32 d'], ['distance', '384,400 km'], ['day length', '27.32 d']]
      : def.key === 'halley'
        ? [['period', '75.3 yr'], ['perihelion', '0.586 AU'], ['aphelion', '35.1 AU'], ['eccentricity', '0.967']]
        : [['period', fmtPeriod(def.T)], ['semi-major', def.a.toFixed(3) + ' AU'], ['eccentricity', def.e.toFixed(4)], ['day length', fmtDay(def.rotDays)]];
  // rows come from the static body table, never from user input -> safe
  $('sel-grid').innerHTML = rows
    .map(([l, v]) => `<div class="cell"><span class="cell-label">${l}</span><span class="cell-val">${v}</span></div>`)
    .join('');
  selCard.classList.add('show');
}
openSelection(SUN_DEF); // pre-fill the card with the Sun; user can close it

/* ── picking ───────────────────────────────────────────────── */
const raycaster = new THREE.Raycaster();
const pickObjs = [...pickMesh.values(), sun];
let downPos = null;
renderer.domElement.addEventListener('pointerdown', (e) => {
  downPos = [e.clientX, e.clientY];
  hintEl.classList.add('gone');
});
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downPos) return;
  const dx = e.clientX - downPos[0], dy = e.clientY - downPos[1];
  downPos = null;
  if (dx * dx + dy * dy > 36) return; // it was a drag
  raycaster.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
  const hits = raycaster.intersectObjects(pickObjs, false);
  if (hits.length) openSelection(byKey.get(hits[0].object.userData.key) || SUN_DEF);
});
setTimeout(() => hintEl.classList.add('gone'), 9000);

/* ── postprocessing ────────────────────────────────────────── */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.75, 0.65, 0.42);
composer.addPass(bloom);
composer.addPass(new OutputPass()); // applies ACES tone mapping + sRGB, post-bloom (r160 pattern)
let bloomEnabled = true;

/* ── main loop ─────────────────────────────────────────────── */

function updateBodies(simDays) {
  for (const def of BODIES) {
    const p = scenePosFor(def, simDays);
    const pivot = planetMesh.get(def.key);
    pivot.position.set(p.x, p.y, p.z);

    if (def.key === 'halley') {
      const spinG = spinNode.get('halley');
      const tailG = pivot.userData.tail;
      const L = THREE.MathUtils.clamp(3.2 / Math.sqrt(p.rAU), 0.8, 5);
      tailG.scale.set(1, L, 1);
      spinG.quaternion.setFromUnitVectors(UP, V.set(-p.x, -p.y, -p.z).normalize());
      const near = p.rAU < 60;
      pivot.userData.nucleus.visible = near;
      pivot.userData.tail.visible = near;
      const coma = pivot.userData.coma;
      coma.material.opacity = THREE.MathUtils.clamp(0.25 + 14 / p.rAU, 0.12, 0.85);
      coma.scale.setScalar(VIS_RADIUS.halley * (3 + 90 / (p.rAU + 1)));
      continue;
    }
    if (def.rotDays) {
      spinNode.get(def.key).rotation.y = ((simDays / def.rotDays) % 1) * O.TAU * def.spin;
    }
    if (def.key === 'earth') {
      const clouds = planetMesh.get('earth').userData.clouds;
      clouds.rotation.y = ((simDays / 0.9) % 1) * O.TAU * 0.35;
    }
  }
}

function updateLabels(simDays) {
  const camDist = camera.position.length();
  for (const def of BODIES) {
    const el = labels.get(def.key);
    const p = scenePosFor(def, simDays);
    V.set(p.x, p.y, p.z).project(camera);
    if (V.z > 1 || (def.key === 'moon' && camDist > 90)) {
      el.classList.add('hidden');
      continue;
    }
    el.classList.remove('hidden');
    el.style.left = ((V.x * 0.5 + 0.5) * innerWidth).toFixed(1) + 'px';
    el.style.top = ((-V.y * 0.5 + 0.5) * innerHeight).toFixed(1) + 'px';
  }
}

function updateFollow() {
  if (state.follow === 'sun') return;
  const p = positionOf(state.follow, state.simDays);
  // OrbitControls keeps the user's orbit/zoom offset relative to target,
  // so re-aiming the target each frame is the whole follow mechanic.
  controls.target.set(p.x, p.y, p.z);
}

/** Snap the camera to a pleasant offset around the followed body. */
function applyFollow() {
  const p = state.follow === 'sun'
    ? { x: 0, y: 0, z: 0 }
    : positionOf(state.follow, state.simDays);
  const dist = state.follow === 'sun' ? 132 : VIS_RADIUS[state.follow] * 6;
  V3.copy(camera.position).sub(controls.target);
  if (V3.lengthSq() < 1e-6) V3.set(0, 0.5, 1);
  V3.normalize();
  controls.target.set(p.x, p.y, p.z);
  camera.position.copy(controls.target).addScaledVector(V3, dist);
}

function tick(now) {
  const dt = Math.max(0, Math.min((now - lastT) / 1000, 0.1));
  lastT = now;
  if (state.playing) state.simDays += state.rate * dt;

  sunMat.uniforms.uTime.value = now / 1000;
  starsMain.material.uniforms.uTime.value = now / 1000;
  starsFaint.material.uniforms.uTime.value = now / 1000;
  sun.rotation.y = (state.simDays / 25.4) * O.TAU;

  updateBodies(state.simDays);
  updateFollow();
  controls.update();
  if (bloomEnabled) composer.render();
  else renderer.render(scene, camera);
  updateLabels(state.simDays);

  simDateEl.textContent = O.formatSimDate(state.simDays);
  simRateEl.textContent = (state.playing ? '' : 'paused · ') + O.formatRate(state.rate);

  if (state.selected) {
    const el = $('sel-dist');
    const p = state.selected === 'moon' ? null : positionOf(state.selected, state.simDays);
    el.textContent =
      state.selected === 'sun' ? '0.000 AU' :
      state.selected === 'moon' ? '384,400 km' :
      p.rAU.toFixed(3) + ' AU';
  }
}

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', resize);

/* deep-linkable state: ?t=10000&rate=365.25&follow=earth */
const params = new URLSearchParams(location.search);
if (params.has('t')) state.simDays = parseFloat(params.get('t')) || 0;
setRate(params.has('rate') ? Math.max(O.RATE_MIN, Math.min(O.RATE_MAX, parseFloat(params.get('rate')) || 1)) : 1);
syncChips();
if (params.has('follow') && byKey.has(params.get('follow'))) {
  openSelection(byKey.get(params.get('follow'))); // sets follow + snaps camera
}
setPlaying(true);
updateBodies(state.simDays);

// first frames painted -> dismiss the loader
let frames = 0;
(function loop(now) {
  requestAnimationFrame(loop);
  tick(now);
  if (++frames === 3) {
    const l = document.getElementById('loader');
    if (l) {
      l.classList.add('gone');
      setTimeout(() => l.remove(), 800);
    }
  }
})(performance.now());
