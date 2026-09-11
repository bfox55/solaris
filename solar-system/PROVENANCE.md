# PROVENANCE — solar-system (Run 05, "Orrery (solar-system)")

## Source

- **App:** Daniel Burla's standalone solar-system simulation.
- **Source repo:** <https://github.com/daniel-burla/solar-system>
- **Live build (source of this vendored copy):** <https://daniel-burla.github.io/solar-system/>
- **Model:** **Fable** — Daniel states this build was created with Fable. (His other
  build, the React "Orrery"/universe-simulator, was created with OpenAI Astra; this
  one is vanilla ES modules — no build step, no React.)
- **Date:** first commit 2026-09-10 (JPL Table 1 epoch context; same day as the
  universe-simulator run).

## Legal basis for redistribution

- The repo carries **no LICENSE file** (files: `.gitignore`, `README.md`, `css/`,
  `index.html`, `js/`, `textures/`).
- **Basis = Daniel Burla's direct permission** to redistribute his build, given
  directly to Brett in the same conversation that covered his universe-simulator
  build. Same creator, same permission grant, both builds.
- There is no MIT/Apache/other license text to copy here; the permission is the
  entire basis. If this ever needs to stand on its own (public legal footing), the
  repo would need a LICENSE file or an explicit written grant.

## Third-party IP embedded in this build (preserved, not stripped)

The build bundles third-party assets; each is kept intact with its license so the
vendored copy remains self-contained and lawful:

| Asset | Where | License |
|---|---|---|
| **three.js r170** (core `three.module.js` + `jsm/` addon closure: OrbitControls, EffectComposer, RenderPass, UnrealBloomPass, OutputPass, CSS2DRenderer, + shaders Copy/LuminosityHighPass/OutputShader) | `vendor/` | MIT (three.js) |
| **Planet + moon + sun textures** (12 body maps, Earth night map, Saturn ring alpha, Moon, Io/Europa/Ganymede/Callisto/Titan/Triton) and the **8K Milky Way starfield** | `textures/` | **Solar System Scope — CC BY 4.0** (attribution kept in the app's own HUD footer: "Textures Solar System Scope (CC BY 4.0)") |
| **Inter** (400/500/600) + **JetBrains Mono** | `fonts/` (woff2 + `fonts.css`) | SIL Open Font License 1.1 (`fonts/OFL.txt`) |
| **JPL "Keplerian Elements for Approximate Positions of the Major Planets", Table 1** (valid 1800–2050) | `js/data.js` (orbital elements + secular rates) | NASA/JPL ephemeris data (public) |

## What this vendored copy changed vs. the source

The original `index.html` loaded two runtime CDNs:
- `three` from `cdn.jsdelivr.net` (importmap → `three` + `three/addons/`),
- Google Fonts (`Inter`, `JetBrains Mono`).

Both were **replaced with local vendored copies** to satisfy the bench's
self-contained / zero-runtime-CDN convention:
- `three` → `./vendor/three.module.js`, `three/addons/` → `./vendor/addons/`
  (importmap values use the `./` prefix; a bare relative path in an importmap is
  rejected by browsers, which silently discards the map — see Run 05 verification).
- Google Fonts → `fonts/fonts.css` + 13 woff2 subset files under `fonts/`.

No application logic, texture, or data was modified. No absolute paths were
present to rewrite (the build already used relative `js/`, `css/`, `textures/`).

## Verification (Run 05, 2026-09-10)

Served from a static server at `/solar-system/`:
- WebGL canvas mounts; full HUD populated (Sun→Neptune labels + 7 moons, time
  presets, true-scale + glow toggles, 78 fps on the render box).
- 14/14 textures load, 0 HTTP 4xx/5xx, 0 JS exceptions, loader dismissed.
- Pixel check: Milky Way background, textured sun, Saturn rings, Jupiter banding,
  readable HUD.
