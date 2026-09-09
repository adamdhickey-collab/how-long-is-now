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
    id: 'far-shore-thin',
    size: LANDSCAPE,
    refs: ['assets/raw/scene-04/park/far-shore-v1.png'],
    prompt: `The first image is the far shore layer; the second is the style reference. Redraw the first image exactly — the same treeline, the same bandshell in the same place, the same flat pure white above and below — but with the crowd thinned: a few dozen people scattered loosely on the lawn in front of the bandshell with open grass between them, the bandshell's benches mostly empty, and only a handful of figures along the rest of the shore. Keep the pointillist dots, palette and dot size.`,
  },
  {
    id: 'boats',
    size: LANDSCAPE,
    prompt: `Layer 2, the boats: a 3 by 3 grid of nine separate small sailboats on flat pure white, white sails catching late-summer light, seen from across the water at eye level, a few with tiny figures aboard, each boat alone in its cell with no water drawn. Sailboats only: nothing on this lake has a motor. White between the cells, no grid lines.`,
  },
  {
    id: 'shoreline',
    size: LANDSCAPE,
    prompt: `Layer 3, the near shoreline, drawn flat and quiet: a low stone sea wall along the east shore of Lake Harriet, its top edge horizontal, and above it only a narrow, open band of the paved path with a few small low tufts of grass and tiny wildflowers here and there at its far edge — nothing tall, nothing dense, no shrubs, no trees, mostly open path. Seen straight on from the lawn at seated eye level with no perspective. One wide, low strip across the middle of the image; everything above and below is flat pure white. No people, no water.`,
  },
  {
    id: 'lawn',
    size: SQUARE,
    prompt: `Layer 4, the lawn: the image filled edge to edge with sunlit park grass — short mown grass with tiny clover and a few fallen leaves, dappled with soft tree shadow, seen from directly above. It must tile seamlessly: the left edge continues into the right edge and the top into the bottom. No white, no objects, no people.`,
  },
  {
    id: 'sitters',
    size: LANDSCAPE,
    prompt: `Layer 5, the people on the lawn: a 3 by 3 grid of nine separate small scenes on flat pure white, each cell one group sitting on the grass seen from behind or the side at seated eye level, late-summer light from the left: a couple on a picnic blanket, a family with a small child, a woman reading, two friends with a cooler, a man with a dog lying down, a person in a folding chair, a woman with a stroller beside her, three people talking, a man lying back on his elbows. Nothing drawn beneath anyone — no grass, no ground, no shadow — a blanket only where a group has one, otherwise the figures sit directly on the flat white. White between the cells, no grid lines.`,
  },
  {
    id: 'sitters-b',
    size: LANDSCAPE,
    prompt: `Layer 5 again, more people on the lawn, and this is Minneapolis: a 3 by 3 grid of nine separate small scenes on flat pure white, each cell one group sitting on the grass seen from behind or the side at seated eye level, late-summer light from the left. Clothes in the colours the city wears — navy and red, purple and gold, forest green and cream — with no logos, lettering or emblems anywhere. The nine: a Somali family on a blanket, the mother in a bright hijab; an older Scandinavian-looking couple in folding chairs sharing a thermos; a man in a navy cap reading a paperback; a woman in a purple hoodie lying back on her elbows; a Hmong grandmother with two small grandchildren and a picnic; two friends in green and red plaid shirts with a cooler; a teenager in a light-blue basketball jersey lying on the grass with headphones; a woman with a wooden canoe paddle beside her blanket, looking at the water; a Black man with a bike helmet on the grass beside him and a growler. Nothing drawn beneath anyone — no grass, no ground, no shadow — a blanket only where a group has one, otherwise the figures sit directly on the flat white. White between the cells, no grid lines.`,
  },
  {
    id: 'movers',
    size: LANDSCAPE,
    prompt: `Layer 6, the people passing: a 3 by 3 grid of nine separate figures on flat pure white, each cell one moving figure seen from the side at eye level, all facing right, late-summer light from the left: a jogger, a woman walking, a man walking, a cyclist on a bike, a child running, a dog on a lead with its owner, two friends walking together, a person pushing a stroller, an older man strolling. White between the cells, no grid lines.`,
  },
  {
    id: 'movers-b',
    size: LANDSCAPE,
    prompt: `Layer 6 again, more people passing: a 3 by 3 grid of nine separate figures on flat pure white, each cell one moving figure seen from the side at eye level, all facing right, late-summer light from the left: a man walking a golden dog on a lead, a small child running, a woman jogging, a teenager on a skateboard, an older woman walking with a small dog, a young man walking a bicycle beside him, a woman walking with a coffee cup, two children running together, a man walking with a toddler on his shoulders. White between the cells, no grid lines.`,
  },
  {
    id: 'foreground',
    size: LANDSCAPE,
    prompt: `Layer 7, the nearest people: three large figures seen from behind at close range, as if sitting beside them on the lawn: at left a woman reading a book with a sun hat on the grass beside her, at centre a couple sitting close on a picnic blanket, the woman in a straw hat, at right a bearded man in a cap propped on one elbow with a golden dog lying beside him. Only the figures, the blanket, a basket and a water bottle; everything else flat pure white.`,
  },
  {
    id: 'trees',
    size: LANDSCAPE,
    prompt: `Layer 8, the framing trees, light and open: a slender elm trunk at the far left edge and another at the far right edge, both rising from the bottom of the frame up out of the top, and their canopy hanging only across the top fifth of the image from both sides — an airy, open canopy of small leaf clusters with plenty of flat pure white showing through it, sunlit yellow-green, not a dense dark mass — seen from beneath them on the lawn in late-summer light. Everything between the trunks below the canopy is flat pure white.`,
  },
];

