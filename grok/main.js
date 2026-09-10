import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Log, mountLogPanel } from "./logger.js";

// Debug log system
Log.installGlobalHandlers();
mountLogPanel();
Log.info("boot", "Cosmos starting", {
  href: location.href,
  dpr: window.devicePixelRatio,
  size: [window.innerWidth, window.innerHeight],
  webgl: !!window.WebGLRenderingContext,
});

// ---------------------------------------------------------------------------
// Planetary data (distances AU scaled for view; periods in Earth days)
// ---------------------------------------------------------------------------
const BODIES = [
  {
    id: "sun",
    name: "Sun",
    color: 0xffc14a,
    radius: 6.5,
    distance: 0,
    period: 0,
    mass: 333000,
    obliquity: 7.25,
    desc: "The star at the center of our solar system.",
    facts: { Type: "G2V star", Diameter: "1.39M km", Mass: "1.989×10³⁰ kg" },
  },
  {
    id: "mercury",
    name: "Mercury",
    color: 0xb1b1b1,
    radius: 0.55,
    distance: 14,
    period: 88,
    mass: 0.055,
    obliquity: 0.03,
    eccentricity: 0.206,
    desc: "Smallest planet — cratered, airless, extreme heat.",
    facts: { Orbit: "88 days", Diameter: "4,879 km", Moons: "0" },
  },
  {
    id: "venus",
    name: "Venus",
    color: 0xe8c77b,
    radius: 0.95,
    distance: 20,
    period: 225,
    mass: 0.815,
    obliquity: 177.4,
    eccentricity: 0.007,
    hasClouds: true,
    desc: "Earth's twin with a crushing toxic atmosphere.",
    facts: { Orbit: "225 days", Diameter: "12,104 km", Moons: "0" },
  },
  {
    id: "earth",
    name: "Earth",
    color: 0x4a90e2,
    radius: 1.0,
    distance: 28,
    period: 365.25,
    mass: 1,
    obliquity: 23.4,
    eccentricity: 0.017,
    hasMoon: true,
    hasClouds: true,
    hasAtmosphere: true,
    desc: "Our home world — oceans, continents, life.",
    facts: { Orbit: "365.25 days", Diameter: "12,742 km", Moons: "1" },
  },
  {
    id: "mars",
    name: "Mars",
    color: 0xd3542f,
    radius: 0.7,
    distance: 38,
    period: 687,
    mass: 0.107,
    obliquity: 25.2,
    eccentricity: 0.094,
    desc: "The red planet of canyons, ice caps, and dust.",
    facts: { Orbit: "687 days", Diameter: "6,779 km", Moons: "2" },
  },
  {
    id: "jupiter",
    name: "Jupiter",
    color: 0xd4a574,
    radius: 3.2,
    distance: 58,
    period: 4333,
    mass: 317.8,
    obliquity: 3.1,
    eccentricity: 0.049,
    desc: "King of the planets — bands and the Great Red Spot.",
    facts: { Orbit: "11.9 years", Diameter: "139,820 km", Moons: "95+" },
  },
  {
    id: "saturn",
    name: "Saturn",
    color: 0xe8d5a3,
    radius: 2.7,
    distance: 78,
    period: 10759,
    mass: 95.2,
    obliquity: 26.7,
    eccentricity: 0.057,
    hasRings: true,
    desc: "Jewel of the solar system, wrapped in icy rings.",
    facts: { Orbit: "29.5 years", Diameter: "116,460 km", Moons: "140+" },
  },
  {
    id: "uranus",
    name: "Uranus",
    color: 0x7ec8e3,
    radius: 1.7,
    distance: 98,
    period: 30687,
    mass: 14.5,
    obliquity: 97.8,
    eccentricity: 0.046,
    desc: "Ice giant tilted on its side.",
    facts: { Orbit: "84 years", Diameter: "50,724 km", Moons: "28" },
  },
  {
    id: "neptune",
    name: "Neptune",
    color: 0x4169e1,
    radius: 1.65,
    distance: 118,
    period: 60190,
    mass: 17.1,
    obliquity: 28.3,
    eccentricity: 0.01,
    desc: "Farthest giant — deep blue supersonic winds.",
    facts: { Orbit: "165 years", Diameter: "49,244 km", Moons: "16" },
  },
];

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------
const wrap = document.getElementById("canvas-wrap");
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05060a, 0.0012);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(0, 45, 95);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x05060a, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
wrap.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 8;
controls.maxDistance = 400;
controls.target.set(0, 0, 0);
controls.maxPolarAngle = Math.PI * 0.92;

const ambientLight = new THREE.AmbientLight(0x6a7a9a, 0.55);
scene.add(ambientLight);
const sunLight = new THREE.PointLight(0xfff0d0, 2.8, 800, 0.45);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);
const fillLight = new THREE.AmbientLight(0xffffff, 0.12);
scene.add(fillLight);
const rim = new THREE.DirectionalLight(0x6ea8ff, 0.15);
rim.position.set(-40, 20, -30);
scene.add(rim);

const BASE_AMBIENT = 0.55;
const BASE_FILL = 0.12;
const BASE_SUN = 2.8;
const BASE_RIM = 0.15;
const BASE_EXPOSURE = 1.15;

function applyBrightness(level) {
  const ambientMul = 0.45 + level * 0.85;
  const fillMul = Math.pow(level, 1.15);
  const sunMul = 0.65 + level * 0.55;
  const rimMul = 0.5 + level * 0.7;
  const exposureMul = 0.75 + level * 0.35;
  ambientLight.intensity = BASE_AMBIENT * ambientMul;
  fillLight.intensity = BASE_FILL * fillMul;
  sunLight.intensity = BASE_SUN * sunMul;
  rim.intensity = BASE_RIM * rimMul;
  renderer.toneMappingExposure = BASE_EXPOSURE * exposureMul;
  sunLight.distance = 500 + level * 350;
  sunLight.decay = Math.max(0.2, 0.55 - level * 0.1);
  Log.debug("render", "Brightness applied", {
    level: +level.toFixed(2),
    ambient: +ambientLight.intensity.toFixed(3),
    sun: +sunLight.intensity.toFixed(3),
    exposure: +renderer.toneMappingExposure.toFixed(3),
  });
}

// ---------------------------------------------------------------------------
// Starfield + nebula
// ---------------------------------------------------------------------------
function makeStars(count, spread, size, color) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = spread * (0.4 + Math.random() * 0.6);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color,
      size,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    })
  );
}
scene.add(makeStars(6000, 600, 0.45, 0xc8d4ff));
scene.add(makeStars(2000, 450, 0.9, 0xffffff));
scene.add(makeStars(400, 500, 1.6, 0xaaccff));

const nebulaMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  transparent: true,
  vertexShader: `
    varying vec3 vPos;
    void main() {
      vPos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vPos;
    void main() {
      vec3 n = normalize(vPos);
      float b = pow(max(0.0, n.x * 0.5 + 0.5), 2.0);
      float c = pow(max(0.0, -n.z * 0.4 + 0.3), 3.0);
      vec3 col = vec3(0.03, 0.04, 0.09)
        + vec3(0.08, 0.04, 0.14) * b
        + vec3(0.02, 0.05, 0.12) * c;
      gl_FragColor = vec4(col, 0.55 + 0.2 * b);
    }
  `,
});
scene.add(new THREE.Mesh(new THREE.SphereGeometry(550, 32, 32), nebulaMat));

// ---------------------------------------------------------------------------
// Detailed procedural planet textures
// ---------------------------------------------------------------------------
function canvasTexture(draw, size = 512) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function noise(ctx, s, count, colorFn, sizeRange = [1, 3]) {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * s;
    const y = Math.random() * s;
    const r = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
    ctx.fillStyle = colorFn();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function fillBands(ctx, s, colors, warp = 0) {
  const bandH = s / colors.length;
  for (let i = 0; i < colors.length; i++) {
    ctx.fillStyle = colors[i];
    const y0 = i * bandH;
    ctx.beginPath();
    ctx.moveTo(0, y0);
    for (let x = 0; x <= s; x += 4) {
      const y = y0 + Math.sin(x * 0.04 + i) * warp + Math.sin(x * 0.11 + i * 2) * warp * 0.4;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(s, y0 + bandH + 2);
    ctx.lineTo(0, y0 + bandH + 2);
    ctx.closePath();
    ctx.fill();
  }
}

function drawCrater(ctx, x, y, r, light) {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, light ? "rgba(255,255,255,0.25)" : "rgba(200,200,200,0.2)");
  g.addColorStop(0.55, "rgba(120,120,120,0.15)");
  g.addColorStop(0.75, "rgba(40,40,40,0.35)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.stroke();
}

const TEXTURE_DRAWERS = {
  sun(ctx, s) {
    const g = ctx.createRadialGradient(s * 0.5, s * 0.5, 0, s * 0.5, s * 0.5, s * 0.7);
    g.addColorStop(0, "#fffef0");
    g.addColorStop(0.25, "#ffe066");
    g.addColorStop(0.55, "#ff9a20");
    g.addColorStop(0.85, "#e05000");
    g.addColorStop(1, "#8a2000");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    // granulation
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * s;
      const y = Math.random() * s;
      const r = 2 + Math.random() * 6;
      ctx.fillStyle = `rgba(255,${180 + Math.random() * 60},${40 + Math.random() * 40},${0.08 + Math.random() * 0.15})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // sunspots
    for (let i = 0; i < 12; i++) {
      const x = Math.random() * s;
      const y = s * 0.25 + Math.random() * s * 0.5;
      const r = 6 + Math.random() * 14;
      const sg = ctx.createRadialGradient(x, y, 0, x, y, r);
      sg.addColorStop(0, "rgba(40,10,0,0.85)");
      sg.addColorStop(0.5, "rgba(120,40,0,0.45)");
      sg.addColorStop(1, "rgba(255,120,0,0)");
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  mercury(ctx, s) {
    ctx.fillStyle = "#8a8680";
    ctx.fillRect(0, 0, s, s);
    // terrain variation
    noise(ctx, s, 4000, () => {
      const v = 90 + Math.floor(Math.random() * 70);
      return `rgba(${v},${v - 4},${v - 10},0.35)`;
    }, [1, 4]);
    // large basins
    for (let i = 0; i < 8; i++) {
      drawCrater(ctx, Math.random() * s, Math.random() * s, 20 + Math.random() * 40, false);
    }
    for (let i = 0; i < 80; i++) {
      drawCrater(ctx, Math.random() * s, Math.random() * s, 3 + Math.random() * 12, Math.random() > 0.5);
    }
    // bright rays
    ctx.strokeStyle = "rgba(220,210,190,0.12)";
    for (let i = 0; i < 6; i++) {
      const x = Math.random() * s;
      const y = Math.random() * s;
      for (let a = 0; a < Math.PI * 2; a += 0.4) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * 40, y + Math.sin(a) * 40);
        ctx.stroke();
      }
    }
  },

  venus(ctx, s) {
    const g = ctx.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, "#f0d9a0");
    g.addColorStop(0.4, "#e8c070");
    g.addColorStop(0.7, "#d4a050");
    g.addColorStop(1, "#c88840");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    // thick swirling cloud bands
    for (let i = 0; i < 40; i++) {
      const y = Math.random() * s;
      ctx.strokeStyle = `rgba(255,240,200,${0.08 + Math.random() * 0.15})`;
      ctx.lineWidth = 4 + Math.random() * 18;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= s; x += 8) {
        ctx.lineTo(x, y + Math.sin(x * 0.03 + i) * 12 + Math.sin(x * 0.08) * 6);
      }
      ctx.stroke();
    }
    noise(ctx, s, 800, () => `rgba(255,220,150,${Math.random() * 0.12})`, [2, 10]);
  },

  earth(ctx, s) {
    // ocean base
    const ocean = ctx.createLinearGradient(0, 0, s, s);
    ocean.addColorStop(0, "#0a3d6e");
    ocean.addColorStop(0.5, "#1a6bb0");
    ocean.addColorStop(1, "#0d4a80");
    ctx.fillStyle = ocean;
    ctx.fillRect(0, 0, s, s);
    // deep ocean patches
    noise(ctx, s, 200, () => "rgba(5,30,60,0.3)", [8, 25]);

    // continents (rough shapes)
    const landColors = ["#2d7a3e", "#3d8b4a", "#5a9a3c", "#8b7a40", "#c4a574"];
    const continents = [
      [0.12, 0.35, 0.18, 0.28], // Americas-ish
      [0.48, 0.32, 0.14, 0.22], // Europe/Africa
      [0.62, 0.28, 0.22, 0.2], // Asia
      [0.72, 0.62, 0.12, 0.1], // Australia
      [0.45, 0.72, 0.1, 0.12], // Antarctica-ish band
    ];
    continents.forEach(([nx, ny, nw, nh], idx) => {
      const x = nx * s;
      const y = ny * s;
      const w = nw * s;
      const h = nh * s;
      ctx.fillStyle = landColors[idx % landColors.length];
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const rr = (0.35 + Math.random() * 0.25) * Math.max(w, h);
        const px = x + w * 0.5 + Math.cos(a) * rr * (0.7 + (i % 3) * 0.15);
        const py = y + h * 0.5 + Math.sin(a) * rr * 0.65;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      // interior detail
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = landColors[(idx + i) % landColors.length];
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.ellipse(
          x + Math.random() * w,
          y + Math.random() * h,
          6 + Math.random() * 16,
          4 + Math.random() * 10,
          Math.random(),
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    });

    // ice caps
    ctx.fillStyle = "rgba(240,248,255,0.92)";
    ctx.fillRect(0, 0, s, s * 0.07);
    ctx.fillRect(0, s * 0.93, s, s * 0.07);
    const polar = ctx.createLinearGradient(0, 0, 0, s * 0.12);
    polar.addColorStop(0, "rgba(255,255,255,0.95)");
    polar.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = polar;
    ctx.fillRect(0, 0, s, s * 0.12);
    const polar2 = ctx.createLinearGradient(0, s, 0, s * 0.88);
    polar2.addColorStop(0, "rgba(255,255,255,0.95)");
    polar2.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = polar2;
    ctx.fillRect(0, s * 0.88, s, s * 0.12);

    // city lights hint (night side stretch — subtle)
    noise(ctx, s, 120, () => "rgba(255,230,150,0.08)", [0.5, 1.5]);
  },

  mars(ctx, s) {
    const g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, "#c45a2c");
    g.addColorStop(0.4, "#a04020");
    g.addColorStop(0.7, "#8a3018");
    g.addColorStop(1, "#6e2810");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    noise(ctx, s, 3000, () => {
      const r = 140 + Math.floor(Math.random() * 80);
      const g2 = 40 + Math.floor(Math.random() * 50);
      return `rgba(${r},${g2},${20 + Math.random() * 20},0.35)`;
    }, [1, 5]);
    // dark regions (mare)
    for (let i = 0; i < 15; i++) {
      ctx.fillStyle = `rgba(80,25,15,${0.2 + Math.random() * 0.25})`;
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * s,
        Math.random() * s,
        15 + Math.random() * 40,
        8 + Math.random() * 20,
        Math.random(),
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    // Olympus-like volcano
    const vx = s * 0.35;
    const vy = s * 0.4;
    const vg = ctx.createRadialGradient(vx, vy, 0, vx, vy, 30);
    vg.addColorStop(0, "rgba(180,80,40,0.7)");
    vg.addColorStop(0.5, "rgba(120,40,20,0.4)");
    vg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = vg;
    ctx.beginPath();
    ctx.arc(vx, vy, 30, 0, Math.PI * 2);
    ctx.fill();
    // polar ice
    ctx.fillStyle = "rgba(255,250,245,0.85)";
    ctx.beginPath();
    ctx.ellipse(s * 0.5, s * 0.06, s * 0.22, s * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s * 0.5, s * 0.94, s * 0.18, s * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    // craters
    for (let i = 0; i < 25; i++) {
      drawCrater(ctx, Math.random() * s, 0.15 * s + Math.random() * 0.7 * s, 3 + Math.random() * 10, false);
    }
  },

  jupiter(ctx, s) {
    const colors = [
      "#c9a07a", "#e8d0b0", "#b8845a", "#d4b48c",
      "#a87048", "#e0c8a0", "#c49870", "#f0e0c8",
      "#b87850", "#dcc0a0", "#a06040", "#e8d4b8",
    ];
    fillBands(ctx, s, colors, 6);
    // turbulence
    for (let i = 0; i < 60; i++) {
      const y = Math.random() * s;
      ctx.strokeStyle = `rgba(255,240,220,${0.05 + Math.random() * 0.1})`;
      ctx.lineWidth = 2 + Math.random() * 8;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= s; x += 6) {
        ctx.lineTo(x, y + Math.sin(x * 0.05 + i) * 8);
      }
      ctx.stroke();
    }
    // Great Red Spot
    const gx = s * 0.62;
    const gy = s * 0.58;
    const gg = ctx.createRadialGradient(gx, gy, 0, gx, gy, 42);
    gg.addColorStop(0, "rgba(220,90,50,0.95)");
    gg.addColorStop(0.45, "rgba(200,70,40,0.8)");
    gg.addColorStop(0.75, "rgba(180,100,70,0.4)");
    gg.addColorStop(1, "rgba(200,150,100,0)");
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.ellipse(gx, gy, 48, 28, -0.2, 0, Math.PI * 2);
    ctx.fill();
    // white ovals
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = "rgba(255,250,240,0.35)";
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * s,
        s * 0.3 + Math.random() * s * 0.4,
        10 + Math.random() * 16,
        5 + Math.random() * 8,
        Math.random(),
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  },

  saturn(ctx, s) {
    const colors = [
      "#e8dcc0", "#d4c4a0", "#f0e8d0", "#c8b890",
      "#e0d4b0", "#b8a878", "#ece0c8", "#d0c0a0",
    ];
    fillBands(ctx, s, colors, 3);
    for (let i = 0; i < 30; i++) {
      ctx.strokeStyle = `rgba(255,250,230,${0.04 + Math.random() * 0.08})`;
      ctx.lineWidth = 1 + Math.random() * 4;
      const y = Math.random() * s;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= s; x += 8) ctx.lineTo(x, y + Math.sin(x * 0.04) * 3);
      ctx.stroke();
    }
  },

  uranus(ctx, s) {
    const g = ctx.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, "#a8e8f0");
    g.addColorStop(0.35, "#7ec8d8");
    g.addColorStop(0.65, "#5ab0c8");
    g.addColorStop(1, "#3a98b0");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    // faint bands
    for (let y = 0; y < s; y += 8) {
      ctx.fillStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.05})`;
      ctx.fillRect(0, y, s, 3 + Math.random() * 4);
    }
    noise(ctx, s, 400, () => "rgba(200,240,255,0.08)", [2, 8]);
    // methane haze poles
    ctx.fillStyle = "rgba(180,230,240,0.35)";
    ctx.fillRect(0, 0, s, s * 0.12);
    ctx.fillRect(0, s * 0.88, s, s * 0.12);
  },

  neptune(ctx, s) {
    const g = ctx.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, "#5a8ae8");
    g.addColorStop(0.3, "#2a50c0");
    g.addColorStop(0.6, "#1a3a9a");
    g.addColorStop(1, "#0a2060");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 6) {
      ctx.fillStyle = `rgba(100,160,255,${0.04 + Math.random() * 0.08})`;
      ctx.fillRect(0, y, s, 2 + Math.random() * 3);
    }
    // Great Dark Spot
    const dx = s * 0.4;
    const dy = s * 0.45;
    const dg = ctx.createRadialGradient(dx, dy, 0, dx, dy, 35);
    dg.addColorStop(0, "rgba(10,20,60,0.85)");
    dg.addColorStop(0.6, "rgba(30,50,120,0.45)");
    dg.addColorStop(1, "rgba(40,80,160,0)");
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.ellipse(dx, dy, 38, 22, 0.15, 0, Math.PI * 2);
    ctx.fill();
    // white clouds
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = "rgba(200,220,255,0.25)";
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * s,
        Math.random() * s,
        12 + Math.random() * 20,
        3 + Math.random() * 6,
        Math.random() * 0.3,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  },
};

