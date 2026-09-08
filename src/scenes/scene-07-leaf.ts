/**
 * Scene 07's leaf: one elm leaf read as the network it is.
 *
 * Venation is a transport network in fact, so the drawing follows one:
 * the margin first, then the midrib, then the secondaries out from it
 * in order from the base, the cross-veins between them and the forks at
 * the margin, every vein drawn from its start to its end and every
 * junction lit as it is reached. It lives in the figure's overlay, in
 * the scope the manifest declares, and is grown by the scene that reads
 * it — how much of the network is drawn is the scene's to say.
 */

import type { Scope } from './manifest';

const NS = 'http://www.w3.org/2000/svg';
type Pt = [number, number];

/** The leaf leans toward the tip, as one does held up to the light. */
const LEAN = -28;
/** The secondaries leave the midrib at this angle, toward the tip. */
const SECONDARY_ANGLE = (42 * Math.PI) / 180;
const SECONDARIES = 9;
const NODE_PX = 1.7;

interface Vein {
  el: SVGPathElement;
  t0: number;
  t1: number;
  /** The vein's length in the leaf's own space. */
  len: number;
  shown: number;
}
interface Node {
  el: SVGCircleElement;
  t: number;
  lit: boolean;
}
interface Secondary {
  o: Pt;
  c: Pt;
  e: Pt;
  t0: number;
  t1: number;
}

export interface LeafFigure {
  /** on: how far the instrument is on, 0–1; grown: how much of the
   *  network is drawn, 0–1. The scope is where it sits in the frame. */
  update(on: number, grown: number, scope: Scope | undefined): void;
  hide(): void;
}

const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1);

function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, n: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return out;
}

function quad(o: Pt, c: Pt, e: Pt, t: number): Pt {
  const u = 1 - t;
  return [u * u * o[0] + 2 * u * t * c[0] + t * t * e[0], u * u * o[1] + 2 * u * t * c[1] + t * t * e[1]];
}

function inside(poly: Pt[], p: Pt): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

const fmt = (p: Pt) => `${p[0].toFixed(4)} ${p[1].toFixed(4)}`;

