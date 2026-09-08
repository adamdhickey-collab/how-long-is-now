/**
 * scene-08-two-clocks — the same ten minutes, walked twice.
 *
 * The second of the three moments, and the centrepiece: two views of one
 * corridor side by side, one walked by someone waiting for the ten
 * minutes to end and one by someone absorbed in them. While it is
 * happening the waiting corridor barely moves and the absorbed one races.
 * Then the label turns to LOOKING BACK, and the relationship reverses:
 * the waiting corridor has collapsed to a stub with a wall across it,
 * and the absorbed one has opened into dozens of fragments.
 *
 * Nothing here decides *when*. The corridor's size, the two clocks'
 * travel, the turn and the fragments are all declared in the manifest;
 * this file knows how to build a corridor and how to read the declaration
 * at a given moment. The corridor itself is a procedural stand-in for the
 * generated plate to come (ASSETS.md); the choreography is not.
 *
 * The frame is split: the left half is rendered through the waiting
 * clock's camera, the right through the absorbed one's. Both cameras stand
 * in the same corridor — it is one image, used twice — and only what is
 * true of each clock differs between the two passes: how far along it
 * stands, where its end wall is, whether the fragments are there.
 */

import * as THREE from 'three';
import type { AbsorbedLayer, Scene, TwoClocks } from './manifest';
import { opening } from './loading';

/** Local progress the dial spends coming on, and going off. */
const DIAL_EDGE = 0.02;
/** How far ahead of the absorbed clock the motes are kept, world units,
 *  how fast they drift toward it, and how far back a trail reaches. */
const MOTE_REACH = 48;
const MOTE_DRIFT = 0.35;
const MOTE_TRAIL_S = 0.5;
/** A mote, in CSS pixels. */
const MOTE_PX = 2.2;

/** The HUD's ink and its dim, and the piece's ground. */
const INK = 0xe8e6e1;
const DIM = 0x8a877f;
const GROUND = 0x060708;
/** Eye height in the corridor, world units. */
const EYE = 1.55;
/** The gap between the two views, CSS px, in the ground colour. */
const GUTTER = 2;
/**
 * The corridor's own fog, per unit of depth: exponential, not squared,
 * so the corridor darkens from the first bay and dissolves rather than
 * cutting off. Its end is never seen.
 */
const FOG = 0.06;
/** Timing of the dip to black at the turn, and of the labels' fades,
 *  as fractions of the manifest's `turnOver`. */
const DIP_HOLD = 0.2;

const NS = 'http://www.w3.org/2000/svg';

const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1);
const smooth = (t: number) => {
  const k = clamp01(t);
  return k * k * (3 - 2 * k);
};

export interface TwoClocksScene {
  /** The scene builds its world once and shows it only while it runs. */
  setActive(on: boolean): void;
  /** local: 0–1 through the scene. Places both cameras and sets every
   *  uniform for the frame. */
  update(local: number): void;
  /**
   * Draw the frame: the world twice, through the two cameras, into the
   * two halves of the canvas. Returns false when the scene is not active,
   * in which case the caller renders the world its usual way.
   */
  render(renderer: THREE.WebGLRenderer): boolean;
}

// ------------------------------------------------------------- the corridor

/**
 * Every surface of the corridor is drawn by one shader from its world
 * position: which surface it is comes from its normal. Walls carry a door
 * every bay; the ceiling a light every lamp; the floor the lights'
 * reflections and its own tiles. Light pools under each lamp and falls
 * away between them, so the corridor reads as a row of rooms of light.
 */
const corridorVertex = `
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vDepth;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 mvPosition = viewMatrix * world;
    vDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
  }`;

