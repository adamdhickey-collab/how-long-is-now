/**
 * The painting's ground layers, cut from the quiet park (session 18).
 *
 * Two whole-frame images come from the generator: `quiet-park`, the
 * painting with its people, boats and things inpainted away, and
 * `empty-view`, the quiet park with the framing trees inpainted away as
 * well. The second is not faithful — the model repainted the far shore
 * flat and moved the water's dots — so it is used only where the trees
 * were, to fill what stands behind them, and the quiet park is the
 * master everywhere else. The tree matte is the two images' difference,
 * thresholded inside the regions the trees occupy and cleaned.
 *
 * Every band is a whole-frame RGBA image — the size of the painting, or
 * of the wide frame when a third image, the outpainted `wide-park`, is
 * given: then the painting sits at ORIGIN in a frame twice its size, at
 * full resolution, with the model's continuation (drawn at half size
 * and doubled) feathered in around it — so the composition maps it by
 * its own pixels. Boundaries between bands
 * are found in the pixels: the far shore's top against the sky by
 * lightness, the water's near edge by blueness, column by column.
 */
import sharp from 'sharp';
import { LIFE_BOXES } from './reference-layers.mjs';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const FEATHER = 5;
/** The wide frame: twice the painting each way, the painting at ORIGIN. */
const WIDE = [3072, 2048];
const ORIGIN = [768, 512];
/** How far inside the painting's edge the continuation is blended in:
 *  the model kept that edge as painted, so the blend mixes like with
 *  like, and a long one hides the step in tone between the two. */
const SEAM = 140;

/**
 * Where the framing trees are, in the painting's pixels. The canopy is
 * keyed against the sky (leaves are dark and coloured, sky is pale)
 * above the far shore's top; the trunks are keyed inside their own
 * columns against the greens and blues they cross. Leaves that hang in
 * front of the far treeline are both green and stay baked into it —
 * owed a better matte before the year's rise is looked at.
 */
const CANOPY_REGIONS = [
  // The canopy above the frame (18w). This used to be a sixty-pixel
  // strip, so the elms' leaves ended on a straight line sixty pixels
  // above the painting — invisible while the plate carried the
  // painting's own pale leaf tips there, plain as a band across the
  // frame once the leaves were painted in. It now reaches well up into
  // the continuation, where the elms go on; the colour key still decides
  // what is leaf and what is sky, so the top ends where the tree does.
  [0, -260, 1536, 260],
  [0, 0, 930, 300],
  [930, 0, 190, 185],
  [1120, 0, 416, 330],
];
const TRUNK_REGIONS = [
  [20, 150, 125, 460], // the left trunk
  [0, 560, 215, 185], // its flare and roots
  // The right trunks, their own columns only. They used to stop above
  // the shoulder of the man in the second chair and above the small
  // sitter (18g), because the colour key took the people for bark; with
  // the bark now read as everything that is not green, yellow or blue
  // (18w) the columns can run down to the lawn, which is where the
  // trunks run, and the sitters keep their clothes.
  [1378, 150, 66, 560],
  [1484, 150, 52, 540],
];

const cache = new Map();

/** The wide frame: the continuation doubled, the painting set into it at
 *  full resolution, blended over SEAM pixels inside the painting's edge. */
async function widen(painting, outpaint) {
  const [W, H] = WIDE;
  // The continuation may come at the wide frame's own size (the pieces
  // of scripts/outpaint.mjs) or at half of it (one edit), doubled here.
  const big = Buffer.from(
    outpaint.w === W
      ? outpaint.data
      : await sharp(Buffer.from(outpaint.data), { raw: { width: outpaint.w, height: outpaint.h, channels: 4 } })
          .resize(W, H, { kernel: 'lanczos3' })
          .raw()
          .toBuffer(),
  );
  const [ox, oy] = ORIGIN;
  // A continuation made as its own edit, or recoloured to a season
  // (18j), drifts in tone from the painting. Over the centre, where both
  // hold the same picture, a straight-line fit per channel brings the
  // continuation to the painting — one fit per region when the summer's
  // lines are known (sky, far shore, water, ground), since one line for
  // a whole picture is dominated by the lawn and misses the sky.
  {
    const lines = regionLines;
    const regionOf = (x, y) => {
      if (!lines) return 0;
      const c = Math.max(0, Math.min(W - 1, x));
      if (y < lines.skyTop[c]) return 0;
      if (y < lines.waterFar[c]) return 1;
      if (y < lines.waterNear[c]) return 2;
      return 3;
    };
    const R = lines ? 4 : 1;
    const fits = [];
    for (let r = 0; r < R; r++) {
      const fit = [];
      for (let c = 0; c < 3; c++) {
        let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
        for (let y = SEAM; y < painting.h - SEAM; y += 3) for (let x = SEAM; x < painting.w - SEAM; x += 3) {
          if (regionOf(x + ox, y + oy) !== r) continue;
          const v = big[((y + oy) * W + x + ox) * 4 + c];
          const f = painting.data[(y * painting.w + x) * 4 + c];
          n++; sx += v; sy += f; sxx += v * v; sxy += v * f;
        }
        if (n < 400) { fit.push([1, 0]); continue; }
        const denom = n * sxx - sx * sx;
        let a = denom ? (n * sxy - sx * sy) / denom : 1;
        a = Math.min(1.6, Math.max(0.4, a));
        fit.push([a, Math.min(140, Math.max(-140, (sy - a * sx) / n))]);
      }
      fits.push(fit);
    }
    const flat = fits.every((fit) => fit.every(([a, b]) => Math.abs(a - 1) < 0.02 && Math.abs(b) < 3));
    if (!flat) {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const fit = fits[regionOf(x, y)];
        const o = (y * W + x) * 4;
        for (let c = 0; c < 3; c++) big[o + c] = Math.max(0, Math.min(255, Math.round(big[o + c] * fit[c][0] + fit[c][1])));
      }
      console.log(`  continuation fitted to the painting, ${R} region(s): ${fits.map((fit) => fit.map(([a, b]) => `${a.toFixed(2)}x${b >= 0 ? '+' : ''}${b.toFixed(0)}`).join(' ')).join(' | ')}`);
    }
  }
  // Below the frame's foot the continuation drew trees — trunks that
  // rode into the painting's bottom rows through the seam and stood at
  // the foot of the view (18s). The strip under the seat is the picture
  // mirrored about its foot instead: the lawn running on, and nothing the
  // painting does not have. Only its first rows are ever seen.
  {
    const foot = oy + painting.h;
    for (let y = foot; y < H; y++) {
      const sy = Math.max(0, 2 * foot - 1 - y);
      for (let x = 0; x < W; x++) {
        const o = (y * W + x) * 4;
        const inFrame = x >= ox && x < ox + painting.w && sy >= oy;
        const so = inFrame ? ((sy - oy) * painting.w + x - ox) * 4 : (sy * W + x) * 4;
        const from = inFrame ? painting.data : big;
        big[o] = from[so]; big[o + 1] = from[so + 1]; big[o + 2] = from[so + 2];
      }
    }
  }
  const data = Buffer.from(big);
  for (let y = 0; y < painting.h; y++) {
    for (let x = 0; x < painting.w; x++) {
      // No seam along the foot: below it is the picture mirrored, and the
      // continuation's own rendering of the bottom rows carried trunks
      // and a haze of lake into the lawn (18s).
      const d = Math.min(x, y, painting.w - 1 - x);
      const k = Math.min(1, d / SEAM);
      const o = ((y + oy) * W + x + ox) * 4;
      const i = (y * painting.w + x) * 4;
      for (let c = 0; c < 3; c++) data[o + c] = Math.round(painting.data[i + c] * k + big[o + c] * (1 - k));
      data[o + 3] = 255;
    }
  }
  return { data, w: W, h: H };
}

/** A small value noise in [0, 1). */
function vnoise(x, y, seed) {
  const h2 = (i, j) => { const v = Math.sin(i * 127.1 + j * 311.7 + seed * 74.7) * 43758.5453; return v - Math.floor(v); };
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = x - xi, fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
  return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
}

/**
 * Match an image's continuation to its painting across the frame's
 * edge (18s): per region and channel, a straight line fitted from the
 * band just outside the painting's rectangle to the band just inside,
 * applied to everything outside. A season's fill is the summer's base
 * through a lookup, which turns a faint step between the two into a
 * visible rectangle.
 */
function matchAcross(img, w, h) {
  const [ox, oy] = ORIGIN;
  const [FW, FH] = [w - 2 * ox, h - 2 * oy];
  const BAND = 200;
  const inRect = (x, y) => x >= ox && x < ox + FW && y >= oy && y < oy + FH;
  const distOut = (x, y) => Math.max(ox - x, x - (ox + FW - 1), oy - y, y - (oy + FH - 1));
  const stats = [];
  for (let r = 0; r < 4; r++) stats.push({ inn: [[0, 0, 0], [0, 0, 0], 0], out: [[0, 0, 0], [0, 0, 0], 0] });
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
    const d = distOut(x, y);
    if (d > BAND || d < -BAND) continue;
    const r = regionAtWide(x, y);
    const o = (y * w + x) * 4;
    const side = d <= 0 ? stats[r].inn : stats[r].out;
    for (let c = 0; c < 3; c++) { side[0][c] += img[o + c]; side[1][c] += img[o + c] * img[o + c]; }
    side[2]++;
  }
  const fits = stats.map(({ inn, out }) => [0, 1, 2].map((c) => {
    if (inn[2] < 200 || out[2] < 200) return [1, 0];
    const mi = inn[0][c] / inn[2], mo = out[0][c] / out[2];
    const si = Math.sqrt(Math.max(1, inn[1][c] / inn[2] - mi * mi)), so = Math.sqrt(Math.max(1, out[1][c] / out[2] - mo * mo));
    const a = Math.min(1.5, Math.max(0.66, si / so));
    return [a, mi - a * mo];
  }));
  const out = Buffer.from(img);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (inRect(x, y)) continue;
    const fit = fits[regionAtWide(x, y)];
    const o = (y * w + x) * 4;
    for (let c = 0; c < 3; c++) out[o + c] = Math.max(0, Math.min(255, Math.round(img[o + c] * fit[c][0] + fit[c][1])));
  }
  return out;
}

/** A box blur of an RGBA buffer's colour, radius r, for the lookups. */
function lowpass(data, w, h, r) {
  const out = Buffer.from(data);
  for (let c = 0; c < 3; c++) {
    const f = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) f[i] = data[i * 4 + c];
    const b = blur(f, w, h, r);
    for (let i = 0; i < w * h; i++) out[i * 4 + c] = Math.round(b[i]);
  }
  return out;
}

/**
 * A season's colour, learned from the aligned pair of paintings (summer
 * → season) as a 24³ lookup over low-passed colour, each cell the mean
 * season colour of the summer pixels that fell in it, empty cells taking
 * the nearest filled. Applied to any summer image: the lookup gives the
 * local colour, and the image's own dots — its difference from its
 * low-pass — ride on top, so the texture is the painting's, not a wash.
 */