/**
 * The other three seasons of the layers the year turns through: each an
 * edit of the late-summer layer, which travels with the prompt as the
 * first image so the composition holds when the year cross-fades. What
 * changes is only what the season changes.
 */
const SEASONS = {
  autumn: `late October at Lake Harriet: the elms and cottonwoods turned gold, amber and rust with some branches already bare, a few leaves in the air, fallen leaves scattered on every horizontal surface, the light lower and warmer`,
  winter: `mid January at Lake Harriet: every tree bare, snow along the branches and on every ledge and roof, the ground under fresh snow with a few footprints and dead grass showing through at the edges, the light pale and blue-white`,
  spring: `late April at Lake Harriet: the trees just leafing out in thin fresh yellow-green, some still bare, buds on the shrubs, the grass new and pale green with the first dandelions, the light clear and cool`,
};

const TURNING = [
  { id: 'far-shore', from: 'far-shore-thin-v1.png', size: LANDSCAPE, keep: 'the treeline, the bandshell and its crowd exactly where they are, and the flat pure white above and below' },
  { id: 'shoreline', from: 'shoreline-v3.png', size: LANDSCAPE, keep: 'the wall and its top edge exactly where they are, the path above it just as open and low — no shrubs, no trees, nothing taller than the small tufts, nothing on the ground in front of the wall — and the flat pure white above and below' },
  { id: 'lawn', from: 'lawn-v1.png', size: SQUARE, keep: 'it as the ground only, seen from directly above and filled edge to edge — grass, or what now covers the grass, lit evenly, with no trees, no branches, no trunks, no shadows of anything, no objects and no white — still tiling seamlessly' },
  { id: 'trees', from: 'trees-v2.png', size: LANDSCAPE, keep: 'both trunks and every branch exactly where they are, the canopy just as open with the flat white showing through it, and the flat pure white between the trunks below the canopy' },
];

export const seasonLayers = Object.entries(SEASONS).flatMap(([season, when]) =>
  TURNING.map((t) => ({
    id: `${t.id}-${season}`,
    size: t.size,
    refs: [`assets/raw/scene-04/park/${t.from}`],
    prompt: `The first image is one layer of the scene in late summer; the second is the style reference. Redraw the first image in ${when}. Keep ${t.keep}, and keep the second image's pointillist dots, palette and dot size. Change only what the season changes.`,
  })),
);

