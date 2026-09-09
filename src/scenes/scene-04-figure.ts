/**
 * scene-04-figure — the year's sun as a survey drawing.
 *
 * A drafting overlay on the solargraph: hairlines, dimension lines, ticks
 * and monospace labels, drawn in screen space over the world and projected
 * through the same camera that renders the sun. The figure names what the
 * sky is doing — the analemma, the equinoxes, the solstices, the equation
 * of time — and measures it live, in real degrees, as the year turns.
 *
 * Every callout is a GSAP timeline scrubbed by scroll: lines draw on,
 * labels type in, and the whole thing leaves the page again. Nothing here
 * decides *when*. The manifest declares which callouts exist and the
 * window of the scene each is on screen for; this file only knows how to
 * draw them, and reads the sun's record for every number it prints.
 *
 * The sky is seen through a lens (see the manifest's SunRecord), so the
 * drawing is not to scale — and says so. The values are the real ones.
 */

import gsap from 'gsap';
import * as THREE from 'three';
import type { Figure, FigureCallout, FigureKind, SunRecord } from './manifest';
import type { SunPosition } from './solar';

/** What the year scene hands the figure: its record, and its lens. */
export interface FigureWorld {
  sun: SunRecord;
  /** UTC ms of the record's opening exposure. */
  opensMs: number;
  /** Where the sun really stood on each day of the record… */
  real: SunPosition[];
  /** …and where the lens put it on the trail plane, world x and y. */
  trail: THREE.Vector2[];
  trailZ: number;
  /** Any real altitude and azimuth, through the lens, onto the trail plane. */
  onTrail(altitude: number, azimuth: number, out: THREE.Vector2): THREE.Vector2;
  reducedMotion: boolean;
}

export interface FigureOverlay {
  /**
   * local: the scene's progress. day: the fractional day of the record now
   * exposed. alpha: the scene's own fade. camera: the one the world was
   * just rendered through — matrices are refreshed here before projecting.
   */
  update(local: number, day: number, alpha: number, camera: THREE.Camera): void;
  hide(): void;
}

// -------------------------------------------------------------- constants

const NS = 'http://www.w3.org/2000/svg';
/** Nominal timeline seconds a callout takes to draw in, and to leave. The
 *  manifest's `enter` and `exit` map scroll onto these. */
const IN = 1;
const OUT = 0.6;
/** Screen-space sizes, px. The type sizes live in style.css; these are
 *  the drawing's own: tick lengths, leader runs, the crosshair. */
const TICK = 6;
const CROSS_R = 7;
const LEADER = 26;
const DIM_OFF = 22;
/** Bearings ticked along the datum, degrees clockwise from north. */
const BEARINGS: [number, string][] = [
  [225, 'SW'],
  [240, '240'],
  [255, '255'],
  [270, 'W'],
];
/** Real azimuths the datum is drawn between, either side of the opening
 *  sun: enough that, through the lens, it runs off both edges of the frame. */
const DATUM_SPAN = 150;
const DATUM_STEPS = 40;
/** Callouts that do not fit a phone, and ones that need a full laptop.
 *  A phone keeps the specimen and loses the plan: the two blocks cannot
 *  share the foot of a frame 375 px wide, and the specimen's azimuth row
 *  carries the plan's one reading. */
const WIDE_ONLY = new Set<FigureKind>(['header', 'plan', 'azimuth', 'width', 'height']);
const ROOMY_ONLY = new Set<FigureKind>(['width', 'height']);
const WIDE = 720;
const ROOMY = 1100;

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAY_MS = 86_400_000;
const D2R = Math.PI / 180;
const MINUS = '−';

const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1);

// ------------------------------------------------------------ formatting

const pad = (n: number, w: number) => String(Math.floor(n)).padStart(w, '0');
/** `28.1°`; signed when asked, with a real minus sign. */
function deg(v: number, digits = 1, signed = false): string {
  const s = Math.abs(v).toFixed(digits);
  if (v < 0 && Number(s) !== 0) return `${MINUS}${s}°`;
  return signed ? `+${s}°` : `${s}°`;
}
function minutes(v: number): string {
  const s = Math.abs(v).toFixed(1);
  return `${v < 0 ? MINUS : '+'}${s} MIN`;
}
/** A bearing as a quadrant reading: 237° → S 57° W. */
function quadrant(az: number): string {
  const a = ((az % 360) + 360) % 360;
  if (a <= 90) return `N ${a.toFixed(0)}° E`;
  if (a <= 180) return `S ${(180 - a).toFixed(0)}° E`;
  if (a <= 270) return `S ${(a - 180).toFixed(0)}° W`;
  return `N ${(360 - a).toFixed(0)}° W`;
}
/** Calendar date of an instant, read in the record's held zone. */
function dateOf(ms: number, utcOffset: number): { d: number; m: number; y: number; hh: number; mm: number } {
  const t = new Date(ms + utcOffset * 3_600_000);
  return {
    d: t.getUTCDate(),
    m: t.getUTCMonth(),
    y: t.getUTCFullYear(),
    hh: t.getUTCHours(),
    mm: t.getUTCMinutes(),
  };
}
const fmtDate = (ms: number, off: number) => {
  const t = dateOf(ms, off);
  return `${pad(t.d, 2)} ${MONTHS[t.m]} ${t.y}`;
};
const fmtDay = (ms: number, off: number) => {
  const t = dateOf(ms, off);
  return `${pad(t.d, 2)} ${MONTHS[t.m]}`;
};
const fmtTime = (ms: number, off: number) => {
  const t = dateOf(ms, off);
  return `${pad(t.hh, 2)}:${pad(t.mm, 2)}`;
};
const fmtZone = (off: number) => `UTC${off < 0 ? MINUS : '+'}${Math.abs(off)}`;
const fmtLat = (v: number) => `${Math.abs(v).toFixed(4)}° ${v < 0 ? 'S' : 'N'}`;
const fmtLon = (v: number) => `${Math.abs(v).toFixed(4)}° ${v < 0 ? 'W' : 'E'}`;

// ------------------------------------------------------------- svg bits

type Attrs = Record<string, string | number>;

function make<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  cls?: string,
): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  if (cls) e.setAttribute('class', cls);
  return e;
}

/** A stroke that can draw itself on: dash units normalised to the path. */
function drawable<K extends 'line' | 'path' | 'polyline' | 'rect' | 'circle'>(
  tag: K,
  attrs: Attrs = {},
  cls?: string,
): SVGElementTagNameMap[K] {
  return make(tag, { ...attrs, pathLength: 1, 'stroke-dasharray': 1 }, cls);
}

