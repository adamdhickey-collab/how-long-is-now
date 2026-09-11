# Working on HOW LONG IS NOW?

An interactive experiment in clock time, lived time, and remembered time.
Read `CONCEPT.md` for what the piece is, `APPROACH.md` for how it gets
made, `PLAN.html` for where the work stands. This file is the rules.

## The one rule that outranks the others

**The manifest owns time.** All choreography — scene order, durations,
labels, captions, time rates, and (as they arrive) camera moves, assets,
audio and shader state — is declared in `src/scenes/manifest.ts`. Nothing
outside it invents timing. If a change needs a number that controls when
or how long, that number goes in the manifest, not inline in `main.ts`.

## Work one bounded scene at a time

A task names a scene (`scene-04-year`, `scene-08-two-clocks`) and stays
inside it. Do not refactor the render loop, restructure the project, or
"improve" other scenes on the way through. If a scene genuinely needs a
change to shared code, make the smallest one that works and say so
explicitly.

## The map

| | |
| --- | --- |
| `src/scenes/manifest.ts` | Every scene's declaration — the only source of choreography |
| `src/main.ts` | The world: renderer, camera, particle field, HUD wiring, the loop |
| `src/style.css` | The HUD's typography and the piece's ground |
| `index.html` | The only page: canvas, HUD, clock, caption, scroll runway |
| `PLAN.html` | Living status doc — update it when a phase opens or closes |

## Design language

Near-black ground `#060708`, warm off-white ink `#e8e6e1`, dim ink
`#8a877f`. Letterspaced uppercase labels. Tabular figures for the clock.
One accent — `#d9a95b`, the 4:17 afternoon light — used only to mark
*now*. Newsreader italic exists solely for the piece's spoken lines.
No other colors or faces without a deliberate decision.

## Non-negotiables

- **Scroll is a time input, not navigation.** The world is fixed; only
  the runway has height. Nothing scrolls "down a page."
- **Reduced motion is a first-class mode.** Every animation checks it;
  the piece degrades to a legible still essay, never breaks.
- **Cheat like crazy.** Plates, video, depth maps over live geometry
  wherever 3-D isn't earning its cost. Choreography over polygon count.
- **The gate holds.** No connective tissue before the three moments
  (park → year, two clocks, memory corridor) are finished and beautiful.
- **Performance budget:** 60fps mid-range laptop, 30fps floor on phone,
  first frame under 3s. A change that breaks this isn't done.

## New artwork is drawn in the browser, not bought

The image API charges per picture. Every layer can be drawn in the
user's own ChatGPT instead, through Chrome, and landed at the exact path
the cutter expects. Use the `draw-in-the-browser` skill; the short
version is:

```bash
node scripts/generate.mjs <selector> --queue   # write the jobs out
node scripts/art-catch.mjs next                # the prompt to paste
node scripts/art-catch.mjs clip 0              # the clipboard → its path
node scripts/plates.mjs <scene>                # cut as always
```

Dropping `--queue` still calls the API, for when that is wanted.

## Verify before pushing

```bash
npm run build     # typecheck + production build — must pass
npm run preview   # eyeball the production build when the change is visual
```

Every push to `main` deploys to GitHub Pages
(https://adamdhickey-collab.github.io/how-long-is-now/), so `main` only
receives work that builds clean and has been looked at.
