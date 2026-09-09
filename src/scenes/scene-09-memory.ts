/**
 * scene-09-memory — thirty days as panes of glass.
 *
 * The third of the three moments. A corridor of panes floats in the
 * dark, one pane a day, each carrying that day's readings. A month of
 * the same day makes thirty identical panes that, as the eye pulls back
 * from them, align and collapse into what looks like one thin sheet. A
 * month of different days makes thirty panes that will not align: they
 * scatter through space like slides, and the same thirty days look
 * enormous. No infographic says novelty is more memory; the corridor
 * shows it.
 *
 * Nothing here decides *when*. The days, the spacing, the eye's pull,
 * each month's window, its scatter and its readings are the manifest's;
 * this file knows how to make a pane and how to read the declaration at
 * a given moment. The panes are stand-ins for the sixty small images to
 * come (ASSETS.md); the choreography is not.
 */

import * as THREE from 'three';
import type { MemoryCorridor, Month, Scene } from './manifest';
import { opening, plateUrl } from './loading';

const INK = 0xe8e6e1;
const DIM = 0x8a877f;
const GROUND = 0x060708;
const NS = 'http://www.w3.org/2000/svg';

/** Local progress a month spends coming on and going off, and a day
 *  spends appearing, as a fraction of a day. */
const MONTH_EDGE = 0.03;
const DAY_IN = 0.6;
/** The readings strip along a pane's foot, as a fraction of its height,
 *  and the label sheet it is drawn from: one row per pane. */
const STRIP = 0.16;
const SHEET_W = 512;
const ROW_H = 28;

const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1);
const smooth = (t: number) => {
  const k = clamp01(t);
  return k * k * (3 - 2 * k);
};
/** Deterministic noise, so every day's scatter is the same every load. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface MemoryScene {
  setActive(on: boolean): void;
  update(local: number): void;
  /** Draws the frame through the scene's own camera; false when inactive. */
  render(renderer: THREE.WebGLRenderer): boolean;
}

// ------------------------------------------------------------------ panes

/**
 * A pane: a hairline of ink around a face of glass, a mark in its upper
 * part (a stand-in for the day's image) and the day's readings along its
 * foot, sampled from a sheet of labels one row per pane.
 */
const paneVertex = `
  attribute float aIndex, aSeed, aAlpha, aKind;
  varying vec2 vUv;
  varying float vIndex, vSeed, vAlpha, vKind;
  void main() {
    vUv = uv;
    vIndex = aIndex;
    vSeed = aSeed;
    vAlpha = aAlpha;
    vKind = aKind;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
  }`;

