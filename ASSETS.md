# Assets

How the imagery gets made: what each scene needs, how it is generated with
ChatGPT's image tool driven from the browser, and how a picture becomes a
plate the manifest can place. `CONCEPT.md` says what the piece is;
`APPROACH.md` says "cheat like crazy"; this file is the cheat, itemised.

Status: **the park remade in a new direction, 2026-09-08 (session 10).**
One reference — a pointillist Lake Harriet alive with people, at
`assets/raw/park/reference.png` — now decides the style, and the park is
generated through the image model's API rather than the browser:
`scripts/generate.mjs` sends every prompt in `scripts/park-layers.mjs`
with the reference attached and writes the layers to
`assets/raw/scene-04/park/`; `npm run plates` keys them off their white
and cuts them. The paragraphs below record how the earlier plates were
made and remain true of the corridor and the memory sheets.

Earlier status: pipeline proven, 2026-09-05; plates restyled, 2026-09-06.
Session 1 generated its six images (seven with one correction); findings
in `assets/LEDGER.md`. Sessions 2–4 finished the three plate families as
photographs. Session 6 regenerated all twelve in the illustrated style the
moodboards decided (`DIRECTION.md`), in the same formats, so
`scripts/plates.mjs` (`npm run plates`) turns them into the same WebP
plates and scene 04 runs on them unchanged: four seasons of canopy
cross-faded by the manifest's season blend, the near bank tiled four
times, the far bank forty. Still procedural: the sky, water, sun and air.

## What the tool is, and isn't

