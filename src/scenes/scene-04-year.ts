/**
 * scene-04-year — the park → one year.
 *
 * The first of the three moments, and the pipeline proof: parallax plates,
 * a camera that rises, a season that turns continuously, and the fixed
 * clock left running against all of it.
 *
 * Nothing here decides *when*. Every distance, colour, season keyframe and
 * day count is declared in the manifest; this file only knows how to build
 * what the manifest describes and how to read it at a given moment.
 *
 * The place is Lake Harriet, Minneapolis, from its east bank. The plates
 * are procedural stand-ins for the generated imagery to come — the shapes
 * are placeholders, the choreography is not.
 */

import * as THREE from 'three';
import { mixHex, seasonAt, seasonWeights, type Plate, type Scene, type Season } from './manifest';
import { sunPosition, type SunPosition } from './solar';
import { createFigure, type FigureOverlay } from './scene-04-figure';

/** The sun's record is drawn this far in front of the sky plate; the sun
 *  itself a little behind that, so the cloud deck between them can pass
 *  in front of the sun and never in front of the record. */
const TRAIL_AHEAD = 18;
const SUN_AHEAD = 8;
/** The record samples the sun once a day. */
const DAYS = 365;
/** Half the width of the ribbon the record is drawn on, world units. */
const TRAIL_HALF = 3.5;
/** The sun's glow is drawn on a quad this wide. */
const GLOW = 110;
/** The eye the sky is projected from, if the manifest declares no camera:
 *  the bench, where the piece opens. */
const DEFAULT_EYE = { y: 1.6, z: 16 };
/** A long exposure browns: the record is the sun's colour with its blue
 *  taken out. */
const AMBER = new THREE.Color(1.0, 0.8, 0.55);

const D2R = Math.PI / 180;

/** The HUD's ink: what every instrument draws its lines in. */
const INK = 0xe8e6e1;
/** The one accent, reserved for now: here, the radar's sweep. */
const NOW = 0xd9a95b;
/** How far back an echo's trail reaches, in seconds of falling. */
const ECHO_TRAIL_S = 0.8;
/** The dot drawn at an echo's head, in CSS pixels. */
const ECHO_DOT_PX = 3.2;
/** Where the ring of seasons sits on the screen, in clip space, and its
 *  radius as a fraction of the frame's half-height. */
const RING_CENTRE = { x: 0, y: -0.58 };
const RING_R = 0.2;

/**
 * The thermal reading, shared by every surface that takes it: a
 * three-stop ramp from cold to hot, and hairline isotherms every eighth
 * of the range. `t` is the temperature as a fraction of the ramp.
 */
const THERMAL_GLSL = `
  uniform float uThermal, uThermalTime;
  uniform vec3 uRamp0, uRamp1, uRamp2, uRamp3, uThermalInk;
  vec3 thermalRamp(float t) {
    t = clamp(t, 0.0, 1.0) * 3.0;
    if (t < 1.0) return mix(uRamp0, uRamp1, t);
    if (t < 2.0) return mix(uRamp1, uRamp2, t - 1.0);
    return mix(uRamp2, uRamp3, t - 2.0);
  }
  // Isotherms every eighth of the range, drawn on the smooth field so
  // they run as contours across a surface, not along every blade.
  float isotherm(float t) {
    float k = t * 8.0;
    float d = min(fract(k), 1.0 - fract(k));
    float w = max(fwidth(k), 1e-4);
    return 1.0 - smoothstep(0.5 * w, 1.5 * w, d);
  }
  // The reading drifts a little as the afternoon moves on.
  float thermalDrift(vec2 sc) {
    return sin(sc.x * 3.1 + uThermalTime * 0.17) * 0.03 + sin(sc.y * 2.3 - uThermalTime * 0.11) * 0.03;
  }
`;
/** Local progress an instrument spends easing on, and off. */
const INSTRUMENT_EDGE = 0.02;

const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1);

export interface YearScene {
  /** The scene builds its world once and shows it only while it runs. */
  setActive(on: boolean): void;
  /**
   * Upload the imagery and compile the shaders ahead of the scene's first
   * frame, so the work lands in a scene where nothing happens rather than
   * mid-scroll as the lake appears. Returns true once done; call it each
   * frame until then.
   */
  warm(renderer: THREE.WebGLRenderer, camera: THREE.Camera): boolean;
  /** local: 0–1 through the scene. dt: seconds since the last frame.
   *  camera: where the world is seen from this frame, already placed —
   *  the figure is drawn in screen space and projects through it. */
  update(local: number, dt: number, camera: THREE.Camera): void;
}

// ------------------------------------------------------------- ingredients

/** Deterministic noise, so the treeline is the same treeline every load. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTexture(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  if (ctx) draw(ctx);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface Tree {
  x: number;
  /** Canvas px, measured up from the shoreline. */
  trunkH: number;
  treeH: number;
  halfW: number;
  lean: number;
}

/**
 * One stand of elms, described once. The leafy and bare textures draw the
 * *same* trees so that cross-fading between them reads as a canopy
 * emptying, not as one forest replacing another.
 */
function makeTrees(w: number, h: number, count: number): Tree[] {
  const r = rng(0x4a17_08_1d);
  const slot = w / count;
  const trees: Tree[] = [];
  for (let i = 0; i < count; i++) {
    trees.push({
      x: (i + 0.5) * slot + (r() - 0.5) * slot * 1.1,
      trunkH: h * (0.26 + r() * 0.12),
      treeH: h * (0.68 + r() * 0.26),
      halfW: slot * (0.52 + r() * 0.36),
      lean: (r() - 0.5) * slot * 0.3,
    });
  }
  return trees;
}

