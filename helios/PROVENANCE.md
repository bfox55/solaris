# PROVENANCE — helios (Run 06, "HELIOS")

## Source

- **App:** Original build generated for this bench — not a vendored copy of a
  third-party project.
- **Model:** **Qwen3.8-27B — official Nvidia release, mixed precision
  (local, via Hermes, on the 5060 Ti)**. Note the precision difference
  from run 01 (SOLARIS): that build is an all-NVFP4 model, while this
  build uses the official release where some attention layers are less
  heavily quantized — a slightly higher-quality model doing the same
  fixed brief.
- **Date:** 2026-09-11.
- **Brief:** the fixed Orrery Bench prompt — *"Make a beautiful simulation of the
  universe and solar system. should be sped up with adjustable time, realistic
  motion, orbits, stars. use threejs. Make the HUD well styled and conform to
  modern design principles."*

## Legal basis

Brett's own build; no redistribution of third-party application code. The only
embedded third-party IP below carries its license and is kept intact.

## Third-party IP embedded in this build (preserved, not stripped)

| Asset | Where | License |
|---|---|---|
| **three.js r160** (core `three.module.js`, 1.3 MB + `addons/controls/OrbitControls.js`, 32 KB) | `vendor/` | MIT (three.js) |

Everything else — all 10 body maps (gas bands, rocky blotches, Earth
oceans/land/ice/clouds, regolith craters, sun surface + glow), the Saturn ring
gradient, the 16,800-point starfield, and the HUD — is generated in-page at
runtime (canvas + `THREE.CanvasTexture`); no image, font, or data file is
loaded. There is no module split: the entire sim is one self-contained
`index.html` (≈800 lines).

## What this run changed vs. run 01 (same engine, same brief)

| | Run 01 (SOLARIS) | Run 06 (HELIOS) |
|---|---|---|
| Element set | JPL Table 1 (a, e, i, Ω, ω, M₀) + secular rates | static (a, e, period); golden-angle phase |
| Epoch fidelity | J2000 mean anomaly → epoch-true positions | **not epoch-true** — periods + Kepler's 2nd law faithful, absolute phase is a golden-angle offset |
| Solver | Newton–Raphson on M = E − e·sin E | Newton–Raphson on M = E − e·sin E (7 it, 1e-6) |
| Velocity | vis-viva + Kepler velocity direction | not computed (Kepler placement only) |
| Bodies | Sun + 8 planets | Sun + 8 planets + **Moon** |
| Starfield | 8K Milky Way texture | seeded LCG, 16,800 points + tilted band |
| three.js | vendored r170 core + jsm addons | vendored r160 (same rev run 01 shipped) |
| Structure | 7 JS modules + css + 14 textures + fonts | 1 self-contained `index.html` |
| Interaction | — | click-to-focus + damped camera tween, system picker, log time-warp with presets + reverse-time, keys 1–9 jump to a body |

## Verification

Ad-hoc, 2026-09-11 (local): module extracted and `node --check` clean; fresh
headless load with **0 console messages / 0 JS errors**; render confirmed
visually (all 10 bodies, orbit lines, starfield, HUD, labels present); sim
clock advancing. Labeled ad-hoc — not a test suite.