The image generator inside ChatGPT (chatgpt.com, the *Create image* tool on
the composer's + menu) is the right tool for exactly one job here:
**still plates with consistent composition across variants.** It is good at
photographic landscapes, at keeping a composition when asked for "the same
scene in October", at transparent backgrounds when asked, and at taking a
reference image as a layout guide. It is not a video model, it does not
produce depth maps, and its output is small.

What the browser showed (checked 2026-09-05, signed in):

- The composer has a **Create image** chip; there are no size, ratio or
  style controls in the UI. Aspect ratio is requested *in the prompt*
  ("landscape 3:2", "portrait 2:3", "square"). Expect roughly
  1536 × 1024 landscape at best.
- A generated image sits in the conversation with a download control;
  files land in `~/Downloads`. Every conversation keeps its images in
  context, so later prompts can refer back to earlier ones.
- One conversation per plate *family* is the consistency trick: generate
  the August master, then ask for the same trees, same shoreline, same
  camera, in the other three seasons.

Consequences the plan is built around:

1. **Wide plates are tiled.** The manifest's canopy is a 10:1 strip and the
   far bank is 40:1. A single 3:2 image cropped to 10:1 is ~1536 × 154 px,
   which is nothing. Wide plates are generated as two or three overlapping
   3:2 panels in one conversation ("continue this treeline to the left,
   same light, same distance") and stitched locally.
2. **Colour is negotiated with the manifest, not overridden.** Today every
   plate is a white silhouette tinted by the active season palette. Real
   plates carry their own colour, so the season palette shrinks to what it
   still owns: sky, water, sun, haze, air, and the night multiply. The four
   palettes in `manifest.ts` become the *brief* each season's plate is
   generated against, and the plates are graded to agree with them.
3. **Depth maps are skipped for now.** Parallax already comes from plates at
   honest distances; the manifest says as much. If a hero plate needs
   internal depth later, that is a separate local step (Depth Anything),
   not a ChatGPT ask.

## The style bible

Every prompt starts from the same paragraph, so the pieces agree with each
other. Since session 6 the paragraph is the moodboards' (the M3 board and
its four full-frame tests, `assets/raw/moodboards/`), and the prompts run
in that conversation so the style is inherited rather than described:

> In the illustrated style of the four full-frame scenes above: dense
> stylised foliage built from clean clustered leaf shapes, gold rim light
> from a low late-August sun ahead and to the left, deep saturated
> blue-green in the shadows, warm gold in the light, clean crisp edges.
> Lake Harriet, Minneapolis, from the east bank, looking west across the
> water at 4:17 in August. Mature American elms and cottonwoods, the real
> Lake Harriet Bandshell at the far shore. Plain park only: no
> instruments, no line work, no grids, no arrows, no glow overlays, no
> people, no boats, no city skyline, no text.

The instruments are never in a plate. They are drawn live over it
(`DIRECTION.md`); the plate is the park with nothing yet noticed.

The photographic bible that made sessions 1–4 is kept for the record,
since its plates still exist in `assets/raw/` and could return:

> Photograph, not illustration. Lake Harriet, Minneapolis, from the east
> bank, looking west across the water. Late afternoon, 4:17 in August:
> the sun is ahead and to the left, low-ish and warm, backlighting the far
> treeline and laying a broken path of light on the lake. Mature American
> elms and cottonwoods, a bandshell at the far shore, a paved path along
> the near bank. 35 mm lens, eye height, slight haze, no wind. Muted,
> slightly desaturated colour; deep shadows that go warm-grey rather than
> black. No people, no text, no signage, no watermarks.

Per-season addenda, written from the manifest's palettes so the plate and
the world it sits in were briefed from one place:

| Season | Manifest keyframe | Addendum |
| --- | --- | --- |
| Late summer | `LATE_SUMMER` (sky 5a92bd→d8c9a8, canopy 2f4128, water 35566a) | full dense canopy, still water, pollen haze |
| Autumn | `AUTUMN` (sky 35648b→e0b884, canopy 8a5a24) | canopy two-thirds full and turned amber, leaves in the air, lower sun |
| Winter | `WINTER` (sky 24425f→a8b6c4, bank c6ccd2) | bare elms, lake frozen and snow-covered with walked paths, flat white light, sun very low |
| Spring | `SPRING` (sky 4e7ea8→d6d9c4, canopy 4e6b34) | half-leafed canopy in yellow-green, high thin cloud, open water again |

Reference images are allowed and encouraged. The strongest one we already
own is a screenshot of the current procedural scene 04, which shows the
plate geometry exactly: where the horizon sits, how much frame the near
bank takes, where the treeline band falls. Attaching it as "match this
composition" is how the generated plate ends up fitting the manifest's
plate sizes instead of the manifest bending to the image.

## The shot list

Ordered by the gate. Moment 1 (scene 04) is everything until it is
finished; the rest is listed so the style bible is written with them in
mind, not so they get generated now.

### Scene 04 · the park → one year (moment 1)

Superseded on 2026-09-08 by the park's layers (ledger session 10):
`far-shore`, `shoreline`, `lawn`, `trees`, `foreground`, and the sheets
`sitters`, `movers`, `boats`, all late summer, all from
`scripts/park-layers.mjs`. The table below is what the illustrated park
was made of, kept for the record; its raws remain under `assets/raw/scene-04/`.


| Id | What | Plate | Format | Variants |
| --- | --- | --- | --- | --- |
| `canopy` | The far treeline across the lake, bandshell included | `canopy` 220 × 22 at z −46 | 3 overlapping 3:2 panels, transparent sky, stitched to ~4000 × 400 | 4 seasons |
| `far-bank` | The far shoreline: sand, riprap, path, the base of the trees | `far-bank` 240 × 6 at z −40 | 2 panels, transparent above, stitched | 4 seasons |
| `near-bank` | The bank the camera rises from: grass, reeds, the path edge, water's edge at the bottom | `near-bank` 110 × 26 at z 0 | 1 panel 3:2, cropped to ~4:1, transparent above the grass line | 4 seasons |
| `bench` | The bench, empty, three-quarter view. Scene 01's anchor and scene 10's | new hero plate, near-bank depth | cutout, transparent | August only (grade for others) — **done 2026-09-08**, ledger session 9; it is present while August is held and leaves as the year turns, so the other three seasons are only needed if it should sit through them |
| `clouds` | A thin field of high cloud | optional plate in front of `sky` | transparent, tileable horizontally | August, January |

Sixteen to twenty images before rejects. Sky, sun, water, air and the
night multiply stay procedural; they already move continuously and no
still would.

### Scene 01 / 10 · now, and the return (after the gate)

One hero still at the bench, ground level, 4:17. Scene 10 reuses it and
adds the things that were background: a beetle on a leaf, water reaching
the shore, a cloud reforming. Each of those is a tight macro cutout.

### Scene 08 · two clocks

Two identical corridors, and the camera walks down both, so the corridor
is not one picture but three surfaces the scene tiles along its length:
one bay each of the wall (4 × 3 m, the door in the middle), the ceiling
(4 × 2.6 m, one fluorescent panel) and the floor (4 × 2.6 m, terrazzo),
each generated flat and front-on in the same illustrated style as the
park, muted and institutional, and mirrored at every join so nothing
seams. The scene lights them itself: the lamps' pooling, the floor's
reflection, the fog, are the shader's, so the plates stay evenly lit.
Plus the "memory fragment" cutouts for the absorbed corridor's LOOKING
BACK state — a hand on a page, a cup, a window, a face turned away, a
shoe on a step — generated nine to a sheet on transparent ground in a
3 × 3 grid, sliced and packed into one atlas by `scripts/plates.mjs`.
Eighteen in two sheets. Generated 2026-09-06 (ledger, session 7).

### Scene 09 · memory compression

The best fit for the tool in the whole piece. Thirty "same day" images for
the repetitive month, generated with an explicit instruction to vary
almost nothing: same desk, same window, same mug, same light. Then thirty
for the vivid month, each a different place, weather, and hour. Squares,
small, sixty in total. The panes are made of these. Generated 2026-09-08
nine to a sheet in a 3 × 3 grid, sliced and packed into one atlas per
month (ledger, session 8): one sheet of nine for the same day, which
the thirty days reuse in turn, and four for the different days.

### Scene 05 · lifetime

The same far shore over decades: saplings become the elms, the bandshell
rebuilt, the skyline behind it changing. Four or five states of the
`canopy` plate, generated from the August master. Deferred.

### Scene 07 · attention

Macro cutouts, the same list as scene 10's additions plus a blink, a
breath fogging cold air, a hand on a railing. Deferred; shares assets
with scene 10.

## The loop

The whole point of driving chatgpt.com from the browser is that generate →
look → correct → accept is a loop an agent can run while you review the
accepted set at the end. The loop, per shot:

1. **Open the family's conversation** (one per plate family, kept between
   sessions so composition context survives). Select *Create image*.
