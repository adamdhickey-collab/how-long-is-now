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

/** 4:17pm as a fraction of the day — where the piece begins, and where
 *  reduced motion parks the sun instead of cycling it. */
const AFTERNOON = 0.678;

/** Night, borrowed from the piece's own ground so the world falls back to
 *  the colour the HUD already sits on. */
const NIGHT_SKY = 0x05070c;
const NIGHT_HORIZON = 0x0a0d14;
const NIGHT_LAND = 0x090b0d;
const NIGHT_WATER = 0x080a0e;
const NIGHT_HAZE = 0x070910;

const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1);
const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

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
  /** local: 0–1 through the scene. dt: seconds since the last frame. */
  update(local: number, dt: number): void;
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

  const group = new THREE.Group();
  group.visible = false;
  world.add(group);

  // An inert scene rather than a crash if the manifest is incomplete.
  if (!seasons || !plates || !lake || !airDef) {
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

  // ---- sun: one soft disc, arcing.
  const sunTex = canvasTexture(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.11, 'rgba(255,255,255,0.96)');
    g.addColorStop(0.2, 'rgba(255,255,255,0.5)');
    g.addColorStop(0.44, 'rgba(255,255,255,0.16)');
    g.addColorStop(0.72, 'rgba(255,255,255,0.05)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
  const sunMat = new THREE.MeshBasicMaterial({
    map: sunTex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const sun = new THREE.Mesh(new THREE.PlaneGeometry(52, 52), sunMat);
  sun.renderOrder = -9;
  sun.name = 'sun';
  group.add(sun);

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
  ): ImagePlate | null {
    if (!p.images) return null;
    const loader = new THREE.TextureLoader();
    const layers: ImageLayer[] = [];
    const plate: ImagePlate = { layers, ready: false };
    Object.keys(p.images).forEach((key, i) => {
      const mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0 });
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
      uniform vec3 uWater, uHaze, uSun;
      uniform float uSunX, uSunElev, uFarZ, uTime, uOpacity;
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

  const imagePlates = [canopyImg, nearImg];
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
    if (!fog || !fogWas) return;
    if (!on) {
      fog.color.setHex(fogWas.color);
      fog.density = fogWas.density;
    } else if (def.fogDensity !== undefined) {
      fog.density = def.fogDensity;
    }
  }

  function update(local: number, dt: number): void {
    if (!group.visible) return;
    elapsed += dt;

    const s = seasonAt(seasons!, local);

    // Where the sun is. The day starts at the afternoon the piece opened
    // on, and with whole cycles ends there too. Reduced motion holds it
    // there rather than swinging the sky on the way through.
    const cycles = reducedMotion ? 0 : def.dayCycles ?? 0;
    const hold = def.dayHold ?? 0;
    const turned = hold < 1 ? Math.max(0, local - hold) / (1 - hold) : 0;
    // Scroll time runs evenly; sun time is warped so daylight takes the
    // share of each cycle the manifest asks for and night is what is left.
    // Sunrise is 0.25, sunset 0.75, in sun time.
    const dayShare = Math.min(Math.max(def.dayShare ?? 0.5, 0.05), 0.95);
    const toSun = (t: number) => {
      const u = (t - 0.25 + 1) % 1;
      const q = u < dayShare ? (u / dayShare) * 0.5 : 0.5 + ((u - dayShare) / (1 - dayShare)) * 0.5;
      return (q + 0.25) % 1;
    };
    const toScroll = (q: number) => {
      const v = (q - 0.25 + 1) % 1;
      const u = v < 0.5 ? (v / 0.5) * dayShare : dayShare + ((v - 0.5) / 0.5) * (1 - dayShare);
      return (u + 0.25) % 1;
    };
    const phase = cycles > 0 ? toSun((toScroll(AFTERNOON) + turned * cycles) % 1) : AFTERNOON;
    const angle = (phase - 0.25) * Math.PI * 2;
    const elev = Math.sin(angle) * s.sunHeight;
    // The arc runs right to left across the western sky, so the 4:17 sun
    // stands ahead and to the left — where the plates are lit from.
    const sunX = Math.cos(angle) * 96;
    const daylight = smoothstep(-0.12, 0.2, elev);

    // Everything the season declares, dimmed toward night.
    const skyZenith = mixHex(NIGHT_SKY, s.skyZenith, daylight);
    const skyHorizon = mixHex(NIGHT_HORIZON, s.skyHorizon, daylight);
    const haze = mixHex(NIGHT_HAZE, s.haze, daylight);
    const canopy = mixHex(NIGHT_LAND, s.canopy, 0.14 + 0.86 * daylight);
    const bank = mixHex(NIGHT_LAND, s.bank, 0.12 + 0.88 * daylight);
    const waterCol = mixHex(NIGHT_WATER, s.water, 0.16 + 0.84 * daylight);
    const airCol = mixHex(NIGHT_LAND, s.air, 0.2 + 0.8 * daylight);

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

    sun.position.set(sunX, elev * 104 + 5, skyDef!.z + 18);
    sunMat.color.setHex(s.sun);
    sunMat.opacity = alpha * smoothstep(-0.06, 0.16, elev);

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

    // Image plates carry their own colour; only night dims them. Every
    // active layer is opaque except the frontmost, which carries the
    // blend — so a cross-fade never lets the sky through the trunks.
    const nightTint = mixHex(NIGHT_LAND, 0xffffff, 0.14 + 0.86 * daylight);
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
        setTint(l.mat, nightTint, shade);
        l.mat.opacity = alpha * (w <= 0 ? 0 : i === front ? w : 1);
      });
    };
    setImage(canopyImg, canopyDef!.shade ?? 0);
    setImage(nearImg, nearBankDef!.shade ?? 0);

    setTint(airMat, airCol, 0);
    airMat.opacity = alpha * s.airCount;
    airMat.size = 0.05 + s.airFall * 0.07;

    if (fog) fog.color.setHex(haze);

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