function seasonLookup(summer, season, regionOfPainting = () => 0, regions = 1, opts = {}) {
  const N = 24;
  const R = 3;
  const lpS = lowpass(summer.data, summer.w, summer.h, R);
  const lpT = lowpass(season.data, season.w, season.h, R);
  const cell = (r, g, b) => ((r * N) >> 8) * N * N + ((g * N) >> 8) * N + ((b * N) >> 8);
  const tables = [];
  for (let reg = 0; reg < regions; reg++) tables.push({ sum: new Float64Array(N * N * N * 3), cnt: new Uint32Array(N * N * N), lut: new Float32Array(N * N * N * 3), filled: new Uint8Array(N * N * N), dS: 0, dT: 0, sS: 0, sT: 0, n: 0 });
  const sat = (d, o) => { const mx = Math.max(d[o], d[o + 1], d[o + 2]); return mx ? (mx - Math.min(d[o], d[o + 1], d[o + 2])) / mx : 0; };
  for (let y = 0; y < summer.h; y++) for (let x = 0; x < summer.w; x++) {
    if (opts.exclude && opts.exclude(x, y)) continue;
    const i = y * summer.w + x;
    const o = i * 4;
    const t = tables[regionOfPainting(x, y)];
    const c = cell(lpS[o], lpS[o + 1], lpS[o + 2]);
    t.cnt[c]++;
    for (let k = 0; k < 3; k++) t.sum[c * 3 + k] += lpT[o + k];
    // the dots' strength either side, and the saturation, for the grade
    for (let k = 0; k < 3; k++) { t.dS += Math.abs(summer.data[o + k] - lpS[o + k]); t.dT += Math.abs(season.data[o + k] - lpT[o + k]); }
    t.sS += sat(summer.data, o); t.sT += sat(season.data, o); t.n++;
  }
  for (const t of tables) fillTable(t, N);
  // How much the dots ride on: a fixed share (a season: snow does not
  // carry grass's contrast) or, for a grade, the target's own strength
  // over the source's, per region.
  const gains = tables.map((t) => (opts.detailGain === 'auto' ? Math.min(2.4, Math.max(0.7, t.n && t.dS ? t.dT / t.dS : 1)) : opts.detailGain ?? 0.6));
  const satGain = tables.reduce((a, t) => a + (t.n && t.sS ? t.sT / t.sS : 1), 0) / tables.length;
  if (opts.detailGain === 'auto') console.log(`  grade: dots × ${gains.map((g) => g.toFixed(2)).join(' ')}, saturation × ${satGain.toFixed(2)}`);
  // The table is read between its cells, not out of them (18ac). Read
  // cell by cell, a smooth gradient — a sky, a lawn falling away — is
  // mapped in steps, and the steps show as a mosaic of flat patches
  // wherever the colour changes slowly. Eight cells, trilinear.
  const between = (t, r, g, b, k) => {
    const f = (v) => Math.min(N - 1.0001, Math.max(0, (v * N) / 256 - 0.5));
    const fr = f(r);
    const fg = f(g);
    const fb = f(b);
    const r0 = fr | 0;
    const g0 = fg | 0;
    const b0 = fb | 0;
    const dr = fr - r0;
    const dg = fg - g0;
    const db = fb - b0;
    let v = 0;
    for (let i = 0; i < 8; i++) {
      const rr = r0 + (i & 1);
      const gg = g0 + ((i >> 1) & 1);
      const bb = b0 + ((i >> 2) & 1);
      const w = (i & 1 ? dr : 1 - dr) * ((i >> 1) & 1 ? dg : 1 - dg) * ((i >> 2) & 1 ? db : 1 - db);
      if (w <= 0) continue;
      v += w * t.lut[(rr * N * N + gg * N + bb) * 3 + k];
    }
    return v;
  };
  /** Apply to an RGBA buffer of the given size; regionAt gives a pixel's region. */
  const apply = (data, w, h, regionAt = () => 0) => {
    const lp = lowpass(data, w, h, R);
    const out = Buffer.from(data);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const reg = regionAt(x, y);
      const t = tables[reg];
      if (!t.n) continue;
      for (let k = 0; k < 3; k++) {
        const base = between(t, lp[o], lp[o + 1], lp[o + 2], k);
        out[o + k] = Math.max(0, Math.min(255, Math.round(base + gains[reg] * (data[o + k] - lp[o + k]))));
      }
    }
    return out;
  };
  apply.lift = { contrast: gains.reduce((a, b) => a + b, 0) / gains.length, sat: Math.min(1.8, Math.max(0.8, satGain)) };
  return apply;
}

/**
 * The grade as distribution matching (18m): per region and channel, the
 * source's histogram over the background is mapped onto the reference's
 * by quantile, so the brightness, contrast and colour of each band are
 * the reference's — without pairing any pixel with any other, which the
 * quiet park's repainted dapples and leaves do not allow. The lift for
 * the seasons is the reference's spread of luminance over the source's,
 * and of saturation.
 */
function gradeCurves(src, ref, regionOf, regions, exclude) {
  const hist = () => Array.from({ length: regions }, () => [new Float64Array(256), new Float64Array(256), new Float64Array(256)]);
  const hs = hist(), hr = hist();
  const stat = Array.from({ length: regions }, () => ({ n: 0, ls: 0, ls2: 0, lr: 0, lr2: 0, ss: 0, sr: 0 }));
  const lum = (d, o) => 0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2];
  const sat = (d, o) => { const mx = Math.max(d[o], d[o + 1], d[o + 2]); return mx ? (mx - Math.min(d[o], d[o + 1], d[o + 2])) / mx : 0; };
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    if (exclude(x, y)) continue;
    const r = regionOf(x, y);
    const o = (y * src.w + x) * 4;
    for (let c = 0; c < 3; c++) { hs[r][c][src.data[o + c]]++; hr[r][c][ref.data[o + c]]++; }
    const st = stat[r];
    const a = lum(src.data, o), b = lum(ref.data, o);
    st.n++; st.ls += a; st.ls2 += a * a; st.lr += b; st.lr2 += b * b; st.ss += sat(src.data, o); st.sr += sat(ref.data, o);
  }
  const curves = [];
  for (let r = 0; r < regions; r++) {
    curves.push([0, 1, 2].map((c) => {
      const cs = new Float64Array(256), cr = new Float64Array(256);
      let a = 0, b = 0;
      for (let v = 0; v < 256; v++) { a += hs[r][c][v]; cs[v] = a; b += hr[r][c][v]; cr[v] = b; }
      const map = new Uint8Array(256);
      if (!a || !b) { for (let v = 0; v < 256; v++) map[v] = v; return map; }
      let j = 0;
      for (let v = 0; v < 256; v++) {
        const q = cs[v] / a;
        while (j < 255 && cr[j] / b < q) j++;
        map[v] = j;
      }
      return map;
    }));
  }
  let contrast = 1, satGain = 1, n = 0;
  for (const st of stat) {
    if (st.n < 500) continue;
    const sdS = Math.sqrt(Math.max(1e-6, st.ls2 / st.n - (st.ls / st.n) ** 2));
    const sdR = Math.sqrt(Math.max(1e-6, st.lr2 / st.n - (st.lr / st.n) ** 2));
    contrast += sdR / sdS; satGain += st.ss ? st.sr / st.ss : 1; n++;
  }
  const lift = { contrast: n ? Math.min(1.8, Math.max(0.8, (contrast - 1) / n)) : 1, sat: n ? Math.min(1.8, Math.max(0.8, (satGain - 1) / n)) : 1 };
  console.log(`  grade: luminance spread × ${lift.contrast.toFixed(2)}, saturation × ${lift.sat.toFixed(2)} (${regions} regions, quantile matched)`);
  const apply = (data, w, h, regionAt) => {
    const out = Buffer.from(data);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const cv = curves[regionAt(x, y)];
      out[o] = cv[0][data[o]]; out[o + 1] = cv[1][data[o + 1]]; out[o + 2] = cv[2][data[o + 2]];
    }
    return out;
  };
  apply.lift = lift;
  return apply;
}

/** A scalar lift — the dots' contrast and the saturation — for an image
 *  whose colours the grade's lookup cannot be trusted on: a season. */
function liftImage(img, lift) {
  const R = 3;
  const lp = lowpass(img.data, img.w, img.h, R);
  const out = Buffer.from(img.data);
  for (let i = 0; i < img.w * img.h; i++) {
    const o = i * 4;
    const r = lp[o] + lift.contrast * (img.data[o] - lp[o]);
    const g = lp[o + 1] + lift.contrast * (img.data[o + 1] - lp[o + 1]);
    const b = lp[o + 2] + lift.contrast * (img.data[o + 2] - lp[o + 2]);
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    out[o] = Math.max(0, Math.min(255, Math.round(l + (r - l) * lift.sat)));
    out[o + 1] = Math.max(0, Math.min(255, Math.round(l + (g - l) * lift.sat)));
    out[o + 2] = Math.max(0, Math.min(255, Math.round(l + (b - l) * lift.sat)));
  }
  return { data: out, w: img.w, h: img.h };
}

/** A table's means, and its empty cells taking the nearest filled. */
function fillTable({ sum, cnt, lut, filled }, N) {
  for (let c = 0; c < N * N * N; c++) if (cnt[c] >= 4) { filled[c] = 1; for (let k = 0; k < 3; k++) lut[c * 3 + k] = sum[c * 3 + k] / cnt[c]; }
  for (let pass = 0; pass < N; pass++) {
    const next = Uint8Array.from(filled);
    let grew = 0;
    for (let r = 0; r < N; r++) for (let g = 0; g < N; g++) for (let b = 0; b < N; b++) {
      const c = r * N * N + g * N + b;
      if (filled[c]) continue;
      let n = 0; const acc = [0, 0, 0];
      for (const [dr, dg, db] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]) {
        const rr = r + dr, gg = g + dg, bb = b + db;
        if (rr < 0 || gg < 0 || bb < 0 || rr >= N || gg >= N || bb >= N) continue;
        const cc = rr * N * N + gg * N + bb;
        if (!filled[cc]) continue;
        n++;
        for (let k = 0; k < 3; k++) acc[k] += lut[cc * 3 + k];
      }
      if (n) { next[c] = 1; for (let k = 0; k < 3; k++) lut[c * 3 + k] = acc[k] / n; grew++; }
    }
    filled.set(next);
    if (!grew) break;
  }
  // Whatever the dilation could not reach takes the nearest filled cell
  // in colour space (18ac). Left unfilled, those cells used to mean "do
  // not touch this pixel", and a patch of summer sky would survive into
  // October as a pale panel.
  const left = [];
  for (let c = 0; c < N * N * N; c++) if (!filled[c]) left.push(c);
  if (left.length) {
    const have = [];
    for (let c = 0; c < N * N * N; c++) if (filled[c]) have.push(c);
    for (const c of left) {
      const r = (c / (N * N)) | 0;
      const g = ((c / N) | 0) % N;
      const b = c % N;
      let best = -1;
      let bd = Infinity;
      for (const h of have) {
        const hr = (h / (N * N)) | 0;
        const hg = ((h / N) | 0) % N;
        const hb = h % N;
        const d = (hr - r) ** 2 + (hg - g) ** 2 + (hb - b) ** 2;
        if (d < bd) { bd = d; best = h; }
      }
      if (best >= 0) { filled[c] = 1; for (let k = 0; k < 3; k++) lut[c * 3 + k] = lut[best * 3 + k]; }
    }
  }
}

/** The summer continuation recoloured to a season. */
async function seasoned(outpaint, summer, season, lookup) {
  const map = lookup ?? seasonLookup(summer, season);
  return { data: map(outpaint.data, outpaint.w, outpaint.h, regionAtWide), w: outpaint.w, h: outpaint.h, map };
}

/** A pixel's region in the wide frame, from given lines. */
function regionAtWideWith(L, x, y) {
  if (!L) return 0;
  const c = Math.max(0, Math.min(WIDE[0] - 1, x));
  if (y < L.skyTop[c]) return 0;
  if (y < L.waterFar[c]) return 1;
  if (y < L.waterNear[c]) return 2;
  return 3;
}

/** A pixel's region in the wide frame, from the summer's lines. */
function regionAtWide(x, y) {
  const L = regionLines;
  if (!L) return 0;
  const c = Math.max(0, Math.min(WIDE[0] - 1, x));
  if (y < L.skyTop[c]) return 0;
  if (y < L.waterFar[c]) return 1;
  if (y < L.waterNear[c]) return 2;
  return 3;
}

/** A painting-sized image set into a frame the size of `like`, at ORIGIN,
 *  the frame's own pixels elsewhere. */
async function place(img, like) {
  const data = Buffer.from(like.data);
  const [ox, oy] = ORIGIN;
  for (let y = 0; y < img.h; y++) {
    const src = (y * img.w) * 4;
    img.data.copy(data, ((y + oy) * like.w + ox) * 4, src, src + img.w * 4);
  }
  return { data, w: like.w, h: like.h };
}

