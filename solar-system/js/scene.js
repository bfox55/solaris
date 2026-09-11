// Builds the Sun, planets, moons, rings, orbit lines, starfield and sky.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { PLANETS, SUN, MOONS, AU_KM } from './data.js';
import { planetPosition, orbitPath, moonOffset, J2000 } from './orbits.js';

const TEX = 'textures/';
const DEG = Math.PI / 180;

export const scaleState = { trueScale: false };
const COMPRESS_K = 40, COMPRESS_P = 0.6, TRUE_AU = 100;

export function distUnits(rAU) {
  return scaleState.trueScale ? rAU * TRUE_AU : COMPRESS_K * Math.pow(rAU, COMPRESS_P);
}
export function radiusUnits(km, isSun = false) {
  if (scaleState.trueScale) return (km / AU_KM) * TRUE_AU;
  const r = Math.sqrt(km / 6371);
  return isSun ? Math.min(r, 6) : r;
}
function moonDistUnits(m, parent) {
  if (scaleState.trueScale) return (m.distKm / AU_KM) * TRUE_AU;
  return radiusUnits(parent.radiusKm) * (2.2 + 3 * Math.log10(m.distKm / parent.radiusKm));
}
// Ecliptic (x, y, z ecliptic-north) in AU -> scene (y up), with radial compression.
function eclipticToScene(p, out) {
  const L = Math.hypot(p.x, p.y, p.z);
  const s = L > 0 ? distUnits(L) / L : 0;
  return out.set(p.x * s, p.z * s, -p.y * s);
}
function dirToScene(p, units, out) {
  return out.set(p.x * units, p.z * units, -p.y * units);
}

export class Body {
  constructor(data, kind) {
    this.data = data;
    this.kind = kind; // 'sun' | 'planet' | 'moon'
    this.id = data.id;
    this.name = data.name;
    this.group = new THREE.Group();
    this.tilt = new THREE.Group();
    this.spin = new THREE.Group();
    this.group.add(this.tilt);
    this.tilt.add(this.spin);
    this.tilt.rotation.z = -(data.tiltDeg || 0) * DEG;
    this.worldPos = new THREE.Vector3();
    this.radius = 1;
    this.mesh = null;
    this.label = null;
    this.parent = null;
    this.children = [];
    this.orbitLine = null;
    this.distanceAU = 0;
  }
}

function makeLabel(body, onClick) {
  const el = document.createElement('div');
  el.className = `label label-${body.kind}`;
  el.innerHTML = `<span class="label-dot" style="background:#${body.data.color.toString(16).padStart(6, '0')}"></span><span class="label-text">${body.name}</span>`;
  el.addEventListener('pointerdown', (e) => e.stopPropagation());
  el.addEventListener('click', (e) => { e.stopPropagation(); onClick(body); });
  const obj = new CSS2DObject(el);
  obj.center.set(0.5, 1.15);
  body.group.add(obj);
  body.label = obj;
  body.labelEl = el;
}

function coronaTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,240,200,1)');
  grad.addColorStop(0.2, 'rgba(255,200,110,0.35)');
  grad.addColorStop(0.5, 'rgba(255,140,50,0.06)');
  grad.addColorStop(1, 'rgba(255,100,30,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildStars(count = 14000, radius = 4200) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const palette = [
    [0.62, 0.72, 1.0], [0.72, 0.8, 1.0], [0.9, 0.93, 1.0], [1.0, 0.98, 0.92],
    [1.0, 0.92, 0.78], [1.0, 0.82, 0.62], [1.0, 0.7, 0.5]
  ];
  const weights = [0.03, 0.08, 0.2, 0.3, 0.22, 0.12, 0.05];
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    // uniform on sphere, with a mild concentration along a "galactic" band
    let u = Math.random() * 2 - 1, phi = Math.random() * Math.PI * 2;
    if (Math.random() < 0.35) u *= Math.pow(Math.random(), 1.8);
    const r = radius * (0.92 + Math.random() * 0.08);
    const s = Math.sqrt(1 - u * u);
    pos[i * 3] = r * s * Math.cos(phi);
    pos[i * 3 + 1] = r * u;
    pos[i * 3 + 2] = r * s * Math.sin(phi);
    let w = Math.random(), k = 0;
    while (k < weights.length - 1 && w > weights[k]) { w -= weights[k]; k++; }
    const p = palette[k];
    const bright = Math.pow(Math.random(), 3.2);
    const b = 0.35 + bright * 0.95;
    c.setRGB(p[0] * b, p[1] * b, p[2] * b);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    size[i] = 1.0 + bright * 2.6;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uPixelRatio: { value: 1 } },
    vertexShader: `
      attribute vec3 aColor; attribute float aSize; varying vec3 vColor; uniform float uPixelRatio;
      void main(){ vColor = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPixelRatio; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `
      varying vec3 vColor;
      void main(){ vec2 p = gl_PointCoord - 0.5; float d = length(p);
        float a = smoothstep(0.5, 0.05, d); gl_FragColor = vec4(vColor * a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = -1;
  return pts;
}

function tilt(deg) { return deg * DEG; }

export function buildScene(renderer, manager, onLabelClick) {
  const scene = new THREE.Scene();
  const loader = new THREE.TextureLoader(manager);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const tex = (file, srgb = true) => {
    const t = loader.load(TEX + file);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAniso;
    return t;
  };

  // --- Sky ---
  const skyTex = tex('8k_stars_milky_way.jpg');
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(4600, 48, 32),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, color: new THREE.Color(0.55, 0.55, 0.6), depthWrite: false })
  );
  sky.rotation.set(tilt(-60.2), tilt(10), tilt(5)); // galactic plane vs ecliptic
  sky.renderOrder = -2;
  scene.add(sky);
  const stars = buildStars();
  scene.add(stars);

  // --- Lights ---
  const sunLight = new THREE.PointLight(0xfff4e0, 3.2, 0, 0);
  scene.add(sunLight);
  scene.add(new THREE.AmbientLight(0x404860, 0.35));

  const sphere = new THREE.SphereGeometry(1, 96, 64);
  const bodies = [];
  const byId = new Map();

  // --- Sun ---
  const sun = new Body(SUN, 'sun');
  sun.mesh = new THREE.Mesh(sphere, new THREE.MeshBasicMaterial({ map: tex(SUN.texture), color: new THREE.Color(1.7, 1.45, 1.15) }));
  sun.spin.add(sun.mesh);
  const corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: coronaTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 }));
  sun.tilt.add(corona);
  sun.corona = corona;
  scene.add(sun.group);
  makeLabel(sun, onLabelClick);
  bodies.push(sun); byId.set(sun.id, sun);

  // --- Planets ---
  for (const p of PLANETS) {
    const b = new Body(p, 'planet');
    const mat = new THREE.MeshStandardMaterial({ map: tex(p.texture), roughness: 0.9, metalness: 0.0 });
    if (p.night) {
      mat.emissiveMap = tex(p.night);
      mat.emissive = new THREE.Color(0xffffff);
      mat.emissiveIntensity = 1.1;
      mat.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
           { vec3 sunView = (viewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
             vec3 fragView = -vViewPosition;
             vec3 toSun = normalize(sunView - fragView);
             float dayside = dot(normalize(vNormal), toSun);
             totalEmissiveRadiance *= smoothstep(0.12, -0.18, dayside); }`
        );
      };
    }
    b.mesh = new THREE.Mesh(sphere, mat);
    b.spin.add(b.mesh);

    if (p.clouds) {
      const clouds = new THREE.Mesh(sphere, new THREE.MeshStandardMaterial({
        map: tex(p.clouds), alphaMap: tex(p.clouds, false), transparent: true, opacity: 0.9,
        depthWrite: false, roughness: 1
      }));
      clouds.scale.setScalar(1.012);
      b.spin.add(clouds);
      b.clouds = clouds;
    }

    if (p.ringOuter) {
      const inner = p.ringInner, outer = p.ringOuter;
      const geo = new THREE.RingGeometry(inner, outer, 180, 1);
      const uv = geo.attributes.uv, pos = geo.attributes.position;
      for (let i = 0; i < uv.count; i++) {
        const r = Math.hypot(pos.getX(i), pos.getY(i));
        uv.setXY(i, (r - inner) / (outer - inner), 0.5);
      }
      geo.rotateX(-Math.PI / 2);
      let rmat;
      if (p.ring) {
        rmat = new THREE.MeshBasicMaterial({ map: tex(p.ring), side: THREE.DoubleSide, transparent: true, depthWrite: false, color: new THREE.Color(0.9, 0.88, 0.82) });
      } else {
        rmat = new THREE.MeshBasicMaterial({ color: 0xaee2ee, side: THREE.DoubleSide, transparent: true, opacity: p.ringOpacity || 0.3, depthWrite: false });
      }
      const ring = new THREE.Mesh(geo, rmat);
      b.tilt.add(ring);
      b.ring = ring;
    }

    // orbit line
    const og = new THREE.BufferGeometry();
    og.setAttribute('position', new THREE.BufferAttribute(new Float32Array(513 * 3), 3));
    const line = new THREE.Line(og, new THREE.LineBasicMaterial({ color: p.color, transparent: true, opacity: 0.32 }));
    line.frustumCulled = false;
    b.orbitLine = line;
    scene.add(line);

    scene.add(b.group);
    makeLabel(b, onLabelClick);
    bodies.push(b); byId.set(b.id, b);
  }

  // --- Moons ---
  for (const m of MOONS) {
    const parent = byId.get(m.parent);
    const b = new Body(m, 'moon');
    b.parent = parent;
    parent.children.push(b);
    const mat = m.texture
      ? new THREE.MeshStandardMaterial({ map: tex(m.texture), roughness: 0.95 })
      : new THREE.MeshStandardMaterial({ color: m.color, roughness: 0.95 });
    b.mesh = new THREE.Mesh(sphere, mat);
    b.spin.add(b.mesh);

    const N = 128;
    const og = new THREE.BufferGeometry();
    og.setAttribute('position', new THREE.BufferAttribute(new Float32Array((N + 1) * 3), 3));
    const line = new THREE.Line(og, new THREE.LineBasicMaterial({ color: m.color, transparent: true, opacity: 0.22 }));
    line.frustumCulled = false;
    b.orbitLine = line;
    parent.group.add(line);

    scene.add(b.group);
    makeLabel(b, onLabelClick);
    bodies.push(b); byId.set(b.id, b);
  }

  const _e = new THREE.Vector3();

  function applyScale() {
    for (const b of bodies) {
      if (b.kind === 'sun') {
        b.radius = radiusUnits(b.data.radiusKm, true);
        b.corona.scale.setScalar(b.radius * 3.6);
      } else {
        b.radius = radiusUnits(b.data.radiusKm);
      }
      b.tilt.scale.setScalar(b.radius);
    }
    // planet orbit lines
    for (const b of bodies) {
      if (b.kind === 'planet') {
        const pts = orbitPath(b.data, J2000, 512);
        const arr = b.orbitLine.geometry.attributes.position;
        for (let i = 0; i < pts.length; i++) {
          eclipticToScene(pts[i], _e);
          arr.setXYZ(i, _e.x, _e.y, _e.z);
        }
        arr.needsUpdate = true;
        b.orbitLine.geometry.computeBoundingSphere();
      } else if (b.kind === 'moon') {
        const d = moonDistUnits(b.data, b.parent.data);
        b.moonDist = d;
        const arr = b.orbitLine.geometry.attributes.position;
        const N = arr.count - 1;
        for (let i = 0; i <= N; i++) {
          const off = moonOffset(b.data, J2000 + (Math.abs(b.data.periodDays) * i) / N);
          dirToScene(off, d, _e);
          arr.setXYZ(i, _e.x, _e.y, _e.z);
        }
        arr.needsUpdate = true;
      }
    }
  }
  applyScale();

  const state = { orbits: true, labels: true };

  function update(jd, camera) {
    const hours = (jd - J2000) * 24;
    for (const b of bodies) {
      if (b.kind === 'planet') {
        const p = planetPosition(b.data, jd);
        b.distanceAU = Math.hypot(p.x, p.y, p.z);
        eclipticToScene(p, b.group.position);
      } else if (b.kind === 'moon') {
        const off = moonOffset(b.data, jd);
        dirToScene(off, b.moonDist, b.group.position).add(b.parent.group.position);
        b.distanceAU = b.parent.distanceAU;
      }
      b.worldPos.copy(b.group.position);
      b.spin.rotation.y = ((hours / b.data.rotationHours) * Math.PI * 2) % (Math.PI * 2);
      if (b.clouds) b.clouds.rotation.y = b.spin.rotation.y * 0.08;
    }

    // labels: fade by distance / hide when very close, moons only when near their parent
    if (camera) {
      for (const b of bodies) {
        const d = camera.position.distanceTo(b.worldPos);
        let o = 1;
        if (d < b.radius * 4) o = Math.max(0, (d - b.radius * 2.2) / (b.radius * 1.8));
        if (b.kind === 'moon') {
          const dp = camera.position.distanceTo(b.parent.worldPos);
          const near = b.parent.moonReach || 1;
          o *= THREE.MathUtils.clamp(1.4 - dp / (near * 5), 0, 1);
        }
        b.labelEl.style.opacity = state.labels ? o.toFixed(2) : 0;
        b.labelEl.style.pointerEvents = o > 0.15 && state.labels ? 'auto' : 'none';
        if (b.kind === 'moon') {
          const dp = camera.position.distanceTo(b.parent.worldPos);
          const near = b.parent.moonReach || 1;
          b.orbitLine.material.opacity = state.orbits ? 0.22 * THREE.MathUtils.clamp(1.4 - dp / (near * 5), 0, 1) : 0;
        }
      }
    }
  }

  for (const b of bodies) if (b.kind === 'planet' && b.children.length) {
    b.moonReach = Math.max(...b.children.map((c) => c.moonDist));
  }

  function setOrbits(v) {
    state.orbits = v;
    for (const b of bodies) if (b.kind === 'planet') b.orbitLine.visible = v;
    for (const b of bodies) if (b.kind === 'moon') b.orbitLine.visible = v;
  }
  function setLabels(v) { state.labels = v; }
  function setTrueScale(v) {
    scaleState.trueScale = v;
    applyScale();
    for (const b of bodies) if (b.kind === 'planet' && b.children.length) {
      b.moonReach = Math.max(...b.children.map((c) => c.moonDist));
    }
  }
  function setPixelRatio(pr) { stars.material.uniforms.uPixelRatio.value = pr; }

  return { scene, bodies, byId, sun, update, setOrbits, setLabels, setTrueScale, setPixelRatio };
}
