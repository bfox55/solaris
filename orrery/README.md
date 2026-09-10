# Ephemeris Orrery

A second take on the solar-system brief, living alongside SOLARIS at the repo root.

**Live:** https://bfox55.github.io/solaris/orrery/

## What it does

Planet positions are solved every frame from **JPL approximate mean orbital
elements at J2000** (semi-major axis, eccentricity, inclination, mean longitude,
longitude of perihelion, longitude of ascending node) plus each element's
per-century rate, through Kepler's equation by Newton–Raphson:

    M = E − e·sin E

The orbital-plane solution is rotated through argument of perihelion →
inclination → longitude of ascending node into ecliptic coordinates. Orbit paths
are sampled from that same solver, so the drawn ellipse and the body on it can
never disagree. Orbital velocity comes from vis-viva, `v = √(GM(2/r − 1/a))`,
reported in km/s.

## Controls

| | |
|---|---|
| Rate | exponential, ~0.05 → ~500 days/sec, negative runs time backwards |
| Today / J2000.0 | jump to the live date or back to epoch |
| True distance | swap the compressed log radial scale for real AU spacing |
| Track body | lock the camera to the selected body |
| Orbit paths / Labels | toggle the reference overlay |

Drag to orbit, scroll to zoom, click any body.

## Notes

Single self-contained file. Three.js r128 from cdnjs; everything else —
starfield with a tilted galactic band, banded gas-giant textures, Saturn's rings
with the Cassini division — is generated procedurally on canvas at load, so there
are no image assets to fetch.

Radial distance is log-compressed by default (`log(1 + r·1.85)`), because true
AU spacing collapses the inner four planets into a single cluster once Neptune is
in frame. **True distance** exposes the real geometry rather than hiding it.
