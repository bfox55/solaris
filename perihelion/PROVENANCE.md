# Perihelion — provenance

- **Model:** Claude Fable 5.2 (`claude-fable-5-2`), via Claude Code
- **Date:** 2026-11-12
- **Prompt (verbatim):** "Make a beautiful simulation of the universe and solar system. should be sped up with adjustable time, realistic motion, orbits, stars. use threejs. Make the HUD well styled and conform to modern design principles"
- **Protocol:** one prompt, no follow-up from the user. The model did not open any other run in this repository. It read only the memory note that says where runs live.
- **Self-iteration:** the model checked its own output in headless Chrome (screenshots plus console capture) and made three rounds of fixes before reporting: exposure of the galaxy view and Earth, a bloom artifact on bright stars, label placement, the rate readout, and baking the sky into a cubemap for frame rate.
- **Output:** a single file, `index.html`. three.js 0.170.0 and its addons load from jsDelivr; the Inter font loads from Google Fonts. No textures or other assets: every surface is generated procedurally at load.
- **Ephemeris:** JPL approximate Keplerian elements (J2000 with per-century rates, valid 1800–2050). The simulation runs 1000–3000 CE and gets less accurate outside the valid range. Moons use circular orbits with real periods; the Moon's phase follows its real mean longitude.