2. **Prompt** = style bible + season addendum + the shot's own line + the
   format line ("landscape 3:2, transparent background above the treeline").
   Attach the reference screenshot on the first shot of a family.
3. **Wait**, polling for the download control rather than sleeping a fixed
   time; generation takes one to two minutes.
4. **Download.** This is the one step that is not silent: saving a file to
   your machine is confirmed with you in chat, each time. Batch the asks
   ("these six are ready, download all six?") so a session is one or two
   confirmations, not twenty. If that is still too much friction, the
   alternative is you dragging the accepted set out of ChatGPT's library in
   one go and the loop resuming from `assets/raw/`.
5. **File it.** `~/Downloads/<whatever>.png` moves to
   `assets/raw/<scene>/<id>-<season>-v<n>.png`. The prompt that produced it
   is appended to `assets/LEDGER.md` next to the filename. The ledger is the
   provenance; the raw folder is not committed.
6. **Grade it.** The image is opened and checked against the style bible
   and the plate's format: horizon in the right place, sun on the correct
   side, no people, no text, transparent where transparency was asked for,
   season reads at a glance. A miss gets a correction prompt in the same
   conversation ("same image, remove the person on the path, keep
   everything else") and goes back to step 3. Three misses and the shot's
   prompt is the problem, not the roll of the dice.
7. **Make the plate.** `scripts/plates.mjs` (`npm run plates`) crops each
   raw image to its useful band, widens the canopy by mirroring its own
   flanks, and writes WebP with alpha into
   `public/plates/<scene>/<id>-<season>.webp`, stepping quality down
   until each file is under 700 KB. Fine bare branches are what cost:
   winter and spring land around 650 KB, summer under 400.
8. **Wire it.** `Plate` in the manifest has an `images` map keyed by
   season name (`'*'` for a plate that is the same all year) and an
   `imageRepeat` for plates the camera stands close to. `scene-04-year.ts`
   loads the textures behind the first frame, keeps the procedural
   stand-in until all of them are in, then cross-fades them by
   `seasonWeights`, the same blend the palette uses. The tint path stays
   for the night multiply only.

What the agent can run alone: 1, 2, 3, 5, 6, 7 and the typecheck/build in
8. What it stops for: 4, and the look at the finished scene against the
procedural one before anything is pushed.

## Budget

| | |
| --- | --- |
| Scene 04 plates on disk | ≤ 3 MB total as WebP, four seasons of three plates plus the bench |
| Load order | Nothing before the first frame; plates stream in behind scene 01, which is a second in which almost nothing happens |
| Texture size | 4096 wide for `canopy`, 2048 for the banks, 1024 for cutouts |
| Reduced motion | The August plates only; no cross-fade |

## Session 1 · the pilot

Six images, one afternoon, to learn the tool's real limits before the
shot list is trusted:

1. `canopy`, August, the centre panel, with the procedural screenshot as
   the composition reference. This decides whether the style bible works.
2. The same panel in October, January, April, in the same conversation.
   This decides whether seasons stay consistent.
3. The left panel, August ("continue this treeline to the left").
   This decides whether tiling is viable or whether wide plates need a
   different approach (a single 3:2 plate per depth, with the manifest's
   plate widths reduced to match).
4. `near-bank`, August. This decides whether transparent-background plates
   come out clean enough to sit in front of the water.

If 3 fails, the manifest's plate widths change, not the tool. If 4 fails,
backgrounds are removed locally instead. If 1 fails, the style bible is
rewritten before anything else is generated.

Then, and only then, `scripts/plates.mjs` and the manifest change.
