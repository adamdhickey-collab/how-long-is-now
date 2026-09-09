# Asset ledger

Every generated image, the prompt that produced it, and the verdict. Raw
downloads live in `assets/raw/` (not committed); this file is the
provenance. Newest session at the bottom.

## Session 1 · pilot · 2026-09-05

Tool: ChatGPT *Create image*, driven from Chrome. One conversation for the
whole session so composition carried between shots:
https://chatgpt.com/c/6a9c7937-1268-83ea-a956-a24c9c2ba8da

Account note: the composer showed "Capabilities reduced until September 8.
Responses may have lower quality" on the first generation. Quality did not
visibly suffer, but re-check anything from this session against a
post-September-8 generation before it is called final.

Reference attached to shot 1: a 1536 × 903 screenshot of the procedural
scene 04 at global progress 0.2968 (August, camera at the bench), HUD
hidden, taken from the dev server.

Every output: 1536 × 1024 PNG, 1.9–3.2 MB, true alpha channel. Each took
45–75 s.

| # | File (once downloaded) | Prompt | Result |
| --- | --- | --- | --- |
| 1a | `scene-04/canopy-august-v1.png` | Style bible + "far shore, elms and cottonwoods in full late-August leaf, bandshell near centre, sun ahead-left, treeline as a horizontal band, bottom edge is the waterline, transparent above the trees" + reference image | Photographic, composition right, bandshell centred, backlit warm. **Miss:** water filled the lower 40 %, sky not transparent. |
| 1b | `scene-04/canopy-august-v2.png` | "Keep this exact image … remove the water entirely so the bottom edge is the shoreline; make everything above the trees fully transparent alpha" | **Accept.** Same trees, opaque band rows 273–705 of 1024, 65 % transparent. The correction kept the image. |
| 2a | `scene-04/canopy-october-v1.png` | "Same exact scene … mid-October 4:17, canopy two-thirds full, amber and gold, bare branches showing, leaves in the air, sun lower, shrubs rust" | **Accept.** Same trees and bandshell in the same positions. Band rows 264–705. |
| 2b | `scene-04/canopy-january-v1.png` | "… mid-January, elms completely bare, dusting of snow, shoreline snow-covered, flat pale light, sun very low, grey-blue and brown" | **Accept.** Band rows 257–710. Bare branches read cleanly against alpha. |
| 2c | `scene-04/canopy-april-v1.png` | "… late April 4:17, elms half-leafed in pale yellow-green, canopy translucent, shrubs greening, high thin cloud" | **Accept.** Band rows 256–709. |
| 3 | `scene-04/canopy-august-left-v1.png` | "Panel immediately to the LEFT of the August image … repeat the leftmost two trees as an overlap, no bandshell" | **Partial.** Style, light and alpha match. Band rows 183–742: trees ~20 % larger and the shoreline ~35 px lower than the centre panel, and the overlap trees are not a literal repeat. Stitching needs local scale-to-shoreline alignment; the seam must hide in crown mass. |
| 4 | `scene-04/near-bank-august-v1.png` | "The NEAR bank … tall grasses, reeds, late-summer wildflowers seen from behind, backlit, bottom third solid ground, transparent above the grass tips" | **Accept.** Opaque from row 198 down, no gaps in the lower 30 %. |

### What the pilot decided

1. **The style bible works** as written. The one addition: say "bottom
   edge of the image is the shoreline" up front and ask for transparency
   in the first prompt, which 1a did and still got water; the correction
   round fixed it in one pass.
2. **Seasons stay consistent** inside one conversation. Tree positions,
   the bandshell and the band height held across four seasons.
3. **Tiling is viable but not free.** Adjacent panels drift in scale and
   horizon; `scripts/plates.mjs` needs a step that scales each panel so
   its shoreline row and band height match the master before stitching.
   The alternative (narrower plates) stays on the table if the seams show.
4. **Transparent plates come out clean** straight from the tool. No local
   background removal needed for the canopy or the near bank.

Downloaded 2026-09-05 into `assets/raw/scene-04/` (all seven, including the rejected 1a).

Wired the same day: canopy (all four seasons) and near bank are live in
scene 04 via `npm run plates` and the manifest's `images` declarations.
The mirrored flanks show as a symmetric pair of backlit crowns at the
left of the strip; the dedicated left panel (shot 3) is not yet used.

## Session 2 · the real bandshell · 2026-09-05

Same conversation as session 1. The August master (1b) was attached as
the reference and edited; the seasons were then re-run from the result.

Reference notes (from an image search, not uploaded): the real Lake
Harriet Bandshell (Milo Thompson, 1986) seen from the lake is a tall
wooden pavilion whose steep pyramidal roof is its whole character —
slate blue-grey shingle (repainted blue in 2025; earlier photos show
tan), pitched almost like a tent, low eaves, a white finial spire. The
lake-facing wall is a tall gabled projection with one large arched
window of white mullions under a white X-lattice truss, small dormers,
white trim. To its left, four smaller octagonal pavilions with steep
tent roofs and white finials. A boardwalk and low stone edge in front,
lamp posts, a strip of lawn. It sits at the water's edge among the
trees.

| # | File (once downloaded) | Prompt | Result |
| --- | --- | --- | --- |
| 5a | — | Master + "replace the small bandshell at the centre with the real Lake Harriet Bandshell … steep pyramidal roof, glass gable under white lattice, four tent pavilions to its left, boardwalk, lamp post" | Recognisable but too delicate: read as a glass conservatory with gazebo-sized pavilions. Superseded by 5b. |
| — | — | October and January were run from 5a before the second pass | Superseded. |
| 5b | `scene-04/canopy-august-v3.png` | Second pass on 5a: "far more massive and roof-dominated … not a glass conservatory, the only glass is one gable … pavilions are chunky octagonal buildings, half the height of the main building … everything wood painted blue-grey and white … dock and boardwalk, riprap, lamp posts" | **Accept.** Massive blue-grey pyramidal roof with dormers, arched window under X-lattice, clapboard walls, boardwalk. Drift: five pavilions rather than four. Band rows 272–706. |
| 6a | `scene-04/canopy-october-v2.png` | Session 1's October prompt on 5b | **Accept.** Band rows 236–707. |
| 6b | `scene-04/canopy-january-v2.png` | Session 1's January prompt on 5b, plus snow on the roofs | **Accept.** Band rows 271–710. |
| 6c | `scene-04/canopy-april-v2.png` | Session 1's April prompt on 5b | **Accept.** Band rows 258–709. |

Each edit took two to three minutes, up from about one in session 1.

### Session 2b · four pavilions

5b was attached and edited once more: "five small octagonal pavilions;
the real one has exactly four. Remove the leftmost and let shoreline
shrubs and trees fill its place." Everything else held. The seasons
were then re-run from it a third time.

| # | File (once downloaded) | Result |
| --- | --- | --- |
| 5c | `scene-04/canopy-august-v4.png` | **Accept.** Four pavilions, building and trees unchanged. Band rows 271–707. |
| 6d | `scene-04/canopy-october-v3.png` | **Accept.** Band rows 245–707. |
| 6e | `scene-04/canopy-january-v3.png` | **Accept.** Band rows 259–712. |
| 6f | `scene-04/canopy-april-v3.png` | **Accept.** Band rows 273–708. |

## Session 3 · the far bank · 2026-09-05

Same conversation. The far shore's waterline as a thin strip, so the
canopy's own shoreline shows through and this plate adds only the
near-water fringe for parallax: riprap boulders, reeds, low shrubs, a
first strip of bank. Transparent above and below. One frame is mirrored
six times across the plate.

| # | File (once downloaded) | Prompt | Result |
| --- | --- | --- | --- |
| 7a | `scene-04/far-bank-august-v1.png` | "The far shore's waterline only … one thin horizontal strip running the full width … riprap boulders and rocks with reeds, grasses and low shrubs … a consistent height, roughly one eighth of the frame, centred … transparent above the reeds and below the waterline" | **Accept.** Rows 427–625, solid 508–623, 86 % transparent. Took about four minutes. |
| 7b | `scene-04/far-bank-october-v1.png` | Same strip, "reeds and grasses tan and rust, shrubs red-brown and thinning, fallen leaves among the rocks" | **Accept.** Rows 416–626. |
| 7c | `scene-04/far-bank-january-v1.png` | "Snow on the tops of the boulders, reeds dead and pale, dusted with snow, shrubs bare, a thin shelf of ice at the waterline" | **Accept.** Rows 387–650: the ice shelf reaches lower. |
| 7d | `scene-04/far-bank-april-v1.png` | "Snow gone, rocks dark and wet, last year's reeds flattened with green shoots, shrubs budding" | **Accept.** Rows 354–637. |

