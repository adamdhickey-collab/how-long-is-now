/**
 * The reference painting, taken apart (session 18: pointillism v2).
 *
 * The opening scene is to look exactly like `assets/raw/park/reference.png`
 * — the pointillist Lake Harriet from the lawn. A probe showed the image
 * model will isolate any element of the painting beautifully but will
 * not hold its position: asked for the couple "exactly where they are"
 * it returned them four times larger and centred. So position and size
 * are *measured here*, in the painting's own pixels, and the model does
 * only what it is good at:
 *
 *   elements   a crop of the painting around one element, redrawn large
 *              and complete on pure white — the same pose, dots and
 *              colours, four times the detail. Placed back at its
 *              measured box, it lands where the painting had it.
 *   quiet-park the painting with every person, boat and thing inpainted
 *              away (a masked edit), for the ground layers.
 *   empty-view quiet-park with the framing trees inpainted away too,
 *              for the sky, far shore and water behind them. The trees
 *              are then the difference between the two.
 *
 *   node scripts/generate.mjs --taken-apart --quality high
 *   node scripts/generate.mjs --taken-apart --only empty-view   (after quiet-park)
 *
 * Outputs go to assets/raw/scene-04/ref/. Boxes are [x, y, w, h] in the
 * 1536 × 1024 painting; `fit` says which side is trusted when the model
 * completes a figure the painting's edge cut off.
 */

export const REF = 'assets/raw/park/reference.png';
export const FRAME = [1536, 1024];
const dir = 'scene-04/ref';

export const ELEMENT_STYLE = `The image is a detail cut from a pointillist painting: small dots and dashes of pure colour, sunlit, no outlines. Redraw ONLY the element named below from it, larger so that it fills this frame with a small margin, isolated on flat pure white with nothing else at all — no grass, water, path, shadow or other people. Keep exactly the same pose, clothes, colours, lighting and pointillist dots; keep the same viewpoint (seen from behind or the side as in the detail). Draw it complete: whole figures with hands and feet, and whatever the crop edge or another figure hid, continued plausibly.`;

/** One element per asset. `box` is the element's own extent in the
 *  painting; `fit` is 'w' (trust the width, hang from the top), 'h'
 *  (trust the height) or 'box' (fit inside; the element was whole). */
export const ELEMENTS = [
  // ---- foreground, on the lawn with us
  { id: 'reader', box: [0, 640, 420, 293], fit: 'w', prompt: `the young woman at the left reading a book: dark hair tied back, sunglasses, black tank top, blue shorts, legs stretched out with sandals, propped on one arm — with the straw hat and the dark bag lying on the grass beside her` },
  { id: 'couple', box: [375, 600, 530, 335], fit: 'w', prompt: `the couple seen from behind sitting side by side on the patterned picnic blanket: the man in the pale blue shirt and dark shorts with his hand on the blanket, the woman in the straw hat with the navy band and the red floral dress leaning on her arm — with the blanket, the wicker basket and the blue water bottle` },
  { id: 'man-dog', box: [960, 680, 490, 320], fit: 'w', prompt: `the bearded man in the navy cap and navy t-shirt seen from behind, propped on his elbow on the grass, and the golden doodle dog lying beside him with its tongue out and a blue collar, its tail stretched out behind` },
  { id: 'bicycle', box: [0, 505, 205, 250], fit: 'h', prompt: `the dark blue road bicycle alone, seen from its side, complete with both wheels, frame, drop handlebars and saddle, standing upright as it leans. Do not draw the tree, the trunk, the grass or anything it leans on: nothing but the bicycle on white` },
  // ---- the lawn between us and the path
  { id: 'sitters-lawn', box: [585, 462, 225, 138], fit: 'box', prompt: `the couple sitting on the grass looking at the lake, seen from behind: the man in the navy shirt with dark hair and the woman with long hair in the blue dress, with the small bag beside them` },
  { id: 'straw-hat', box: [800, 420, 300, 295], fit: 'box', prompt: `the group on and around the picnic blanket: the woman in the wide straw hat and blue striped top seen from behind, the woman in white and the man in the blue cap beside her, the man in green sitting further off, and the blue backpack and the blanket` },
  { id: 'lying-man', box: [1080, 510, 190, 100], fit: 'box', prompt: `the man in the blue cap lying back on the grass propped on his elbows, seen from behind` },
  { id: 'family', box: [1225, 505, 305, 220], fit: 'box', prompt: `the family on the picnic blanket: the two small children in the cap and the pink top, the mother with long dark hair in the white top, the pushchair beside them, and their blanket` },
  { id: 'chairs', box: [1300, 400, 236, 130], fit: 'box', prompt: `the people in the two folding camp chairs seen from behind, the woman sitting on the grass beside them, and the figure beyond at the right` },
  // ---- the path and the water's edge
  { id: 'jogger', box: [160, 400, 100, 205], fit: 'box', prompt: `the woman jogging along the path: ponytail, blue patterned top, dark shorts, white trainers, mid-stride` },
  { id: 'edge-family', box: [430, 398, 130, 165], fit: 'box', prompt: `the father in the blue shirt and shorts holding hands with the small girl in the pink dress, and the little boy in the blue top pointing at the lake, standing at the water's edge seen from behind` },
  { id: 'wall-group', box: [600, 398, 135, 112], fit: 'box', prompt: `the woman in the sun hat sitting on the low wall and the two women standing beside her looking at the lake, seen from behind` },
  { id: 'standing-group', box: [762, 345, 145, 155], fit: 'box', pad: 0.24, prompt: `the four people standing at the water's edge seen from behind: the man, the woman with long hair, the girl in the white dress and the woman in the light dress. Draw them smaller than the frame, with clear white above the tallest head and below their feet: no head may touch the top edge` },
  { id: 'dog-walkers', box: [1075, 355, 220, 140], fit: 'box', prompt: `the couple walking along the path seen from behind, the woman with the green backpack, the man in the navy shirt holding the lead of the brown dog trotting beside them` },
  { id: 'backpack-walker', box: [1290, 325, 130, 120], fit: 'box', prompt: `the man walking away along the path with a blue backpack, and the small group of people standing beyond him` },
  { id: 'far-right', box: [1425, 325, 111, 75], fit: 'box', prompt: `the three people standing together at the water's edge at the far right, seen from behind` },
  // ---- the water
  { id: 'sailboat', box: [225, 238, 100, 125], fit: 'box', prompt: `the white-sailed sailboat with the blue hull and the people aboard, with its reflection on the water directly beneath it` },
  { id: 'sails-mid', box: [535, 252, 75, 60], fit: 'box', prompt: `the two small white sailboats side by side, with their reflections` },
  { id: 'sailboat-right', box: [695, 252, 65, 85], fit: 'box', prompt: `the small sailboat with the white sail and its reflection` },
  { id: 'sails-far', box: [1120, 305, 90, 32], fit: 'box', prompt: `the two tiny distant white sails, with their reflections` },
];