async function load(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

const smooth01 = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** A box blur of a single-channel float field, `r` either side. */
function blur(src, w, h, r) {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    let acc = 0;
    for (let x = -r; x <= r; x++) acc += src[y * w + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = acc / (2 * r + 1);
      acc += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc / (2 * r + 1);
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

/** Grow (sign +1) or shrink (−1) a 0–1 field by r pixels, square. */
function morph(src, w, h, r, sign) {
  const out = new Float32Array(w * h);
  const pick = sign > 0 ? Math.max : Math.min;
  const tmp = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let v = src[y * w + x];
      for (let k = -r; k <= r; k++) v = pick(v, src[y * w + Math.min(w - 1, Math.max(0, x + k))]);
      tmp[y * w + x] = v;
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let v = tmp[y * w + x];
      for (let k = -r; k <= r; k++) v = pick(v, tmp[Math.min(h - 1, Math.max(0, y + k)) * w + x]);
      out[y * w + x] = v;
    }
  return out;
}

/** The two frames, the tree matte, the base with the trees filled from
 *  behind, and the two boundary polylines — computed once per pair. */
const LINES = 'assets/raw/scene-04/ref/lines.json';
const MATTE = 'assets/raw/scene-04/ref/summer-matte.png';
const QUIET = 'assets/raw/scene-04/ref/summer-quiet.png';
/** The summer's lines, for widen()'s per-region fit; set by prepare(). */
let regionLines = null;
const BASE = 'assets/raw/scene-04/ref/summer-base.png';

/**
 * The continuation matched to the painting along each edge (18u). A
 * global fit per region leaves the local steps that show as rectangles
 * in the sky and blocks in the far treeline, because the pieces the
 * continuation was painted in differ from one another. This reads the
 * painting's own last sixty columns (or rows) against the sixty just
 * outside them, line by line, smooths that correction along the edge and
 * eases it out over five hundred pixels — so whatever is just beyond the
 * frame begins as the frame's own tone and drifts from there, and no
 * edge of the painting can be found by looking. Then the grain: the
 * continuation is smooth where the painting is a mat of small strokes,
 * and a smooth field beside a dotted one reads as a pane of haze laid
 * over the picture. The difference is measured per region and the
 * shortfall made up with noise at the painting's own dot scale — nothing
 * is copied, so nothing structured comes across; only the roughness.
 */
function matchEdges(data, w, h, ox, oy) {
  // The continuation matched to the painting along each edge (18u). A
  // global fit per region leaves the local steps that show as rectangles
  // in the sky and blocks in the far treeline, because the pieces the
  // continuation was painted in differ from one another. This reads the
  // painting's own last sixty columns (or rows) against the sixty just
  // outside them, line by line, smooths that correction along the edge
  // and eases it out over five hundred pixels — so whatever is just
  // beyond the frame begins as the frame's own tone and drifts from
  // there, and no edge of the painting can be found by looking.
    const src = Buffer.from(data);
    const N = 60, EASE = 500, SM = 24;
    const meanOf = (fn, n) => {
      const acc = [0, 0, 0];
      let m = 0;
      for (let k = 0; k < n; k++) { const o = fn(k); if (o < 0) continue; acc[0] += src[o]; acc[1] += src[o + 1]; acc[2] += src[o + 2]; m++; }
      return m ? acc.map((v) => v / m) : null;
    };
    const smoothRuns = (arr) => {
      const out = arr.map(() => [1, 1, 1]);
      for (let i = 0; i < arr.length; i++) {
        const acc = [0, 0, 0];
        let n = 0;
        for (let k = -SM; k <= SM; k++) { const r = arr[i + k]; if (!r) continue; acc[0] += r[0]; acc[1] += r[1]; acc[2] += r[2]; n++; }
        if (n) out[i] = acc.map((v) => v / n);
      }
      return out;
    };
    const pw = 1536, ph = 1024;
    // left and right: a gain per row
    const rowGain = (inner, outer) => {
      const g = [];
      for (let y = 0; y < h; y++) {
        if (y < oy || y >= oy + ph) { g.push(null); continue; }
        const mi = meanOf((k) => inner(y, k), N);
        const mo = meanOf((k) => outer(y, k), N);
        g.push(mi && mo ? [0, 1, 2].map((c) => Math.min(1.6, Math.max(0.6, (mi[c] + 4) / (mo[c] + 4)))) : null);
      }
      return smoothRuns(g);
    };
    const gl = rowGain((y, k) => (y * w + ox + k) * 4, (y, k) => (y * w + Math.max(0, ox - 1 - k)) * 4);
    const gr = rowGain((y, k) => (y * w + ox + pw - 1 - k) * 4, (y, k) => (y * w + Math.min(w - 1, ox + pw + k)) * 4);
    // top: a gain per column
    const colGain = [];
    for (let x = 0; x < w; x++) {
      if (x < ox || x >= ox + pw) { colGain.push(null); continue; }
      const mi = meanOf((k) => ((oy + k) * w + x) * 4, N);
      const mo = meanOf((k) => (Math.max(0, oy - 1 - k) * w + x) * 4, N);
      colGain.push(mi && mo ? [0, 1, 2].map((c) => Math.min(1.6, Math.max(0.6, (mi[c] + 4) / (mo[c] + 4)))) : null);
    }
    const gt = smoothRuns(colGain);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x < ox ? ox - x : x >= ox + pw ? x - (ox + pw - 1) : 0;
        const dy = y < oy ? oy - y : y >= oy + ph ? y - (oy + ph - 1) : 0;
        if (!dx && !dy) continue;
        const o = (y * w + x) * 4;
        // the nearer edge decides; a corner takes both, the nearer weighing more
        const parts = [];
        if (dx) parts.push([x < ox ? gl[Math.max(oy, Math.min(oy + ph - 1, y))] : gr[Math.max(oy, Math.min(oy + ph - 1, y))], dx]);
        if (dy && y < oy) parts.push([gt[Math.max(ox, Math.min(ox + pw - 1, x))], dy]);
        if (!parts.length) continue;
        let wsum = 0;
        const g = [0, 0, 0];
        for (const [gain, d] of parts) {
          if (!gain) continue;
          const k = Math.max(0, 1 - d / EASE) / Math.max(1, d);
          for (let c = 0; c < 3; c++) g[c] += gain[c] * k;
          wsum += k;
        }
        if (wsum <= 0) continue;
        const d0 = Math.max(dx, dy);
        const ease = Math.max(0, 1 - d0 / EASE);
        for (let c = 0; c < 3; c++) {
          const gain = 1 + (g[c] / wsum - 1) * ease;
          data[o + c] = Math.max(0, Math.min(255, Math.round(src[o + c] * gain)));
        }
      }
    }
    console.log('  continuation matched to the painting along its edges');
    // …and given dots of its own (18u). Tone is not the whole of it: the
    // continuation is smooth where the painting is a mat of small
    // strokes, and a smooth field beside a dotted one reads as a pane of
    // haze laid over the picture, which is what the frame's edge looked
    // like. So the difference in grain is measured per region — how much
    // the painting departs from its own blur, how much the continuation
    // does — and the shortfall is made up with noise at the painting's
    // own dot scale. Nothing is copied, so nothing structured comes
    // across; only the roughness matches.
    {
      const R = 4;
      const lowOf = (buf) => [0, 1, 2].map((c) => {
        const f = new Float32Array(w * h);
        for (let i = 0; i < w * h; i++) f[i] = buf[i * 4 + c];
        return blur(f, w, h, R);
      });
      const low = lowOf(data);
      const amp = [];
      for (let r = 0; r < 4; r++) amp.push([[0, 0], [0, 0], [0, 0]].map(() => ({ inn: 0, ni: 0, out: 0, no: 0 })));
      for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
        const inside = x >= ox && x < ox + 1536 && y >= oy && y < oy + 1024;
        const d = inside ? 0 : Math.max(ox - x, x - (ox + 1535), oy - y, y - (oy + 1023));
        if (!inside && d > 700) continue;
        const r = regionAtWide(x, y);
        const i = y * w + x, o = i * 4;
        for (let c = 0; c < 3; c++) {
          const e = data[o + c] - low[c][i];
          const a = amp[r][c];
          if (inside) { a.inn += e * e; a.ni++; } else { a.out += e * e; a.no++; }
        }
      }
      const need = amp.map((cs) => cs.map((a) => {
        if (a.ni < 500 || a.no < 500) return 0;
        const si = Math.sqrt(a.inn / a.ni), so = Math.sqrt(a.out / a.no);
        return Math.sqrt(Math.max(0, si * si - so * so));
      }));
      console.log(`  grain to make up, per region: ${need.map((c) => c.map((v) => v.toFixed(1)).join('/')).join('  ')}`);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const inside = x >= ox && x < ox + 1536 && y >= oy && y < oy + 1024;
        if (inside) continue;
        const d = Math.max(ox - x, x - (ox + 1535), oy - y, y - (oy + 1023));
        const ease = Math.max(0, Math.min(1, 1 - (d - 600) / 400));
        if (ease <= 0) continue;
        const r = regionAtWide(x, y);
        const o = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) {
          const n = vnoise(x / 2.3, y / 2.3, 11.7 + c * 5.3) - 0.5;
          const n2 = vnoise(x / 5.1, y / 5.1, 31.3 + c * 7.1) - 0.5;
          data[o + c] = Math.max(0, Math.min(255, Math.round(data[o + c] + (n * 2.1 + n2 * 1.2) * need[r][c] * ease)));
        }
      }
    }
  }

