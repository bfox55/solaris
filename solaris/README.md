# SOLARIS — solar system & universe, sped up

A zero-build Three.js simulation of the solar system with **real J2000
Keplerian orbital elements** — every planet (plus the Moon and Halley's
comet) moves where it actually is on any given date, elliptical orbits and
all. Distances are radially compressed (sqrt scale) so the outer planets
fit on screen; motion stays true to Kepler's laws.

## Run

Static site — any static server works:

    cd ~/projects/solaris
    python3 -m http.server 8731
    # open http://localhost:8731

All three.js r160 modules are vendored in `vendor/` — no network needed.

## Controls

- **drag** orbit · **wheel** zoom · **click a body** to select & follow it
- bottom dock: play/pause, preset rate chips (1 h → 10 y per second) and a
  log-rate slider
- `?t=<days>&rate=<d/s>&follow=<key>` deep links — e.g.
  `index.html?follow=halley&t=23000` jumps to December 2062, right as Halley
  swings past 6.7 AU with its tail.

## What's simulated

- Kepler's equation solved per body per frame (Newton–Raphson), positions
  transformed through the standard Ω/ω/ι rotation to heliocentric J2000.
- The Moon orbits Earth in the correct plane; its orbit line rides along
  with Earth.
- Halley's comet: retrograde 75-yr orbit, dashed path, sun-pointing ion-tail
  ribbon (additive crossed planes) and a brightness that breathes with rAU.
- Procedural textures (no image assets): banded gas giants, banded Saturn
  rings with Cassini gap, Earth with a drifting cloud layer and atmosphere
  rim glow, cratered Moon, turbulent sun surface + corona + bloom.
- 900 twinkling stars + Milky Way band, faint ecliptic reference grid.

## HUD

Glassmorphic dark panels: simulation clock (top-left), display toggles
(orbit lines / labels / ecliptic / bloom), selection card (bottom-left) with
period, semi-major axis, eccentricity, day length and a live distance
readout, and the time dock (bottom-center). All deep-link states sync the
chip highlighting automatically.

## Tests

    node test/test-orbital.mjs

Verifies the Kepler solver (residual → 1e-12), vis-viva at perihelion,
date formatting, and rate formatting.
