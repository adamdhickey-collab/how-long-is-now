# Direction: the instruments

Where the look is going, decided 2026-09-06 from the moodboards in
`assets/raw/moodboards/` (session 5 in `assets/LEDGER.md`). `CONCEPT.md`
says what the piece is; this file says what it looks like from here.

## The decision

The park stays the park: the bench, the lake, the bandshell, the same
plates at the same distances. What changes is that the things normally
invisible are drawn over it, one instrument at a time, and scroll is what
switches them on.

Amended 2026-09-06, the same day: the plates themselves are redrawn in
the boards' illustrated style rather than left photographic (ledger
session 6). The boards were the better picture, and a photograph under a
drawn instrument read as two pieces; a drawn park under a drawn
instrument reads as one. Heat, sound, wind, what is in the air, the sun's record, the
year's ring, the network inside a leaf: each is a layer the world can be
seen through, drawn live over the plates, never baked into them.

Of the three boards, the isometric diorama was the strongest as a
system and the flat-vector board was the warmest, but both replaced the
place. The third board, the park seen through instruments, keeps the
bench, the lake and the bandshell, keeps everything built so far, and
gives every scene a reason to look different from the last without a
single new plate. The four full-frame tests (`f1` to `f4`) confirmed the
look survives at full size.

## Why it is the right direction for this piece

The piece's subject is what attention makes visible. An instrument is
attention made visible: it does not add anything to the park, it shows
what was already there. That is also the ending's claim — *the moment
didn't get longer, you got closer* — so the instruments are not
decoration on the idea; they are the idea, drawn.

It is also the direction that makes "grounded in science" literal. Every
layer measures something real, in real units, and where a real record
exists it is the source: NOAA's solar position already drives the
analemma; the Minnesota DNR's ice-out dates and the state phenology
network can drive the year; real Lake Harriet birdsong recordings can
drive the spectrogram.

## Rules

- **Instruments are drawn live, never generated.** Every instrument is
  a shader, a particle pass or a screen-space SVG over the world. The
  plates are generated stills in the boards' style (`ASSETS.md`), but
  they carry no instrument: the full-frame tests were look tests, and
  nothing from them enters the build.
- **One accent, for now.** The amber marks the present moment only: the
  radar's sweep, the record's tip, the crosshair. Everything else an
  instrument draws is off-white line and dot, or the reading's own ramp.
- **The manifest owns when.** A scene declares its instruments and the
  window of local progress each is on screen, the way scene 04 already
  declares its survey callouts. Nothing outside the manifest decides
  when a layer appears.
- **Reduced motion still shows the reading.** Sweeps stop sweeping and
  streamlines stop flowing, but the layer is drawn: the piece degrades to
  a still survey, not a blank one.
- **Each layer earns its frame.** A full-screen instrument pass is a
  full-screen quad; the budget is 60 fps on a mid-range laptop with every
  layer of a scene on at once. A layer that costs more than a millisecond
  is a layer that needs a cheaper drawing.

## The instruments

| Instrument | What it draws | Over | Grounded in | Already built |
| --- | --- | --- | --- | --- |
| **Flow field** | Streamlines and small arrows on the water, following wind and ripples, brightest along the sun's path; the same field through the canopy as wind | The water shader; the canopy plate | Prevailing wind for Minneapolis in each season (NOAA climate normals), which sets the field's direction | The water shader and its glitter path |
| **Radar** | A small scope in the frame's corner: a faint circular grid, a sweeping arm, everything in the air read into it as a dot with a short trail | The air particle system | What is actually in the air by season: pollen and insects in August, leaves in October, snow in January, seeds in spring | The air system, which already changes what falls by season |
| **Thermal** | A heat ramp over ground and water, warm grass to cool lake, with isotherm lines that drift as the sun moves | The near bank and far bank plates, as a luminance-to-ramp pass | Surface temperature from insolation and material: grass warms fast and cools fast, water barely moves | The plates and the sun's position |
| **Spectrogram** | A bird's song unrolling across the sky as a ribbon of frequency bands; fainter songs from the far trees; the water's lap as a low band at the shore | The sky, above the treeline | Real recordings of Lake Harriet birds (red-winged blackbird, common loon, robin), rendered to spectrogram textures ahead of time | Nothing yet; waits for the sound phase |
| **The record** | The sun at 4:17 every day for a year, as a figure of eight with a ribbon revealing it | The sky | NOAA solar position for Lake Harriet | Built: the analemma and its survey |
| **Ring of seasons** | The year as a ring, ice-out and leaf-out marked on it, the present as a tick | The HUD, or the turn from scene 04 to 05 | DNR ice-out dates for Lake Harriet, phenology dates for elm leaf-out and fall | Nothing yet; small |
| **Leaf as network** | A leaf's venation drawn as a network, lit node by node | The inward zoom | Venation is a real transport network; the drawing can follow one | Built 2026-09-08: the `leaf` instrument in scene 07, an elm leaf drawn procedurally in the overlay, vein by vein across its window |
| **Root network** | The stand's roots as a glowing network under the ground | The far shore, cut open | Trees of a stand share roots and fungal networks; the drawing is the memory corridor's metaphor made literal | Built 2026-09-08: the `roots` instrument in scene 05, procedural, seeded, growing tip by tip with the years |

## Scene by scene

| # | Scene | Instruments on |
| --- | --- | --- |
| 01 | `now` | None for the first second. Then thermal fades in as the first thing noticed: what the sun is doing to the grass. |
| 02 | `ten-minutes` | Flow field on the water and wind in the canopy; radar over the air. The world starts to be read. |
| 03 | `day` | One day's sun arc drawn as it happens; the thermal ramp swinging with it. |
| 04 | `year` | The record and its survey (built); radar tracking pollen, then leaves, then snow; the ring of seasons closing. |
| 05 | `lifetime` | The root network spreading; the elms' rings; the record stacking year on year into a band. |
| 06 | `return` | Black. Every instrument switches off. |
| 07 | `attention` | The spectrogram of one sound; the leaf as network; the thermal of one hand on the bench. Instruments as the inward zoom. |
| 08 | `two-clocks` | The same corridor twice: the waiting one with a single bare instrument ticking; the absorbed one with every layer on. When the label turns to *looking back*, the densities swap. |
| 09 | `memory-compression` | Each pane of glass carries that day's readings. Identical days, identical panes. |
| 10 | `return-to-now` | Every instrument faintly on at once, then gone, one by one, as the interface disappears. |

## Order of work

The gate holds: only scene 04's instruments count toward moment 1, and
nothing past scene 04 gets an instrument until the three moments are
done. Within that:

1. **Flow field on the water.** A change to the water shader that
   already exists, the cheapest layer, and the most visible in the frame
   the viewer sits in longest.
2. **Radar over the air.** A second pass over the air particles, with
   the sweep as the accent.
3. **Thermal on the banks.** A luminance-to-ramp pass on the near bank
   and far bank plates, with isotherms.
4. **The ring of seasons**, once the DNR and phenology dates are in the
   manifest as data.
5. **The spectrogram**, when the sound phase opens.

Each is bounded scene work: it lands in the manifest as a declaration
and in scene 04 as a drawing, and it is verified against the budget
before it is pushed.

## Look tests

When an instrument needs a look decided before it is drawn, run one
full-frame test in the moodboard conversation
(https://chatgpt.com/c/6a9dc61c-efe0-83e9-ab87-711f8fabf78a), one to two
minutes each, and record it in the ledger. Tests are for deciding what a
layer should look like. They are never assets.
