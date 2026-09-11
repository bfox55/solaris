import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { buildScene } from './scene.js';
import { CameraRig } from './camera.js';
import { SimClock } from './time.js';
import { createHUD } from './hud.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance' });
const PR = Math.min(window.devicePixelRatio, 2);
renderer.setPixelRatio(PR);
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.002, 20000);
camera.position.set(0, 90, 260);

const labelRenderer = new CSS2DRenderer({ element: document.getElementById('labels') });
labelRenderer.setSize(innerWidth, innerHeight);

// ---- loading ----
const manager = new THREE.LoadingManager();
const bar = document.getElementById('bar'), loadText = document.getElementById('loadText'), loader = document.getElementById('loader');
manager.onProgress = (url, loaded, total) => {
  bar.style.width = `${(loaded / total) * 100}%`;
  loadText.textContent = `Loading textures ${loaded}/${total}`;
};
manager.onLoad = () => {
  loader.classList.add('done');
  setTimeout(() => loader.remove(), 900);
};

const clock = new SimClock();
const world = buildScene(renderer, manager, (b) => select(b));
world.setPixelRatio(PR);
const rig = new CameraRig(camera, renderer.domElement);

// ---- post processing ----
const composer = new EffectComposer(renderer);
composer.setPixelRatio(PR);
composer.addPass(new RenderPass(world.scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.4, 1.0);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---- selection ----
let selected = null;
function select(b, instant = false) {
  selected = b;
  hud.setSelected(b);
  if (!b) {
    rig.focus(null, Math.max(rig.distance, 120), instant ? 0.01 : 1.6);
    rig.controls.minDistance = world.sun.radius * 1.6;
    return;
  }
  let dist = b.radius * (b.data.ringOuter ? 7 : 4.5);
  if (b.moonReach) dist = Math.min(b.radius * 8, Math.max(dist, b.moonReach * 1.15));
  if (b.kind === 'sun') dist = b.radius * 5;
  rig.focus(b, dist, instant ? 0.01 : 1.6);
}

const hud = createHUD({
  clock, bodies: world.bodies,
  onSelect: (b) => select(b),
  onToggle: (key, val) => {
    if (key === 'orbits') world.setOrbits(val);
    if (key === 'labels') world.setLabels(val);
    if (key === 'bloom') bloom.enabled = val;
    if (key === 'trueScale') {
      world.setTrueScale(val);
      world.update(clock.jd, camera);
      if (selected) select(selected); else rig.focus(null, val ? 320 : 260, 1.2);
    }
  }
});

// ---- picking ----
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let downX = 0, downY = 0;
canvas.addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; });
canvas.addEventListener('pointerup', (e) => {
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 4) return;
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const meshes = world.bodies.map((b) => b.mesh);
  const hits = raycaster.intersectObjects(meshes, false);
  if (hits.length) {
    const b = world.bodies.find((x) => x.mesh === hits[0].object);
    if (b) { select(b); return; }
  }
  // fallback: nearest body within 16px on screen
  let best = null, bestD = 16;
  const v = new THREE.Vector3();
  for (const b of world.bodies) {
    if (b.kind === 'moon' && parseFloat(b.labelEl.style.opacity || '1') < 0.2) continue;
    v.copy(b.worldPos).project(camera);
    if (v.z > 1) continue;
    const sx = (v.x + 1) / 2 * innerWidth, sy = (1 - v.y) / 2 * innerHeight;
    const d = Math.hypot(sx - e.clientX, sy - e.clientY);
    if (d < bestD) { bestD = d; best = b; }
  }
  if (best) select(best);
});

// ---- keyboard ----
const planetsOrdered = world.bodies.filter((b) => b.kind !== 'moon');
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  const k = e.key;
  if (k === ' ') { e.preventDefault(); clock.paused = !clock.paused; hud.syncRateUI(); }
  else if (k === 'r' || k === 'R') { clock.direction *= -1; hud.syncRateUI(); }
  else if (k === 'n' || k === 'N') clock.setNow();
  else if (k === '.' || k === '>') hud.setRate(clock.rate * 2);
  else if (k === ',' || k === '<') hud.setRate(clock.rate / 2);
  else if (k === 'o' || k === 'O') hud.setToggle('orbits', !hud.getToggle('orbits'));
  else if (k === 'l' || k === 'L') hud.setToggle('labels', !hud.getToggle('labels'));
  else if (k === 't' || k === 'T') hud.setToggle('trueScale', !hud.getToggle('trueScale'));
  else if (k === 'g' || k === 'G') hud.setToggle('bloom', !hud.getToggle('bloom'));
  else if (k === 'h' || k === 'H') document.getElementById('hud').classList.toggle('hidden');
  else if (k === 'Escape') select(null);
  else if (/^[0-8]$/.test(k)) { const b = planetsOrdered[Number(k)]; if (b) select(b); }
});

// ---- resize ----
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
});

// ---- loop ----
world.update(clock.jd, camera);
select(null, true);
rig.offset.set(0, 90, 260);

let last = performance.now();
let fps = 60;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  fps += ((1 / Math.max(dt, 1e-3)) - fps) * 0.05;

  clock.tick(dt);
  world.update(clock.jd, camera);
  rig.update(dt);
  hud.update(dt, fps);

  composer.render();
  labelRenderer.render(world.scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__dbg = { rig, world, clock, camera, step(n = 1, dt = 0.016) {
  for (let i = 0; i < n; i++) { clock.tick(dt); world.update(clock.jd, camera); rig.update(dt); }
  hud.update(1, fps); composer.render(); labelRenderer.render(world.scene, camera);
} };