function drawTreeline(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  trees: Tree[],
  leafy: boolean,
): void {
  const r = rng(leafy ? 0xe1_f0_0d : 0xba_2e_11);
  const base = h;

  // The shoreline the stand grows out of.
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.fillRect(0, h * 0.965, w, h * 0.035);

  for (const t of trees) {
    const top = base - t.trunkH;
    const cx = t.x + t.lean;
    const crownH = t.treeH - t.trunkH;
    // The crown overlaps the trunk top. Centre it any higher and a small
    // crown lifts clear of its own tree and reads as a balloon.
    const cy = top - crownH * 0.45;

    ctx.beginPath();
    ctx.moveTo(t.x - t.halfW * 0.11, base);
    ctx.lineTo(t.x + t.halfW * 0.11, base);
    ctx.lineTo(cx + t.halfW * 0.035, top);
    ctx.lineTo(cx - t.halfW * 0.035, top);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fill();

    if (leafy) {
      // The crown as a mass of overlapping leaf clumps, gathered toward
      // the top — the elm's vase, without modelling a single branch.
      // Clump count follows the crown's shape. A tall narrow crown filled
      // with a fixed number of clumps comes out as detached balls.
      const rx = t.halfW * 0.82;
      const ry = crownH * 0.5;
      const blobs = Math.round(14 + 18 * (ry / rx));
      for (let b = 0; b < blobs; b++) {
        const a = r() * Math.PI * 2;
        const u = Math.sqrt(r());
        const bx = cx + Math.cos(a) * u * rx;
        const by = cy + Math.sin(a) * u * ry;
        ctx.beginPath();
        ctx.arc(bx, by, t.halfW * (0.34 + r() * 0.16), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${0.8 + r() * 0.2})`;
        ctx.fill();
      }
    } else {
      // The same crown envelope, described in limbs instead of leaves.
      ctx.lineCap = 'round';
      const limbs = 4 + Math.floor(r() * 3);
      for (let l = 0; l < limbs; l++) {
        const a = -Math.PI / 2 + (r() - 0.5) * 1.9;
        const ex = cx + Math.cos(a) * t.halfW * (0.6 + r() * 0.45);
        const ey = top + Math.sin(a) * crownH * (0.55 + r() * 0.5);
        ctx.beginPath();
        ctx.moveTo(cx, top + t.trunkH * 0.05);
        ctx.quadraticCurveTo(cx + (ex - cx) * 0.3, top - crownH * 0.15, ex, ey);
        ctx.lineWidth = Math.max(1, t.halfW * 0.075);
        ctx.strokeStyle = `rgba(255,255,255,${0.55 + r() * 0.35})`;
        ctx.stroke();

        for (let k = 0; k < 4; k++) {
          const f = 0.5 + k * 0.14;
          const tx = cx + (ex - cx) * f;
          const ty = top + (ey - top) * f;
          const ta = a + (r() - 0.5) * 1.4;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(tx + Math.cos(ta) * t.halfW * 0.3, ty + Math.sin(ta) * crownH * 0.28);
          ctx.lineWidth = Math.max(1, t.halfW * 0.03);
          ctx.strokeStyle = `rgba(255,255,255,${0.35 + r() * 0.3})`;
          ctx.stroke();
        }
      }
    }
  }
}

/** A bank: solid land with an uneven top edge, optionally grassed. */
function drawBank(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  lipFraction: number,
  grass: boolean,
): void {
  const r = rng(grass ? 0x9a_11_c4 : 0x33_5b_71);
  const lip = h * lipFraction;

  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, lip);
  for (let x = 0; x <= w; x += w / 90) {
    const undulate = Math.sin(x * 0.006) * lip * 0.18 + Math.sin(x * 0.021) * lip * 0.1;
    ctx.lineTo(x, lip - undulate - r() * lip * 0.06);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.fill();

  if (!grass) return;

  // Reeds and grass heads breaking the near lip.
  ctx.lineCap = 'round';
  const blades = Math.round(w * 0.5);
  for (let i = 0; i < blades; i++) {
    const x = r() * w;
    const len = lip * (0.25 + r() * 0.85);
    const bend = (r() - 0.5) * len * 0.55;
    ctx.beginPath();
    ctx.moveTo(x, lip * 1.05);
    ctx.quadraticCurveTo(x + bend * 0.4, lip - len * 0.5, x + bend, lip - len);
    ctx.lineWidth = 1 + r() * 1.6;
    ctx.strokeStyle = `rgba(255,255,255,${0.45 + r() * 0.5})`;
    ctx.stroke();
  }
}

// ----------------------------------------------------------------- build

export function createYearScene(world: THREE.Scene, def: Scene, reducedMotion: boolean): YearScene {
  const seasons: Season[] | undefined = def.seasons;
  const plates = def.plates;
  const lake = def.water;
  const airDef = def.air;
  const sunDef = def.sun;
  const cloudDef = def.clouds;

  const group = new THREE.Group();
  group.visible = false;
  world.add(group);

  // An inert scene rather than a crash if the manifest is incomplete.
  if (!seasons || !plates || !lake || !airDef || !sunDef || !cloudDef) {
    return { setActive: () => {}, update: () => {}, warm: () => true };
  }

  const plate = (id: string) => plates.find((p) => p.id === id);
  const skyDef = plate('sky');
  const canopyDef = plate('canopy');
  const farBankDef = plate('far-bank');
  const nearBankDef = plate('near-bank');
  if (!skyDef || !canopyDef || !farBankDef || !nearBankDef) {
    return { setActive: () => {}, update: () => {}, warm: () => true };
  }

  // ---- sky: a gradient plane, with the horizon where the manifest puts it.
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      uZenith: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uHorizonAt: { value: -skyDef.baseY / skyDef.height },
      uRamp: { value: def.skyRamp ?? 0.3 },
      uOpacity: { value: 1 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec2 vUv;
      uniform vec3 uZenith, uHorizon;
      uniform float uHorizonAt, uRamp, uOpacity;
      void main() {
        float t = smoothstep(uHorizonAt, uHorizonAt + uRamp, vUv.y);
        gl_FragColor = vec4(mix(uHorizon, uZenith, t), uOpacity);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    fog: false,
  });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(skyDef.width, skyDef.height), skyMat);
  sky.position.set(0, skyDef.baseY + skyDef.height / 2, skyDef.z);
  sky.renderOrder = -10;
  sky.name = 'sky';
  group.add(sky);

  // ---- the sun, at 4:17 every day for a year. The manifest says where
  // and when; the solar arithmetic says where in the sky that puts it;
  // the lens brings the figure into the band of sky the frame allows.
  // Everything is projected from one fixed eye — the bench — onto planes
  // just ahead of the sky plate, so the record is painted on the sky and
  // stays put while the camera rises.
  const hold = sunDef.hold;
  const eye = new THREE.Vector3(
    0,
    def.camera?.from.y ?? DEFAULT_EYE.y,
    def.camera?.from.z ?? DEFAULT_EYE.z,
  );
  const trailZ = skyDef.z + TRAIL_AHEAD;
  const sunZ = skyDef.z + SUN_AHEAD;

  // The apparent direction of the sun on each day of the record.
  const [openY, openM, openD] = sunDef.opens.split('-').map(Number);
  const [clockH, clockM] = sunDef.clock.split(':').map(Number);
  const opensMs = Date.UTC(openY, openM - 1, openD, clockH - sunDef.utcOffset, clockM);
  const firstSun = sunPosition(opensMs, sunDef.lat, sunDef.lon);
  const lens = sunDef.lens;
  /** A real altitude and azimuth, seen through the lens, as a direction.
   *  The camera faces west: −z is west and +x is north, so the afternoon
   *  sun, in the south-west, stands ahead and to the left. */
  const throughLens = (altitude: number, azimuth: number, out: THREE.Vector3): THREE.Vector3 => {
    const alt = (lens.altitude + lens.scale * (altitude - firstSun.altitude)) * D2R;
    const az = (270 - lens.west + lens.scale * (azimuth - firstSun.azimuth)) * D2R;
    return out.set(Math.cos(alt) * Math.cos(az), Math.sin(alt), Math.cos(alt) * Math.sin(az));
  };
  const real: SunPosition[] = [];
  const apparent: THREE.Vector3[] = [];
  for (let i = 0; i <= DAYS; i++) {
    const r = sunPosition(opensMs + i * 86_400_000, sunDef.lat, sunDef.lon);
    real.push(r);
    apparent.push(throughLens(r.altitude, r.azimuth, new THREE.Vector3()));
  }

  /** Where a direction from the eye meets the plane at world z. */
  const onPlane = (dir: THREE.Vector3, z: number, out: THREE.Vector2): THREE.Vector2 => {
    const t = (z - eye.z) / dir.z;
    return out.set(eye.x + t * dir.x, eye.y + t * dir.y);
  };

  // The record: a ribbon along the figure, revealed as far as today. Each
  // day's vertex carries its season's sun colour, browned.
  const trailPts = apparent.map((d) => onPlane(d, trailZ, new THREE.Vector2()));
  const nPts = trailPts.length;
  const tPos = new Float32Array(nPts * 2 * 3);
  const tSide = new Float32Array(nPts * 2);
  const tT = new Float32Array(nPts * 2);
  const tCol = new Float32Array(nPts * 2 * 3);
  const tIdx: number[] = [];
  const tangent = new THREE.Vector2();
  const dayCol = new THREE.Color();
  for (let i = 0; i < nPts; i++) {
    tangent.subVectors(trailPts[Math.min(i + 1, nPts - 1)], trailPts[Math.max(i - 1, 0)]).normalize();
    const nx = -tangent.y;
    const ny = tangent.x;
    const t = i / (nPts - 1);
    dayCol.setHex(seasonAt(seasons, clamp01(hold + t * (1 - hold))).sun).multiply(AMBER);
    for (let k = 0; k < 2; k++) {
      const side = k === 0 ? -1 : 1;
      const v = i * 2 + k;
      tPos[v * 3] = trailPts[i].x + nx * side * TRAIL_HALF;
      tPos[v * 3 + 1] = trailPts[i].y + ny * side * TRAIL_HALF;
      tPos[v * 3 + 2] = 0;
      tSide[v] = side;
      tT[v] = t;
      tCol[v * 3] = dayCol.r;
      tCol[v * 3 + 1] = dayCol.g;
      tCol[v * 3 + 2] = dayCol.b;
    }
    if (i < nPts - 1) {
      const a = i * 2;
      tIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
  trailGeo.setAttribute('aSide', new THREE.BufferAttribute(tSide, 1));
  trailGeo.setAttribute('aT', new THREE.BufferAttribute(tT, 1));
  trailGeo.setAttribute('aColor', new THREE.BufferAttribute(tCol, 3));
  trailGeo.setIndex(tIdx);
  const trailMat = new THREE.ShaderMaterial({
    uniforms: {
      uNow: { value: 0 },
      uOpacity: { value: 1 },
      uInk: { value: new THREE.Color(INK) },
    },
    vertexShader: `
      attribute float aSide;
      attribute float aT;
      attribute vec3 aColor;
      varying float vSide, vT;
      varying vec3 vColor;
      void main() {
        vSide = aSide;
        vT = aT;
        vColor = aColor;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform float uNow, uOpacity;
      varying float vSide, vT;
      varying vec3 vColor;
      uniform vec3 uInk;
      void main() {
        // A one-pixel stroke of ink down the ribbon's centre: the record
        // as a drawn line, the way a survey plots it.
        float w = max(fwidth(vSide), 1e-4);
        float line = 1.0 - smoothstep(0.5 * w, 1.5 * w, abs(vSide));
        // Exposed as far as today. Scrolling back un-exposes.
        float shown = smoothstep(uNow + 0.002, uNow - 0.002, vT);
        gl_FragColor = vec4(uInk, line * 0.95 * shown * uOpacity);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  const trail = new THREE.Mesh(trailGeo, trailMat);
  trail.position.set(0, 0, trailZ);
  trail.renderOrder = -9;
  trail.name = 'analemma';
  group.add(trail);

  // ---- the survey: the record annotated and measured, in the DOM over
  // the world. It reads the same record and the same lens, so its lines
  // land on the sun they describe.
  const figureEl = document.getElementById('figure');
  const lensDir = new THREE.Vector3();
  const figure: FigureOverlay | null =
    def.figure && figureEl instanceof SVGSVGElement
      ? createFigure(figureEl, def.figure, {
          sun: sunDef,
          opensMs,
          real,
          trail: trailPts,
          trailZ,
          onTrail: (altitude, azimuth, out) =>
            onPlane(throughLens(altitude, azimuth, lensDir), trailZ, out),
          reducedMotion,
        })
      : null;

  // The sun itself: a glow on its own quad, moved to today's position.
  const sunMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color() },
      uOpacity: { value: 1 },
    },
    vertexShader: `
      varying vec2 vLocal;
      void main() {
        vLocal = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vLocal;
      void main() {
        float d2 = dot(vLocal, vLocal);
        // A disc that burns out to white, and the glare around it.
        float core = exp(-d2 / 9.0);
        float glow = exp(-d2 / 45.0) * 0.9 + exp(-d2 / 520.0) * 0.28;
        // The halo reaches nothing well inside the quad's edge.
        glow *= smoothstep(${(GLOW / 2).toFixed(1)}, ${(GLOW / 3.2).toFixed(1)}, sqrt(d2));
        vec3 col = mix(uColor, vec3(1.0), core * 0.8);
        gl_FragColor = vec4(col, min(core + glow, 1.0) * uOpacity);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    fog: false,
  });
  const sun = new THREE.Mesh(new THREE.PlaneGeometry(GLOW, GLOW), sunMat);
  sun.renderOrder = -9.6;
  sun.name = 'sun';
  group.add(sun);

  // ---- the clouds: a deck of noise between the sun and its record. Read
  // as a flat layer seen from below, so it is coarse overhead and packs
  // toward the horizon. Cover and colour are the season's; the field
  // churns with scroll, because scroll is time, and drifts a little on
  // its own. Cloud near the sun is lit through.
  const cloudCentreY = cloudDef.baseY + cloudDef.height / 2;
  const cloudZ = cloudDef.z;
  const cloudChurn = cloudDef.churn;
  const cloudDrift = cloudDef.drift;
  const cloudMat = new THREE.ShaderMaterial({
    uniforms: {
      uLit: { value: new THREE.Color() },
      uShade: { value: new THREE.Color() },
      uHaze: { value: new THREE.Color() },
      uSun: { value: new THREE.Color() },
      uSunPos: { value: new THREE.Vector2() },
      uCover: { value: 0 },
      uTime: { value: 0 },
      uWind: { value: cloudDef.wind },
      uScale: { value: cloudDef.scale },
      uAspect: { value: cloudDef.width / cloudDef.height },
      uOpacity: { value: 1 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec2 vLocal;
      void main() {
        vUv = uv;
        vLocal = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uLit, uShade, uHaze, uSun;
      uniform vec2 uSunPos;
      uniform float uCover, uTime, uWind, uScale, uAspect, uOpacity;
      varying vec2 vUv;
      varying vec2 vLocal;

      float hash(vec3 p) {
        p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      float noise(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x),
              mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
          mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
              mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
          f.z);
      }
      float fbm(vec3 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 5; i++) {
          v += a * noise(p);
          p = p * 2.03 + vec3(1.7, 9.2, 0.0);
          a *= 0.5;
        }
        return v / 0.96875;
      }

      void main() {
        float e = vUv.y;
        // The deck from below: overhead it is coarse; toward the horizon
        // it packs together, the way a flat layer foreshortens.
        float depth = 1.0 / (e * 0.75 + 0.25);
        vec2 c = vec2((vUv.x - 0.5) * uAspect, 1.0) * depth * uScale;
        c.x += uTime * uWind;
        float n = fbm(vec3(c, uTime));

        // Cover sets the threshold the noise must clear to be cloud.
        float th = 0.66 - uCover * 0.33;
        float cloud = smoothstep(th, th + 0.16, n);
        float thick = smoothstep(th + 0.06, th + 0.3, n);

        // Lit from the sun's side; thin cloud near the sun is bright with it.
        vec2 dv = vLocal - uSunPos;
        float near = exp(-dot(dv, dv) / 1400.0);
        vec3 col = mix(uLit, uShade, thick * 0.9);
        col += uSun * near * (1.0 - thick * 0.7) * 0.55;
        // Toward the horizon the deck sinks into the haze.
        col = mix(col, uHaze, (1.0 - smoothstep(0.0, 0.4, e)) * 0.75);

        float a = cloud * (0.45 + 0.55 * thick) * uOpacity;
        gl_FragColor = vec4(col, a);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    fog: false,
  });
  const clouds = new THREE.Mesh(new THREE.PlaneGeometry(cloudDef.width, cloudDef.height), cloudMat);
  clouds.position.set(0, cloudCentreY, cloudDef.z);
  clouds.renderOrder = -9.3;
  clouds.name = 'clouds';
  group.add(clouds);

  // Scratch for the frame.
  const sunDir = new THREE.Vector3();
  const sunAt = new THREE.Vector2();

  // ---- the elms: one stand, drawn twice, cross-faded by leaf density.
  // Texture height follows the plate's aspect, so a circle drawn on the
  // canvas is a circle in the world however the manifest resizes the plate.
  const texH = (p: { width: number; height: number }, w: number) =>
    Math.max(16, Math.round((w * p.height) / p.width));
  const canopyW = 2400;
  const canopyH = texH(canopyDef, canopyW);
  const trees = makeTrees(canopyW, canopyH, 28);
  const leafyTex = canvasTexture(canopyW, canopyH, (c) => drawTreeline(c, canopyW, canopyH, trees, true));
  const bareTex = canvasTexture(canopyW, canopyH, (c) => drawTreeline(c, canopyW, canopyH, trees, false));

  const canopyGeo = new THREE.PlaneGeometry(canopyDef.width, canopyDef.height);
  const leafyMat = new THREE.MeshBasicMaterial({ map: leafyTex, transparent: true, depthWrite: false });
  const bareMat = new THREE.MeshBasicMaterial({ map: bareTex, transparent: true, depthWrite: false });
  const leafy = new THREE.Mesh(canopyGeo, leafyMat);
  const bare = new THREE.Mesh(canopyGeo, bareMat);
  const canopyY = canopyDef.baseY + canopyDef.height / 2;
  leafy.position.set(0, canopyY, canopyDef.z);
  bare.position.set(0, canopyY, canopyDef.z - 0.4);
  // Everything in this scene is transparent, so nothing writes depth and
  // distance sorting cannot be trusted. The stack is declared back to front.
  bare.renderOrder = -8;
  leafy.renderOrder = -7;
  bare.name = 'canopy-bare';
  leafy.name = 'canopy-leafy';
  group.add(bare, leafy);

  // ---- the banks.
  const farW = 2048;
  const farH = texH(farBankDef, farW);
  const nearW = 1800;
  const nearH = texH(nearBankDef, nearW);
  const farTex = canvasTexture(farW, farH, (c) =>
    drawBank(c, farW, farH, farBankDef.lip ?? 0.3, false),
  );
  const nearTex = canvasTexture(nearW, nearH, (c) =>
    drawBank(c, nearW, nearH, nearBankDef.lip ?? 0.3, true),
  );
  const farMat = new THREE.MeshBasicMaterial({ map: farTex, transparent: true, depthWrite: false });
  const nearMat = new THREE.MeshBasicMaterial({ map: nearTex, transparent: true, depthWrite: false });
  const farBank = new THREE.Mesh(
    new THREE.PlaneGeometry(farBankDef.width, farBankDef.height),
    farMat,
  );
  farBank.position.set(0, farBankDef.baseY + farBankDef.height / 2, farBankDef.z);
  const nearBank = new THREE.Mesh(
    new THREE.PlaneGeometry(nearBankDef.width, nearBankDef.height),
    nearMat,
  );
  nearBank.position.set(0, nearBankDef.baseY + nearBankDef.height / 2, nearBankDef.z);
  farBank.renderOrder = -6;
  nearBank.renderOrder = -3;
  farBank.name = 'far-bank';
  nearBank.name = 'near-bank';
  group.add(farBank, nearBank);

  // ---- real imagery, where the manifest has it. A plate's images load
  // behind the first frame; the procedural stand-in holds until every one
  // of them is in, then hands over. One layer per image, stacked in the
  // order the manifest declares them.
  // ---- the thermal reading's uniforms, shared by the banks and the lake
  // so one update sets them all. The ramp is the instrument's own.
  const thermalDef = def.instruments?.find((i) => i.kind === 'thermal');
  const thermalRamp = thermalDef?.ramp ?? [0x24425f, 0x35566a, 0xe8e6e1];
  const thermalRange = thermalDef?.range ?? [-10, 36];
  const thermalU = {
    uThermal: { value: 0 },
    uThermalTime: { value: 0 },
    uThermalInk: { value: new THREE.Color(INK) },
    uRamp0: { value: new THREE.Color(thermalRamp[0]) },
    uRamp1: { value: new THREE.Color(thermalRamp[1] ?? thermalRamp[0]) },
    uRamp2: { value: new THREE.Color(thermalRamp[2] ?? thermalRamp[1] ?? thermalRamp[0]) },
    uRamp3: { value: new THREE.Color(thermalRamp[3] ?? thermalRamp[2] ?? thermalRamp[0]) },
    uTempGround: { value: 0 },
    uTempWater: { value: 0 },
  };
  const thermalNorm = (celsius: number) =>
    (celsius - thermalRange[0]) / Math.max(1e-3, thermalRange[1] - thermalRange[0]);

  /**
   * The thermal pass on a plate: the image's own luminance stands in for
   * how much sun each blade and stone has taken, warming the season's
   * base temperature, and the result is read through the ramp with its
   * isotherms. Installed on the material's own shader, so the plate's
   * alpha and cross-fade are untouched.
   */
  const thermalPlate = (mat: THREE.MeshBasicMaterial) => {
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, {
        uThermal: thermalU.uThermal,
        uThermalTime: thermalU.uThermalTime,
        uThermalInk: thermalU.uThermalInk,
        uRamp0: thermalU.uRamp0,
        uRamp1: thermalU.uRamp1,
        uRamp2: thermalU.uRamp2,
        uRamp3: thermalU.uRamp3,
        uTempBase: thermalU.uTempGround,
      });
      shader.fragmentShader = shader.fragmentShader
        .replace('void main() {', `${THERMAL_GLSL}
  uniform float uTempBase;
  void main() {`)
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
          #ifdef USE_MAP
          if (uThermal > 0.0) {
            float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
            float field = uTempBase + thermalDrift(gl_FragCoord.xy * 0.004);
            float t = field + (lum - 0.45) * 0.35;
            // The blades keep their light: the ramp is shaded by the
            // image's own luminance, so the bank stays a bank.
            vec3 heat = thermalRamp(t) * (0.55 + 0.9 * lum);
            heat = mix(heat, uThermalInk, isotherm(field) * 0.25);
            diffuseColor.rgb = mix(diffuseColor.rgb, heat, uThermal * 0.92);
          }
          #endif`,
        );
    };
  };

  interface ImageLayer {
    key: string;
    mat: THREE.MeshBasicMaterial;
    mesh: THREE.Mesh;
  }
  interface ImagePlate {
    layers: ImageLayer[];
    ready: boolean;
  }
  function imagePlate(
    p: Plate,
    geo: THREE.PlaneGeometry,
    y: number,
    renderOrder: number,
    standIns: THREE.Object3D[],
    thermal = false,
  ): ImagePlate | null {
    if (!p.images) return null;
    const loader = new THREE.TextureLoader();
    const layers: ImageLayer[] = [];
    const plate: ImagePlate = { layers, ready: false };
    Object.keys(p.images).forEach((key, i) => {
      const mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0 });
      if (thermal) thermalPlate(mat);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, y, p.z + i * 0.05);
      mesh.renderOrder = renderOrder + i * 0.01;
      mesh.visible = false;
      mesh.name = `${p.id}:${key}`;
      group.add(mesh);
      layers.push({ key, mat, mesh });
    });
    Promise.all(
      layers.map((l) =>
        loader.loadAsync(`${import.meta.env.BASE_URL}${p.images![l.key]}`).then((tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          if (p.imageRepeat) {
            tex.wrapS = THREE.MirroredRepeatWrapping;
            tex.repeat.x = p.imageRepeat;
            // Half a tile over, so no mirror seam sits on the centre line
            // where the eye would read the symmetry.
            tex.offset.x = 0.5;
          }
          l.mat.map = tex;
          l.mat.needsUpdate = true;
        }),
      ),
    )
      .then(() => {
        plate.ready = true;
        for (const o of standIns) o.visible = false;
        for (const l of layers) l.mesh.visible = true;
      })
      .catch((err) => {
        console.warn(`[scene-04] ${p.id}: imagery failed to load, stand-in stays`, err);
      });
    return plate;
  }

  const canopyImg = imagePlate(canopyDef, canopyGeo, canopyY, -7, [leafy, bare]);
  const nearImg = imagePlate(
    nearBankDef,
    nearBank.geometry as THREE.PlaneGeometry,
    nearBank.position.y,
    -3,
    [nearBank],
    true,
  );
  const farImg = imagePlate(
    farBankDef,
    farBank.geometry as THREE.PlaneGeometry,
    farBank.position.y,
    -6,
    [farBank],
    true,
  );

  // ---- the lake: haze toward the far shore, and the sun's path on it.
  const waterFarZ = lake.z - lake.depth / 2;
  const waterMat = new THREE.ShaderMaterial({
    uniforms: {
      uWater: { value: new THREE.Color() },
      uHaze: { value: new THREE.Color() },
      uSun: { value: new THREE.Color() },
      uSunX: { value: 0 },
      uSunElev: { value: 0 },
      uFarZ: { value: waterFarZ },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uInk: { value: new THREE.Color(INK) },
      uFlow: { value: 0 },
      uFlowDir: { value: new THREE.Vector2(1, 0) },
      uFlowSpeed: { value: 0 },
      uThermal: thermalU.uThermal,
      uThermalTime: thermalU.uThermalTime,
      uThermalInk: thermalU.uThermalInk,
      uRamp0: thermalU.uRamp0,
      uRamp1: thermalU.uRamp1,
      uRamp2: thermalU.uRamp2,
      uRamp3: thermalU.uRamp3,
      uTempWater: thermalU.uTempWater,
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      varying vec3 vWorld;
      uniform vec3 uWater, uHaze, uSun, uInk;
      uniform float uSunX, uSunElev, uFarZ, uTime, uOpacity, uFlow, uFlowSpeed, uTempWater;
      uniform vec2 uFlowDir;
      ${THERMAL_GLSL}
      void main() {
        // Distance haze: the lake dissolves into the air at the far shore.
        float far = 1.0 - smoothstep(uFarZ, uFarZ + 46.0, vWorld.z);
        vec3 col = mix(uWater, uHaze, far * 0.88);

        // The sun's path: broken glitter, gathered toward the far shore.
        // Near water is steeply viewed and stays dark; that contrast is
        // most of what makes it read as water at all.
        float d = (vWorld.x - uSunX) / 13.0;
        float band = exp(-d * d);
        float a = sin(vWorld.z * 3.1 + uTime * 1.1 + sin(vWorld.x * 1.7) * 3.0);
        float b = sin(vWorld.z * 8.7 - uTime * 1.9 + cos(vWorld.x * 0.9) * 2.0);
        float sparkle = max(a * b, 0.0);
        sparkle = sparkle * sparkle * sparkle;
        float glint = band * sparkle * far * smoothstep(0.0, 0.35, uSunElev);
        col += uSun * glint * 0.9;

        // The thermal reading of the lake: the season's water temperature,
        // a little warmer where the sun's path lies, drifting slowly.
        if (uThermal > 0.0) {
          float tw = uTempWater + band * 0.05 + thermalDrift(vWorld.xz * 0.05);
          vec3 heat = mix(thermalRamp(tw), uThermalInk, isotherm(tw) * 0.25);
          col = mix(col, mix(heat, uHaze, far * 0.4), uThermal * 0.85);
        }

        // The flow field: the wind read on the water. Streamlines run
        // with the wind and bend with the ripples; along each, a dash
        // brightens toward its head and travels at the wind's speed, so
        // the field reads as direction and not as texture. Lines hold
        // one pixel wide at any distance, and gather under the sun.
        if (uFlow > 0.0) {
          vec2 p = vWorld.xz;
          vec2 nrm = vec2(-uFlowDir.y, uFlowDir.x);
          float alongF = dot(p, uFlowDir);
          float across = dot(p, nrm)
            + sin(alongF * 0.31 + uTime * 0.35) * 1.4
            + sin(alongF * 0.09 - uTime * 0.12) * 3.0;
          float lane = across / 4.5;
          float toLine = abs(fract(lane) - 0.5) * 4.5;
          float w = fwidth(across);
          float line = 1.0 - smoothstep(0.5 * w, 1.6 * w, toLine);
          float head = fract(alongF * 0.16 - uTime * uFlowSpeed * 0.05);
          float dash = head * head * head;
          float flow = line * dash * (0.4 + 0.6 * band) * mix(1.0, 0.2, far);
          col = mix(col, uInk, flow * uFlow * 0.55);
        }

        gl_FragColor = vec4(col, uOpacity);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    fog: false,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(lake.width, lake.depth), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0, lake.z);
  water.renderOrder = -5;
  water.name = 'water';
  group.add(water);

  // ---- the air: pollen in August, leaves in October, snow in January.
  const airPos = new Float32Array(airDef.count * 3);
  const airSpeed = new Float32Array(airDef.count);
  const airPhase = new Float32Array(airDef.count);
  const ar = rng(0x5e_ed_04);
  for (let i = 0; i < airDef.count; i++) {
    airPos[i * 3 + 0] = (ar() - 0.5) * airDef.spread;
    airPos[i * 3 + 1] = ar() * airDef.height;
    airPos[i * 3 + 2] = (ar() - 0.5) * airDef.depth + airDef.z;
    airSpeed[i] = 0.35 + ar() * 0.9;
    airPhase[i] = ar() * Math.PI * 2;
  }
  const airGeo = new THREE.BufferGeometry();
  airGeo.setAttribute('position', new THREE.BufferAttribute(airPos, 3));
  const motePoint = canvasTexture(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
  const airMat = new THREE.PointsMaterial({
    map: motePoint,
    size: 0.09,
    transparent: true,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const air = new THREE.Points(airGeo, airMat);
  air.renderOrder = -4;
  air.name = 'air';
  group.add(air);

  // ---- the radar: the air read as echoes into a scope. The frame is
  // read into the scope's circle — its longer half-edge is the scope's
  // range — and each mote is a short line along where it has just been,
  // lit as the sweep passes its bearing and fading after. Drawn
  // additively, over everything. The scope's centre and radius are in
  // clip space, set each frame from the manifest's declaration.
  const radarDef = def.instruments?.find((i) => i.kind === 'radar');
  const scopeCentre = new THREE.Vector2(0, 0);
  const scopeRadius = new THREE.Vector2(1, 1);
  const echoPos = new Float32Array(airDef.count * 2 * 3);
  const echoTail = new Float32Array(airDef.count * 2);
  for (let i = 0; i < airDef.count; i++) echoTail[i * 2 + 1] = 1;
  const echoGeo = new THREE.BufferGeometry();
  echoGeo.setAttribute('position', new THREE.BufferAttribute(echoPos, 3));
  echoGeo.setAttribute('aTail', new THREE.BufferAttribute(echoTail, 1));
  // An echo is lit full as the sweep passes and fades over the half turn
  // behind it, never quite to nothing, so the scope is never empty; the
  // trail is a hairline behind it and the head a dot, on the same vertices.
  const echoUniforms = {
    uInk: { value: new THREE.Color(INK) },
    uOn: { value: 0 },
    uSweep: { value: 0 },
    uAspect: { value: 1 },
    uDot: { value: 0 },
    uCentre: { value: scopeCentre },
    uRadius: { value: scopeRadius },
  };
  const echoVertex = `
      attribute float aTail;
      uniform float uSweep, uAspect, uDot;
      uniform vec2 uCentre, uRadius;
      varying float vGlow, vR, vTail;
      void main() {
        vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec2 ndc = clip.xy / max(clip.w, 1e-4);
        vec2 p = vec2(ndc.x * uAspect, ndc.y) / max(uAspect, 1.0);
        float ang = atan(p.y, p.x);
        float since = mod(ang - uSweep, 6.2831853);
        vR = length(p);
        vTail = aTail;
        vGlow = (0.12 + 0.88 * exp(-since * 1.2)) * (1.0 - aTail * 0.8) * step(0.0, clip.w);
        gl_Position = vec4(uCentre + p * uRadius, 0.0, 1.0);
        gl_PointSize = uDot * (1.0 - aTail);
      }`;
  const echoFace = `
      uniform vec3 uInk;
      uniform float uOn;
      varying float vGlow, vR, vTail;`;
  const echoMat = new THREE.ShaderMaterial({
    uniforms: echoUniforms,
    vertexShader: echoVertex,
    fragmentShader: `${echoFace}
      void main() {
        float face = 1.0 - smoothstep(0.97, 1.0, vR);
        gl_FragColor = vec4(uInk, vGlow * face * uOn);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    fog: false,
  });
  const echoDotMat = new THREE.ShaderMaterial({
    uniforms: echoUniforms,
    vertexShader: echoVertex,
    fragmentShader: `${echoFace}
      void main() {
        if (vTail > 0.5) discard;
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float dot = 1.0 - smoothstep(0.6, 1.0, d);
        float face = 1.0 - smoothstep(0.97, 1.0, vR);
        gl_FragColor = vec4(uInk, dot * vGlow * face * uOn);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    fog: false,
  });
  const echo = new THREE.LineSegments(echoGeo, echoMat);
  echo.renderOrder = 6;
  echo.frustumCulled = false;
  echo.name = 'radar-echo';
  group.add(echo);
  const echoDot = new THREE.Points(echoGeo, echoDotMat);
  echoDot.renderOrder = 7;
  echoDot.frustumCulled = false;
  echoDot.name = 'radar-echo-dot';
  group.add(echoDot);

  // The radar's face: range rings and bearings, hairline and faint, inside
  // a bezel, and the sweep — the one thing drawn in the accent — with its
  // afterglow behind it. The face itself is clear: the scope is lines over
  // the world, and the echoes are what it is for. A screen-space quad
  // placed at the scope; the camera is ignored.
  const radarMat = new THREE.ShaderMaterial({
    uniforms: {
      uInk: { value: new THREE.Color(INK) },
      uNow: { value: new THREE.Color(NOW) },
      uOn: { value: 0 },
      uSweep: { value: 0 },
      uCentre: { value: scopeCentre },
      uRadius: { value: scopeRadius },
    },
    vertexShader: `
      uniform vec2 uCentre, uRadius;
      varying vec2 vP;
      void main() {
        vP = position.xy;
        gl_Position = vec4(uCentre + position.xy * uRadius, 0.0, 1.0);
      }`,
    fragmentShader: `
      #define TAU 6.2831853
      uniform vec3 uInk, uNow;
      uniform float uOn, uSweep;
      varying vec2 vP;
      void main() {
        float r = length(vP);
        float ang = atan(vP.y, vP.x);
        // The face is a clear disc; the bezel is a hairline of ink at its edge.
        float rw = fwidth(r);
        float face = 1.0 - smoothstep(1.0 - rw, 1.0 + rw, r);
        float bezel = 1.0 - smoothstep(0.4 * rw, 1.4 * rw, abs(r - 1.0));
        // Range rings and bearings, one pixel wide, inside the bezel.
        float ring = 1.0 - smoothstep(0.4 * rw, 1.2 * rw, abs(fract(r / 0.25) - 0.5) * 0.25);
        float sp = abs(fract(ang / (TAU / 12.0)) - 0.5) * (TAU / 12.0) * r;
        float sw = fwidth(sp);
        float spoke = (1.0 - smoothstep(0.4 * sw, 1.2 * sw, sp)) * smoothstep(0.04, 0.08, r);
        float grid = max(ring, spoke) * 0.22 * face;
        // The sweep: a hairline arm, and the glow it leaves behind.
        float since = mod(ang - uSweep, TAU);
        float off = min(since, TAU - since);
        float d = r * sin(min(off, 1.5707963));
        float dw = fwidth(d);
        float arm = (1.0 - smoothstep(0.4 * dw, 1.4 * dw, d)) * step(off, 1.5707963);
        float glow = exp(-since * 2.6) * 0.3;
        float sweep = (arm + glow) * face;
        // Ink lines and the accent sweep, with alpha; nothing behind them.
        float inkW = max(grid, bezel * 0.5);
        vec3 col = mix(uInk, uNow, clamp(sweep, 0.0, 1.0));
        float a = max(inkW, sweep) * uOn;
        gl_FragColor = vec4(col, a);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    fog: false,
  });
  const radar = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), radarMat);
  radar.renderOrder = 5;
  radar.frustumCulled = false;
  radar.name = 'radar';
  group.add(radar);

  // ---- the ring of seasons: the year as a dial, clockwise from the day
  // the record opens. The exposure fills the rim as the year turns, the
  // present is the accent tick at its head, the first of each month is a
  // small tick inside, and the place's dated marks stand on the rim
  // outside, lit once the year has passed them. A small quad, placed in
  // clip space; the camera is ignored.
  const doy = (m: number, d: number) =>
    Math.round((Date.UTC(openY, m - 1, d) - Date.UTC(openY, 0, 1)) / 86_400_000);
  const openDoy = doy(openM, openD);
  const turn = (m: number, d: number) => ((((doy(m, d) - openDoy) % 365) + 365) % 365) / 365;
  const months = Array.from({ length: 12 }, (_, i) => turn(i + 1, 1));
  const marks = (def.marks ?? []).slice(0, 8).map((k) => turn(k.month, k.day));
  while (marks.length < 8) marks.push(-1);
  const ringMat = new THREE.ShaderMaterial({
    uniforms: {
      uInk: { value: new THREE.Color(INK) },
      uNow: { value: new THREE.Color(NOW) },
      uOn: { value: 0 },
      uDay: { value: 0 },
      uCentre: { value: new THREE.Vector2(RING_CENTRE.x, RING_CENTRE.y) },
      uExtent: { value: new THREE.Vector2(RING_R * 1.5, RING_R * 1.5) },
      uMonths: { value: months },
      uMarks: { value: marks },
    },
    vertexShader: `
      uniform vec2 uCentre, uExtent;
      varying vec2 vP;
      void main() {
        vP = position.xy;
        gl_Position = vec4(uCentre + position.xy * uExtent, 0.0, 1.0);
      }`,
    fragmentShader: `
      #define TAU 6.2831853
      uniform vec3 uInk, uNow;
      uniform float uOn, uDay;
      uniform float uMonths[12];
      uniform float uMarks[8];
      varying vec2 vP;
      // A hairline where d, in ring radii, is zero.
      float hair(float d) {
        float w = max(fwidth(d), 1e-4);
        return 1.0 - smoothstep(0.5 * w, 1.5 * w, abs(d));
      }
      // Arc distance between two turns of the ring, in ring radii at r.
      float along(float f, float g, float r) {
        float d = abs(f - g);
        return min(d, 1.0 - d) * TAU * r;
      }
      void main() {
        vec2 v = vP * 1.5;
        float r = length(v);
        float f = mod(atan(v.x, v.y) / TAU + 1.0, 1.0);
        vec3 col = vec3(0.0);
        // The rim, and the exposed arc on it.
        col += uInk * hair(r - 1.0) * 0.45;
        float exposed = step(f, uDay) * (1.0 - smoothstep(0.0, 0.035, abs(r - 1.03)));
        col += uInk * exposed * 0.85;
        // The months, as ticks inside the rim.
        for (int i = 0; i < 12; i++) {
          float t = hair(along(f, uMonths[i], r)) * step(0.9, r) * step(r, 0.97);
          col += uInk * t * 0.5;
        }
        // The place's marks, outside the rim, lit once passed.
        for (int i = 0; i < 8; i++) {
          if (uMarks[i] < 0.0) continue;
          float t = hair(along(f, uMarks[i], r)) * step(1.08, r) * step(r, 1.2);
          col += uInk * t * mix(0.35, 0.9, step(uMarks[i], uDay));
        }
        // Now: the accent tick at the head of the exposure.
        float nowTick = hair(along(f, uDay, r)) * step(0.88, r) * step(r, 1.16);
        col += uNow * nowTick;
        gl_FragColor = vec4(col * (1.0 - smoothstep(1.3, 1.45, r)), uOn);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ringMat);
  ring.renderOrder = 5;
  ring.frustumCulled = false;
  ring.name = 'ring';
  group.add(ring);

  // ---- the air's density is the scene's, and it is handed back on exit.
  const fog = world.fog instanceof THREE.FogExp2 ? world.fog : null;
  const fogWas = fog ? { color: fog.color.getHex(), density: fog.density } : null;

  const tint = new THREE.Color();
  const setTint = (
    mat: THREE.MeshBasicMaterial | THREE.PointsMaterial,
    hex: number,
    shade: number,
  ) => {
    tint.setHex(mixHex(hex, 0x000000, shade));
    mat.color.copy(tint);
  };

  let elapsed = 0;

  /** How far on an instrument is at this point in the scene, 0–1. */
  const instrumentOn = (kind: string, local: number): number => {
    let on = 0;
    for (const i of def.instruments ?? []) {
      if (i.kind !== kind) continue;
      const rise = clamp01((local - i.from) / INSTRUMENT_EDGE);
      const fall = clamp01((i.to - local) / INSTRUMENT_EDGE);
      on = Math.max(on, Math.min(rise, fall));
    }
    return on;
  };

  const imagePlates = [canopyImg, farImg, nearImg];
  let warmed = false;
  function warm(renderer: THREE.WebGLRenderer, camera: THREE.Camera): boolean {
    if (warmed) return true;
    if (!imagePlates.every((p) => !p || p.ready)) return false;
    // compile() walks visible objects only, so the world shows itself to
    // the compiler for one call and hides again.
    const was = group.visible;
    group.visible = true;
    renderer.compile(world, camera);
    group.visible = was;
    for (const p of imagePlates) {
      for (const l of p?.layers ?? []) if (l.mat.map) renderer.initTexture(l.mat.map);
    }
    warmed = true;
    return true;
  }

  function setActive(on: boolean): void {
    if (group.visible === on) return;
    group.visible = on;
    if (!on) figure?.hide();
    if (!fog || !fogWas) return;
    if (!on) {
      fog.color.setHex(fogWas.color);
      fog.density = fogWas.density;
    } else if (def.fogDensity !== undefined) {
      fog.density = def.fogDensity;
    }
  }

  function update(local: number, dt: number, camera: THREE.Camera): void {
    if (!group.visible) return;
    elapsed += dt;

    const s = seasonAt(seasons!, local);

    // The record so far: which day's 4:17 is now, from the opening day
    // once the hold ends to the same day a year on. Scroll is the
    // exposure; scrolling back un-exposes.
    const turned = hold < 1 ? clamp01((local - hold) / (1 - hold)) : 0;
    const day = turned * DAYS;
    const d0 = Math.min(Math.floor(day), DAYS - 1);
    sunDir.lerpVectors(apparent[d0], apparent[d0 + 1], day - d0).normalize();
    // The water's glitter gathers under the sun at the far shore.
    onPlane(sunDir, waterFarZ, sunAt);
    const sunX = sunAt.x;
    const elev = Math.asin(sunDir.y);

    const skyZenith = s.skyZenith;
    const skyHorizon = s.skyHorizon;
    const haze = s.haze;
    const canopy = s.canopy;
    const bank = s.bank;
    const waterCol = s.water;
    const airCol = s.air;

    // The scene fades its own world in and out at the edges the manifest
    // declares, so the placeholder field can hand over and take back.
    const fadeIn = def.fadeIn ?? 0;
    const fadeOut = def.fadeOut ?? 0;
    let alpha = 1;
    if (fadeIn > 0) alpha = Math.min(alpha, local / fadeIn);
    if (fadeOut > 0) alpha = Math.min(alpha, (1 - local) / fadeOut);
    alpha = clamp01(alpha);

    skyMat.uniforms.uZenith.value.setHex(skyZenith);
    skyMat.uniforms.uHorizon.value.setHex(skyHorizon);
    skyMat.uniforms.uOpacity.value = alpha;

    trailMat.uniforms.uNow.value = turned;
    trailMat.uniforms.uOpacity.value = alpha;

    onPlane(sunDir, sunZ, sunAt);
    sun.position.set(sunAt.x, sunAt.y, sunZ);
    sunMat.uniforms.uColor.value.setHex(s.sun);
    sunMat.uniforms.uOpacity.value = alpha;

    onPlane(sunDir, cloudZ, sunAt);
    cloudMat.uniforms.uSunPos.value.set(sunAt.x, sunAt.y - cloudCentreY);
    cloudMat.uniforms.uLit.value.setHex(s.cloudLit);
    cloudMat.uniforms.uShade.value.setHex(s.cloudShade);
    cloudMat.uniforms.uHaze.value.setHex(haze);
    cloudMat.uniforms.uSun.value.setHex(s.sun);
    cloudMat.uniforms.uCover.value = s.cloudCover;
    cloudMat.uniforms.uTime.value =
      local * cloudChurn + (reducedMotion ? 0 : elapsed * cloudDrift);
    cloudMat.uniforms.uOpacity.value = alpha;

    setTint(leafyMat, canopy, canopyDef!.shade ?? 0);
    setTint(bareMat, canopy, canopyDef!.shade ?? 0);
    leafyMat.opacity = alpha * s.canopyFill;
    bareMat.opacity = alpha;

    setTint(farMat, bank, farBankDef!.shade ?? 0);
    setTint(nearMat, bank, nearBankDef!.shade ?? 0);
    farMat.opacity = alpha;
    nearMat.opacity = alpha;

    waterMat.uniforms.uWater.value.setHex(waterCol);
    waterMat.uniforms.uHaze.value.setHex(haze);
    waterMat.uniforms.uSun.value.setHex(s.sun);
    waterMat.uniforms.uSunX.value = sunX;
    waterMat.uniforms.uSunElev.value = elev;
    waterMat.uniforms.uOpacity.value = alpha;
    if (!reducedMotion) waterMat.uniforms.uTime.value = elapsed;
    // The flow instrument: on for the window the manifest declares. The
    // wind blows from its bearing, so the water moves the other way; the
    // camera faces west, +x north and +z east.
    const toward = ((s.windFrom + 180) * Math.PI) / 180;
    waterMat.uniforms.uFlowDir.value.set(Math.cos(toward), Math.sin(toward));
    waterMat.uniforms.uFlowSpeed.value = s.windSpeed;
    waterMat.uniforms.uFlow.value = alpha * instrumentOn('flow', local);
    // The thermal instrument: the season's afternoon temperatures, as
    // fractions of the ramp, on the banks and the lake.
    thermalU.uThermal.value = alpha * instrumentOn('thermal', local);
    thermalU.uTempGround.value = thermalNorm(s.tempGround);
    thermalU.uTempWater.value = thermalNorm(s.tempWater);
    if (!reducedMotion) thermalU.uThermalTime.value = elapsed;

    // Image plates carry their own colour; only their declared shade
    // dims them. Every active layer is opaque except the frontmost, which
    // carries the blend — so a cross-fade never lets the sky through the
    // trunks.
    const weights = seasonWeights(seasons!, local);
    const weightOf = (key: string) => (key === '*' ? 1 : weights[key] ?? 0);
    const setImage = (plate: ImagePlate | null, shade: number) => {
      if (!plate?.ready) return;
      let front = -1;
      plate.layers.forEach((l, i) => {
        if (weightOf(l.key) > 0) front = i;
      });
      plate.layers.forEach((l, i) => {
        const w = weightOf(l.key);
        setTint(l.mat, 0xffffff, shade);
        l.mat.opacity = alpha * (w <= 0 ? 0 : i === front ? w : 1);
      });
    };
    setImage(canopyImg, canopyDef!.shade ?? 0);
    setImage(farImg, farBankDef!.shade ?? 0);
    setImage(nearImg, nearBankDef!.shade ?? 0);

    setTint(airMat, airCol, 0);
    airMat.opacity = alpha * s.airCount;
    airMat.size = 0.05 + s.airFall * 0.07;

    // The radar instrument. The sweep turns clockwise at the period the
    // manifest declares, or holds a bearing under reduced motion; the
    // echoes trail back along each mote's fall and sway. The scope sits
    // where the manifest puts it, sized by the frame's shorter edge, or
    // fills the frame if it declares no scope.
    const radarOn = alpha * instrumentOn('radar', local);
    const period = radarDef?.period ?? 6;
    const sweep = reducedMotion ? 2.2 : -((elapsed / period) * Math.PI * 2) % (Math.PI * 2);
    const W = Math.max(1, window.innerWidth);
    const H = Math.max(1, window.innerHeight);
    const aspect = W / H;
    const scope = radarDef?.scope;
    if (scope) {
      const short = Math.min(W, H);
      const rPx = (scope.size * short) / 2;
      const right = scope.corner.endsWith('right');
      const top = scope.corner.startsWith('top');
      const cx = right ? W - scope.inset.x * W - rPx : scope.inset.x * W + rPx;
      const cy = top ? scope.inset.y * H + rPx : H - scope.inset.y * H - rPx;
      scopeCentre.set((cx / W) * 2 - 1, 1 - (cy / H) * 2);
      scopeRadius.set((rPx / W) * 2, (rPx / H) * 2);
    } else {
      scopeCentre.set(0, 0);
      scopeRadius.set(Math.max(1, 1 / aspect), Math.max(1, aspect));
    }
    radar.visible = radarOn > 0;
    echo.visible = radarOn > 0;
    echoDot.visible = radarOn > 0;
    radarMat.uniforms.uOn.value = radarOn;
    radarMat.uniforms.uSweep.value = sweep;
    echoUniforms.uOn.value = radarOn * s.airCount;
    echoUniforms.uSweep.value = sweep;
    echoUniforms.uAspect.value = aspect;
    echoUniforms.uDot.value = ECHO_DOT_PX * Math.min(window.devicePixelRatio, 2);
    // The ring of seasons: the year's turn so far, from the record.
    const ringOn = alpha * instrumentOn('ring', local);
    ring.visible = ringOn > 0;
    ringMat.uniforms.uOn.value = ringOn;
    ringMat.uniforms.uDay.value = clamp01(day / DAYS);
    ringMat.uniforms.uExtent.value.set((RING_R * 1.5) / aspect, RING_R * 1.5);
    if (radarOn > 0) {
      const pos = airGeo.getAttribute('position') as THREE.BufferAttribute;
      const back = airDef!.fall * s.airFall * ECHO_TRAIL_S;
      const swayBack = s.airFall * 0.35 * ECHO_TRAIL_S;
      for (let i = 0; i < airDef!.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const o = i * 6;
        echoPos[o] = x;
        echoPos[o + 1] = y;
        echoPos[o + 2] = z;
        echoPos[o + 3] = x - Math.sin(elapsed * 0.8 + airPhase[i]) * swayBack;
        echoPos[o + 4] = y + back * airSpeed[i];
        echoPos[o + 5] = z;
      }
      (echoGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    }

    if (fog) fog.color.setHex(haze);

    // The survey reads the day the record has reached, and fades with the
    // world. Before the year turns it measures the opening exposure.
    figure?.update(local, day, alpha, camera);

    if (reducedMotion) return;

    // What is in the air falls at the rate the season asks for.
    const attr = airGeo.getAttribute('position') as THREE.BufferAttribute;
    const fall = dt * airDef!.fall * s.airFall;
    const sway = s.airFall * 0.35;
    for (let i = 0; i < airDef!.count; i++) {
      let y = attr.getY(i) - fall * airSpeed[i];
      if (y < 0) y += airDef!.height;
      attr.setY(i, y);
      if (sway > 0) {
        attr.setX(
          i,
          attr.getX(i) + Math.sin(elapsed * 0.8 + airPhase[i]) * sway * dt,
        );
      }
    }
    attr.needsUpdate = true;
  }

  return { setActive, update, warm };
}
