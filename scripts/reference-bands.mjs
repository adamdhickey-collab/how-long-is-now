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
 * Every band is a whole-frame RGBA image the size of the painting, so
 * the composition maps it by its own pixels. Boundaries between bands
 * are found in the pixels: the far shore's top against the sky by
 * lightness, the water's near edge by blueness, column by column.
 */
import sharp from 'sharp';

const FEATHER = 5;

/**
 * Where the framing trees are, in the painting's pixels. The canopy is
 * keyed against the sky (leaves are dark and coloured, sky is pale)
 * above the far shore's top; the trunks are keyed inside their own
 * columns against the greens and blues they cross. Leaves that hang in
 * front of the far treeline are both green and stay baked into it —
 * owed a better matte before the year's rise is looked at.
 */
const CANOPY_REGIONS = [
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
async function prepare(files) {
  const key = files.join('|');
  if (cache.has(key)) return cache.get(key);
  const [quiet, empty] = await Promise.all(files.map(load));
  const { w, h } = quiet;
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
      if (CANOPY_REGIONS.some((r) => inBox(x, y, r)) && !skyLike(o)) tree = 1;
      // A trunk is bark: brown, darker than the sunlit path and the dry
      // grass, redder than either. Anything paler or greener inside its
      // column — the path, the wall, a blue shadow dot on the grass — is
      // not the tree, and drawn in front of the sitters it hid them.
      const bark = q[o] > q[o + 1] && q[o] > q[o + 2] + 8 && lumAt(o) < 0.62;
      if (TRUNK_REGIONS.some((r) => inBox(x, y, r)) && bark && !skyLike(o) && !greenLike(o) && !blueLike(o)) tree = 1;
      m[i] = tree;
    }
  // The treeline top: from the sky's own key, ignoring columns the
  // canopy fills at that row (they take the neighbours' answer).
  const skyTop = new Float32Array(w);
  {
    const notSky = new Float32Array(w * h);
    for (let y = 100; y < 320; y++) for (let x = 0; x < w; x++) notSky[y * w + x] = skyLike((y * w + x) * 4) ? 0 : 1;
    const f = blur(notSky, w, h, 4);
    const raw = new Float32Array(w).fill(-1);
    for (let x = 0; x < w; x++) {
      // Walk down: the treeline is a not-sky run that holds to the water.
      for (let y = 120; y < 300; y++) {
        if (f[y * w + x] <= 0.5) continue;
        let holds = true;
        for (let yy = y; yy < Math.min(300, y + 60); yy += 6) if (f[yy * w + x] <= 0.5) { holds = false; break; }
        if (holds) { raw[x] = y; break; }
      }
    }
    // Columns with no answer (leaves all the way down) take the nearest.
    let last = 190;
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
      const trunk = TRUNK_REGIONS.some((r) => inBox(x, y, r));
      if (!trunk && y > skyTop[x] + 4) m[i] = 0;
    }
  m = morph(morph(m, w, h, 2, -1), w, h, 2, 1); // open: drop specks
  m = morph(m, w, h, 4, 1); // grow: the trees carry a ring of their ground
  m = morph(morph(m, w, h, 3, 1), w, h, 3, -1); // close
  // Hard, not feathered: the base under the trees is filled from the
  // empty view by this same mask, and a soft edge shared by both let a
  // quarter of the empty view through along every trunk as a hairline.
  // The ring of the trees' own ground hides the hard edge from the seat.
  // ---- the base: the quiet park, the trees filled from behind — two
  // pixels inside the matte, not to its edge: the renderer filters the
  // trees' alpha across a texel, and quiet over quiet there is nothing,
  // where quiet over the empty view was a hairline down every trunk.
  const mBase = morph(m, w, h, 2, -1);
  const base = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    const k = mBase[i];
    for (let c = 0; c < 3; c++) base[o + c] = Math.round(quiet.data[o + c] * (1 - k) + empty.data[o + c] * k);
    base[o + 3] = 255;
  }
  // ---- the water's far and near edges: per column, the rows where
  // blue stops dominating, scanning up from the lawn and down from the
  // shore.
  const waterNear = new Float32Array(w);
  const waterFar = new Float32Array(w);
  {
    const blue = new Float32Array(w * h);
    for (let y = 250; y < 700; y++)
      for (let x = 0; x < w; x++) {
        const o = (y * w + x) * 4;
        blue[y * w + x] = base[o + 2] > base[o] + 30 && base[o + 2] > base[o + 1] + 4 ? 1 : 0;
      }
    const f = blur(blue, w, h, 6);
    for (let x = 0; x < w; x++) {
      let near = 300;
      for (let y = 660; y > 300; y--) if (f[y * w + x] > 0.5) { near = y; break; }
      waterNear[x] = near;
      let far = near;
      for (let y = 260; y < near; y++) if (f[y * w + x] > 0.5) { far = y; break; }
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
  const prepared = { w, h, quiet, base, matte: m, skyTop, waterNear, waterFar };
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
export async function refSky(files) {
  const p = await prepare(files);
  // Opaque all the way down to the water's far edge: the far shore
  // stands in front of it, and when the eye rises and they part, what
  // shows between them is sky, not the void.
  return frame(p.base, p.w, p.h, (x, y) => under(y, p.waterFar[x], true));
}

export async function refFarShore(files) {
  const p = await prepare(files);
  return frame(p.base, p.w, p.h, (x, y) => edge(y, p.skyTop[x], false) * edge(y, p.waterFar[x] + 3, true));
}

export async function refWater(files) {
  const p = await prepare(files);
  return frame(p.base, p.w, p.h, (x, y) => under(y, p.waterFar[x], false) * under(y, p.waterNear[x], true));
}

export async function refGround(files) {
  const p = await prepare(files);
  return frame(p.base, p.w, p.h, (x, y) => edge(y, p.waterNear[x], false));
}

export async function refTrees(files) {
  const p = await prepare(files);
  return frame(p.quiet.data, p.w, p.h, (x, y, i) => p.matte[i]);
}

/** For the eye: the boundaries and the matte drawn over the quiet park. */
export async function refCheck(files) {
  const p = await prepare(files);
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