const pad = ([x, y, w, h], p) => [Math.max(0, x - p), Math.max(0, y - p), Math.min(FRAME[0], x + w + p) - Math.max(0, x - p), Math.min(FRAME[1], y + h + p) - Math.max(0, y - p)];

/** Boxes of everything that is not ground: painted out of quiet-park. */
export const LIFE_BOXES = ELEMENTS.map((e) => pad(e.box, 14)).concat([
  [170, 306, 40, 22], [440, 305, 40, 20], [845, 332, 40, 20], // canoes and a kayak
  [320, 276, 35, 35], // the small sail left of the big one
]);

/** Where the framing trees are: painted out of empty-view. */
export const TREE_BOXES = [[0, 0, 1536, 300], [0, 0, 235, 725], [1365, 0, 171, 455]];

/** Pick the API size that best matches a crop's aspect. */
const sizeFor = ([, , w, h]) => (w / h > 1.2 ? '1536x1024' : w / h < 0.83 ? '1024x1536' : '1024x1024');

/** The wide frame is twice the painting each way; the painting sits at
 *  (768, 512) in it. Every piece is a 1536 × 1024 window on that frame. */
export const WIDE = { frame: [3072, 2048], origin: [768, 512] };
export const OUTPAINT_PIECES = {
  // round 1: the sides, then the top and the bottom
  left: { at: [0, 512], mask: [[0, 0, 776, 1024]], round: 1, ask: 'to the left: open lawn with its dappled tree shadows and no further trees or trunks standing in it, the lake and the far shore\u2019s treeline continuing at exactly the same heights to the edge' },
  right: { at: [1536, 512], mask: [[760, 0, 776, 1024]], round: 1, ask: 'to the right: open lawn with its dappled tree shadows and no further trees or trunks standing in it, the lake and the far shore\u2019s treeline continuing at exactly the same heights to the edge' },
  above: { at: [768, 0], mask: [[0, 0, 1536, 520]], round: 1, ask: 'above: only open sky with a few light clouds, the same blue as the sky already painted — no branches, no leaves, no treetops anywhere in the white area, as if the elms ended exactly at the painting\u2019s top edge' },
  below: { at: [768, 1024], mask: [[0, 504, 1536, 520]], round: 1, ask: 'below: the same lawn continuing toward the viewer with its dappled tree shadows, the elms\u2019 trunks reaching the ground with their roots' },
  // round 2: the corners
  'top-left': { at: [0, 0], mask: [[0, 0, 776, 520]], round: 2, ask: 'in the corner: sky above, lawn and lake below, joining what is painted on either side' },
  'top-right': { at: [1536, 0], mask: [[760, 0, 776, 520]], round: 2, ask: 'in the corner: sky above, lawn and lake below, joining what is painted on either side' },
  'bottom-left': { at: [0, 1024], mask: [[0, 504, 776, 520]], round: 2, ask: 'in the corner: the lawn with its dappled tree shadows, joining what is painted on either side' },
  'bottom-right': { at: [1536, 1024], mask: [[760, 504, 776, 520]], round: 2, ask: 'in the corner: the lawn with its dappled tree shadows, joining what is painted on either side' },
};

function outpaintLayers() {
  const pieces = Object.entries(OUTPAINT_PIECES).map(([id, piece]) => ({
    id: `wide-${id}`,
    dir: `${dir}/outpaint`,
    size: '1536x1024',
    src: `assets/raw/${dir}/outpaint/${id}-input.png`,
    maskBoxes: piece.mask,
    noRef: true,
    preamble: 'The image is part of a pointillist painting of a park on a lake — small dots and dashes of pure colour, sunlit — with a white area still to be painted.',
    prompt: `Continue the painting into the white area so the whole canvas is one picture of the same park from the same spot, in exactly the same dots, colours and light — ${piece.ask}. No people, boats, animals or objects. Keep everything already painted exactly as it is, to the pixel.`,
  }));
  // The piece below the painting, with the elms' trunk bases painted
  // away (18i): a trunk continued onto the lying ground plate streaks
  // as the eye rises. An edit of the piece itself, masked to the two
  // trunk columns below the painting's foot.
  pieces.push({
    id: 'wide-below-clean',
    dir: `${dir}/outpaint`,
    size: '1536x1024',
    src: `latest:${dir}/outpaint/wide-below`,
    maskBoxes: [[0, 500, 250, 524], [1360, 500, 176, 524]],
    noRef: true,
    preamble: 'The image is part of a pointillist painting of a park on a lake — small dots and dashes of pure colour, sunlit.',
    prompt: `In the masked areas only, remove the tree trunks and their roots and continue the lawn there — the same grass with the same dappled tree shadow falling across it, in the same dots and light. Change nothing outside the masked areas.`,
  });
  return pieces;
}

