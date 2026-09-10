#!/usr/bin/env node
/**
 * Turn raw generated images into plates the manifest can place.
 *
 *   node scripts/plates.mjs            # all scenes
 *   node scripts/plates.mjs scene-04   # one scene
 *
 * Raw images come from ChatGPT's image tool (see ASSETS.md and
 * assets/LEDGER.md) as 1536 × 1024 PNGs with alpha. This script owns the
 * pixels — crop, tile, encode — and nothing about *when*: plate sizes and
 * positions stay in src/scenes/manifest.ts, and the numbers here are
 * only about where the useful part of each image sits.
 *
 * Output: public/plates/<scene>/<id>-<variant>.webp, kept under the
 * per-file budget declared below.
 */

import { access, mkdir, stat } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { refSky, refFarShore, refWater, refGround, refTrees, refCheck } from './reference-bands.mjs';

const RAW = 'assets/raw';
const OUT = 'public/plates';
const BUDGET_KB = 700;

// ---------------------------------------------------------------- recipes

/**
 * Scene 04's canopy: the far treeline across the lake. One 1536-wide
 * panel per season, all cropped to the same band so the seasons align
 * when cross-faded. The band is widened into a strip on both sides, and
 * neither flank can be a plain mirror of the panel's edge: the pavilions
 * stand near its left edge and the bandshell reaches to within `trees`
 * columns of its right, so a mirror puts a second bandshell on the shore.
 *
 * Each flank is therefore trees only, from one of two sources:
 *
 * - An extension panel (`ext`, LEDGER session 6c): the same treeline
 *   continuing with nothing built in it, cropped to the same band. Its
 *   right end runs under the panel's left edge and its left end, flipped,
 *   under the panel's right edge.
 * - Until that panel is on disk, the tree-only slice at the panel's right
 *   end, walked out and back (mirrored at each turn, so every join is
 *   seamless). Visible as repeating crowns at the strip's ends.
 *
 * Either way the join is hidden by cross-fading the panel's first and
 * last `seam` columns over the flank beneath. Crowns blend into crowns;
 * the sky above is clear on both sides so the seam has nothing to show.
 */
const CANOPY = {
  // Session 6's drawn treeline fills more of its frame than the
  // photographs did: the band runs from row ~240 to the shoreline at
  // ~850, so the strip is 628 tall and the manifest's plate is taller
  // to match — the trees keep their proportions, not their old size.
  crop: { top: 232, height: 628 },
  flank: 0.45,
  seam: 110,
  /** Columns at the panel's right end with nothing built in them. */
  trees: 144,
};

/**
 * Scene 04's near bank: grass tips at the top, solid ground below. The
 * drawn ground is not quite solid — a few percent of the lawn's pixels
 * come out at half alpha, which lets the lake show through the bank
 * once the camera looks down — so everything below `solidFrom` (a row
 * of the crop) is forced opaque. Nothing there is ever truly clear.
 */
const NEAR_BANK = {
  crop: { top: 140, height: 884 },
  solidFrom: 440,
};

/**
 * Scene 04's far bank: the far shore's waterline as a thin strip — riprap
 * and reeds, transparent above and below. One band for all four seasons
 * so they align; the manifest mirrors it across the plate.
 */
const FAR_BANK = {
  crop: { top: 355, height: 320 },
};

/**
 * Scene 08's corridor: one bay of each surface, generated front-on and
 * flat, cropped to the surface alone (the wall bay comes with a strip of
 * ceiling and floor at its edges) and encoded as-is. The scene tiles each
 * along the corridor with mirrored repeats, so nothing needs to be made
 * seamless here.
 */
const CORRIDOR = {
  // 1536 × 1024 each, one bay edge to edge (session 11: the dotted
  // corridor's wall is drawn without the ceiling and floor strips the
  // illustrated one carried, so nothing is cropped).
  wall: { crop: { top: 0, height: 1024 } },
  ceiling: { crop: { top: 0, height: 1024 } },
  floor: { crop: { top: 0, height: 1024 } },
};

/**
 * Scene 08's fragments: sheets of nine cutouts each on transparent
 * ground, in a 3 × 3 grid. Each cell is trimmed to what is in it and
 * fitted into a square tile with a margin; the tiles are packed into one
 * atlas, `cols` across, in sheet order, so the manifest can address them
 * by index. A cell with nothing in it is skipped.
 */
const FRAGMENTS = {
  grid: 3,
  tile: 512,
  margin: 0.06,
  cols: 6,
};

/**
 * Scene 09's squares: sheets of nine small square images each, in a
 * 3 × 3 grid with thin gaps, no alpha. Each cell is cut by thirds, inset
 * past the gap, resized to a tile and packed into one atlas per month,
 * `cols` across, in sheet order. The same-day month has one sheet and
 * reuses its nine; the vivid month's four sheets follow its readings.
 */
const SQUARES = {
  grid: 3,
  inset: 0.045,
  tile: 384,
  cols: 6,
};

/**
 * A cutout: one object on transparent ground, trimmed to what is
 * actually in it so the plate's world size is the object's own and
 * nothing is spent on empty pixels. The scene places it by eye.
 */
const CUTOUT = { pad: 4 };

/**
 * The park (LEDGER session 10): the reference's pointillist Lake Harriet
 * in layers, generated through scripts/generate.mjs on flat white and
 * keyed here. Strips are trimmed to what is in them; sheets are cut by
 * cell into atlases; the lawn is a tile; the rest are cutouts.
 */
const PARK = {
  strip: { pad: 2 },
  // Every season of a strip is cut to the same rows, so the year's
  // cross-fades hold their composition and the plate one height.
  band: {
    'far-shore': [300, 552],
  },
};

