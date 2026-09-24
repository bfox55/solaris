# Orrery Bench

One prompt, held fixed, handed to a different model each time.

**Live:** https://bfox55.github.io/solaris/

The brief — identical for every run, with no follow-up steering, no reference
implementation, and no shared code between runs:

> Make a beautiful simulation of the universe and solar system. should be sped up
> with adjustable time, realistic motion, orbits, stars. use threejs. Make the HUD
> well styled and conform to modern design principles

## Runs

| # | Build | Model | Path |
|---|---|---|---|
| 01 | SOLARIS | Qwen3.8-27B, all NVFP4 (local, via Hermes) | [`/solaris/`](https://bfox55.github.io/solaris/solaris/) |
| 02 | Ephemeris Orrery | Claude Opus 5 | [`/orrery/`](https://bfox55.github.io/solaris/orrery/) |
| 03 | Cosmos | xAI Grok (community build by MinkwanK, MIT) | [`/grok/`](https://bfox55.github.io/solaris/grok/) |
| 04 | Orrery | OpenAI Astra (by daniel-burla, hosted with permission) | [`/universe/`](https://bfox55.github.io/solaris/universe/) |
| 05 | Orrery (solar-system) | Fable (by daniel-burla, hosted with permission) | [`/solar-system/`](https://bfox55.github.io/solaris/solar-system/) |
| 06 | HELIOS | Qwen3.8-27B, official Nvidia release, mixed precision (local, via Hermes) | [`/helios/`](https://bfox55.github.io/solaris/helios/) |
| 07 | Ecliptic Orrery | Claude Opus 5.5 | [`/ecliptic/`](https://bfox55.github.io/solaris/ecliptic/) |

## Layout

    /                 the bench: comparison index
    /<run-dir>/       one directory per run (see table above)

Each build is self-contained in its own directory and can be opened directly.
Nothing is shared between them. Third-party builds carry a `PROVENANCE.md` and
their original license or permission notes.

## Adding a run

Drop the build in a new directory, then append one object to `ENTRIES` at the top
of the root `index.html`, filling in `standout`, `tradeoff` and, for someone else's
build, `credit`. The at-a-glance table, run cards, counts and side-by-side table
all render from that array. The side-by-side table hides any row where every run
agrees, so the real differences stand out as runs accumulate.
