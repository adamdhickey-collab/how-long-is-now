#!/usr/bin/env node
/**
 * The park outward (session 18i): the quiet park continued past its
 * frame in eight pieces, each a 1536 × 1024 window on a frame twice the
 * painting's size that keeps at least half of what is already painted.
 *
 *   node scripts/outpaint.mjs prepare 1     write the round's inputs
 *   node scripts/generate.mjs --taken-apart --quality high --only wide-left,wide-right,wide-above,wide-below
 *   node scripts/outpaint.mjs take 1        paste the round's results in
 *   node scripts/outpaint.mjs prepare 2 …   then the corners the same way
 *   node scripts/outpaint.mjs write         assets/raw/scene-04/ref/wide-park-vN.png
 *
 * The working frame lives at outpaint/frame.png between steps; unknown
 * pixels are transparent there and white in the inputs.
 */
import { readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { OUTPAINT_PIECES, WIDE } from './reference-layers.mjs';

const DIR = 'assets/raw/scene-04/ref';
const OUT = path.join(DIR, 'outpaint');
const FRAME = path.join(OUT, 'frame.png');
const PAINTING = path.join(DIR, 'quiet-park-v1.png');
const [W, H] = WIDE.frame;
const [OX, OY] = WIDE.origin;
// Wide, because the content across a seam is continuous — sky, water,
// lawn — and the model's tone drifts a little: a long ramp hides a step.
const SEAM = 140;
/** The band either side of a seam the tone is matched over. */
const MATCH = 36;

const [, , cmd, roundArg] = process.argv;
const round = Number(roundArg ?? 1);

async function frame() {
  if (existsSync(FRAME)) return sharp(FRAME).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const painting = await sharp(PAINTING).png().toBuffer();
  const buf = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: painting, left: OX, top: OY }])
    .raw()
    .toBuffer();
  return { data: buf, info: { width: W, height: H, channels: 4 } };
}

async function save(f) {
  await sharp(f.data, { raw: { width: W, height: H, channels: 4 } }).png().toFile(FRAME);
}

function latest(id) {
  const re = new RegExp(`^wide-${id}-v(\\d+)\\.png$`);
  let best = null, max = 0;
  for (const name of readdirSync(OUT)) { const m = name.match(re); if (m && Number(m[1]) > max) { max = Number(m[1]); best = path.join(OUT, name); } }
  if (!best) throw new Error(`no result for ${id}`);
  return best;
}

/** Undo a piece's tonal drift, read where it repainted what was known:
 *  a straight-line fit per channel, frame = a · result + b, over the
 *  known part of the window — the same picture twice — so contrast is
 *  matched as well as brightness. */
function driftGain(out, frameData, piece) {
  const [x0, y0] = piece.at;
  const [mx, my, mw, mh] = piece.mask[0];
  const inMask = (x, y) => x >= mx && x < mx + mw && y >= my && y < my + mh;
  const fit = [];
  for (let c = 0; c < 3; c++) {
    let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (let y = 0; y < 1024; y += 3) for (let x = 0; x < 1536; x += 3) {
      if (inMask(x, y)) continue;
      const fo = ((y + y0) * W + x + x0) * 4;
      if (!frameData[fo + 3]) continue;
      const v = out[(y * 1536 + x) * 4 + c];
      const f = frameData[fo + c];
      n++; sx += v; sy += f; sxx += v * v; sxy += v * f;
    }
    const denom = n * sxx - sx * sx;
    let a = denom ? (n * sxy - sx * sy) / denom : 1;
    a = Math.min(1.25, Math.max(0.75, a));
    const b = n ? (sy - a * sx) / n : 0;
    fit.push([a, Math.min(40, Math.max(-40, b))]);
  }
  console.log(`  drift fit ${fit.map(([a, b]) => `${a.toFixed(3)}x${b >= 0 ? '+' : ''}${b.toFixed(1)}`).join('  ')}`);
  for (let y = 0; y < 1024; y++) for (let x = 0; x < 1536; x++) {
    if (!inMask(x, y)) continue;
    const o = (y * 1536 + x) * 4;
    for (let c = 0; c < 3; c++) out[o + c] = Math.max(0, Math.min(255, Math.round(out[o + c] * fit[c][0] + fit[c][1])));
  }
}

