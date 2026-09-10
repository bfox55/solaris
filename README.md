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
| 01 | SOLARIS | Qwen3.8-27B NVFP4 (local, via Hermes) | [`/solaris/`](https://bfox55.github.io/solaris/solaris/) |
| 02 | Ephemeris Orrery | Claude Opus 5 | [`/orrery/`](https://bfox55.github.io/solaris/orrery/) |

## Layout

    /                 the bench — comparison index
    /solaris/         run 01
    /orrery/          run 02

Each build is self-contained in its own directory and can be opened directly.
Nothing is shared between them.

## Adding a run

Drop the build in a new directory, then append one object to `ENTRIES` at the top
of the root `index.html`. The run cards, the counts, and the divergence matrix all
render from that array — the matrix automatically hides any axis where every run
agrees, so contested ground surfaces on its own as runs accumulate.
