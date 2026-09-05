/**
 * The scene manifest.
 *
 * The entire experience is driven from this file — never from scattered
 * animation calls. Each scene declares what it owns: its scroll length,
 * its label, its text, and (as the project grows) its camera, assets,
 * audio state, shader state and transition.
 *
 * This is the contract that keeps the project buildable one bounded
 * scene at a time.
 */

// ---------------------------------------------------------------- types

/**
 * A parallax layer. The whole cheat, stated plainly: no depth maps and no
 * modelled forest — a few planes at honest distances, and a camera that
 * moves. Nearer plates slide faster than far ones and the eye supplies
 * the depth for free.
 */
export interface Plate {
  id: string;
  /** World z. The camera looks down −z, so further back is more negative. */
  z: number;
  /** World size of the plate. */
  width: number;
  height: number;
  /** World y of the plate's base — the waterline is y = 0. */
  baseY: number;
  /** 0–1: how deep in its own shadow the plate sits. Nearer is darker. */
  shade?: number;
  /**
   * 0–1: how much of the plate's height is its vegetated edge. The rest is
   * solid ground, which is what keeps a foreground bank from running out
   * from under the frame once the camera is looking down on it.
   */
  lip?: number;
  /**
   * Real imagery, when the plate has it: WebP with alpha, under
   * public/plates/, keyed by the season `name` it belongs to. A plate that
   * looks the same all year keys its one image `'*'`. Until every image a
   * plate declares has loaded, the procedural stand-in holds the frame.
   * An image plate carries its own colour: the season palette no longer
   * tints it, only night does.
   */
  images?: Record<string, string>;
  /**
   * How many times the image tiles across the plate's width, mirrored at
   * each seam so the join is invisible. For plates the camera stands
   * close to, where one frame of imagery is only a slice of the plate.
   */
  imageRepeat?: number;
}

/**
 * A season keyframe: how the world looks when this season is most itself.
 * Colours are packed 0xRRGGBB. The piece interpolates between keyframes,
 * so a season is a moment the year passes through, not a state it sits in.
 */
export interface Season {
  /** Where in the scene's local progress (0–1) this season peaks. */
  at: number;
  /** Names the keyframe. Not displayed — it exists so the data reads. */
  name: string;
  /** Sky gradient: zenith, then horizon. */
  skyZenith: number;
  skyHorizon: number;
  /** The air the whole scene sits in — drives fog and distance haze. */
  haze: number;
  /** The far treeline across the lake. */
  canopy: number;
  /** The near bank the camera rises from. */
  bank: number;
  water: number;
  sun: number;
  /** 0–1: how high the sun's arc rides. August high, January low. */
  sunHeight: number;
  /** 0–1: leaf density. Bloom, fill, turn, empty — the elms' whole year. */
  canopyFill: number;
  /** What is in the air, and how fast it falls: pollen, seeds, leaves, snow. */
  air: number;
  airFall: number;
  airCount: number;
}

/** A camera move, declared start to end across the scene's own progress. */
export interface CameraMove {
  from: { y: number; z: number; lookY: number };
  to: { y: number; z: number; lookY: number };
}