/** The seasons the year passes through, as the manifest names them. */
export const SEASONS = {
  autumn: {
    key: 'AUTUMN',
    text: `late October: the elms and the far shore's trees turned yellow, orange and rust, some already half bare with branches showing, fallen leaves scattered thinly on the lawn and along the path, the grass duller and cooler, the lake a deeper steel blue under a paler sky`,
  },
  winter: {
    key: 'WINTER',
    text: `mid-January in Minnesota: snow lying over the lawn and the path, the lake frozen and snow-covered to the far shore, a flat very pale blue-white surface (never pure white), the elms and the far shore's trees bare, their branches dark against a pale grey-white winter sky`,
  },
  spring: {
    key: 'SPRING',
    text: `late April: the elms and the far shore's trees in their first small fresh yellow-green leaves, some blossom, the lawn a bright new green, the lake open again and a clear light blue under a soft spring sky`,
  },
};

function seasonLayers() {
  const out = [];
  for (const [id, season] of Object.entries(SEASONS)) {
    const pre = 'The image is a pointillist painting of a park on a lake: small dots and dashes of pure colour, sunlit.';
    const turn = `Paint the very same picture in ${season.text}. Keep every shape exactly where it is and exactly its size — the trees, the shore, the bandshell, the path, the lawn, the horizon — and the same pointillist dots and brushwork; change only what the season changes: the colours of leaves, grass, water and sky, snow where snow would lie, bare branches where leaves have fallen. No people, boats, animals or objects.`;
    out.push({ id: `quiet-${id}`, dir, size: '1536x1024', src: 'assets/raw/scene-04/ref/quiet-park-v1.png', noRef: true, preamble: pre, prompt: turn });
    out.push({ id: `wide-${id}`, dir, size: '1536x1024', src: 'assets/raw/scene-04/ref/wide-half.png', noRef: true, preamble: pre, prompt: turn });
    out.push({
      id: `empty-${id}`, dir, size: '1536x1024', src: `latest:${dir}/quiet-${id}`, maskFile: 'assets/raw/scene-04/ref/tree-mask.png', noRef: true,
      preamble: pre,
      prompt: `In the masked areas only, remove the two big elms in the foreground — their trunks, branches and leaves — and continue exactly what lies behind them in the same dots, colours and light: the sky where branches were, the far shore's treeline at the same height and the lake where the trunks crossed them, the path and the ground where the trunks met it. Change nothing outside the masked areas.`,
    });
  }
  return out;
}

export const layers = [
  ...ELEMENTS.map((e) => ({ id: e.id, dir, size: sizeFor(e.box), crop: { src: REF, box: pad(e.box, Math.round(Math.max(e.box[2], e.box[3]) * (e.pad ?? 0.1))) }, noRef: true, preamble: ELEMENT_STYLE, prompt: e.prompt })),
  {
    id: 'quiet-park', dir, size: '1536x1024', src: REF, maskBoxes: LIFE_BOXES, noRef: true,
    preamble: 'The image is a pointillist painting of a park on a lake: small dots and dashes of pure colour, sunlit.',
    prompt: `In the masked areas only, remove every person, dog, boat, bicycle, blanket, basket, bottle, bag, chair and pushchair, and continue what lies behind them — grass and its dappled tree shadows, the paved path, the low wall and shrubs, the sparkling water — in exactly the same dots, colours and light, so the park looks quietly empty. Change nothing outside the masked areas.`,
  },
  {
    // The park outward (18i): the quiet park at half size in the middle
    // of the canvas, everything around it — and a thin margin inside —
    // left for the model, so the ground, the water, the far shore and
    // the sky run on past the painting's frame and the eye can rise.
    id: 'wide-park', dir, size: '1536x1024', src: 'assets/raw/scene-04/ref/wide-input.png', noRef: true,
    maskBoxes: [[0, 0, 1536, 264], [0, 760, 1536, 264], [0, 0, 392, 1024], [1144, 0, 392, 1024]],
    preamble: 'The image is a pointillist painting of a park on a lake — small dots and dashes of pure colour, sunlit — sitting in the middle of a larger white canvas.',
    prompt: `Continue the painting outward into the white on every side, in exactly the same dots, colours and light, so the whole canvas becomes one wider, taller view of the same park from the same spot: below and to the sides, more of the same lawn with its dappled tree shadows and the two big elms' trunks reaching the ground; to the left and right, the lake and the far shore's treeline continuing at the same height to the canvas's edges; above, open sky with a few light clouds and nothing else — do not add branches or leaves above the painting's top edge. No people, boats, animals or objects anywhere. Keep the painted centre exactly as it is.`,
  },
  // The park outward, in pieces (18i): each canvas keeps half of what is
  // already painted and asks for the rest, so the model continues rather
  // than recomposes. scripts/outpaint.mjs prepares the inputs, runs the
  // two rounds — sides and top and bottom, then the four corners — and
  // assembles the wide frame. The masks are the blank quarter or half of
  // each canvas plus an eight-pixel margin into the painted part.
  ...outpaintLayers(),
  // ---- the seasons (18j): the quiet park, the wide frame at half size,
  // and the view behind the elms, each turned to a season as an edit.
  // Every shape stays where it is; only the season changes.
  ...seasonLayers(),
  {
    // What stands behind the elms (18i): the quiet park with a mask the
    // shape of the trees themselves (scripts/tree-mask.mjs, from the
    // colour-keyed matte grown a little), so the far shore, the water
    // and most of the sky are kept and only the trees are painted away.
    // The first try masked whole boxes and the model repainted the far
    // shore flat, without its bandshell.
    id: 'empty-view', dir, size: '1536x1024', src: 'latest:scene-04/ref/quiet-park', maskFile: 'assets/raw/scene-04/ref/tree-mask.png', noRef: true,
    preamble: 'The image is a pointillist painting of a park on a lake: small dots and dashes of pure colour, sunlit.',
    prompt: `In the masked areas only, remove the two big elms in the foreground — their trunks, branches and leaves — and continue exactly what lies behind them in the same dots, colours and light: the sky with its light clouds where leaves were, the far shore's treeline at the same height and the water where the trunks crossed them, the path and the lawn with its dappled shadow where the trunks met the ground. Change nothing outside the masked areas.`,
  },
];

