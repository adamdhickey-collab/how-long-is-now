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
