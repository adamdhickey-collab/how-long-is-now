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