/**
 * New people for every season (18r): figures the painting does not have,
 * drawn in its hand — the reference travels with each prompt as the
 * style — isolated on white like the elements, one image each. `kind`
 * is the ground they keep to; `size` the image shape; `box` a footprint
 * in the painting's pixels borrowed from an element of the same stance
 * and distance, which the time lapse uses only for scale and a first
 * spot.
 */
export const PEOPLE_STYLE = `Paint, in exactly the pointillist style of the attached painting — the same small dots and dashes of pure colour, the same sunlit palette and soft edges, no outlines — the people described below, seen from behind or from the side as the painting's people are, isolated on flat pure white with nothing else at all: no ground, grass, snow, water, path, shadow or horizon. Draw them complete and whole, with hands and feet, filling the frame with a small margin, and nothing under their feet.`;

const person = (id, season, kind, size, box, prompt) => ({ id, season, kind, size, box, prompt });
export const PEOPLE = [
  // ---- more of August
  person('frisbee-pair', 'summer', 'lawn', '1536x1024', [560, 450, 240, 150], 'two young men in t-shirts and shorts standing a few paces apart, one about to throw a frisbee, the other with his hands up to catch'),
  person('sunbather', 'summer', 'lawn', '1536x1024', [800, 430, 280, 120], 'a woman lying on her front on a striped towel reading a paperback, sunglasses pushed up, bare feet crossed in the air'),
  person('ice-cream-kids', 'summer', 'path', '1024x1024', [430, 398, 130, 165], 'two children standing side by side eating ice-cream cones, one in a yellow sundress, one in a striped t-shirt and cap'),
  person('guitar', 'summer', 'lawn', '1024x1024', [1080, 510, 190, 120], 'a young man sitting cross-legged on the grass playing an acoustic guitar, seen from behind and a little to the side'),
  person('grandparents', 'summer', 'lawn', '1536x1024', [1225, 505, 305, 180], 'an elderly couple sitting on a folded blanket, he in a white shirt and straw hat, she in a pale blue dress, sharing a thermos'),
  person('kayak', 'summer', 'water', '1536x1024', [225, 300, 140, 60], 'a red kayak on the water with one paddler in a life vest, seen from the side, its reflection beneath it'),
  // ---- late October
  person('raker', 'autumn', 'lawn', '1024x1536', [1080, 470, 150, 160], 'a man in a red plaid jacket and jeans raking fallen leaves into a pile, seen from behind'),
  person('leaf-pile-kids', 'autumn', 'lawn', '1536x1024', [800, 460, 300, 180], 'two children in puffer jackets and wool hats jumping into a pile of yellow and orange leaves'),
  person('coffee-walkers', 'autumn', 'path', '1024x1536', [762, 345, 145, 155], 'a couple walking away along a path in long coats and scarves, each holding a paper coffee cup'),
  person('photographer', 'autumn', 'path', '1024x1536', [1075, 355, 120, 150], 'a woman in a green parka and knitted hat standing to photograph the lake with a camera raised to her eye, seen from behind'),
  person('pumpkin-family', 'autumn', 'lawn', '1536x1024', [1225, 505, 305, 200], 'a family sitting on a plaid blanket in sweaters with three small pumpkins beside them, a toddler in a hat'),
  person('autumn-dog', 'autumn', 'path', '1536x1024', [1075, 355, 220, 140], 'a man in a corduroy jacket walking a golden retriever on a lead, both seen from behind, leaves at their feet'),
  person('bench-reader', 'autumn', 'lawn', '1536x1024', [585, 462, 225, 138], 'a woman in a mustard sweater and scarf sitting on the grass with her knees up, reading a book, seen from behind'),
  person('autumn-jogger', 'autumn', 'path', '1024x1536', [160, 400, 100, 205], 'a jogger in black leggings, a grey hoodie and a headband running along the path, mid-stride, seen from the side'),
  // ---- mid January
  person('skaters', 'winter', 'water', '1536x1024', [535, 300, 180, 90], 'three people skating on the ice in winter coats and hats, one gliding with arms out, seen from a distance'),
  person('sledders', 'winter', 'lawn', '1536x1024', [800, 460, 300, 180], 'a father in a navy parka pulling two small children on a red wooden sled, seen from behind'),
  person('snowman-builders', 'winter', 'lawn', '1536x1024', [1225, 505, 305, 220], 'two children in snowsuits and mittens finishing a snowman with a carrot nose and a red scarf'),
  person('winter-walkers', 'winter', 'path', '1024x1536', [762, 345, 145, 155], 'an elderly couple in long wool coats and fur hats walking arm in arm along the path, seen from behind'),
  person('hockey-kids', 'winter', 'water', '1536x1024', [700, 300, 200, 90], 'four teenagers playing pond hockey on the ice with sticks and a small net, seen from a distance'),
  person('winter-dog', 'winter', 'lawn', '1536x1024', [585, 462, 225, 138], 'a woman in a white parka throwing a snowball for a black dog leaping in the snow, seen from behind'),
  person('thermos-pair', 'winter', 'lawn', '1536x1024', [1080, 500, 200, 130], 'two friends in puffer coats sitting side by side on a folded blanket with a thermos and two steaming cups'),
  person('ice-fisher', 'winter', 'water', '1024x1024', [225, 300, 120, 100], 'a man in insulated overalls and a fur hat sitting on an upturned bucket over a hole in the ice, fishing rod in hand'),
  // ---- late April
  person('kite-flyer', 'spring', 'lawn', '1024x1536', [560, 450, 200, 200], 'a girl in a yellow raincoat running with a red kite on a string flying above her, seen from behind'),
  person('geese-kids', 'spring', 'path', '1536x1024', [430, 398, 180, 150], 'two small children in light jackets crouching to look at a Canada goose and three goslings on the path'),
  person('spring-picnic', 'spring', 'lawn', '1536x1024', [800, 430, 300, 170], 'a young couple in light jackets sitting on a blanket with a basket, she pointing at something across the lake'),
  person('bike-walker', 'spring', 'path', '1536x1024', [1075, 355, 220, 150], 'a man in a denim jacket walking a bicycle along the path, seen from behind'),
  person('blossom-photo', 'spring', 'path', '1024x1536', [762, 345, 120, 155], 'a woman in a trench coat photographing a branch of pink blossom held in her other hand, seen from the side'),
  person('stroller-pair', 'spring', 'path', '1536x1024', [1290, 325, 180, 140], 'two mothers walking side by side pushing strollers, in spring jackets, seen from behind'),
  person('spring-dog', 'spring', 'lawn', '1536x1024', [1225, 505, 280, 160], 'a boy in a green hoodie throwing a ball for a brown spaniel running ahead of him on the grass'),
  person('painter', 'spring', 'lawn', '1024x1536', [1080, 500, 160, 190], 'an older man in a flat cap sitting on a folding stool painting the lake at a small easel, seen from behind'),
  // ---- more of each season (18u): the first roster was eight a season,
  // so at any moment the whole of it stood on the lawn at once and the
  // lapse had nothing to draw from. Six more each, in other stances and
  // on other ground, so that people come and go rather than assemble.
  person('book-club', 'summer', 'lawn', '1536x1024', [800, 430, 300, 170], 'three friends sitting on the grass in a loose circle, talking, one lying propped on an elbow'),
  person('toddler-run', 'summer', 'lawn', '1536x1024', [585, 462, 225, 138], 'a toddler in a sun hat running with both arms out, a parent crouched a few paces away with hands ready'),
  person('yoga-mat', 'summer', 'lawn', '1536x1024', [800, 430, 300, 150], 'a woman on a yoga mat in a low stretch, seen from the side, a water bottle beside her'),
  person('runners-pair', 'summer', 'path', '1024x1536', [762, 345, 145, 155], 'two runners side by side in vests and shorts, mid-stride, seen from behind'),
  person('rollerblader', 'summer', 'path', '1024x1536', [1290, 325, 180, 140], 'a young man on rollerblades gliding with one arm swung across, seen from the side'),
  person('paddleboard', 'summer', 'water', '1536x1024', [535, 300, 180, 90], 'a woman standing on a paddleboard with a long paddle, seen from the side, her reflection beneath her'),
  person('chess-pair', 'autumn', 'lawn', '1536x1024', [800, 430, 300, 160], 'two older men sitting on the grass either side of a small chessboard, one leaning in over it, in cardigans'),
  person('leaf-collector', 'autumn', 'lawn', '1024x1024', [585, 462, 200, 130], 'a child in a bobble hat crouching to gather fallen leaves into a bucket'),
  person('cyclist-autumn', 'autumn', 'path', '1536x1024', [1290, 325, 200, 140], 'a cyclist in a windbreaker riding along the path, seen from the side'),
  person('sketcher', 'autumn', 'lawn', '1024x1536', [585, 462, 180, 150], 'a young woman sitting cross-legged with a sketchbook on her knee, drawing, seen from behind'),
  person('rowers', 'autumn', 'water', '1536x1024', [535, 300, 200, 80], 'a slender two-person rowing shell on the water with both rowers pulling, seen from the side'),
  person('stroller-autumn', 'autumn', 'path', '1024x1536', [762, 345, 150, 155], 'a father in a knitted hat pushing a stroller along the path, seen from behind'),
  person('snow-angel', 'winter', 'lawn', '1536x1024', [800, 460, 300, 150], 'a child in a snowsuit lying on their back in the snow making a snow angel, arms and legs spread'),
  person('shoveller', 'winter', 'path', '1024x1536', [762, 345, 150, 165], 'a park worker in overalls and a woollen hat clearing snow from the path with a wide shovel'),
  person('skate-child', 'winter', 'water', '1024x1536', [700, 300, 150, 110], 'a small child on skates holding both hands of a parent skating backwards in front of them'),
  person('bird-feeder', 'winter', 'lawn', '1024x1536', [585, 462, 170, 165], 'an old man in a long coat standing to scatter seed, three small birds in the air about him'),
  person('cross-country', 'winter', 'path', '1536x1024', [1290, 325, 200, 150], 'a cross-country skier gliding with poles planted, seen from the side'),
  person('snowball-kids', 'winter', 'lawn', '1536x1024', [800, 460, 300, 170], 'two children in snowsuits, one winding up to throw a snowball and one ducking behind a mound'),
  person('tulip-photo', 'spring', 'lawn', '1024x1536', [585, 462, 180, 140], 'a woman crouching low with a phone to photograph a clump of small spring flowers'),
  person('joggers-spring', 'spring', 'path', '1024x1536', [762, 345, 150, 155], 'two joggers in light jackets running side by side, seen from behind'),
  person('reading-blanket', 'spring', 'lawn', '1536x1024', [800, 430, 300, 140], 'two friends lying on their fronts on a blanket, each reading, ankles crossed in the air'),
  person('ducklings', 'spring', 'water', '1536x1024', [535, 300, 160, 60], 'a duck swimming with five ducklings in a line behind her, their small wakes on the water'),
  person('skateboarder', 'spring', 'path', '1024x1536', [1290, 325, 170, 145], 'a teenager rolling along on a skateboard, arms out for balance, seen from the side'),
  person('family-walk', 'spring', 'path', '1536x1024', [762, 345, 220, 160], 'a family of four walking together along the path, the two children between the parents, seen from behind'),
];