async function prepare(files, opts = {}) {
  const key = files.join('|');
  if (cache.has(key)) return cache.get(key);
  let seasonSky = null;
  let treesRGB = null;
  let seasonMatte = null;
  const [painting, emptyPainting, outpaintIn] = await Promise.all(files.map(load));
  // A season's continuation (18j): the summer's, with the season's
  // colours mapped onto it — a lookup learned from the painting pair,
  // summer beside season, pixel for pixel. Turning the wide frame to a
  // season as a picture had the model recompose it: elms moved, new
  // trees on the lawn. A mapping moves nothing.
  regionLines = opts.lines === 'summer' && existsSync(LINES) ? JSON.parse(readFileSync(LINES, 'utf8')) : null;
  // The grade (18m): the model's quiet park is paler and smoother than
  // the reference painting. A lookup learned from the quiet park to the
  // reference over the background — the painting's people left out —
  // per region where the lines are known, with the reference's own dot
  // strength, brings every band to the painting's colour and contrast.
  // A season, whose colours the lookup was not learned on, takes the
  // same lift as a contrast and a saturation gain.
  let grade = null;
  if (opts.grade) {
    const ref = await load(opts.grade);
    const gradeSource = opts.seasonOf ? await load(opts.seasonOf) : painting;
    const linesForGrade = regionLines ?? (existsSync(LINES) ? JSON.parse(readFileSync(LINES, 'utf8')) : null);
    const regionP = (x, y) => {
      const L = linesForGrade;
      if (!L) return 0;
      const c = Math.max(0, Math.min(WIDE[0] - 1, x + ORIGIN[0]));
      const yy = y + ORIGIN[1];
      if (yy < L.skyTop[c]) return 0;
      if (yy < L.waterFar[c]) return 1;
      if (yy < L.waterNear[c]) return 2;
      return 3;
    };
    const exclude = (x, y) => LIFE_BOXES.some(([bx, by, bw, bh]) => x >= bx && x < bx + bw && y >= by && y < by + bh);
    grade = gradeCurves(gradeSource, ref, regionP, linesForGrade ? 4 : 1, exclude);
  }
  const summerPainting = opts.seasonOf ? await load(opts.seasonOf) : null;
  if (grade && summerPainting) summerPainting.data = grade(summerPainting.data, summerPainting.w, summerPainting.h, (x, y) => regionAtWide(x + ORIGIN[0], y + ORIGIN[1]));
  if (grade && opts.seasonOf) painting.data = liftImage(painting, grade.lift).data;
  // The dots' share per region is read from the pair itself: snow carries
  // little of the summer lawn's contrast, a spring lawn nearly all of it.
  const lookup = summerPainting ? seasonLookup(summerPainting, painting, (x, y) => regionAtWide(x + ORIGIN[0], y + ORIGIN[1]), regionLines ? 4 : 1, { detailGain: 'auto' }) : null;
  const outpaint = outpaintIn && lookup ? await seasoned(outpaintIn, summerPainting, painting, lookup) : outpaintIn;
  // The empty view from v2 on was painted through a mask the shape of the
  // trees and is faithful everywhere else; v1 was not.
  emptyPainting.masked = !/empty-view-v1\.png$/.test(files[1]);
  // The frame the bands are cut in: the painting, or the wide frame
  // with the painting set into the doubled continuation.
  const quiet = outpaint ? await widen(painting, outpaint) : painting;
  const empty = outpaint ? await place(emptyPainting, quiet) : emptyPainting;
  empty.masked = emptyPainting.masked;
  const ox = outpaint ? ORIGIN[0] : 0;
  const oy = outpaint ? ORIGIN[1] : 0;
  const { w, h } = quiet;
  if (grade && !opts.seasonOf) {
    const L = regionLines ?? (existsSync(LINES) ? JSON.parse(readFileSync(LINES, 'utf8')) : null);
    const regionW = (x, y) => regionAtWideWith(L, x, y);
    quiet.data = grade(quiet.data, w, h, regionW);
    empty.data = grade(empty.data, w, h, regionW);
  }
  if (outpaint) matchEdges(quiet.data, w, h, ox, oy);
  // The lawn beyond the frame's sides (18t): the painting's own grass
  // mirrored outward about each edge, not the continuation's, whose
  // green is a different green in every season and which showed as two
  // wedges either side of the near lawn as the eye drew back. Done here,
  // on the graded frame, so the tone matches by construction. Grass is a
  // texture and takes a mirror without showing it; the lake and the far
  // shore keep the continuation, since a second bandshell would not.
  if (outpaint) {
    const L = regionLines ?? (existsSync(LINES) ? JSON.parse(readFileSync(LINES, 'utf8')) : null);
    const pw = 1536, ph = 1024;
    for (let y = oy; y < Math.min(h, oy + ph); y++) {
      for (let x = 0; x < w; x++) {
        if (x >= ox && x < ox + pw) continue;
        const mx = x < ox ? 2 * ox - 1 - x : 2 * (ox + pw) - 1 - x;
        if (mx < ox || mx >= ox + pw) continue;
        // the sky above the treeline and the lawn below the water: the
        // painting's own, mirrored. The treeline and the lake between
        // them keep the continuation, since a second bandshell would show.
        const lawn = L ? L.waterNear[mx] + 6 : oy + 566;
        const sky = L ? L.skyTop[mx] - 6 : oy + 150;
        // eased at both boundaries, else the switch from the painting's
        // own sky to the continuation traced the treeline as a step
        const F = 70;
        const k = y < sky ? Math.min(1, (sky - y) / F) : y >= lawn ? Math.min(1, (y - lawn) / F) : 0;
        if (k <= 0) continue;
        const t = k * k * (3 - 2 * k);
        const o = (y * w + x) * 4;
        const so = (y * w + mx) * 4;
        for (let c = 0; c < 3; c++) quiet.data[o + c] = Math.round(quiet.data[o + c] * (1 - t) + quiet.data[so + c] * t);
      }
    }
  }
  if (empty.masked) {
    // the mask itself, as a field in the frame: 1 where the model painted
    const mk = await load('assets/raw/scene-04/ref/tree-mask.png');
    const field = new Float32Array(w * h);
    for (let y = 0; y < mk.h; y++) for (let x = 0; x < mk.w; x++) if (mk.data[(y * mk.w + x) * 4 + 3] === 0) field[(y + oy) * w + x + ox] = 1;
    empty.mask = field;
  }
  // ---- the far shore's top against the sky, over the quiet park: per
  // column, the first row from the top in the band whose neighbourhood
  // is not sky-light — the canopy's leaves are excluded by the columns
  // they fill, so the line runs under the leaves at the treeline.
  const q = quiet.data;
  const lumAt = (o) => (0.299 * q[o] + 0.587 * q[o + 1] + 0.114 * q[o + 2]) / 255;
  const skyLike = (o) => {
    const r = q[o], g = q[o + 1], b = q[o + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return lumAt(o) > 0.6 && b >= g - 10 && (mx - mn) / Math.max(1, mx) < 0.5;
  };
  const greenLike = (o) => q[o + 1] > q[o] + 6 && q[o + 1] > q[o + 2] + 6;
  const blueLike = (o) => q[o + 2] > q[o] + 28 && q[o + 2] > q[o + 1] + 2;
  // Tree pixels first, so the treeline is found where no leaf hangs.
  let m = new Float32Array(w * h);
  const inBox = (x, y, [bx, by, bw, bh]) => x >= bx && x < bx + bw && y >= by && y < by + bh;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const o = i * 4;
      let tree = 0;
      if (CANOPY_REGIONS.some((r) => inBox(x - ox, y - oy, r)) && !skyLike(o)) tree = 1;
      // A trunk is bark: brown, darker than the sunlit path and the dry
      // grass, redder than either. Anything paler or greener inside its
      // column — the path, the wall, a blue shadow dot on the grass — is
      // not the tree, and drawn in front of the sitters it hid them.
      const bark = q[o] > q[o + 1] && q[o] > q[o + 2] + 5 && lumAt(o) < 0.76;
      if (TRUNK_REGIONS.some((r) => inBox(x - ox, y - oy, r)) && bark && !skyLike(o) && !greenLike(o) && !blueLike(o)) tree = 1;
      m[i] = tree;
    }
  // The treeline top: from the sky's own key, ignoring columns the
  // canopy fills at that row (they take the neighbours' answer).
  const skyTop = new Float32Array(w);
  {
    const notSky = new Float32Array(w * h);
    for (let y = 100 + oy; y < 320 + oy; y++) for (let x = 0; x < w; x++) notSky[y * w + x] = skyLike((y * w + x) * 4) ? 0 : 1;
    const f = blur(notSky, w, h, 4);
    const raw = new Float32Array(w).fill(-1);
    for (let x = 0; x < w; x++) {
      // Walk down: the treeline is a not-sky run that holds to the water.
      // A column the canopy fills from the scan's first row has no
      // answer of its own (18s): it took the scan's start as its line,
      // and a rectangle of the wrong rule sat under the right elm.
      let seenSky = false;
      for (let y = 120 + oy; y < 300 + oy; y++) {
        if (f[y * w + x] <= 0.5) { seenSky = true; continue; }
        if (!seenSky) continue;
        let holds = true;
        for (let yy = y; yy < Math.min(300 + oy, y + 60); yy += 6) if (f[yy * w + x] <= 0.5) { holds = false; break; }
        if (holds) { raw[x] = y; break; }
      }
    }
    // Columns with no answer (leaves all the way down) take the nearest.
    let last = 190 + oy;
    for (let x = 0; x < w; x++) { if (raw[x] < 0) raw[x] = last; else last = raw[x]; }
    last = raw[w - 1];
    for (let x = w - 1; x >= 0; x--) { if (raw[x] < 0) raw[x] = last; else last = raw[x]; }
    skyTop.set(raw);
    median(skyTop, 41);
  }
  // Canopy pixels only count above the treeline plus a little: below it
  // the leaves are in front of the far shore and stay in it.
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!m[i]) continue;
      const trunk = TRUNK_REGIONS.some((r) => inBox(x - ox, y - oy, r));
      if (!trunk && y > skyTop[x] + 4) m[i] = 0;
    }
  m = morph(morph(m, w, h, 2, -1), w, h, 2, 1); // open: drop specks
  m = morph(m, w, h, 4, 1); // grow: the trees carry a ring of their ground
  m = morph(morph(m, w, h, 3, 1), w, h, 3, -1); // close
  // With an empty view painted through a mask the shape of the trees
  // (18i), the matte is what differs between the two inside that mask,
  // grown a little: leaves against the sky it painted behind them, bark
  // against the shore and water it continued — and nothing outside the
  // mask, which it kept. The colour key only says where to look.
  if (empty.masked) {
    // Where to look: the mask the model painted through, grown a little
    // — it covers the roots and the pale bark the colour key missed.
    const look = empty.mask ? morph(empty.mask, w, h, 6, 1) : morph(m, w, h, 16, 1);
    const d = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      if (!look[i]) continue;
      const o = i * 4;
      const diff = Math.abs(quiet.data[o] - empty.data[o]) + Math.abs(quiet.data[o + 1] - empty.data[o + 1]) + Math.abs(quiet.data[o + 2] - empty.data[o + 2]);
      d[i] = smooth01(60, 130, diff);
    }
    let m2 = blur(d, w, h, 2);
    // Only where the colour key, grown a little, also says tree: the
    // model's blend along the mask's edge differs from the painting just
    // enough to read as difference, and rode on the plate as a hairline
    // tracing the mask's rectangles (18r).
    const nearKey = morph(m, w, h, 8, 1);
    for (let i = 0; i < w * h; i++) m2[i] = m2[i] > 0.4 && nearKey[i] > 0.5 ? 1 : 0;
    // The mask the empty view was painted through ends in straight
    // edges, and the canopy's lower fringe runs on past them (18s): the
    // difference can find no leaf outside the mask, where the empty view
    // kept the picture, so the base kept the leaves there and the sky
    // filled inside — a straight step from fill to fringe along every
    // box edge, read as a white outline. Within forty pixels outside the
    // mask, above the treeline's line, the colour key's own leaves —
    // green, or dark — join the matte.
    if (empty.mask) {
      const around = morph(empty.mask, w, h, 40, 1);
      let joined = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!around[i] || empty.mask[i] || !m[i] || m2[i] || y >= skyTop[x] - 4) continue;
        const o = i * 4;
        if (greenLike(o) || lumAt(o) < 0.55) { m2[i] = 1; joined++; }
      }
      console.log(`  ${joined} px of leaves past the mask's edge joined the matte`);
    }
    m2 = morph(morph(m2, w, h, 2, -1), w, h, 2, 1);
    m2 = morph(morph(m2, w, h, 4, 1), w, h, 4, -1);
    m2 = morph(m2, w, h, 3, 1);
    // Rounded: square kernels leave square corners, and a square corner
    // of fill in a treeline reads as a block.
    m2 = blur(m2, w, h, 3);
    for (let i = 0; i < w * h; i++) m2[i] = m2[i] > 0.5 ? 1 : 0;
    m = m2;
    // Islands (18s): a patch of the matte off on its own in the sky that
    // is sky by colour — a cloud the empty view painted differently — is
    // not a tree. Its fill showed as a blob with a pale ring. Such
    // components under 6000 px that do not reach the frame's top edge
    // go; the picture keeps its own pixels there.
    {
      const label = new Int32Array(w * h).fill(-1);
      const stack = new Int32Array(w * h);
      let next = 0;
      for (let s0 = 0; s0 < w * h; s0++) {
        if (!m[s0] || label[s0] >= 0) continue;
        let top = 0, area = 0, minY = h;
        stack[top++] = s0; label[s0] = next;
        const members = [];
        while (top) {
          const i = stack[--top];
          area++; members.push(i);
          const yy = (i / w) | 0, xx = i - yy * w;
          if (yy < minY) minY = yy;
          const nb = [i - 1, i + 1, i - w, i + w];
          if (xx === 0) nb[0] = -1; if (xx === w - 1) nb[1] = -1;
          for (const j of nb) if (j >= 0 && j < w * h && m[j] && label[j] < 0) { label[j] = next; stack[top++] = j; }
        }
        // …and only islands that are sky by colour: a tuft of leaves clear
        // of the canopy stays a tree, else the treeline's line sat on it.
        if (minY > oy + 4) {
          let sky = 0, cy = 0, cx = 0;
          for (const i of members) { if (skyLike(i * 4)) sky++; cy += (i / w) | 0; cx += i % w; }
          cy /= area; cx /= area;
          // …and a piece of the far treeline the empty view repainted
          // differently — off the canopy, lying mostly below the treeline's
          // line — is the far shore, not an elm.
          const shore = cy > skyTop[Math.round(cx)] - 4;
          if ((area < 6000 && sky > area * 0.5) || shore) for (const i of members) m[i] = 0;
        }
        next++;
      }
    }
    // The cut (18s): the matte is confined to the mask the empty view
    // was painted through, whose edge is straight, and along that cut it
    // kept a band of the pale sky between the leaves' last fringe — a
    // pale strip with a rectangular edge over the bluer sky behind, read
    // as a white outline. Within ten pixels of the matte's own boundary
    // a pixel that is sky by colour is not a leaf and goes, so the edge
    // ends on leaves.
    {
      const core = morph(m, w, h, 16, -1);
      // pale: light and nearly grey, whatever its cast — the haze is a
      // greenish white the sky's own key does not admit
      const pale = (o) => {
        const r = q[o], g = q[o + 1], b = q[o + 2];
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        return lumAt(o) > 0.72 && (mx - mn) / Math.max(1, mx) < 0.3;
      };
      let dropped = 0;
      for (let i = 0; i < w * h; i++) if (m[i] && !core[i] && pale(i * 4)) { m[i] = 0; dropped++; }
      m = morph(morph(m, w, h, 1, -1), w, h, 1, 1);
      console.log(`  ${dropped} px of pale sky dropped from the matte's edge`);
    }
    // The model's repaint drifts a shade even where it kept the picture:
    // read that drift where both images should agree — just outside the
    // mask — and take it out of the fill.
    const ring = morph(empty.mask, w, h, 30, 1);
    const ratios = [[], [], []];
    for (let i = 0; i < w * h; i += 2) {
      if (!ring[i] || empty.mask[i]) continue;
      const o = i * 4;
      for (let c = 0; c < 3; c++) if (quiet.data[o + c] > 24 && empty.data[o + c] > 24) ratios[c].push(quiet.data[o + c] / empty.data[o + c]);
    }
    empty.gain = ratios.map((r) => { r.sort((a, b) => a - b); return r.length ? Math.min(1.2, Math.max(0.85, r[r.length >> 1])) : 1; });
    console.log(`  empty view drift gain ${empty.gain.map((g) => g.toFixed(3)).join(' ')}`);
  }
  // The treeline's top under the canopy (18s): where the line found
  // touches the matte it is the canopy's lower edge, or a tuft's, not
  // the treeline, which is hidden there; those columns take the line
  // interpolated between the nearest columns where the treeline is seen.
  // Applied to the line found before the fill and to the one found on
  // the base after it, which else sat on the fill under the tufts and
  // stepped the far shore's top edge into rectangles.
  const holdUnderCanopy = (line) => {
    const valid = new Uint8Array(w);
    for (let x = 0; x < w; x++) {
      let ok = 1;
      const t = Math.round(line[x]);
      for (let y = t - 20; y <= t + 2; y++) if (y >= 0 && y < h && m[y * w + x]) { ok = 0; break; }
      valid[x] = ok;
    }
    let x = 0, changed = 0;
    while (x < w) {
      if (valid[x]) { x++; continue; }
      let e = x;
      while (e < w && !valid[e]) e++;
      // A span that runs out of the frame holds the frame's own value:
      // the continuation's treeline is a taller one.
      let a = x > 0 ? line[x - 1] : e < w ? line[e] : line[x];
      let b = e < w ? line[e] : a;
      if (e >= ox + 1536 && x > ox) b = a;
      if (x <= ox && e < ox + 1536) a = b;
      for (let k = x; k < e; k++) { line[k] = a + ((b - a) * (k - x + 1)) / (e - x + 1); changed++; }
      x = e;
    }
    median(line, 41);
    return changed;
  };
  console.log(`  treeline under the canopy: ${holdUnderCanopy(skyTop)} columns interpolated`);
  // Hard, not feathered: the base under the trees is filled from the
  // empty view by this same mask, and a soft edge shared by both let a
  // quarter of the empty view through along every trunk as a hairline.
  // The ring of the trees' own ground hides the hard edge from the seat.
  // ---- the base: the quiet park, the trees filled from behind — two
  // pixels inside the matte, not to its edge: the renderer filters the
  // trees' alpha across a texel, and quiet over quiet there is nothing,
  // where quiet over a fill was a hairline down every trunk. The fill
  // is the neighbourhood's own (18i): in the canopy, the sky mirrored
  // down from above the painting's top edge, which the wide frame has
  // as open sky; at a trunk, the row mirrored in from either side of
  // it. The empty view — repainted, a different far shore, a different
  // sky — fills only where neither neighbour is there.
  const mBase = morph(m, w, h, 2, -1);
  // Where the fill may come from behind the trees: the matte grown three
  // pixels, eased over two more.
  // Twelve pixels past the matte, not three (18s): the painting's own
  // pale glow around every leaf cluster stayed in the base just outside
  // the matte, and under a sharp-edged plate it read as a white outline
  // tracing the canopy. The fill runs out past the glow, so the leaves
  // sit on plain sky.
  const fillNear = blur(morph(m, w, h, 12, 1), w, h, 2);
  for (let i = 0; i < w * h; i++) fillNear[i] = Math.min(1, fillNear[i] * 1.2);
  const base = Buffer.alloc(w * h * 4);
  const mixRGB = [0, 0, 0];
  if (process.env.BANDS_DEBUG && !opts.seasonOf) {
    const dbg = Buffer.alloc(w * h * 4);
    for (let i = 0; i < w * h; i++) { dbg[i * 4] = Math.round(255 * Math.min(1, fillNear[i])); dbg[i * 4 + 1] = m[i] > 0.5 ? 255 : 0; dbg[i * 4 + 2] = empty.mask && empty.mask[i] ? 255 : 0; dbg[i * 4 + 3] = 255; }
    await sharp(dbg, { raw: { width: w, height: h, channels: 4 } }).png().toFile('assets/raw/scene-04/ref/debug-fill.png');
  }
  const trunkAt = (x, y) => TRUNK_REGIONS.some((r) => inBox(x - ox, y - oy, r));
  const src = (x, y) => (y * w + x) * 4;
  // Per row, the runs of fill and the length of clear picture beyond
  // each end of them (to 400 px), for the mirror-tiled fill below.
  const rowSegs = new Map();
  // Where the picture is sky, softly: the colour key blurred, for the
  // row rule to know a mirrored source's kind.
  const skyF = new Float32Array(w * h);
  if (empty.masked) {
    const sk = new Float32Array(w * h);
    for (let y = 0; y < Math.min(h, oy + 340); y++) for (let x = 0; x < w; x++) sk[y * w + x] = skyLike((y * w + x) * 4) ? 1 : 0;
    skyF.set(blur(sk, w, h, 4));
  }
  // The sky behind the leaves (18s): the painting's own sky, thrown.
  // A patch mirror-tiled made a lattice of its own symmetry and bands of
  // its gradient; a row's own clear sky is forty pixels wide at the top
  // of the frame. So the fill is laid in six-pixel cells, each a cell
  // of real sky taken at random from the clear runs of a nearby row
  // that has enough of them — the dots at their own scale, no two
  // cells alike, no axis, no period — and each sample shifted to the
  // mean colour of the destination row's own clear sky, so the fill is
  // bluer at the top and paler at the treeline as the painting is.
  const CELL = 6;
  const rowMean = new Map();
  let nearLeaf = null;
  let isSkySrc = () => false;
  const clearRuns = new Map();
  const goodRows = [];
  if (empty.masked) {
    // A source cell is sky by colour too, and eight pixels clear of any
    // leaf: cells of foliage and leaf haze otherwise speckled the fill.
    const fillPos = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) fillPos[i] = fillNear[i] > 0 ? 1 : 0;
    nearLeaf = morph(fillPos, w, h, 8, 1);
    // and not a cloud: paler, blurred, than the row's sky by a twenty-fifth
    const lumF = new Float32Array(w * h);
    for (let y = 0; y < Math.min(h, oy + 340); y++) for (let x = 0; x < w; x++) { const o = (y * w + x) * 4; lumF[y * w + x] = (0.299 * quiet.data[o] + 0.587 * quiet.data[o + 1] + 0.114 * quiet.data[o + 2]) / 255; }
    const lumB = blur(lumF, w, h, 4);
    const rowLum = new Float32Array(h);
    for (let y = 0; y < Math.min(h, oy + 340); y++) {
      const v = [];
      for (let x = ox; x < ox + 1536; x++) if (nearLeaf[y * w + x] === 0 && y < skyTop[x] - 4 && skyF[y * w + x] > 0.6) v.push(lumB[y * w + x]);
      v.sort((p, q) => p - q);
      rowLum[y] = v.length ? v[v.length >> 1] : 1;
    }
    const isSky = (x, y) => y >= 0 && y < h && nearLeaf[y * w + x] === 0 && y < skyTop[x] - 4 && skyF[y * w + x] > 0.6 && lumB[y * w + x] < rowLum[y] + 0.04;
    isSkySrc = isSky;
    const raw = [];
    for (let y = oy - 60; y < oy + 330; y++) {
      const acc = [0, 0, 0]; let n = 0;
      const runs = [];
      let a = -1;
      for (let x = ox; x <= ox + 1536; x++) {
        const on = x < ox + 1536 && isSky(x, y);
        if (on) { const o = (y * w + x) * 4; acc[0] += quiet.data[o]; acc[1] += quiet.data[o + 1]; acc[2] += quiet.data[o + 2]; n++; }
        if (on && a < 0) a = x;
        if (!on && a >= 0) { if (x - a >= CELL + 2) runs.push({ a, len: x - a }); a = -1; }
      }
      raw.push(n >= 12 ? acc.map((v) => v / n) : null);
      if (y >= oy) {
        const total = runs.reduce((t, r) => t + r.len, 0);
        if (total >= 80) { clearRuns.set(y, { runs, total }); goodRows.push(y); }
      }
    }
    for (let i = 0; i < raw.length; i++) if (!raw[i]) { let j = 1; while (!raw[i - j] && !raw[i + j] && j < raw.length) j++; raw[i] = raw[i - j] ?? raw[i + j] ?? [140, 170, 210]; }
    for (let i = 0; i < raw.length; i++) {
      const acc = [0, 0, 0]; let n = 0;
      for (let k = -6; k <= 6; k++) { const r = raw[Math.max(0, Math.min(raw.length - 1, i + k))]; acc[0] += r[0]; acc[1] += r[1]; acc[2] += r[2]; n++; }
      rowMean.set(oy - 60 + i, acc.map((v) => v / n));
    }
    console.log(`  sky fill: ${goodRows.length} rows with clear sky to draw from, first ${goodRows[0] - oy}, last ${goodRows[goodRows.length - 1] - oy}`);
  }
  const cellHash = (cx, cy, k) => {
    let n = (cx * 374761393 + cy * 668265263 + k * 2246822519) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  /** The nearest row with clear sky to draw from, at or near `y`. */
  const nearestGood = (y) => {
    if (!goodRows.length) return -1;
    let lo = 0, hi = goodRows.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (goodRows[mid] < y) lo = mid + 1; else hi = mid; }
    const a = goodRows[lo], b = goodRows[Math.max(0, lo - 1)];
    return Math.abs(a - y) <= Math.abs(b - y) ? a : b;
  };
  /** Fill the sky at (x, y) into `out` from a thrown cell; false if there is nothing to draw from. */
  const skyFill = (x, y, out) => {
    if (!goodRows.length) return false;
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    const jitter = Math.round((cellHash(cx, cy, 1) - 0.5) * 16);
    const sy0 = nearestGood(cy * CELL + jitter);
    const { runs, total } = clearRuns.get(sy0);
    let pick = cellHash(cx, cy, 2) * total;
    let run = runs[0];
    for (const r of runs) { if (pick < r.len) { run = r; break; } pick -= r.len; }
    const sx0 = run.a + Math.floor(cellHash(cx, cy, 3) * Math.max(1, run.len - CELL));
    const sx = Math.min(run.a + run.len - 1, sx0 + (x - cx * CELL));
    let sy = sy0 + (y - cy * CELL);
    if (sy < 0 || sy >= h || !isSkySrc(sx, sy)) sy = sy0;
    const o = (sy * w + sx) * 4;
    const dm = rowMean.get(Math.max(oy - 60, Math.min(oy + 329, y)));
    const sm = rowMean.get(sy);
    for (let c = 0; c < 3; c++) out[c] = Math.max(0, Math.min(255, quiet.data[o + c] + dm[c] - sm[c]));
    return true;
  };
  if (empty.masked) {
    for (let y = 0; y < h; y++) {
      const segs = [];
      let x = 0;
      while (x < w) {
        if (fillNear[y * w + x] > 0) {
          const a = x;
          while (x < w && fillNear[y * w + x] > 0) x++;
          const b = x - 1;
          let runL = 0, runR = 0;
          // In the sky and treeline rows the sources are the painting's
          // own columns: the continuation's treeline is another treeline,
          // taller and flat-topped, and mirrored in it made a block.
          // … unless the painting offers under sixty pixels of it (the
          // left trunk stands twenty from the frame's edge).
          const lo = y < oy + 330 ? ox : 0, hi = y < oy + 330 ? ox + 1536 : w;
          for (let k = a - 1; k >= lo && runL < 400 && fillNear[y * w + k] === 0; k--) runL++;
          for (let k = b + 1; k < hi && runR < 400 && fillNear[y * w + k] === 0; k++) runR++;
          if (runL < 60 && lo > 0) { runL = 0; for (let k = a - 1; k >= 0 && runL < 400 && fillNear[y * w + k] === 0; k--) runL++; }
          if (runR < 60 && hi < w) { runR = 0; for (let k = b + 1; k < w && runR < 400 && fillNear[y * w + k] === 0; k++) runR++; }
          segs.push({ a, b, runL, runR });
        } else x++;
      }
      rowSegs.set(y, segs);
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const o = i * 4;
      const k = mBase[i];
      let fo = -1;
      if (empty.masked) {
        // Behind the leaves and trunks (18s): the painting's own row,
        // mirror-tiled in from the nearest clear pixels on either side of
        // the run the pixel is in — sky where the row is sky, treeline
        // where it is treeline, water and lawn below — so the fill has the
        // dots of the painting itself at full contrast, no rectangle
        // where one rule met another, and none of the continuation's
        // clouds, which mirrored down from above the frame as beige blobs
        // and a pale halo around every leaf (18r).
        if (fillNear[i] > 0 && y < skyTop[x] - 2 && skyFill(x, y, mixRGB)) {
          fo = -2;
        } else if (fillNear[i] > 0) {
          const seg = rowSegs.get(y).find((sg) => x >= sg.a && x <= sg.b);
          const tile = (edge, dir, run, d) => {
            const k = d % (2 * run);
            return edge + dir * (k < run ? k : 2 * run - 1 - k);
          };
          const span = seg.b - seg.a + 1;
          const dL = x - seg.a, dR = seg.b - x;
          let wL = seg.runL > 0 ? 1 : 0;
          if (seg.runL > 0 && seg.runR > 0) {
            // the nearer side, crossing over in the middle eighty pixels
            const mid = seg.a + span / 2;
            wL = 1 - smooth01(mid - 40, mid + 40, x);
            // a short run on the nearer side gives way to a long one
            if (seg.runL < 40 && seg.runR >= 120) wL = 0;
            if (seg.runR < 40 && seg.runL >= 120) wL = 1;
          }
          // A mirrored source that is sky takes the sky patch instead,
          // so the treeline's top under the canopy follows the mirrored
          // silhouette rather than a straight line, and the sky above it
          // is one field. A side that is sky does not blend with one
          // that is not.
          const sL = seg.runL > 0 ? tile(seg.a - 1, -1, seg.runL, dL) : -1;
          const sR = seg.runR > 0 ? tile(seg.b + 1, 1, seg.runR, dR) : -1;
          // (only in the treeline's rows: the water is blue too, and sky
          // cells were thrown into it behind the left trunk)
          const nearLine = y < skyTop[x] + 40;
          const skyL = nearLine && sL >= 0 && skyF[y * w + sL] > 0.5;
          const skyR = nearLine && sR >= 0 && skyF[y * w + sR] > 0.5;
          if (skyL !== skyR && sL >= 0 && sR >= 0) wL = wL >= 0.5 ? 1 : 0;
          const chosenSky = wL >= 0.5 ? skyL : skyR;
          if (chosenSky && skyFill(x, y, mixRGB)) {
            fo = -2;
          } else if (wL > 0 && wL < 1) {
            const a = src(tile(seg.a - 1, -1, seg.runL, dL), y), b = src(tile(seg.b + 1, 1, seg.runR, dR), y);
            for (let c = 0; c < 3; c++) mixRGB[c] = quiet.data[a + c] * wL + quiet.data[b + c] * (1 - wL);
            fo = -2;
          } else if (wL >= 1) fo = src(tile(seg.a - 1, -1, seg.runL, dL), y);
          else if (seg.runR > 0) fo = src(tile(seg.b + 1, 1, seg.runR, dR), y);
          else fo = o;
        } else {
          fo = o;
        }
      } else if (k > 0) {
        if (trunkAt(x, y)) {
          // the run of matte this row is in, and the side we are nearer
          let xa = x, xb = x;
          while (xa > 0 && mBase[y * w + xa - 1] > 0) xa--;
          while (xb < w - 1 && mBase[y * w + xb + 1] > 0) xb++;
          const left = x - xa <= xb - x;
          const sx = left ? xa - 1 - (x - xa) : xb + 1 + (xb - x);
          if (sx >= 0 && sx < w && mBase[y * w + sx] === 0) fo = src(sx, y);
        } else if (outpaint && oy > 0) {
          // mirrored about a line well above the frame's top, past the
          // leaf tips the continuation left there
          const sy = 2 * (oy - 70) - 1 - y;
          if (sy >= 0 && sy < h && mBase[sy * w + x] === 0) fo = src(x, sy);
        }
        if (fo < 0) fo = o; // the empty view, below
      }
      for (let c = 0; c < 3; c++) {
        const fill = fo === -2 ? mixRGB[c] : fo >= 0 && fo !== o ? quiet.data[fo + c] : Math.min(255, empty.data[o + c] * (empty.gain?.[c] ?? 1));
        // (fo === o means the empty view at this very pixel)
        // The empty view only close to the leaves and trunks themselves
        // (18r): the mask it was painted through was clipped to boxes and
        // grown wide, and the model painted sky over the strip of far
        // treeline inside it — rectangular notches in the treeline's top
        // wherever the base took the empty view whole.
        const kk = empty.masked ? fillNear[i] : k;
        base[o + c] = Math.round(quiet.data[o + c] * (1 - kk) + fill * kk);
      }
      base[o + 3] = 255;
    }
  }
  // ---- a season (18j) takes the summer's geometry whole: its tree
  // matte, and behind the trees its tree-free base turned to the season
  // by the lookup — the season's own edits behind the elms proved
  // unreliable (one came back golden in January), and the elms' shapes
  // are the same trees whatever the month.
  if (lookup && existsSync(MATTE) && existsSync(BASE)) {
    const sm = await load(MATTE);
    const sb = await load(BASE);
    for (let i = 0; i < w * h; i++) m[i] = sm.data[i * 4] > 127 ? 1 : 0;
    // The fill covers the whole mask the model painted through, as the
    // summer's does, softened a little at its edge.
    const region = blur(morph(m, w, h, 12, 1), w, h, 2);
    for (let i = 0; i < w * h; i++) region[i] = Math.min(1, region[i] * 1.2);
    const filled = matchAcross(lookup(sb.data, w, h, regionAtWide), w, h);
    // …and along each edge line by line, as the summer's frame is: a
    // single fit per region left the winter sky stepping at the
    // painting's boundary, where the lookup crushes everything toward
    // white and the smallest difference shows (18u).
    if (outpaint) matchEdges(filled, w, h, ox, oy);
    // October and April (18s): the canopy takes the summer elms' leaf
    // structure through the season's lookup — October's painting gave a
    // flat golden haze — thinned toward bare, more so in April's first
    // small leaves.
    if ((opts.season === 'autumn' || opts.season === 'spring') && existsSync(QUIET)) {
      // The season's own picture within the summer's silhouette (18s):
      // the summer leaves through the lookup came out a slab of mud.
      treesRGB = quiet.data;
      // April's leaves are pale against a pale sky, so little of its
      // canopy survives a thinning meant for October's (18t): it came
      // back as scattered blotches with no tree under them. April keeps
      // nearly all of the silhouette — its own art hangs the thin new
      // growth in front — and both keep their trunks, which the noise
      // had been punching holes in.
      const thin = opts.season === 'autumn' ? 0.38 : 0.2;
      const mt = new Float32Array(w * h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!m[i]) continue;
        if (trunkAt(x, y)) { mt[i] = 1; continue; }
        // coarse clumps thin, fine dots thin more: leaves go in patches
        const n1 = vnoise(x / 26, y / 26, 7.1), n2 = vnoise(x / 7, y / 7, 3.3);
        mt[i] = 0.6 * n1 + 0.4 * n2 > thin ? 1 : 0;
      }
      seasonMatte = mt;
    }
    // The season's own leaves and branches (18r): within the summer's
    // silhouette, what differs from the sky we fill behind it — October's
    // warm haze between bare branches matches its fill and goes, the
    // branches stay; January's grey sky likewise.
    {
      const q = quiet.data;
      const keep = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) {
        if (!m[i]) continue;
        const o = i * 4;
        const d = Math.abs(q[o] - filled[o]) + Math.abs(q[o + 1] - filled[o + 1]) + Math.abs(q[o + 2] - filled[o + 2]);
        keep[i] = d > 54 ? 1 : 0;
      }
      let k2 = blur(keep, w, h, 1);
      for (let i = 0; i < w * h; i++) k2[i] = k2[i] > 0.4 ? 1 : 0;
      k2 = morph(morph(k2, w, h, 1, -1), w, h, 2, 1);
      for (let i = 0; i < w * h; i++) m[i] = m[i] && k2[i] ? 1 : 0;
      if (seasonMatte) for (let i = 0; i < w * h; i++) m[i] = seasonMatte[i];
    }
    for (let i = 0; i < w * h; i++) {
      const o = i * 4;
      const k = Math.min(1, region[i]);
      for (let c = 0; c < 3; c++) base[o + c] = Math.round(quiet.data[o + c] * (1 - k) + filled[o + c] * k);
    }
    // The sky of a season is the summer's sky through the lookup, in the
    // painting as in its continuation, so no rectangle of a different
    // sky sits in the middle of the frame.
    seasonSky = filled;
  } else if (!lookup) {
    // the summer keeps its matte and base for the seasons
    const mp = Buffer.alloc(w * h * 4);
    for (let i = 0; i < w * h; i++) { const v = m[i] > 0.5 ? 255 : 0; mp[i * 4] = mp[i * 4 + 1] = mp[i * 4 + 2] = v; mp[i * 4 + 3] = 255; }
    await sharp(mp, { raw: { width: w, height: h, channels: 4 } }).png().toFile(MATTE);
    await sharp(base, { raw: { width: w, height: h, channels: 4 } }).png().toFile(BASE);
    await sharp(quiet.data, { raw: { width: w, height: h, channels: 4 } }).png().toFile(QUIET);
  }
  // ---- the treeline again, on the base — with the leaves gone from in
  // front of it the far shore's top is where it is, not where a leaf
  // ended. The sky band takes only sky: below this line its pixels are
  // the sky mirrored down, so no treeline rides in a band at the sky's
  // depth and doubles against the far shore's as the eye rises.
  {
    const lumB = (o) => (0.299 * base[o] + 0.587 * base[o + 1] + 0.114 * base[o + 2]) / 255;
    const skyB = (o) => {
      const r = base[o], g = base[o + 1], b = base[o + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      return lumB(o) > 0.6 && b >= g - 10 && (mx - mn) / Math.max(1, mx) < 0.5;
    };
    const notSky = new Float32Array(w * h);
    for (let y = 100 + oy; y < 320 + oy; y++) for (let x = 0; x < w; x++) notSky[y * w + x] = skyB((y * w + x) * 4) ? 0 : 1;
    const f = blur(notSky, w, h, 4);
    const raw = new Float32Array(w).fill(-1);
    for (let x = 0; x < w; x++) {
      // A column the canopy fills from the scan's first row has no
      // answer of its own (18s): it took the scan's start as its line,
      // and a rectangle of the wrong rule sat under the right elm.
      let seenSky = false;
      for (let y = 120 + oy; y < 300 + oy; y++) {
        if (f[y * w + x] <= 0.5) { seenSky = true; continue; }
        if (!seenSky) continue;
        let holds = true;
        for (let yy = y; yy < Math.min(300 + oy, y + 60); yy += 6) if (f[yy * w + x] <= 0.5) { holds = false; break; }
        if (holds) { raw[x] = y; break; }
      }
    }
    let last = 190 + oy;
    for (let x = 0; x < w; x++) { if (raw[x] < 0) raw[x] = last; else last = raw[x]; }
    last = raw[w - 1];
    for (let x = w - 1; x >= 0; x--) { if (raw[x] < 0) raw[x] = last; else last = raw[x]; }
    skyTop.set(raw);
    median(skyTop, 41);
    holdUnderCanopy(skyTop);
  }
  const skyOnly = Buffer.from(seasonSky ?? base);
  skyBelow(skyOnly, seasonSky ?? base, skyTop, w, h);
  // ---- the water's far and near edges: per column, the rows where
  // blue stops dominating, scanning up from the lawn and down from the
  // shore.
  const waterNear = new Float32Array(w);
  const waterFar = new Float32Array(w);
  {
    const blue = new Float32Array(w * h);
    for (let y = 250 + oy; y < 700 + oy; y++)
      for (let x = 0; x < w; x++) {
        const o = (y * w + x) * 4;
        blue[y * w + x] = base[o + 2] > base[o] + 30 && base[o + 2] > base[o + 1] + 4 ? 1 : 0;
      }
    const f = blur(blue, w, h, 6);
    for (let x = 0; x < w; x++) {
      let near = 300 + oy;
      for (let y = 660 + oy; y > 300 + oy; y--) if (f[y * w + x] > 0.5) { near = y; break; }
      waterNear[x] = near;
      let far = near;
      for (let y = 260 + oy; y < near; y++) if (f[y * w + x] > 0.5) { far = y; break; }
      waterFar[x] = far;
    }
    median(waterNear, 31);
    // The near shore is one gentle line across the width (18s): a column
    // whose blue was found down on the lawn — a shadow, a blanket — made a
    // rectangular dip in it, and the ground and water bands, cut along
    // it, met on hard vertical edges that the renderer's filtering left
    // as a darker hairline (two half-alphas). Held to a broad median.
    {
      const broad = Float32Array.from(waterNear);
      median(broad, 301);
      for (let x = 0; x < w; x++) waterNear[x] = Math.min(broad[x] + 12, Math.max(broad[x] - 12, waterNear[x]));
      median(waterNear, 31);
    }
    // The far waterline is one straight line across the painting; where
    // a column's blue was found up in the treeline's shadow dots, the
    // line is held to within a few pixels of the width's median. (The
    // stray rows became long slivers of lying water at the horizon,
    // drawn as diagonal streaks along the far shore's foot.)
    const sorted = Float32Array.from(waterFar).sort();
    const mid = sorted[sorted.length >> 1];
    for (let x = 0; x < w; x++) waterFar[x] = Math.min(mid + 4, Math.max(mid - 4, waterFar[x]));
    median(waterFar, 61);
  }
  // A season shares the summer's lines (18j): snow and ice have no blue
  // to find the water by, and the shore does not move with the year.
  if (opts.lines === 'keep') {
    writeFileSync(LINES, JSON.stringify({ skyTop: Array.from(skyTop), waterNear: Array.from(waterNear), waterFar: Array.from(waterFar) }));
  } else if (opts.lines === 'summer' && existsSync(LINES)) {
    const L = JSON.parse(readFileSync(LINES, 'utf8'));
    skyTop.set(L.skyTop);
    waterNear.set(L.waterNear);
    waterFar.set(L.waterFar);
    // the sky band's fill was built from this season's own line: rebuild
    skyBelow(skyOnly, base, skyTop, w, h);
  }
  const prepared = { w, h, ox, oy, quiet, base, skyOnly, matte: m, skyTop, waterNear, waterFar, treesRGB };
  cache.set(key, prepared);
  return prepared;
}

