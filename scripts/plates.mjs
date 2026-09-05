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

import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const RAW = 'assets/raw';
const OUT = 'public/plates';
const BUDGET_KB = 700;

// ---------------------------------------------------------------- recipes

/**
 * Scene 04's canopy: the far treeline across the lake. One 1536-wide
 * panel per season, all cropped to the same band so the seasons align
 * when cross-faded. The band is widened into a strip by mirroring the
 * panel's own flanks outward — the seam is seamless by construction, and
 * the bandshell in the centre is not repeated. A dedicated left/right
 * panel per season replaces the mirrored flanks when they exist.
 */
const CANOPY = {
  crop: { top: 240, height: 480 },
  flank: 0.45,
};

/** Scene 04's near bank: grass tips at the top, solid ground below. */
const NEAR_BANK = {
  crop: { top: 180, height: 844 },
};

const SCENES = {
  'scene-04': [
    { id: 'canopy', variant: 'late-summer', raw: 'canopy-august-v4.png', recipe: 'canopy' },
    { id: 'canopy', variant: 'autumn', raw: 'canopy-october-v3.png', recipe: 'canopy' },
    { id: 'canopy', variant: 'winter', raw: 'canopy-january-v3.png', recipe: 'canopy' },
    { id: 'canopy', variant: 'spring', raw: 'canopy-april-v3.png', recipe: 'canopy' },
    { id: 'near-bank', variant: 'late-summer', raw: 'near-bank-august-v1.png', recipe: 'near-bank' },
  ],
};

// ----------------------------------------------------------------- steps

async function canopyStrip(file) {
  const meta = await sharp(file).metadata();
  const w = meta.width;
  const { top, height } = CANOPY.crop;
  const band = await sharp(file).extract({ left: 0, top, width: w, height }).png().toBuffer();
  const flankW = Math.round(w * CANOPY.flank);
  const left = await sharp(band).extract({ left: 0, top: 0, width: flankW, height }).flop().png().toBuffer();
  const right = await sharp(band)
    .extract({ left: w - flankW, top: 0, width: flankW, height })
    .flop()
    .png()
    .toBuffer();
  return sharp({
    create: { width: flankW * 2 + w, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite([
    { input: left, left: 0, top: 0 },
    { input: band, left: flankW, top: 0 },
    { input: right, left: flankW + w, top: 0 },
  ]);
}

async function nearBank(file) {
  const meta = await sharp(file).metadata();
  const { top, height } = NEAR_BANK.crop;
  return sharp(file).extract({ left: 0, top, width: meta.width, height });
}

const RECIPES = { canopy: canopyStrip, 'near-bank': nearBank };

async function encode(pipeline, out) {
  // Step quality down until the file fits the budget.
  for (const quality of [82, 72, 62]) {
    await pipeline.clone().webp({ quality, alphaQuality: 80, effort: 6 }).toFile(out);
    const kb = (await stat(out)).size / 1024;
    if (kb <= BUDGET_KB) return { kb, quality };
  }
  const kb = (await stat(out)).size / 1024;
  return { kb, quality: 62, over: true };
}

async function run() {
  const only = process.argv[2];
  for (const [scene, plates] of Object.entries(SCENES)) {
    if (only && only !== scene) continue;
    await mkdir(path.join(OUT, scene), { recursive: true });
    for (const p of plates) {
      const src = path.join(RAW, scene, p.raw);
      const out = path.join(OUT, scene, `${p.id}-${p.variant}.webp`);
      const pipeline = await RECIPES[p.recipe](src);
      const meta = await pipeline.clone().png().toBuffer({ resolveWithObject: true });
      const { kb, quality, over } = await encode(pipeline, out);
      console.log(
        `${out}  ${meta.info.width}×${meta.info.height}  ${kb.toFixed(0)} KB @q${quality}${over ? '  OVER BUDGET' : ''}`,
      );
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