export const peopleLayers = PEOPLE.map((p) => ({
  id: p.id,
  dir: 'scene-04/people',
  size: p.size,
  preamble: PEOPLE_STYLE,
  prompt: p.prompt,
}));

/**
 * The frame beyond the painting (18t). The pull-back was fed by an
 * outpainted continuation on every side, and its far edges read as
 * patchwork: the elms' canopy cut off straight at the painting's top,
 * blocks of a differently coloured treeline at the sides, wedges of
 * another tone on the lawn. What a person actually sees on leaning back
 * from a blanket is not more distance — it is more of where they are
 * sitting: the boughs overhead, the trunks either side, the grass at
 * their feet. So these are painted as their own elements, placed just
 * beyond the seat's frame in world space, and they arrive as the camera
 * leaves the seat. The lake and the far shore never need extending:
 * they stay inside the painting at every height the year reaches.
 */
export const FRAME_STYLE = `Paint, in exactly the pointillist style of the attached painting — the same small dots and dashes of pure colour laid side by side, the same sunlit palette, the same soft edges and no outlines at all — the subject described below, isolated on flat pure white with nothing else whatsoever: no sky, no ground, no grass, no horizon, no background, no shadow, no border. Where the subject ends, let its edge be ragged and natural — leaf tips, twigs, bark — never a straight line and never a cut-off. Leave the areas described as empty completely white.`;