function makeCloudTexture() {
  return canvasTexture((ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.08 + Math.random() * 0.2})`;
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * s,
        Math.random() * s,
        10 + Math.random() * 40,
        4 + Math.random() * 12,
        Math.random(),
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }, 512);
}

function makeRingTexture() {
  return canvasTexture((ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    for (let x = 0; x < s; x++) {
      const t = x / s;
      // gaps (Cassini-like)
      let alpha = 0.15 + 0.55 * Math.sin(t * Math.PI);
      if (t > 0.42 && t < 0.48) alpha *= 0.15;
      if (t > 0.62 && t < 0.66) alpha *= 0.35;
      if (t > 0.78 && t < 0.82) alpha *= 0.25;
      const shade = 180 + Math.floor(Math.sin(t * 40) * 40 + Math.random() * 20);
      ctx.fillStyle = `rgba(${shade},${shade - 20},${shade - 50},${alpha})`;
      ctx.fillRect(x, 0, 1, s);
    }
  }, 512);
}

function planetMaterial(body) {
  const drawer = TEXTURE_DRAWERS[body.id] || TEXTURE_DRAWERS.mercury;
  const map = canvasTexture(drawer, 512);

  if (body.id === "sun") {
    return new THREE.MeshBasicMaterial({ map });
  }

  return new THREE.MeshStandardMaterial({
    map,
    roughness: body.id === "jupiter" || body.id === "saturn" ? 0.7 : 0.88,
    metalness: body.id === "mercury" ? 0.15 : 0.04,
    emissive: new THREE.Color(body.color),
    emissiveIntensity: 0.04,
  });
}

// ---------------------------------------------------------------------------
// Build solar system
// ---------------------------------------------------------------------------
const root = new THREE.Group();
scene.add(root);

const bodyMeshes = {};
const orbitLines = new THREE.Group();
const labelSprites = new THREE.Group();
const trailGroups = new THREE.Group();
root.add(orbitLines);
root.add(labelSprites);
root.add(trailGroups);

const trailHistory = {};
const TRAIL_LEN = 200;

// Physics state for black-hole mode
const phys = {}; // id -> { pos, vel, swallowed, scale }

function keplerOffset(eccentricity, meanAnomaly) {
  let E = meanAnomaly;
  for (let i = 0; i < 6; i++) E = meanAnomaly + eccentricity * Math.sin(E);
  return E;
}

function keplerPosition(body, days) {
  if (body.distance === 0) return new THREE.Vector3(0, 0, 0);
  const e = body.eccentricity || 0;
  const meanAnomaly = ((days / body.period) * Math.PI * 2) % (Math.PI * 2);
  const E = keplerOffset(e, meanAnomaly);
  const a = body.distance;
  const b = a * Math.sqrt(1 - e * e);
  const cx = -a * e;
  return new THREE.Vector3(cx + a * Math.cos(E), 0, b * Math.sin(E));
}

function keplerVelocity(body, days) {
  if (body.distance === 0 || !body.period) return new THREE.Vector3(0, 0, 0);
  const p1 = keplerPosition(body, days);
  const p2 = keplerPosition(body, days + 0.05);
  return p2.sub(p1).multiplyScalar(1 / 0.05); // units per day
}

function createOrbitLine(distance, eccentricity = 0, color = 0x6ea8ff) {
  const pts = [];
  const a = distance;
  const e = eccentricity;
  const b = a * Math.sqrt(1 - e * e);
  const cx = -a * e;
  for (let i = 0; i <= 128; i++) {
    const t = (i / 128) * Math.PI * 2;
    pts.push(new THREE.Vector3(cx + a * Math.cos(t), 0, b * Math.sin(t)));
  }
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.22 })
  );
}

function makeLabel(text) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, 256, 64);
  ctx.font = "600 28px Outfit, system-ui, sans-serif";
  ctx.fillStyle = "rgba(232,238,252,0.9)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 8;
  ctx.fillText(text, 128, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.9 })
  );
  sprite.scale.set(8, 2, 1);
  return sprite;
}

function makeAsteroidBelt() {
  const count = 900;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 46 + Math.random() * 8;
    const a = Math.random() * Math.PI * 2;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 1.2;
    positions[i * 3 + 2] = Math.sin(a) * r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color: 0x9aa3b5, size: 0.18, transparent: true, opacity: 0.7 })
  );
}
const asteroidBelt = makeAsteroidBelt();
root.add(asteroidBelt);

BODIES.forEach((body) => {
  const group = new THREE.Group();
  group.userData = { body };

  const geo = new THREE.SphereGeometry(body.radius, 64, 64);
  const mat = planetMaterial(body);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = "surface";
  // axial tilt (visual)
  mesh.rotation.z = THREE.MathUtils.degToRad(body.obliquity || 0) * 0.4;
  group.add(mesh);

  if (body.id === "sun") {
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(body.radius * 1.4, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffaa33,
        transparent: true,
        opacity: 0.18,
        side: THREE.BackSide,
        depthWrite: false,
      })
    );
    group.add(glow);
    const corona = new THREE.Mesh(
      new THREE.SphereGeometry(body.radius * 2.3, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0xff7700,
        transparent: true,
        opacity: 0.06,
        side: THREE.BackSide,
        depthWrite: false,
      })
    );
    group.add(corona);
  }

  if (body.hasAtmosphere) {
    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(body.radius * 1.06, 48, 48),
      new THREE.MeshBasicMaterial({
        color: 0x6eb6ff,
        transparent: true,
        opacity: 0.12,
        side: THREE.BackSide,
        depthWrite: false,
      })
    );
    atmo.name = "atmo";
    group.add(atmo);
  }

  if (body.hasClouds) {
    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(body.radius * 1.02, 48, 48),
      new THREE.MeshStandardMaterial({
        map: makeCloudTexture(),
        transparent: true,
        opacity: body.id === "venus" ? 0.55 : 0.35,
        depthWrite: false,
        roughness: 1,
      })
    );
    clouds.name = "clouds";
    group.add(clouds);
  }

  if (body.hasRings) {
    const ringGeo = new THREE.RingGeometry(body.radius * 1.35, body.radius * 2.45, 128);
    // UV so ring texture maps along radius
    const pos = ringGeo.attributes.position;
    const uv = ringGeo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const len = Math.sqrt(x * x + y * y);
      const t = (len - body.radius * 1.35) / (body.radius * 1.1);
      uv.setXY(i, t, 0.5);
    }
    const ring = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({
        map: makeRingTexture(),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      })
    );
    ring.rotation.x = Math.PI / 2.12;
    ring.name = "rings";
    group.add(ring);
  }

  if (body.hasMoon) {
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(0.27, 32, 32),
      new THREE.MeshStandardMaterial({
        map: canvasTexture((ctx, s) => {
          ctx.fillStyle = "#c8c8c8";
          ctx.fillRect(0, 0, s, s);
          noise(ctx, s, 2000, () => {
            const v = 100 + Math.floor(Math.random() * 80);
            return `rgba(${v},${v},${v},0.4)`;
          }, [1, 4]);
          for (let i = 0; i < 40; i++) {
            drawCrater(ctx, Math.random() * s, Math.random() * s, 4 + Math.random() * 14, false);
          }
        }, 256),
        roughness: 0.95,
      })
    );
    moon.userData.isMoon = true;
    moon.position.set(2.2, 0.2, 0);
    group.add(moon);
  }

  root.add(group);
  bodyMeshes[body.id] = group;

  if (body.distance > 0) {
    const orbit = createOrbitLine(body.distance, body.eccentricity || 0, body.color);
    orbit.userData.bodyId = body.id;
    orbitLines.add(orbit);
  }

  const label = makeLabel(body.name);
  label.userData.bodyId = body.id;
  labelSprites.add(label);

  trailHistory[body.id] = [];
  const trail = new THREE.Line(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: body.color, transparent: true, opacity: 0.45 })
  );
  trail.visible = false;
  trail.userData.bodyId = body.id;
  trailGroups.add(trail);
});

// ---------------------------------------------------------------------------
// Black hole
// ---------------------------------------------------------------------------
let blackHole = null; // { group, pos, mass, horizon, active }
let deployMode = false;
let physicsMode = false; // free integration under BH + sun gravity

const bhStatusEl = document.getElementById("bh-status");

function setBhStatus(text) {
  if (bhStatusEl) bhStatusEl.textContent = text;
  Log.debug("blackhole", "Status: " + text);
}

function createBlackHoleMesh(horizonR) {
  const group = new THREE.Group();

  // Event horizon — pure black
  const hole = new THREE.Mesh(
    new THREE.SphereGeometry(horizonR, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  );
  group.add(hole);

  // Photon ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(horizonR * 1.35, horizonR * 0.06, 16, 64),
    new THREE.MeshBasicMaterial({ color: 0xffcc88, transparent: true, opacity: 0.85 })
  );
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  // Accretion disk
  const diskGeo = new THREE.RingGeometry(horizonR * 1.6, horizonR * 5.5, 96);
  const diskMat = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float r = vUv.x; // approx
        float a = atan(vUv.y - 0.5, vUv.x - 0.5);
        float band = 0.5 + 0.5 * sin(r * 40.0 - uTime * 3.0 + a * 2.0);
        vec3 hot = vec3(1.0, 0.85, 0.45);
        vec3 mid = vec3(1.0, 0.4, 0.1);
        vec3 cool = vec3(0.6, 0.1, 0.8);
        vec3 col = mix(cool, mid, smoothstep(0.0, 0.5, r));
        col = mix(col, hot, smoothstep(0.5, 1.0, r) * band);
        float alpha = 0.55 * (1.0 - abs(r - 0.5) * 1.4) * (0.7 + 0.3 * band);
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.85));
      }
    `,
  });
  const disk = new THREE.Mesh(diskGeo, diskMat);
  disk.rotation.x = Math.PI / 2.05;
  disk.name = "accretion";
  group.add(disk);

  // Outer glow
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(horizonR * 2.2, 32, 32),
    new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
      depthWrite: false,
    })
  );
  group.add(glow);

  // Distortion halo
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(horizonR * 3.5, 32, 32),
    new THREE.MeshBasicMaterial({
      color: 0x4422aa,
      transparent: true,
      opacity: 0.06,
      side: THREE.BackSide,
      depthWrite: false,
    })
  );
  group.add(halo);

  return group;
}