const SCENES = {
  // The painting taken apart (session 18, scripts/reference-layers.mjs):
  // whole-frame bands cut from the quiet park, and every element keyed
  // and trimmed. The composition places each by its box in the painting.
  'scene-04/ref': [
    // ('check' draws the boundaries and the matte over the quiet park,
    // for the eye; add it to the list when the bands need looking at.)
    // The bands are cut in the wide frame (18i): the painting set into
    // its outpainted continuation, twice the size each way.
    ...['sky', 'far-shore', 'water', 'ground', 'trees'].map((id) => ({
      id,
      raw: ['quiet-park-v1.png', 'empty-view-v2.png', 'wide-park-v8.png'],
      recipe: `ref-${id}`,
      budgetKb: id === 'ground' ? 1500 : 1000,
      lines: 'keep',
      grade: 'assets/raw/park/reference.png',
    })),
    // The seasons (18j): the same bands from each season's edits, cut
    // along the summer's lines.
    ...['autumn', 'winter', 'spring'].flatMap((season) =>
      ['sky', 'far-shore', 'water', 'ground', 'trees'].map((id) => ({
        id,
        variant: season,
        // The elms' leaves for this season come from the bough painted
        // for it (18w); their shape stays the painting's own.
        leafArt: id === 'trees' ? `assets/raw/scene-04/frame/boughs-${season}-v1.keyed.png` : undefined,
        // (the summer's empty view rides along only so the pair is a pair;
        // a season takes the summer's matte and base, see reference-bands)
        raw: [`quiet-${season}-v1.png`, 'empty-view-v2.png', 'wide-park-v8.png'],
        recipe: `ref-${id}`,
        budgetKb: id === 'ground' ? 1500 : 1000,
        lines: 'summer',
        season,
        seasonOf: 'assets/raw/scene-04/ref/quiet-park-v1.png',
        grade: 'assets/raw/park/reference.png',
      })),
    ),
    ...[
      'reader', 'couple', 'man-dog', 'bicycle', 'sitters-lawn', 'straw-hat', 'lying-man', 'family', 'chairs',
      'jogger', 'edge-family', 'wall-group', 'standing-group', 'dog-walkers', 'backpack-walker', 'far-right',
      'sailboat', 'sails-mid', 'sailboat-right', 'sails-far',
    ].map((id) => ({
      id,
      raw: `${id}-v${{ couple: 2, bicycle: 2, 'standing-group': 2 }[id] ?? 1}.png`,
      recipe: 'cutout',
      key: true,
      alphaQuality: 100,
      // Pockets for the boats too, but only big ones: the paper under the
      // boom goes, and a sail's bright patch, paper-pale for a few hundred
      // pixels, stays (18g).
      pockets: true,
      pocketMin: /sail/.test(id) ? 6000 : undefined,
      strict: /sail/.test(id),
      ground: !/sail/.test(id),
      // The woman on the wall was asked away (18g); the children stay.
      keep: id === 'wall-group' ? [0.5, 1] : undefined,
      // The reader's black bag, asked away (18g): the piece at the lower right.
      drop: id === 'reader' ? [0.7, 0.6, 1, 1] : undefined,
      // The boats' reflections ease away below the hull.
      fade: /sail/.test(id) ? [0.62, 0.25] : undefined,
    })),
  ],
  // New people for every season (18r): one cutout each, keyed like the
  // painting's elements.
  // The frame beyond the painting (18t): boughs overhead, trunks either
  // side, the grass at our feet — the pull-back's own foreground, so the
  // elms never end in a straight cut and the lawn never runs out.
  'scene-04/frame': [
    ...['boughs-summer', 'boughs-autumn', 'boughs-winter', 'boughs-spring', 'boughs-summer-b', 'boughs-autumn-b', 'boughs-winter-b', 'boughs-spring-b', 'boughs-turning', 'boughs-turning-b', 'boughs-late-autumn', 'boughs-late-autumn-b', 'boughs-budding', 'boughs-budding-b', 'boughs-fresh', 'boughs-fresh-b', 'trunk-left', 'trunk-right'].map((id) => ({
      id,
      raw: newest('scene-04/frame', id),
      recipe: 'cutout',
      key: true,
      alphaQuality: 100,
      budgetKb: 900,
      // January's boughs carry snow along their tops: white on white, so
      // the paper is judged against the border's own colour and no
      // enclosed patch is taken for a hole.
      // Only January's boughs carry snow along their tops — white on
      // white — and need the paper judged against the border's own
      // colour. The bare stages key like any other leaf (18v).
      pockets: !/winter/.test(id),
      strict: /winter/.test(id),
      ground: false,
      whole: true,
    })),
    ...['summer', 'autumn', 'winter', 'spring'].map((season) => ({
      id: `turf-${season}`,
      raw: `turf-${season}-v2.png`,
      recipe: 'turf',
      budgetKb: 700,
      alphaQuality: 90,
      // the painting's own nearest lawn, in the wide frame's pixels
      match: {
        file: `public/plates/scene-04/ref/ground${season === 'summer' ? '' : `-${season}`}.webp`,
        box: { left: 900, top: 1370, width: 1200, height: 160 },
      },
    })),
  ],
  'scene-04/people': [
    ...['frisbee-pair', 'sunbather', 'ice-cream-kids', 'guitar', 'grandparents', 'kayak', 'raker', 'leaf-pile-kids', 'coffee-walkers', 'photographer', 'pumpkin-family', 'autumn-dog', 'bench-reader', 'autumn-jogger', 'skaters', 'sledders', 'snowman-builders', 'winter-walkers', 'hockey-kids', 'winter-dog', 'thermos-pair', 'ice-fisher', 'kite-flyer', 'geese-kids', 'spring-picnic', 'bike-walker', 'blossom-photo', 'stroller-pair', 'spring-dog', 'painter', 'book-club', 'toddler-run', 'yoga-mat', 'runners-pair', 'rollerblader', 'paddleboard', 'chess-pair', 'leaf-collector', 'cyclist-autumn', 'sketcher', 'rowers', 'stroller-autumn', 'snow-angel', 'shoveller', 'skate-child', 'bird-feeder', 'cross-country', 'snowball-kids', 'tulip-photo', 'joggers-spring', 'reading-blanket', 'ducklings', 'skateboarder', 'family-walk'].map((id) => ({
      id,
      raw: `${id}-v1.png`,
      recipe: 'cutout',
      key: true,
      alphaQuality: 100,
      // White garments and a snowman read as enclosed paper: no pockets
      // for the figures that wear white.
      pockets: !/snowman|winter-dog|grandparents|sledders|snow-angel|snowball|shoveller|bird-feeder|ducklings/.test(id),
      strict: /kayak|skaters|hockey|ice-fisher|snowman|winter-dog|grandparents|sledders|snow-angel|snowball|shoveller|bird-feeder|paddleboard|rowers|ducklings|skate-child/.test(id),
      pocketMin: /kayak|skaters|hockey|ice-fisher|paddleboard|rowers|ducklings|skate-child/.test(id) ? 6000 : undefined,
      ground: !/kayak|skaters|hockey|ice-fisher|paddleboard|rowers|ducklings|skate-child/.test(id),
      fade: /kayak|rowers|paddleboard|ducklings/.test(id) ? [0.62, 0.25] : undefined,
    })),
  ],
  'scene-04/park': [
    { id: 'far-shore', variant: 'late-summer', raw: 'far-shore-thin-v1.png', recipe: 'strip', key: true },
    { id: 'far-shore', variant: 'autumn', raw: 'far-shore-autumn-v2.png', recipe: 'strip', key: true },
    { id: 'far-shore', variant: 'winter', raw: 'far-shore-winter-v2.png', recipe: 'strip', key: true },
    { id: 'far-shore', variant: 'spring', raw: 'far-shore-spring-v2.png', recipe: 'strip', key: true },
    // One wall for all four seasons: every seasonal edit of it grew
    // trees above the wall, and a stone wall does not change anyway.
    { id: 'shoreline', raw: 'shoreline-v3.png', recipe: 'strip', key: true },
    { id: 'lawn', variant: 'late-summer', raw: 'lawn-v1.png', recipe: 'plain' },
    { id: 'lawn', variant: 'autumn', raw: 'lawn-autumn-v2.png', recipe: 'plain' },
    { id: 'lawn', variant: 'winter', raw: 'lawn-winter-v2.png', recipe: 'plain' },
    { id: 'lawn', variant: 'spring', raw: 'lawn-spring-v3.png', recipe: 'plain' },
    // The framing card keeps its whole canvas in every season, so the
    // trunks stand in the same place whatever hangs from them.
    { id: 'trees', variant: 'late-summer', raw: 'trees-v2.png', recipe: 'plain', key: true },
    { id: 'trees', variant: 'autumn', raw: 'trees-autumn-v2.png', recipe: 'plain', key: true },
    { id: 'trees', variant: 'winter', raw: 'trees-winter-v2.png', recipe: 'plain', key: true },
    { id: 'trees', variant: 'spring', raw: 'trees-spring-v2.png', recipe: 'plain', key: true },
    { id: 'foreground', raw: 'foreground-v1.png', recipe: 'cutout', key: true },
    // Two sheets of sitters into one atlas of eighteen; the world places
    // each group at most once, so nobody is on the lawn twice.
    { id: 'sitters', raw: ['sitters-v2.png', 'sitters-b-v2.png'], recipe: 'fragments', key: true, align: 'bottom', grid: [3, 3], cols: 3 },
    { id: 'boats', raw: ['boats-v1.png'], recipe: 'fragments', key: true, align: 'bottom', grid: [3, 3], cols: 3 },
    // The crowd through the year (LEDGER 10d): who is in the park in
    // each season, a sheet of nine each.
    { id: 'sitters-autumn', raw: ['sitters-autumn-v2.png'], recipe: 'fragments', key: true, align: 'bottom', grid: [3, 3], cols: 3 },
    { id: 'movers-autumn', raw: ['movers-autumn-v1.png', 'movers-autumn-stride-v1.png'], recipe: 'fragments', key: true, align: 'bottom', grid: [3, 3], cols: 6, frames: 2 },
    { id: 'ice-winter', raw: ['ice-winter-v2.png'], recipe: 'fragments', key: true, align: 'bottom', grid: [3, 3], cols: 3 },
    { id: 'movers-winter', raw: ['movers-winter-v1.png', 'movers-winter-stride-v1.png'], recipe: 'fragments', key: true, align: 'bottom', grid: [3, 3], cols: 6, frames: 2 },
    { id: 'sitters-spring', raw: ['sitters-spring-v2.png'], recipe: 'fragments', key: true, align: 'bottom', grid: [3, 3], cols: 3 },
    { id: 'movers-spring', raw: ['movers-spring-v1.png', 'movers-spring-stride-v1.png'], recipe: 'fragments', key: true, align: 'bottom', grid: [3, 3], cols: 6, frames: 2 },
    // The second walkers sheet came as three rows with the third cut off
    // by the frame; its top two rows are kept and cut on the first's grid.
    // Then the same twelve in the other phase of their stride, as the
    // second twelve cells: frame two of each is its cell plus twelve.
    {
      id: 'movers',
      raw: ['movers-v1.png', 'movers-b-v1.png', 'movers-stride-v1.png', 'movers-b-stride-v1.png'],
      keep: { 'movers-b-v1.png': 2 / 3, 'movers-b-stride-v1.png': 2 / 3 },
      recipe: 'fragments',
      key: true,
      align: 'bottom',
      grid: [3, 2],
      cols: 6,
      frames: 2,
    },
  ],
  'scene-09': [
    { id: 'days-same', raw: ['days-same-v3.png'], recipe: 'squares' },
    {
      id: 'days-vivid',
      // Thirty dotted squares compress badly; this one atlas may weigh
      // more than the budget rather than go to the ladder's foot.
      budgetKb: 1100,
      raw: ['days-vivid-a-v2.png', 'days-vivid-b-v2.png', 'days-vivid-c-v2.png', 'days-vivid-d-v2.png'],
      recipe: 'squares',
      count: 30,
    },
  ],
  'scene-08': [
    { id: 'corridor-wall', raw: 'corridor-wall-v2.png', recipe: 'corridor', surface: 'wall' },
    { id: 'corridor-ceiling', raw: 'corridor-ceiling-v3.png', recipe: 'corridor', surface: 'ceiling' },
    { id: 'corridor-floor', raw: 'corridor-floor-v2.png', recipe: 'corridor', surface: 'floor' },
    // Drawn on white now, so keyed; a fragment is one thing alone.
    { id: 'fragments', raw: ['fragments-a-v3.png', 'fragments-b-v2.png'], recipe: 'fragments', key: true },
  ],
};