function median(arr, win) {
  const src = Float32Array.from(arr);
  const half = win >> 1;
  for (let i = 0; i < arr.length; i++) {
    const s = [];
    for (let k = -half; k <= half; k++) s.push(src[Math.min(arr.length - 1, Math.max(0, i + k))]);
    s.sort((a, b) => a - b);
    arr[i] = s[half];
  }
}

/**
 * Below the treeline the sky band carries only the sky's own colour just
 * above it — the mean of the twelve rows over the line, per column,
 * smoothed across columns and held to the foot — not the sky mirrored,
 * whose clouds read as a symmetric ledge once the far shore parts from
 * the sky as the eye rises.
 */
function skyBelow(out, base, skyTop, w, h) {
  const col = new Float32Array(w * 3);
  for (let x = 0; x < w; x++) {
    const top = Math.round(skyTop[x]) - 4;
    let n = 0;
    for (let y = Math.max(0, top - 12); y < top; y++) {
      const o = (y * w + x) * 4;
      col[x * 3] += base[o]; col[x * 3 + 1] += base[o + 1]; col[x * 3 + 2] += base[o + 2];
      n++;
    }
    if (n) for (let c = 0; c < 3; c++) col[x * 3 + c] /= n;
  }
  const sm = new Float32Array(w * 3);
  const R = 24;
  for (let c = 0; c < 3; c++) for (let x = 0; x < w; x++) {
    let acc = 0, n = 0;
    for (let k = -R; k <= R; k++) { const xx = x + k; if (xx >= 0 && xx < w) { acc += col[xx * 3 + c]; n++; } }
    sm[x * 3 + c] = acc / n;
  }
  // Just below the line, a strip of the real sky mirrored down — forty
  // rows of haze and dots, what the eye is shown when the far shore
  // parts from the sky as it rises — easing into the flat beyond it.
  const STRIP = 28;
  for (let x = 0; x < w; x++) {
    const top = Math.round(skyTop[x]) - 4;
    for (let y = Math.max(0, top); y < h; y++) {
      const o = (y * w + x) * 4;
      const d = y - top;
      const sy = Math.max(0, 2 * top - 1 - y);
      const so = (sy * w + x) * 4;
      const k = Math.min(1, Math.max(0, (d - STRIP * 0.6) / (STRIP * 0.4)));
      for (let c = 0; c < 3; c++) out[o + c] = Math.round(base[so + c] * (1 - k) + sm[x * 3 + c] * k);
    }
  }
}