export const TURF_STYLE = `Paint, in exactly the pointillist style of the attached painting — the same small dots of pure colour laid side by side, the same palette, no outlines at all — the ground described below, seen from straight above, filling the whole frame edge to edge with no horizon, no sky, no people, no path, no objects and no border. It must read as an even mat of small dots at the same scale as the grass in the attached painting, with no long blades, no stripes, no combed or brushed direction and no large shapes: turned any way up it should look the same. Vary it gently across the frame so it is nowhere flat and nowhere patterned.`;

const frameArt = (id, size, preamble, prompt) => ({ id, dir: 'scene-04/frame', size, preamble, prompt });

export const frameLayers = [
  // ---- the boughs overhead: hung from the top of the frame, the lower
  // edge ragged, the bottom third of the image left empty.
  frameArt('boughs-summer', '1536x1024', FRAME_STYLE, 'the leafy boughs of a great elm hanging down from above on a bright afternoon in late August, seen from below and close to: two or three heavy branches entering from the top edge of the frame and reaching down and sideways, dense clusters of green and yellow-green leaves along them with the light coming through, open gaps between the clusters, the whole mass hanging in the upper two thirds of the frame with its lower edge ragged with hanging leaf tips, and the bottom third of the frame left completely empty and white'),
  frameArt('boughs-autumn', '1536x1024', FRAME_STYLE, 'the boughs of a great elm hanging down from above on an afternoon in late October, seen from below and close to: two or three heavy branches entering from the top edge of the frame and reaching down and sideways, their leaves thinned to loose clusters of gold, amber and rust with bare grey twigs showing between them and wide gaps of nothing, a few leaves hanging alone at the tips, the whole mass in the upper two thirds of the frame with its lower edge ragged, and the bottom third of the frame left completely empty and white'),
  frameArt('boughs-winter', '1536x1024', FRAME_STYLE, 'the bare boughs of a great elm hanging down from above on an overcast afternoon in mid January, seen from below and close to: two or three heavy branches entering from the top edge of the frame and reaching down and sideways, dividing into fine bare twigs with no leaves at all, the bark violet-grey and rust, a thin line of snow resting along the upper side of each branch, the whole in the upper two thirds of the frame with its lower edge ragged with twig ends, and the bottom third of the frame left completely empty and white'),
  frameArt('boughs-spring', '1536x1024', FRAME_STYLE, 'the boughs of a great elm hanging down from above on an afternoon in late April, seen from below and close to: two or three heavy branches entering from the top edge of the frame and reaching down and sideways, their twigs carrying small new leaves just opening, pale yellow-green and sparse, so that much of the branch structure still shows through, the whole in the upper two thirds of the frame with its lower edge ragged, and the bottom third of the frame left completely empty and white'),
  // A second swag for the other side (18t): the same bough mirrored made
  // the top of the frame symmetrical about its centre, which no tree is.
  frameArt('boughs-summer-b', '1536x1024', FRAME_STYLE, 'the leafy boughs of a great elm hanging down from above on a bright afternoon in late August, seen from below and close to: one long heavy branch entering at the top right corner of the frame and reaching down and to the left, a second shorter one above it, dense clusters of green and yellow-green leaves along them with the light coming through and open gaps between the clusters, the mass hanging across the upper half of the frame with its lower edge ragged with hanging leaf tips, and the lower half of the frame left completely empty and white'),
  frameArt('boughs-autumn-b', '1536x1024', FRAME_STYLE, 'the boughs of a great elm hanging down from above on an afternoon in late October, seen from below and close to: one long heavy branch entering at the top right corner of the frame and reaching down and to the left, a second shorter one above it, their leaves thinned to loose clusters of gold, amber and rust with bare grey twigs showing between them and wide gaps of nothing, a few leaves hanging alone at the tips, the mass across the upper half of the frame with its lower edge ragged, and the lower half of the frame left completely empty and white'),
  frameArt('boughs-winter-b', '1536x1024', FRAME_STYLE, 'the bare boughs of a great elm hanging down from above on an overcast afternoon in mid January, seen from below and close to: one long heavy branch entering at the top right corner of the frame and reaching down and to the left, a second shorter one above it, both dividing into fine bare twigs with no leaves at all, the bark violet-grey and rust, a thin line of snow along the upper side of each branch, the mass across the upper half of the frame with its lower edge ragged with twig ends, and the lower half of the frame left completely empty and white'),
  frameArt('boughs-spring-b', '1536x1024', FRAME_STYLE, 'the boughs of a great elm hanging down from above on an afternoon in late April, seen from below and close to: one long heavy branch entering at the top right corner of the frame and reaching down and to the left, a second shorter one above it, their twigs carrying small new leaves just opening, pale yellow-green and sparse so that the branch structure shows through, the mass across the upper half of the frame with its lower edge ragged, and the lower half of the frame left completely empty and white'),
  // Four more stages between the four seasons (18v): the canopy is
  // painted at every turn of the year now rather than dissolved from
  // one season to the next, so what changes between two frames is a
  // few weeks of leaf rather than half a year of it.
  frameArt('boughs-turning', '1536x1024', FRAME_STYLE, 'the boughs of a great elm hanging down from above, seen from below and close to: two or three heavy branches entering from the top edge of the frame and reaching down and sideways, on an afternoon in late September, the leaves still dense and full but half turned — green, yellow-green and the first clear gold together in the same clusters, a few already brown at the tips, the whole mass hanging in the upper two thirds of the frame with its lower edge ragged, and the bottom third of the frame left completely empty and white'),
  frameArt('boughs-turning-b', '1536x1024', FRAME_STYLE, 'the boughs of a great elm hanging down from above, seen from below and close to: one long heavy branch entering at the top right corner of the frame and reaching down and to the left, a second shorter one above it, on an afternoon in late September, the leaves still dense and full but half turned — green, yellow-green and the first clear gold together in the same clusters, a few already brown at the tips, the mass across the upper half of the frame with its lower edge ragged, and the lower half of the frame left completely empty and white'),
  frameArt('boughs-late-autumn', '1536x1024', FRAME_STYLE, 'the boughs of a great elm hanging down from above, seen from below and close to: two or three heavy branches entering from the top edge of the frame and reaching down and sideways, on a grey afternoon in late November, the leaves nearly all down. The branches and their fine twigs are painted in clear dark grey-brown and violet strokes, well separated, with the flat white of the paper showing plainly between every twig — an open lacework, never a haze, never a pale cloud, nothing white or misty anywhere on the branches. Only a scattering of last dry gold and rust leaves clings in ones and twos, the whole mass hanging in the upper two thirds of the frame with its lower edge ragged, and the bottom third of the frame left completely empty and white'),
  frameArt('boughs-late-autumn-b', '1536x1024', FRAME_STYLE, 'the boughs of a great elm hanging down from above, seen from below and close to: one long heavy branch entering at the top right corner of the frame and reaching down and to the left, a second shorter one above it, on a grey afternoon in late November, the leaves nearly all down. The branches and their fine twigs are painted in clear dark grey-brown and violet strokes, well separated, with the flat white of the paper showing plainly between every twig — an open lacework, never a haze, never a pale cloud, nothing white or misty anywhere on the branches. Only a scattering of last dry gold and rust leaves clings in ones and twos, the mass across the upper half of the frame with its lower edge ragged, and the lower half of the frame left completely empty and white'),
  frameArt('boughs-budding', '1536x1024', FRAME_STYLE, 'the boughs of a great elm hanging down from above, seen from below and close to: two or three heavy branches entering from the top edge of the frame and reaching down and sideways, on an afternoon in late March, bare of leaves. The branches and their fine twigs are painted in clear dark grey-brown and violet strokes, well separated, with the flat white of the paper showing plainly between every twig — an open lacework, never a haze, never a pale cloud, no white or cream anywhere on the branches and no blossom or flowers of any kind. The twigs carry small tight red-brown buds and the first pin-points of green at their tips, the whole mass hanging in the upper two thirds of the frame with its lower edge ragged, and the bottom third of the frame left completely empty and white'),
  frameArt('boughs-budding-b', '1536x1024', FRAME_STYLE, 'the boughs of a great elm hanging down from above, seen from below and close to: one long heavy branch entering at the top right corner of the frame and reaching down and to the left, a second shorter one above it, on an afternoon in late March, bare of leaves. The branches and their fine twigs are painted in clear dark grey-brown and violet strokes, well separated, with the flat white of the paper showing plainly between every twig — an open lacework, never a haze, never a pale cloud, no white or cream anywhere on the branches and no blossom or flowers of any kind. The twigs carry small tight red-brown buds and the first pin-points of green at their tips, the mass across the upper half of the frame with its lower edge ragged, and the lower half of the frame left completely empty and white'),
  frameArt('boughs-fresh', '1536x1024', FRAME_STYLE, 'the boughs of a great elm hanging down from above, seen from below and close to: two or three heavy branches entering from the top edge of the frame and reaching down and sideways, on an afternoon in early June, in full new leaf: dense clusters of bright fresh yellow-green leaves, lighter and cleaner than high summer, with the light coming through them and open gaps between the clusters, the whole mass hanging in the upper two thirds of the frame with its lower edge ragged, and the bottom third of the frame left completely empty and white'),
  frameArt('boughs-fresh-b', '1536x1024', FRAME_STYLE, 'the boughs of a great elm hanging down from above, seen from below and close to: one long heavy branch entering at the top right corner of the frame and reaching down and to the left, a second shorter one above it, on an afternoon in early June, in full new leaf: dense clusters of bright fresh yellow-green leaves, lighter and cleaner than high summer, with the light coming through them and open gaps between the clusters, the mass across the upper half of the frame with its lower edge ragged, and the lower half of the frame left completely empty and white'),
  // ---- the trunks either side: the full height of the frame, the foot
  // at the very bottom, no leaves, as the painting's own trunks are.
  frameArt('trunk-left', '1024x1536', FRAME_STYLE, 'the trunk of one great old elm standing alone, seen from a few paces away: it rises the whole height of the frame and out of the top, leaning very slightly to the left, about a fifth of the frame wide, its bark painted in dots of violet, rust, olive and grey with the afternoon light down one side, two short boughs leaving the trunk near the top of the frame and going up out of it, no leaves anywhere, and at the very bottom of the frame the trunk widens into its root flare and ends; the rest of the frame completely empty and white'),
  frameArt('trunk-right', '1024x1536', FRAME_STYLE, 'the trunk of one great old elm standing alone, seen from a few paces away: it rises the whole height of the frame and out of the top, leaning very slightly to the right, about a fifth of the frame wide, its bark painted in dots of violet, rust, olive and grey with the afternoon light down one side, two short boughs leaving the trunk near the top of the frame and going up out of it, no leaves anywhere, and at the very bottom of the frame the trunk widens into its root flare and ends; the rest of the frame completely empty and white'),
  // ---- the grass at our feet, per season.
  frameArt('turf-summer', '1536x1024', TURF_STYLE, 'mown summer lawn in the late afternoon of August: green and yellow-green grass with dots of blue and violet in its shade, and a very few small clover leaves and daisies scattered wide apart'),
  frameArt('turf-autumn', '1536x1024', TURF_STYLE, 'the lawn in late October: grass gone olive, ochre and dun for the year, with small fallen elm leaves in gold and brown scattered thinly over it, none of them large, the grass showing everywhere between them'),
  frameArt('turf-winter', '1536x1024', TURF_STYLE, 'the lawn under snow in mid January: an even cover of snow painted in dots of white, pale blue, violet and cream, dimpled and uneven, with a few dry grass blades and seed heads standing through it here and there'),
  frameArt('turf-spring', '1536x1024', TURF_STYLE, 'the lawn in late April: fresh new grass in bright yellow-green and green, thin in places with a little bare brown earth showing, and very small white and yellow flowers scattered thinly and wide apart'),
];