const paneFragment = `
  uniform vec3 uInk, uDim, uGround;
  uniform sampler2D uSheet;
  uniform float uRows, uStrip, uBright;
  // One atlas per month: its tiles cols across, count in all, and
  // whether it has arrived. A pane takes tile (day mod count).
  uniform sampler2D uAtlas0, uAtlas1;
  uniform vec3 uGrid0, uGrid1;
  uniform float uHas0, uHas1;
  varying vec2 vUv;
  varying float vIndex, vSeed, vAlpha, vKind;
  vec4 tileOf(sampler2D atlas, vec3 grid, float day, vec2 t) {
    float i = mod(day, grid.z);
    float rows = ceil(grid.z / grid.x);
    // The atlas is packed top-down; the texture's v runs bottom-up.
    vec2 cell = vec2(mod(i, grid.x), rows - 1.0 - floor(i / grid.x));
    return texture2D(atlas, (cell + clamp(t, 0.0, 1.0)) / vec2(grid.x, rows));
  }
  float hair(float d) {
    float w = fwidth(d);
    return 1.0 - smoothstep(0.5 * w, 1.5 * w, abs(d));
  }
  void main() {
    vec2 q = vUv - 0.5;
    float border = max(hair(abs(q.x) - 0.485), hair(abs(q.y) - 0.485));
    // The glass: faintly there, a little more so toward its edges.
    float face = 0.06 + 0.05 * smoothstep(0.3, 0.5, max(abs(q.x), abs(q.y)));
    // The readings along the foot.
    // The sheet is not flipped: a row runs top-down from its index.
    float rowV = (vIndex + 1.0 - vUv.y / uStrip) / uRows;
    float inStrip = step(vUv.y, uStrip);
    float text = texture2D(uSheet, vec2(vUv.x, rowV)).a * inStrip;
    float rule = hair(vUv.y - uStrip) * 0.5;
    // The mark: the same window for a month of the same day; one of four
    // shapes, placed by seed, for a month of different days.
    vec2 c = vKind < 0.5 ? vec2(0.0, 0.08) : vec2(fract(vSeed * 7.31) - 0.5, fract(vSeed * 3.17) - 0.5) * 0.35 + vec2(0.0, 0.08);
    float kind = vKind < 0.5 ? 2.0 : floor(fract(vSeed) * 4.0);
    float mark = 0.0;
    if (kind < 0.5) mark = hair(length(q - c) - 0.14);
    else if (kind < 1.5) mark = hair(q.y - c.y) * step(abs(q.x - c.x), 0.24);
    else if (kind < 2.5) {
      vec2 d = abs(q - c) - vec2(0.16, 0.12);
      mark = max(hair(d.x) * step(abs(q.y - c.y), 0.12), hair(d.y) * step(abs(q.x - c.x), 0.16));
      mark = max(mark, hair(q.x - c.x) * step(abs(q.y - c.y), 0.12) * 0.6);
    } else {
      vec2 g = vec2(fract((q.x - c.x) * 6.0) - 0.5, (q.y - c.y) * 6.0);
      mark = (1.0 - smoothstep(0.12, 0.2, length(g))) * step(abs(q.x - c.x), 0.25);
    }
    mark *= 1.0 - inStrip;
    float has = vKind < 0.5 ? uHas0 : uHas1;
    if (has > 0.5) {
      // The day's image fills the pane above the strip, cropped square
      // to the pane's width, seen through the glass.
      float day = mod(vIndex, 30.0);
      float top = 1.0 - uStrip;
      vec2 t = vec2(vUv.x, (vUv.y - uStrip) / top);
      // The pane is wider than tall: crop the square tile to the pane's
      // shape, keeping its centre.
      float ratio = top * 1.1 / 1.6;
      t.y = 0.5 + (t.y - 0.5) * ratio;
      vec4 img = vKind < 0.5 ? tileOf(uAtlas0, uGrid0, day, t) : tileOf(uAtlas1, uGrid1, day, t);
      float inImg = (1.0 - inStrip) * step(0.015, vUv.x) * step(vUv.x, 0.985) * step(vUv.y, 0.985);
      vec3 col = mix(mix(uDim, uInk, max(border, text)), img.rgb, inImg * 0.92);
      float a = max(face, max(border * 0.9, max(text, max(rule, inImg * 0.92)))) * vAlpha;
      gl_FragColor = vec4(col * uBright, a);
      #include <colorspace_fragment>
      return;
    }
    vec3 col = mix(uDim, uInk, max(border, max(text, mark)));
    float a = max(face, max(border * 0.9, max(text, max(mark * 0.8, rule)))) * vAlpha;
    gl_FragColor = vec4(col * uBright, a);
    #include <colorspace_fragment>
  }`;

// ------------------------------------------------------------------ scene

