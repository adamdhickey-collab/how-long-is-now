#!/usr/bin/env node
/**
 * A mask the shape of the elms (session 18i), for the edit that paints
 * them away: the colour-keyed tree matte of reference-bands.mjs, in the
 * painting's own frame, grown so the model has room to blend, written
 * as a PNG whose alpha is clear where the model may paint.
 *
 *   node scripts/tree-mask.mjs   → assets/raw/scene-04/ref/tree-mask.png
 */
import sharp from 'sharp';
import { keyedMatte } from './reference-bands.mjs';

const QUIET = 'assets/raw/scene-04/ref/quiet-park-v1.png';
const OUT = 'assets/raw/scene-04/ref/tree-mask.png';
const GROW = 14;

const { matte, w, h } = await keyedMatte(QUIET);
// grow
const g = new Uint8Array(w * h);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  let any = 0;
  for (let dy = -GROW; dy <= GROW && !any; dy++) for (let dx = -GROW; dx <= GROW; dx++) {
    const xx = x + dx, yy = y + dy;
    if (xx >= 0 && yy >= 0 && xx < w && yy < h && matte[yy * w + xx] > 0.5) { any = 1; break; }
  }
  g[y * w + x] = any;
}
const out = Buffer.alloc(w * h * 4);
let clear = 0;
for (let i = 0; i < w * h; i++) { out[i * 4 + 3] = g[i] ? 0 : 255; if (g[i]) clear++; }
await sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toFile(OUT);
console.log(`${OUT}: ${((100 * clear) / (w * h)).toFixed(1)}% to paint`);
