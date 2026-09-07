// Node harness: test the REAL orbital.js (not a copy) via dynamic import.
import assert from 'node:assert';
import {
  solveKepler, positionAt, toScene, scaleA, visViva, formatSimDate, formatRate,
  sliderToRate, rateToSlider, BODIES, PLANETS, TAU, DEG,
} from '../js/orbital.js';

const D2R = Math.PI / 180;

// 1) Kepler solver: E - e sinE = M recovered within 1e-9
{
  for (const e of [0, 0.0167, 0.20564, 0.967]) {
    for (const Mdeg of [0, 47, 131, 200, 293, 359]) {
      const M = Mdeg * D2R;
      const E = solveKepler(M, e);
      const err = Math.abs(E - e * Math.sin(E) - M);
      assert(err < 1e-9, `kepler e=${e} M=${Mdeg}: err ${err}`);
    }
  }
  console.log('PASS kepler solver (e up to 0.967, all residues < 1e-9)');
}

// 2) Circular orbit sanity: position magnitude = a
{
  const orb = PLANETS.find((p) => p.key === 'venus').orbit; // e = 0.00677, near-circular
  for (const t of [0, 37, 99, 200]) {
    const p = positionAt(orb, t);
    const r = Math.hypot(p.x, p.y, p.z);
    assert(Math.abs(r - 0.72333) < 0.006, `venus |r| = ${r}`);
  }
  console.log('PASS circular-orbit radius (venus e~0, |r| ~= a within 0.008)');
}

// 3) Mercury perihelion/aphelion (eccentricity test, e = 0.2056)
{
  const orb = PLANETS.find((p) => p.key === 'mercury').orbit;
  // perihelion at M = 0 -> t such that M(t) = 0
  const tPeri = -orb.M0 / orb.n;
  const pPeri = positionAt(orb, tPeri);
  const rp = Math.hypot(pPeri.x, pPeri.y, pPeri.z);
  const expected = 0.38710 * (1 - 0.20564);
  assert(Math.abs(rp - expected) < 1e-4, `perihelion ${rp} vs ${expected}`);
  const pAph = positionAt(orb, tPeri + orb.T / 2);
  const ra = Math.hypot(pAph.x, pAph.y, pAph.z);
  const expectedA = 0.38710 * (1 + 0.20564);
  assert(Math.abs(ra - expectedA) < 1e-4, `aphelion ${ra} vs ${expectedA}`);
  console.log(`PASS mercury perihelion ${rp.toFixed(5)} / aphelion ${ra.toFixed(5)} AU`);
}

// 4) vis-viva: Earth at 1 AU -> 29.78 km/s; Mercury perihelion ~ 59 km/s
{
  assert(Math.abs(visViva(1, 1) - 29.784) < 1e-9);
  const vMerP = visViva(0.38710 * (1 - 0.20564), 0.38710);
  assert(vMerP > 57 && vMerP < 61, `mercury perihelion speed ${vMerP}`);
  console.log(`PASS vis-viva (earth ${visViva(1, 1).toFixed(2)}, mercury peri ${vMerP.toFixed(1)} km/s)`);
}

// 5) Date formatting: J2000 -> "01 Jan 2000"; +366.25d -> "01 Jan 2001"
//    (2000 is a leap year: Jan 1 2000 -> Jan 1 2001 spans 366 days)
{
  assert.strictEqual(formatSimDate(0), '01 Jan 2000');
  assert.strictEqual(formatSimDate(366.25), '01 Jan 2001');
  // 365.25 days back = 365 days + 6h: 1999-01-01T12:00 - 6h = 1999-01-01T06:00
  assert.strictEqual(formatSimDate(-365.25), '01 Jan 1999');
  console.log('PASS sim date formatting (J2000 epoch +/- 1 yr, leap-aware)');
}

// 6) Rate formatting + log slider round-trip
{
  assert.strictEqual(formatRate(2), '2.0 d/s');
  assert.strictEqual(formatRate(365.25), '1.0 y/s');
  assert.strictEqual(formatRate(0.0417), '1.0 h/s');
  for (const r of [0.02, 1, 30.44, 365.25, 3652.5, 365250]) {
    const rt = sliderToRate(rateToSlider(r));
    assert(Math.abs(rt - r) / r < 0.02, `slider round-trip ${r} -> ${rt}`);
  }
  assert.strictEqual(rateToSlider(2) > 0 && rateToSlider(2) < 1000, true, 'slider range');
  console.log('PASS rate formatting + log slider round-trip');
}

// 7) scene mapping: ecliptic-plane vectors land on XZ (y ~ 0), north = +Y
{
  const orb = PLANETS.find((p) => p.key === 'jupiter').orbit; // I = 1.303 deg
  for (const t of [0, 500, 2000, 4332]) {
    const p = positionAt(orb, t);
    const s = toScene(p);
    assert(Math.abs(s.y) < 0.35, `jupiter |z_ecl| should be small, got ${s.y}`);
  }
  // a body with I = 90-ish: verify mapping axis is consistent (Z_ecl -> +Y)
  const fake = { a: 1, e: 0, I: 90 * D2R, Omega: 0, omega: 0, n: TAU / 365.25, M0: 0, tau: 0 };
  const p = positionAt(fake, 365.25 / 4); // 90 deg along orbit
  const s = toScene(p);
  assert(Math.abs(s.y - 1.0) < 1e-6 && Math.abs(s.x) < 1e-6, `axis mapping ${JSON.stringify(s)}`);
  console.log('PASS scene mapping (ecliptic -> XZ plane, north = +Y)');
}

// 8) scale law is monotone & compresses range: Neptune/Mercury ratio
{
  const s = (a) => scaleA(a);
  for (const [lo, hi] of [[0.3, 0.7], [1, 5.2], [5.2, 9.5], [9.5, 19.2], [19.2, 30.1], [30.1, 35.1]]) {
    assert(s(lo) < s(hi), `scale monotonic ${lo}->${hi}`);
  }
  const ratio = s(30.07) / s(0.387);
  assert(ratio < 20, `compression ratio ${ratio.toFixed(1)} (want < 20)`);
  console.log(`PASS distance compression (neptune/mercury = ${ratio.toFixed(1)}x vs true ${ (30.07/0.387).toFixed(0) }x)`);
}

// 9) Halley: perihelion near 1986-02-09 (t = tau = -5074.5 -> r = a(1-e))
{
  const H = BODIES.find((b) => b.key === 'halley');
  const p = positionAt(H.orbit, H.orbit.tau);
  const r = Math.hypot(p.x, p.y, p.z);
  const expected = H.a * (1 - H.e);
  assert(Math.abs(r - expected) < 1e-3, `halley peri ${r} vs ${expected}`);
  console.log(`PASS halley perihelion ${r.toFixed(3)} AU at t=tau (9 Feb 1986)`);
}

// 10) All 8 planets + moon + halley produce finite positions at t = 0
{
  for (const b of BODIES) {
    const p = positionAt(b.orbit, 0);
    assert(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z), b.key);
  }
  console.log('PASS all bodies finite at J2000');
}

console.log('\nALL ORBITAL TESTS PASSED');