function spawnBlackHole(worldPos, massSolar = 50) {
  Log.info("blackhole", "Deploying black hole", {
    massSolar,
    pos: { x: +worldPos.x.toFixed(2), y: +worldPos.y.toFixed(2), z: +worldPos.z.toFixed(2) },
    simDays: +simDays.toFixed(1),
  });
  removeBlackHole(false);

  // Horizon scaled for visibility (not real Schwarzschild)
  const horizon = Math.max(1.2, Math.min(8, Math.pow(massSolar, 0.35) * 0.55));
  const group = createBlackHoleMesh(horizon);
  group.position.copy(worldPos);
  root.add(group);

  blackHole = {
    group,
    pos: worldPos.clone(),
    mass: massSolar * 1000, // sim units — much heavier than planets
    massSolar,
    horizon,
    active: true,
  };

  // Switch planets to free physics from current Kepler state
  enterPhysicsMode();
  physicsMode = true;
  orbitLines.visible = false;

  setBhStatus(`Black hole active · ${massSolar.toFixed(0)} M☉ · planets falling in`);
  document.getElementById("btn-deploy-bh")?.classList.add("danger-active");
  document.getElementById("btn-remove-bh")?.removeAttribute("disabled");
  setFocus("blackhole");
  Log.info("blackhole", "Black hole active", {
    horizon: +horizon.toFixed(2),
    simMass: blackHole.mass,
    physicsMode: true,
  });
}