/** Tone-match a result to the frame across the piece's seam(s). */
function matchTone(out, frameData, piece) {
  const [x0, y0] = piece.at;
  const [mx, my, mw, mh] = piece.mask[0];
  const known = (x, y) => frameData[((y + y0) * W + x + x0) * 4 + 3] !== 0;
  const inMask = (x, y) => x >= mx && x < mx + mw && y >= my && y < my + mh;
  // Seams: where the mask meets the known part of the window.
  const seams = [];
  if (mx > 0) seams.push({ dir: 'v', at: mx, side: -1 }); // known on the left
  if (mx + mw < 1536) seams.push({ dir: 'v', at: mx + mw, side: 1 }); // known on the right
  if (my > 0) seams.push({ dir: 'h', at: my, side: -1 });
  if (my + mh < 1024) seams.push({ dir: 'h', at: my + mh, side: 1 });
  const gains = [];
  for (const seam of seams) {
    const lines = seam.dir === 'v' ? 1024 : 1536;
    const g = new Float32Array(lines * 3).fill(1);
    for (let l = 0; l < lines; l++) {
      const ref = [0, 0, 0], smp = [0, 0, 0];
      let nr = 0, ns = 0;
      for (let k = 1; k <= MATCH; k++) {
        // reference: known pixels k past the seam; sample: result pixels k + 8 inside the mask
        const rx = seam.dir === 'v' ? seam.at + seam.side * k : l;
        const ry = seam.dir === 'v' ? l : seam.at + seam.side * k;
        const sx = seam.dir === 'v' ? seam.at - seam.side * (k + 8) : l;
        const sy = seam.dir === 'v' ? l : seam.at - seam.side * (k + 8);
        if (rx >= 0 && ry >= 0 && rx < 1536 && ry < 1024 && known(rx, ry)) {
          const o = ((ry + y0) * W + rx + x0) * 4;
          for (let c = 0; c < 3; c++) ref[c] += frameData[o + c];
          nr++;
        }
        if (sx >= 0 && sy >= 0 && sx < 1536 && sy < 1024 && inMask(sx, sy)) {
          const o = (sy * 1536 + sx) * 4;
          for (let c = 0; c < 3; c++) smp[c] += out[o + c];
          ns++;
        }
      }
      if (nr && ns) for (let c = 0; c < 3; c++) g[l * 3 + c] = Math.min(1.35, Math.max(0.7, (ref[c] / nr) / Math.max(1, smp[c] / ns)));
    }
    // One gain per seam and channel — the median of the lines' gains,
    // so a trunk or a cloud on one line cannot stripe the whole piece.
    const med = new Float32Array(3);
    for (let c = 0; c < 3; c++) {
      const vals = [];
      for (let l = 0; l < lines; l++) if (g[l * 3 + c] !== 1) vals.push(g[l * 3 + c]);
      vals.sort((a, b) => a - b);
      med[c] = vals.length ? vals[vals.length >> 1] : 1;
    }
    const sm = new Float32Array(lines * 3);
    for (let l = 0; l < lines; l++) for (let c = 0; c < 3; c++) sm[l * 3 + c] = med[c];
    console.log(`  ${seam.dir === 'v' ? 'vertical' : 'horizontal'} seam gain ${Array.from(med).map((v) => v.toFixed(3)).join(' ')}`);
    gains.push({ seam, g: sm });
  }
  if (!gains.length) return;
  for (let y = 0; y < 1024; y++) for (let x = 0; x < 1536; x++) {
    if (!inMask(x, y)) continue;
    const o = (y * 1536 + x) * 4;
    for (let c = 0; c < 3; c++) {
      // A piece with two seams (a corner) blends their gains by nearness.
      let gsum = 0, wsum = 0;
      for (const { seam, g } of gains) {
        const l = seam.dir === 'v' ? y : x;
        const d = Math.abs((seam.dir === 'v' ? x : y) - seam.at) + 1;
        gsum += g[l * 3 + c] / d;
        wsum += 1 / d;
      }
      out[o + c] = Math.max(0, Math.min(255, Math.round(out[o + c] * (gsum / wsum))));
    }
  }
}

