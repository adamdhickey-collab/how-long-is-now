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
import path from 'node:path';
import sharp from 'sharp';

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
  // 1448 × 1086: a strip of ceiling to row 55, the floor from row 922.
  wall: { crop: { top: 55, height: 867 } },
  // 1536 × 1024, the bay edge to edge.
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
  'scene-04/park': [
    { id: 'far-shore', variant: 'late-summer', raw: 'far-shore-v1.png', recipe: 'strip', key: true },
    { id: 'far-shore', variant: 'autumn', raw: 'far-shore-autumn-v1.png', recipe: 'strip', key: true },
    { id: 'far-shore', variant: 'winter', raw: 'far-shore-winter-v1.png', recipe: 'strip', key: true },
    { id: 'far-shore', variant: 'spring', raw: 'far-shore-spring-v1.png', recipe: 'strip', key: true },
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
    { id: 'movers-autumn', raw: ['movers-autumn-v1.png'], recipe: 'fragments', key: true, align: 'bottom', grid: [3, 3], cols: 3 },
    { id: 'ice-winter', raw: ['ice-winter-v1.png'], recipe: 'fragments', key: true, align: 'bottom', grid: [3, 3], cols: 3 },
    { id: 'movers-winter', raw: ['movers-winter-v1.png'], recipe: 'fragments', key: true, align: 'bottom', grid: [3, 3], cols: 3 },
    { id: 'sitters-spring', raw: ['sitters-spring-v2.png'], recipe: 'fragments', key: true, align: 'bottom', grid: [3, 3], cols: 3 },
    { id: 'movers-spring', raw: ['movers-spring-v1.png'], recipe: 'fragments', key: true, align: 'bottom', grid: [3, 3], cols: 3 },
    // The second walkers sheet came as three rows with the third cut off
    // by the frame; its top two rows are kept and cut on the first's grid.
    {
      id: 'movers',
      raw: ['movers-v1.png', 'movers-b-v1.png'],
      keep: { 'movers-b-v1.png': 2 / 3 },
      recipe: 'fragments',
      key: true,
      align: 'bottom',
      grid: [3, 2],
      cols: 3,
    },
  ],
  'scene-09': [
    { id: 'days-same', raw: ['days-same-v2.png'], recipe: 'squares' },
    {
      id: 'days-vivid',
      raw: ['days-vivid-a-v1.png', 'days-vivid-b-v1.png', 'days-vivid-c-v1.png', 'days-vivid-d-v1.png'],
      recipe: 'squares',
      count: 30,
    },
  ],
  'scene-08': [
    { id: 'corridor-wall', raw: 'corridor-wall-v1.png', recipe: 'corridor', surface: 'wall' },
    { id: 'corridor-ceiling', raw: 'corridor-ceiling-v1.png', recipe: 'corridor', surface: 'ceiling' },
    { id: 'corridor-floor', raw: 'corridor-floor-v1.png', recipe: 'corridor', surface: 'floor' },
    { id: 'fragments', raw: ['fragments-a-v1.png', 'fragments-b-v1.png'], recipe: 'fragments' },
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
 * its own cleared: connected regions of alpha that touch the cell's top
 * or bottom edge and are small beside the largest are a neighbour's
 * overflow, and go. A group's own separate things — a bottle, a paddle,
 * a gosling — sit inside the cell and stay.
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
    const blob = { id, area: 0, top: false, bottom: false };
    while (head < tail) {
      const j = queue[head++];
      blob.area++;
      const x = j % w;
      const y = (j - x) / w;
      if (y === 0) blob.top = true;
      if (y === h - 1) blob.bottom = true;
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
  const drop = new Set(blobs.filter((b) => (b.top || b.bottom) && b.area < largest * 0.3).map((b) => b.id));
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
  const tiles = [];
  for (const file of files) {
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const cw = Math.floor(info.width / gridX);
    const ch = Math.floor(info.height / gridY);
    for (let r = 0; r < gridY; r++) {
      for (let c = 0; c < gridX; c++) {
        // The cell alone, with whatever a neighbour let overflow into it
        // — chair legs, feet, a hat brim — taken out: a small blob that
        // touches the cell's top or bottom edge is not this cell's own.
        const cell = ownBlobs(data, info.width, c * cw, r * ch, cw, ch);
        const box = alphaBox(cell, cw, 0, 0, cw, ch);
        if (!box || box.width < cw * 0.1 || box.height < ch * 0.1) {
          console.log(`  ${path.basename(file)} cell ${r},${c}: empty, skipped`);
          continue;
        }
        const cut = await sharp(cell, { raw: { width: cw, height: ch, channels: 4 } })
          .extract(box)
          .resize({ width: inner, height: inner, fit: 'inside' })
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
    }
  }
  const rows = Math.ceil(tiles.length / cols);
  const composite = tiles.map((t, i) => ({
    input: t.input,
    left: (i % cols) * tile + t.left,
    top: Math.floor(i / cols) * tile + t.top,
  }));
  console.log(`  ${tiles.length} fragments into a ${cols} × ${rows} atlas`);
  return sharp({
    create: { width: cols * tile, height: rows * tile, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite(composite);
}

/**
 * Key the paper out of a layer drawn on flat white. The paper is found
 * by flooding from the image's borders through near-white pixels, so a
 * white shirt or sail enclosed by colour stays; the edge is feathered a
 * pixel and its colour unmixed from the white beneath, so no halo. The
 * keyed image is written beside the raw as a PNG the recipes then read.
 */
async function keyWhite(file) {
  const out = file.replace(/\.png$/, '.keyed.png');
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const paper = (i) => {
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
  while (head < tail) {
    const i = queue[head++];
    const x = i % w;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (i >= w) push(i - w);
    if (i < (h - 1) * w) push(i + w);
  }
  // Feather: a pixel's alpha is the share of its 3 × 3 neighbourhood
  // that is not paper, then its colour is unmixed from the white.
  const outData = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let n = 0;
      let fg = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          n++;
          if (!bg[yy * w + xx]) fg++;
        }
      }
      const a = bg[i] ? fg / n : 1;
      const o = i * 4;
      if (a <= 0) {
        outData[o + 3] = 0;
        continue;
      }
      for (let c = 0; c < 3; c++) {
        const v = data[o + c];
        const un = a < 1 ? (v - (1 - a) * 250) / a : v;
        outData[o + c] = Math.max(0, Math.min(255, Math.round(un)));
      }
      outData[o + 3] = Math.round(a * 255);
    }
  }
  await sharp(outData, { raw: { width: w, height: h, channels: 4 } }).png().toFile(out);
  console.log(`  keyed ${path.basename(file)}: ${((tail / (w * h)) * 100).toFixed(0)}% paper`);
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

async function cutout(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
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

const exists = (f) =>
  access(f).then(
    () => true,
    () => false,
  );

async function encode(pipeline, out) {
  // Step quality down until the file fits the budget.
  const ladder = [82, 72, 62, 54, 46];
  for (const quality of ladder) {
    await pipeline.clone().webp({ quality, alphaQuality: 80, effort: 6 }).toFile(out);
    const kb = (await stat(out)).size / 1024;
    if (kb <= BUDGET_KB) return { kb, quality };
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
      if (p.key) srcs = await Promise.all(srcs.map(keyWhite));
      const pipeline = Array.isArray(p.raw) ? await RECIPES[p.recipe](srcs, p) : await RECIPES[p.recipe](srcs[0], ext, p);
      const meta = await pipeline.clone().png().toBuffer({ resolveWithObject: true });
      const { kb, quality, over } = await encode(pipeline, out);
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
