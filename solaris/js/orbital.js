/* Solaris — orbital math (pure, no three.js)
 *
 * J2000 Keplerian elements for the eight planets (a in AU, angles in deg,
 * periods in days). Element table: Standish & Williams (1992) via UT Austin
 * "Celestial Mechanics" Table 4.1. Mean-longitude form: we store lam0 (mean
 * longitude at J2000) + longitude of perihelion varpi, and derive
 * M0 = lam0 - varpi, omega = varpi - Omega.
 *
 * Ecliptic heliocentric frame: X toward vernal equinox, Y +90 deg, Z to
 * ecliptic north. Scene mapping: (X, Y_ecl, Z_ecl) -> (x, z, -y) so the
 * ecliptic lies on the scene's XZ plane with ecliptic north = +Y.
 */

export const DEG = Math.PI / 180;
export const TAU = Math.PI * 2;
export const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0); // J2000 epoch
export const AU_KM = 149597870.7;

/** Deterministic PRNG for texture generation. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Newton-solved Kepler equation E - e sin E = M. Works to e ~ 0.97. */
export function solveKepler(M, e) {
  M = ((M % TAU) + TAU) % TAU;
  let E = e < 0.8 ? M + e * Math.sin(M) : M + Math.PI * 0; // start near M
  for (let i = 0; i < 14; i++) {
    const f = E - e * Math.sin(E) - M;
    const fp = 1 - e * Math.cos(E);
    let d = f / fp;
    E -= d;
    if (Math.abs(d) < 1e-13) break;
  }
  return E;
}

function makeOrbit(o) {
  const I = o.I * DEG;
  const Omega = o.Omega * DEG;
  const omega = (o.varpi - o.Omega) * DEG;
  // M0: explicit (degrees) or derived from mean longitude: lam0 - varpi
  const M0 = o.M0deg !== undefined ? o.M0deg * DEG : (o.lam0 - o.varpi) * DEG;
  const n = TAU / o.T; // rad per day
  return { a: o.a, e: o.e, I, Omega, omega, n, M0, tau: o.tau ?? 0, T: o.T };
}

/** Heliocentric ecliptic position (AU) at t days from J2000. */
export function positionAt(orb, tDays) {
  const M = orb.M0 + orb.n * (tDays - orb.tau);
  const E = solveKepler(M, orb.e);
  const cE = Math.cos(E), sE = Math.sin(E);
  const xp = orb.a * (cE - orb.e);
  const yp = orb.a * Math.sqrt(1 - orb.e * orb.e) * sE;

  const co = Math.cos(orb.omega), so = Math.sin(orb.omega);
  const cO = Math.cos(orb.Omega), sO = Math.sin(orb.Omega);
  const cI = Math.cos(orb.I), sI = Math.sin(orb.I);

  const x = (co * cO - so * sO * cI) * xp + (-so * cO - co * sO * cI) * yp;
  const y = (co * sO + so * cO * cI) * xp + (-so * sO + co * cO * cI) * yp;
  const z = so * sI * xp + co * sI * yp;
  return { x, y, z };
}

/** Ecliptic -> scene coords: ecliptic plane becomes XZ, north = +Y. */
export function toScene(p) {
  return { x: p.x, y: p.z, z: -p.y };
}

/**
 * Visual distance scaling: the true solar system is too empty to look at at
 * 1:1 — Neptune would be 78,000 sun-radii out. We compress with a power law
 * so the inner system stays readable while outer orbits don't fly offscreen.
 */
export function scaleA(aAU) {
  return 30.08 * Math.pow(aAU, 0.6);
}

/** Sun-relative orbital speed (vis-viva, km/s; Earth mean = 29.78). */
export function visViva(rAU, aAU) {
  return 29.784 * Math.sqrt(Math.max(0, 2 / rAU - 1 / aAU));
}