/**
 * The crowd through the year, planned: who is in the park in each
 * season, as sheets to generate when the graphics are wanted. Each is
 * placed by the manifest in its own window of the year (see the
 * ledger's plan, 10d), so the summer crowd leaves with the leaves and a
 * different, thinner life takes the park until it comes back. Run with
 * `--crowd`; the manifest entries follow once the sheets are looked at.
 */
const CROWD_STYLE = `The same pointillist style, the same white ground, the same 3 by 3 grid of separate cells with white between them and no grid lines, no logos or lettering anywhere; this is Minneapolis, in the colours the city wears — navy and red, purple and gold, forest green and cream — and its people. Every couple is a man and a woman. Nothing drawn beneath anyone — no grass, no snow, no ground, no shadow — a blanket only where a group has one; figures and things stand directly on the flat white.`;

export const crowdLayers = [
  {
    id: 'sitters-autumn',
    size: LANDSCAPE,
    prompt: `${CROWD_STYLE} Late October, people who stay on the lawn in the cold: a man and a woman on a blanket in wool sweaters with a thermos; two children throwing themselves into a raked pile of leaves; a man in a flannel jacket with a paperback and a coffee; a woman photographing the far shore with a camera; an older man in a folding chair wrapped in a plaid blanket; a family on a blanket with a pumpkin; a student cross-legged with a laptop; a woman in a knit hat with a dog curled beside her; a father and small daughter making a leaf crown. Each group seen from behind or the side at seated eye level, autumn light low from the left.`,
  },
  {
    id: 'movers-autumn',
    size: LANDSCAPE,
    prompt: `${CROWD_STYLE} Late October, people passing on the path, each cell one moving figure or pair seen from the side, all facing right: a runner in long sleeves and a knit hat; a woman walking a dog, both in scarves; a cyclist in a windbreaker; a man raking leaves at the path's edge; two friends walking with coffee cups in jackets; a child on a small bike in a helmet; an older man and woman walking arm in arm in wool coats; a jogger with a stroller; a man carrying a canoe paddle and a life vest.`,
  },
  {
    id: 'ice-winter',
    size: LANDSCAPE,
    prompt: `${CROWD_STYLE} Mid January on the frozen lake, things that stay put, each cell one: a small square ice-fishing house with a stovepipe; a man sitting on an upturned bucket over a hole in the ice with a short rod; a snowman on the shore with a scarf; a pair of skates left on a bench; a cleared rink's edge marked by a shovel and a small orange cone; a bonfire barrel with two people warming their hands; a sled at rest; a hockey net; a child kneeling to look into a hole in the ice. Winter light pale and low.`,
  },
  {
    id: 'movers-winter',
    size: LANDSCAPE,
    prompt: `${CROWD_STYLE} Mid January, people moving, each cell one figure or pair seen from the side, all facing right: a skater gliding on one foot; a man and a woman skating holding hands; a cross-country skier in a bright shell; a parent pulling a child on a sled; a dog walker in a long parka and boots with a dog in a coat; a hockey player stickhandling a puck; a runner in tights, a headband and mittens; a woman on a fat-tire bike; a man carrying an auger and a bucket.`,
  },
  {
    id: 'sitters-spring',
    size: LANDSCAPE,
    prompt: `${CROWD_STYLE} Late April, the first people back on the lawn, in light jackets: a man and a woman on a blanket with takeout cups; a man lying on his back in a hoodie with his face to the sun; a mother with a baby on a blanket; two friends sitting on their bike helmets; a woman reading in a folding chair with a scarf; a goose and four goslings on the grass; a student with a sketchbook; an older woman feeding nothing to the geese and being watched by one; a boy holding a kite string, the kite out of frame. Spring light clear from the left.`,
  },
  {
    id: 'movers-spring',
    size: LANDSCAPE,
    prompt: `${CROWD_STYLE} Late April, people passing on the path, each cell one moving figure or pair seen from the side, all facing right: a runner in a light jacket; a rollerblader; a woman walking with a coffee and a dog; a child learning to ride a bike with a parent running behind; a cyclist on a road bike; a man walking with an umbrella under his arm; two teenagers walking with a basketball; a woman with a stroller in a rain shell; a pair of geese walking with the traffic.`,
  },
];