/**
 * The elm allée (18x): the two clocks restaged. The ten minutes used to
 * be walked down a fluorescent office corridor, which read as a
 * different project spliced into the park. The park has the same shape
 * in it twice — the path along the shore, and the allée of elms, which
 * is a corridor made of trunks — so the corridor is now that: a gravel
 * path underfoot, trunks for walls, the canopy for a ceiling, the lake
 * glimpsed between the trunks on one side. The argument is untouched;
 * only the building is gone.
 */
const alleeArt = (id, size, preamble, prompt) => ({ id, dir: 'scene-08/allee', size, preamble, prompt });

export const alleeLayers = [
  alleeArt('allee-path', '1024x1024', TURF_STYLE, 'a straight gravel park path running from the bottom of the frame to the top, exactly down the middle and a quarter of the frame wide, its edges soft, with mown late-summer grass either side of it out to the frame\'s edges; the path and the grass must continue unchanged off the top and the bottom so the picture tiles end to end'),
  alleeArt('allee-canopy', '1536x1024', FRAME_STYLE, 'the underside of a great elm\'s canopy seen from directly below on a bright afternoon in late August, filling the whole frame: heavy branches crossing it at angles, dense clusters of green and yellow-green leaves along them with the light coming through, and open gaps of nothing between the clusters left completely white; the branches and leaves running off every edge of the frame'),
  alleeArt('allee-thicket', '1536x1024', FRAME_STYLE, 'a dense thicket of park shrubs and young trees closing off the way ahead, seen front-on from a few paces back, filling the frame from side to side and from the bottom to two thirds of the way up, leaves of every green with a little gold in them, its top edge ragged with leaf tips, and above it the frame left completely empty and white'),
  alleeArt('allee-grass', '1024x1024', TURF_STYLE, 'mown park grass in late August seen from standing height, filling the whole frame evenly: a close even mat of small dots of yellow-green, deep green and violet-grey with a few paler seed heads, no blades drawn singly, no path, no shadow, no flowers; the grass continuing unchanged off all four edges so the picture tiles end to end and side to side'),
  alleeArt('allee-sky', '1536x1024', FRAME_STYLE, 'nothing but the sky on a bright clear afternoon in late August, seen looking out across a park: deep warm blue along the top of the frame softening steadily to a pale luminous blue-white along the bottom, with three or four small flat-bottomed summer clouds low in it, well apart; no land, no trees, no birds, no horizon line, no sun'),
  // v3: whole elms with nothing painted at the foot. v2's trees came
  // standing in their own tuft of bright grass, which read as a pale
  // saucer under every trunk once they were stood on the allée's lawn.
  alleeArt('allee-tree-a', '1024x1536', FRAME_STYLE, 'one whole elm tree standing alone in a park on a bright afternoon in late August, seen from a few paces away: its straight trunk rises from a root flare that meets the very bottom edge of the frame, about a twelfth of the frame wide, its bark painted in dots of violet, rust, olive and grey with the light down its left side, and at two thirds of the way up it forks into boughs that spread wide and carry masses of green and yellow-green leaves out through the top corners of the frame, the leaves in loose clusters with the light through them and gaps between them; no ground, no grass, no plants, no shadow anywhere near its foot, and the rest of the frame completely empty and white'),
  alleeArt('allee-tree-b', '1024x1536', FRAME_STYLE, 'one whole elm tree standing alone in a park on a bright afternoon in late August, seen from a few paces away: its trunk leans very slightly and rises from a root flare that meets the very bottom edge of the frame, about a fourteenth of the frame wide, its bark painted in dots of violet, rust, olive and grey with the light down its right side, one low bough leaving it halfway up and going out of the left edge of the frame, and near the top it opens into a spreading crown of green and gold-green leaves that goes out through the top of the frame, the leaves in loose clusters with gaps between them; no ground, no grass, no plants, no shadow anywhere near its foot, and the rest of the frame completely empty and white'),
  alleeArt('allee-tree-c', '1024x1536', FRAME_STYLE, 'one whole elm tree standing alone in a park on a bright afternoon in late August, seen from a few paces away: a heavy old trunk rising from a broad root flare that meets the very bottom edge of the frame, about a tenth of the frame wide, its bark painted in dots of violet, rust, olive and grey and deeply furrowed, dividing at half its height into three boughs that carry a wide crown of green, yellow-green and a little gold leaf out through the top and both upper sides of the frame, the leaves in loose clusters with sky gaps between them; no ground, no grass, no plants, no shadow anywhere near its foot, and the rest of the frame completely empty and white'),
];


