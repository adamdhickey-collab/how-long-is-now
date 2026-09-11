/**
 * scene-08-two-clocks — the same ten minutes, walked twice.
 *
 * The second of the three moments, and the centrepiece: two views of one
 * walk side by side, one walked by someone waiting for the ten minutes
 * to end and one by someone absorbed in them. While it is happening the
 * waiting walk barely moves and the absorbed one races. Then the label
 * turns to LOOKING BACK, and the relationship reverses: the waiting walk
 * has collapsed to a stub with a thicket across it, and the absorbed one
 * has opened into dozens of fragments.
 *
 * The walk is the park's (18x). It used to be an office corridor, which
 * read as another project spliced into the piece; the park has the same
 * shape in it twice — the path along the shore, and the allée of elms,
 * which is a corridor made of trunks — so the corridor is now that: a
 * gravel path underfoot, an elm every bay on either hand whose crown
 * closes over it, the lake glimpsed between the trunks on one side and
 * the lawn on the other. The argument is untouched; only the building
 * is gone. Everything in it is drawn art, hung in the world at declared
 * sizes: the path is a tile, the elms and the thicket are cutouts that
 * turn to face whichever camera is looking, the sky a painted card
 * carried ahead, the lake and the far shore the painting's own.
 *
 * Nothing here decides *when*. The allée's size, the two clocks' travel,
 * the turn and the fragments are all declared in the manifest; this file
 * knows how to build the allée and how to read the declaration at a
 * given moment.
 *
 * The frame is split: one view rendered through the waiting clock's
 * camera, the other through the absorbed one's — side by side when the
 * frame is wider than it is tall, the waiting clock on the left; one
 * above the other when it is taller, the waiting clock on top. Both
 * cameras stand on the same path — it is one place, used twice — and
 * only what is true of each clock differs between the two passes: how
 * far along it stands, where its end is, whether the fragments are
 * there.
 */

import * as THREE from 'three';
import type { AbsorbedLayer, Scene, TwoClocks } from './manifest';
import { opening, plateUrl } from './loading';

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
/** Eye height on the path, world units. */
const EYE = 1.55;
/** The gap between the two views, CSS px, in the ground colour. */
const GUTTER = 2;
/** The sky's distance from the walker: a card carried with the camera,
 *  always this far ahead. It stands this many times the painted sky's
 *  own rise, so its edges are never in frame — past the painting its
 *  top and bottom rows hold. */
const SKY_AT = 300;
const SKY_SPAN = 6;