// ----------------------------------------------------------------- steps

async function canopyStrip(file, extFile) {
  const meta = await sharp(file).metadata();
  const w = meta.width;
  const { top, height: h } = CANOPY.crop;
  const { seam } = CANOPY;
  const flankW = Math.round(w * CANOPY.flank);
  const cropBand = (f) =>
    sharp(f).extract({ left: 0, top, width: w, height: h }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const band = await cropBand(file);
  const px = band.data;
  const ext = extFile ? await alignedBand(extFile, file, w, top, h) : null;
  const W = flankW * 2 + w;
  const out = Buffer.alloc(W * h * 4);
  const get = (x, y) => (y * w + x) * 4;
  const put = (x, y) => (y * W + x) * 4;
  const copy = (src, sx, sy, sw, dx, dy) => {
    const o = (sy * sw + sx) * 4;
    src.copy(out, put(dx, dy), o, o + 4);
  };

  // The i-th column out from the panel's right edge, walking the tree-only
  // slice out and back: w-1, w-2, … w-R, w-R, … w-1, w-1, w-2 …
  const R = CANOPY.trees;
  const treeCol = (i) => {
    const k = i % (2 * R);
    return k < R ? w - 1 - k : w - 2 * R + k;
  };
  // Source pixel for the i-th flank column out from the panel's left edge,
  // and from its right. With an extension panel the flank is that panel's
  // own end, unflipped on the left and flipped on the right.
  const leftSrc = (i) => (ext ? [ext.data, ext.width - 1 - i, ext.width] : [px, treeCol(i), w]);
  const rightSrc = (i) => (ext ? [ext.data, ext.width - 1 - i, ext.width] : [px, treeCol(i), w]);

  for (let y = 0; y < h; y++) {
    // Flanks first, each running `seam` columns under the panel's edge so
    // the cross-fade has trees behind it.
    for (let i = 0; i < flankW + seam; i++) {
      const [ls, lc, lw] = leftSrc(i);
      copy(ls, lc, y, lw, flankW + seam - 1 - i, y);
      const [rs, rc, rw] = rightSrc(i);
      copy(rs, rc, y, rw, flankW + w - seam + i, y);
    }
    // Then the panel, its alpha ramped over its first and last `seam` columns.
    for (let x = 0; x < w; x++) {
      const s = get(x, y);
      const d = put(flankW + x, y);
      const edge = Math.min(x, w - 1 - x);
      const t = edge < seam ? (edge + 0.5) / seam : 1;
      const sa = (px[s + 3] / 255) * (t * t * (3 - 2 * t));
      const da = edge < seam ? out[d + 3] / 255 : 0;
      const oa = sa + da * (1 - sa);
      if (oa <= 0) {
        out[d] = out[d + 1] = out[d + 2] = out[d + 3] = 0;
        continue;
      }
      for (let c = 0; c < 3; c++) {
        out[d + c] = Math.round((px[s + c] * sa + out[d + c] * da * (1 - sa)) / oa);
      }
      out[d + 3] = Math.round(oa * 255);
    }
  }
  return sharp(out, { raw: { width: W, height: h, channels: 4 } });
}

/**
 * A panel generated as the continuation of another drifts in scale and
 * horizon (LEDGER, session 1, shot 3; session 6c likewise): its trees come
 * out a tenth to a sixth larger and its shoreline lower. So before an
 * extension is cropped it is measured — the first row with anything in it
 * to the last row that is solid ground — and resized uniformly until that
 * band is the master's height, then shifted so the two shorelines share a
 * row. Then the master's own crop applies to it. Returns the cropped
 * band's pixels, RGBA, at the panel's width, or wider if the extension
 * needed enlarging; only its ends are read.
 */
async function alignedBand(extFile, masterFile, w, top, h) {
  const measure = async (f) => {
    const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let first = -1;
    let shore = -1;
    for (let y = 0; y < info.height; y++) {
      let any = false;
      let all = true;
      for (let x = 0; x < info.width; x++) {
        const a = data[(y * info.width + x) * 4 + 3];
        if (a > 8) any = true;
        if (a < 250) all = false;
      }
      if (any && first < 0) first = y;
      if (all) shore = y;
    }
    return { first, shore, width: info.width };
  };
  const m = await measure(masterFile);
  const e = await measure(extFile);
  const scale = (m.shore - m.first) / (e.shore - e.first);
  const width = Math.max(w, Math.round(e.width * scale));
  const resized = sharp(extFile).resize({ width, kernel: 'lanczos3' });
  const meta = await resized.clone().toBuffer({ resolveWithObject: true });
  const rh = meta.info.height;
  // Where the master's crop begins, measured from the extension's shoreline.
  const cropTop = Math.round(e.shore * (width / e.width) - (m.shore - top));
  const above = Math.max(0, -cropTop);
  const below = Math.max(0, cropTop + h - rh);
  const { data } = await sharp(meta.data)
    .extend({ top: above, bottom: below, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extract({ left: 0, top: cropTop + above, width, height: h })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  console.log(
    `  ${path.basename(extFile)}: band ${e.first}–${e.shore} scaled ×${scale.toFixed(3)} to the master's ${m.first}–${m.shore}`,
  );
  return { data, width };
}

async function nearBank(file) {
  const meta = await sharp(file).metadata();
  const { top, height } = NEAR_BANK.crop;
  const { data, info } = await sharp(file)
    .extract({ left: 0, top, width: meta.width, height })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  for (let y = NEAR_BANK.solidFrom; y < info.height; y++) {
    for (let x = 0; x < w; x++) data[(y * w + x) * 4 + 3] = 255;
  }
  return sharp(data, { raw: { width: w, height: info.height, channels: 4 } });
}

async function farBank(file) {
  const meta = await sharp(file).metadata();
  const { top, height } = FAR_BANK.crop;
  return sharp(file).extract({ left: 0, top, width: meta.width, height });
}

async function corridorBay(file, _ext, p) {
  const meta = await sharp(file).metadata();
  const { top, height } = CORRIDOR[p.surface].crop;
  return sharp(file).extract({ left: 0, top, width: meta.width, height: Math.min(height, meta.height - top) });
}

/**
 * A cell of a sheet as its own RGBA buffer, with the blobs that are not
 * its own cleared: connected regions of alpha that touch any edge of the
 * cell and are small beside the largest are a neighbour's overflow —
 * chair legs from above, a shoulder from the side — and go. A group's
 * own separate things — a bottle, a paddle, a gosling — sit inside the
 * cell and stay.
 */
function ownBlobs(data, width, x0, y0, w, h) {
  const cell = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    data.copy(cell, y * w * 4, ((y0 + y) * width + x0) * 4, ((y0 + y) * width + x0 + w) * 4);
  }
  const label = new Int32Array(w * h);
  const blobs = [];
  const queue = new Int32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (label[i] || cell[i * 4 + 3] <= 12) continue;
    const id = blobs.length + 1;
    let head = 0;
    let tail = 0;
    queue[tail++] = i;
    label[i] = id;
    const blob = { id, area: 0, edge: false };
    while (head < tail) {
      const j = queue[head++];
      blob.area++;
      const x = j % w;
      const y = (j - x) / w;
      if (y === 0 || y === h - 1 || x === 0 || x === w - 1) blob.edge = true;
      const near = [];
      if (x > 0) near.push(j - 1);
      if (x < w - 1) near.push(j + 1);
      if (y > 0) near.push(j - w);
      if (y < h - 1) near.push(j + w);
      for (const k of near) {
        if (!label[k] && cell[k * 4 + 3] > 12) {
          label[k] = id;
          queue[tail++] = k;
        }
      }
    }
    blobs.push(blob);
  }
  const largest = Math.max(0, ...blobs.map((b) => b.area));
  const drop = new Set(blobs.filter((b) => b.edge && b.area < largest * 0.3).map((b) => b.id));
  if (drop.size) {
    for (let i = 0; i < w * h; i++) if (drop.has(label[i])) cell[i * 4 + 3] = 0;
  }
  return cell;
}

/** The tight box of everything with alpha in a raw RGBA buffer region. */
function alphaBox(data, width, x0, y0, w, h) {
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[((y0 + y) * width + x0 + x) * 4 + 3] > 12) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return maxX < 0 ? null : { left: x0 + minX, top: y0 + minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

async function fragmentAtlas(files, p = {}) {
  const { tile, margin } = FRAGMENTS;
  const cols = p.cols ?? FRAGMENTS.cols;
  const [gridX, gridY] = Array.isArray(p.grid) ? p.grid : [p.grid ?? FRAGMENTS.grid, p.grid ?? FRAGMENTS.grid];
  const inner = Math.round(tile * (1 - margin * 2));
  // First every cell's own contents and its box; then one scale for the
  // whole atlas, the largest cutout filling a tile, so a wide group and a
  // lone figure keep the proportions they were drawn at side by side.
  const cells = [];
  for (const file of files) {
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const cw = Math.floor(info.width / gridX);
    const ch = Math.floor(info.height / gridY);
    for (let r = 0; r < gridY; r++) {
      for (let c = 0; c < gridX; c++) {
        const cell = ownBlobs(data, info.width, c * cw, r * ch, cw, ch);
        const box = alphaBox(cell, cw, 0, 0, cw, ch);
        if (!box || box.width < cw * 0.1 || box.height < ch * 0.1) {
          console.log(`  ${path.basename(file)} cell ${r},${c}: empty, skipped`);
          continue;
        }
        cells.push({ cell, cw, ch, box });
      }
    }
  }
  const maxDim = Math.max(...cells.map((k) => Math.max(k.box.width, k.box.height)));
  const factor = inner / maxDim;
  // A sheet with a second frame per figure: each second frame is scaled
  // to its first's height, so a figure does not change size as it steps.
  const per = p.frames === 2 ? cells.length / 2 : 0;
  const tiles = [];
  for (let i = 0; i < cells.length; i++) {
    const k = cells[i];
    const own = per && i >= per ? cells[i - per].box.height / k.box.height : 1;
    const cut = await sharp(k.cell, { raw: { width: k.cw, height: k.ch, channels: 4 } })
      .extract(k.box)
      .resize({
        width: Math.max(1, Math.round(k.box.width * factor * own)),
        height: Math.max(1, Math.round(k.box.height * factor * own)),
      })
      .png()
      .toBuffer({ resolveWithObject: true });
    // Centred, or stood on a common baseline so a sheet of figures
    // all have their feet at the tile's foot.
    tiles.push({
      input: cut.data,
      left: Math.round((tile - cut.info.width) / 2),
      top: p.align === 'bottom' ? tile - Math.round(tile * margin) - cut.info.height : Math.round((tile - cut.info.height) / 2),
    });
  }
  const rows = Math.ceil(tiles.length / cols);
  const composite = tiles.map((t, i) => ({
    input: t.input,
    left: (i % cols) * tile + t.left,
    top: Math.floor(i / cols) * tile + t.top,
  }));
  console.log(`  ${tiles.length} fragments into a ${cols} × ${rows} atlas, the largest ${maxDim} px across a tile`);
  return sharp({
    create: { width: cols * tile, height: rows * tile, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite(composite);
}

/**
 * Key the paper out of a layer drawn on flat white. The paper is found
 * by flooding from the image's borders through near-white pixels, so a
 * white shirt or sail enclosed by colour stays. Then the edge: every
 * drawn pixel that touches paper was blended with it when it was drawn
 * — a pale ring one pixel wide, half as saturated as the colour inside
 * it — so its coverage is read back from where it sits between the
 * paper and the colour behind it, its colour unmixed from the paper,
 * and the paper itself left clear. The cutout's edge is then its own
 * anti-aliasing, choked a pixel in, with no halo to show against water
 * or night. The keyed image is written beside the raw as a PNG the
 * recipes then read.
 */
async function keyWhite(file, opts = {}) {
  const out = file.replace(/\.png$/, '.keyed.png');
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  // A sail is cream on cream paper, and the paper itself is a different
  // cream from one image to the next: the boats read paper strictly, as
  // whatever is within a few points of the border's own colour, and
  // keep the warmer sail. Everyone else reads it as the flat near-white
  // the model usually leaves.
  const P0 = [0, 0, 0];
  {
    let n = 0;
    const take = (i) => { for (let c = 0; c < 3; c++) P0[c] += data[i * 4 + c]; n++; };
    for (let x = 0; x < w; x++) { take(x); take(w + x); take((h - 1) * w + x); take((h - 2) * w + x); }
    for (let y = 0; y < h; y++) { take(y * w); take(y * w + 1); take(y * w + w - 1); take(y * w + w - 2); }
    for (let c = 0; c < 3; c++) P0[c] /= n;
  }
  const paper = opts.strict
    ? (i) => Math.abs(data[i * 4] - P0[0]) <= 20 && Math.abs(data[i * 4 + 1] - P0[1]) <= 20 && Math.abs(data[i * 4 + 2] - P0[2]) <= 20
    : (i) => {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        return r >= 222 && g >= 222 && b >= 218 && Math.max(r, g, b) - Math.min(r, g, b) <= 26;
      };
  const bg = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  const push = (i) => {
    if (!bg[i] && paper(i)) {
      bg[i] = 1;
      queue[tail++] = i;
    }
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  const flood = () => {
    while (head < tail) {
      const i = queue[head++];
      const x = i % w;
      if (x > 0) push(i - 1);
      if (x < w - 1) push(i + 1);
      if (i >= w) push(i - w);
      if (i < (h - 1) * w) push(i + w);
    }
  };
  flood();
  const border = tail;
  // Pockets (session 18): paper the flood cannot reach — between an arm
  // and a body, under a chair — is paper all the same. Any run of paper
  // pixels bigger than a few dots joins the background; a white shirt is
  // dots of colour and never reads as paper for forty pixels together.
  // A sail is an enclosed white shape too: the boats opt out.
  if (opts.pockets !== false) {
    const seen = new Uint8Array(w * h);
    const pocket = [];
    for (let i = 0; i < w * h; i++) {
      if (bg[i] || seen[i] || !paper(i)) continue;
      pocket.length = 0;
      seen[i] = 1;
      pocket.push(i);
      for (let k = 0; k < pocket.length; k++) {
        const j = pocket[k];
        const x = j % w;
        const step = (n) => {
          if (!seen[n] && paper(n)) {
            seen[n] = 1;
            pocket.push(n);
          }
        };
        if (x > 0) step(j - 1);
        if (x < w - 1) step(j + 1);
        if (j >= w) step(j - w);
        if (j < (h - 1) * w) step(j + w);
      }
      if (pocket.length >= (opts.pocketMin ?? 40)) for (const j of pocket) { bg[j] = 1; queue[tail++] = j; }
    }
  }
  // The ground the model puts under the feet (session 18): asked for
  // nothing under a figure it still paints a pale blue-white contact
  // shadow there. In the lowest sixth of what is drawn, pale, cool,
  // evenly pale pixels reachable from the background are ground, not
  // figure — feet are warm, shoes are dark, and a blanket is dots.
  // A boat's reflection is pale and cool and under it: the boats opt out.
  if (opts.ground !== false) {
    let top = h, bottom = -1;
    for (let i = 0; i < w * h; i++) if (!bg[i]) { const y = (i / w) | 0; if (y < top) top = y; if (y > bottom) bottom = y; }
    const bandTop = bottom - Math.round((bottom - top) * 0.17);
    const lum = new Float32Array(w * h);
    const sat = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      lum[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      sat[i] = mx ? (mx - mn) / mx : 0;
    }
    const groundish = (i) => {
      const y = (i / w) | 0;
      if (y < bandTop) return false;
      const x = i % w;
      const r = data[i * 4], b = data[i * 4 + 2];
      if (lum[i] < 0.68 || b < r - 15) return false;
      let l = 0, sN = 0, n = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = yy * w + xx;
        if (bg[j]) { l += 1; n++; continue; }
        l += lum[j]; sN += sat[j]; n++;
      }
      return l / n >= 0.8 && sN / n <= 0.26;
    };
    const pushG = (i) => { if (!bg[i] && groundish(i)) { bg[i] = 1; queue[tail++] = i; } };
    for (let k = 0; k < tail; k++) {
      const i = queue[k];
      const x = i % w;
      if (x > 0) pushG(i - 1);
      if (x < w - 1) pushG(i + 1);
      if (i >= w) pushG(i - w);
      if (i < (h - 1) * w) pushG(i + w);
    }
    // What the window test leaves against the shoes — a sliver of the
    // same pale ground, too close to the leather to read as even — is
    // taken by a bounded creep: three pixels at most, pale and cool.
    const sliver = (i) => {
      const y = (i / w) | 0;
      if (y < bandTop) return false;
      const r = data[i * 4], b = data[i * 4 + 2];
      return lum[i] >= 0.72 && b >= r - 15 && sat[i] <= 0.35;
    };
    for (let pass = 0; pass < 3; pass++) {
      const from = tail;
      const was = new Uint8Array(bg);
      for (let i = 0; i < w * h; i++) {
        if (was[i] || !sliver(i)) continue;
        const x = i % w;
        if ((x > 0 && was[i - 1]) || (x < w - 1 && was[i + 1]) || (i >= w && was[i - w]) || (i < (h - 1) * w && was[i + w])) {
          bg[i] = 1;
          queue[tail++] = i;
        }
      }
      if (tail === from) break;
    }
  }
  // Specks (session 18): what is drawn but not part of anything — a
  // stray mark, a shred of shadow — goes. A piece smaller than 0.15 % of
  // the largest piece is a speck; a hat, a bag, a bottle is not.
  {
    const label = new Int32Array(w * h).fill(-1);
    const sizes = [];
    const stack = [];
    for (let i = 0; i < w * h; i++) {
      if (bg[i] || label[i] >= 0) continue;
      const id = sizes.length;
      let size = 0;
      stack.length = 0;
      stack.push(i);
      label[i] = id;
      while (stack.length) {
        const j = stack.pop();
        size++;
        const x = j % w;
        const step = (n) => { if (!bg[n] && label[n] < 0) { label[n] = id; stack.push(n); } };
        if (x > 0) step(j - 1);
        if (x < w - 1) step(j + 1);
        if (j >= w) step(j - w);
        if (j < (h - 1) * w) step(j + w);
      }
      sizes.push(size);
    }
    const largest = Math.max(0, ...sizes);
    let dropped = 0;
    for (let i = 0; i < w * h; i++) {
      if (bg[i]) continue;
      if (sizes[label[i]] < largest * 0.0015) { bg[i] = 1; dropped++; }
    }
    if (dropped) console.log(`  ${dropped} px of specks dropped`);
  }
  // A boat's sail is outlined by a mast a pixel wide; where the outline
  // has a gap the flood gets in and eats the sail from inside. For the
  // plates that opt out of pockets, any cleared region that does not
  // touch the border is not paper but the inside of something: kept.
  if (opts.pockets === false) {
    const seen = new Uint8Array(w * h);
    const comp = [];
    let kept = 0;
    for (let i = 0; i < w * h; i++) {
      if (!bg[i] || seen[i]) continue;
      comp.length = 0;
      seen[i] = 1;
      comp.push(i);
      let touches = false;
      for (let k = 0; k < comp.length; k++) {
        const j = comp[k];
        const x = j % w;
        const y = (j / w) | 0;
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touches = true;
        const step = (n) => { if (bg[n] && !seen[n]) { seen[n] = 1; comp.push(n); } };
        if (x > 0) step(j - 1);
        if (x < w - 1) step(j + 1);
        if (j >= w) step(j - w);
        if (j < (h - 1) * w) step(j + w);
      }
      if (!touches) { for (const j of comp) bg[j] = 0; kept += comp.length; }
    }
    if (kept) console.log(`  ${kept} px inside the outline kept`);
  }
  // Strictly keyed plates close their pinholes: a sail's brightest dots
  // read as paper, and a hole two pixels wide is filled from around it.
  if (opts.strict) {
    const grown = new Uint8Array(w * h);
    const r = 2;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let any = 0;
      for (let dy = -r; dy <= r && !any; dy++) for (let dx = -r; dx <= r; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < w && yy < h && !bg[yy * w + xx]) { any = 1; break; }
      }
      grown[y * w + x] = any;
    }
    const closed = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let all = 1;
      for (let dy = -r; dy <= r && all; dy++) for (let dx = -r; dx <= r; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < w && yy < h && !grown[yy * w + xx]) { all = 0; break; }
      }
      closed[y * w + x] = all;
    }
    let filled = 0;
    for (let i = 0; i < w * h; i++) if (bg[i] && closed[i]) { bg[i] = 0; filled++; }
    if (filled) console.log(`  ${filled} px of pinholes closed`);
  }
  // The paper's own colour, measured over what the flood found: what
  // the edge was blended with.
  const P = [255, 255, 255];
  if (border > 0) {
    const sum = [0, 0, 0];
    for (let k = 0; k < border; k++) for (let c = 0; c < 3; c++) sum[c] += data[queue[k] * 4 + c];
    for (let c = 0; c < 3; c++) P[c] = sum[c] / border;
  }
  // The ring: drawn pixels with paper against them.
  const ring = new Uint8Array(w * h);
  const around = (x, y, fn) => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        fn(yy * w + xx);
      }
    }
  };
  let edge = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (bg[i]) continue;
      around(x, y, (j) => {
        if (bg[j]) ring[i] = 1;
      });
      if (ring[i]) edge++;
    }
  }
  // At four times the painting's scale the paper's blend runs two
  // pixels in (session 18): the pixels touching the ring are a second
  // ring, unmixed the same way against the drawn colour beyond them.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (bg[i] || ring[i]) continue;
      around(x, y, (j) => {
        if (ring[j] === 1) ring[i] = 2;
      });
      if (ring[i]) edge++;
    }
  }
  const outData = Buffer.alloc(w * h * 4);
  const C = [0, 0, 0];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const o = i * 4;
      if (bg[i]) continue; // clear
      outData[o] = data[o];
      outData[o + 1] = data[o + 1];
      outData[o + 2] = data[o + 2];
      outData[o + 3] = 255;
      if (!ring[i]) continue;
      // The colour behind the blend: the drawn pixels beside it that are
      // not themselves on the edge. A stroke one pixel wide has none,
      // and is kept as drawn rather than guessed at.
      let n = 0;
      C[0] = C[1] = C[2] = 0;
      around(x, y, (j) => {
        if (bg[j] || ring[j]) return;
        n++;
        for (let c = 0; c < 3; c++) C[c] += data[j * 4 + c];
      });
      // The second ring reads past the first, two pixels out.
      if (n === 0 && ring[i] === 2) {
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const j = yy * w + xx;
          if (bg[j] || ring[j]) continue;
          n++;
          for (let c = 0; c < 3; c++) C[c] += data[j * 4 + c];
        }
      }
      if (n === 0) continue;
      for (let c = 0; c < 3; c++) C[c] /= n;
      // Coverage: where the pixel sits between paper and colour, read on
      // the channel with the most room between them. A colour near the
      // paper's own leaves nothing to read, and the pixel stands.
      let room = -1;
      let a = 1;
      for (let c = 0; c < 3; c++) {
        const r = P[c] - C[c];
        if (r > room) {
          room = r;
          a = (P[c] - data[o + c]) / r;
        }
      }
      if (room < 24) continue;
      a = Math.max(0, Math.min(1, a));
      // Inside the second ring only a clear paper share counts: a pixel
      // read as nine-tenths covered is the drawing, not the blend.
      if (ring[i] === 2 && a > 0.88) continue;
      if (a <= 0.02) {
        outData[o + 3] = 0;
        continue;
      }
      // Unmix: what was drawn, with the paper's share taken out; leaned
      // toward the colour behind it as the pixel thins and the unmixing
      // grows noisy.
      for (let c = 0; c < 3; c++) {
        const un = (data[o + c] - (1 - a) * P[c]) / a;
        const v = C[c] + (un - C[c]) * a;
        outData[o + c] = Math.max(0, Math.min(255, Math.round(v)));
      }
      outData[o + 3] = Math.round(a * 255);
    }
  }
  // Under the clear pixels beside an edge, the edge's own colour: a
  // texture is filtered across its alpha, and black under the paper
  // would darken every edge by a hair.
  for (let pass = 0; pass < 3; pass++) {
    const src = Buffer.from(outData);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const o = i * 4;
        if (src[o + 3] !== 0 || (src[o] | src[o + 1] | src[o + 2])) continue;
        let n = 0;
        C[0] = C[1] = C[2] = 0;
        around(x, y, (j) => {
          const jo = j * 4;
          if (src[jo + 3] === 0 && !(src[jo] | src[jo + 1] | src[jo + 2])) return;
          n++;
          for (let c = 0; c < 3; c++) C[c] += src[jo + c];
        });
        if (!n) continue;
        for (let c = 0; c < 3; c++) outData[o + c] = Math.max(1, Math.round(C[c] / n));
      }
    }
  }
  await sharp(outData, { raw: { width: w, height: h, channels: 4 } }).png().toFile(out);
  console.log(`  keyed ${path.basename(file)}: ${((tail / (w * h)) * 100).toFixed(0)}% paper, ${edge} edge px unmixed`);
  return out;
}