function removeBlackHole(restoreOrbits = true) {
  const had = !!blackHole;
  if (blackHole) {
    root.remove(blackHole.group);
    blackHole.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
    blackHole = null;
  }
  if (restoreOrbits) {
    const swallowedIds = Object.entries(phys)
      .filter(([, s]) => s?.swallowed)
      .map(([id]) => id);
    physicsMode = false;
    // restore bodies
    BODIES.forEach((b) => {
      const g = bodyMeshes[b.id];
      if (!g) return;
      g.visible = true;
      g.scale.set(1, 1, 1);
      const surf = g.getObjectByName("surface");
      if (surf) surf.scale.set(1, 1, 1);
    });
    Object.keys(phys).forEach((k) => delete phys[k]);
    orbitLines.visible = document.getElementById("orbits")?.checked ?? true;
    setBhStatus("Black hole removed · solar system restored");
    document.getElementById("btn-deploy-bh")?.classList.remove("danger-active");
    document.getElementById("btn-remove-bh")?.setAttribute("disabled", "true");
    if (focusId === "blackhole") setFocus("sun");
    if (had) {
      Log.info("blackhole", "Removed black hole · orbits restored", {
        previouslySwallowed: swallowedIds,
      });
    }
  } else if (had) {
    Log.debug("blackhole", "Cleared previous black hole before redeploy");
  }
}

function enterPhysicsMode() {
  const end = Log.time("enterPhysicsMode snapshot");
  BODIES.forEach((body) => {
    const pos = keplerPosition(body, simDays);
    const vel = keplerVelocity(body, simDays);
    // Add a bit of vertical jitter so collapse isn't perfectly flat
    if (body.id !== "sun") vel.y += (Math.random() - 0.5) * 0.002;
    phys[body.id] = {
      pos: pos.clone(),
      vel: vel.clone(),
      swallowed: false,
      stretch: 1,
    };
    bodyMeshes[body.id].position.copy(pos);
    bodyMeshes[body.id].visible = true;
    bodyMeshes[body.id].scale.set(1, 1, 1);
  });
  // Auto trails on for drama
  trailsToggle.checked = true;
  trailGroups.children.forEach((t) => (t.visible = true));
  BODIES.forEach((b) => {
    trailHistory[b.id] = [];
  });
  end({ bodies: BODIES.length, simDays: +simDays.toFixed(2) });
  Log.info("physics", "Switched to free N-body integration", {
    G: G_SIM,
    bodyCount: BODIES.length,
  });
}

// G constant tuned so sun-only roughly keeps orbits; BH dominates when present
const G_SIM = 0.12;
let physStepLogCooldown = 0;