/**
 * The densest square of a painted bough, as a tile to paint a canopy
 * with (18w). The elms' seasons used to be the season's own picture
 * inside the summer's silhouette, which came out as a slab of colour
 * with holes punched in it. The shape is the painting's — it must be,
 * or the elms would move as the year turned — but the paint is now the
 * new artwork's: the leaves, their colour and their touch, sampled from
 * the bough painted for that stage of the year and mirror-tiled, so an
 * October elm is October leaves in the shape of the painting's elm.
 */
async function foliageTile(file) {
  const img = await load(file);
  const { w, h, data } = img;
  const S = 384;
  let best = null;
  for (let y = 0; y + S <= h; y += 48) {
    for (let x = 0; x + S <= w; x += 48) {
      let n = 0;
      for (let j = 0; j < S; j += 8) for (let i = 0; i < S; i += 8) if (data[((y + j) * w + x + i) * 4 + 3] > 200) n++;
      if (!best || n > best.n) best = { x, y, n };
    }
  }
  const tile = Buffer.alloc(S * S * 4);
  // The tile's own alpha, kept before the holes are filled: it is how
  // dense the leaves are at this stage of the year, and the canopy takes
  // its thinning from it (18w) — a winter crown is the painting's crown
  // seen through bare branches, not a solid mass of them.
  const cover = new Float32Array(S * S);
  for (let j = 0; j < S; j++)
    for (let i = 0; i < S; i++) {
      const o = ((best.y + j) * w + best.x + i) * 4;
      const t = (j * S + i) * 4;
      tile[t] = data[o]; tile[t + 1] = data[o + 1]; tile[t + 2] = data[o + 2]; tile[t + 3] = data[o + 3];
      cover[j * S + i] = data[o + 3] / 255;
    }
  // the holes in the tile filled from their neighbours, so every sample
  // lands on paint
  for (let pass = 0; pass < 24; pass++) {
    let filled = 0;
    for (let j = 0; j < S; j++)
      for (let i = 0; i < S; i++) {
        const t = (j * S + i) * 4;
        if (tile[t + 3] > 128) continue;
        const acc = [0, 0, 0];
        let n = 0;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ii = i + di, jj = j + dj;
          if (ii < 0 || jj < 0 || ii >= S || jj >= S) continue;
          const u = (jj * S + ii) * 4;
          if (tile[u + 3] <= 128) continue;
          acc[0] += tile[u]; acc[1] += tile[u + 1]; acc[2] += tile[u + 2]; n++;
        }
        if (!n) continue;
        tile[t] = acc[0] / n; tile[t + 1] = acc[1] / n; tile[t + 2] = acc[2] / n; tile[t + 3] = 255;
        filled++;
      }
    if (!filled) break;
  }
  // Flatten the tile's own large-scale shading (18w): a tile that is
  // darker at one edge than the other shows every mirror line when it is
  // tiled. Divided by its own blur and put back at its mean, the leaves
  // keep their touch and lose the gradient.
  {
    const lum = new Float32Array(S * S);
    for (let i = 0; i < S * S; i++) lum[i] = 0.299 * tile[i * 4] + 0.587 * tile[i * 4 + 1] + 0.114 * tile[i * 4 + 2];
    const low = blur(lum, S, S, 40);
    let mean = 0;
    for (let i = 0; i < S * S; i++) mean += low[i];
    mean /= S * S;
    for (let i = 0; i < S * S; i++) {
      const g = Math.min(1.6, Math.max(0.6, mean / Math.max(1, low[i])));
      for (let c = 0; c < 3; c++) tile[i * 4 + c] = Math.max(0, Math.min(255, Math.round(tile[i * 4 + c] * g)));
    }
  }
  console.log(`  foliage tile from ${file.split('/').pop()} at ${best.x},${best.y}`);
  return { tile, cover, S };
}

