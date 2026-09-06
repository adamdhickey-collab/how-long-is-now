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

const SCENES = {
  'scene-04': [
    // Session 6 (assets/LEDGER.md): the drawn plates. The photographic
    // set (canopy v4/v3, banks v1) stays in assets/raw for the record.
    { id: 'canopy', variant: 'late-summer', raw: 'canopy-august-v5.png', ext: 'canopy-ext-august-v1.png', recipe: 'canopy' },
    { id: 'canopy', variant: 'autumn', raw: 'canopy-october-v4.png', ext: 'canopy-ext-october-v1.png', recipe: 'canopy' },
    { id: 'canopy', variant: 'winter', raw: 'canopy-january-v4.png', ext: 'canopy-ext-january-v1.png', recipe: 'canopy' },
    { id: 'canopy', variant: 'spring', raw: 'canopy-april-v4.png', ext: 'canopy-ext-april-v1.png', recipe: 'canopy' },
    { id: 'near-bank', variant: 'late-summer', raw: 'near-bank-august-v2.png', recipe: 'near-bank' },
    { id: 'near-bank', variant: 'autumn', raw: 'near-bank-october-v2.png', recipe: 'near-bank' },
    { id: 'near-bank', variant: 'winter', raw: 'near-bank-january-v2.png', recipe: 'near-bank' },
    { id: 'near-bank', variant: 'spring', raw: 'near-bank-april-v3.png', recipe: 'near-bank' },
    { id: 'far-bank', variant: 'late-summer', raw: 'far-bank-august-v2.png', recipe: 'far-bank' },
    { id: 'far-bank', variant: 'autumn', raw: 'far-bank-october-v2.png', recipe: 'far-bank' },
    { id: 'far-bank', variant: 'winter', raw: 'far-bank-january-v2.png', recipe: 'far-bank' },
    { id: 'far-bank', variant: 'spring', raw: 'far-bank-april-v2.png', recipe: 'far-bank' },
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

const RECIPES = { canopy: canopyStrip, 'near-bank': nearBank, 'far-bank': farBank };

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
      const src = path.join(RAW, scene, p.raw);
      const out = path.join(OUT, scene, `${p.id}-${p.variant}.webp`);
      const ext = p.ext && (await exists(path.join(RAW, scene, p.ext))) ? path.join(RAW, scene, p.ext) : undefined;
      const pipeline = await RECIPES[p.recipe](src, ext);
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