const corridorFragment = `
  uniform vec3 uInk, uDim, uGround;
  uniform float uWidth, uHeight, uBay, uLamp, uEnd, uBright, uFog;
  uniform sampler2D uWall, uCeiling, uFloor;
  uniform float uImages;
  uniform float uThermal, uThermalTime, uTempLo, uTempHi;
  uniform vec3 uRamp0, uRamp1, uRamp2, uRamp3;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vDepth;

  // The thermal reading, as scene 04 draws it: a ramp from cold to hot
  // and hairline isotherms every eighth of the range.
  vec3 thermalRamp(float t) {
    t = clamp(t, 0.0, 1.0) * 3.0;
    if (t < 1.0) return mix(uRamp0, uRamp1, t);
    if (t < 2.0) return mix(uRamp1, uRamp2, t - 1.0);
    return mix(uRamp2, uRamp3, t - 2.0);
  }
  float isotherm(float t) {
    float k = t * 8.0;
    float d = min(fract(k), 1.0 - fract(k));
    float w = max(fwidth(k), 1e-4);
    return 1.0 - smoothstep(0.5 * w, 1.5 * w, d);
  }

  // A hairline: 1 at the line, 0 a pixel away, from a signed distance.
  float hair(float d) {
    float w = fwidth(d);
    return 1.0 - smoothstep(0.5 * w, 1.5 * w, abs(d));
  }
  // How lit a point at depth z is: light pools under each lamp, which
  // hang at the middle of every uLamp, and falls away between them.
  float pool(float z) {
    float c = 0.5 - 0.5 * cos(6.2831853 * z / uLamp);
    return 0.22 + 0.78 * c * c;
  }

  void main() {
    vec3 n = vNormal;
    vec3 p = vWorld;
    float halfW = uWidth * 0.5;
    // The wall colour: the ground lifted a little toward ink.
    vec3 wall = mix(uGround, uInk, 0.11);
    vec3 col = wall;
    float lit = pool(p.z);
    // Beyond the end wall nothing is drawn: the corridor stops there.
    if (p.z < uEnd - 0.01) discard;
    // The surfaces' heat, °C, read by the thermal layer: the tubes warm
    // the ceiling around them and, less, everything under them; the
    // floor is the coolest thing here, except where a lamp's light lies.
    float lampZ = (floor(p.z / uLamp) + 0.5) * uLamp;
    float panelH = (1.0 - smoothstep(0.55, 0.62, abs(p.z - lampZ))) * (1.0 - smoothstep(0.16, 0.2, abs(p.x)));
    float reflH = exp(-pow(p.x / 0.42, 2.0)) * exp(-pow((p.z - lampZ) / 0.9, 2.0));
    float heat = 21.0;
    if (n.y < -0.5) heat = 22.0 + 7.0 * panelH + 2.5 * lit;
    else if (n.y > 0.5) heat = 18.5 + 1.2 * lit + 2.0 * reflH;
    else if (abs(n.x) > 0.5) heat = 20.5 + 1.8 * lit;

    if (uImages > 0.5) {
      // The drawn plates: one bay of each surface, tiled along the
      // corridor and mirrored at every join so nothing seams. The lamps
      // are painted in the ceiling bay; the light they pool is still
      // this shader's, as is the floor's reflection of them.
      if (abs(n.x) > 0.5) {
        col = texture2D(uWall, vec2(p.z / uBay, p.y / uHeight)).rgb * lit;
      } else if (n.y < -0.5) {
        col = texture2D(uCeiling, vec2(p.z / uLamp, p.x / uWidth + 0.5)).rgb * max(lit, 0.55);
      } else if (n.y > 0.5) {
        float zc = (floor(p.z / uLamp) + 0.5) * uLamp;
        float refl = exp(-pow(p.x / 0.42, 2.0)) * exp(-pow((p.z - zc) / 0.9, 2.0));
        col = texture2D(uFloor, vec2(p.z / uLamp, p.x / uWidth + 0.5)).rgb * lit * 0.9 + uInk * refl * 0.3;
      } else {
        // The end wall wears the doorless flank of the wall bay, mirrored
        // about its centre, so no door is painted across a dead end.
        col = texture2D(uWall, vec2(abs(p.x) / uBay, p.y / uHeight)).rgb * max(lit, 0.7);
        col = mix(col, uDim, max(hair(p.y - 0.02), hair(p.y - uHeight + 0.02)) * 0.5);
      }
    } else if (abs(n.x) > 0.5) {
      // A wall. A dado line at waist height; a door every bay, framed in
      // a hairline of dim ink, its face a shade darker than the wall.
      float zc = (floor(p.z / uBay) + 0.5) * uBay;
      vec2 d = vec2(abs(p.z - zc) - 0.5, p.y - 2.1);
      float inDoor = step(d.x, 0.0) * step(d.y, 0.0);
      col = mix(col, mix(uGround, uInk, 0.075), inDoor);
      float frame = max(hair(d.x) * step(p.y, 2.1), hair(d.y) * step(abs(p.z - zc), 0.5));
      col = mix(col, uDim, frame * 0.7);
      col = mix(col, uDim, hair(p.y - 0.95) * 0.35 * (1.0 - inDoor));
      // A handle: a dot of ink, on the side away from the hinge.
      float handle = 1.0 - smoothstep(0.02, 0.035, length(vec2(p.z - zc - 0.36, p.y - 1.0)));
      col = mix(col, uDim, handle * inDoor);
      col *= lit;
    } else if (n.y < -0.5) {
      // The ceiling. A fluorescent panel every lamp, emitting ink.
      float zc = (floor(p.z / uLamp) + 0.5) * uLamp;
      float panel = (1.0 - smoothstep(0.55, 0.62, abs(p.z - zc))) * (1.0 - smoothstep(0.16, 0.2, abs(p.x)));
      col = mix(col * lit * 0.85, uInk, panel);
    } else if (n.y > 0.5) {
      // The floor. Tiles as hairlines; under each lamp its reflection, a
      // soft streak down the middle that brightens as the lamp is neared.
      float tile = max(hair(fract(p.x + 0.5) - 0.5), hair(fract(p.z) - 0.5));
      col = mix(col, uDim, tile * 0.28);
      float zc = (floor(p.z / uLamp) + 0.5) * uLamp;
      float refl = exp(-pow(p.x / 0.42, 2.0)) * exp(-pow((p.z - zc) / 0.9, 2.0));
      col = col * lit * 0.9 + uInk * refl * 0.35;
    } else {
      // The end wall, when there is one near enough to see: blank, lit
      // by the lamp before it however it falls between the lamps, with a
      // hairline where it meets the floor and ceiling.
      col = wall * max(lit, 0.7);
      col = mix(col, uDim, max(hair(p.y - 0.02), hair(p.y - uHeight + 0.02)) * 0.5);
    }
    if (uThermal > 0.0) {
      float t = (heat - uTempLo) / (uTempHi - uTempLo);
      t += sin(p.z * 0.9 + uThermalTime * 0.17) * 0.02 + sin(p.y * 2.3 - uThermalTime * 0.11) * 0.02;
      vec3 read = thermalRamp(t) * (0.55 + 0.45 * lit);
      read = mix(read, uInk, isotherm(t) * 0.45);
      // Not quite all the way: the corridor stays legible under its reading.
      col = mix(col, read, uThermal * 0.82);
    }
    col = mix(col, uGround, 1.0 - exp(-vDepth * uFog));
    col *= uBright;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }`;

