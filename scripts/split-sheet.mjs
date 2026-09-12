#!/usr/bin/env node
/**
 * Split a sheet of small figures drawn on white into one PNG each.
 *
 *   node scripts/split-sheet.mjs assets/raw/scene-05/lifetime-figures-v1.png \
 *        assets/raw/scene-05 lifetime-figure
 *
 * The generator draws a dozen figures in a loose grid with white between
 * them (see the `draw-in-the-browser` skill). The cutter's recipes all
 * take one subject to a file, so the sheet is taken apart here — by what
 * is not paper, grown a little so a hat and its head are one thing — and
 * each piece written out with a margin of white, which is what the
 * keyed recipes expect to find.
 */
import sharp from 'sharp';
import path from 'node:path';

const [file, outDir, stem] = process.argv.slice(2);
if (!file || !outDir || !stem) {
  console.error('usage: split-sheet.mjs <sheet.png> <out dir> <stem>');
  process.exit(1);
}
const PAPER = 238; // lighter than this, in every channel, is the sheet
const GROW = 9; // a figure's parts joined before they are boxed
const MARGIN = 24;
const MIN = 24; // a piece smaller than this is a stray dot

const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h, channels: c } = info;
const ink = new Uint8Array(w * h);
for (let i = 0; i < w * h; i++) {
  const o = i * c;
  if (data[o] < PAPER || data[o + 1] < PAPER || data[o + 2] < PAPER) ink[i] = 1;
}
// Grown, so a figure's hat, head and shadowless feet are one piece.
const grown = new Uint8Array(w * h);
for (let y = 0; y < h; y++)
  for (let x = 0; x < w; x++) {
    if (!ink[y * w + x]) continue;
    for (let dy = -GROW; dy <= GROW; dy++)
      for (let dx = -GROW; dx <= GROW; dx++) {
        const yy = y + dy;
        const xx = x + dx;
        if (xx >= 0 && yy >= 0 && xx < w && yy < h) grown[yy * w + xx] = 1;
      }
  }
// Pieces, and the box each one's own ink sits in.
const seen = new Uint8Array(w * h);
const boxes = [];
const stack = new Int32Array(w * h);
for (let s = 0; s < w * h; s++) {
  if (!grown[s] || seen[s]) continue;
  let n = 0;
  stack[n++] = s;
  seen[s] = 1;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  while (n) {
    const i = stack[--n];
    const x = i % w;
    const y = (i / w) | 0;
    if (ink[i]) {
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
    if (x > 0 && grown[i - 1] && !seen[i - 1]) { seen[i - 1] = 1; stack[n++] = i - 1; }
    if (x < w - 1 && grown[i + 1] && !seen[i + 1]) { seen[i + 1] = 1; stack[n++] = i + 1; }
    if (y > 0 && grown[i - w] && !seen[i - w]) { seen[i - w] = 1; stack[n++] = i - w; }
    if (y < h - 1 && grown[i + w] && !seen[i + w]) { seen[i + w] = 1; stack[n++] = i + w; }
  }
  if (x1 - x0 + 1 < MIN || y1 - y0 + 1 < MIN) continue;
  boxes.push([x0, y0, x1, y1]);
}
// Reading order: down the rows, left to right, by where each piece's feet are.
boxes.sort((a, b) => (Math.abs(a[3] - b[3]) > 60 ? a[3] - b[3] : a[0] - b[0]));
let k = 0;
for (const [x0, y0, x1, y1] of boxes) {
  const left = Math.max(0, x0 - MARGIN);
  const top = Math.max(0, y0 - MARGIN);
  const width = Math.min(w - left, x1 - x0 + 1 + MARGIN * 2);
  const height = Math.min(h - top, y1 - y0 + 1 + MARGIN * 2);
  const out = path.join(outDir, `${stem}-${String(++k).padStart(2, '0')}-v1.png`);
  await sharp(file).extract({ left, top, width, height }).png().toFile(out);
  console.log(`${out}  ${width} × ${height} at ${left},${top}`);
}
console.log(`${k} figure(s)`);
