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