export const PLANETS = [
  { key: 'mercury', name: 'Mercury', a: 0.38710, e: 0.20564, I: 7.006,  varpi: 77.457,  Omega: 48.331,  lam0: 252.251, T: 87.969,   type: 'rocky planet',  radiusKm: 2439.7,  rotDays: 58.646,  tilt: 0.03,  spin: 1 },
  { key: 'venus',   name: 'Venus',   a: 0.72333, e: 0.00677, I: 3.3946, varpi: 131.587, Omega: 76.679,  lam0: 181.980, T: 224.701,  type: 'rocky planet',  radiusKm: 6051.8,  rotDays: 243.018, tilt: 177.4, spin: -1 },
  { key: 'earth',   name: 'Earth',   a: 1.00000, e: 0.01671, I: 0.0,    varpi: 102.937, Omega: 0.0,    lam0: 100.464, T: 365.256,  type: 'terrestrial planet', radiusKm: 6371,  rotDays: 0.9973, tilt: 23.44,  spin: 1 },
  { key: 'mars',    name: 'Mars',    a: 1.52371, e: 0.09339, I: 1.850,  varpi: 336.042, Omega: 49.558,  lam0: 355.453, T: 686.980,  type: 'rocky planet',  radiusKm: 3389.5,  rotDays: 1.026,   tilt: 25.19,  spin: 1 },
  { key: 'jupiter', name: 'Jupiter', a: 5.20260, e: 0.04845, I: 1.303,  varpi: 14.392,  Omega: 100.466, lam0: 34.349,  T: 4332.59,  type: 'gas giant', radiusKm: 69911, rotDays: 0.4135,  tilt: 3.13,   spin: 1 },
  { key: 'saturn',  name: 'Saturn',  a: 9.55491, e: 0.05551, I: 2.489,  varpi: 93.046,  Omega: 113.666, lam0: 50.077,  T: 10759.2,  type: 'gas giant', radiusKm: 58232, rotDays: 0.444,   tilt: 26.73,  spin: 1 },
  { key: 'uranus',  name: 'Uranus',  a: 19.2184, e: 0.04716, I: 0.7733, varpi: 172.421, Omega: 73.998,  lam0: 314.059, T: 30685.4,  type: 'ice giant', radiusKm: 25362, rotDays: 0.7183,  tilt: 97.77,  spin: -1 },
  { key: 'neptune', name: 'Neptune', a: 30.1104, e: 0.00859, I: 1.770,  varpi: 46.684,  Omega: 131.624, lam0: 304.313, T: 60182.0,  type: 'ice giant', radiusKm: 24622, rotDays: 0.6713,  tilt: 28.32,  spin: 1 },
].map((p) => ({ ...p, orbit: makeOrbit({ a: p.a, e: p.e, I: p.I, varpi: p.varpi, Omega: p.Omega, lam0: p.lam0, T: p.T }) }));

/** Earth-Moon (geocentric, simplified — companion demo, not ephemeris-grade). */
export const MOON = {
  key: 'moon', name: 'Moon', type: 'natural satellite', radiusKm: 1737.4,
  a: 0.00257, e: 0.0549, I: 5.145, varpi: 0, Omega: 125.08, lam0: 200, T: 27.3216,
  rotDays: 27.3216,
  orbit: makeOrbit({ a: 0.00257, e: 0.0549, I: 5.145, varpi: 83.66, Omega: 125.08, lam0: 200, T: 27.3216 }),
  visualA: 0.95, // hand-tuned scene units around Earth
};

/** Comet 1P/Halley (retrograde, I = 162.3 deg). Perihelion 9 Feb 1986.
 *  Tau = -5074.5 days: perihelion epoch measured from J2000 (M = 0 there).
 *  Next perihelion: 27507 - 5074.5 = 22432.5 days after J2000 = Jul 2061. */
export const HALLEY = {
  key: 'halley', name: 'Halley', type: 'periodic comet (75 yr)',
  a: 17.834, e: 0.967, I: 162.32, varpi: 169.75, Omega: 58.42, T: 27507,
  rotDays: 0,
  orbit: makeOrbit({ a: 17.834, e: 0.967, I: 162.32, varpi: 169.75, Omega: 58.42, M0deg: 0, T: 27507, tau: -5074.5 }),
};

export const BODIES = [...PLANETS, MOON, HALLEY];

/** simDays since J2000 -> JS Date (UTC). */
export function simDate(simDays) {
  return new Date(J2000_MS + simDays * 86400000);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function formatSimDate(simDays) {
  const d = simDate(simDays);
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Format a sim-speed of days-per-visual-second. */
export function formatRate(dps) {
  if (dps >= 365.25) return (dps / 365.25 < 10 ? (dps / 365.25).toFixed(1) : Math.round(dps / 365.25)) + ' y/s';
  if (dps >= 1) return (dps < 10 ? dps.toFixed(1) : Math.round(dps)) + ' d/s';
  return (dps * 24).toFixed(1) + ' h/s';
}

/** Log-scale speed slider: value 0..1000 <-> days/sec. */
export const RATE_MIN = 0.02, RATE_MAX = 365250;
export function sliderToRate(v) {
  const L0 = Math.log10(RATE_MIN), L1 = Math.log10(RATE_MAX);
  return Math.pow(10, L0 + (v / 1000) * (L1 - L0));
}
export function rateToSlider(r) {
  const L0 = Math.log10(RATE_MIN), L1 = Math.log10(RATE_MAX);
  return 1000 * (Math.log10(r) - L0) / (L1 - L0);
}
