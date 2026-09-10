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
  [0, -60, 1536, 60], // leaf tips the continuation left just above the frame
  [0, 0, 930, 300],
  [930, 0, 190, 185],
  [1120, 0, 416, 330],
];
const TRUNK_REGIONS = [
  [20, 150, 125, 460], // the left trunk
  [0, 560, 215, 185], // its flare and roots
  [1380, 150, 62, 265], // the right trunks, their own columns only; this one
  // ends above the shoulder of the man in the second chair (18g)
  [1486, 150, 50, 245], // stops above the small sitter the model drew high
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
  const data = Buffer.from(big);
  for (let y = 0; y < painting.h; y++) {
    for (let x = 0; x < painting.w; x++) {
      const d = Math.min(x, y, painting.w - 1 - x, painting.h - 1 - y);
      const k = Math.min(1, d / SEAM);
      const o = ((y + oy) * W + x + ox) * 4;
      const i = (y * painting.w + x) * 4;
      for (let c = 0; c < 3; c++) data[o + c] = Math.round(painting.data[i + c] * k + big[o + c] * (1 - k));
      data[o + 3] = 255;
    }
  }
  return { data, w: W, h: H };
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
function seasonLookup(summer, season, regionOfPainting = () => 0, regions = 1) {
  const N = 24;
  const R = 3;
  const lpS = lowpass(summer.data, summer.w, summer.h, R);
  const lpT = lowpass(season.data, season.w, season.h, R);
  const cell = (r, g, b) => ((r * N) >> 8) * N * N + ((g * N) >> 8) * N + ((b * N) >> 8);
  const tables = [];
  for (let reg = 0; reg < regions; reg++) tables.push({ sum: new Float64Array(N * N * N * 3), cnt: new Uint32Array(N * N * N), lut: new Float32Array(N * N * N * 3), filled: new Uint8Array(N * N * N) });
  for (let y = 0; y < summer.h; y++) for (let x = 0; x < summer.w; x++) {
    const i = y * summer.w + x;
    const o = i * 4;
    const t = tables[regionOfPainting(x, y)];
    const c = cell(lpS[o], lpS[o + 1], lpS[o + 2]);
    t.cnt[c]++;
    for (let k = 0; k < 3; k++) t.sum[c * 3 + k] += lpT[o + k];
  }
  for (const t of tables) fillTable(t, N);
  /** Apply to an RGBA buffer of the given size; regionAt gives a pixel's region. */
  return (data, w, h, regionAt = () => 0) => {
    const lp = lowpass(data, w, h, R);
    const out = Buffer.from(data);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const t = tables[regionAt(x, y)];
      const c = cell(lp[o], lp[o + 1], lp[o + 2]);
      if (!t.filled[c]) continue;
      // the dots ride on at six tenths: snow does not carry grass's contrast
      for (let k = 0; k < 3; k++) out[o + k] = Math.max(0, Math.min(255, Math.round(t.lut[c * 3 + k] + 0.6 * (data[o + k] - lp[o + k]))));
    }
    return out;
  };
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
}