function integratePhysics(dtDays) {
  if (!physicsMode) return;

  // Multi-step for stability at high time scales
  const steps = Math.max(1, Math.min(12, Math.ceil(Math.abs(dtDays) / 0.5)));
  const h = dtDays / steps;
  if (Math.abs(dtDays) > 4) {
    Log.once(
      "phys-large-step",
      "warn",
      "physics",
      "Large physics step (time scale high) — stability may degrade",
      { dtDays: +dtDays.toFixed(2), steps }
    );
  }

  for (let s = 0; s < steps; s++) {
    // Accel from Sun + black hole (simple point masses)
    BODIES.forEach((body) => {
      const st = phys[body.id];
      if (!st || st.swallowed) return;

      const acc = new THREE.Vector3(0, 0, 0);

      // Sun gravity (unless body is sun)
      if (body.id !== "sun") {
        const sunSt = phys.sun;
        if (sunSt && !sunSt.swallowed) {
          const r = sunSt.pos.clone().sub(st.pos);
          const d2 = Math.max(r.lengthSq(), 4);
          const d = Math.sqrt(d2);
          const mSun = BODIES[0].mass;
          acc.add(r.normalize().multiplyScalar((G_SIM * mSun) / d2));
          // soften
          void d;
        }
      }

      // Black hole gravity
      if (blackHole?.active) {
        const r = blackHole.pos.clone().sub(st.pos);
        const dist = r.length();
        const d2 = Math.max(dist * dist, 0.5);
        acc.add(r.normalize().multiplyScalar((G_SIM * blackHole.mass) / d2));

        // Event horizon swallow
        if (dist < blackHole.horizon * 1.05) {
          st.swallowed = true;
          st.stretch = 0;
          bodyMeshes[body.id].visible = false;
          spawnSwallowFlash(st.pos.clone());
          setBhStatus(`${body.name} swallowed by the black hole`);
          Log.warn("physics", `${body.name} swallowed`, {
            id: body.id,
            dist: +dist.toFixed(3),
            horizon: blackHole.horizon,
            vel: {
              x: +st.vel.x.toFixed(4),
              y: +st.vel.y.toFixed(4),
              z: +st.vel.z.toFixed(4),
            },
          });
          return;
        }

        // Approaching horizon — log once per body
        if (dist < blackHole.horizon * 4) {
          Log.once(
            `near-horizon-${body.id}`,
            "debug",
            "physics",
            `${body.name} near event horizon`,
            { dist: +dist.toFixed(2), stretch: +st.stretch?.toFixed?.(2) || 1 }
          );
        }

        // Spaghettification near horizon
        const danger = blackHole.horizon * 8;
        if (dist < danger) {
          st.stretch = 1 + (1 - dist / danger) * 2.5;
        } else {
          st.stretch = 1;
        }
      }

      st.vel.add(acc.multiplyScalar(h));
    });

    // Integrate positions
    BODIES.forEach((body) => {
      const st = phys[body.id];
      if (!st || st.swallowed) return;
      st.pos.add(st.vel.clone().multiplyScalar(h));
    });

    // Black hole can also pull the Sun — sun moves slowly if BH is close
    if (blackHole?.active && phys.sun && !phys.sun.swallowed) {
      // already integrated above with sun as a body; good
    }
  }

  // Apply to meshes
  BODIES.forEach((body) => {
    const st = phys[body.id];
    const group = bodyMeshes[body.id];
    if (!st || !group) return;
    if (st.swallowed) {
      group.visible = false;
      return;
    }
    group.position.copy(st.pos);
    // stretch toward BH
    if (blackHole && st.stretch > 1.01) {
      const dir = blackHole.pos.clone().sub(st.pos).normalize();
      // Approximate radial stretch by non-uniform scale in world-ish local axes
      const stretch = st.stretch;
      const squash = 1 / Math.sqrt(stretch);
      group.scale.set(squash, stretch, squash);
      group.lookAt(blackHole.pos);
    } else {
      group.scale.set(1, 1, 1);
      group.rotation.set(0, group.rotation.y, 0);
    }
  });
}

function spawnSwallowFlash(pos) {
  const count = 40;
  const positions = new Float32Array(count * 3);
  const velocities = [];
  for (let i = 0; i < count; i++) {
    positions[i * 3] = pos.x;
    positions[i * 3 + 1] = pos.y;
    positions[i * 3 + 2] = pos.z;
    velocities.push(
      new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      )
    );
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const pts = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: 0xffaa44,
      size: 0.6,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    })
  );
  root.add(pts);
  let life = 0.8;
  const tick = () => {
    life -= 0.03;
    const arr = geo.attributes.position.array;
    for (let i = 0; i < count; i++) {
      arr[i * 3] += velocities[i].x * 0.15;
      arr[i * 3 + 1] += velocities[i].y * 0.15;
      arr[i * 3 + 2] += velocities[i].z * 0.15;
    }
    geo.attributes.position.needsUpdate = true;
    pts.material.opacity = Math.max(0, life);
    if (life > 0) requestAnimationFrame(tick);
    else {
      root.remove(pts);
      geo.dispose();
      pts.material.dispose();
    }
  };
  tick();
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------
const bodyList = document.getElementById("body-list");
const simDateEl = document.getElementById("sim-date");
const speedLabel = document.getElementById("speed-label");
const focusLabel = document.getElementById("focus-label");
const speedSlider = document.getElementById("speed");
const brightnessSlider = document.getElementById("brightness");
const brightnessLabel = document.getElementById("brightness-label");
const brightnessSliderVal = document.getElementById("brightness-slider-val");
const orbitsToggle = document.getElementById("orbits");
const labelsToggle = document.getElementById("labels");
const trailsToggle = document.getElementById("trails");
const detailName = document.getElementById("detail-name");
const detailDesc = document.getElementById("detail-desc");
const detailFacts = document.getElementById("detail-facts");
const detailSwatch = document.getElementById("detail-swatch");
const bhMassSlider = document.getElementById("bh-mass");
const bhMassVal = document.getElementById("bh-mass-val");

let focusId = "sun";
let followFocus = true;
let simDays = 0;

function sliderToSpeed(v) {
  if (v <= 0.001) return 0;
  return Math.pow(10, v) - 1;
}
function speedToSlider(s) {
  if (s <= 0) return 0;
  return Math.log10(s + 1);
}
function formatSpeed(s) {
  if (s === 0) return "Paused";
  if (s < 1) return `${s.toFixed(2)}×`;
  if (s < 30) return `${s.toFixed(1)}×`;
  if (s < 365) return `${Math.round(s)} d/s`;
  if (s < 3650) return `${(s / 365).toFixed(1)} y/s`;
  return `${(s / 365).toFixed(0)} y/s`;
}

let timeScale = sliderToSpeed(parseFloat(speedSlider.value));

BODIES.forEach((b) => {
  const li = document.createElement("li");
  li.dataset.id = b.id;
  if (b.id === focusId) li.classList.add("active");
  const dot = document.createElement("span");
  dot.className = "dot";
  const hex = "#" + b.color.toString(16).padStart(6, "0");
  dot.style.background = hex;
  dot.style.color = hex;
  li.appendChild(dot);
  li.appendChild(document.createTextNode(b.name));
  li.addEventListener("click", () => setFocus(b.id));
  bodyList.appendChild(li);
});