Shared crop rows 340–660 so all four align.

## Session 4 · the near bank's seasons · 2026-09-05

Same conversation. The August near bank (shot 4) attached as the
reference and re-seasoned three times; the manifest's near-bank now
keys all four seasons instead of one image for the year.

| # | File (once downloaded) | Prompt | Result |
| --- | --- | --- | --- |
| 8a | `scene-04/near-bank-october-v1.png` | Same grasses in place, "gone tan and straw-gold, seed heads dry, wildflowers finished, shrubs rust and thinning, fallen leaves in the grass" | **Accept.** Grass tips from row 184, ground solid. |
| 8b | `scene-04/near-bank-january-v1.png` | "Grasses dead, pale tan and bent over, heavy with snow; snow on the ground and caught in the shrubs, shrubs bare" | **Accept.** Tips from row 172. |
| 8c | `scene-04/near-bank-april-v1.png` | "Snow gone; last year's grasses flattened and matted with green shoots through them; shrubs budding; ground wet and dark" | **Accept.** Tips from row 195. |

Same crop as the August frame (rows 180–1024), so the four align.

## Session 5 · moodboards for a new direction · 2026-09-06

A fresh conversation, not the plate one, so nothing inherited the
photographic style: https://chatgpt.com/c/6a9dc61c-efe0-83e9-ab87-711f8fabf78a
Three boards, one per way into the brief (surreal, flat vector, maybe
isometric, invisible layers made visible, overabundant life), all on
the piece's palette so the winner drops into the design language.

| # | File (once downloaded) | Prompt | Result |
| --- | --- | --- | --- |
| M1 | `moodboards/m1-flat-vector-abundance.png` | Flat vector, paper cut-out layers, Risograph grain, thin luminous line work for wind, pollen, birdsong, roots, the analemma, a clock ring; 3×3 tiles | Dense, warm, storybook. Not flat: it read the brief as detailed illustration on blue skies, ignoring the near-black ground. The leaf-as-circuitry and the seasons-under-an-analemma tiles are the keepers. About two minutes; the UI showed "Something went wrong" but delivered. |
| M2 | `moodboards/m2-isometric-diorama.png` | Isometric low-poly diorama, six cutaway layers from sky to soil, contour lines and ticks as a living survey; 3×2 tiles | The strongest as a *system*: six blocks on the near-black ground, the sun's arcs in a glass sky, a wireframe water surface, roots as a network. Loses the eye-level bench view, which is the price of isometric. |
| M3 | `moodboards/m3-instruments.png` | Flat vector fused with data visualisation: thermal grass, birdsong spectrogram, seed radar, long-exposure sun band, particle pollen, vector water, ring of seasons; 3×3 tiles | The most on-theme for "science-grounded": each tile is the park through one instrument. Style drifted painterly again, but the thermal tile, the seed radar, the vector-arrow water and the ring-of-seasons tile are direct, buildable ideas. |

### Session 5b · the full-frame round

Board M3 chosen. Four of its tiles asked for again as single full-frame
scenes from the bench, same conversation so the style carried.

| # | File (once downloaded) | Instrument | Result |
| --- | --- | --- | --- |
| F1 | `moodboards/f1-thermal.png` | Thermal: near grass warm, water cool, isotherm lines, a dot scale at the edge | The look survives full frame. The bandshell became a generic A-frame, as it does whenever the plate conversation's reference is absent. |
| F2 | `moodboards/f2-spectrogram.png` | Birdsong as a spectrogram ribbon across the sky, fainter songs from the far trees | Reads clearly; the ribbon sits in the sky above the treeline, which is where the sound layer would live in the build. |
| F3 | `moodboards/f3-radar.png` | Seed radar: circular grid centred on the viewer, a sweeping arm, seeds as dots with trails | The strongest of the four: the sweep gives the frame a *now*, and the trails are the air particle system with an instrument over it. |
| F4 | `moodboards/f4-vector-water.png` | The lake as flow arrows and streamlines, brightest along the sun's path | Subtler than the others: concentric streamlines around the reeds and along the glitter path, the rest of the water left natural. Reads as a shader over the existing lake. |

Each took one to two minutes, a third of the plate edits.


## Session 6 · the plates, redrawn · 2026-09-06