interface Pt {
  x: number;
  y: number;
}

const setLine = (l: SVGLineElement, a: Pt, b: Pt) => {
  l.setAttribute('x1', a.x.toFixed(1));
  l.setAttribute('y1', a.y.toFixed(1));
  l.setAttribute('x2', b.x.toFixed(1));
  l.setAttribute('y2', b.y.toFixed(1));
};
const setAt = (e: SVGElement, p: Pt) => {
  e.setAttribute('x', p.x.toFixed(1));
  e.setAttribute('y', p.y.toFixed(1));
};
const setCentre = (e: SVGElement, p: Pt) => {
  e.setAttribute('cx', p.x.toFixed(1));
  e.setAttribute('cy', p.y.toFixed(1));
};
const setPoints = (e: SVGElement, pts: Pt[]) => {
  let s = '';
  for (const p of pts) s += `${p.x.toFixed(1)},${p.y.toFixed(1)} `;
  e.setAttribute('points', s);
};

/**
 * A label that types itself in. `k` is the fraction of the text shown;
 * GSAP tweens it, the frame paints it. The full string may change every
 * frame (live values) without disturbing the reveal.
 */
class Label {
  el: SVGTextElement;
  full = '';
  k = 1;
  private shown = '';
  constructor(cls = '', attrs: Attrs = {}) {
    this.el = make('text', attrs, cls);
  }
  set(text: string): this {
    this.full = text;
    return this;
  }
  paint(): void {
    const n = Math.ceil(clamp01(this.k) * this.full.length);
    const s = this.full.slice(0, n);
    if (s !== this.shown) {
      this.shown = s;
      this.el.textContent = s;
    }
  }
}

// ---------------------------------------------------------- choreography

/** One beat of a callout's entrance. Beats overlap a little. */
interface Beat {
  draw?: SVGElement[];
  type?: Label[];
  fade?: SVGElement[];
}

/**
 * Build a callout's timeline: the entrance as declared beats across IN,
 * then the exit — a short fade and slide — across OUT. Paused; the frame
 * sets its time from scroll.
 */
function choreograph(
  g: SVGGElement,
  beats: Beat[],
  exit: Pt,
): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true });
  const slot = IN / Math.max(beats.length, 1);
  beats.forEach((b, i) => {
    const start = i * slot * 0.8;
    const dur = Math.min(slot * 1.35, IN - start);
    for (const e of b.draw ?? []) {
      tl.fromTo(
        e,
        { attr: { 'stroke-dashoffset': 1 } },
        { attr: { 'stroke-dashoffset': 0 }, duration: dur, ease: 'none', immediateRender: true },
        start,
      );
    }
    for (const l of b.type ?? []) {
      tl.fromTo(l, { k: 0 }, { k: 1, duration: dur, ease: 'none', immediateRender: true }, start);
    }
    for (const e of b.fade ?? []) {
      tl.fromTo(
        e,
        { opacity: 0 },
        { opacity: 1, duration: dur * 0.7, ease: 'power1.out', immediateRender: true },
        start,
      );
    }
  });
  tl.fromTo(
    g,
    { opacity: 1, x: 0, y: 0 },
    { opacity: 0, x: exit.x, y: exit.y, duration: OUT, ease: 'power2.in', immediateRender: false },
    IN,
  );
  return tl;
}

// ---------------------------------------------------------------- frame

/** Everything a callout needs to lay itself out, computed once a frame. */
interface Frame {
  W: number;
  H: number;
  inset: number;
  /** Type metrics: font size, a character's advance, a line's pitch. */
  fs: number;
  ch: number;
  lh: number;
  narrow: boolean;
  day: number;
  /** The exposure the record has reached — the nearest whole day — and
   *  its date. The sun between two exposures is interpolated; the page
   *  never prints a clock other than the one the record holds. */
  exposure: number;
  ms: number;
  alt: number;
  az: number;
  decl: number;
  eot: number;
  /** Today's sun on screen, and its foot on the datum. */
  sun: Pt;
  foot: Pt;
  /** Every day of the record on screen. */
  sx: Float32Array;
  sy: Float32Array;
  datum: Pt[];
  bearings: { label: string; p: Pt }[];
  /** Due west on the datum. */
  west: Pt;
}

interface Callout {
  def: FigureCallout;
  g: SVGGElement;
  tl: gsap.core.Timeline;
  labels: Label[];
  layout(f: Frame): void;
  shown: boolean;
}

/** An instant the record passes through, to sub-day precision. */
interface Moment {
  day: number;
  ms: number;
  alt: number;
  az: number;
  decl: number;
  eot: number;
}

// ---------------------------------------------------------------- build