/**
 * A fragment: a pane hung in the corridor, a hairline of ink around a
 * translucent face, with one of a few plain marks on it — a stand-in for
 * the cutouts to come. `aSeed` picks the mark and its placement.
 */
const fragmentVertex = `
  attribute float aSeed;
  varying vec2 vUv;
  varying float vSeed;
  varying float vDepth;
  void main() {
    vUv = uv;
    vSeed = aSeed;
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vec4 mvPosition = viewMatrix * world;
    vDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
  }`;

const fragmentFragment = `
  uniform vec3 uInk, uDim, uGround;
  uniform float uShow, uBright, uFog, uAtlasOn;
  uniform sampler2D uAtlas;
  uniform vec3 uAtlasGrid;
  varying vec2 vUv;
  varying float vSeed;
  varying float vDepth;
  float hair(float d) {
    float w = fwidth(d);
    return 1.0 - smoothstep(0.5 * w, 1.5 * w, abs(d));
  }
  void main() {
    vec2 q = vUv - 0.5;
    // The pane: a border a hair in, the face faintly there.
    float border = max(hair(abs(q.x) - 0.47), hair(abs(q.y) - 0.47));
    float face = 0.10;
    if (uAtlasOn > 0.5) {
      // A cutout from the atlas, by seed: the pane's height is the tile's,
      // the tile centred across it, the cutout over the faint face.
      float cols = uAtlasGrid.x;
      float rows = uAtlasGrid.y;
      float i = floor(fract(vSeed) * uAtlasGrid.z);
      vec2 cell = vec2(mod(i, cols), rows - 1.0 - floor(i / cols));
      vec2 t = vec2(q.x * 0.75 + 0.5, vUv.y);
      vec4 cut = texture2D(uAtlas, (cell + clamp(t, 0.0, 1.0)) / vec2(cols, rows));
      float inside = step(abs(q.x), 0.5 / 0.75 * 0.5);
      float ca = cut.a * inside;
      vec3 col = mix(mix(uDim, uInk, 0.6), cut.rgb, ca);
      float a = max(face, max(border * 0.9, ca)) * uShow * exp(-vDepth * uFog);
      gl_FragColor = vec4(col * uBright, a);
      #include <colorspace_fragment>
      return;
    }
    // One of four marks, by seed: a ring, a line, a small square, a dot row.
    float kind = floor(fract(vSeed) * 4.0);
    vec2 c = vec2(fract(vSeed * 7.31) - 0.5, fract(vSeed * 3.17) - 0.5) * 0.4;
    float mark = 0.0;
    if (kind < 0.5) mark = hair(length(q - c) - 0.16);
    else if (kind < 1.5) mark = hair(q.y - c.y) * step(abs(q.x - c.x), 0.28);
    else if (kind < 2.5) mark = max(hair(abs(q.x - c.x) - 0.12), hair(abs(q.y - c.y) - 0.12)) * step(abs(q.x - c.x), 0.13) * step(abs(q.y - c.y), 0.13);
    else {
      vec2 g = vec2(fract((q.x - c.x) * 6.0) - 0.5, (q.y - c.y) * 6.0);
      mark = (1.0 - smoothstep(0.12, 0.2, length(g))) * step(abs(q.x - c.x), 0.25);
    }
    vec3 col = mix(uDim, uInk, 0.6);
    float a = max(face, max(border * 0.9, mark * 0.8)) * uShow * exp(-vDepth * uFog);
    gl_FragColor = vec4(col * uBright, a);
    #include <colorspace_fragment>
  }`;

// ------------------------------------------------------------------ scene