/** A strip: a keyed band trimmed to what is in it, full width kept —
 *  or, where the plate declares a band, cut to those rows whatever the
 *  season put in them. */
async function strip(file, _ext, p) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const band = PARK.band[p.id];
  if (band) {
    console.log(`  band rows ${band[0]}–${band[1]} (declared)`);
    return sharp(file).extract({ left: 0, top: band[0], width: info.width, height: band[1] - band[0] });
  }
  const box = alphaBox(data, info.width, 0, 0, info.width, info.height);
  if (!box) throw new Error(`${file}: nothing in it`);
  const pad = PARK.strip.pad;
  const top = Math.max(0, box.top - pad);
  const height = Math.min(info.height - top, box.height + pad * 2);
  console.log(`  band rows ${box.top}–${box.top + box.height} of ${info.height}`);
  return sharp(file).extract({ left: 0, top, width: info.width, height });
}

/** As drawn: a tile the renderer repeats. */
async function plain(file) {
  return sharp(file);
}

/**
 * The turf at our feet (18t): grass painted as its own element, graded
 * to the painting's own near lawn — its per-channel distribution matched
 * to the ground plate's nearest rows, so it is the same grass in the
 * same light — and its far edge eased to nothing, so where it meets the
 * painting's grass there is no line, only more grass.
 */