export function createFigure(svg: SVGSVGElement, def: Figure, w: FigureWorld): FigureOverlay {
  const { sun: rec, real, trail, trailZ, opensMs, onTrail } = w;
  const days = real.length - 1;
  const off = rec.utcOffset;

  // ---- the record, read between the daily exposures.
  const at = (day: number): Moment => {
    const d = Math.min(Math.max(day, 0), days);
    const i = Math.min(Math.floor(d), days - 1);
    const t = d - i;
    const a = real[i];
    const b = real[i + 1];
    return {
      day: d,
      ms: opensMs + d * DAY_MS,
      alt: a.altitude + (b.altitude - a.altitude) * t,
      az: a.azimuth + (b.azimuth - a.azimuth) * t,
      decl: a.declination + (b.declination - a.declination) * t,
      eot: a.equationOfTime + (b.equationOfTime - a.equationOfTime) * t,
    };
  };

  // ---- the instants. Extremes are refined through the parabola of the
  // three daily samples around them; crossings by the line between two.
  const values = (key: keyof SunPosition) => real.map((r) => r[key]);
  const extreme = (v: number[], max: boolean): number => {
    let i = 0;
    for (let k = 1; k < v.length; k++) if (max ? v[k] > v[i] : v[k] < v[i]) i = k;
    if (i === 0 || i === v.length - 1) return i;
    const y0 = v[i - 1];
    const y1 = v[i];
    const y2 = v[i + 1];
    const den = y0 - 2 * y1 + y2;
    return den === 0 ? i : i + (0.5 * (y0 - y2)) / den;
  };
  const crossings = (v: number[]): number[] => {
    const out: number[] = [];
    for (let i = 0; i < v.length - 1; i++) {
      if (Math.sign(v[i]) !== Math.sign(v[i + 1]) && v[i] !== v[i + 1]) {
        out.push(i + v[i] / (v[i] - v[i + 1]));
      }
    }
    return out;
  };
  const decl = values('declination');
  const eot = values('equationOfTime');
  const eq = crossings(decl);
  const moments = {
    equinoxAutumn: at(eq.find((d) => decl[Math.floor(d)] > 0) ?? 0),
    equinoxSpring: at(eq.find((d) => decl[Math.floor(d)] < 0) ?? 0),
    solsticeWinter: at(extreme(decl, false)),
    solsticeSummer: at(extreme(decl, true)),
    eotFast: at(extreme(eot, true)),
    eotSlow: at(extreme(eot, false)),
    highest: at(extreme(values('altitude'), true)),
    lowest: at(extreme(values('altitude'), false)),
  };
  const azMin = Math.min(...values('azimuth'));
  const azMax = Math.max(...values('azimuth'));

  // The node: where the second half of the record crosses the first.
  let node: { a: number; b: number; p: THREE.Vector2 } | null = null;
  {
    const half = Math.floor(days / 2);
    outer: for (let a = 0; a < half; a++) {
      const p = trail[a];
      const r = trail[a + 1].clone().sub(p);
      for (let b = half; b < days; b++) {
        const q = trail[b];
        const s = trail[b + 1].clone().sub(q);
        const den = r.x * s.y - r.y * s.x;
        if (Math.abs(den) < 1e-9) continue;
        const qp = q.clone().sub(p);
        const t = (qp.x * s.y - qp.y * s.x) / den;
        const u = (qp.x * r.y - qp.y * r.x) / den;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
          node = { a: a + t, b: b + u, p: p.clone().addScaledVector(r, t) };
          break outer;
        }
      }
    }
  }

  // Month starts and week marks along the record.
  const monthStarts: { day: number; label: string }[] = [];
  for (let i = 1; i <= days; i++) {
    const t = dateOf(opensMs + i * DAY_MS, off);
    if (t.d === 1) monthStarts.push({ day: i, label: MONTHS[t.m] });
  }
  const weekStarts: number[] = [];
  for (let i = 7; i <= days; i += 7) weekStarts.push(i);

  // ---- the datum: the horizon through the lens, on the trail plane.
  const openAz = real[0].azimuth;
  const datumWorld: THREE.Vector2[] = [];
  for (let i = 0; i <= DATUM_STEPS; i++) {
    const az = openAz - DATUM_SPAN + (2 * DATUM_SPAN * i) / DATUM_STEPS;
    datumWorld.push(onTrail(0, az, new THREE.Vector2()));
  }
  const bearingWorld = BEARINGS.map(([az, label]) => ({
    label,
    p: onTrail(0, az, new THREE.Vector2()),
  }));
  const westWorld = onTrail(0, 270, new THREE.Vector2());

  // ---- projection. World points on the trail plane to screen px.
  const v3 = new THREE.Vector3();
  let W = 1;
  let H = 1;
  let cam: THREE.Camera | null = null;
  const project = (x: number, y: number, out: Pt = { x: 0, y: 0 }): Pt => {
    if (!cam) return out;
    v3.set(x, y, trailZ).project(cam);
    out.x = ((v3.x + 1) / 2) * W;
    out.y = ((1 - v3.y) / 2) * H;
    return out;
  };
  const sx = new Float32Array(days + 1);
  const sy = new Float32Array(days + 1);
  /** A fractional day of the record, on screen. */
  const screenAt = (day: number, out: Pt = { x: 0, y: 0 }): Pt => {
    const d = Math.min(Math.max(day, 0), days);
    const i = Math.min(Math.floor(d), days - 1);
    const t = d - i;
    out.x = sx[i] + (sx[i + 1] - sx[i]) * t;
    out.y = sy[i] + (sy[i + 1] - sy[i]) * t;
    return out;
  };

  // ---- the page.
  svg.replaceChildren();
  const defs = make('defs');
  const arrow = (id: string, cls: string) => {
    const m = make('marker', {
      id,
      markerWidth: 8,
      markerHeight: 8,
      refX: 7,
      refY: 4,
      orient: 'auto-start-reverse',
      markerUnits: 'userSpaceOnUse',
    });
    m.appendChild(make('path', { d: 'M0,1 L7,4 L0,7 Z' }, cls));
    defs.appendChild(m);
  };
  arrow('fig-arrow', 'figure__marker');
  arrow('fig-arrow-now', 'figure__marker--now');
  svg.appendChild(defs);

  let fs = 11;
  let ch = 6.8;
  let lh = 16;
  let narrow = false;
  function resize(): void {
    W = window.innerWidth;
    H = window.innerHeight;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    fs = parseFloat(getComputedStyle(svg).fontSize) || 11;
    ch = fs * 0.62;
    lh = Math.round(fs * 1.45);
    narrow = W < WIDE;
  }
  resize();
  window.addEventListener('resize', resize);

  /** The datum's height on screen at a given x, read off its polyline. */
  const datumY = (f: Frame, x: number): number => {
    const d = f.datum;
    for (let i = 0; i < d.length - 1; i++) {
      const a = d[i];
      const b = d[i + 1];
      if ((x >= a.x && x <= b.x) || (x >= b.x && x <= a.x)) {
        const t = b.x === a.x ? 0 : (x - a.x) / (b.x - a.x);
        return a.y + (b.y - a.y) * t;
      }
    }
    return x < d[0].x ? d[0].y : d[d.length - 1].y;
  };

  // A dimension line: arrows both ends, extension ticks past each end.
  const dimension = (g: SVGGElement, cls = '') => {
    const line = drawable('line', { 'marker-start': 'url(#fig-arrow)', 'marker-end': 'url(#fig-arrow)' }, cls);
    const ext1 = make('line', {}, 'fine');
    const ext2 = make('line', {}, 'fine');
    g.append(ext1, ext2, line);
    return { line, ext1, ext2 };
  };

  // A leader: a diagonal run from an anchor, then a horizontal shelf the
  // label sits on. Turns left or right to stay on the page.
  const leader = (g: SVGGElement, cls = '') => {
    const diag = drawable('line', {}, cls);
    const shelf = drawable('line', {}, cls);
    g.append(diag, shelf);
    return {
      diag,
      shelf,
      /** Lay it out from `p` toward `dir` (±1 x, ±1 y). Returns the label origin. */
      set(p: Pt, dx: number, dy: number, run = LEADER, shelfLen = 14): Pt {
        const k: Pt = { x: p.x + dx * run, y: p.y + dy * run };
        const e: Pt = { x: k.x + dx * shelfLen, y: k.y };
        setLine(diag, p, k);
        setLine(shelf, k, e);
        return { x: e.x + dx * 6, y: e.y + fs * 0.35 };
      },
    };
  };

  // Text anchored at a shelf end: left- or right-aligned by its side.
  const place = (l: Label, o: Pt, dx: number, line = 0) => {
    setAt(l.el, { x: o.x, y: o.y + line * lh });
    l.el.setAttribute('text-anchor', dx < 0 ? 'end' : 'start');
  };

  // ------------------------------------------------------- the callouts

  const callouts: Callout[] = [];

  function add(
    c: FigureCallout,
    build: (g: SVGGElement, labels: Label[]) => { beats: Beat[]; exit: Pt; layout: (f: Frame) => void },
  ): void {
    const g = make('g', { 'data-callout': c.kind });
    const labels: Label[] = [];
    const built = build(g, labels);
    for (const l of labels) g.appendChild(l.el);
    svg.appendChild(g);
    const tl = choreograph(g, built.beats, built.exit);
    tl.time(0);
    g.style.display = 'none';
    callouts.push({ def: c, g, tl, labels, layout: built.layout, shown: false });
  }

  /** An event tick on the record: a bar across the trace, a leader out to
   *  the side (`dx`) and, if `dy` is set, up or down as well, then two lines
   *  of label. Directions are chosen so an event's label never lands where
   *  today's readout — always up and to the right of the sun — will be. */
  function eventCallout(
    c: FigureCallout,
    m: Moment,
    dx: number,
    dy: number,
    lines: () => [string, string],
  ) {
    add(c, (g, labels) => {
      const bar = drawable('line');
      const ext = make('line', {}, 'fine');
      const shelf = make('line', {}, 'fine');
      const dot = make('circle', { r: 2.5 });
      const l1 = new Label();
      const l2 = new Label('dim');
      labels.push(l1, l2);
      g.append(ext, shelf, bar, dot);
      return {
        beats: [{ draw: [bar], fade: [dot] }, { fade: [ext, shelf] }, { type: [l1] }, { type: [l2] }],
        exit: { x: dx * 12, y: dy * 8 },
        layout(f) {
          const p = screenAt(m.day);
          const before = screenAt(m.day - 2);
          const after = screenAt(m.day + 2);
          // Perpendicular to the record's direction at the instant.
          let nx = -(after.y - before.y);
          let ny = after.x - before.x;
          const n = Math.hypot(nx, ny) || 1;
          nx /= n;
          ny /= n;
          setLine(bar, { x: p.x - nx * TICK, y: p.y - ny * TICK }, { x: p.x + nx * TICK, y: p.y + ny * TICK });
          setCentre(dot, p);
          const run = f.narrow ? 40 : 72;
          const [a, b] = lines();
          // The label keeps its declared side unless that runs it off the
          // page; then it crosses over, and drops below the readout.
          const width = Math.max(a.length, b.length) * f.ch + run + 6;
          const fits = (side: number) =>
            side < 0 ? p.x - width >= f.inset : p.x + width <= f.W - f.inset;
          let sx = dx;
          let sy = dy;
          if (!fits(dx) && fits(-dx)) {
            sx = -dx;
            sy = dy || 1;
          }
          let end: Pt;
          if (sy === 0) {
            end = { x: p.x + sx * run, y: p.y };
            setLine(ext, { x: p.x + sx * TICK, y: p.y }, end);
            setLine(shelf, end, end);
          } else {
            const knee = { x: p.x + sx * LEADER, y: p.y + sy * LEADER };
            end = { x: knee.x + sx * (run - LEADER), y: knee.y };
            setLine(ext, { x: p.x + sx * TICK * 0.7, y: p.y + sy * TICK * 0.7 }, knee);
            setLine(shelf, knee, end);
          }
          l1.set(a);
          l2.set(b);
          place(l1, { x: end.x + sx * 6, y: end.y - lh * 0.15 }, sx, 0);
          place(l2, { x: end.x + sx * 6, y: end.y - lh * 0.15 }, sx, 1);
        },
      };
    });
  }

  for (const c of def.callouts) {
    switch (c.kind) {
      case 'header':
        add(c, (g, labels) => {
          const title = new Label('title').set('SOLAR GEOMETRY');
          const rows = [new Label(), new Label(), new Label(), new Label()];
          const rule = drawable('line', {}, 'hair');
          g.append(rule);
          labels.push(title, ...rows);
          return {
            beats: [{ type: [title] }, { draw: [rule] }, { type: [rows[0], rows[1]] }, { type: [rows[2], rows[3]] }],
            exit: { x: -16, y: 0 },
            layout(f) {
              const x = f.inset;
              const y = f.inset + f.fs;
              setAt(title.el, { x, y });
              setLine(rule, { x, y: y + f.lh * 0.55 }, { x: x + f.ch * 20, y: y + f.lh * 0.55 });
              const key = (k: string, v: string) => `${k.padEnd(6)}${v}`;
              rows[0].set(key('DATE', fmtDate(f.ms, off)));
              rows[1].set(key('TIME', `${rec.clock} ${fmtZone(off)}`));
              rows[2].set(key('LAT', fmtLat(rec.lat)));
              rows[3].set(key('LON', fmtLon(rec.lon)));
              rows.forEach((r, i) => setAt(r.el, { x, y: y + f.lh * (1.5 + i) }));
            },
          };
        });
        break;

      case 'plan':
        add(c, (g, labels) => {
          const ring = drawable('circle');
          const fan = drawable('path', {}, 'hair');
          const north = drawable('line', { 'marker-end': 'url(#fig-arrow)' });
          const cross1 = make('line', {}, 'fine');
          const cross2 = make('line', {}, 'fine');
          const bench = make('circle', { r: 2 });
          const ray = make('line', {}, 'dash now');
          const sunMark = make('circle', { r: 3 }, 'now');
          const n = new Label('dim', { 'text-anchor': 'middle' }).set('N');
          const cap = new Label('dim').set('PLAN · NOT TO SCALE');
          const azl = new Label('now');
          const span = new Label('dim').set(`SWEEP ${deg(azMin, 0)}–${deg(azMax, 0)}`);
          labels.push(n, cap, azl, span);
          g.append(fan, ring, cross1, cross2, north, bench, ray, sunMark);
          return {
            beats: [
              { draw: [ring], fade: [cross1, cross2] },
              { draw: [north], type: [n] },
              { draw: [fan], fade: [bench, ray, sunMark] },
              { type: [cap, span] },
              { type: [azl] },
            ],
            exit: { x: -16, y: 0 },
            layout(f) {
              // Bottom-left, above the HUD's scale label and hint, like a
              // plan in a drawing's corner.
              const r = Math.round(f.fs * 3.2);
              const cx = f.inset + r + f.ch * 2;
              const hud = f.lh * 3.2;
              const ty = f.H - f.inset - hud - f.lh * 2;
              const cy = ty - f.lh * 1.2 - r;
              const c0: Pt = { x: cx, y: cy };
              setCentre(ring, c0);
              ring.setAttribute('r', String(r));
              setLine(cross1, { x: cx - r, y: cy }, { x: cx + r, y: cy });
              setLine(cross2, { x: cx, y: cy - r }, { x: cx, y: cy + r });
              setLine(north, { x: cx, y: cy - r * 0.35 }, { x: cx, y: cy - r - 10 });
              setAt(n.el, { x: cx, y: cy - r - 16 });
              setCentre(bench, c0);
              // The year's sweep of bearings, as a sector; today's, as a ray.
              const px = (az: number, k: number) => ({
                x: cx + Math.sin(az * D2R) * r * k,
                y: cy - Math.cos(az * D2R) * r * k,
              });
              const a = px(azMin, 0.92);
              const b = px(azMax, 0.92);
              fan.setAttribute(
                'd',
                `M${cx},${cy} L${a.x.toFixed(1)},${a.y.toFixed(1)} A${(r * 0.92).toFixed(1)},${(r * 0.92).toFixed(1)} 0 0 1 ${b.x.toFixed(1)},${b.y.toFixed(1)} Z`,
              );
              const s = px(f.az, 0.92);
              setLine(ray, c0, s);
              setCentre(sunMark, s);
              setAt(cap.el, { x: f.inset, y: ty });
              setAt(span.el, { x: f.inset, y: ty + f.lh });
              azl.set(`SIGHTLINE ${deg(f.az)} · ${quadrant(f.az)}`);
              setAt(azl.el, { x: f.inset, y: ty + f.lh * 2 });
            },
          };
        });
        break;

      case 'specimen':
        add(c, (g, labels) => {
          const box = drawable('rect');
          const rule = drawable('line', {}, 'hair');
          const title = new Label('title').set('SPECIMEN');
          const keys = ['SUBJECT', 'LOCATION', 'EXPOSURE', 'DATE', 'ALTITUDE', 'AZIMUTH', 'DECLIN.', 'EQ. TIME', 'LENS'];
          /** The rows a phone keeps: what, which exposure, when, where the sun is. */
          const NARROW_ROWS = [0, 2, 3, 4, 5];
          const ks = keys.map((k) => new Label('dim').set(k));
          const vs = keys.map(() => new Label());
          labels.push(title, ...ks, ...vs);
          g.append(box, rule);
          const beats: Beat[] = [{ draw: [box] }, { type: [title] }, { draw: [rule] }];
          for (let i = 0; i < keys.length; i += 2) {
            const t = [ks[i], vs[i]];
            if (ks[i + 1]) t.push(ks[i + 1], vs[i + 1]);
            beats.push({ type: t });
          }
          return {
            beats,
            exit: { x: 16, y: 0 },
            layout(f) {
              // On a phone: fewer rows, and bottom-left above the HUD —
              // where the plan stands on a wide frame — so the people at
              // the frame's foot are not covered by a table.
              const kept = f.narrow ? NARROW_ROWS : keys.map((_, i) => i);
              const cols = f.narrow ? 28 : 34;
              const bw = f.ch * cols;
              const bh = f.lh * (kept.length + 2.4);
              const x0 = f.narrow ? f.inset : f.W - f.inset - bw;
              const y0 = f.H - f.inset - bh - (f.narrow ? f.lh * 3.2 : 0);
              box.setAttribute('x', x0.toFixed(1));
              box.setAttribute('y', y0.toFixed(1));
              box.setAttribute('width', bw.toFixed(1));
              box.setAttribute('height', bh.toFixed(1));
              const pad = f.ch * 1.2;
              const ty = y0 + f.lh * 1.25;
              setAt(title.el, { x: x0 + pad, y: ty });
              setLine(rule, { x: x0, y: ty + f.lh * 0.5 }, { x: x0 + bw, y: ty + f.lh * 0.5 });
              const vx = x0 + pad + f.ch * 10;
              const values = [
                `THE SUN AT ${rec.clock}`,
                f.narrow ? 'LAKE HARRIET, MPLS' : 'LAKE HARRIET, MINNEAPOLIS',
                `${pad3(f.exposure)} / ${days}`,
                fmtDate(f.ms, off),
                deg(f.alt),
                `${deg(f.az)} · ${quadrant(f.az)}`,
                deg(f.decl, 2, true),
                minutes(f.eot),
                `${rec.lens.scale.toFixed(2)}× · NOT TO SCALE`,
              ];
              keys.forEach((_, i) => {
                const row = kept.indexOf(i);
                const on = row >= 0;
                ks[i].el.style.display = on ? '' : 'none';
                vs[i].el.style.display = on ? '' : 'none';
                if (!on) return;
                const y = ty + f.lh * (1.6 + row);
                setAt(ks[i].el, { x: x0 + pad, y });
                vs[i].set(values[i]);
                setAt(vs[i].el, { x: vx, y });
              });
            },
          };
        });
        break;

      case 'trace':
        add(c, (g) => {
          const line = make('polyline', {}, 'hair');
          const weeks = weekStarts.map(() => make('line', {}, 'hair'));
          const months = monthStarts.map(() => make('line'));
          const monthLabels = monthStarts.map((m) => new Label('dim').set(m.label));
          g.append(line, ...weeks, ...months, ...monthLabels.map((l) => l.el));
          const pts: Pt[] = [];
          const tick = (el: SVGLineElement, day: number, len: number, label?: Label) => {
            const on = day <= f0.day;
            el.style.display = on ? '' : 'none';
            if (label) label.el.style.display = on ? '' : 'none';
            if (!on) return;
            const p = screenAt(day);
            const a = screenAt(day - 1.5);
            const b = screenAt(day + 1.5);
            let nx = -(b.y - a.y);
            let ny = b.x - a.x;
            const n = Math.hypot(nx, ny) || 1;
            nx /= n;
            ny /= n;
            // Ticks stand on the outside of the figure: away from its centre.
            if (nx * (p.x - f0.cx) + ny * (p.y - f0.cy) < 0) {
              nx = -nx;
              ny = -ny;
            }
            setLine(el, p, { x: p.x + nx * len, y: p.y + ny * len });
            if (label) {
              setAt(label.el, { x: p.x + nx * (len + 5), y: p.y + ny * (len + 5) + fs * 0.35 });
              label.el.setAttribute('text-anchor', nx < -0.3 ? 'end' : nx > 0.3 ? 'start' : 'middle');
            }
          };
          let f0 = { day: 0, cx: 0, cy: 0 };
          return {
            beats: [{ fade: [line] }],
            exit: { x: 0, y: 0 },
            layout(f) {
              const n = Math.min(Math.ceil(f.day), days);
              pts.length = 0;
              let cx = 0;
              let cy = 0;
              for (let i = 0; i < n; i++) {
                pts.push({ x: sx[i], y: sy[i] });
                cx += sx[i];
                cy += sy[i];
              }
              pts.push(f.sun);
              setPoints(line, pts);
              f0 = { day: f.day, cx: cx / Math.max(n, 1), cy: cy / Math.max(n, 1) };
              weekStarts.forEach((d, i) => tick(weeks[i], d, 3));
              monthStarts.forEach((m, i) => tick(months[i], m.day, TICK, monthLabels[i]));
              for (const l of monthLabels) l.paint();
            },
          };
        });
        break;

      case 'datum':
        add(c, (g, labels) => {
          const line = make('polyline', {}, 'dash');
          const ticks = BEARINGS.map(() => drawable('line'));
          const tickLabels = BEARINGS.map(([, s]) => new Label('dim', { 'text-anchor': 'middle' }).set(s));
          const cap = new Label('dim').set('DATUM · TRUE HORIZON · ALT 0°');
          labels.push(...tickLabels, cap);
          g.append(line, ...ticks);
          return {
            beats: [{ fade: [line] }, { draw: ticks }, { type: tickLabels }, { type: [cap] }],
            exit: { x: 0, y: 10 },
            layout(f) {
              setPoints(line, f.datum);
              // Bearings stand up from the line, into the sky, where they
              // can be read; below it is the canopy.
              f.bearings.forEach((b, i) => {
                setLine(ticks[i], b.p, { x: b.p.x, y: b.p.y - TICK });
                setAt(tickLabels[i].el, { x: b.p.x, y: b.p.y - TICK - 4 });
              });
              // The caption sits at the page's right inset, on the line:
              // the left is where the winter sun's labels go.
              const x = f.W - f.inset;
              const y = datumY(f, x);
              cap.el.setAttribute('text-anchor', 'end');
              setAt(cap.el, { x, y: y - f.fs * 0.6 });
            },
          };
        });
        break;

      case 'now':
        add(c, (g, labels) => {
          const ring = drawable('circle', { r: CROSS_R }, 'now');
          const arms = [0, 1, 2, 3].map(() => drawable('line', {}, 'now'));
          const ld = leader(g, 'now');
          const l1 = new Label('now');
          const l2 = new Label('dim');
          labels.push(l1, l2);
          g.append(ring, ...arms);
          return {
            beats: [{ draw: [ring] }, { draw: arms }, { draw: [ld.diag, ld.shelf] }, { type: [l1] }, { type: [l2] }],
            exit: { x: 0, y: -10 },
            layout(f) {
              const p = f.sun;
              setCentre(ring, p);
              const dirs = [
                [1, 0],
                [-1, 0],
                [0, 1],
                [0, -1],
              ];
              arms.forEach((a, i) => {
                const [dx, dy] = dirs[i];
                setLine(
                  a,
                  { x: p.x + dx * (CROSS_R + 3), y: p.y + dy * (CROSS_R + 3) },
                  { x: p.x + dx * (CROSS_R + 10), y: p.y + dy * (CROSS_R + 10) },
                );
              });
              const dx = p.x > f.W * 0.62 ? -1 : 1;
              const o = ld.set({ x: p.x + dx * CROSS_R * 0.75, y: p.y - CROSS_R * 0.75 }, dx, -1);
              l1.set(`NOW · DAY ${pad3(f.exposure)} · ${fmtDay(f.ms, off)}`);
              l2.set(`ALT ${deg(f.alt)} · AZ ${deg(f.az)}`);
              place(l1, o, dx, 0);
              place(l2, o, dx, 1);
            },
          };
        });
        break;

      case 'altitude':
        add(c, (g, labels) => {
          const drop = make('line', {}, 'fine');
          const dim = dimension(g);
          const l1 = new Label();
          const l2 = new Label('dim');
          labels.push(l1, l2);
          g.append(drop);
          return {
            beats: [{ fade: [drop, dim.ext1, dim.ext2] }, { draw: [dim.line] }, { type: [l1] }, { type: [l2] }],
            exit: { x: 12, y: 0 },
            layout(f) {
              const x = f.sun.x + DIM_OFF;
              setLine(drop, { x: f.sun.x, y: f.sun.y + CROSS_R + 12 }, { x: f.foot.x, y: f.foot.y });
              setLine(dim.line, { x, y: f.foot.y }, { x, y: f.sun.y });
              setLine(dim.ext1, { x: f.sun.x + CROSS_R + 12, y: f.sun.y }, { x: x + 6, y: f.sun.y });
              setLine(dim.ext2, { x: f.foot.x + 6, y: f.foot.y }, { x: x + 6, y: f.foot.y });
              // A tall dimension carries its label at mid-height with a
              // second line; a short one — the winter sun — one line, level
              // with its top, so nothing spills into the bearings below.
              const span = f.foot.y - f.sun.y;
              const tall = span > lh * 3;
              const my = tall ? (f.foot.y + f.sun.y) / 2 : f.sun.y + lh * 0.5;
              l1.set(`ALTITUDE ${deg(f.alt)}`);
              l2.set(tall ? 'ABOVE THE TRUE HORIZON' : '');
              setAt(l1.el, { x: x + 8, y: my - lh * 0.15 });
              setAt(l2.el, { x: x + 8, y: my + lh * 0.85 });
            },
          };
        });
        break;

      case 'azimuth':
        add(c, (g, labels) => {
          const dim = dimension(g);
          const l1 = new Label();
          labels.push(l1);
          return {
            beats: [{ fade: [dim.ext1, dim.ext2] }, { draw: [dim.line] }, { type: [l1] }],
            exit: { x: 0, y: 12 },
            layout(f) {
              // Above the datum and its bearings, in the sky; the label in
              // the one row between the line and the bearings.
              const y = Math.min(f.west.y, f.foot.y) - TICK - f.fs - DIM_OFF;
              setLine(dim.line, { x: f.foot.x, y }, { x: f.west.x, y });
              setLine(dim.ext1, { x: f.foot.x, y: f.foot.y - 2 }, { x: f.foot.x, y: y - 6 });
              setLine(dim.ext2, { x: f.west.x, y: f.west.y - TICK - f.fs - 6 }, { x: f.west.x, y: y - 6 });
              const mx = (f.foot.x + f.west.x) / 2;
              l1.set(`AZIMUTH ${deg(f.az)} · ${quadrant(f.az)}`);
              l1.el.setAttribute('text-anchor', 'middle');
              setAt(l1.el, { x: mx, y: y + f.fs + 3 });
            },
          };
        });
        break;

      case 'title':
        add(c, (g, labels) => {
          const ld = leader(g);
          const l1 = new Label('title');
          const l2 = new Label('dim');
          labels.push(l1, l2);
          // Anchored to a day at the top of the first pass, before the
          // record turns down toward winter.
          const anchor = Math.min(28, days);
          return {
            // The name fades up whole: typed letter by letter it passes
            // through words it should not.
            beats: [{ draw: [ld.diag, ld.shelf] }, { fade: [l1.el] }, { type: [l2] }],
            exit: { x: 0, y: -12 },
            layout(f) {
              const p = screenAt(anchor);
              const dx = p.x > f.W * 0.62 ? -1 : 1;
              const o = ld.set({ x: p.x + dx * 5, y: p.y }, dx, 0, LEADER * 1.6, 20);
              l1.set('ANALEMMA');
              // On a phone the whole line runs off the frame's right edge
              // from where the record anchors it; the count is in the
              // specimen's exposure row anyway.
              l2.set(f.narrow ? 'THE SUN AT ONE CLOCK TIME' : `THE SUN AT ONE CLOCK TIME · ${days} EXPOSURES`);
              place(l1, { x: o.x, y: o.y - lh * 0.15 }, dx, 0);
              place(l2, { x: o.x, y: o.y - lh * 0.15 }, dx, 1);
            },
          };
        });
        break;

      case 'equinox-autumn': {
        const m = moments.equinoxAutumn;
        eventCallout(c, m, 1, 1, () => [
          `EQUINOX · ${fmtDay(m.ms, off)} ${fmtTime(m.ms, off)}`,
          'DECLINATION 0° · SUN OVER THE EQUATOR, SOUTHBOUND',
        ]);
        break;
      }
      case 'equinox-spring': {
        const m = moments.equinoxSpring;
        eventCallout(c, m, 1, 0, () => [
          `EQUINOX · ${fmtDay(m.ms, off)} ${fmtTime(m.ms, off)}`,
          'DECLINATION 0° · SUN OVER THE EQUATOR, NORTHBOUND',
        ]);
        break;
      }
      case 'solstice-winter': {
        const m = moments.solsticeWinter;
        eventCallout(c, m, -1, 0, () => [
          `WINTER SOLSTICE · ${fmtDay(m.ms, off)}`,
          `DECL ${deg(m.decl, 2, true)} · ALT ${deg(m.alt)} · THE LOW POINT`,
        ]);
        break;
      }
      case 'solstice-summer': {
        const m = moments.solsticeSummer;
        eventCallout(c, m, 1, 1, () => [
          `SUMMER SOLSTICE · ${fmtDay(m.ms, off)}`,
          `DECL ${deg(m.decl, 2, true)} · ALT ${deg(m.alt)} · THE HIGH POINT`,
        ]);
        break;
      }
      case 'eot-fast': {
        const m = moments.eotFast;
        eventCallout(c, m, -1, 0, () => [
          `EQUATION OF TIME ${minutes(m.eot)}`,
          `${fmtDay(m.ms, off)} · THE SUNDIAL RUNS AHEAD OF THE CLOCK`,
        ]);
        break;
      }
      case 'eot-slow': {
        const m = moments.eotSlow;
        eventCallout(c, m, 1, 0, () => [
          `EQUATION OF TIME ${minutes(m.eot)}`,
          `${fmtDay(m.ms, off)} · THE SUNDIAL RUNS BEHIND THE CLOCK`,
        ]);
        break;
      }

      case 'node':
        if (!node) break;
        {
          const nd = node;
          add(c, (g, labels) => {
            const ring = drawable('circle', { r: 5 });
            const ld = leader(g);
            const l1 = new Label();
            const l2 = new Label('dim');
            labels.push(l1, l2);
            g.append(ring);
            const a = at(nd.a);
            const b = at(nd.b);
            return {
              beats: [{ draw: [ring] }, { draw: [ld.diag, ld.shelf] }, { type: [l1] }, { type: [l2] }],
              exit: { x: 0, y: 12 },
              layout(f) {
                const p = project(nd.p.x, nd.p.y);
                setCentre(ring, p);
                const dx = p.x > f.W * 0.62 ? -1 : 1;
                const o = ld.set({ x: p.x + dx * 4, y: p.y + 4 }, dx, 1, LEADER * 1.4, 18);
                l1.set(`NODE · ${fmtDay(b.ms, off)} ≡ ${fmtDay(a.ms, off)}`);
                l2.set('THE FIGURE CROSSES ITSELF: TWO DAYS, ONE SUN');
                place(l1, o, dx, 0);
                place(l2, o, dx, 1);
              },
            };
          });
        }
        break;

      case 'width':
        add(c, (g, labels) => {
          const dim = dimension(g);
          const l1 = new Label();
          labels.push(l1);
          // The figure's east and west edges are the days of least and
          // greatest azimuth.
          const azs = values('azimuth');
          const east = azs.indexOf(Math.min(...azs));
          const west = azs.indexOf(Math.max(...azs));
          return {
            beats: [{ fade: [dim.ext1, dim.ext2] }, { draw: [dim.line] }, { type: [l1] }],
            exit: { x: 0, y: 12 },
            layout(f) {
              // Dimensioned just under the datum, the way a plan dimensions
              // to a baseline; the label above it, in the sky, clear of the
              // figure's west edge.
              const a = { x: sx[east], y: sy[east] };
              const b = { x: sx[west], y: sy[west] };
              const y = datumY(f, (a.x + b.x) / 2) + 14;
              setLine(dim.line, { x: a.x, y }, { x: b.x, y });
              setLine(dim.ext1, { x: a.x, y: a.y + 8 }, { x: a.x, y: y + 6 });
              setLine(dim.ext2, { x: b.x, y: b.y + 8 }, { x: b.x, y: y + 6 });
              l1.set(`WIDTH · AZIMUTH ${deg(azMin)} TO ${deg(azMax)} · ${deg(azMax - azMin)} OF SKY`);
              l1.el.setAttribute('text-anchor', 'start');
              setAt(l1.el, { x: b.x + 10, y: y - 14 - TICK - f.fs - 6 });
            },
          };
        });
        break;

      case 'height':
        add(c, (g, labels) => {
          const dim = dimension(g);
          const l1 = new Label();
          const l2 = new Label('dim');
          const l3 = new Label('dim');
          labels.push(l1, l2, l3);
          const hi = moments.highest;
          const lo = moments.lowest;
          return {
            beats: [{ fade: [dim.ext1, dim.ext2] }, { draw: [dim.line] }, { type: [l1] }, { type: [l2, l3] }],
            exit: { x: -12, y: 0 },
            layout(f) {
              const a = screenAt(hi.day);
              const b = screenAt(lo.day);
              let left = f.W;
              for (let i = 0; i <= days; i++) if (sx[i] < left) left = sx[i];
              const x = left - DIM_OFF * 1.6;
              setLine(dim.line, { x, y: b.y }, { x, y: a.y });
              setLine(dim.ext1, { x: a.x - 8, y: a.y }, { x: x - 6, y: a.y });
              setLine(dim.ext2, { x: b.x - 8, y: b.y }, { x: x - 6, y: b.y });
              // Stacked up from the low end: the header owns the top-left,
              // and the winter sun sits just above the datum.
              l1.set(`HEIGHT · ALTITUDE ${deg(lo.alt)} TO ${deg(hi.alt)}`);
              l2.set(`${deg(hi.alt - lo.alt)} OF SKY, DECEMBER TO JUNE`);
              l3.set(`DECLINATION ${deg(Math.abs(moments.solsticeSummer.decl), 2)} EITHER SIDE`);
              for (const l of [l1, l2, l3]) l.el.setAttribute('text-anchor', 'end');
              setAt(l1.el, { x: x - 8, y: b.y - lh * 2.2 });
              setAt(l2.el, { x: x - 8, y: b.y - lh * 1.2 });
              setAt(l3.el, { x: x - 8, y: b.y - lh * 0.2 });
            },
          };
        });
        break;
    }
  }

  function pad3(n: number): string {
    return pad(n, 3);
  }

  // ---------------------------------------------------------------- frame

  const frame: Frame = {
    W: 1,
    H: 1,
    inset: 24,
    fs,
    ch,
    lh,
    narrow,
    day: 0,
    exposure: 0,
    ms: opensMs,
    alt: 0,
    az: 0,
    decl: 0,
    eot: 0,
    sun: { x: 0, y: 0 },
    foot: { x: 0, y: 0 },
    sx,
    sy,
    datum: datumWorld.map(() => ({ x: 0, y: 0 })),
    bearings: bearingWorld.map((b) => ({ label: b.label, p: { x: 0, y: 0 } })),
    west: { x: 0, y: 0 },
  };
  const footWorld = new THREE.Vector2();
  let visible = false;

  function hide(): void {
    if (!visible) return;
    visible = false;
    svg.style.opacity = '0';
    for (const c of callouts) {
      if (c.shown) {
        c.shown = false;
        c.g.style.display = 'none';
      }
    }
  }

  function update(local: number, day: number, alpha: number, camera: THREE.Camera): void {
    if (alpha <= 0) {
      hide();
      return;
    }
    cam = camera;
    camera.updateMatrixWorld();

    // What the sky is doing.
    const m = at(day);
    frame.W = W;
    frame.H = H;
    frame.inset = Math.min(Math.max(24, W * 0.04), 64);
    frame.fs = fs;
    frame.ch = ch;
    frame.lh = lh;
    frame.narrow = narrow;
    frame.day = day;
    frame.exposure = Math.min(Math.round(day), days);
    frame.ms = opensMs + frame.exposure * DAY_MS;
    frame.alt = m.alt;
    frame.az = m.az;
    frame.decl = m.decl;
    frame.eot = m.eot;

    // Where it is on the page.
    const p: Pt = { x: 0, y: 0 };
    for (let i = 0; i <= days; i++) {
      project(trail[i].x, trail[i].y, p);
      sx[i] = p.x;
      sy[i] = p.y;
    }
    screenAt(day, frame.sun);
    onTrail(0, m.az, footWorld);
    project(footWorld.x, footWorld.y, frame.foot);
    datumWorld.forEach((d, i) => project(d.x, d.y, frame.datum[i]));
    bearingWorld.forEach((b, i) => project(b.p.x, b.p.y, frame.bearings[i].p));
    project(westWorld.x, westWorld.y, frame.west);

    // Each callout's place in its own window, scrubbed from scroll.
    let any = false;
    for (const c of callouts) {
      const { from, to } = c.def;
      const fits = !(W < WIDE && WIDE_ONLY.has(c.def.kind)) && !(W < ROOMY && ROOMY_ONLY.has(c.def.kind));
      const on = local >= from && local <= to && fits;
      if (!on) {
        if (c.shown) {
          c.shown = false;
          c.g.style.display = 'none';
        }
        continue;
      }
      any = true;
      if (!c.shown) {
        c.shown = true;
        c.g.style.display = '';
      }
      let t: number;
      if (w.reducedMotion) {
        t = IN;
      } else if (local < from + def.enter) {
        t = ((local - from) / def.enter) * IN;
      } else if (local > to - def.exit) {
        t = IN + ((local - (to - def.exit)) / def.exit) * OUT;
      } else {
        t = IN;
      }
      c.layout(frame);
      c.tl.time(Math.min(Math.max(t, 0), IN + OUT));
      for (const l of c.labels) l.paint();
    }

    if (!any) {
      hide();
      return;
    }
    visible = true;
    svg.style.opacity = alpha.toFixed(3);
  }

  return { update, hide };
}