/** A whole-frame RGBA image: the base under a per-pixel alpha. */
function frame(src, w, h, alphaAt) {
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const o = i * 4;
      const a = Math.max(0, Math.min(1, alphaAt(x, y, i)));
      out[o] = src[o];
      out[o + 1] = src[o + 1];
      out[o + 2] = src[o + 2];
      out[o + 3] = Math.round(a * 255);
    }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } });
}

/** Soft step across a boundary row, `above` = 1 above it. */
const edge = (y, row, above) => (above ? smooth01(row + FEATHER, row - FEATHER, y) : smooth01(row - FEATHER, row + FEATHER, y));
/** Hard, with the boundary pushed `over` pixels past itself: a band
 *  that another draws over runs on under it, so no seam of two half-
 *  alphas ever shows. */
const OVER = 10;
const under = (y, row, above) => (above ? (y < row + OVER ? 1 : 0) : y > row - OVER ? 1 : 0);

// The order they draw in, back to front: sky, water, ground, far shore
// (the composition orders lying plates by their far edge, standing ones
// by their z). Each band is opaque past the edge the one in front of it
// feathers over.
/**
 * The sky above the painting (18ac): held, not invented. The outpainted
 * continuation is another picture's sky up there, and it arrives as
 * vertical panels of slightly different blue with hard edges between
 * them — invisible from the seat, and the first thing the eye finds the
 * moment the camera draws back. Each column is filled instead from the
 * painting's own topmost sky, eased into what is there over the last of
 * it, with the continuation's own grain kept so the fill is not a wash.
 */
function holdSkyAbove(data, w, h, oy, top = 64, over = 90) {
  if (oy <= 0) return;
  for (let x = 0; x < w; x++) {
    const mean = [0, 0, 0];
    for (let y = oy; y < oy + top; y++) {
      const o = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) mean[c] += data[o + c] / top;
    }
    // A sky is a little deeper overhead than at the treeline.
    for (let y = 0; y < oy; y++) {
      const o = (y * w + x) * 4;
      const up = (oy - y) / oy;
      // the grain that is there, kept: this pixel less its column's own
      // local mean over a few rows
      let local = [0, 0, 0];
      let n = 0;
      for (let k = -3; k <= 3; k++) {
        const yy = Math.min(h - 1, Math.max(0, y + k));
        const oo = (yy * w + x) * 4;
        for (let c = 0; c < 3; c++) local[c] += data[oo + c];
        n++;
      }
      local = local.map((v) => v / n);
      const k = Math.min(1, (oy - y) / over);
      const t = k * k * (3 - 2 * k);
      for (let c = 0; c < 3; c++) {
        const deep = mean[c] * (1 - up * 0.06) - (c === 2 ? 0 : up * 4);
        const held = deep + (data[o + c] - local[c]);
        data[o + c] = Math.max(0, Math.min(255, Math.round(data[o + c] * (1 - t) + held * t)));
      }
    }
  }
}

export async function refSky(files, opts) {
  const p = await prepare(files, opts);
  if (p.oy > 0) holdSkyAbove(p.skyOnly, p.w, p.h, p.oy);
  // Opaque all the way down to the water's far edge: the far shore
  // stands in front of it, and when the eye rises and they part, what
  // shows between them is sky, not the void — sky, because below the
  // treeline the band carries the sky mirrored down, not the shore.
  return frame(p.skyOnly, p.w, p.h, (x, y) => under(y, p.waterFar[x], true));
}