export function createLeaf(svg: SVGSVGElement): LeafFigure {
  const g = document.createElementNS(NS, 'g');
  g.setAttribute('class', 'leaf');
  g.style.opacity = '0';
  // The drawing is made in the leaf's own space — a unit long, base at
  // the origin, the tip at x = 1 — and placed by one transform.
  const art = document.createElementNS(NS, 'g');
  g.appendChild(art);
  svg.appendChild(g);

  const veins: Vein[] = [];
  const nodes: Node[] = [];
  const vein = (d: string, t0: number, t1: number, cls?: string) => {
    const el = document.createElementNS(NS, 'path');
    el.setAttribute('d', d);
    if (cls) el.setAttribute('class', cls);
    art.appendChild(el);
    // Hairlines keep their width on screen whatever the leaf's scale, and
    // so are dashed in screen pixels: the dash that draws each vein in is
    // sized from its length at the scale it is placed at.
    veins.push({ el, t0, t1, len: el.getTotalLength(), shown: -1 });
  };
  const node = (p: Pt, t: number) => {
    const el = document.createElementNS(NS, 'circle');
    el.setAttribute('class', 'leaf__node');
    el.setAttribute('cx', p[0].toFixed(4));
    el.setAttribute('cy', p[1].toFixed(4));
    el.style.opacity = '0';
    art.appendChild(el);
    nodes.push({ el, t, lit: false });
  };

  // The margin: an elm's, oblique at the base — one side sets off further
  // along the petiole than the other.
  const upper = cubic([0.03, -0.02], [0.1, -0.36], [0.62, -0.3], [1, 0], 48);
  const lower = cubic([1, 0], [0.6, 0.28], [0.16, 0.3], [0.1, 0.03], 48);
  const outline: Pt[] = [...upper, ...lower, [0.04, 0]];
  vein(`M ${outline.map(fmt).join(' L ')} Z`, 0, 0.16);
  vein('M -0.1 0.02 L 0.04 0', 0.1, 0.16);
  const midrib: [Pt, Pt, Pt] = [
    [0.04, 0],
    [0.5, 0.012],
    [0.985, 0],
  ];
  vein(`M ${fmt(midrib[0])} Q ${fmt(midrib[1])} ${fmt(midrib[2])}`, 0.16, 0.4);
  const midribAt = (x: number): Pt => quad(midrib[0], midrib[1], midrib[2], (x - 0.04) / 0.945);

  // A ray from a point, marched until it leaves the leaf: where a vein
  // headed that way meets the margin.
  const toMargin = (from: Pt, dir: Pt): Pt => {
    let s = 0;
    let last: Pt = from;
    for (let k = 0; k < 200; k++) {
      s += 0.004;
      const p: Pt = [from[0] + dir[0] * s, from[1] + dir[1] * s];
      if (!inside(outline, p)) break;
      last = p;
    }
    return last;
  };

  // The secondaries, alternate: each side's set is offset half a spacing
  // from the other's. Each leaves the midrib toward the tip, bows a
  // little outward, and reaches nearly to the margin.
  const sides: Secondary[][] = [[], []];
  for (const side of [-1, 1]) {
    const list = sides[side < 0 ? 0 : 1];
    for (let i = 0; i < SECONDARIES; i++) {
      const x = 0.1 + ((i + (side > 0 ? 0.5 : 0)) * 0.8) / SECONDARIES;
      if (x > 0.93) continue;
      const o = midribAt(x);
      const dir: Pt = [Math.cos(SECONDARY_ANGLE), side * Math.sin(SECONDARY_ANGLE)];
      const m = toMargin(o, dir);
      const e: Pt = [o[0] + (m[0] - o[0]) * 0.96, o[1] + (m[1] - o[1]) * 0.96];
      const c: Pt = [o[0] + (e[0] - o[0]) * 0.5, o[1] + (e[1] - o[1]) * 0.5 * 1.14];
      const t0 = 0.3 + x * 0.5;
      const t1 = t0 + 0.1;
      vein(`M ${fmt(o)} Q ${fmt(c)} ${fmt(e)}`, t0, t1);
      node(o, t0);
      node(e, t1);
      list.push({ o, c, e, t0, t1 });
    }
  }

  // The cross-veins, ladder-like between neighbours, and the forks each
  // second secondary throws toward the margin near its end.
  for (const list of sides) {
    for (let i = 0; i + 1 < list.length; i++) {
      const a = list[i];
      const b = list[i + 1];
      for (const f of [0.38, 0.72]) {
        const fb = Math.max(0.15, f - 0.12);
        const pa = quad(a.o, a.c, a.e, f);
        const pb = quad(b.o, b.c, b.e, fb);
        const t0 = Math.max(a.t0 + f * 0.1, b.t0 + fb * 0.1) + 0.02;
        vein(`M ${fmt(pa)} L ${fmt(pb)}`, t0, t0 + 0.05, 'hair');
        node(pa, t0);
        node(pb, t0 + 0.05);
      }
    }
    list.forEach((s, i) => {
      if (i % 2) return;
      const side = s.e[1] < s.o[1] ? -1 : 1;
      const from = quad(s.o, s.c, s.e, 0.78);
      const ang = SECONDARY_ANGLE + (22 * Math.PI) / 180;
      const m = toMargin(from, [Math.cos(ang), side * Math.sin(ang)]);
      const e: Pt = [from[0] + (m[0] - from[0]) * 0.94, from[1] + (m[1] - from[1]) * 0.94];
      vein(`M ${fmt(from)} L ${fmt(e)}`, s.t1 - 0.03, s.t1 + 0.03, 'hair');
      node(e, s.t1 + 0.03);
    });
  }

  // Everything is drawn a little before the window closes: births in 0–1.
  const tMax = Math.max(...veins.map((v) => v.t1), ...nodes.map((n) => n.t));
  const k = 0.97 / tMax;
  for (const v of veins) {
    v.t0 *= k;
    v.t1 *= k;
  }
  for (const n of nodes) n.t *= k;

  // The reading, under the scope: what this is, and how much of it is lit.
  const text = (cls: string) => {
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('class', cls);
    g.appendChild(t);
    return t;
  };
  const title = text('dim');
  title.textContent = 'ELM LEAF · VENATION';
  const count = text('dim');

  let placedKey = '';
  let shownOn = 0;
  let shownGrown = -1;
  let lit = 0;

  function update(on: number, grown: number, scope: Scope | undefined): void {
    if (on <= 0) {
      if (shownOn > 0) g.style.opacity = '0';
      shownOn = 0;
      return;
    }
    const W = Math.max(1, window.innerWidth);
    const H = Math.max(1, window.innerHeight);
    const short = Math.min(W, H);
    const S = (scope?.size ?? 0.4) * short;
    const right = scope ? scope.corner.endsWith('right') : true;
    const top = scope ? scope.corner.startsWith('top') : false;
    const ix = (scope?.inset.x ?? 0.04) * W;
    const iy = (scope?.inset.y ?? 0.095) * H;
    const cx = right ? W - ix - S / 2 : ix + S / 2;
    const cy = top ? iy + S / 2 : H - iy - S / 2;
    const key = `${S}|${cx}|${cy}`;
    if (key !== placedKey) {
      placedKey = key;
      const scale = S * 0.92;
      art.setAttribute('transform', `translate(${cx} ${cy}) rotate(${LEAN}) scale(${scale}) translate(-0.5 0)`);
      const r = (NODE_PX / scale).toFixed(5);
      for (const n of nodes) n.el.setAttribute('r', r);
      for (const v of veins) {
        v.el.setAttribute('stroke-dasharray', (v.len * scale).toFixed(2));
        v.shown = -1;
      }
      shownGrown = -1;
      const x = String(cx - S / 2);
      title.setAttribute('x', x);
      title.setAttribute('y', String(cy + S / 2 + 14));
      count.setAttribute('x', x);
      count.setAttribute('y', String(cy + S / 2 + 28));
    }
    if (grown !== shownGrown) {
      shownGrown = grown;
      const scale = S * 0.92;
      for (const v of veins) {
        const off = 1 - clamp01((grown - v.t0) / (v.t1 - v.t0));
        if (off !== v.shown) {
          v.shown = off;
          v.el.setAttribute('stroke-dashoffset', (off * v.len * scale).toFixed(2));
        }
      }
      lit = 0;
      for (const n of nodes) {
        const isLit = grown >= n.t;
        if (isLit) lit++;
        if (isLit !== n.lit) {
          n.lit = isLit;
          n.el.style.opacity = isLit ? '1' : '0';
        }
      }
      count.textContent = `NODES ${String(lit).padStart(3, '0')} / ${nodes.length}`;
    }
    if (on !== shownOn) {
      shownOn = on;
      g.style.opacity = String(on);
      svg.style.opacity = '1';
    }
  }

  function hide(): void {
    if (shownOn > 0) g.style.opacity = '0';
    shownOn = 0;
  }

  return { update, hide };
}