/** A view's place in the frame: CSS px from the frame's top-left. */
interface View {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Where each clock's view sits. Side by side when the frame is wider
 * than it is tall; stacked when it is taller — a phone held upright
 * cannot give two walks half its width each, but can give them half its
 * height, and a path reads as well down a frame as across one.
 * Everything drawn over a view — the dial, the survey, the labels — is
 * placed through this, so the two compositions share one code.
 */
function views(W: number, H: number): { stacked: boolean; waiting: View; absorbed: View } {
  const g = Math.round(GUTTER / 2);
  if (H > W) {
    const half = Math.floor(H / 2);
    return {
      stacked: true,
      waiting: { x: 0, y: 0, w: W, h: half - g },
      absorbed: { x: 0, y: half + g, w: W, h: H - half - g },
    };
  }
  const half = Math.floor(W / 2);
  return {
    stacked: false,
    waiting: { x: 0, y: 0, w: half - g, h: H },
    absorbed: { x: half + g, y: 0, w: W - half - g, h: H },
  };
}
/**
 * The afternoon's haze, per unit of depth: exponential, not squared, so
 * the allée softens from the first bay toward the sky's colour at the
 * horizon and dissolves rather than cutting off. Its end is never seen.
 */
const FOG = 0.0125;
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

// ----------------------------------------------------------------- the ground

/**
 * The ground is one plane drawn from its world position: the path tile
 * down the middle, its own grass carried out to either side, and past
 * the shore on the lake side, water. Light pools on it between one
 * tree's shade and the next, every `lamp`, so the walk keeps the rhythm
 * of rooms of light the corridor had — sun and shade now, not tubes.
 */
const groundVertex = `
  varying vec3 vWorld;
  varying float vDepth;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vec4 mvPosition = viewMatrix * world;
    vDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
  }`;

const groundFragment = `
  uniform vec3 uHaze, uGrass, uGravel, uWaterCol;
  uniform float uWidth, uTile, uGrassTile, uDappleTile, uLamp, uBright, uFog, uImages, uWaterFrom, uWaterTile;
  uniform sampler2D uPath, uGrassMap, uGrassShade, uDapple, uWater;
  varying vec3 vWorld;
  varying float vDepth;

  // How lit a point at depth z is: sun between one crown's shade and
  // the next, every uLamp, shade under each.
  float pool(float z) {
    float c = 0.5 - 0.5 * cos(6.2831853 * z / uLamp);
    return 0.9 + 0.1 * c * c;
  }
  // The shade a trunk casts at its own foot, so it stands on the grass
  // rather than in front of it: a pool at each rank, at each bay.
  float footShade(vec3 p, float halfW) {
    float across = exp(-pow((abs(p.x) - halfW) / 1.3, 2.0));
    float along = 0.5 + 0.5 * cos(6.2831853 * p.z / uLamp);
    return across * along;
  }
  void main() {
    vec3 p = vWorld;
    vec3 col;
    if (uImages > 0.5) {
      // The lawn, tiled both ways, lit through the painting's own light
      // on its own lawn: one grading of the grass for the sun on it and
      // one for the shade under the elms, mixed between by a map laid at
      // a size no bay repeats. The path is laid down the middle, its own
      // verges graded to this same grass so the join between them is
      // nowhere to be found; and it wanders a little as it goes, because
      // nothing in a park runs true for a hundred and sixty metres.
      float sun = texture2D(uDapple, p.xz / uDappleTile).r;
      sun = smoothstep(0.26, 0.74, sun);
      vec3 grass = mix(texture2D(uGrassShade, p.xz / uGrassTile).rgb, texture2D(uGrassMap, p.xz / uGrassTile).rgb, sun);
      float wander = sin(p.z * 0.074) * 0.22 + sin(p.z * 0.031 + 1.7) * 0.16;
      float across = p.x - wander;
      vec3 tile = texture2D(uPath, vec2(across / uTile + 0.5, p.z / uTile)).rgb;
      // The same light crosses the path: gravel in shade keeps its own
      // colour and loses a little of it, and cools.
      tile = mix(tile * vec3(0.80, 0.84, 0.93), tile, sun);
      float onPath = 1.0 - smoothstep(uTile * 0.5 - 1.2, uTile * 0.5, abs(across));
      col = mix(grass, tile, onPath);
      // The lake: water past the shore, a pale rim where they meet, the
      // rim the path's own gravel.
      // The shore is a curve, not a kerb: where the water begins moves
      // as it goes, or the lake reads as a road running beside the path.
      float shoreAt = uWaterFrom + sin(p.z * 0.21) * 0.7 + sin(p.z * 0.083 + 2.1) * 1.3;
      vec3 water = texture2D(uWater, p.xz / uWaterTile).rgb;
      vec3 rim = mix(texture2D(uPath, vec2(0.5, p.z / uTile)).rgb * vec3(0.84, 0.88, 0.95), texture2D(uPath, vec2(0.5, p.z / uTile)).rgb, sun);
      float shore = exp(-pow((p.x - shoreAt) / 0.45, 2.0));
      col = mix(col, rim, shore * 0.85);
      col = mix(col, water, smoothstep(shoreAt - 0.25, shoreAt + 0.35, p.x));
    } else {
      // Until the drawings have arrived: the same ground in flat colour.
      col = mix(uGrass, uGravel, 1.0 - smoothstep(uTile * 0.12, uTile * 0.13, abs(p.x)));
      col = mix(col, uWaterCol, smoothstep(uWaterFrom - 0.25, uWaterFrom + 0.35, p.x));
    }
    // The dapple is the elms': it fades off the ground past them, and
    // never lies on the water.
    float underElms = 1.0 - smoothstep(uWidth * 0.5 + 1.0, uWidth * 0.5 + 3.5, abs(p.x));
    col *= mix(1.0, pool(p.z), underElms);
    col *= 1.0 - 0.3 * footShade(p, uWidth * 0.5);
    col = mix(col, uHaze, 1.0 - exp(-vDepth * uFog));
    col *= uBright;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }`;

// ----------------------------------------------------------------- the plates

/**
 * Every drawn thing standing in the allée is a plate: a keyed cutout on
 * a quad, hazed with distance. Instanced plates — the trunks, the brush
 * — stand with their foot at the instance's origin, scaled by it, and
 * turn about that foot to face whichever camera is looking, so a trunk
 * passed at arm's length never thins to its edge. A plain plate (the
 * far shore, the thicket, the sky) is placed by its mesh.
 */
const plateVertex = `
  uniform vec2 uRepeat, uOffset;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = uv * uRepeat + uOffset;
    #ifdef STANDING
      // The foot is where the instance says, carried by the mesh's own
      // place — the stand of brush is moved to whichever end this pass
      // is looking at, and a standing plate must move with it.
      vec3 foot = (modelMatrix * vec4(instanceMatrix[3].xyz, 1.0)).xyz;
      float sx = instanceMatrix[0][0];
      float sy = instanceMatrix[1][1];
      vec2 toCam = cameraPosition.xz - foot.xz;
      float yaw = atan(toCam.x, toCam.y);
      vec2 q = vec2(position.x * sx, position.y * sy);
      vec4 world = vec4(foot + vec3(cos(yaw) * q.x, q.y, -sin(yaw) * q.x), 1.0);
    #else
      vec4 world = modelMatrix * vec4(position, 1.0);
    #endif
    vec4 mvPosition = viewMatrix * world;
    vDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
  }`;

const plateFragment = `
  uniform sampler2D uMap;
  uniform vec3 uHaze;
  uniform float uBright, uFog;
  uniform vec2 uFade;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vec4 t = texture2D(uMap, vUv);
    // A plate that runs away down the walk — the far shore beside it —
    // is given a distance to end at. Without one its crowns collapse
    // into a picket fence at the vanishing point, since a wall seen
    // almost edge-on is a thousand metres of painting in ten pixels.
    if (uFade.y > 0.0) t.a *= 1.0 - smoothstep(uFade.x, uFade.x + uFade.y, vDepth);
    // The plates' own soft edge is kept and handed to the sampler as
    // coverage (18x): a leaf ends the way it was painted rather than on
    // whatever contour a threshold happens to cut. Only what is paper
    // is thrown away.
    if (t.a < 0.03) discard;
    vec3 col = mix(t.rgb, uHaze, 1.0 - exp(-vDepth * uFog));
    gl_FragColor = vec4(col * uBright, t.a);
    #include <colorspace_fragment>
  }`;

/** The sky: a card carried ahead of the camera, the painting's zenith
 *  over its horizon, the horizon the haze everything else dissolves to. */
const skyVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  }`;
const skyFragment = `
  uniform vec3 uZenith, uHorizon;
  uniform float uBright, uHas, uSpan, uAcross;
  uniform sampler2D uMap;
  varying vec2 vUv;
  void main() {
    // The painted sky, its foot on the horizon at the card's middle and
    // its own rows holding above and below — the card reaches well past
    // the frame in every direction, so nothing is ever seen past it.
    // Until it has arrived, the afternoon's two colours in its place.
    float t = clamp((vUv.y - 0.5) * uSpan, 0.0, 1.0);
    vec3 col = mix(uHorizon, uZenith, pow(t, 0.75));
    if (uHas > 0.5) {
      // Below the horizon the painting has nothing to say, and its
      // bottom row held there would stretch its own grain into a picket
      // fence along the skyline; the card holds the haze instead, which
      // is what the ground dissolves into anyway.
      col = mix(uHorizon, texture2D(uMap, vec2(vUv.x * uAcross, t)).rgb, smoothstep(0.0, 0.035, t));
    }
    gl_FragColor = vec4(col * uBright, 1.0);
    #include <colorspace_fragment>
  }`;

/**
 * A fragment: a pane hung in the allée, a hairline of ink around a
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

/** A deterministic hash in [0, 1): the same allée every visit. */
const hash = (n: number) => {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};

// ------------------------------------------------------------------ scene

export function createTwoClocksScene(world: THREE.Scene, def: Scene, reducedMotion: boolean): TwoClocksScene {
  const declared = def.twoClocks;
  if (!declared) return { setActive: () => {}, update: () => {}, render: () => false };
  const tc: TwoClocks = declared;
  const { corridor, waiting, absorbed, fragment } = tc;
  const { width, height, depth } = corridor;
  const plates = corridor.plates;
  const sky = corridor.sky;
  const { images } = corridor;

  const group = new THREE.Group();
  group.name = 'two-clocks';
  group.visible = false;
  world.add(group);

  // ---- shared light: the haze everything dissolves to, and the dip.
  const haze = new THREE.Color(sky.horizon);
  const shared = {
    uHaze: { value: haze },
    uBright: { value: 1 },
    uFog: { value: FOG },
  };

  // ---- the ground: one plane, the path down its middle, running from
  // z = +bay (a little behind the camera's start) to -depth.
  // How far the allée is planted: not the declared depth but as far as
  // either clock actually walks (18ab). The absorbed one covers thirty
  // bays while it is happening and twenty more looking back, and past
  // the last tree it was walking an empty plain with a path on it.
  const walked = Math.max(absorbed.livedBays, absorbed.rememberedBays + 1, waiting.livedBays) * corridor.bay;
  const planted = Math.max(depth, walked + corridor.bay * 6);
  const zMid = (corridor.bay - planted) / 2;
  const run = planted + corridor.bay;
  const groundUniforms = {
    ...shared,
    uGrass: { value: new THREE.Color(sky.grass) },
    uGravel: { value: new THREE.Color(sky.gravel) },
    uWaterCol: { value: new THREE.Color(sky.water) },
    uWidth: { value: width },
    uTile: { value: plates.tile },
    uGrassTile: { value: plates.grass },
    uDappleTile: { value: plates.dapple },
    uLamp: { value: corridor.lamp },
    uImages: { value: 0 },
    uWaterFrom: { value: plates.water.from },
    uWaterTile: { value: plates.water.tile },
    uPath: { value: null as THREE.Texture | null },
    uGrassMap: { value: null as THREE.Texture | null },
    uGrassShade: { value: null as THREE.Texture | null },
    uDapple: { value: null as THREE.Texture | null },
    uWater: { value: null as THREE.Texture | null },
  };
  const groundMat = new THREE.ShaderMaterial({
    uniforms: groundUniforms,
    vertexShader: groundVertex,
    fragmentShader: groundFragment,
  });
  {
    // The ground reaches exactly to the far bank on either hand: past
    // it there would be water beyond the far shore, and a lake has to
    // stop where its trees stand.
    // The ground runs well past where the walk ends, so that its own
    // far edge is somewhere inside the haze rather than a line across
    // the frame.
    const far = run + 140;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(plates.shore.at * 2, far), groundMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, 0, (corridor.bay - planted - 140) / 2);
    m.frustumCulled = false;
    group.add(m);
  }

  // ---- the sky card, carried ahead of whichever camera is drawing.
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      uZenith: { value: new THREE.Color(sky.zenith) },
      uHorizon: { value: haze },
      uBright: shared.uBright,
      uHas: { value: 0 },
      uSpan: { value: SKY_SPAN },
      uAcross: { value: 1 },
      uMap: { value: null as THREE.Texture | null },
    },
    vertexShader: skyVertex,
    fragmentShader: skyFragment,
    depthWrite: false,
  });
  const skyCard = new THREE.Mesh(new THREE.PlaneGeometry(SKY_AT * 4, plates.sky * SKY_SPAN), skyMat);
  skyCard.renderOrder = -1;
  skyCard.frustumCulled = false;
  group.add(skyCard);

  // ---- the plates. Each material waits for its image; a plate with no
  // image yet is not drawn, so the allée fills in as its art arrives and
  // never shows a blank card.
  const plateMat = (standing: boolean) => {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        ...shared,
        uMap: { value: null as THREE.Texture | null },
        uFade: { value: new THREE.Vector2(0, 0) },
        uRepeat: { value: new THREE.Vector2(1, 1) },
        uOffset: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: plateVertex,
      fragmentShader: plateFragment,
      side: THREE.DoubleSide,
    });
    // Coverage, not blending: the frame is multisampled, so a plate's
    // soft edge can be dithered across the samples and still write depth
    // — which means the elms need no sorting against one another.
    mat.alphaToCoverage = true;
    if (standing) mat.defines = { STANDING: 1 };
    return mat;
  };
  /** A unit quad with its foot at the origin, for standing plates. */
  const footQuad = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);

  // The trunks: one every bay on either hand, two drawings between them,
  // each flipped, leaned and sized a little by its own hash so no two
  // bays are the same bay. The foot stands a little inside the declared
  // width so the root flare meets the grass beside the path.
  const kinds = Math.max(1, images?.trees.length ?? 2);
  const trunkMats = Array.from({ length: kinds }, () => plateMat(true));
  const trunkMeshes: THREE.InstancedMesh[] = [];
  {
    const bays = Math.ceil(run / corridor.bay) + 1;
    const placed: { mat: THREE.Matrix4; which: number }[] = [];
    const m = new THREE.Matrix4();
    for (let i = -1; i < bays; i++) {
      for (const side of [-1, 1]) {
        const seed = i * 4 + side + 2;
        const h0 = hash(seed);
        const h1 = hash(seed + 0.37);
        const h2 = hash(seed + 0.71);
        // Which drawing this elm is: the ranks step through the set out
        // of phase with each other, so the two sides never pair up.
        const which = (i * 2 + (side > 0 ? 1 : 0)) % kinds;
        const scale = plates.tree * (0.86 + 0.28 * h0);
        const flip = h1 < 0.5 ? -1 : 1;
        const x = side * (width / 2 + (h2 - 0.5) * 0.5);
        const z = -i * corridor.bay + (h0 - 0.5) * 0.8;
        m.makeScale(flip * scale, scale, 1);
        m.setPosition(x, -plates.sink, z);
        placed.push({ mat: m.clone(), which });
      }
    }
    trunkMats.forEach((mat, which) => {
      const mine = placed.filter((p) => p.which === which);
      const mesh = new THREE.InstancedMesh(footQuad, mat, mine.length);
      mine.forEach((p, i) => mesh.setMatrixAt(i, p.mat));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      mesh.visible = false;
      group.add(mesh);
      trunkMeshes.push(mesh);
    });
  }

  // The brush: the thicket drawing again, smaller, scattered over the
  // lawn on the side away from the lake.
  let thicketStanding = false;
  const brushMat = plateMat(true);
  const brush = (() => {
    const { brush: b } = plates;
    const count = Math.ceil(run / b.every);
    const mesh = new THREE.InstancedMesh(footQuad, brushMat, count);
    const m = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      const h0 = hash(i * 1.7 + 3);
      const h1 = hash(i * 2.3 + 5);
      const scale = b.height * (0.8 + 0.4 * h0);
      const x = -(b.from + (b.to - b.from) * h1);
      const z = corridor.bay - i * b.every - h0 * b.every * 0.6;
      m.makeScale(h1 < 0.5 ? -scale : scale, scale, 1);
      m.setPosition(x, -plates.sink, z);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.visible = false;
    group.add(mesh);
    return mesh;
  })();

  // The far shore: the painting's own treeline across the lake, standing
  // at the lake's far side, and the same trees behind the lawn on the
  // other hand with the water at their foot cut away.
  const shoreMat = plateMat(false);
  const lawnEdgeMat = plateMat(false);
  for (const mat of [shoreMat, lawnEdgeMat]) mat.uniforms.uFade.value.set(plates.shore.at * 0.9, plates.shore.at * 0.8);
  const shoreMeshes = [shoreMat, lawnEdgeMat].map((mat, i) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    const side = i === 0 ? 1 : -1;
    mesh.rotation.y = -side * (Math.PI / 2);
    mesh.position.set(side * plates.shore.at, 0, zMid);
    mesh.frustumCulled = false;
    mesh.visible = false;
    group.add(mesh);
    return mesh;
  });

  // The thicket: what closes the waiting clock's stub, looking back. Not
  // a wall across the path but a stand of the same brush, several of it
  // side by side and stepped back, so the way ahead is grown over rather
  // than blocked off. Where the stand stands is set per pass.
  const thicketMat = plateMat(true);
  const thicket = (() => {
    const across = 5;
    const mesh = new THREE.InstancedMesh(footQuad, thicketMat, across);
    const m = new THREE.Matrix4();
    for (let i = 0; i < across; i++) {
      const h0 = hash(i * 3.1 + 11);
      const scale = plates.thicket * (0.85 + 0.35 * h0);
      const x = (i - (across - 1) / 2) * plates.thicket * 1.15;
      m.makeScale(h0 < 0.5 ? -scale : scale, scale, 1);
      m.setPosition(x, -plates.sink, (h0 - 0.5) * 1.6);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.visible = false;
    group.add(mesh);
    return mesh;
  })();

  // ---- the fragments: instanced panes along the absorbed walk's
  // remembered length, hung beside the trunks on alternate hands with
  // every third afloat over the path, each turned a little toward the
  // walker.
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
        // Afloat: across the path, facing the walker, drifted aside.
        pos.set((s - 0.5) * 0.9, y, z);
        e.set(0, (s - 0.5) * 0.5, (s - 0.5) * 0.2);
      } else {
        const side = i % 3 === 0 ? -1 : 1;
        pos.set(side * (width / 2 - 0.6), y, z);
        e.set(0, -side * (Math.PI / 2 - 0.35 - s * 0.3), 0);
      }
      q.setFromEuler(e);
      m.compose(pos, q, one);
      frags.setMatrixAt(i, m);
    }
    frags.instanceMatrix.needsUpdate = true;
  }
  group.add(frags);

  // ---- the motes: what is in the air under the elms, lit where the sun
  // comes through, drifting toward the absorbed clock, each with a short
  // trail of where it has just been. Kept in a reach ahead of the camera
  // and wrapped as they pass; drawn only in the absorbed pass.
  const layers = absorbed.layers ?? [];
  const layer = (kind: AbsorbedLayer['kind']) => layers.find((l) => l.kind === kind);
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

  // ---- the cameras: one per clock, each standing on the path.
  const makeCam = () => {
    const c = new THREE.PerspectiveCamera(55, 1, 0.1, SKY_AT + 100);
    c.position.set(0, EYE, 0);
    c.lookAt(0, EYE, -1);
    return c;
  };
  const camWaiting = makeCam();
  const camAbsorbed = makeCam();

  // ---- the imagery: fetched once the opening frame has its own, each
  // plate shown the moment its picture is here and sized from it — the
  // manifest declares one dimension of each, the drawing's proportions
  // give the other.
  const loader = new THREE.TextureLoader();
  const load = (path: string, wrapS: THREE.Wrapping, wrapT = wrapS, data = false) =>
    opening.then(() => loader.loadAsync(plateUrl(path))).then((tex) => {
      // A map that is read for its values rather than its colour must
      // not be decoded as a picture: the dapple's mid-grey is a mix, not
      // a tone, and sRGB decoding would pull it down to a fifth of it.
      tex.colorSpace = data ? THREE.NoColorSpace : THREE.SRGBColorSpace;
      tex.wrapS = wrapS;
      tex.wrapT = wrapT;
      // As much as the card will give, clamped on upload: the far shore
      // and the lake are read at a grazing angle, where too few taps
      // show as a picket fence along the horizon.
      tex.anisotropy = 16;
      return tex;
    });
  const aspectOf = (tex: THREE.Texture) => {
    const img = tex.image as { width: number; height: number };
    return img.width / img.height;
  };
  const quiet = () => {};
  if (images) {
    Promise.all(
      [images.path, images.grass, images.grassShade, images.dapple, images.water].map((path, i) =>
        load(path, THREE.RepeatWrapping, THREE.MirroredRepeatWrapping, i === 3),
      ),
    )
      .then(([p, g, gs, d, w]) => {
        groundUniforms.uPath.value = p;
        groundUniforms.uGrassMap.value = g;
        groundUniforms.uGrassShade.value = gs;
        groundUniforms.uDapple.value = d;
        groundUniforms.uWater.value = w;
        groundUniforms.uImages.value = 1;
      })
      .catch(quiet);
    images.trees.forEach((path, i) => {
      const mat = trunkMats[i % trunkMats.length];
      const mesh = trunkMeshes[i % trunkMeshes.length];
      load(path, THREE.ClampToEdgeWrapping)
        .then((tex) => {
          mat.uniforms.uMap.value = tex;
          // The unit quad is as wide as the drawing is, for its height.
          const a = aspectOf(tex);
          const m = new THREE.Matrix4();
          for (let k = 0; k < mesh.count; k++) {
            mesh.getMatrixAt(k, m);
            const sy = m.elements[5];
            const flip = Math.sign(m.elements[0]);
            m.elements[0] = flip * sy * a;
            mesh.setMatrixAt(k, m);
          }
          mesh.instanceMatrix.needsUpdate = true;
          mesh.visible = true;
        })
        .catch(quiet);
    });
    load(images.thicket, THREE.ClampToEdgeWrapping)
      .then((tex) => {
        const a = aspectOf(tex);
        thicketMat.uniforms.uMap.value = tex;
        const wide = (mesh: THREE.InstancedMesh) => {
          const m = new THREE.Matrix4();
          for (let k = 0; k < mesh.count; k++) {
            mesh.getMatrixAt(k, m);
            m.elements[0] = Math.sign(m.elements[0]) * m.elements[5] * a;
            mesh.setMatrixAt(k, m);
          }
          mesh.instanceMatrix.needsUpdate = true;
        };
        wide(thicket);
        brushMat.uniforms.uMap.value = tex;
        const m = new THREE.Matrix4();
        for (let k = 0; k < brush.count; k++) {
          brush.getMatrixAt(k, m);
          const sy = m.elements[5];
          m.elements[0] = Math.sign(m.elements[0]) * sy * a;
          brush.setMatrixAt(k, m);
        }
        brush.instanceMatrix.needsUpdate = true;
        brush.visible = true;
        thicketStanding = true;
      })
      .catch(quiet);
    load(images.sky, THREE.MirroredRepeatWrapping, THREE.ClampToEdgeWrapping)
      .then((tex) => {
        // As wide as the painted sky is for the rise it covers, walked
        // out and back enough times to reach past the frame's edges.
        const across = plates.sky * aspectOf(tex);
        const times = Math.ceil((SKY_AT * 2) / across);
        skyCard.geometry.dispose();
        skyCard.geometry = new THREE.PlaneGeometry(across * times, plates.sky * SKY_SPAN);
        skyMat.uniforms.uAcross.value = times;
        skyMat.uniforms.uMap.value = tex;
        skyMat.uniforms.uHas.value = 1;
      })
      .catch(quiet);
    load(images.shore, THREE.MirroredRepeatWrapping, THREE.ClampToEdgeWrapping)
      .then((tex) => {
        const a = aspectOf(tex);
        const h = plates.shore.height;
        shoreMeshes.forEach((mesh, i) => {
          const mat = mesh.material as THREE.ShaderMaterial;
          mat.uniforms.uMap.value = tex;
          // Behind the lawn the strip's foot — the far water — is cut.
          const cut = i === 0 ? 0 : plates.shore.waterRows;
          mat.uniforms.uRepeat.value.set(run / (h * a), 1 - cut);
          mat.uniforms.uOffset.value.set(0, cut);
          mesh.geometry.dispose();
          mesh.geometry = new THREE.PlaneGeometry(run, h * (1 - cut)).translate(0, (h * (1 - cut)) / 2, 0);
          mesh.visible = true;
        });
      })
      .catch(quiet);
  }
  if (fragment.atlas) {
    const { image, cols, rows, count } = fragment.atlas;
    load(image, THREE.ClampToEdgeWrapping)
      .then((tex) => {
        fragUniforms.uAtlas.value = tex;
        fragUniforms.uAtlasGrid.value.set(cols, rows, count);
        fragUniforms.uAtlasOn.value = 1;
      })
      .catch(quiet);
  }

  // ---- the labels, in the figure's overlay: the state of the ten minutes
  // across the top, and at the foot of each view, who is walking it, on
  // the HUD's own baseline.
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
  // of its walk — a ring of sixty hairline ticks, a hand in the accent
  // that jumps a second at a time, and the count so far beneath. Drawn
  // in the overlay at the waiting view's vanishing point.
  const dial = svg && tc.instrument ? document.createElementNS(NS, 'g') : null;
  const dialFace = document.createElementNS(NS, 'g');
  const dialRing = document.createElementNS(NS, 'circle');
  const dialTicks = document.createElementNS(NS, 'path');
  // The overlay's hairlines were drawn for the piece's near-black ground;
  // over the afternoon they need what its text already has, a halo of
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
    const v = views(window.innerWidth, window.innerHeight).waiting;
    // At the waiting view's vanishing point, sized to the view's height.
    const cx = v.x + v.w / 2;
    const cy = v.y + v.h / 2;
    const r = (tc.instrument.size * v.h) / 2;
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
    const v = views(window.innerWidth, window.innerHeight).absorbed;
    for (const c of callouts) {
      const x = v.x + c.def.at[0] * v.w;
      const y = v.y + c.def.at[1] * v.h;
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
    const { stacked, waiting: vw, absorbed: va } = views(W, H);
    stateEl.setAttribute('x', String(W / 2));
    stateEl.setAttribute('y', String(inset + 10));
    // Each clock's name at the foot of its own view: on the HUD's
    // baseline side by side; stacked, the waiting clock's sits just
    // above the gutter between them.
    waitingEl.setAttribute('x', String(vw.x + vw.w / 2));
    waitingEl.setAttribute('y', String(stacked ? vw.y + vw.h - 14 : H - inset));
    absorbedEl.setAttribute('x', String(va.x + va.w / 2));
    absorbedEl.setAttribute('y', String(H - inset));
  };

  // ---- per-frame state, read by render().
  const pass = {
    waiting: { z: 0, end: -depth },
    absorbed: { z: 0, end: -depth },
    bright: 0,
    show: 0,
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
    // ends swap to their remembered state there, unseen.
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
      // Looking back: the waiting walk is a stub, its thicket right
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
    pass.motes = alpha * layerOn(motesDef, local);
    if (pass.motes > 0 && moteCount > 0) {
      const camZ = pass.absorbed.z;
      const trail = MOTE_DRIFT * MOTE_TRAIL_S;
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
        motePos[o + 5] = z - trail;
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
    const { waiting: vw, absorbed: va } = views(W, H);
    const aspect = Math.max(1, vw.w) / Math.max(1, vw.h);
    for (const c of [camWaiting, camAbsorbed]) {
      if (c.aspect !== aspect) {
        c.aspect = aspect;
        c.updateProjectionMatrix();
      }
    }

    renderer.setScissorTest(true);
    renderer.setClearColor(GROUND, 1);
    shared.uBright.value = pass.bright;
    fragUniforms.uBright.value = pass.bright;

    // The waiting clock first (left, or top), then the absorbed one.
    const draw = (v: View, cam: THREE.PerspectiveCamera, p: { z: number; end: number }, show: number, motes: number) => {
      fragUniforms.uShow.value = show;
      moteUniforms.uOn.value = motes * pass.bright;
      moteUniforms.uDot.value = MOTE_PX * Math.min(window.devicePixelRatio, 2);
      // The stand of brush grows across the path at this clock's end;
      // the sky card is carried ahead of this clock's eye.
      thicket.position.set(0, 0, p.end);
      thicket.visible = p.end > -depth + 1 && thicketStanding;
      skyCard.position.set(0, EYE, p.z - SKY_AT);
      frags.visible = show > 0;
      moteLines.visible = motes > 0;
      moteDots.visible = motes > 0;
      // GL counts from the bottom; the view is placed from the top.
      renderer.setViewport(v.x, H - v.y - v.h, v.w, v.h);
      renderer.setScissor(v.x, H - v.y - v.h, v.w, v.h);
      renderer.render(world, cam);
    };
    draw(vw, camWaiting, pass.waiting, 0, 0);
    draw(va, camAbsorbed, pass.absorbed, pass.show, pass.motes);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, W, H);
    return true;
  }

  return { setActive, update, render };
}