export interface Scene {
  /** Stable id — also the name used in asset folders and discussions. */
  id: string;
  /** The time-scale label shown in the HUD ("1 SECOND", "1 YEAR", …). */
  label: string;
  /** Scroll length in viewport-heights. Time is scroll; longer = slower. */
  lengthVh: number;
  /** Center-screen text, if the scene speaks. */
  caption?: string;
  /**
   * The span of simulated time the whole scene covers, in seconds. The
   * fixed clock reads it out; the world uses it to know what it is
   * showing. One second, ten minutes, a year, a lifetime.
   */
  timeRate: number;
  /** Where the camera travels while the scene runs. */
  camera?: CameraMove;
  /**
   * Set when the scene builds its own world. The placeholder particle
   * field stands down for any scene that declares plates.
   */
  plates?: Plate[];
  /**
   * The lake. It stops at the far shore rather than running to a true
   * horizon — otherwise distant water shows above the treeline once the
   * camera is high enough to look down on it.
   */
  water?: { width: number; depth: number; z: number };
  /**
   * What hangs in the air: pollen, seeds, leaves, snow. The volume sits
   * ahead of the camera — a mote on the lens reads as a second sun.
   */
  air?: {
    count: number;
    spread: number;
    height: number;
    depth: number;
    z: number;
    fall: number;
  };
  /** The density of the air itself. Distance haze is the scene's own. */
  fogDensity?: number;
  /**
   * How far above the waterline the sky reaches its zenith colour, as a
   * fraction of the sky plate's height. Small: the blue sits low and the
   * frame is mostly sky. Large: the whole visible band is horizon haze.
   */
  skyRamp?: number;
  /** Season keyframes, in progress order. */
  seasons?: Season[];
  /**
   * How many day/night cycles pass while the scene runs. A literal year
   * would strobe 365 times. Choreography over literalism.
   */
  dayCycles?: number;
  /**
   * Local progress the day is held at the opening afternoon before it
   * begins to turn — the same hold the first season gets, so the year
   * and the day start moving together. The cycles run in what remains.
   */
  dayHold?: number;
  /**
   * The share of each cycle spent in daylight. The sun's arc is warped so
   * the dark half of a real day squeezes into what is left: night as a
   * quick pass rather than a blackout. 0.5 is a literal day.
   */
  dayShare?: number;
  /** Local progress spent fading the scene's world in and out. */
  fadeIn?: number;
  fadeOut?: number;
}

// ---------------------------------------------------------------- scenes

/**
 * Scene 04's park is Lake Harriet, Minneapolis — chosen because it does
 * the whole year without being asked: elm canopy, a bandshell, a bike
 * path, and a lake that goes from swimmable to walked-on. The piece opens
 * at 4:17 on an August afternoon on its east bank.
 */
/** The four palettes the year passes through. */
type Palette = Omit<Season, 'at'>;

const LATE_SUMMER: Palette = {
  name: 'LATE SUMMER',
  skyZenith: 0x5a92bd,
  skyHorizon: 0xd8c9a8,
  haze: 0xa9a084,
  canopy: 0x2f4128,
  bank: 0x1b2418,
  water: 0x35566a,
  sun: 0xffe6b0,
  sunHeight: 0.78,
  canopyFill: 1,
  air: 0xe8e6e1,
  airFall: 0.12,
  airCount: 0.22,
};

const AUTUMN: Palette = {
  name: 'AUTUMN',
  skyZenith: 0x35648b,
  skyHorizon: 0xe0b884,
  haze: 0xb0906a,
  canopy: 0x8a5a24,
  bank: 0x2a2015,
  water: 0x344a58,
  sun: 0xffd79a,
  sunHeight: 0.5,
  canopyFill: 0.66,
  air: 0xc98f4a,
  airFall: 0.55,
  airCount: 0.7,
};

const WINTER: Palette = {
  name: 'WINTER',
  skyZenith: 0x24425f,
  skyHorizon: 0xa8b6c4,
  haze: 0x8fa1b2,
  canopy: 0x2c3238,
  bank: 0xc6ccd2,
  water: 0x6b7a86,
  sun: 0xdfe6ee,
  sunHeight: 0.2,
  canopyFill: 0.06,
  air: 0xe8e6e1,
  airFall: 1,
  airCount: 1,
};

const SPRING: Palette = {
  name: 'SPRING',
  skyZenith: 0x4e7ea8,
  skyHorizon: 0xd6d9c4,
  haze: 0xa8ae98,
  canopy: 0x4e6b34,
  bank: 0x2f3a20,
  water: 0x416274,
  sun: 0xffeec6,
  sunHeight: 0.6,
  canopyFill: 0.5,
  air: 0xd9e2c0,
  airFall: 0.28,
  airCount: 0.45,
};