export async function refFarShore(files, opts) {
  const p = await prepare(files, opts);
  // The far shore runs a long way past the waterline (18u), where its
  // own picture is water anyway: it stands at z −52 while the lake lies
  // flat, so the two part as the eye rises, and a hard edge three rows
  // below the waterline let the sky band behind them show through as a
  // bright line across the frame at the widest of the pull-back.
  return frame(p.base, p.w, p.h, (x, y) => edge(y, p.skyTop[x], false) * under(y, p.waterFar[x] + 90, true));
}

export async function refWater(files, opts) {
  const p = await prepare(files, opts);
  return frame(p.base, p.w, p.h, (x, y) => under(y, p.waterFar[x], false) * under(y, p.waterNear[x], true));
}

export async function refGround(files, opts) {
  const p = await prepare(files, opts);
  return frame(p.base, p.w, p.h, (x, y) => edge(y, p.waterNear[x], false));
}

export async function refTrees(files, opts) {
  const p = await prepare(files, opts);
  // Bark only (18v): the elms' trunks, which are the same trunks in
  // every month, cut from the summer's own picture. The canopy through
  // the rest of the year is painted — the seasons derived from the
  // October, January and April pictures came out as flat slabs of colour
  // with holes punched in them, which is what they were: one silhouette,
  // one haze of the season's colour, and noise for leaves.
  if (opts.trunksOnly) {
    const [ox, oy] = ORIGIN;
    const { w, h } = p;
    const trunk = (x, y) => TRUNK_REGIONS.some(([bx, by, bw, bh]) => x - ox >= bx && x - ox < bx + bw && y - oy >= by && y - oy < by + bh);
    // Bark and nothing else. The elms are cut with a ring of their own
    // ground around them — which is August's grass, and on the January
    // snow it read as a collar of green and gold around every trunk
    // (18w). So the matte is drawn in six pixels and then kept only
    // where the picture is bark: redder than it is green or blue, and
    // darker than the sunlit grass.
    const q = p.quiet.data;
    let keep = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      if (!p.matte[i]) continue;
      const o = i * 4;
      const r = q[o], g = q[o + 1], b = q[o + 2];
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      // Bark runs from dark brown through rust to a violet grey; what is
      // not bark around these trunks is grass and leaves, which are
      // greener or yellower than anything on the tree. So the test is
      // put the other way round — everything in the silhouette is bark
      // unless it is green or yellow — which keeps the trunk's sunlit
      // side and its whole width (18w).
      const greenish = g > r + 3;
      const yellowish = r > b + 34 && g > b + 24 && lum > 0.55;
      const bluish = b > r + 8;
      if (!greenish && !yellowish && !bluish && lum < 0.86) keep[i] = 1;
    }
    // Close the small gaps, drop the specks, and round it: square
    // kernels leave a stair-stepped trunk.
    keep = morph(morph(keep, w, h, 3, 1), w, h, 3, -1);
    keep = morph(morph(keep, w, h, 2, -1), w, h, 2, 1);
    keep = blur(keep, w, h, 2);
    for (let i = 0; i < w * h; i++) keep[i] = keep[i] > 0.45 ? 1 : 0;
    return frame(q, w, h, (x, y, i) => (keep[i] && trunk(x, y) ? 1 : 0));
  }
  // A season's elms (18w): the painting's own silhouette — the summer's,
  // so the tree never moves as the year turns — filled with the leaves
  // painted for that stage of the year, read at a little under half
  // scale and mirrored at every edge, which foliage takes without
  // showing it. What was there before was the season's own picture
  // inside that silhouette, which came out as a slab of colour with
  // holes punched in it.
  if (opts.leafArt && existsSync(opts.leafArt)) {
    const { w, h } = p;
    const { tile, cover, S } = await foliageTile(opts.leafArt);
    const rgb = Buffer.alloc(w * h * 4);
    const dens = new Float32Array(w * h);
    const k = 0.42;
    const tri = (v, n) => { const m = ((v % (2 * n)) + 2 * n) % (2 * n); return m < n ? m : 2 * n - 1 - m; };
    const [ox, oy] = ORIGIN;
    const bark = (x, y) => TRUNK_REGIONS.some(([bx, by, bw, bh]) => x - ox >= bx && x - ox < bx + bw && y - oy >= by && y - oy < by + bh);
    // The trunks keep the summer's bark, which is the bark of the tree in
    // every month: January's own picture painted them over in snow, and
    // they came out as flat pale bars.
    const sq = existsSync(QUIET) ? await load(QUIET) : p.quiet;
    const q = sq.data;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const o = (y * w + x) * 4;
        if (bark(x, y)) { rgb[o] = q[o]; rgb[o + 1] = q[o + 1]; rgb[o + 2] = q[o + 2]; rgb[o + 3] = 255; continue; }
        const si = tri(Math.round(y * k), S) * S + tri(Math.round(x * k), S);
        const t = si * 4;
        rgb[o] = tile[t]; rgb[o + 1] = tile[t + 1]; rgb[o + 2] = tile[t + 2]; rgb[o + 3] = 255;
        dens[y * w + x] = cover[si];
      }
    // How leafy the painting's own canopy is, pixel by pixel (18w): how
    // far August's picture stands from the sky filled in behind it. A
    // binary matte filled with dense leaves turned every thin, hazy
    // corner of the canopy into solid foliage, and the matte's own
    // boundary — boxes, in places — showed as a band across the frame.
    // Taken this way the new leaves are as thin where the painting's
    // were thin, and the canopy keeps its air.
    const sm = existsSync(MATTE) ? await load(MATTE) : null;
    const sb = existsSync(BASE) ? await load(BASE) : null;
    if (!sm || !sb) return frame(rgb, w, h, (x, y, i) => p.matte[i]);
    // Leaf, not matte. The matte is a solid region — the summer plate
    // only looks like a tree because the painting's own sky shows between
    // its leaves, in the colour. Fill that region with painted foliage
    // and it becomes a slab. So the alpha is read from August's own
    // picture: a pixel is leaf so far as it is greener, golder or darker
    // than the sky it stands against, and sky where it is pale and blue.
    const leaf = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      if (sm.data[i * 4] <= 127) continue;
      const o = i * 4;
      const r = q[o], g = q[o + 1], b = q[o + 2];
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const green = g - b;
      const dark = Math.max(0, 0.8 - lum) * 255;
      leaf[i] = smooth01(6, 34, green + dark * 0.9);
    }
    // a touch of closing, so single sky dots inside a leaf mass do not
    // riddle it with holes
    let lf = blur(leaf, w, h, 1);
    for (let i = 0; i < w * h; i++) lf[i] = Math.min(1, lf[i] * 1.25);
    // Carried on above the painting's own top edge (18w). The elms are
    // cut off there — the continuation painted sky above them, so the
    // matte simply stops — and at the widest of the pull-back that showed
    // as a straight line across the top of the canopy. Now that the
    // leaves are painted rather than derived, the crown can go on: each
    // column keeps the leafiness it had at the frame's top row, eased out
    // over two hundred pixels and thinned by the same density as the
    // rest, so the tree ends in leaves rather than at an edge.
    {
      const top = oy + 12;
      for (let y = 0; y < top; y++) {
        const k = smooth01(oy - 200, oy - 4, y);
        for (let x = 0; x < w; x++) lf[y * w + x] = Math.max(lf[y * w + x], lf[top * w + x] * k);
      }
      // and out past its sides, the same way: the painting ends there,
      // and so did the crown
      const L = ox + 12, R = ox + 1536 - 13;
      for (let y = 0; y < h; y++) {
        const l = lf[y * w + L], r = lf[y * w + R];
        if (l > 0) for (let x = 0; x < ox; x++) lf[y * w + x] = Math.max(lf[y * w + x], l * smooth01(ox - 220, ox - 4, x));
        if (r > 0) for (let x = ox + 1536; x < w; x++) lf[y * w + x] = Math.max(lf[y * w + x], r * smooth01(ox + 1536 + 220, ox + 1536 + 4, x));
      }
    }
    // and thinned by how much leaf this stage of the year actually has
    const thinned = blur(dens, w, h, 1);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        // the trunks are not leaves and are not thinned with them
        if (bark(x, y)) continue;
        lf[i] *= Math.min(1, 0.12 + thinned[i] * 1.2);
      }
    return frame(rgb, w, h, (x, y, i) => lf[i]);
  }
  return frame(p.treesRGB ?? p.quiet.data, p.w, p.h, (x, y, i) => p.matte[i]);
}

/** For the eye: the boundaries and the matte drawn over the quiet park. */
export async function refCheck(files, opts) {
  const p = await prepare(files, opts);
  const out = Buffer.from(p.quiet.data);
  for (let x = 0; x < p.w; x++) {
    for (const [row, col] of [
      [p.skyTop[x], [255, 0, 170]],
      [p.waterFar[x], [255, 255, 0]],
      [p.waterNear[x], [0, 255, 255]],
    ]) {
      const y = Math.round(row);
      if (y >= 0 && y < p.h) { const o = (y * p.w + x) * 4; out[o] = col[0]; out[o + 1] = col[1]; out[o + 2] = col[2]; }
    }
  }
  for (let i = 0; i < p.w * p.h; i++) if (p.matte[i] > 0.5) { const o = i * 4; out[o] = Math.round(out[o] * 0.4 + 150); out[o + 1] = Math.round(out[o + 1] * 0.4); out[o + 2] = Math.round(out[o + 2] * 0.4); }
  return sharp(out, { raw: { width: p.w, height: p.h, channels: 4 } });
}

/**
 * The colour-keyed tree matte alone, in the painting's frame: the elms
 * as the key finds them, cleaned but not grown. For scripts/tree-mask.mjs.
 */
export async function keyedMatte(quietFile) {
  const quiet = await load(quietFile);
  const { w, h } = quiet;
  const q = quiet.data;
  const lumAt = (o) => (0.299 * q[o] + 0.587 * q[o + 1] + 0.114 * q[o + 2]) / 255;
  const skyLike = (o) => {
    const r = q[o], g = q[o + 1], b = q[o + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return lumAt(o) > 0.6 && b >= g - 10 && (mx - mn) / Math.max(1, mx) < 0.5;
  };
  const greenLike = (o) => q[o + 1] > q[o] + 6 && q[o + 1] > q[o + 2] + 6;
  const blueLike = (o) => q[o + 2] > q[o] + 28 && q[o + 2] > q[o + 1] + 2;
  const inBox = (x, y, [bx, by, bw, bh]) => x >= bx && x < bx + bw && y >= by && y < by + bh;
  let m = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const o = i * 4;
      const bark = q[o] > q[o + 1] && q[o] > q[o + 2] + 5 && lumAt(o) < 0.76;
      if (CANOPY_REGIONS.some((r) => inBox(x, y, r)) && !skyLike(o)) m[i] = 1;
      if (TRUNK_REGIONS.some((r) => inBox(x, y, r)) && bark && !skyLike(o) && !greenLike(o) && !blueLike(o)) m[i] = 1;
    }
  // Canopy pixels count only above the treeline plus a little (the same
  // rule as prepare()): a quick treeline from the sky key.
  const notSky = new Float32Array(w * h);
  for (let y = 100; y < 320; y++) for (let x = 0; x < w; x++) notSky[y * w + x] = skyLike((y * w + x) * 4) ? 0 : 1;
  const f = blur(notSky, w, h, 4);
  const top = new Float32Array(w).fill(-1);
  for (let x = 0; x < w; x++) for (let y = 120; y < 300; y++) {
    if (f[y * w + x] <= 0.5) continue;
    let holds = true;
    for (let yy = y; yy < Math.min(300, y + 60); yy += 6) if (f[yy * w + x] <= 0.5) { holds = false; break; }
    if (holds) { top[x] = y; break; }
  }
  let last = 190;
  for (let x = 0; x < w; x++) { if (top[x] < 0) top[x] = last; else last = top[x]; }
  median(top, 41);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (m[i] && !TRUNK_REGIONS.some((r) => inBox(x, y, r)) && y > top[x] + 4) m[i] = 0;
  }
  m = morph(morph(m, w, h, 2, -1), w, h, 2, 1);
  m = morph(morph(m, w, h, 3, 1), w, h, 3, -1);
  return { matte: m, w, h };
}