The moodboard conversation again (not the plate one), so the plates
inherit the boards' style rather than the photographs': the illustrated
look of board M3 and the four full-frame tests. Every scene 04 plate
family regenerated, four seasons each, as transparent cutouts in the
same formats as sessions 1–4 so `scripts/plates.mjs` needs only new
crop rows. Attaching the August canopy photograph as a composition
reference was blocked by the browser tooling, so the real bandshell was
described in words (session 2's description) and held.

Style line used on every first shot of a family, then "same style":

> In the illustrated style of the four full-frame scenes above: dense
> stylised foliage built from clean clustered leaf shapes, gold rim light
> from a low late-August sun ahead and to the left, deep saturated
> blue-green in the shadows, warm gold in the light, clean crisp edges.
> Plain park only: no instruments, no line work, no grids, no arrows, no
> glow overlays, no people, no boats, no city skyline, no text.

Each fresh generation took 60–100 s. The one *edit* (9b) took over
three minutes and lost the alpha.

| # | File (once downloaded) | Prompt | Result |
| --- | --- | --- | --- |
| 9a | `scene-04/canopy-august-v5.png` | Style line + "the far treeline of Lake Harriet seen from across the water, mature elms and cottonwoods in full late-August leaf, one horizontal band filling the middle of the frame, bottom edge is the shoreline: riprap and a thin strip of bank" + the bandshell description from session 2 + "everything above the trees fully transparent alpha, no water" | **Accept.** Illustrated, gold-lit, the real bandshell with four pavilions, boardwalk and lamp posts, riprap along the foot, transparent sky. Trees fill the band's full height. |
| 10a | `scene-04/canopy-october-v4.png` | "Same image again, same trees, same bandshell … mid-October: canopy two-thirds full and turned amber, gold and rust, bare branches showing, leaves in the air, shrubs rust, sun lower" | **Accept.** Same layout, amber. |
| 10b | `scene-04/canopy-january-v4.png` | "… mid-January: elms completely bare, every branch drawn clean, dusting of snow on branches and roofs, shoreline snow-covered, flat pale light, grey-blue and warm brown" | **Accept.** Bare elms, snow on the pyramidal roof and pavilions. |
| 10c | `scene-04/canopy-april-v4.png` | "… late April: elms half-leafed in pale yellow-green, canopy translucent with branches through the new leaves, shrubs budding, snow gone, rocks wet" | **Accept.** |
| 11a | `scene-04/near-bank-august-v2.png` | Style line + "the NEAR bank, seen from behind at eye height, sun ahead-left backlighting: tall grasses, reeds and cattails, black-eyed susans, white asters, goldenrod; bottom third solid ground, mown grass and the edge of a paved path; transparent above the grass tips, no sky, no water, no trees, no bench" | **Accept.** Cattails and coneflowers rim-lit gold, path and mown grass solid below, clean alpha above. |
| 11b | `scene-04/near-bank-october-v2.png` | "… mid-October: grasses tan and straw-gold, seed heads dry, wildflowers finished and brown, cattails split, shrubs rust, fallen amber leaves in the grass and on the path" | **Accept.** |
| 11c | `scene-04/near-bank-january-v2.png` | "… mid-January: grasses dead, pale tan and bent, heavy with snow, cattails broken, snow on the ground and path with walked footprints, snow in the bare shrubs" | **Accept.** |
| 11d | — | "… late April: snow gone, last year's grasses flattened and pale with green shoots, cattails broken and grey, shrubs budding, ground wet, mown grass greening" | **Miss:** black-eyed susans in bloom in April. |
| 11e | — | Edit of 11d: "remove the yellow flowers and any other blooms, nothing is in flower yet in late April" | **Reject.** Flowers gone, but the edit painted a grey fog where the alpha was. Not downloaded. |
| 11f | `scene-04/near-bank-april-v3.png` | Fresh generation, not an edit, the April addendum with "nothing is in flower: no black-eyed susans, no blooms of any kind" in the prompt itself | **Accept.** Pale flattened grasses with green shoots, clean alpha. |
| 12a | `scene-04/far-bank-august-v2.png` | Style line + "the far shore's waterline only, one thin horizontal strip running the full width, centred, about one eighth of the frame tall: riprap boulders with reeds, grasses and low shrubs among and behind them; transparent above the reeds and below the waterline" | **Accept.** |
| 12b | `scene-04/far-bank-october-v2.png` | "… mid-October: reeds and grasses tan and rust, shrubs red-brown and thinning, fallen amber leaves among the rocks" | **Accept.** |
| 12c | `scene-04/far-bank-january-v2.png` | "… mid-January: snow on the tops of the boulders, reeds dead and pale, dusted with snow, shrubs bare, a thin shelf of ice along the waterline" | **Accept.** (The first send of this prompt never submitted; resent.) |
| 12d | `scene-04/far-bank-april-v2.png` | "… late April: snow and ice gone, rocks dark and wet, last year's reeds flattened with green shoots, shrubs budding" | **Accept.** |

### What session 6 decided

1. **The illustrated style survives the plate formats.** Cutouts with
   alpha come out as clean as the photographs did, and seasons hold
   their layout inside one conversation exactly as before.
2. **Describe, don't edit.** An edit of a transparent image lost its
   alpha (11e); a fresh generation with the correction written into the
   season line (11f) did not. Corrections go in the prompt, not the
   edit tool.
3. **The bandshell holds from words alone** when the session 2
   description is given in full, so the photographic reference is not
   needed for this conversation either.
4. **Palette follows the plates.** The generated plates carry more
   saturated blue-greens and golds than the photographs did; the
   manifest's four season palettes (sky, water, haze, sun) are re-graded
   against them once they are in the scene, the way ASSETS.md says
   colour is negotiated.

### Session 6b · wiring, and what the plates changed

Downloaded 2026-09-06 into `assets/raw/scene-04/` (the twelve accepted;
11d and 11e left in the conversation). Measured alpha bounds, 1536 × 1024:

| Family | Band (rows) | Crop in `plates.mjs` |
| --- | --- | --- |
| Canopy | 240–853 (April tallest, January's bare crowns to 257) | 232, 628 tall |
| Near bank | grass tips from 147–158, ground to the foot | 140, 884 tall; alpha forced opaque from crop row 440 down |
| Far bank | 408–667 (April's wet rocks lowest) | 355, 320 tall |

What wiring them decided:

1. **The drawn treeline is taller than the photographed one** — the band
   is 628 rows against 480 — so the canopy plate keeps the strip's own
   proportions rather than its old size: 150 × 32.3 world units instead of
   171 × 28, and 0.7 lower so December's sun clears the crowns. 150 clears
   a 2:1 frame at the top of the rise; wider screens see the strip's ends.
2. **Neither flank can be a mirror.** The pavilions stand near the panel's
   left edge and the bandshell reaches to within ~145 columns of its
   right, so mirroring either edge put a second bandshell on the shore.
   Both flanks now tile the tree-only right slice out and back, the left
   one cross-faded under the panel's first 110 columns. Visible as
   repeating crowns at the strip's ends; the fix is a trees-only
   extension panel per season (13a–d, below).
3. **The near bank's lawn was not quite solid**: about 7 % of its ground
   pixels came out between half and full alpha, enough to let the lake
   show through once the camera looks down. `plates.mjs` forces the
   ground opaque; no pixel there was ever fully clear.
4. **The palettes followed the plates.** Late summer's sky went from
   `5a92bd→d8c9a8` to `1d6cae→9dbfd0` and its water from `35566a` to
   `1f4f6e`, sampled from the boards (`f4` sky top `#186eaf`, water
   `#0e4767`–`#235772`); autumn and spring deepened the same way; winter
   already agreed. The canopy and bank colours now tint only the
   procedural stand-ins.
5. **Budget:** 4.9 MB of WebP for the twelve plates, the winter canopy
   at 693 KB the largest; the spring canopy needed a fourth quality
   step (q54) to fit. The bare-branch seasons still cost the most.

### Session 6c · the treeline's ends

Same conversation. Trees-only continuations of the treeline, one per
season, to replace the tiled flanks. Downloaded and filed the same day.

| # | File (once downloaded) | Prompt | Result |
| --- | --- | --- | --- |
| 13a | `scene-04/canopy-ext-august-v1.png` | "The same Lake Harriet treeline continuing further along the shore, away from the bandshell. Trees only … riprap, low shrubs and a strip of bank along the bottom edge, two lamp posts on the shore path. No bandshell, no pavilions, no buildings" | **Accept** on screen: trees only, band height and shoreline match. |
| 13b | `scene-04/canopy-ext-october-v1.png` | Same continuation, session 6's October addendum | **Accept** on screen. |
| 13c | `scene-04/canopy-ext-january-v1.png` | Same continuation, the January addendum | **Accept** on screen. |
| 13d | `scene-04/canopy-ext-april-v1.png` | Same continuation, the April addendum | **Accept** on screen. |

`scripts/plates.mjs` looks for each `ext` file beside its panel and uses
it for both flanks when it is there (its right end under the panel's left
edge; flipped, its left end under the right), tiling the panel's own
tree slice until then and saying so in its output.

As session 1's shot 3 warned, the continuations drifted: each came out
larger than its master and with its shoreline lower.

| Season | Master band (rows) | Extension band | Scale applied |
| --- | --- | --- | --- |
| August | 283–841 | 236–847 | ×0.913 |
| October | 277–845 | 192–859 | ×0.852 |
| January | 257–846 | 184–889 | ×0.835 |
| April | 240–846 | 175–865 | ×0.878 |

So the recipe measures both (first row with anything in it, last row of
solid ground), resizes the extension uniformly until its band is the
master's height, shifts it so the shorelines share a row, then applies
the master's crop. The four strips came out with one bandshell each and
a continuous treeline to both ends; the canopy plates sit at 593–699 KB.

A note for the file loop: the download batch was renamed by
modification time and one rename overwrote another, losing August;
re-downloaded. Rename one file at a time, checking each.

## Session 7 · scene 08: the corridor and the fragments · 2026-09-06

The moodboard conversation again, so the corridor inherits the park's
style. Because the camera walks down the corridor, it is not one picture
but three surfaces the scene tiles along its length, each generated flat
and front-on; and the fragments are cutouts, nine to a sheet.

Family line, given once: "Same illustrated style as the park plates
above (clean clustered shapes, crisp edges, painted light) but muted,
institutional: a long fluorescent-lit corridor. Pale grey-green walls, a
darker green dado band at waist height, a dark skirting board,
wood-veneer doors with brushed-steel handles and a small wired-glass
window, speckled terrazzo floor, acoustic-tile ceiling with recessed
fluorescent panels."

| # | File (once downloaded) | Prompt | Result |
| --- | --- | --- | --- |
| 14a | `scene-08/corridor-wall-v1.png` | "ONE BAY of the corridor's wall seen exactly front-on, flat and orthographic, 4 m wide by 3 m tall: a single closed door centred, the dado band and skirting the full width, a narrow strip of ceiling tile along the top edge. Even fluorescent light, no vignette." Landscape 4:3. | **Accept.** Front-on, door centred, dado and skirting; a strip of ceiling with two lamps at the top and a strip of terrazzo at the foot, both to crop. |
| 14b | `scene-08/corridor-ceiling-v1.png` | "ONE BAY of the ceiling seen from directly below, flat, 4 m by 2.6 m: a grid of acoustic tiles with T-bar joins and exactly one recessed fluorescent panel, 1.2 m by 0.3 m, glowing evenly white, centred." Landscape 3:2. | **Accept.** |
| 14c | `scene-08/corridor-floor-v1.png` | "ONE BAY of the floor seen from directly above, flat, 4 m by 2.6 m: large square speckled terrazzo tiles, thin grout lines, matte, evenly lit, no reflections." Landscape 3:2. | **Accept.** |
| 15a | `scene-08/fragments-a-v1.png` | "NINE separate small illustrations in a neat 3 by 3 grid with clear gaps, each a cutout with no background, frame or shadow, on a fully transparent background, muted warm colours: a hand on an open page; a cup of coffee with steam; a window with rain; a face turned away; a shoe on a step; a pencil mid-line; a phone face down; a leaf on a desk; a clock face with no hands." Square. | **Accept.** All nine, clean, in order. |
| 15b | `scene-08/fragments-b-v1.png` | Same form: "two hands around a warm mug; an open doorway with light; a ring of keys; a small bird on a windowsill; a wristwatch, strap undone; a folded note; reading glasses on a closed book; a potted plant on a sill; a torn ticket stub." | **Accept.** All nine, clean, in order. |

Each took 60–100 s. `scripts/plates.mjs` crops the wall bay to the wall
alone, encodes the three surfaces as they are (the scene mirrors them at
every join), and slices each sheet by its 3 × 3 cells, trims each cell to
its alpha, and packs the eighteen into one 6 × 3 atlas the manifest
addresses by index.

### Session 7b · wiring

Downloaded 2026-09-06 into `assets/raw/scene-08/`, one at a time and
checked before naming (the lesson of session 6c). Sizes: the wall bay
1448 × 1086 (4:3), the ceiling and floor 1536 × 1024, the sheets
1254 × 1254 with true alpha.

- The wall bay carries a strip of ceiling to row 55 and of floor from
  row 922; the crop is the 867 rows between. Its wall region is wider
  than the 4 × 3 m bay asked for, so the corridor's declared height went
  from 3 m to 2.7 m: mapped to 3 m the door came out at 2.6 m tall,
  mapped to 2.7 m it is a door.
- The scene's own lighting (the pooling under each lamp, the floor's
  reflection, the fog) sits over the plates unchanged; the ceiling bay's
  painted panel lands where the shader's lamp was.
- The eighteen cutouts trimmed cleanly by cell; the atlas is 3072 × 1536
  at 556 KB. The four plates together are 1.1 MB.

## Session 8 · scene 09: the sixty squares · 2026-09-08

The moodboard conversation. The days of the two months, generated nine
to a sheet in a 3 × 3 grid with thin gaps (no alpha: the squares fill
the panes), sliced by thirds and packed into one atlas per month by
`scripts/plates.mjs`. The same-day month is one sheet of nine that the
thirty days reuse in turn, which for a month of the same day is the
point; the vivid month is four sheets following its readings in order,
thirty days and six spares.

The account showed "Capabilities reduced until 4:05 PM" throughout. The
image tool failed outright twice (16b and 16c, "the image generator hit
an error") and succeeded each time on its own *Try again*; each
generation took 100–170 s, up from 60–100. The first two sheets came out
nearer to photographs than to the park's illustration; from 16b on the
style returned.

| # | File (once downloaded) | Prompt | Result |
| --- | --- | --- | --- |
| 15 | `scene-09/days-same-v1.png` | "A neat 3 by 3 grid of NINE square pictures with thin white gaps … All nine the SAME DAY at the same desk: a desk by a window, a mug, a closed laptop, a lamp, 4:17, the same flat afternoon light. Vary almost nothing: the mug an inch to the left, the blind a little lower, the chair pushed in, a pen moved. Hard to tell apart." | **Accept.** Nine desks, hard to tell apart. |
| 16a | `scene-09/days-vivid-a-v1.png` | Same form; days 1–9 of the vivid month as scenes: a new city at dawn, a train window, a name learned at a cafe table, a wrong turn onto a river, rain all day from inside, a first swim, hard news on a phone, a long walk on a ridge, a borrowed kitchen | **Accept.** All nine, in order. |
| 16b | `scene-09/days-vivid-b-v1.png` | Days 10–18: fog with a lamp post, an argument on a bench, a market, a first try on a bicycle, hail on a car roof, an old friend laughing, lost keys under a sofa, high wind on a bridge, a letter at 4:17 | Failed twice; **Accept** on the retry. |
| 16c | `scene-09/days-vivid-c-v1.png` | Days 19–27: a night bus, a stray dog, heat on a shuttered street, the wrong train, someone singing on a stairwell, thunder over rooftops, a door held open, a new word on a hand, a flood warning | Failed once; **Accept** on the retry. |
| 16d | `scene-09/days-vivid-d-v1.png` | Days 28–30 and six spares: a long dinner, snow on blossom, home at the desk again; a ferry deck, a power cut, a bicycle in grass, a rooftop storm, an empty pool, a hand on a train door | **Accept.** Took just over four minutes. |

### Session 8b · wiring

Downloaded 2026-09-08 into `assets/raw/scene-09/`, one at a time and
checked before naming. All five are 1254 × 1254 without alpha. Two
things the loop taught: the conversation held the last sheet three
times over (its preview copies), and a share control found by walking
up from an image can belong to the next image down — the dialog's own
title is what to check before downloading.

`scripts/plates.mjs` cuts each sheet by thirds, insets 4.5 % past the
gaps (3.5 % left a hairline of white at one row's edge), fits each cell
to a 384 px tile and packs one atlas per month: nine desks, 6 × 2, at
126 KB, and thirty days, 6 × 5, at 581 KB. The panes draw the day's
square above their readings, through the glass; the same month reuses
its nine in turn. One correction on wiring: the atlas is packed
top-down and the texture reads bottom-up, so the first draw put day 26's
picture under day 2's reading until the row was flipped.

### Session 8c · the same day, redrawn

The first same-day sheet (15) read as a photograph beside the painted
vivid days. Re-run once with the style spelled out.

| # | File (once downloaded) | Prompt | Result |
| --- | --- | --- | --- |
| 15b | `scene-09/days-same-v2.png` | Session 8's same-day prompt, with "must be in the illustrated style of the park plates and the last three vivid sheets: clean clustered shapes, crisp edges, painted light, visible brushwork, muted colours, not photographic", and a plant added to the desk | **Accept.** Painted, nine near-identical desks. About two and a half minutes. |

Downloaded and filed 2026-09-08; `scripts/plates.mjs` now packs the desk
atlas from 15b. The first sheet stays in `assets/raw/` for the record.

## Session 9 · the bench · 2026-09-08

The moodboard conversation. One cutout, the last thing ASSETS.md's
scene 04 shot list still wanted: the piece's anchor, and the object the
return in scene 10 lands on.

| # | File (once downloaded) | Prompt | Result |
| --- | --- | --- | --- |
| 17 | `scene-04/bench-v1.png` | Style line + "an EMPTY park bench, three-quarter from behind and slightly left, facing away toward the water: weathered wooden slats, dark cast-iron ends … backlit at 4:17, far edges rim-lit warm, near faces in cool shadow. Include a small patch of the ground it stands on, mown grass with a few taller tufts at its feet, fading out at the edges so the bench plants itself. Nobody sitting on it, no text." Landscape 3:2, transparent. | **Accept**, first try, about two minutes. Cast-iron ends, weathered slats, its own grass patch. |

Trimmed to its alpha by a new `cutout` recipe in `scripts/plates.mjs`:
1462 × 738 at 276 KB.

### What placing it decided

1. **A plate can be one object, not a band.** Every plate before it ran
   the width of the frame and was centred; the bench needed an `x`.
2. **A visible base floats, wherever it is put.** First placed eight
   units ahead at ground level, the bench sat with its grass patch at
   the waterline and read as pasted on. Placed behind the reeds instead,
   so they could stand in front of its feet, it landed on the far shore:
   the scene has no mid-ground, and past the reed tops everything is
   lake. The only depth a foreground object can honestly hold is the
   near foreground with its feet below the frame — the way a photograph
   crops the seat you are standing behind — so it stands five units from
   the eye, left of centre, its base and its patch of grass out of frame,
   the reeds beside and beyond it.
3. **It belongs to the park, not to a scene.** Declared once in the
   year's world, it is there in every scene that holds the opening
   second — the second itself, the ten minutes, the day, the descent,
   the return — and the fall in scene 06 lands back at it. The camera
   rises off it through the year; the lifetime is far above it.
4. **An August cutout cannot sit through a winter.** In January it was a
   brown bench on green summer grass under snow. A plate can now declare
   the window of the year it is `present` for, and the bench's is
   August: it goes as the seasons start to turn, at the same local 0.12
   the record's own hold ends. Four seasons of bench would let it stay
   all year, and is the better answer when there is a reason to spend
   three more generations on it.


## Session 10 · the park, through the API · 2026-09-08

A new direction for the park, from one reference: a pointillist Lake
Harriet, alive with people, saved as `assets/raw/park/reference.png`.
Not a restyle of the old plates but a new composition — the viewer on
a blanket on the lawn among people, under the elms, the lake and the
bandshell beyond — built as layers, each generated on flat white and
keyed by the pipeline.

Generated by `scripts/generate.mjs` (the image model's edit endpoint,
the reference attached to every prompt, prompts in
`scripts/park-layers.mjs`), four at a time, about 45 s each, after the
first two were made by hand in ChatGPT with the reference pasted in.

| # | File | Layer | Result |
| --- | --- | --- | --- |
| 1 | `scene-04/park/far-shore-v1.png` | The treeline and the bandshell with its crowd, one strip | **Accept** (by hand). Keeps the canopy's id: the elms of the lifetime. |
| 2 | `scene-04/park/shoreline-v1.png` | Sea wall, path, shrubs | Reject: drawn in perspective, the path receding right; a strip on a plane must be flat. |
| 3 | `scene-04/park/shoreline-v2.png` | The same, drawn straight on | **Accept.** Wall face and shrubs behind it; the path is implied by the lawn. Tiled twelve times along the water's edge. |
| 4 | `scene-04/park/lawn-v1.png` | Grass from above, tileable | **Accept.** Mirrored across a ground plane, the first plate that lies flat. |
| 5 | `scene-04/park/trees-v1.png` | Two trunks at the edges, canopy across the top | **Accept.** A card just ahead of the seat; placed twice — first it swallowed the frame, then raised so only the canopy's fringe hangs in. |
| 6 | `scene-04/park/foreground-v1.png` | The reader, the couple, the man and his dog, from behind | **Accept.** One cutout; first placed too close and too large, then four units off. |
| 7 | `scene-04/park/sitters-v1.png` | Nine sitting groups, 3 × 3 | **Accept.** Eleven placements from nine cells. |
| 8 | `scene-04/park/movers-v1.png` | Walkers facing right | **Accept** as six on a 3 × 2 sheet, not the nine asked for: jogger, woman, man, cyclist, a family, a stroller. The dog on a lead and the running child are still to make. |
| 9 | `scene-04/park/boats-v1.png` | Nine sailboats, 3 × 3 | **Accept.** Six placed, drifting. |

### What the pipeline learned

1. **Key the paper by flooding, not by colour.** A layer on white has
   white inside it too — sails, shirts, the sky between leaves. The key
   floods from the image borders through near-white and removes only
   what it reaches; the edge is feathered a pixel and its colour unmixed
   from the white beneath, so no halo. `keyWhite` in `scripts/plates.mjs`.
2. **Stand a sheet's figures on a baseline.** The fragments recipe
   centred each cutout in its tile; a sheet of people needs their feet
   at the tile's foot so a placement's `baseY` means the ground.
   `align: 'bottom'`.
3. **A plate can lie flat.** `Plate.ground` is the lawn: a plane from
   the wall back past the seat, the tile mirrored both ways.
4. **Figures are a declaration, not plates.** `Scene.figures`: sheets
   of cutouts with placements, sizes, walkers with speeds in the
   world's real time, and a `present` window like a plate's. The held
   second names its life: `hold.life: ['jogger']`.
5. **What is only real from the seat fades as the camera leaves it.**
   The framing card and the people are flat from above; they go as the
   eye rises past six units and are back by the time the fall lands.
6. **The lake had to open out.** From a seated eye the water was a
   band; the far shore went from 46 to 90 units back, doubled in size
   to keep its place in the frame, and the water runs from it to the
   wall. The roots grow under it now.

Retired: the illustrated canopy, banks and bench (sessions 6 and 9)
are out of `public/plates` and out of the recipes; their raws stay.

### 10b · the other three seasons

Twelve edits, `node scripts/generate.mjs --seasons`: each late-summer
layer sent as the first image with the style reference second, and a
season's description of what changes. About 45 s each, four at a time.

| Layer | Autumn | Winter | Spring |
| --- | --- | --- | --- |
| `far-shore` | v1 accept | v1 accept: a snowfield below the treeline, keyed away with the paper | v1 accept |
| `shoreline` | v1 reject (trees grew above the wall); v2 accept | v1 reject (same); v2 accept | v1 reject (same); v2 accept, saplings |
| `lawn` | v1 reject (a canopy from above, not the ground); v2 accept, leaf litter | v1 reject (same); v2 accept, snow with footprints | v1 reject (same); v2 kept: bare-branch shadows on new grass |
| `trees` | v1 accept | v1 accept | v1 accept |

What the second round fixed in the prompts: "keep the shrubs exactly
the same height — no trees, nothing taller" and "the ground only, seen
from directly above — no trees, no branches, no trunks". An edit
inherits the reference's dappled shadow as trees unless told not to.

What the pipeline learned: every season of a strip is cut to the same
rows (`PARK.band` in `plates.mjs`), whatever the season put above or
below them, so the plate keeps one height and the cross-fades hold;
the framing card keeps its whole canvas for the same reason. The
framing trees now stay all year, in their season.

The two missing walkers came on a second sheet (`movers-b-v1.png`):
asked for nine, it drew nine but cut the bottom row off at the frame,
so its top two rows — the dog on a lead with its owner, the running
child, a woman jogging, a skateboarder, an older woman with a small
dog, a young man walking his bicycle — are cut on the first sheet's
grid into one atlas of twelve (`keep` in the recipe takes a fraction of
a raw's height). Nothing in this style is still to make for the park.

### 10c · the sky and the water

The season keyframes' sky, water, haze and cloud colours regraded to
the reference by eye — a pointillist surface averages to grey, so a
sampled mean is no guide; the perceived colour is the dots' — and the
sky and water shaders given a screen-space stipple, four pixels a dot,
each dot the surface's colour pushed lighter, darker, cooler or warmer.
The instruments (glitter, thermal, flow) draw over the dots and stay
crisp. Winter's water is ice.

### 10d · the crowd through the year — the plan

The lawn was too full and too much the same: eleven placements from
nine cells, two of them the foreground's own couple and reader again.
Now two sheets of nine cut into one atlas of eighteen, each group
placed at most once, ten in all, spaced; the second sheet is
Minneapolis without a logo in it — a Somali family, an older
Scandinavian-looking couple with a thermos, a Hmong grandmother with
grandchildren, a paddle, a growler, purple and gold and navy and red,
forest green plaid.

How the crowd turns with the year, as windows of the year's progress
(the seasons peak at 0.32, 0.54, 0.78; late summer holds 0–0.12 and
returns at 1). A plate or a sheet may now declare several windows.

| Who | Window | Where | Sheets (prompts in `park-layers.mjs`, `--crowd`) |
| --- | --- | --- | --- |
| The summer crowd, the blanket, the sails | 0–0.12 and 0.93–1 | lawn, path, lake | done: `sitters`, `sitters-b`, `movers`, `movers-b`, `boats`, `foreground` |
| Autumn's few | 0.2–0.42 | lawn (4 groups), path (6 walkers) | `sitters-autumn`, `movers-autumn` |
| Winter's | 0.46–0.64 | the ice: house, fisherman, rink, bonfire; skaters and a skier on the lake, a parka walker on the path, a sled on the lawn | `ice-winter` (still), `movers-winter` |
| Spring's first | 0.68–0.88 | lawn (3–4 groups, geese), path (5 walkers) | `sitters-spring`, `movers-spring` |

Skaters walk a span on the lake (`walk` with negative z); the still
winter things are a sheet with no speeds. Sails have no winter window.
Generated the same day, all six on the first try (`--crowd`, about a
minute each, four at a time), cut and placed with the windows above:
six autumn sitters and eight on the path, one of them raking and not
moving; eight winter stills — the house and the fisherman and the
bonfire and the net on the ice, a snowman and a sled on the lawn — and
nine winter movers, five of them crossing the ice; seven spring sitters
with the goslings and nine on the path with the geese walking. Every
figure now faces the camera, feet where it stands, so the year's high
view reads them as people seen from above rather than cards on the
ground; the seat's own cards (the elms, the foreground) still fade as
the eye rises. The lifetime (scene 05, held at 1) sees the summer
crowd's return window, which is where people as appearances begins.

The winter stills' snow-ground patches (a paler box under the house
and the sled) went with `ice-winter` v2, generated under the crowd
prompts' "nothing beneath anyone" rule, which the first sheet predated.

### 10e · polish

What made the park look thrown together, and what fixed it:

1. **Every figure floated.** No contact shadow, and each sitter sat on
   its own drawn patch of grass that matched nothing. Now every cutout
   has a soft dark ellipse at its feet, offset to the right and toward
   the seat as the afternoon light would have it, softening at night
   and on snow; and all four sitter sheets were regenerated with
   "nothing drawn beneath anyone" (`sitters` v2, `sitters-b` v2,
   `sitters-autumn` v2, `sitters-spring` v2).
2. **A neighbour's feet in the tile.** In a raw sheet the older couple's
   chair legs overflow their cell into the one below, so the
   grandmother's tile carried their feet and the seat showed a row of
   legs at the water's edge. The fragments recipe now clears, within
   each cell, any small blob touching the cell's top or bottom edge
   (`ownBlobs`), and keeps a group's own separate things.
3. **The shore was a hedge.** The shoreline's shrubs, tiled twelve
   times, read as a wall of bushes. `shoreline` v3 is a low stone wall
   with a few tufts and open path. Every seasonal edit of it grew trees
   again, so the one wall serves all four seasons; a stone wall does.
4. **The canopy was a lid.** `trees` v2 is an airy, open canopy with
   white showing through and slimmer trunks, in all four seasons.
5. **The lawn was one flat green.** Its shader now darkens and cools the
   grass under the elms with a dapple and brightens it toward the
   water, the shade lifting as the eye rises past the canopy.
6. **The lake was a band.** A fine glitter across it where the wind
   roughens it, and a lighter cobalt.
7. **The thermal bleached and then muddied.** Over pale plates the
   reading's luminance shading took a plate past white; it is now
   capped at the ramp's own brightness. The held second's thermal is
   at 0.3 (was 0.55), the year's at 0.55 (was full), so a reading
   leaves the afternoon its colour.
8. **The cache, for the last time.** Every plate URL now carries the
   build's id (`plateUrl` in `scenes/loading.ts`), so a plate recut
   under the same name is never read as the one before.

Spring's lawn tile went to v3 (no shadows drawn on it) on the way.

### 10f · proportion and slivers

Two faults the seat still showed at full size, both the atlas's doing.
A cutout was scaled to fill its own tile, so a wide couple's people
came out smaller than a lone seated woman's; a sheet is now cut at one
scale — the largest cutout fills a tile, the rest keep the proportions
they were drawn at — and `size` is the world size of a tile, one per
sheet, with no placement having a size of its own. And a quad sampled
its texture rectangle to the tile's very edge, where a texel is half
the neighbour's, which showed as a sliver of a neighbour down a quad's
side; the rectangle is now pulled three percent inside the tile.

Overflow from the side too: the red shirt of the group in the cell to
the lying man's left ran sideways into his cell and rode along as a
needle down his tile's edge. `ownBlobs` now clears small blobs touching
any edge of a cell, not only the top and bottom.

### 10g · life

Nobody is a statue. Each sheet declares its `life` in the manifest:
sitters breathe (the cutout rises and falls a little over a few
seconds, on its own phase) and sway by half a degree over ten; walkers
bob with a stride whose cadence follows their pace and lean into it,
more at a run, the shadow pooling smaller under a foot that has left
the ground; placements that ride — bikes, skates, a skateboard —
wobble instead; sails heel. Real time, stilled under reduced motion.

### 10h · the other stride

The image model cannot draw a walk cycle, but it can redraw a whole
sheet with every figure in the opposite phase of its stride, because it
sees all nine at once: `movers-stride-v1.png` and `movers-b-stride-v1.png`,
one edit each, near-perfect. Cut into the walkers' atlas as a second
twelve cells (`frames: 2` on the atlas; a figure's second frame is its
cell plus twelve) and swapped with each step, in time with the bob, so
the feet land as the body dips; a rider's wheels turn on their own
count. Two frames and a bob read as hand-drawn animation, and the dots
changing between frames is the boil.

### 10i · the leaves move

The canopy overhead and the far treeline sway at their tops: a slow
two-frequency wave in the vertex shader over cards subdivided for it,
weighted to the upper half so the trunks and the foot of the shore hold
still — five centimetres on the card at the seat, a third of a unit on
the shore ninety units back. Stilled under reduced motion. With the
sitters breathing, the walkers striding and the sails heeling, nothing
in the seat is a still image any more except the wall.

The seasons' walkers got their other stride the same way, one edit per
sheet (`movers-autumn-stride`, `movers-winter-stride`,
`movers-spring-stride`), all three consistent on the first try — the
skaters' gliding leg swapped, the sled and the dogs likewise — cut in
as the second nine cells of each atlas.

### 10j · the stride, softened

Judged in motion it was rough: the two frames cut hard from one to
the other twice a second, a flip-book at 2 fps; the bob was a
rectified sine with a cusp at every footfall, so figures hopped; the
canopy sway was too fast and, at the seat, too large. Now each walker
is two quads on the same spot, the first frame and the other,
crossfaded with a raised cosine so a step is a dissolve rather than a
cut; the bob is a smooth arc, lowest as a foot lands, at half the
height; the recipe scales each second frame to its first's height so
nothing pops in size; a rider's wheels dissolve on a slower count; the
sway is half as large and half as fast. Still a judgement for a pair
of eyes in a real browser.


## Session 11 · the corridor in dots · 2026-09-08

Scene 08's corridor and fragments in the park's pointillist style,
through the generator (`--corridor`, prompts in `park-layers.mjs`,
landing under `assets/raw/scene-08`). Tiles use a preamble of their
own: a flat orthographic tile filling the frame, its left edge
continuing into its right, since the corridor tiles each surface
mirrored.

| # | File | What | Result |
| --- | --- | --- | --- |
| 1 | `corridor-wall-v2.png` | One bay, front-on: oak door with wired glass and a number plate, cream over sage with a dado, dark skirting | **Accept.** Drawn without the ceiling and floor strips the illustrated wall carried, so the recipe crops nothing. |
| 2 | `corridor-ceiling-v2.png` | Acoustic tiles, one lamp | Reject: cork-brown tiles. |
| 3 | `corridor-ceiling-v3.png` | The same, "pale off-white, nothing brown" | **Accept.** |
| 4 | `corridor-floor-v2.png` | Terrazzo from above | **Accept.** |
| 5 | `fragments-a-v2.png` | The first nine fragments | Reject: six sat on cream cell backgrounds the key would not lift. |
| 6 | `fragments-a-v3.png` | The same, "no background of any kind in any cell" | **Accept.** |
| 7 | `fragments-b-v2.png` | The second nine | **Accept** first time. |

The fragments are keyed now (they were drawn on white, not with
alpha) and cut at one scale like the park's sheets. Both clocks of the
corridor and the remembered half hung with fragments were looked at.


## Session 12 · the memory sheets in dots · 2026-09-08

Scene 09's five sheets in the park's pointillist style through the
generator (`--memory`, landing under `assets/raw/scene-09`), with a
preamble of their own: a 3 by 3 grid of nine square pictures filling
their cells, which the squares recipe cuts by thirds.

| # | File | What | Result |
| --- | --- | --- | --- |
| 1 | `days-same-v3.png` | Nine near-identical desks at 4:17, a plant added | **Accept.** No white gaps drawn between the cells; the inset cut does not need them. |
| 2–5 | `days-vivid-a-v2.png` … `days-vivid-d-v2.png` | The thirty vivid days, sessions 8's subjects | **Accept**, all four first time, in order. |

Thirty dotted squares compress badly: the vivid atlas fell to the
quality ladder's foot and was still over the 700 KB budget, so a plate
may now declare its own `budgetKb`; the vivid month's is 1100 and it
weighs 995 KB at q62. It loads after the opening frame, so the first
frame pays nothing for it. With this every plate in the piece is in
one style.


## Session 13 · people as appearances · 2026-09-08

No imagery: choreography. While the lifetime holds the year at its
close, the summer crowd is not there and then there and then gone. A
holder may declare `appearances` — how often a figure shows, for how
long, how long its trace lasts, and how much rarer it is by the end of
the span — and each figure keeps its own count: a snap in, a third of
a second there, a fading trace; walkers and sails at a different point
of their span each time rather than travelling; no shadows, since an
appearance casts none; every second or so a different two to ten of
the twenty-eight, thinning to two or three by the eightieth year.
Under reduced motion they stand faint and still.

Found on the way: a window is fully gone at its own end, so the
crowd's return window at the year's close (0.93–1) gave them no
presence at exactly 1, where the lifetime holds; it runs to 1.06 now.

### 13b · the equinox's NaN

The NaN attributes the pane logged from the survey's equinox callout
were the camera's: a window passing through zero height — a pane
hiding — made the aspect NaN for a frame, the callout laid itself out
through that camera, and since a callout is laid out only while it is
on, the NaN stayed in the DOM. A real window never has zero height; the
resize now ignores a zero-size window, and a walk through the
equinox's windows leaves no NaN anywhere in the overlay.

### 13c · after the critique

Three changes from a critique of the seat. Every text in the world now
has one rule: the HUD's label, hint and clock and the caption carry
the survey's halo of the ground behind them, so the one instruction
the piece gives survives a bright frame. The held second's thermal
comes at seven seconds, after the blink, so the visitor arrives in
colour. The seated eye is at 2.5, looking a little further down, so the
lake takes a fifth of the frame instead of a seventh, the framing card
raised half a unit to keep only the canopy's fringe in view; and the
lying man went back to the wall, small, so the bandshell keeps the
centre of the frame to itself.

### 13d · the walk, withdrawn

Judged in motion twice, the walkers' gait looked bad both ways: cut
hard between two frames it was a flip-book; crossfaded it ghosted; and
either way the feet slid against the ground, which no bob or lean can
hide, because two drawings are not a walk. Withdrawn. Walkers and
riders glide as the cutouts they are — no frame swap, no bob, no lean,
a quarter-degree sway, a steady shadow — which is what a Seurat's
figures do. The stride frames stay in the atlases behind `life.gait`,
off. The way to a real walk is a drawn cycle of six or more frames per
figure, which the image model does not produce consistently; a
stop-motion step, the figure advancing a stride's length as it swaps
pose and standing between, is the one untried alternative.

### 13e · the stop-motion step

Tried. With `life.gait` on, a walker advances one stride's length in
the instant it swaps pose — the move eased over the first sixth of a
step — and stands planted for the rest, so a foot never slides while
it is down: a paper puppet's walk, at the figure's real cadence and
pace (stride = pace / cadence, so the jogger covers his metre in a
tenth of a second and stands for a third). Wheels, skates and skis
glide as before. The trace of the jogger reads swap-and-advance,
hold, swap-and-advance, hold. Whether it looks deliberate or broken is
for a pair of eyes; it is one switch per sheet either way.

### 13f · polish pass

Systematic, over the DOM layer and the park. Found and fixed: the
spoken lines were never in Newsreader — no face was loaded, so every
caption fell back to the HUD's sans; Newsreader italic is loaded now
(Google Fonts, serif fallback, swap) and is the captions' face and no
other's, at a size and leading suited to it. The hint dropped to 11 px
on a phone; the HUD's smallest text is 12.5 px now. Without WebGL the
piece was black; it now says so in its own voice, and says so again if
the context is lost. Checked and clean: no logging, no type escapes,
no dead markers; reduced motion honoured by every motion added today;
no interactive elements, so no focus states owed; the caption's live
region and the canvas's aria-hidden in place.

Not done, noted: `public/og.png`, the share card, still shows the
illustrated park — a screenshot of the new seat at 1200 × 630 replaces
it. The plates total ten megabytes, of which the opening frame needs
about 1.7; the rest loads behind it.

### 13g · arrival, and the invitation

The one interaction is scroll as time, and its feedback was already
shaped: captions and labels ease, the blink is a curve, the interface
leaves by scroll. Two things were not. The piece arrived as a cut, the
park fully formed the instant it loaded; now the world comes up out of
the ground over 1.6 s once the opening frame's imagery is in and its
first frame is drawn, and the interface follows 0.7 s later, the
transitions coming off once settled so the interface follows the
scroll without lag. And the hint, the one invitation the piece makes,
sat still until it was taken; it breathes now, over four and a half
seconds, and dissolves when the scroll begins. Both stilled under
reduced motion. The arrival was seen to fire in the pane: the classes
land after the first drawn frame.

## Session 14 · the edge, unmixed · 2026-09-09

### 14a · the white key's halo

A second critique named a pale matte edge on the people and the
foliage, worst against water and night. Measured on the keyed sheets:
the outermost ring of opaque pixels on every cutout was about forty
points brighter and half as saturated as the ring inside it — the
drawing's own anti-aliasing against the paper, kept at full alpha. The
old key feathered a pixel *outward* into the paper and unmixed only
that ring, so the contaminated ring stood inside a soft one.

`keyWhite` in `scripts/plates.mjs` now finds the paper as before
(flooded from the borders), measures its colour, and treats every
drawn pixel touching it as a blend: its coverage is read from where it
sits between the paper and the mean of the non-edge drawn pixels
beside it, on the channel with the most room; its colour is unmixed
from the paper and leaned toward the colour behind it as it thins;
the paper itself is left clear. A stroke a pixel wide, with nothing
behind it to read, is kept as drawn. The silhouette chokes in by about
a pixel. After: the edge ring's luminance and saturation match the
interior on the sitters, the walkers, the elms and the foreground
group. Every keyed plate regenerated (`npm run plates`); the corridor
and the sixty squares, which are not keyed, came out byte-identical.

Same session, scene 01: the hint now waits on the manifest
(`hint: { after: 8.5 }`), arriving as the first reading settles rather
than with the interface, and the opening second is counted from
arrival rather than the script's first frame — in development the
imagery took six seconds to land, and the blink had been firing in
the dark.

### 14b · the two clocks, quieter, and stacked

The absorbed clock's lived half carried a thermal pass, seven hundred
motes and seven survey readings; the critique's point was that the
viewer was made to read at the moment they should be feeling the
contrast. The manifest now declares the motes and three readings —
LAMP, HUM, AIR: one for the eye, one for the ear, one for the skin —
and no thermal, so the corridor keeps its own colour against the
waiting clock's. The layers' code is untouched; a thermal can be
declared again in a line.

And the frame's proportion now decides the composition
(`views()` in `scene-08-two-clocks.ts`): wider than tall, the two
clocks stand side by side as before; taller than wide, the waiting
clock is on top and the absorbed one below, each the full width and
half the height, the dial sized to its view and the survey placed in
its own. Seen at 1280 × 720 and 375 × 812 in both states: the stub
over the fragments on a phone is the argument in one glance.

### 14c · the runway's proportion

The first seven scenes took 1340 of 1920 vh, so the two clocks began
at seven tenths. Lengths only, order kept: 100, 110, 110, 320, 150,
120, 120 for the setup (1030), then 240 for the two clocks — now the
longest scene — and 200 and 180 as before. Total 1650; the two clocks
begin at 62 %. Getting under a half would mean moving the lifetime or
the descent after the corridor, which is a change to the concept and
was not made.

### 14d · the described scene

The canvas and the figure are hidden from assistive technology and
only the caption was live, so a screen reader heard "Same ten
minutes. Different time." with nothing to compare. Every scene now
declares `describe` in the manifest (and `describeAt` where its
picture turns inside itself: the two clocks at the turn, the memory
corridor between its months); `main.ts` reads it into a clipped
live region beside the caption's as the scene is entered.

### 14e · the phone as its own exhibition

The critique's largest implementation point: a portrait phone was the
landscape composition through a narrower window. What is now
composed for it, beyond the two clocks' stack (14b):

- The figure's type floor on a phone is 12 px (titles 13), up from 10
  and 11: nothing an instrument prints is below what can be read at
  arm's length. The survey's layout is derived from the computed size,
  so its blocks grew with it and were re-placed.
- The year's survey in its narrow mode loses the plan (the specimen's
  azimuth row carries its one reading), keeps five of the specimen's
  nine rows — subject, exposure, date, altitude, azimuth — and stands
  the block at the foot's left above the HUD, off the foreground
  people. The analemma's subtitle drops its exposure count, which ran
  off the right edge; the count is in the specimen.
- The ring of seasons, which the specimen's move put it under, stands
  right of centre and smaller when the frame is taller than wide
  (`RING_CENTRE_PORTRAIT`, `RING_R_PORTRAIT` in scene-04-year).
- The radar and leaf scopes were already sized from the frame's
  shorter side and needed nothing.
- On a touch screen the invitation reads "Swipe up to leave now."

Not done, and needing a phone in a hand rather than an emulated
frame: whether the plates want a different crop in portrait (the far
shore's bandshell sits at the right edge at 375 wide), and whether the
year's callouts near the analemma's top still collide with the title
as the sun passes it.

### 14f · the order, and the roots

The critique's order, taken whole: the year, the turn, and then the
two clocks — the argument straight after the line, at 45 % of the
runway instead of 62 — with the inward second, the month of panes and
the lifetime following it before the return. The manifest array is
the order; the scene ids keep the numbers they were built under. What
the joins needed: the turn loses its fall (it was a drop to the bench
for a scene that now comes later; the corridor comes out of the black
instead, and the scene is declared `black`, a new one-line flag so the
placeholder field stands down); the inward second fades in from the
corridor's black and out to the panes'; the lifetime fades in from
the panes' black. Runway 1610 vh.

And the roots withdrawn from the lifetime, under the rule now written
into DIRECTION.md: an instrument has to change how long something
feels, not only show what is there. The reader stays built; one line
in the manifest brings it back.

## Session 18 · the painting, taken apart · 2026-09-09

Pointillism, second version, on branch `pointillist-v2` (from main).
The brief: the opening scene is to look exactly like the reference
painting (`assets/raw/park/reference.png`, 1536 × 1024), built from
individually generated elements that sit where the painting has them,
to be animated later.

### 18a · what the model will and will not do

A probe asked for the painting again "keeping only the couple exactly
where they are, everything else white". The model isolates an element
beautifully and will not hold its position: the couple came back four
times larger and centred; the far shore grew an invented lawn. So
position and size are measured here, in the painting's own pixels, and
the model does only what it is good at. `scripts/reference-layers.mjs`
holds the measurements: twenty elements, each a box `[x, y, w, h]` in
the painting, from the reader at the left to the two far sails.

### 18b · the elements

Each element is a crop of the painting around its box, sent as the
image being edited with "redraw only <the element>, larger, complete,
on pure white — same pose, dots and colours" (`node scripts/generate.mjs
--taken-apart --quality high`; the crop and any mask are built by the
generator, which grew `crop`, `src`, `maskBoxes` and `noRef` for it).
Twenty came back at four times the painting's detail, whole where the
frame had cut them, hands and feet drawn: the reader, the couple with
their basket and bottle, the man and his dog, the bicycle, the sitters
across the lawn in six groups, the jogger, the families and pairs at
the water's edge, the walkers, and four boats. Keyed and trimmed by the
`cutout` recipe into `public/plates/scene-04/ref/`.

### 18c · the ground

Two whole-frame edits with masks: `quiet-park`, the painting with every
person, boat and thing painted out (a mask of all the element boxes),
which came back faithful and clean; and `empty-view`, the quiet park
with the framing trees painted out too — which did not: the model
repainted the whole picture, flattened the far shore and dropped the
bandshell. So the quiet park is the master for every ground layer and
the empty view fills only what is behind the trees.
`scripts/reference-bands.mjs` cuts five whole-frame bands from it —
sky, far shore, water, ground, trees — finding the treeline's top by
lightness and the water's two edges by blueness, column by column. The
tree matte is a colour key (leaves against pale sky, trunks against
green and blue inside their own columns), then grown by four pixels so
the trees carry a ring of their own background: no seam from the seat,
a faint ghost only once the eye has risen and the trees are already
fading. Leaves that hang in front of the far treeline are both green
and stay baked into the far shore — a better matte is owed before the
year's rise is judged. Each band runs on opaque under the band drawn
over it, since two feathered half-alphas never sum to solid.

### 18d · the composition

`src/scenes/park-composition.ts`, new: a plate with a `ref` box is
placed by a fixed eye — the seat's camera, seeing the painting's frame
through the composition's field of view. The box is sampled on a grid,
every sample unprojected onto the plate's plane (a wall at z, or the
ground at baseY for `lay`; `feet` finds a standing plate's z where its
bottom row meets the ground), and the image mapped by the same pixels.
From the seat the plates stack back into the painting to the pixel;
from anywhere else they are things at honest distances. The seat looks
at y −1.77 so the world's horizon sits a quarter of the way down the
frame, just above the far waterline: a lying plate cannot show a row
that is above the horizon, and the first attempt (horizon at 0.295)
left black holes along the far shore's foot where the water's rows
were. The lens narrows on viewports wider than 3:2 so the frame always
covers (`fovFor`, applied in main's resize). The year scene hands its
sky, far shore, water and lawn to the painting's plates, puts the
lake's shader under the water image (the wind's streamlines are owed a
new home on the image), and leaves the procedural cloud deck off.

Verified in the dev server by reading the WebGL canvas back and
posting it to a local receiver, then blending the frame 50/50 over the
reference: every figure, boat and blanket lands on itself. The far
treeline sits a few pixels higher than the reference's, the quiet
park's own drift, and the sky has fewer clouds. Owed next: the other
seasons of every band and the winter trees; the flow instrument on the
water image; a proper tree matte; then the animation the elements were
cut for — walkers, sails, the dog.

### 18e · the cut, refined

Adam's zooms of the first frame found white pockets between arms and
bodies and under the chairs, pale blue-white ground under every pair
of feet, a stray mark by the jogger, a smear over the chairs, a trunk
riding along with the bicycle. `keyWhite` grew four rules for it:
paper the flood cannot reach — any run of forty paper pixels — is
paper (the boats opt out, a sail being an enclosed white shape too,
and read paper strictly as their own border's colour, pinholes
closed); in the lowest sixth of what is drawn, pale, cool, evenly pale
pixels reachable from the background are the model's contact shadow,
not the figure, with a three-pixel creep for the sliver against the
shoes; a piece under 0.15 % of the largest is a speck; and the paper's
blend is unmixed two pixels in, not one, with the edge's colour bled
under the clear pixels so filtering never darkens it. The cutouts
keep lossless alpha. The smear over the chairs was the tree matte:
blue shadow dots on the grass inside a trunk's column had read as
trunk and were drawn in front of the sitters; a trunk is warm now.
The bicycle was generated again without its tree. The far shore's foot
had diagonal streaks: the water's far edge, read column by column,
had jumped up into the treeline's blue shadow dots in places, and
those rows of lying water, almost at the horizon, drew as long
slivers. The far waterline is one straight line now, held to the
width's median; the far shore stands at z −52, where that line lies
through the seat's lens, and the boats are back on their feet.
Verified in the frame at the seat, zoomed where the flaws were.

### 18f · the second look

More zooms: the man in the second camp chair gone above the seat, a
small sitter's head cut flat, a hairline down the left trunk, the big
sailboat's reflection cut square, and the far-right pair visible only
through a slit. All but one were the tree matte. Its trunk columns had
been read as "warm and not green", which took the sunlit path, the wall
and the dry grass inside each column and drew them, in front of the
sitters, as a block; a trunk is bark now — redder than the path and
darker than the grass — in a column no wider than the trunk, and the
right column ends above the small sitter the model drew high. The
hairline was the matte's one-pixel feather: the ground under the trees
is filled from the empty view by the same mask, and a soft edge shared
by both let a quarter of the empty view through along the trunk; the
matte is hard now, its ring hiding the edge from the seat. The
reflection was the ground rule under the feet, which the boats now opt
out of, as they opt out of pockets.

### 18g · asked away

Adam edited the crowd from the frame: the woman on the wall (the two
children beside her stay, in a box of their own), the reader's black
bag (the plate keeps its trim so she keeps her place), the three at the
far right behind the trunks and the man lying back on the lawn (their
plates stay cut, their declarations went), and the reader moved a
little toward the bicycle — a box may run past the frame's edge. The
standing man's head had been clipped by the generated image's top
edge; drawn again with headroom. The right trunk's column ends above
the shoulder of the man in the second chair. The boats read paper
within twenty points of their border and their reflections ease away
below the hull, so no white smear sits on the lake. `cutout` grew
`keep` (a span of the width whose pieces stay), `drop` (a region whose
pieces go, size held) and `fade`. The man with the backpack and the three beyond him went the same way.

### 18h · the rise, looked at; the overlays, off

With the seat frame settled, the rise was captured at seven points.
Beyond the seat the painting's plates show what they are — one view
projected from one eye: the ground and the water end at the frame's
edges as a trapezoid over black, the sky under the canopy shows the
blocks of the empty view's fill once the elms have faded, the summer
bands sit under the winter crowd, and the survey, the ring, the radar
and the sun's figure of eight lie over all of it in a hand the
painting does not share. Adam asked for every overlay off, to be
rebuilt for the new direction: scenes 01–05 and 07 declare no
instruments, the year has no survey, the sun's trail is not drawn
(`sun.trace: false`; the sun still moves and lights). He also asked
that the people read as a time lapse — figures that come and go in
different places and different seasons — rather than walkers
animated in place. The plan for the rise is in PLAN.html.