/**
 * The year, as the scene passes through it. Late summer is held at the
 * start: you arrive in the season you were already sitting in, and only
 * then does it begin to turn. It closes on the same August it opened on.
 */
const lakeHarrietSeasons: Season[] = [
  { at: 0, ...LATE_SUMMER },
  { at: 0.12, ...LATE_SUMMER },
  { at: 0.32, ...AUTUMN },
  { at: 0.54, ...WINTER },
  { at: 0.78, ...SPRING },
  { at: 1, ...LATE_SUMMER },
];

export const scenes: Scene[] = [
  {
    id: 'scene-01-now',
    label: '1 SECOND',
    lengthVh: 150,
    timeRate: 1,
  },
  {
    id: 'scene-02-ten-minutes',
    label: '10 MINUTES',
    lengthVh: 150,
    timeRate: 600,
  },
  {
    id: 'scene-03-day',
    label: '1 DAY',
    lengthVh: 150,
    timeRate: 86_400,
  },
  {
    id: 'scene-04-year',
    label: '1 YEAR',
    lengthVh: 200,
    timeRate: 31_557_600,
    // The first rise: from the bench, up over the elms, the lake opening
    // out below. The park stops being a place you sit in.
    camera: {
      from: { y: 1.6, z: 16, lookY: 2.2 },
      to: { y: 9.5, z: 27, lookY: 5.4 },
    },
    plates: [
      { id: 'sky', z: -170, width: 620, height: 340, baseY: -90 },
      // 2918 × 480 strip: one generated panel per season, its own flanks
      // mirrored outward. The shoreline sits 15 px above the strip's foot.
      {
        id: 'canopy',
        z: -46,
        width: 171,
        height: 28,
        baseY: -1.9,
        shade: 0.16,
        images: {
          'LATE SUMMER': 'plates/scene-04/canopy-late-summer.webp',
          AUTUMN: 'plates/scene-04/canopy-autumn.webp',
          WINTER: 'plates/scene-04/canopy-winter.webp',
          SPRING: 'plates/scene-04/canopy-spring.webp',
        },
      },
      { id: 'far-bank', z: -40, width: 240, height: 6, baseY: -2.2, shade: 0.08, lip: 0.42 },
      // 1536 × 844, grass tips at the top edge, ground the rest of the way.
      // One frame of it is a quarter of the plate: mirrored four times
      // across, which puts the grass at about four units tall, and deep
      // enough that ground is still under the frame once the camera has
      // risen and looks down.
      {
        id: 'near-bank',
        z: 0,
        width: 110,
        height: 15,
        baseY: -14,
        shade: 0.25,
        lip: 0.16,
        images: { '*': 'plates/scene-04/near-bank-late-summer.webp' },
        imageRepeat: 4,
      },
    ],
    water: { width: 420, depth: 140, z: 28 },
    air: { count: 2600, spread: 90, height: 30, depth: 55, z: -18, fall: 3.2 },
    fogDensity: 0.006,
    skyRamp: 0.13,
    seasons: lakeHarrietSeasons,
    // One day per season. Twelve strobed: at a laptop viewport a full day
    // passed every 150 px of scroll, so a single flick swung the sky dark
    // and light several times. The day holds at 4:17 while August is
    // held, then turns with the year and comes back round to 4:17.
    dayCycles: 4,
    dayHold: 0.12,
    dayShare: 0.8,
    fadeIn: 0.035,
    fadeOut: 0.05,
  },
  {
    id: 'scene-05-lifetime',
    label: 'A LIFETIME',
    lengthVh: 200,
    timeRate: 2_524_608_000,
  },
  {
    id: 'scene-06-return',
    label: '',
    lengthVh: 100,
    caption: 'But that isn’t how you experienced it.',
    timeRate: 0,
  },
  {
    id: 'scene-07-attention',
    label: '1 SECOND',
    lengthVh: 150,
    timeRate: 0.1,
  },
  {
    id: 'scene-08-two-clocks',
    label: '10 MINUTES',
    lengthVh: 200,
    caption: 'Same ten minutes. Different time.',
    timeRate: 600,
  },
  {
    id: 'scene-09-memory-compression',
    label: '30 DAYS',
    lengthVh: 200,
    timeRate: 2_592_000,
  },
  {
    id: 'scene-10-return-to-now',
    label: '1 SECOND',
    lengthVh: 150,
    caption: 'The moment didn’t get longer.\nYou got closer.',
    timeRate: 1,
  },
];