export function createTwoClocksScene(world: THREE.Scene, def: Scene, reducedMotion: boolean): TwoClocksScene {
  const declared = def.twoClocks;
  if (!declared) return { setActive: () => {}, update: () => {}, render: () => false };
  const tc: TwoClocks = declared;
  const { corridor, waiting, absorbed, fragment } = tc;

  const group = new THREE.Group();
  group.name = 'two-clocks';
  group.visible = false;
  world.add(group);

  // ---- the corridor: four long planes and an end wall, one material.
  const uniforms = {
    uInk: { value: new THREE.Color(INK) },
    uDim: { value: new THREE.Color(DIM) },
    uGround: { value: new THREE.Color(GROUND) },
    uWidth: { value: corridor.width },
    uHeight: { value: corridor.height },
    uBay: { value: corridor.bay },
    uLamp: { value: corridor.lamp },
    uEnd: { value: -corridor.depth },
    uBright: { value: 1 },
    uFog: { value: FOG },
    uWall: { value: null as THREE.Texture | null },
    uCeiling: { value: null as THREE.Texture | null },
    uFloor: { value: null as THREE.Texture | null },
    uImages: { value: 0 },
    uThermal: { value: 0 },
    uThermalTime: { value: 0 },
    uTempLo: { value: 16 },
    uTempHi: { value: 30 },
    uRamp0: { value: new THREE.Color(0x24425f) },
    uRamp1: { value: new THREE.Color(0x35566a) },
    uRamp2: { value: new THREE.Color(0xe0b884) },
    uRamp3: { value: new THREE.Color(0xffe6b0) },
  };
  const layers = absorbed.layers ?? [];
  const layer = (kind: AbsorbedLayer['kind']) => layers.find((l) => l.kind === kind);
  const thermalDef = layer('thermal');
  if (thermalDef) {
    const ramp = thermalDef.ramp ?? [];
    const stops = [uniforms.uRamp0, uniforms.uRamp1, uniforms.uRamp2, uniforms.uRamp3];
    stops.forEach((u, i) => {
      const c = ramp[Math.min(i, ramp.length - 1)];
      if (c !== undefined) u.value.setHex(c);
    });
    if (thermalDef.range) {
      uniforms.uTempLo.value = thermalDef.range[0];
      uniforms.uTempHi.value = thermalDef.range[1];
    }
  }
  const corridorMat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: corridorVertex,
    fragmentShader: corridorFragment,
    side: THREE.DoubleSide,
  });

  const { width, height, depth } = corridor;
  const surface = (w: number, h: number, rotate: (m: THREE.Mesh) => void) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), corridorMat);
    rotate(m);
    group.add(m);
    return m;
  };
  // The planes run from z = +bay (a little behind the camera's start) to
  // -depth; their centre is at z = (bay - depth) / 2.
  const zMid = (corridor.bay - depth) / 2;
  const run = depth + corridor.bay;
  surface(width, run, (m) => {
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, 0, zMid);
  });
  surface(width, run, (m) => {
    m.rotation.x = Math.PI / 2;
    m.position.set(0, height, zMid);
  });
  surface(run, height, (m) => {
    m.rotation.y = Math.PI / 2;
    m.position.set(-width / 2, height / 2, zMid);
  });
  surface(run, height, (m) => {
    m.rotation.y = -Math.PI / 2;
    m.position.set(width / 2, height / 2, zMid);
  });
  // The end wall. Where it stands is set per pass; far away it is fogged.
  const endWall = surface(width, height, (m) => {
    m.position.set(0, height / 2, -depth);
  });

  // ---- the fragments: instanced panes along the absorbed corridor's
  // remembered length, hung on alternate walls with every third afloat
  // in the middle, each turned a little toward the walker.
  const fragGeo = new THREE.PlaneGeometry(fragment.width, fragment.height);
  const seeds = new Float32Array(absorbed.fragments);
  for (let i = 0; i < absorbed.fragments; i++) seeds[i] = (i * 0.618034) % 1;
  fragGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  const fragUniforms = {
    uInk: { value: new THREE.Color(INK) },
    uDim: { value: new THREE.Color(DIM) },
    uGround: { value: new THREE.Color(GROUND) },
    uShow: { value: 0 },
    uBright: { value: 1 },
    uFog: { value: FOG },
    uAtlas: { value: null as THREE.Texture | null },
    uAtlasGrid: { value: new THREE.Vector3(1, 1, 1) },
    uAtlasOn: { value: 0 },
  };
  const fragMat = new THREE.ShaderMaterial({
    uniforms: fragUniforms,
    vertexShader: fragmentVertex,
    fragmentShader: fragmentFragment,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const frags = new THREE.InstancedMesh(fragGeo, fragMat, absorbed.fragments);
  frags.frustumCulled = false;
  {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const pos = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);
    const length = absorbed.rememberedBays * corridor.bay;
    for (let i = 0; i < absorbed.fragments; i++) {
      const t = (i + 0.5) / absorbed.fragments;
      const s = seeds[i];
      const z = -corridor.bay * 0.6 - t * (length - corridor.bay);
      const y = 1.05 + s * 0.85;
      if (i % 3 === 2) {
        // Afloat: across the corridor, facing the walker, drifted aside.
        pos.set((s - 0.5) * 0.9, y, z);
        e.set(0, (s - 0.5) * 0.5, (s - 0.5) * 0.2);
      } else {
        const side = i % 3 === 0 ? -1 : 1;
        pos.set(side * (width / 2 - 0.3), y, z);
        e.set(0, -side * (Math.PI / 2 - 0.35 - s * 0.3), 0);
      }
      q.setFromEuler(e);
      m.compose(pos, q, one);
      frags.setMatrixAt(i, m);
    }
    frags.instanceMatrix.needsUpdate = true;
  }
  group.add(frags);

  // ---- the motes: what is in the corridor's air, lit where the lamps
  // pool their light, drifting toward the absorbed clock, each with a
  // short trail of where it has just been. Kept in a reach ahead of the
  // camera and wrapped as they pass; drawn only in the absorbed pass.
  const motesDef = layer('motes');
  const moteCount = motesDef?.count ?? 0;
  const moteAhead = new Float32Array(moteCount);
  const moteX = new Float32Array(moteCount);
  const moteY = new Float32Array(moteCount);
  const motePhase = new Float32Array(moteCount);
  for (let i = 0; i < moteCount; i++) {
    moteAhead[i] = Math.random() * MOTE_REACH;
    moteX[i] = (Math.random() - 0.5) * (width - 0.3);
    moteY[i] = 0.3 + Math.random() * (height - 0.6);
    motePhase[i] = Math.random() * Math.PI * 2;
  }
  const motePos = new Float32Array(moteCount * 2 * 3);
  const moteTail = new Float32Array(moteCount * 2);
  for (let i = 0; i < moteCount; i++) moteTail[i * 2 + 1] = 1;
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  moteGeo.setAttribute('aTail', new THREE.BufferAttribute(moteTail, 1));
  const moteUniforms = {
    uInk: { value: new THREE.Color(INK) },
    uOn: { value: 0 },
    uLamp: { value: corridor.lamp },
    uDot: { value: 0 },
    uFog: { value: FOG },
  };
  const moteVertex = `
      attribute float aTail;
      uniform float uLamp, uDot;
      varying float vLit, vTail, vDepth;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        float c = 0.5 - 0.5 * cos(6.2831853 * world.z / uLamp);
        vLit = 0.15 + 0.85 * c * c;
        vTail = aTail;
        vec4 mvPosition = viewMatrix * world;
        vDepth = -mvPosition.z;
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = uDot * (1.0 - aTail);
      }`;
  const moteFace = `
      uniform vec3 uInk;
      uniform float uOn, uFog;
      varying float vLit, vTail, vDepth;`;
  const moteLineMat = new THREE.ShaderMaterial({
    uniforms: moteUniforms,
    vertexShader: moteVertex,
    fragmentShader: `${moteFace}
      void main() {
        gl_FragColor = vec4(uInk, vLit * (1.0 - vTail * 0.85) * exp(-vDepth * uFog) * 0.7 * uOn);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
  });
  const moteDotMat = new THREE.ShaderMaterial({
    uniforms: moteUniforms,
    vertexShader: moteVertex,
    fragmentShader: `${moteFace}
      void main() {
        if (vTail > 0.5) discard;
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float dot = 1.0 - smoothstep(0.6, 1.0, d);
        gl_FragColor = vec4(uInk, dot * vLit * exp(-vDepth * uFog) * uOn);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
  });
  const moteLines = new THREE.LineSegments(moteGeo, moteLineMat);
  const moteDots = new THREE.Points(moteGeo, moteDotMat);
  for (const m of [moteLines, moteDots]) {
    m.frustumCulled = false;
    m.visible = false;
    m.renderOrder = 3;
    group.add(m);
  }

  // ---- the cameras: one per clock, each standing in the corridor.
  const makeCam = () => {
    const c = new THREE.PerspectiveCamera(55, 1, 0.1, depth + 20);
    c.position.set(0, EYE, 0);
    c.lookAt(0, EYE, -1);
    return c;
  };
  const camWaiting = makeCam();
  const camAbsorbed = makeCam();

  // ---- the imagery, where the manifest has it: fetched once the opening
  // frame has its own, switched on only once every piece of a set has
  // arrived, so the corridor never shows half-drawn. Until then the
  // stand-in draws.
  const loader = new THREE.TextureLoader();
  const load = (path: string, wrap: THREE.Wrapping) =>
    opening.then(() => loader.loadAsync(`${import.meta.env.BASE_URL}${path}`)).then((tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = wrap;
      tex.wrapT = wrap;
      tex.anisotropy = 8;
      return tex;
    });
  if (corridor.images) {
    const { wall, ceiling, floor } = corridor.images;
    Promise.all([wall, ceiling, floor].map((path) => load(path, THREE.MirroredRepeatWrapping)))
      .then(([w, c, f]) => {
        uniforms.uWall.value = w;
        uniforms.uCeiling.value = c;
        uniforms.uFloor.value = f;
        uniforms.uImages.value = 1;
      })
      .catch(() => {});
  }
  if (fragment.atlas) {
    const { image, cols, rows, count } = fragment.atlas;
    load(image, THREE.ClampToEdgeWrapping)
      .then((tex) => {
        fragUniforms.uAtlas.value = tex;
        fragUniforms.uAtlasGrid.value.set(cols, rows, count);
        fragUniforms.uAtlasOn.value = 1;
      })
      .catch(() => {});
  }

  // ---- the labels, in the figure's overlay: the state of the ten minutes
  // across the top, and at the foot of each corridor, who is walking it,
  // on the HUD's own baseline.
  const svg = document.getElementById('figure') as SVGSVGElement | null;
  const labels = svg ? document.createElementNS(NS, 'g') : null;
  const text = (cls: string, anchor: string) => {
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('class', cls);
    t.setAttribute('text-anchor', anchor);
    labels?.appendChild(t);
    return t;
  };
  const stateEl = text('title', 'middle');
  const waitingEl = text('dim', 'middle');
  const absorbedEl = text('dim', 'middle');
  if (labels && svg) {
    labels.setAttribute('class', 'two-clocks');
    labels.style.opacity = '0';
    svg.appendChild(labels);
    waitingEl.textContent = tc.labels.waiting;
    absorbedEl.textContent = tc.labels.absorbed;
  }
  // ---- the waiting clock's one instrument: a seconds dial at the end
  // of its corridor — a ring of sixty hairline ticks, a hand in the
  // accent that jumps a second at a time, and the count so far beneath.
  // Drawn in the overlay at the waiting view's vanishing point.
  const dial = svg && tc.instrument ? document.createElementNS(NS, 'g') : null;
  const dialFace = document.createElementNS(NS, 'g');
  const dialRing = document.createElementNS(NS, 'circle');
  const dialTicks = document.createElementNS(NS, 'path');
  // The overlay's hairlines were drawn for the piece's near-black ground;
  // over a lit corridor they need what its text already has, a halo of
  // the ground beneath them. The halo is the same shapes, wider, under.
  const dialRingHalo = document.createElementNS(NS, 'circle');
  const dialTicksHalo = document.createElementNS(NS, 'path');
  const dialHand = document.createElementNS(NS, 'line');
  const dialPin = document.createElementNS(NS, 'circle');
  const dialCount = document.createElementNS(NS, 'text');
  let dialR = 0;
  if (dial && svg) {
    dial.setAttribute('class', 'two-clocks');
    dial.style.opacity = '0';
    for (const halo of [dialRingHalo, dialTicksHalo]) {
      halo.setAttribute('class', 'halo');
      halo.style.stroke = 'var(--figure-halo)';
      halo.style.strokeWidth = '3px';
    }
    for (const line of [dialRing, dialTicks]) line.style.stroke = 'var(--ink)';
    dialHand.setAttribute('class', 'now');
    dialPin.setAttribute('class', 'figure__marker--now');
    dialPin.setAttribute('r', '2');
    dialCount.setAttribute('class', 'title');
    dialCount.setAttribute('text-anchor', 'middle');
    dialFace.append(dialRingHalo, dialTicksHalo, dialRing, dialTicks, dialHand, dialPin);
    dial.append(dialFace, dialCount);
    svg.appendChild(dial);
  }
  const placeDial = () => {
    if (!dial || !tc.instrument) return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const cx = W / 4;
    const cy = H / 2;
    const r = (tc.instrument.size * H) / 2;
    dialFace.setAttribute('transform', `translate(${cx} ${cy})`);
    dialCount.setAttribute('x', String(cx));
    dialCount.setAttribute('y', String(cy + r + 24));
    if (r !== dialR) {
      dialR = r;
      dialRing.setAttribute('r', String(r));
      dialRingHalo.setAttribute('r', String(r));
      let d = '';
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * Math.PI * 2;
        const inner = r * (i % 5 === 0 ? 0.86 : 0.93);
        d += `M${(Math.sin(a) * inner).toFixed(1)} ${(-Math.cos(a) * inner).toFixed(1)}L${(Math.sin(a) * r).toFixed(1)} ${(-Math.cos(a) * r).toFixed(1)}`;
      }
      dialTicks.setAttribute('d', d);
      dialTicksHalo.setAttribute('d', d);
      dialHand.setAttribute('x1', '0');
      dialHand.setAttribute('y1', '0');
      dialHand.setAttribute('x2', '0');
      dialHand.setAttribute('y2', String(-r * 0.8));
    }
  };

  // ---- the survey: measurements called out over the absorbed view, a
  // marker at what is read, a leader, the reading. Each in its own
  // window, so the view thickens with noticing as the minutes pass.
  const surveyDef = layer('survey');
  const survey = svg && surveyDef ? document.createElementNS(NS, 'g') : null;
  const callouts = (surveyDef?.callouts ?? []).map((c) => {
    const g = document.createElementNS(NS, 'g');
    const mark = document.createElementNS(NS, 'circle');
    mark.setAttribute('class', 'figure__marker');
    mark.setAttribute('r', '2.5');
    const lead = document.createElementNS(NS, 'line');
    lead.style.stroke = 'var(--ink)';
    const leadHalo = document.createElementNS(NS, 'line');
    leadHalo.style.stroke = 'var(--figure-halo)';
    leadHalo.style.strokeWidth = '3px';
    const label = document.createElementNS(NS, 'text');
    g.append(leadHalo, lead, mark, label);
    g.style.opacity = '0';
    survey?.appendChild(g);
    label.textContent = c.text;
    return { def: c, g, mark, lead, leadHalo, label };
  });
  if (survey && svg) {
    survey.setAttribute('class', 'two-clocks');
    survey.style.opacity = '0';
    svg.appendChild(survey);
  }
  const placeSurvey = () => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    for (const c of callouts) {
      const x = W / 2 + c.def.at[0] * (W / 2);
      const y = c.def.at[1] * H;
      // The reading sits up and to the right of its mark, or the left
      // when the mark is near the right edge, with a short leader.
      const left = c.def.at[0] > 0.66;
      const dx = left ? -18 : 18;
      const lx = x + dx;
      const ly = y - 16;
      c.mark.setAttribute('cx', String(x));
      c.mark.setAttribute('cy', String(y));
      for (const l of [c.lead, c.leadHalo]) {
        l.setAttribute('x1', String(x));
        l.setAttribute('y1', String(y));
        l.setAttribute('x2', String(lx));
        l.setAttribute('y2', String(ly));
      }
      c.label.setAttribute('x', String(lx + (left ? -4 : 4)));
      c.label.setAttribute('y', String(ly - 4));
      c.label.setAttribute('text-anchor', left ? 'end' : 'start');
    }
  };

  const placeLabels = () => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const inset = Math.min(Math.max(24, W * 0.04), 64);
    stateEl.setAttribute('x', String(W / 2));
    stateEl.setAttribute('y', String(inset + 10));
    waitingEl.setAttribute('x', String(W / 4));
    waitingEl.setAttribute('y', String(H - inset));
    absorbedEl.setAttribute('x', String((3 * W) / 4));
    absorbedEl.setAttribute('y', String(H - inset));
  };

  // ---- per-frame state, read by render().
  const pass = {
    waiting: { z: 0, end: -depth },
    absorbed: { z: 0, end: -depth },
    bright: 0,
    show: 0,
    thermal: 0,
    motes: 0,
  };
  let lastNow = performance.now();
  let elapsed = 0;
  /** A layer's presence at this local progress: on over its window,
   *  easing at the edges. */
  const layerOn = (l: { from: number; to: number } | undefined, local: number) =>
    l ? smooth((local - l.from) / DIAL_EDGE) * (1 - smooth((local - l.to) / DIAL_EDGE)) : 0;

  function setActive(on: boolean): void {
    if (group.visible === on) return;
    group.visible = on;
    if (labels && svg) {
      labels.style.opacity = '0';
      if (!on) svg.style.opacity = '0';
    }
    if (dial) dial.style.opacity = '0';
    if (survey) survey.style.opacity = '0';
  }

  function update(local: number): void {
    if (!group.visible) return;
    const { turn, turnOver } = tc;
    const bay = corridor.bay;

    // The scene's own fade at its edges.
    const fadeIn = def.fadeIn ?? 0;
    const fadeOut = def.fadeOut ?? 0;
    const alpha = Math.min(fadeIn > 0 ? clamp01(local / fadeIn) : 1, fadeOut > 0 ? clamp01((1 - local) / fadeOut) : 1);

    // The turn: over `turnOver` of the scene, centred on `turn`, the
    // frame dips to black and the labels change. k runs 0 → 1 across it;
    // the world is at its darkest in the middle, and the cameras and
    // walls swap to their remembered state there, unseen.
    const t0 = turn - turnOver / 2;
    const t1 = turn + turnOver / 2;
    const k = clamp01((local - t0) / turnOver);
    const dip = 1 - smooth(1 - Math.abs(k - 0.5) / (0.5 - DIP_HOLD / 2));
    const remembered = k >= 0.5;

    // Travel, in each state: fraction of the way through the ten minutes
    // while it is happening, and through the looking back.
    const lived = smooth(clamp01(local / t0));
    const back = smooth(clamp01((local - t1) / (1 - t1)));

    if (!remembered) {
      pass.waiting.z = -waiting.livedBays * bay * lived;
      pass.waiting.end = -depth;
      pass.absorbed.z = -absorbed.livedBays * bay * lived;
      pass.absorbed.end = -depth;
      pass.show = 0;
    } else {
      // Looking back: the waiting corridor is a stub, its wall right
      // there, and there is nowhere to walk. The absorbed one is walked
      // its whole remembered length, past every fragment.
      pass.waiting.z = 0;
      pass.waiting.end = -waiting.rememberedBays * bay;
      pass.absorbed.z = -absorbed.rememberedBays * bay * back;
      pass.absorbed.end = -absorbed.rememberedBays * bay - bay;
      pass.show = smooth(clamp01((k - 0.5) / 0.5));
    }
    pass.bright = alpha * (reducedMotion ? (k > 0 && k < 1 ? 0.25 : 1) : dip);

    camWaiting.position.z = pass.waiting.z;
    camAbsorbed.position.z = pass.absorbed.z;

    // The dial: on for the window declared, counting the ten minutes as
    // they happen. The hand jumps whole seconds; scroll is what ticks it.
    if (dial && tc.instrument) {
      const inst = tc.instrument;
      const on = smooth((local - inst.from) / DIAL_EDGE) * (1 - smooth((local - inst.to) / DIAL_EDGE));
      placeDial();
      const seconds = Math.min(def.timeRate, Math.floor(clamp01(local / t0) * def.timeRate));
      dialHand.setAttribute('transform', `rotate(${(seconds % 60) * 6})`);
      const count = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
      if (dialCount.textContent !== count) dialCount.textContent = count;
      dial.style.opacity = String(alpha * on);
    }

    // The absorbed clock's layers, each on for its window.
    const now = performance.now();
    const dt = Math.min((now - lastNow) / 1000, 0.1);
    lastNow = now;
    if (!reducedMotion) elapsed += dt;
    pass.thermal = alpha * layerOn(thermalDef, local);
    uniforms.uThermalTime.value = elapsed;
    pass.motes = alpha * layerOn(motesDef, local);
    if (pass.motes > 0 && moteCount > 0) {
      const camZ = pass.absorbed.z;
      const back = MOTE_DRIFT * MOTE_TRAIL_S;
      for (let i = 0; i < moteCount; i++) {
        if (!reducedMotion) {
          moteAhead[i] -= MOTE_DRIFT * dt;
          if (moteAhead[i] < 0.5) moteAhead[i] += MOTE_REACH;
        }
        const sway = Math.sin(elapsed * 0.6 + motePhase[i]) * 0.08;
        const x = moteX[i] + sway;
        const y = moteY[i] + Math.cos(elapsed * 0.4 + motePhase[i]) * 0.05;
        const z = camZ - moteAhead[i];
        const o = i * 6;
        motePos[o] = x;
        motePos[o + 1] = y;
        motePos[o + 2] = z;
        motePos[o + 3] = x;
        motePos[o + 4] = y;
        motePos[o + 5] = z - back;
      }
      (moteGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    }
    if (survey) {
      placeSurvey();
      const on = alpha * layerOn(surveyDef, local);
      survey.style.opacity = String(on);
      for (const c of callouts) c.g.style.opacity = String(layerOn(c.def, local));
    }

    // The labels: the state across the top, crossfading at the turn.
    if (labels && svg) {
      placeLabels();
      const state = remembered ? tc.labels.remembered : tc.labels.lived;
      if (stateEl.textContent !== state) stateEl.textContent = state;
      const labelA = 1 - smooth(1 - Math.abs(k - 0.5) / 0.5);
      labels.style.opacity = String(alpha * labelA);
      svg.style.opacity = '1';
    }
  }

  const size = new THREE.Vector2();
  function render(renderer: THREE.WebGLRenderer): boolean {
    if (!group.visible) return false;
    renderer.getSize(size);
    const W = size.x;
    const H = size.y;
    const half = Math.floor(W / 2);
    const gutter = Math.round(GUTTER / 2);
    const aspect = Math.max(1, half - gutter) / Math.max(1, H);
    for (const c of [camWaiting, camAbsorbed]) {
      if (c.aspect !== aspect) {
        c.aspect = aspect;
        c.updateProjectionMatrix();
      }
    }

    renderer.setScissorTest(true);
    renderer.setClearColor(GROUND, 1);

    // Left: the waiting clock. Right: the absorbed one.
    const draw = (
      x: number,
      w: number,
      cam: THREE.PerspectiveCamera,
      p: { end: number },
      show: number,
      thermal: number,
      motes: number,
    ) => {
      uniforms.uEnd.value = p.end;
      uniforms.uBright.value = pass.bright;
      uniforms.uThermal.value = thermal;
      fragUniforms.uShow.value = show;
      fragUniforms.uBright.value = pass.bright;
      moteUniforms.uOn.value = motes * pass.bright;
      moteUniforms.uDot.value = MOTE_PX * Math.min(window.devicePixelRatio, 2);
      endWall.position.z = p.end;
      endWall.visible = p.end > -depth + 1;
      frags.visible = show > 0;
      moteLines.visible = motes > 0;
      moteDots.visible = motes > 0;
      renderer.setViewport(x, 0, w, H);
      renderer.setScissor(x, 0, w, H);
      renderer.render(world, cam);
    };
    draw(0, half - gutter, camWaiting, pass.waiting, 0, 0, 0);
    draw(half + gutter, W - half - gutter, camAbsorbed, pass.absorbed, pass.show, pass.thermal, pass.motes);

    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, W, H);
    return true;
  }

  return { setActive, update, render };
}