async function turf(file, _ext, p = {}) {
  const src = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = src.info;
  const tgt = await sharp(p.match.file).extract(p.match.box).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const N = 64;
  const quantiles = (buf, c) => {
    const v = [];
    for (let i = c; i < buf.length; i += 3) v.push(buf[i]);
    v.sort((a, b) => a - b);
    return Array.from({ length: N + 1 }, (_, k) => v[Math.round((k * (v.length - 1)) / N)]);
  };
  const out = Buffer.alloc(w * h * 4);
  for (let c = 0; c < 3; c++) {
    const a = quantiles(src.data, c);
    const b = quantiles(tgt.data, c);
    const lut = new Uint8Array(256);
    for (let v = 0; v < 256; v++) {
      let k = 0;
      while (k < N - 1 && a[k + 1] < v) k++;
      const span = Math.max(1, a[k + 1] - a[k]);
      const t = Math.min(1, Math.max(0, (v - a[k]) / span));
      lut[v] = Math.round(Math.min(255, Math.max(0, b[k] + (b[k + 1] - b[k]) * t)));
    }
    for (let i = 0; i < w * h; i++) out[i * 4 + c] = lut[src.data[i * 3 + c]];
  }
  // The far edge is the image's top: eased over the top third, so the
  // new grass arrives out of the painting's own rather than against it.
  const fade = Math.max(1, Math.round(h * (p.fadeFar ?? 0.12)));
  for (let y = 0; y < h; y++) {
    const t = Math.min(1, y / fade);
    const alpha = Math.round(255 * (t * t * (3 - 2 * t)));
    for (let x = 0; x < w; x++) out[(y * w + x) * 4 + 3] = alpha;
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } });
}