/** The summer continuation recoloured to a season. */
async function seasoned(outpaint, summer, season, lookup) {
  const map = lookup ?? seasonLookup(summer, season);
  return { data: map(outpaint.data, outpaint.w, outpaint.h, regionAtWide), w: outpaint.w, h: outpaint.h, map };
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
/** The summer's lines, for widen()'s per-region fit; set by prepare(). */
let regionLines = null;
const BASE = 'assets/raw/scene-04/ref/summer-base.png';

async function prepare(files, opts = {}) {
  const key = files.join('|');
  if (cache.has(key)) return cache.get(key);
  const [painting, emptyPainting, outpaintIn] = await Promise.all(files.map(load));
  // A season's continuation (18j): the summer's, with the season's
  // colours mapped onto it — a lookup learned from the painting pair,
  // summer beside season, pixel for pixel. Turning the wide frame to a
  // season as a picture had the model recompose it: elms moved, new
  // trees on the lawn. A mapping moves nothing.
  regionLines = opts.lines === 'summer' && existsSync(LINES) ? JSON.parse(readFileSync(LINES, 'utf8')) : null;
  const summerPainting = opts.seasonOf ? await load(opts.seasonOf) : null;
  const lookup = summerPainting ? seasonLookup(summerPainting, painting, (x, y) => regionAtWide(x + ORIGIN[0], y + ORIGIN[1]), regionLines ? 4 : 1) : null;
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
      for (let y = 120 + oy; y < 300 + oy; y++) {
        if (f[y * w + x] <= 0.5) continue;
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
    for (let i = 0; i < w * h; i++) m2[i] = m2[i] > 0.4 ? 1 : 0;
    m2 = morph(morph(m2, w, h, 2, -1), w, h, 2, 1);
    m2 = morph(morph(m2, w, h, 4, 1), w, h, 4, -1);
    m2 = morph(m2, w, h, 3, 1);
    // Rounded: square kernels leave square corners, and a square corner
    // of fill in a treeline reads as a block.
    m2 = blur(m2, w, h, 3);
    for (let i = 0; i < w * h; i++) m2[i] = m2[i] > 0.5 ? 1 : 0;
    m = m2;
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
  const base = Buffer.alloc(w * h * 4);
  const trunkAt = (x, y) => TRUNK_REGIONS.some((r) => inBox(x - ox, y - oy, r));
  const src = (x, y) => (y * w + x) * 4;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const o = i * 4;
      const k = mBase[i];
      let fo = -1;
      if (k > 0 && empty.masked) {
        fo = o; // the empty view, faithful behind the trees
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
        const fill = fo >= 0 && fo !== o ? quiet.data[fo + c] : Math.min(255, empty.data[o + c] * (empty.gain?.[c] ?? 1));
        // (fo === o means the empty view at this very pixel)
        base[o + c] = Math.round(quiet.data[o + c] * (1 - k) + fill * k);
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
    const mBase2 = morph(m, w, h, 2, -1);
    const filled = lookup(sb.data, w, h, regionAtWide);
    for (let i = 0; i < w * h; i++) {
      const o = i * 4;
      const k = mBase2[i];
      for (let c = 0; c < 3; c++) base[o + c] = Math.round(quiet.data[o + c] * (1 - k) + filled[o + c] * k);
    }
  } else if (!lookup) {
    // the summer keeps its matte and base for the seasons
    const mp = Buffer.alloc(w * h * 4);
    for (let i = 0; i < w * h; i++) { const v = m[i] > 0.5 ? 255 : 0; mp[i * 4] = mp[i * 4 + 1] = mp[i * 4 + 2] = v; mp[i * 4 + 3] = 255; }
    await sharp(mp, { raw: { width: w, height: h, channels: 4 } }).png().toFile(MATTE);
    await sharp(base, { raw: { width: w, height: h, channels: 4 } }).png().toFile(BASE);
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
      for (let y = 120 + oy; y < 300 + oy; y++) {
        if (f[y * w + x] <= 0.5) continue;
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
  }
  const skyOnly = Buffer.from(base);
  skyBelow(skyOnly, base, skyTop, w, h);
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
  const prepared = { w, h, quiet, base, skyOnly, matte: m, skyTop, waterNear, waterFar };
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
  for (let x = 0; x < w; x++) {
    const top = Math.round(skyTop[x]) - 4;
    for (let y = Math.max(0, top); y < h; y++) {
      const o = (y * w + x) * 4;
      // a few rows of ease from the real sky into the flat
      const k = Math.min(1, (y - top) / 6);
      for (let c = 0; c < 3; c++) out[o + c] = Math.round(base[o + c] * (1 - k) + sm[x * 3 + c] * k);
    }
  }
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
export async function refSky(files, opts) {
  const p = await prepare(files, opts);
  // Opaque all the way down to the water's far edge: the far shore
  // stands in front of it, and when the eye rises and they part, what
  // shows between them is sky, not the void — sky, because below the
  // treeline the band carries the sky mirrored down, not the shore.
  return frame(p.skyOnly, p.w, p.h, (x, y) => under(y, p.waterFar[x], true));
}

export async function refFarShore(files, opts) {
  const p = await prepare(files, opts);
  return frame(p.base, p.w, p.h, (x, y) => edge(y, p.skyTop[x], false) * edge(y, p.waterFar[x] + 3, true));
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
  return frame(p.quiet.data, p.w, p.h, (x, y, i) => p.matte[i]);
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