// Black hole list entry (dynamic)
const bhListItem = document.createElement("li");
bhListItem.dataset.id = "blackhole";
bhListItem.style.display = "none";
const bhDot = document.createElement("span");
bhDot.className = "dot";
bhDot.style.background = "#111";
bhDot.style.boxShadow = "0 0 8px #ff6600";
bhListItem.appendChild(bhDot);
bhListItem.appendChild(document.createTextNode("Black Hole"));
bhListItem.addEventListener("click", () => setFocus("blackhole"));
bodyList.appendChild(bhListItem);

function setFocus(id) {
  const prev = focusId;
  focusId = id;
  document.querySelectorAll(".body-list li").forEach((el) => {
    el.classList.toggle("active", el.dataset.id === id);
  });
  if (prev !== id) Log.debug("ui", `Focus ${prev} → ${id}`);

  if (id === "blackhole" && blackHole) {
    focusLabel.textContent = "Black Hole";
    detailName.textContent = "Black Hole";
    detailDesc.textContent =
      "Extreme gravity well. Planets fall in, stretch (spaghettification), and vanish past the event horizon. Not to scale — for drama.";
    detailSwatch.style.background = "radial-gradient(circle, #220000 30%, #000 70%)";
    detailSwatch.style.boxShadow = "0 0 20px #ff660088";
    detailFacts.innerHTML = "";
    const facts = {
      Mass: `${blackHole.massSolar.toFixed(0)} M☉`,
      Horizon: `${blackHole.horizon.toFixed(1)} (sim)`,
      Mode: "N-body free-fall",
    };
    Object.entries(facts).forEach(([k, v]) => {
      const dt = document.createElement("dt");
      dt.textContent = k;
      const dd = document.createElement("dd");
      dd.textContent = v;
      detailFacts.appendChild(dt);
      detailFacts.appendChild(dd);
    });
    bhListItem.style.display = "flex";
    return;
  }

  const b = BODIES.find((x) => x.id === id);
  if (!b) return;
  focusLabel.textContent = b.name;
  detailName.textContent = b.name;
  detailDesc.textContent = b.desc;
  detailSwatch.style.background =
    b.id === "sun"
      ? "radial-gradient(circle at 35% 30%, #fff7c2, #ffb347 50%, #ff6b1a)"
      : "#" + b.color.toString(16).padStart(6, "0");
  detailSwatch.style.boxShadow = `0 0 20px #${b.color.toString(16).padStart(6, "0")}88`;
  detailFacts.innerHTML = "";
  Object.entries(b.facts).forEach(([k, v]) => {
    const dt = document.createElement("dt");
    dt.textContent = k;
    const dd = document.createElement("dd");
    dd.textContent = v;
    detailFacts.appendChild(dt);
    detailFacts.appendChild(dd);
  });
}

setFocus("sun");

speedSlider.addEventListener("input", () => {
  timeScale = sliderToSpeed(parseFloat(speedSlider.value));
  speedLabel.textContent = formatSpeed(timeScale);
});
speedLabel.textContent = formatSpeed(timeScale);

document.querySelectorAll(".speed-presets button:not([data-brightness])").forEach((btn) => {
  btn.addEventListener("click", () => {
    const s = parseFloat(btn.dataset.speed);
    timeScale = s;
    speedSlider.value = speedToSlider(s);
    speedLabel.textContent = formatSpeed(timeScale);
  });
});

function setBrightness(level) {
  const v = Math.max(0.3, Math.min(3, level));
  brightnessSlider.value = String(v);
  const text = `${v.toFixed(1)}×`;
  brightnessLabel.textContent = text;
  brightnessSliderVal.textContent = text;
  applyBrightness(v);
}
brightnessSlider.addEventListener("input", () => setBrightness(parseFloat(brightnessSlider.value)));
document.querySelectorAll(".brightness-presets button").forEach((btn) => {
  btn.addEventListener("click", () => setBrightness(parseFloat(btn.dataset.brightness)));
});
setBrightness(parseFloat(brightnessSlider.value));

orbitsToggle.addEventListener("change", () => {
  if (!physicsMode) orbitLines.visible = orbitsToggle.checked;
});
labelsToggle.addEventListener("change", () => {
  labelSprites.visible = labelsToggle.checked;
});
trailsToggle.addEventListener("change", () => {
  trailGroups.children.forEach((t) => {
    t.visible = trailsToggle.checked;
  });
  if (!trailsToggle.checked) BODIES.forEach((b) => (trailHistory[b.id] = []));
});

document.getElementById("btn-reset").addEventListener("click", () => {
  focusId = "sun";
  setFocus("sun");
  camera.position.set(0, 45, 95);
  controls.target.set(0, 0, 0);
  followFocus = true;
});

document.getElementById("btn-follow").addEventListener("click", () => {
  followFocus = !followFocus;
  document.getElementById("btn-follow").textContent = followFocus ? "Following…" : "Follow focus";
});

// Black hole controls
function getBhMass() {
  return parseFloat(bhMassSlider?.value || "50");
}
if (bhMassSlider) {
  bhMassSlider.addEventListener("input", () => {
    if (bhMassVal) bhMassVal.textContent = `${parseFloat(bhMassSlider.value).toFixed(0)} M☉`;
  });
  if (bhMassVal) bhMassVal.textContent = `${getBhMass().toFixed(0)} M☉`;
}

document.getElementById("btn-deploy-bh")?.addEventListener("click", () => {
  if (blackHole) {
    // redeploy at current cursor mode
    removeBlackHole(true);
  }
  deployMode = true;
  setBhStatus("Click in space to place the black hole…");
  renderer.domElement.style.cursor = "crosshair";
  document.getElementById("btn-deploy-bh")?.classList.add("danger-active");
  Log.info("ui", "Deploy mode ON — click ecliptic plane to place BH", {
    massSolar: getBhMass(),
  });
});

document.getElementById("btn-bh-here")?.addEventListener("click", () => {
  // Place near asteroid belt (between Mars & Jupiter) for a dramatic show
  const angle = simDays * 0.01;
  const pos = new THREE.Vector3(Math.cos(angle) * 48, 2, Math.sin(angle) * 48);
  Log.info("ui", "Spawn at belt clicked", { massSolar: getBhMass() });
  spawnBlackHole(pos, getBhMass());
  deployMode = false;
  renderer.domElement.style.cursor = "default";
  bhListItem.style.display = "flex";
});

document.getElementById("btn-remove-bh")?.addEventListener("click", () => {
  deployMode = false;
  renderer.domElement.style.cursor = "default";
  Log.info("ui", "Remove black hole clicked");
  removeBlackHole(true);
  bhListItem.style.display = "none";
  setBhStatus("Ready to deploy a black hole");
});