if (cmd === 'prepare') {
  const f = await frame();
  for (const [id, piece] of Object.entries(OUTPAINT_PIECES)) {
    if (piece.round !== round) continue;
    const [x0, y0] = piece.at;
    const win = Buffer.alloc(1536 * 1024 * 4);
    for (let y = 0; y < 1024; y++) for (let x = 0; x < 1536; x++) {
      const s = ((y + y0) * W + x + x0) * 4;
      const d = (y * 1536 + x) * 4;
      if (f.data[s + 3] === 0) { win[d] = win[d + 1] = win[d + 2] = 255; } else { win[d] = f.data[s]; win[d + 1] = f.data[s + 1]; win[d + 2] = f.data[s + 2]; }
      win[d + 3] = 255;
    }
    await sharp(win, { raw: { width: 1536, height: 1024, channels: 4 } }).png().toFile(path.join(OUT, `${id}-input.png`));
    console.log(`prepared ${id}-input.png`);
  }
  await save(f);
} else if (cmd === 'take') {
  const f = await frame();
  for (const [id, piece] of Object.entries(OUTPAINT_PIECES)) {
    if (piece.round !== round) continue;
    const res = await sharp(latest(id)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const [x0, y0] = piece.at;
    // The model paints its continuation a shade brighter and more
    // saturated than the painting. Along each seam the result's tone is
    // matched to the painting's, line by line (rows across a vertical
    // seam, columns across a horizontal one), smoothed, and the gain
    // applied to everything the piece adds.
    // (A tone match at the seams was tried and withdrawn: the bands either
    // side of a seam hold different things — shadowed lawn against sunlit,
    // sky against leaves — and any gain read from them cast the whole
    // piece. The model's drift is mild; the feather carries it.)
    // The model repaints the known part of the window too, a shade off:
    // comparing its version of that part with the frame's — the same
    // content, pixel for pixel — reads its drift alone, and one gain per
    // channel takes it back out of everything the piece adds.
    driftGain(res.data, f.data, piece);
    // Paste where the frame was unknown, feathering into what was known
    // over SEAM pixels so the model's slight drift there is hidden.
    const known = new Uint8Array(1536 * 1024);
    for (let y = 0; y < 1024; y++) for (let x = 0; x < 1536; x++) known[y * 1536 + x] = f.data[((y + y0) * W + x + x0) * 4 + 3] ? 1 : 0;
    // distance into the known region, capped at SEAM
    const dist = new Float32Array(1536 * 1024).fill(SEAM);
    for (let y = 0; y < 1024; y++) for (let x = 0; x < 1536; x++) {
      if (!known[y * 1536 + x]) { dist[y * 1536 + x] = 0; continue; }
      let d = SEAM;
      for (let k = 1; k < SEAM && d === SEAM; k++) {
        if ((x - k >= 0 && !known[y * 1536 + x - k]) || (x + k < 1536 && !known[y * 1536 + x + k]) || (y - k >= 0 && !known[(y - k) * 1536 + x]) || (y + k < 1024 && !known[(y + k) * 1536 + x])) d = k;
      }
      dist[y * 1536 + x] = d;
    }
    for (let y = 0; y < 1024; y++) for (let x = 0; x < 1536; x++) {
      const i = y * 1536 + x;
      const k = 1 - dist[i] / SEAM; // 1 where unknown, 0 deep in the known
      if (k <= 0) continue;
      const s = i * 4;
      const d = ((y + y0) * W + x + x0) * 4;
      for (let c = 0; c < 3; c++) f.data[d + c] = Math.round(res.data[s + c] * k + (f.data[d + 3] ? f.data[d + c] : res.data[s + c]) * (1 - k));
      f.data[d + 3] = 255;
    }
    console.log(`took ${path.basename(latest(id))}`);
  }
  await save(f);
} else if (cmd === 'write') {
  const f = await frame();
  let n = 1;
  while (existsSync(path.join(DIR, `wide-park-v${n}.png`))) n++;
  const out = path.join(DIR, `wide-park-v${n}.png`);
  await sharp(f.data, { raw: { width: W, height: H, channels: 4 } }).removeAlpha().png().toFile(out);
  console.log(`wrote ${out}`);
} else {
  console.error('usage: outpaint.mjs prepare|take <round> | write');
  process.exit(1);
}
