# HOW LONG IS NOW?

An interactive experiment in clock time, lived time, and remembered time.
Part *Powers of Ten*, part museum installation, part psychology experiment,
part cinematic essay.

| | |
| --- | --- |
| **The concept** | [`CONCEPT.md`](CONCEPT.md) — the experience, scene by scene |
| **The plan** | [`APPROACH.md`](APPROACH.md) — stack, workflow, order of work |
| **The imagery** | [`ASSETS.md`](ASSETS.md) — style bible, shot list, the generation loop |
| **The direction** | [`DIRECTION.md`](DIRECTION.md) — the instruments: what is drawn over the park, scene by scene |
| **The contract** | [`src/scenes/manifest.ts`](src/scenes/manifest.ts) — every scene's declaration |

## Run it

```bash
npm install
npm run dev
```

Then open the printed localhost URL. What exists today is the skeleton the
piece will hang on: a fixed Three.js world, Lenis-smoothed scroll acting as
a **time input** rather than page navigation, a scene manifest driving the
labels and captions, and a placeholder particle field whose motion rate
follows the active scene's time scale — so scrolling already feels like
moving from one second to a lifetime.

```bash
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build
```

## Structure

```
PLAN.html                the living plan — where we are, what is next
CONCEPT.md               the piece, in words
APPROACH.md              how it gets made
ASSETS.md                how the imagery gets made — shot list and pipeline
DIRECTION.md             where the look is going — the instruments, scene by scene
index.html               the only page — world canvas, HUD, clock, runway
src/main.ts              scroll → time, the render loop, the HUD
src/scenes/manifest.ts   the scene manifest (the only source of choreography)
src/style.css            the HUD's typography and the piece's one background
.github/workflows/       main → GitHub Pages (build, publish dist/)
```

## The rule that keeps this buildable

All choreography flows from the scene manifest. A scene is a bounded unit —
its camera, duration, text, assets, audio and transition — and work happens
one scene at a time. Nothing outside `src/scenes/` gets to invent timing.

## First milestones

Three finished moments, before any connective tissue (see `APPROACH.md`):

1. The park → one year transition.
2. Ten identical minutes, lived vs. remembered.
3. The thirty-day memory-compression corridor.
