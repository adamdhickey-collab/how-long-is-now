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