export function createMemoryScene(world: THREE.Scene, def: Scene, reducedMotion: boolean): MemoryScene {
  const declared = def.memory;
  if (!declared) return { setActive: () => {}, update: () => {}, render: () => false };
  const mc: MemoryCorridor = declared;
  const { days, spacing, pane, eye, months } = mc;
  const total = days * months.length;

  const group = new THREE.Group();
  group.name = 'memory';
  group.visible = false;
  world.add(group);

  // ---- the label sheet: every pane's readings, one row each, drawn once.
  const sheet = document.createElement('canvas');
  sheet.width = SHEET_W;
  sheet.height = ROW_H * total;
  const ctx = sheet.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, sheet.width, sheet.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = '500 15px ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';
    ctx.textBaseline = 'middle';
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '1.5px';
    months.forEach((m, mi) => {
      for (let i = 0; i < days; i++) {
        const text = m.readings.length === 1 ? m.readings[0] : (m.readings[i % m.readings.length] ?? '');
        const row = mi * days + i;
        ctx.fillText(`${String(i + 1).padStart(2, '0')}  ${text}`, 14, row * ROW_H + ROW_H / 2);
      }
    });
  }
  const sheetTex = new THREE.CanvasTexture(sheet);
  sheetTex.colorSpace = THREE.SRGBColorSpace;
  sheetTex.flipY = false;
  sheetTex.minFilter = THREE.LinearFilter;

  // ---- the panes: one instanced mesh for both months.
  const geo = new THREE.PlaneGeometry(pane.width, pane.height);
  const index = new Float32Array(total);
  const seed = new Float32Array(total);
  const alpha = new Float32Array(total);
  const kind = new Float32Array(total);
  for (let k = 0; k < total; k++) {
    index[k] = k;
    seed[k] = (k * 0.618034 + 0.137) % 1;
    kind[k] = Math.floor(k / days);
  }
  geo.setAttribute('aIndex', new THREE.InstancedBufferAttribute(index, 1));
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 1));
  const alphaAttr = new THREE.InstancedBufferAttribute(alpha, 1);
  geo.setAttribute('aAlpha', alphaAttr);
  geo.setAttribute('aKind', new THREE.InstancedBufferAttribute(kind, 1));
  const uniforms = {
    uInk: { value: new THREE.Color(INK) },
    uDim: { value: new THREE.Color(DIM) },
    uGround: { value: new THREE.Color(GROUND) },
    uSheet: { value: sheetTex },
    uRows: { value: total },
    uStrip: { value: STRIP },
    uBright: { value: 1 },
    uAtlas0: { value: null as THREE.Texture | null },
    uAtlas1: { value: null as THREE.Texture | null },
    uGrid0: { value: new THREE.Vector3(1, 1, 1) },
    uGrid1: { value: new THREE.Vector3(1, 1, 1) },
    uHas0: { value: 0 },
    uHas1: { value: 0 },
  };
  // The months' images, fetched once the opening frame has its own and
  // switched on as each arrives; until then the panes carry their marks.
  const loader = new THREE.TextureLoader();
  months.slice(0, 2).forEach((m, mi) => {
    if (!m.atlas) return;
    const { image, cols, count } = m.atlas;
    opening
      .then(() => loader.loadAsync(plateUrl(image)))
      .then((tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.anisotropy = 4;
        if (mi === 0) {
          uniforms.uAtlas0.value = tex;
          uniforms.uGrid0.value.set(cols, 1, count);
          uniforms.uHas0.value = 1;
        } else {
          uniforms.uAtlas1.value = tex;
          uniforms.uGrid1.value.set(cols, 1, count);
          uniforms.uHas1.value = 1;
        }
      })
      .catch(() => {});
  });
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: paneVertex,
    fragmentShader: paneFragment,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const panes = new THREE.InstancedMesh(geo, mat, total);
  panes.frustumCulled = false;
  group.add(panes);

  // Each day's scatter, fixed for the load: where it is pushed and how
  // it is tilted, scaled by the month's declared scatter each frame.
  const push = new Float32Array(total * 3);
  const tilt = new Float32Array(total * 2);
  {
    const r = rng(0x09_1d_5e_ed);
    for (let k = 0; k < total; k++) {
      push[k * 3] = r() * 2 - 1;
      push[k * 3 + 1] = r() * 2 - 1;
      push[k * 3 + 2] = r() * 2 - 1;
      tilt[k * 2] = r() * 2 - 1;
      tilt[k * 2 + 1] = r() * 2 - 1;
    }
  }

  // ---- the eye.
  const camera = new THREE.PerspectiveCamera(eye.fov, 1, 0.1, 400);

  // ---- the overlay: the month's name across the top, and the dimension
  // between the first pane and the latest, counting the days.
  const svg = document.getElementById('figure') as SVGSVGElement | null;
  const overlay = svg ? document.createElementNS(NS, 'g') : null;
  const labelEls = months.map(() => {
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('class', 'title');
    t.setAttribute('text-anchor', 'middle');
    t.style.opacity = '0';
    overlay?.appendChild(t);
    return t;
  });
  const dim = document.createElementNS(NS, 'g');
  const dimLine = document.createElementNS(NS, 'line');
  const dimA = document.createElementNS(NS, 'line');
  const dimB = document.createElementNS(NS, 'line');
  const dimText = document.createElementNS(NS, 'text');
  if (overlay && svg) {
    overlay.setAttribute('class', 'memory');
    overlay.style.opacity = '0';
    labelEls.forEach((t, i) => (t.textContent = months[i].label));
    dimLine.setAttribute('class', 'dash');
    dimText.setAttribute('text-anchor', 'middle');
    dim.append(dimLine, dimA, dimB, dimText);
    dim.style.opacity = '0';
    overlay.appendChild(dim);
    svg.appendChild(overlay);
  }

  const state = { bright: 0 };
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const pos = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const p0 = new THREE.Vector3();
  const p1 = new THREE.Vector3();
  const hidden = new THREE.Vector3(0, 0, 1e6);

  function setActive(on: boolean): void {
    if (group.visible === on) return;
    group.visible = on;
    if (overlay && svg) {
      overlay.style.opacity = '0';
      if (!on) svg.style.opacity = '0';
    }
  }

  function update(local: number): void {
    if (!group.visible) return;
    const fadeIn = def.fadeIn ?? 0;
    const fadeOut = def.fadeOut ?? 0;
    const sceneAlpha = Math.min(
      fadeIn > 0 ? clamp01(local / fadeIn) : 1,
      fadeOut > 0 ? clamp01((1 - local) / fadeOut) : 1,
    );

    // Which month is on, and how far through it. Between months both are
    // off and the frame is dark; the labels cross with them.
    let bright = 0;
    let current: { month: Month; mi: number; u: number; on: number } | null = null;
    for (let mi = 0; mi < months.length; mi++) {
      const m = months[mi];
      const on = smooth((local - m.from) / MONTH_EDGE) * (1 - smooth((local - m.to) / MONTH_EDGE));
      labelEls[mi].style.opacity = String(on);
      if (on > bright) bright = on;
      if (on > 0 || (local >= m.from && local <= m.to)) {
        const u = clamp01((local - m.from) / (m.to - m.from));
        if (!current || on > current.on) current = { month: m, mi, u, on };
      }
    }
    state.bright = sceneAlpha * bright;

    // Place every pane: the current month's along the axis, one spacing
    // apart, each pushed and tilted by its scatter; the others hidden.
    const W = window.innerWidth;
    const H = window.innerHeight;
    const dayNow = current ? current.u * days : 0;
    for (let k = 0; k < total; k++) {
      const mi = Math.floor(k / days);
      const i = k % days;
      // Drawn far to near, so the nearer panes blend over the farther.
      const day = days - 1 - i;
      const slot = mi * days + day;
      if (!current || mi !== current.mi) {
        alpha[slot] = 0;
        m4.compose(hidden, q.identity(), one);
        panes.setMatrixAt(slot, m4);
        continue;
      }
      const sc = current.month.scatter;
      const a = smooth((dayNow - day) / DAY_IN);
      alpha[slot] = a;
      pos.set(
        push[slot * 3] * sc.x,
        push[slot * 3 + 1] * sc.y,
        -day * spacing + push[slot * 3 + 2] * sc.z,
      );
      e.set((tilt[slot * 2] * sc.tilt * Math.PI) / 180, (tilt[slot * 2 + 1] * sc.tilt * Math.PI) / 180, 0);
      q.setFromEuler(e);
      m4.compose(pos, q, one);
      panes.setMatrixAt(slot, m4);
    }
    panes.instanceMatrix.needsUpdate = true;
    alphaAttr.needsUpdate = true;

    // The eye draws back over the month.
    const u = current ? current.u : 0;
    camera.position.set(0, eye.y, eye.z + eye.pull * smooth(u));
    camera.lookAt(0, 0.15, -(days * spacing) / 2);
    camera.updateMatrixWorld();
    const aspect = W / Math.max(1, H);
    if (camera.aspect !== aspect) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }

    // The overlay: the month's name, and the dimension from the first
    // pane to the latest, counted in days.
    if (overlay && svg) {
      const inset = Math.min(Math.max(24, W * 0.04), 64);
      labelEls.forEach((t) => {
        t.setAttribute('x', String(W / 2));
        t.setAttribute('y', String(inset + 10));
      });
      const latest = Math.max(0, Math.min(days - 1, Math.floor(dayNow)));
      if (current && latest >= 1) {
        const sc = current.month.scatter;
        // The first pane and the latest, at their own scattered places,
        // projected through the eye to the frame.
        const mi = current.mi;
        const at = (day: number, out: THREE.Vector3) => {
          const slot = mi * days + day;
          out.set(push[slot * 3] * sc.x, push[slot * 3 + 1] * sc.y - pane.height * 0.5, -day * spacing + push[slot * 3 + 2] * sc.z);
          out.project(camera);
          out.x = ((out.x + 1) / 2) * W;
          out.y = ((1 - out.y) / 2) * H;
          return out;
        };
        at(0, p0);
        at(latest, p1);
        const y = Math.max(p0.y, p1.y) + 28;
        dimLine.setAttribute('x1', String(p0.x));
        dimLine.setAttribute('y1', String(y));
        dimLine.setAttribute('x2', String(p1.x));
        dimLine.setAttribute('y2', String(y));
        for (const [l, p] of [
          [dimA, p0],
          [dimB, p1],
        ] as const) {
          l.setAttribute('x1', String(p.x));
          l.setAttribute('y1', String(y - 6));
          l.setAttribute('x2', String(p.x));
          l.setAttribute('y2', String(y + 6));
        }
        dimText.setAttribute('x', String((p0.x + p1.x) / 2));
        dimText.setAttribute('y', String(y + 18));
        const count = `${latest + 1} ${mc.dimension.label}`;
        if (dimText.textContent !== count) dimText.textContent = count;
        dim.style.opacity = String(smooth((latest - 1) / 2));
      } else {
        dim.style.opacity = '0';
      }
      overlay.style.opacity = String(sceneAlpha * (reducedMotion ? 1 : 1));
      svg.style.opacity = '1';
    }
  }

  const size = new THREE.Vector2();
  function render(renderer: THREE.WebGLRenderer): boolean {
    if (!group.visible) return false;
    renderer.getSize(size);
    uniforms.uBright.value = state.bright;
    renderer.setClearColor(GROUND, 1);
    renderer.setViewport(0, 0, size.x, size.y);
    renderer.render(world, camera);
    return true;
  }

  return { setActive, update, render };
}
