# PROVENANCE — ecliptic (Run 07, "Ecliptic Orrery")

## Source

- **App:** Original build generated for this bench. It is not a copy of a
  third-party project.
- **Model:** **Claude Opus 5.5** (`claude-opus-5-5`), in Claude Code.
- **Date:** 2026-09-24.
- **Brief:** the fixed Orrery Bench prompt, *"Make a beautiful simulation of the
  universe and solar system. should be sped up with adjustable time, realistic
  motion, orbits, stars. use threejs. Make the HUD well styled and conform to
  modern design principles"*, sent once with no follow-up steering.
- **Session conditions:** The build was one-shot in a cleared session. The model
  was told not to draw on earlier conversations, memory or project notes.
  Claude Code still loaded the user's global instructions and memory index
  automatically. Neither was consulted. Nothing from the other runs in this
  repo was read before the build was finished.
- **Self-check before publishing:** the model took one headless screenshot and
  made two fixes. It added a missing `[hidden]` style rule, which had left a
  fallback message and both play/pause icons visible, and it lowered the
  asteroid belt's brightness. No human edited the page.
- **Only packaging change for this repo:** Claude's artifact host normally adds
  the `<!doctype>`, `<head>` and `<body>` wrapper. That wrapper and a
  `body { margin: 0 }` rule were added so the page stands alone. The page is
  otherwise unchanged.

## Legal basis

This is Brett's own build, and it redistributes no third-party application
code.

## Third-party IP loaded at runtime (not vendored)

| Asset | Loaded from | License |
|---|---|---|
| three.js r128 (`three.min.js`) | cdnjs | MIT |
| OrbitControls (three@0.128.0 `examples/js`) | jsDelivr | MIT |
| Instrument Serif, Manrope, IBM Plex Mono | Google Fonts | SIL OFL |
| Orbital elements: JPL "Keplerian Elements for Approximate Positions of the Major Planets" (Standish), Table 1 | embedded as data | public-domain US Government work |

The page generates everything else in-browser with GLSL shaders: planet
surfaces, the Sun, Saturn's rings, atmospheres, the Milky Way, the starfield
and the galaxy sprites. It loads no images.

## What this run does

| | |
|---|---|
| Element set | JPL Table 1 elements plus per-century rates. Best for 1800–2050; time is clamped to 1600–2400 |
| Solver | Newton–Raphson on M = E − e·sin E in the browser for planets, and 4 iterations on the GPU for belt objects |
| Velocity | vis-viva, km/s |
| Bodies | Sun, 8 planets, Pluto, and 6 moons (Moon, Io, Europa, Ganymede, Callisto, Titan) |
| Belts | ~14,300 objects solved on the GPU: the main belt with its Kirkwood gaps, the Jupiter Trojans at L4/L5, and the Kuiper belt including plutinos |
| Orientation | IAU pole directions for every body. Uranus lies on its side, Venus spins backwards, and Saturn's rings are angled correctly for the date |
| Moon | Real mean longitude and a regressing node, so the phase and next full moon are correct |
| Sky | 16k seeded stars, 49 named bright stars, 5 constellation figures, the Milky Way in the right place, and Andromeda, Triangulum and the Magellanic Clouds |
| Scale | Enlarged by default. A true-scale toggle animates bodies down to real size, with the camera following the change |
| HUD | Glass panels. Time dock with play/pause, reverse, log speed (1 s/s to 10 yr/s), presets and a Now button. Body list, live info panel, scale bar, keyboard shortcuts, and a phone layout |
| Precision | Floating origin: the scene recentres on the followed body so true-scale worlds don't jitter |
| Files | 1 self-contained `index.html` |
| Tests | none |

## Known trade-offs

- **Spin:** on-screen rotation is capped at 0.35 turns per second so it doesn't
  flicker at high speeds. Orbital positions are never capped.
- **Galilean moons:** they use approximate mean longitudes on circular orbits.
  Titan's starting phase is arbitrary.
- **three.js:** it loads from a CDN instead of being vendored, so the page needs
  network access.
