# Provenance — /universe/ (run 04)

This run is **Daniel Burla's "Orrery — A universe in motion"**, a standalone
static build of the Orrery Bench prompt.

- **Source:** https://github.com/daniel-burla/universe-simulator
- **Created with:** OpenAI Astra (per author)
- **Author:** Daniel Burla
- **Build type:** Vite + React + TypeScript, `dist/` deployed to GitHub Pages;
  three.js `^0.180.0` bundled into `assets/three-*.js` — **no CDN**, self-contained.
- **Three.js revision shipped:** 0.180 (bundled, `revision:"180"`).

## Legal basis — important
The source repository **has no LICENSE file**. Redistributing this build is
authorized by **Daniel Burla's direct, explicit permission** (granted to the
bench operator, 2026-09-10). There is no open license to fall back on — this
permission is the entire basis. Do not re-host this code beyond the bench
without that standing permission.

## Third-party assets preserved (NOT stripped)
This build embeds its own third-party IP. All of it is retained here:

- **Planet textures** — Solar System Scope / INOVE, **CC BY 4.0**.
  See `textures/ATTRIBUTION.md` (retained unmodified). Maps derive from NASA
  imagery/elevation; unmapped areas may contain fictional terrain.
- **Fonts** — DM Sans + Manrope, **SIL Open Font License** (`fonts/dmsans-OFL.txt`,
  `fonts/manrope-OFL.txt`). The built `dist/` omitted these license files, so
  they were pulled from the source repo to keep the font licenses intact.
- **three.js + Lucide** — see `THIRD_PARTY_NOTICES.txt` (retained unmodified).
- **Orbital model data** — JPL Table 1 (`https://ssd.jpl.nasa.gov/planets/approx_pos.html`),
  valid 1800–2050.

## Model fidelity (per author's README)
- Orbital elements + rates from JPL Table 1, valid 1800–2050; Kepler's equation
  solved at each simulated date.
- Per-orbit scale factor compresses distances while preserving ellipse shape
  and angular motion; planet radii enlarged independently.
- Earth uses the Earth–Moon barycenter approximation; Moon + asteroid belt use
  simplified orbits. **No N-body integration or collision modeling.**
- Starfield, galaxy structure, and distant galaxies are **illustrative**, not a
  catalog or cosmological simulation.
- Source ships unit tests (`npm test` — orbital geometry, JPL coordinates, time
  advancement, bounds, display scaling). The static build does **not** include them.

## Adaptation for the bench
The author's Vite base is `/universe-simulator/`. To mount this under the bench
at `/universe/` without a build step, all absolute `/universe-simulator/...`
references were rewritten to relative (`./...`) in `index.html`, `assets/*.css`,
and `assets/*.js`. CSS `url()` font refs resolve relative to the stylesheet
dir (TTFs live next to the CSS in `assets/`); HTML/JS refs resolve relative to
the page. Render-verified: WebGL scene mounts, all textures + fonts + bundles
load, zero JS/console errors.
