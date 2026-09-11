// Kepler solver: orbital elements + Julian date -> heliocentric ecliptic coordinates (AU).
import { PLANETS } from './data.js';

export const J2000 = 2451545.0;
const DEG = Math.PI / 180;

export function dateToJD(date) {
  return date.getTime() / 86400000 + 2440587.5;
}
export function jdToDate(jd) {
  return new Date((jd - 2440587.5) * 86400000);
}

function solveKepler(M, e) {
  // M in radians. Newton iteration on E - e sin E = M.
  let E = e < 0.8 ? M : Math.PI;
  for (let i = 0; i < 12; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-9) break;
  }
  return E;
}

function wrap360(d) {
  d %= 360;
  return d < 0 ? d + 360 : d;
}

// Returns { x, y, z } in ecliptic J2000 frame, AU. z is ecliptic north.
export function planetPosition(p, jd) {
  const T = (jd - J2000) / 36525;
  const a = p.el[0] + p.rate[0] * T;
  const e = p.el[1] + p.rate[1] * T;
  const I = (p.el[2] + p.rate[2] * T) * DEG;
  const L = p.el[3] + p.rate[3] * T;
  const lp = p.el[4] + p.rate[4] * T;
  const ln = p.el[5] + p.rate[5] * T;

  const w = (lp - ln) * DEG;          // argument of perihelion
  const O = ln * DEG;                 // longitude of ascending node
  const M = wrap360(L - lp) * DEG;    // mean anomaly
  const E = solveKepler(M, e);

  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);

  const cw = Math.cos(w), sw = Math.sin(w);
  const cO = Math.cos(O), sO = Math.sin(O);
  const cI = Math.cos(I), sI = Math.sin(I);

  return {
    x: (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
    y: (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
    z: (sw * sI) * xp + (cw * sI) * yp
  };
}

// Orbit polyline: sample one full revolution around the given epoch.
export function orbitPath(p, jd, segments = 512) {
  const pts = [];
  const period = p.periodDays;
  for (let i = 0; i <= segments; i++) {
    pts.push(planetPosition(p, jd - period / 2 + (period * i) / segments));
  }
  return pts;
}

// Moon position relative to parent (km -> AU handled by caller), circular inclined orbit.
export function moonOffset(m, jd) {
  const n = (2 * Math.PI) / m.periodDays;
  const th = n * (jd - J2000);
  const i = m.inclDeg * DEG;
  const O = (m.node || 0) * DEG;
  const x0 = Math.cos(th), y0 = Math.sin(th);
  // rotate by inclination about x, then by node about z
  const x1 = x0, y1 = y0 * Math.cos(i), z1 = y0 * Math.sin(i);
  return {
    x: x1 * Math.cos(O) - y1 * Math.sin(O),
    y: x1 * Math.sin(O) + y1 * Math.cos(O),
    z: z1
  };
}

export function heliocentricLongitude(pos) {
  return wrap360(Math.atan2(pos.y, pos.x) / DEG);
}

export { PLANETS };
