/**
 * The park's layers, as prompts. One entry per generated image; the
 * generator sends each with the style reference attached and writes the
 * result to assets/raw/scene-04/park/<id>-v<n>.png, where the recipes in
 * plates.mjs pick it up. Edit a prompt, run `node scripts/generate.mjs
 * --only <id>`, and the next version lands beside the last.
 */

/** Said before every prompt: the reference is the style, and every image
 *  is one layer of a scene, cut out on white. */
export const STYLE = `The attached image is the style reference: pointillist, small dots of pure colour, a sunlit late-summer afternoon at Lake Harriet, Minneapolis, seen from the lawn on the east shore looking across the water to the bandshell. Keep exactly this palette, light and dot size. The image you make is one layer of a layered scene, drawn on a plain flat pure white background with nothing else on it, so it can be cut out.`;

/** Sizes the model draws at. */
export const LANDSCAPE = '1536x1024';
export const SQUARE = '1024x1024';

export const layers = [
  {
    id: 'far-shore',
    size: LANDSCAPE,
    prompt: `Layer 1 of the scene, the far shore: one wide strip across the middle of the image. The treeline on the far side of Lake Harriet with the bandshell at centre-right and the small crowd on its lawn, seen from across the water at eye level, late-summer afternoon light from the left. Draw only the shore, the trees and the bandshell. Everything above the treeline and everything below the shoreline is flat pure white. No water, no sky, no boats.`,
  },
  {
    id: 'boats',
    size: LANDSCAPE,
    prompt: `Layer 2, the boats: a 3 by 3 grid of nine separate small sailboats on flat pure white, white sails catching late-summer light, seen from across the water at eye level, a few with tiny figures aboard, each boat alone in its cell with no water drawn. White between the cells, no grid lines.`,
  },
  {
    id: 'shoreline',
    size: LANDSCAPE,
    prompt: `Layer 3, the near shoreline, drawn flat: a low stone sea wall along the east shore of Lake Harriet, the paved walking path just behind it, and low shrubs and wildflowers along the path, seen straight on from the lawn at seated eye level so the path runs level across the whole image with no perspective — the wall's top edge horizontal, the path a level band behind it. One wide strip across the middle of the image; everything above and below is flat pure white. No people, no water, no grass beyond the path.`,
  },
  {
    id: 'lawn',
    size: SQUARE,
    prompt: `Layer 4, the lawn: the image filled edge to edge with sunlit park grass — short mown grass with tiny clover and a few fallen leaves, dappled with soft tree shadow, seen from directly above. It must tile seamlessly: the left edge continues into the right edge and the top into the bottom. No white, no objects, no people.`,
  },
  {
    id: 'sitters',
    size: LANDSCAPE,
    prompt: `Layer 5, the people on the lawn: a 3 by 3 grid of nine separate small scenes on flat pure white, each cell one group sitting on the grass seen from behind or the side at seated eye level, late-summer light from the left: a couple on a picnic blanket, a family with a small child, a woman reading, two friends with a cooler, a man with a dog lying down, a person in a folding chair, a woman with a stroller beside her, three people talking, a man lying back on his elbows. Each group on its own small patch of blanket or grass only, white between the cells, no grid lines.`,
  },
  {
    id: 'movers',
    size: LANDSCAPE,
    prompt: `Layer 6, the people passing: a 3 by 3 grid of nine separate figures on flat pure white, each cell one moving figure seen from the side at eye level, all facing right, late-summer light from the left: a jogger, a woman walking, a man walking, a cyclist on a bike, a child running, a dog on a lead with its owner, two friends walking together, a person pushing a stroller, an older man strolling. White between the cells, no grid lines.`,
  },
  {
    id: 'foreground',
    size: LANDSCAPE,
    prompt: `Layer 7, the nearest people: three large figures seen from behind at close range, as if sitting beside them on the lawn: at left a woman reading a book with a sun hat on the grass beside her, at centre a couple sitting close on a picnic blanket, the woman in a straw hat, at right a bearded man in a cap propped on one elbow with a golden dog lying beside him. Only the figures, the blanket, a basket and a water bottle; everything else flat pure white.`,
  },
  {
    id: 'trees',
    size: LANDSCAPE,
    prompt: `Layer 8, the framing trees: a large elm trunk at the far left edge and another at the far right edge, both rising from the bottom of the frame up out of the top, and their leafy canopy hanging across the top quarter of the image from both sides, in dappled late-summer light, seen from beneath them on the lawn. Everything between the trunks below the canopy is flat pure white.`,
  },
];