export const totalLengthVh = scenes.reduce((sum, s) => sum + s.lengthVh, 0);

// ---------------------------------------------------------------- helpers

const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1);

/** Ease so seasons arrive rather than switch. */
const smoothstep = (t: number) => t * t * (3 - 2 * t);

/** Blend two packed 0xRRGGBB colours. */
export function mixHex(a: number, b: number, t: number): number {
  const k = clamp01(t);
  const r = Math.round(((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * k);
  const g = Math.round(((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * k);
  const l = Math.round((a & 255) + ((b & 255) - (a & 255)) * k);
  return (r << 16) | (g << 8) | l;
}

const mix = (a: number, b: number, t: number) => a + (b - a) * clamp01(t);

/** Locate the active scene and local progress (0–1) for a global progress. */
export function sceneAt(progress: number): { scene: Scene; local: number; index: number } {
  const target = clamp01(progress) * totalLengthVh;
  let passed = 0;
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    if (target <= passed + s.lengthVh || i === scenes.length - 1) {
      return { scene: s, local: (target - passed) / s.lengthVh, index: i };
    }
    passed += s.lengthVh;
  }
  return { scene: scenes[0], local: 0, index: 0 };
}

/**
 * How much of each named season is present at one point in the year, as
 * weights that sum to 1. This is what lets a plate with one image per
 * season cross-fade them by the same blend the palette already uses.
 */
export function seasonWeights(seasons: Season[], local: number): Record<string, number> {
  const t = clamp01(local);
  let i = 0;
  while (i < seasons.length - 2 && t > seasons[i + 1].at) i++;
  const a = seasons[i];
  const b = seasons[i + 1] ?? a;
  const span = b.at - a.at;
  const k = span > 0 ? smoothstep(clamp01((t - a.at) / span)) : 0;
  const weights: Record<string, number> = {};
  weights[a.name] = (weights[a.name] ?? 0) + (1 - k);
  weights[b.name] = (weights[b.name] ?? 0) + k;
  return weights;
}

/**
 * The year, read at one point in its passage. Interpolates between the
 * declared season keyframes so the world is only ever *between* seasons —
 * which is the whole claim of the scene.
 */
export function seasonAt(seasons: Season[], local: number): Season {
  const t = clamp01(local);
  let i = 0;
  while (i < seasons.length - 2 && t > seasons[i + 1].at) i++;
  const a = seasons[i];
  const b = seasons[i + 1] ?? a;
  const span = b.at - a.at;
  const k = span > 0 ? smoothstep(clamp01((t - a.at) / span)) : 0;

  return {
    at: t,
    name: k < 0.5 ? a.name : b.name,
    skyZenith: mixHex(a.skyZenith, b.skyZenith, k),
    skyHorizon: mixHex(a.skyHorizon, b.skyHorizon, k),
    haze: mixHex(a.haze, b.haze, k),
    canopy: mixHex(a.canopy, b.canopy, k),
    bank: mixHex(a.bank, b.bank, k),
    water: mixHex(a.water, b.water, k),
    sun: mixHex(a.sun, b.sun, k),
    sunHeight: mix(a.sunHeight, b.sunHeight, k),
    canopyFill: mix(a.canopyFill, b.canopyFill, k),
    air: mixHex(a.air, b.air, k),
    airFall: mix(a.airFall, b.airFall, k),
    airCount: mix(a.airCount, b.airCount, k),
  };
}