document.getElementById("btn-restore")?.addEventListener("click", () => {
  deployMode = false;
  renderer.domElement.style.cursor = "default";
  Log.info("ui", "Restore system to J2000");
  removeBlackHole(true);
  bhListItem.style.display = "none";
  simDays = 0;
  BODIES.forEach((b) => {
    trailHistory[b.id] = [];
  });
  setBhStatus("System restored to J2000 epoch");
  setFocus("sun");
});

// Click: pick body or place BH
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

renderer.domElement.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  if (deployMode) {
    const hit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(groundPlane, hit)) {
      // keep within system
      if (hit.length() > 140) hit.setLength(140);
      Log.debug("input", "BH place click", {
        x: +hit.x.toFixed(2),
        y: +hit.y.toFixed(2),
        z: +hit.z.toFixed(2),
      });
      spawnBlackHole(hit, getBhMass());
      deployMode = false;
      renderer.domElement.style.cursor = "default";
      bhListItem.style.display = "flex";
    } else {
      Log.warn("input", "BH place click missed ecliptic plane");
    }
    return;
  }

  const meshes = Object.values(bodyMeshes)
    .filter((g) => g.visible)
    .map((g) => g.getObjectByName("surface") || g.children[0])
    .filter(Boolean);
  const hits = raycaster.intersectObjects(meshes, false);
  if (hits.length) {
    const group = hits[0].object.parent;
    if (group?.userData?.body) {
      setFocus(group.userData.body.id);
      followFocus = true;
      document.getElementById("btn-follow").textContent = "Following…";
    }
  } else if (blackHole) {
    const bhHits = raycaster.intersectObject(blackHole.group, true);
    if (bhHits.length) {
      setFocus("blackhole");
      followFocus = true;
    }
  }
});

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
const epoch = new Date(Date.UTC(2000, 0, 1));

function updateKeplerPositions() {
  BODIES.forEach((body) => {
    const group = bodyMeshes[body.id];
    const pos = keplerPosition(body, simDays);
    group.position.copy(pos);

    const surf = group.getObjectByName("surface");
    const spin =
      body.id === "sun" ? 0.003 : body.id === "venus" ? -0.004 : 0.01 + (1 / Math.max(body.period, 1)) * 2;
    if (surf) surf.rotation.y += spin * Math.max(0.2, Math.min(timeScale / 50, 3));

    const clouds = group.getObjectByName("clouds");
    if (clouds) clouds.rotation.y += spin * 1.15 * Math.max(0.2, Math.min(timeScale / 50, 3));

    group.children.forEach((ch) => {
      if (ch.userData.isMoon) {
        const t = simDays * 0.22;
        ch.position.set(Math.cos(t) * 2.2, 0.15 * Math.sin(t * 0.5), Math.sin(t) * 2.2);
      }
    });
  });
}

function updateLabelsAndTrails() {
  BODIES.forEach((body) => {
    const group = bodyMeshes[body.id];
    if (!group.visible) return;

    const label = labelSprites.children.find((s) => s.userData.bodyId === body.id);
    if (label) {
      label.position.copy(group.position);
      label.position.y += body.radius * group.scale.y + 2.2;
      const dist = camera.position.distanceTo(group.position);
      const sc = Math.max(4, Math.min(14, dist * 0.06));
      label.scale.set(sc, sc * 0.25, 1);
      label.visible = labelsToggle.checked;
    }

    if (trailsToggle.checked && (body.distance > 0 || physicsMode)) {
      const hist = trailHistory[body.id];
      hist.push(group.position.clone());
      if (hist.length > TRAIL_LEN) hist.shift();
      const trail = trailGroups.children.find((t) => t.userData.bodyId === body.id);
      if (trail && hist.length > 1) {
        trail.geometry.dispose();
        trail.geometry = new THREE.BufferGeometry().setFromPoints(hist);
      }
    }
  });

  if (blackHole) {
    // spin accretion disk
    const disk = blackHole.group.getObjectByName("accretion");
    if (disk?.material?.uniforms) {
      disk.material.uniforms.uTime.value = performance.now() * 0.001;
    }
    blackHole.group.rotation.y += 0.01;
  }
}

function formatDate(days) {
  const d = new Date(epoch.getTime() + days * 86400000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function animate() {
  requestAnimationFrame(animate);
  const frameT0 = performance.now();
  const dt = Math.min(clock.getDelta(), 0.05);
  const dayDelta = timeScale * dt;
  simDays += dayDelta;

  if (physicsMode) {
    // Cap physics step for stability when time scale is huge
    const physDays = Math.min(Math.abs(dayDelta), 8) * Math.sign(dayDelta || 1);
    if (dayDelta !== 0) integratePhysics(physDays === 0 ? dayDelta : physDays);
    // still spin surfaces
    BODIES.forEach((body) => {
      const st = phys[body.id];
      if (!st || st.swallowed) return;
      const surf = bodyMeshes[body.id]?.getObjectByName("surface");
      if (surf) surf.rotation.y += 0.01;
    });
    // Periodic physics health snapshot
    physStepLogCooldown -= dt;
    if (physStepLogCooldown <= 0) {
      physStepLogCooldown = 2.5;
      const alive = BODIES.filter((b) => phys[b.id] && !phys[b.id].swallowed);
      const sunk = BODIES.length - alive.length;
      Log.debug("physics", "Tick snapshot", {
        alive: alive.length,
        swallowed: sunk,
        simDays: +simDays.toFixed(1),
        timeScale: +timeScale.toFixed(2),
        bh: blackHole
          ? {
              massSolar: blackHole.massSolar,
              pos: {
                x: +blackHole.pos.x.toFixed(1),
                y: +blackHole.pos.y.toFixed(1),
                z: +blackHole.pos.z.toFixed(1),
              },
            }
          : null,
      });
    }
  } else {
    updateKeplerPositions();
  }

  updateLabelsAndTrails();

  if (followFocus) {
    let target = null;
    if (focusId === "blackhole" && blackHole) target = blackHole.pos;
    else if (bodyMeshes[focusId]?.visible) target = bodyMeshes[focusId].position;
    if (target) controls.target.lerp(target, 0.06);
  }

  controls.update();
  simDateEl.textContent = formatDate(simDays);
  renderer.render(scene, camera);
  Log.frameTick(performance.now() - frameT0);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  Log.debug("render", "Resize", { w: window.innerWidth, h: window.innerHeight });
});

// Time scale changes
speedSlider.addEventListener("change", () => {
  Log.info("ui", "Time scale set", { timeScale: +timeScale.toFixed(3), label: formatSpeed(timeScale) });
});

setBhStatus("Ready to deploy a black hole");
updateKeplerPositions();

// Boot diagnostics
try {
  const gl = renderer.getContext();
  Log.info("boot", "WebGL ready", {
    vendor: gl?.getParameter?.(gl.VENDOR),
    renderer: gl?.getParameter?.(gl.RENDERER),
    bodies: BODIES.length,
    trianglesHint: "procedural textures 512px",
  });
} catch (err) {
  Log.error("boot", "WebGL diagnostics failed", { err: String(err) });
}

Log.info("boot", "Cosmos ready — open Debug Log (` key) for runtime events");
animate();