async function cutout(file, _ext, p = {}) {
  let { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // A plate may keep only the pieces whose centre falls in a span of its
  // width (session 18: the woman on the wall, asked away; the two
  // children beside her stay). Pieces are runs of touching pixels.
  if (p.keep || p.drop) {
    const { width: w, height: h } = info;
    const label = new Int32Array(w * h).fill(-1);
    const cx = [];
    const stack = [];
    for (let i = 0; i < w * h; i++) {
      if (data[i * 4 + 3] === 0 || label[i] >= 0) continue;
      const id = cx.length;
      let sum = 0, sumY = 0, n = 0;
      stack.length = 0;
      stack.push(i);
      label[i] = id;
      while (stack.length) {
        const j = stack.pop();
        sum += j % w;
        sumY += (j / w) | 0;
        n++;
        const x = j % w;
        const step = (k) => { if (data[k * 4 + 3] !== 0 && label[k] < 0) { label[k] = id; stack.push(k); } };
        if (x > 0) step(j - 1);
        if (x < w - 1) step(j + 1);
        if (j >= w) step(j - w);
        if (j < (h - 1) * w) step(j + w);
      }
      cx.push([sum / n / w, sumY / n / h]);
    }
    const out = Buffer.from(data);
    let dropped = 0;
    for (let i = 0; i < w * h; i++) {
      if (label[i] < 0) continue;
      const [c, cy] = cx[label[i]];
      const gone = p.keep ? c < p.keep[0] || c > p.keep[1] : c >= p.drop[0] && cy >= p.drop[1] && c <= p.drop[2] && cy <= p.drop[3];
      if (gone) { out[i * 4 + 3] = 0; out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = 0; dropped++; }
    }
    console.log(`  ${p.keep ? `kept pieces centred in ${p.keep[0]}–${p.keep[1]} of the width` : `let go of pieces centred in [${p.drop}]`}; ${dropped} px`);
    const keptFile = file.replace(/\.png$/, '.kept.png');
    await sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toFile(keptFile);
    // A dropped piece leaves the trim where it was, so the plate keeps
    // its size and place in the box; a kept span is re-boxed by hand.
    if (p.drop) {
      const box = alphaBox(data, w, 0, 0, w, h);
      const pad = CUTOUT.pad;
      const left = Math.max(0, box.left - pad);
      const top = Math.max(0, box.top - pad);
      return sharp(keptFile).extract({ left, top, width: Math.min(w - left, box.width + pad * 2), height: Math.min(h - top, box.height + pad * 2) });
    }
    file = keptFile;
    data = out;
  }
  // A reflection under a boat is pale dots on white paper, and cut out
  // it reads as a white smear on the lake: below `fade[0]` of what is
  // drawn the alpha eases down to `fade[1]` at the foot (18g).
  if (p.fade) {
    const { width: w, height: h } = info;
    const box0 = alphaBox(data, w, 0, 0, w, h);
    const out = Buffer.from(data);
    const from = box0.top + box0.height * p.fade[0];
    for (let y = Math.ceil(from); y < box0.top + box0.height; y++) {
      const t = (y - from) / (box0.top + box0.height - from);
      const k = 1 - (1 - p.fade[1]) * t * t;
      for (let x = 0; x < w; x++) out[(y * w + x) * 4 + 3] = Math.round(out[(y * w + x) * 4 + 3] * k);
    }
    const fadedFile = file.replace(/\.png$/, '.faded.png');
    await sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toFile(fadedFile);
    file = fadedFile;
    data = out;
  }
  // A plate placed in the world rather than by a box in the painting
  // (18t) keeps its whole frame: the transparent margin is where it is
  // on purpose, and the quad the manifest gives it is that frame.
  if (p.whole) return sharp(file);
  const box = alphaBox(data, info.width, 0, 0, info.width, info.height);
  if (!box) throw new Error(`${file}: nothing in it`);
  const pad = CUTOUT.pad;
  const left = Math.max(0, box.left - pad);
  const top = Math.max(0, box.top - pad);
  console.log(`  trimmed to ${box.width} × ${box.height} at ${box.left},${box.top}`);
  return sharp(file).extract({
    left,
    top,
    width: Math.min(info.width - left, box.width + pad * 2),
    height: Math.min(info.height - top, box.height + pad * 2),
  });
}

async function squaresAtlas(files, p) {
  const { grid, inset, tile, cols } = SQUARES;
  const tiles = [];
  for (const file of files) {
    const meta = await sharp(file).metadata();
    const cw = meta.width / grid;
    const ch = meta.height / grid;
    for (let r = 0; r < grid; r++) {
      for (let c = 0; c < grid; c++) {
        if (p.count && tiles.length >= p.count) break;
        const cut = await sharp(file)
          .extract({
            left: Math.round(c * cw + cw * inset),
            top: Math.round(r * ch + ch * inset),
            width: Math.round(cw * (1 - 2 * inset)),
            height: Math.round(ch * (1 - 2 * inset)),
          })
          .resize({ width: tile, height: tile, fit: 'cover' })
          .png()
          .toBuffer();
        tiles.push(cut);
      }
    }
  }
  const across = Math.min(cols, tiles.length);
  const rows = Math.ceil(tiles.length / across);
  console.log(`  ${tiles.length} squares into a ${across} × ${rows} atlas`);
  return sharp({
    create: { width: across * tile, height: rows * tile, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
  }).composite(tiles.map((input, i) => ({ input, left: (i % across) * tile, top: Math.floor(i / across) * tile })));
}

const RECIPES = {
  'ref-sky': refSky,
  'ref-far-shore': refFarShore,
  'ref-water': refWater,
  'ref-ground': refGround,
  'ref-trees': refTrees,
  turf,
  'ref-check': refCheck,
  canopy: canopyStrip,
  cutout,
  strip,
  plain,
  squares: squaresAtlas,
  'near-bank': nearBank,
  'far-bank': farBank,
  corridor: corridorBay,
  fragments: fragmentAtlas,
};

/** The highest -vN.png of an id in a raw folder, so a repainted asset is
 *  picked up without editing this file (18v). */
function newest(dir, id) {
  let best = 1;
  try {
    for (const f of readdirSync(path.join(RAW, dir))) {
      const m = /-v(\d+)\.png$/.exec(f);
      if (m && f.slice(0, m.index) === id) best = Math.max(best, Number(m[1]));
    }
  } catch { /* no folder yet */ }
  return `${id}-v${best}.png`;
}

const exists = (f) =>
  access(f).then(
    () => true,
    () => false,
  );

async function encode(pipeline, out, budget = BUDGET_KB, alphaQuality = 80) {
  // Step quality down until the file fits the budget.
  const ladder = [82, 72, 62, 54, 46];
  for (const quality of ladder) {
    await pipeline.clone().webp({ quality, alphaQuality, effort: 6 }).toFile(out);
    const kb = (await stat(out)).size / 1024;
    if (kb <= budget) return { kb, quality };
  }
  const kb = (await stat(out)).size / 1024;
  return { kb, quality: ladder[ladder.length - 1], over: true };
}

async function run() {
  const only = process.argv[2];
  for (const [scene, plates] of Object.entries(SCENES)) {
    if (only && only !== scene) continue;
    await mkdir(path.join(OUT, scene), { recursive: true });
    for (const p of plates) {
      const raws = Array.isArray(p.raw) ? p.raw : [p.raw];
      let srcs = raws.map((r) => path.join(RAW, scene, r));
      let missing = false;
      for (const f of srcs) if (!(await exists(f))) missing = true;
      const out = path.join(OUT, scene, p.variant ? `${p.id}-${p.variant}.webp` : `${p.id}.webp`);
      if (missing) {
        console.log(`${out}  skipped: raw not on disk (${raws.join(', ')})`);
        continue;
      }
      const ext = p.ext && (await exists(path.join(RAW, scene, p.ext))) ? path.join(RAW, scene, p.ext) : undefined;
      // A raw kept only to some fraction of its height, from the top.
      if (p.keep) {
        srcs = await Promise.all(
          srcs.map(async (f) => {
            const frac = p.keep[path.basename(f)];
            if (!frac) return f;
            const meta = await sharp(f).metadata();
            const out = f.replace(/\.png$/, '.crop.png');
            await sharp(f).extract({ left: 0, top: 0, width: meta.width, height: Math.round(meta.height * frac) }).toFile(out);
            return out;
          }),
        );
      }
      if (p.key) srcs = await Promise.all(srcs.map((f) => keyWhite(f, p)));
      const pipeline = Array.isArray(p.raw) ? await RECIPES[p.recipe](srcs, p) : await RECIPES[p.recipe](srcs[0], ext, p);
      const meta = await pipeline.clone().png().toBuffer({ resolveWithObject: true });
      const { kb, quality, over } = await encode(pipeline, out, p.budgetKb, p.alphaQuality);
      console.log(
        `${out}  ${meta.info.width}×${meta.info.height}  ${kb.toFixed(0)} KB @q${quality}${over ? '  OVER BUDGET' : ''}${
          p.ext && !ext ? '  (flanks tiled: no ' + p.ext + ')' : ''
        }`,
      );
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
