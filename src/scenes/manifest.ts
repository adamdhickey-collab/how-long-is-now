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
  /** 0–1: how much of the sky is cloud. Fair-weather cumulus in August,
   *  a stratus lid in January. */
  cloudCover: number;
  /** The cloud's sunward face, and the underside in its own shadow. */
  cloudLit: number;
  cloudShade: number;
  /** 0–1: leaf density. Bloom, fill, turn, empty — the elms' whole year. */
  canopyFill: number;
  /** What is in the air, and how fast it falls: pollen, seeds, leaves, snow. */
  air: number;
  airFall: number;
  airCount: number;
  /**
   * The prevailing wind: the bearing it blows from, degrees clockwise
   * from north, and its mean speed in metres per second. Approximate
   * monthly normals for Minneapolis–St Paul: southerly in late summer,
   * north-westerly from autumn through winter, strongest in spring.
   */
  windFrom: number;
  windSpeed: number;
  /**
   * Afternoon surface temperatures, degrees Celsius: the sunlit bank,
   * and the lake. Grass warms far past the air by mid-afternoon and the
   * water barely moves; in January both are the snow and the ice.
   */
  tempGround: number;
  tempWater: number;
}

/** A camera move, declared start to end across the scene's own progress. */
export interface CameraMove {
  from: { y: number; z: number; lookY: number };
  to: { y: number; z: number; lookY: number };
}

/**
 * A dated event in the park's year, for the ring of seasons to mark.
 * Month and day; the year is whichever the sun's record opens in.
 */
export interface YearMark {
  name: string;
  month: number;
  day: number;
}

/**
 * An instrument: one of the things normally invisible, drawn live over
 * the world (see DIRECTION.md). `flow` reads the wind on the water as
 * streamlines; `radar` reads the air into a small scope in the frame's
 * corner, a sweep lighting each mote and the short trail of where it has
 * been; `thermal` reads surface temperature; `ring` is the year as a
 * dial, the exposure filling it from the day the record opens, the
 * present as a tick, the scene's dated marks on its rim. Scroll switches
 * instruments on: each is on screen for a window
 * of the scene's local progress, easing in and out at its edges.
 */
export type InstrumentKind = 'flow' | 'radar' | 'thermal' | 'ring';

/**
 * Where an instrument that draws into a scope sits: which corner of the
 * frame, its diameter as a fraction of the frame's shorter edge, and how
 * far in from the corner's two edges as fractions of the frame's width
 * and height — the HUD's own insets, so the scope lines up with the
 * clock. Without one the instrument fills the frame, centred.
 */
export interface Scope {
  corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size: number;
  inset: { x: number; y: number };
}

export interface Instrument {
  kind: InstrumentKind;
  from: number;
  to: number;
  /** Seconds per revolution, for an instrument that sweeps. */
  period?: number;
  scope?: Scope;
  /**
   * The reading's own ramp, cold to hot, for an instrument that reads a
   * quantity as colour; and the values, in the quantity's units, at the
   * ramp's two ends. Thermal reads degrees Celsius.
   */
  ramp?: number[];
  range?: [number, number];
}

/**
 * A year of the sun at one clock time, as an observer on the ground
 * would record it. Every value is real: the place, the date, the clock.
 */
export interface SunRecord {
  /** Where the camera stands, degrees; east and north positive. */
  lat: number;
  lon: number;
  /** The day the record opens, as YYYY-MM-DD. The year matters only to
   *  the tenth of a degree; the day decides where on the figure it starts. */
  opens: string;
  /** The clock time held every day, as HH:MM, and the UTC offset it is
   *  read in. The offset is held too: a record that followed the clocks
   *  through daylight saving would break its figure in two. */
  clock: string;
  utcOffset: number;
  /**
   * Local progress the record is held at its opening day before the year
   * begins to turn — the same hold the first season gets, so the year and
   * the sun start moving together. The whole year runs in what remains.
   */
  hold: number;
  /**
   * The cheat, declared. The frame gives the sky a narrow band above the
   * elms, and the real figure — nearly forty degrees tall — would not fit
   * it. So the sky is seen through a wider lens than the ground: the
   * figure is scaled about its opening sun by `scale`, and that sun is
   * placed `altitude` degrees above the horizon and `west` degrees to the
   * left of due west. Shape, tilt, timing and direction are the real
   * ones; only the size and placement are chosen.
   */
  lens: { scale: number; altitude: number; west: number };
}

/**
 * A procedural cloud deck in front of the sky plate. A layer of noise,
 * read as a flat deck seen from below, that thickens toward the horizon
 * and thins overhead. Its cover and colour come from the season.
 */
export interface CloudDeck {
  /** The plane it is drawn on: world z, width, height, and base y. */
  z: number;
  width: number;
  height: number;
  baseY: number;
  /** How many cloud cells fit across the deck overhead. */
  scale: number;
  /** How far the field evolves across the scene's whole progress. Scroll
   *  is time: a year of weather passes as the runway is crossed. */
  churn: number;
  /** How far the field evolves per real second while you stand still.
   *  Zero under reduced motion. */
  drift: number;
  /** Sideways travel of the deck per unit of churn: the wind. */
  wind: number;
}

/**
 * Scene 08's corridor. Both clocks run down the same one — a long
 * institutional corridor, doors receding, a light in the ceiling every
 * few bays — because the point is that the ten minutes are identical and
 * only the time is different. World units; the camera stands at eye
 * height, halfway across, and looks down it.
 */
export interface Corridor {
  width: number;
  height: number;
  /** How far it runs before the fog takes it: as good as endless. */
  depth: number;
  /** Distance between doors, and between ceiling lights. */
  bay: number;
  lamp: number;
  /**
   * Real imagery, when the corridor has it: one bay of each surface,
   * seen flat, under public/plates/. The wall bay is `bay` wide by
   * `height` tall with its door in the middle; the ceiling and floor
   * bays are `lamp` long by `width` across. Each tiles along the
   * corridor, mirrored at every join. Until all three have loaded the
   * procedural stand-in holds the frame.
   */
  images?: { wall: string; ceiling: string; floor: string };
}

/**
 * One way ten minutes can go. `livedBays`: how far down the corridor the
 * camera travels while it is happening — a few bays for the one who is
 * waiting, so the same doors creep past forever, and a great many for
 * the one who is absorbed, so they race. `rememberedBays`: how long the
 * corridor is once looked back on — the waiting one collapses to a stub
 * with a wall across it; the absorbed one runs on, hung with fragments.
 */
export interface Clock {
  livedBays: number;
  rememberedBays: number;
}

/**
 * The two clocks: the centrepiece. Two views of one corridor, side by
 * side, labelled by the state of mind that walks each. Scroll is the ten
 * minutes; at `turn` the label changes from lived to remembered, the
 * frame dips to black for `turnOver` of the scene, and the corridors come
 * back at their remembered lengths. Every number here is choreography;
 * the scene module only draws it.
 */
/**
 * The one instrument the waiting clock has: a seconds dial hung at the
 * end of the corridor, the only thing there is to look at. Sixty ticks,
 * one hand that jumps a second at a time as the ten minutes pass, and
 * the count so far. `size` is its diameter as a fraction of the frame's
 * height; it is on screen for the window of local progress declared,
 * which is the lived half — looking back, the stub is bare of it too.
 */
export interface SecondsDial {
  kind: 'seconds';
  size: number;
  from: number;
  to: number;
}

/**
 * A measurement called out over the absorbed clock's view: what someone
 * absorbed in a corridor notices. `at` is where in the view it points,
 * as fractions of the view's width and height; the text is the reading.
 */
export interface SurveyCallout {
  text: string;
  at: [number, number];
  from: number;
  to: number;
}

/**
 * A layer the absorbed clock reads its corridor through while the ten
 * minutes are happening — every layer on, the way scene 04's park is
 * read through its instruments. `thermal` reads the surfaces' heat, in
 * degrees Celsius through the ramp; `motes` draws what is in the air,
 * lit by the lamps; `survey` calls out measurements. Each is on for its
 * window of local progress; all are the lived half, since looking back
 * the densities swap and the fragments take their place.
 */
export interface AbsorbedLayer {
  kind: 'thermal' | 'motes' | 'survey';
  from: number;
  to: number;
  /** Thermal: the ramp's colours, cold to hot, and its ends in °C. */
  ramp?: number[];
  range?: [number, number];
  /** Motes: how many. */
  count?: number;
  /** Survey: what is called out. */
  callouts?: SurveyCallout[];
}

export interface TwoClocks {
  corridor: Corridor;
  turn: number;
  turnOver: number;
  /** What the waiting clock stares at while it is happening. */
  instrument?: SecondsDial;
  labels: { lived: string; remembered: string; waiting: string; absorbed: string };
  waiting: Clock;
  /** The absorbed ten minutes break into this many fragments, looking
   *  back; while they happen, they are read through these layers. */
  absorbed: Clock & { fragments: number; layers?: AbsorbedLayer[] };
  /** A fragment's world size: a pane hung in the corridor, and the
   *  cutouts that go on the panes, packed into one atlas of `count`
   *  tiles, `cols` across by `rows` down. Without it the panes carry
   *  plain marks. */
  fragment: {
    width: number;
    height: number;
    atlas?: { image: string; cols: number; rows: number; count: number };
  };
}

/**
 * One month of scene 09's corridor: thirty days, each a pane of glass,
 * seen for the window of local progress declared. As the days pass the
 * panes recede one `spacing` apart and the eye pulls back from them; at
 * the month's end a month of the same day has aligned into what looks
 * like one thin sheet, and a month of different days has scattered —
 * every pane pushed and tilted by its own `scatter` — into a field that
 * makes the same thirty days look enormous. `readings` is what the
 * panes carry: one line, for every day the same; or one per day.
 */
export interface Month {
  id: string;
  label: string;
  from: number;
  to: number;
  scatter: { x: number; y: number; z: number; tilt: number };
  readings: string[];
}

/**
 * Scene 09: memory as a spatial material. The corridor floats in the
 * dark; the panes are its only matter. `eye` is where the month is
 * watched from — above the panes' axis by `y`, `z` in front of the first
 * day — `pull` how far it draws back over the month, and `fov` the lens
 * it watches through, in degrees. The lens is long: seen from far off
 * through a narrow field, thirty aligned panes flatten into what looks
 * like one sheet while staying large in the frame, and thirty scattered
 * ones spread across it. A dimension between the first pane and the
 * latest is drawn in the overlay and counts the days.
 */
export interface MemoryCorridor {
  days: number;
  spacing: number;
  pane: { width: number; height: number };
  eye: { y: number; z: number; pull: number; fov: number };
  months: Month[];
  dimension: { label: string };
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
  /** The window of local progress the caption is up for. Absent, the
   *  caption is up for the whole scene. */
  captionAt?: { from: number; to: number };
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
  /** The instruments this scene is read through, and when. */
  instruments?: Instrument[];
  /** The dated events of this place's year, for the ring to mark. */
  marks?: YearMark[];
  /**
   * The sun, photographed at the same clock time every day for a year.
   * Held to one time of day, the sun does not arc: it traces a figure of
   * eight on the sky — the analemma — high and to the right in June, low
   * and to the left in December, crossing itself in spring and autumn.
   * The scene computes the real one for this place and this clock, and
   * draws it through the lens below.
   */
  sun?: SunRecord;
  /** What the sky is doing above the sun. */
  clouds?: CloudDeck;
  /** Scene 08: the two clocks. A scene that declares this owns the world. */
  twoClocks?: TwoClocks;
  /** Scene 09: the memory corridor. Owns the world too. */
  memory?: MemoryCorridor;
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
/**
 * The four palettes the year passes through. Since the plates were
 * redrawn in the moodboards' style (assets/LEDGER.md, session 6) the
 * sky and water are graded to the boards: the zenith a saturated blue,
 * the water deep, the horizon still carrying the afternoon's warmth.
 * The canopy and bank colours only tint the procedural stand-ins now.
 */
type Palette = Omit<Season, 'at'>;

const LATE_SUMMER: Palette = {
  name: 'LATE SUMMER',
  skyZenith: 0x1d6cae,
  skyHorizon: 0x9dbfd0,
  haze: 0xa9a084,
  canopy: 0x2f4128,
  bank: 0x1b2418,
  water: 0x1f4f6e,
  sun: 0xffe6b0,
  cloudCover: 0.32,
  cloudLit: 0xfff3dc,
  cloudShade: 0x9099a3,
  canopyFill: 1,
  air: 0xe8e6e1,
  airFall: 0.12,
  airCount: 0.22,
  windFrom: 180,
  windSpeed: 3.8,
  tempGround: 32,
  tempWater: 24,
};

const AUTUMN: Palette = {
  name: 'AUTUMN',
  skyZenith: 0x2a5f95,
  skyHorizon: 0xc9b58f,
  haze: 0xb0906a,
  canopy: 0x8a5a24,
  bank: 0x2a2015,
  water: 0x28485f,
  sun: 0xffd79a,
  cloudCover: 0.5,
  cloudLit: 0xf7e2c4,
  cloudShade: 0x8a8279,
  canopyFill: 0.66,
  air: 0xc98f4a,
  airFall: 0.55,
  airCount: 0.7,
  windFrom: 315,
  windSpeed: 4.4,
  tempGround: 14,
  tempWater: 12,
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
  cloudCover: 0.78,
  cloudLit: 0xdde2e8,
  cloudShade: 0x7e8a96,
  canopyFill: 0.06,
  air: 0xe8e6e1,
  airFall: 1,
  airCount: 1,
  windFrom: 320,
  windSpeed: 4.5,
  tempGround: -6,
  tempWater: -1,
};

const SPRING: Palette = {
  name: 'SPRING',
  skyZenith: 0x3577ad,
  skyHorizon: 0xb3c9cf,
  haze: 0xa8ae98,
  canopy: 0x4e6b34,
  bank: 0x2f3a20,
  water: 0x2f5a74,
  sun: 0xffeec6,
  cloudCover: 0.46,
  cloudLit: 0xf6f2e6,
  cloudShade: 0x9ba2a8,
  canopyFill: 0.5,
  air: 0xd9e2c0,
  airFall: 0.28,
  airCount: 0.45,
  windFrom: 330,
  windSpeed: 5.2,
  tempGround: 16,
  tempWater: 8,
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
    // Twice the runway of the scenes around it: a year should take a
    // while, and at 200 a mouse wheel crossed a season in a few notches.
    lengthVh: 400,
    timeRate: 31_557_600,
    // The first rise: from the bench, up over the elms, the lake opening
    // out below. The park stops being a place you sit in. The gaze lifts
    // as the camera does — it ends level, not looking down — so the sun,
    // which is fixed to the sky and not to the ground, stays in the frame
    // for the whole year.
    camera: {
      from: { y: 1.6, z: 16, lookY: 3.0 },
      to: { y: 9.5, z: 27, lookY: 9.5 },
    },
    plates: [
      { id: 'sky', z: -170, width: 620, height: 340, baseY: -90 },
      // 2918 × 628 strip: one drawn panel per season, its own flanks
      // mirrored outward. The shoreline sits 14 px above the strip's foot.
      // The drawn elms fill more of their frame than the photographs did,
      // so the plate is taller than it was and narrower, keeping the
      // strip's own proportions: a tree is the shape it was drawn. It sits
      // a little lower too, its foot behind the far bank, so the crowns
      // stay under December's sun. 150 wide clears a 2:1 frame at the top
      // of the rise; wider screens see the strip's ends.
      {
        id: 'canopy',
        z: -46,
        width: 150,
        height: 32.3,
        baseY: -2.6,
        shade: 0.16,
        images: {
          'LATE SUMMER': 'plates/scene-04/canopy-late-summer.webp',
          AUTUMN: 'plates/scene-04/canopy-autumn.webp',
          WINTER: 'plates/scene-04/canopy-winter.webp',
          SPRING: 'plates/scene-04/canopy-spring.webp',
        },
      },
      // 1536 × 320, the waterline as a thin strip: riprap and reeds, one
      // frame mirrored forty times across, which keeps the reeds at reed
      // height against the elms and the bandshell — a fringe for
      // parallax, not a bank. Its rocks sit at the water, its foot just
      // below, where the lake covers it.
      {
        id: 'far-bank',
        z: -40,
        width: 240,
        height: 1.2,
        baseY: -0.2,
        shade: 0.08,
        lip: 0.42,
        images: {
          'LATE SUMMER': 'plates/scene-04/far-bank-late-summer.webp',
          AUTUMN: 'plates/scene-04/far-bank-autumn.webp',
          WINTER: 'plates/scene-04/far-bank-winter.webp',
          SPRING: 'plates/scene-04/far-bank-spring.webp',
        },
        imageRepeat: 40,
      },
      // 1536 × 884, grass tips at the top edge, ground the rest of the way.
      // One frame of it is a quarter of the plate: mirrored four times
      // across, which puts the grass at about four units tall, and deep
      // enough that ground is still under the frame once the camera has
      // risen and looks down.
      {
        id: 'near-bank',
        z: 0,
        width: 110,
        height: 15.8,
        baseY: -14,
        shade: 0.25,
        lip: 0.16,
        images: {
          'LATE SUMMER': 'plates/scene-04/near-bank-late-summer.webp',
          AUTUMN: 'plates/scene-04/near-bank-autumn.webp',
          WINTER: 'plates/scene-04/near-bank-winter.webp',
          SPRING: 'plates/scene-04/near-bank-spring.webp',
        },
        imageRepeat: 4,
      },
    ],
    water: { width: 420, depth: 140, z: 28 },
    air: { count: 2600, spread: 90, height: 30, depth: 55, z: -18, fall: 3.2 },
    fogDensity: 0.006,
    skyRamp: 0.13,
    seasons: lakeHarrietSeasons,
    // The instruments, in the order they come on: the wind read on the
    // water once the world has faded in, then the radar over the air as
    // the year begins to turn — pollen, then leaves, then snow — both
    // off before the world fades out.
    // The thermal ramp is the palette's own colours in temperature
    // order: the winter zenith, the summer lake, the autumn horizon's
    // sand, the August sun — over the span the banks and the water
    // actually cover in a year.
    instruments: [
      { kind: 'flow', from: 0.05, to: 0.94 },
      // The radar is a small scope tucked under the clock, in the band
      // of sky between it and the survey's horizon datum: a corner
      // instrument, not a veil.
      {
        kind: 'radar',
        from: 0.16,
        to: 0.92,
        period: 6,
        scope: { corner: 'top-right', size: 0.28, inset: { x: 0.04, y: 0.095 } },
      },
      {
        kind: 'thermal',
        from: 0.3,
        to: 0.9,
        ramp: [0x24425f, 0x35566a, 0xe0b884, 0xffe6b0],
        range: [-10, 36],
      },
      { kind: 'ring', from: 0.14, to: 0.95 },
    ],
    // The year's dated marks, for the ring. Ice-out is the Minnesota DNR's
    // median for Lake Harriet; freeze-up is when the lake typically
    // closes; leaf-out and leaf-fall are the elms', from Minnesota
    // phenology records. Approximate to the week.
    marks: [
      { name: 'LEAF FALL', month: 10, day: 25 },
      { name: 'ICE IN', month: 12, day: 5 },
      { name: 'ICE OUT', month: 4, day: 8 },
      { name: 'LEAF OUT', month: 5, day: 1 },
    ],
    // The sun at 4:17 every day for a year, from the east bank of Lake
    // Harriet. Held to Central Daylight Time all year, the way an analemma
    // photographer holds one time zone. Once August stops being held the
    // record opens, and it closes at 4:17 a year on. The real figure runs
    // from 9° up in December to 48° in June; the lens brings it into the
    // band of sky the elms leave, at a quarter size.
    sun: {
      lat: 44.9219,
      lon: -93.3072,
      opens: '2026-08-15',
      clock: '16:17',
      utcOffset: -5,
      hold: 0.12,
      lens: { scale: 0.3, altitude: 25.5, west: 10 },
    },
    // The deck sits just ahead of the sky and behind the sun's trail. A
    // year of weather passes in the scene; the field churns enough that
    // no cloud survives a season, and drifts a little on its own.
    clouds: { z: -158, width: 620, height: 250, baseY: 6, scale: 1.7, churn: 9, drift: 0.02, wind: 0.6 },
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
    captionAt: { from: 0.86, to: 1 },
    timeRate: 600,
    // The same ten minutes, walked twice. While it is happening the
    // waiting clock covers a bay and a half in the whole scene's first
    // half, the absorbed one thirty. Looking back, the waiting corridor
    // is a stub one bay long with a wall across it; the absorbed one runs
    // twenty bays hung with three dozen fragments. The turn is the exact
    // middle.
    twoClocks: {
      corridor: {
        width: 2.6,
        height: 2.7,
        depth: 160,
        bay: 4,
        lamp: 4,
        images: {
          wall: 'plates/scene-08/corridor-wall.webp',
          ceiling: 'plates/scene-08/corridor-ceiling.webp',
          floor: 'plates/scene-08/corridor-floor.webp',
        },
      },
      turn: 0.5,
      turnOver: 0.08,
      // The waiting clock's one instrument, up from the first bay until
      // the turn begins to dip.
      instrument: { kind: 'seconds', size: 0.3, from: 0.03, to: 0.46 },
      labels: {
        lived: 'WHILE IT WAS HAPPENING',
        remembered: 'LOOKING BACK',
        waiting: 'WAITING FOR IT TO END',
        absorbed: 'ABSORBED',
      },
      waiting: { livedBays: 1.5, rememberedBays: 1 },
      // The absorbed clock's layers come on one after another through
      // the lived half, so the view thickens with noticing, and all go
      // off as the turn begins to dip. Readings are a corridor's:
      // fluorescent tubes, their hum, the doors, the air, a walk.
      absorbed: {
        livedBays: 30,
        rememberedBays: 20,
        fragments: 36,
        layers: [
          { kind: 'thermal', from: 0.06, to: 0.46, ramp: [0x24425f, 0x35566a, 0xe0b884, 0xffe6b0], range: [16, 30] },
          { kind: 'motes', from: 0.1, to: 0.46, count: 700 },
          {
            kind: 'survey',
            from: 0.12,
            to: 0.46,
            callouts: [
              { text: 'LAMP · 2 × 32 W · 4100 K', at: [0.5, 0.12], from: 0.12, to: 0.46 },
              { text: 'HUM · 120 HZ · 38 DB', at: [0.76, 0.22], from: 0.16, to: 0.46 },
              { text: 'DOOR · 0.9 × 2.1 M · OAK VENEER', at: [0.13, 0.4], from: 0.2, to: 0.46 },
              { text: 'AIR · 0.2 M/S · TOWARD YOU · 21 °C', at: [0.5, 0.5], from: 0.24, to: 0.46 },
              { text: 'STEPS · 1.8 / S · 0.72 M', at: [0.5, 0.8], from: 0.28, to: 0.46 },
              { text: 'FLOOR · TERRAZZO · 19 °C', at: [0.26, 0.9], from: 0.32, to: 0.46 },
              { text: 'WALL · 22 °C · TWO COATS', at: [0.86, 0.58], from: 0.36, to: 0.46 },
            ],
          },
        ],
      },
      fragment: {
        width: 0.9,
        height: 1.2,
        atlas: { image: 'plates/scene-08/fragments.webp', cols: 6, rows: 3, count: 18 },
      },
    },
    fadeIn: 0.04,
    fadeOut: 0.03,
  },
  {
    id: 'scene-09-memory-compression',
    label: '30 DAYS',
    lengthVh: 200,
    timeRate: 2_592_000,
    // Two months, thirty days each, the same scroll for both so the
    // comparison is fair. The first is the same day thirty times and
    // aligns; the second is thirty different days and scatters. Between
    // them the frame dips to black and the label changes.
    memory: {
      days: 30,
      spacing: 0.2,
      pane: { width: 1.6, height: 1.1 },
      eye: { y: 0.45, z: 9, pull: 27, fov: 14 },
      months: [
        {
          id: 'same',
          label: 'A MONTH OF THE SAME DAY',
          from: 0.03,
          to: 0.46,
          scatter: { x: 0, y: 0, z: 0, tilt: 0 },
          readings: ['DESK · 4:17 · 21 °C · 6,204 STEPS'],
        },
        {
          id: 'vivid',
          label: 'A MONTH OF DIFFERENT DAYS',
          from: 0.54,
          to: 0.97,
          scatter: { x: 4, y: 2.4, z: 10, tilt: 30 },
          readings: [
            'NEW CITY · 7:50 · 12 °C · 14,210 STEPS',
            'TRAIN · 9:14 · 15 °C · 3,020 STEPS',
            'A NAME LEARNED · 4:17 · 19 °C · 8,900 STEPS',
            'WRONG TURN · 2:35 · 23 °C · 11,480 STEPS',
            'RAIN ALL DAY · 11:02 · 9 °C · 2,110 STEPS',
            'FIRST SWIM · 6:40 · 26 °C · 5,300 STEPS',
            'HARD NEWS · 8:21 · 17 °C · 4,760 STEPS',
            'LONG WALK · 3:05 · 20 °C · 22,640 STEPS',
            'BORROWED KITCHEN · 7:12 · 18 °C · 6,015 STEPS',
            'FOG · 6:58 · 8 °C · 7,340 STEPS',
            'AN ARGUMENT · 10:47 · 24 °C · 5,880 STEPS',
            'MARKET · 9:30 · 22 °C · 12,970 STEPS',
            'FIRST TRY · 5:15 · 16 °C · 3,410 STEPS',
            'HAIL · 1:20 · 4 °C · 6,650 STEPS',
            'OLD FRIEND · 8:05 · 21 °C · 9,180 STEPS',
            'LOST KEYS · 11:59 · 19 °C · 10,230 STEPS',
            'HIGH WIND · 2:44 · 13 °C · 7,890 STEPS',
            'A LETTER · 4:17 · 20 °C · 4,120 STEPS',
            'NIGHT BUS · 12:31 · 11 °C · 8,470 STEPS',
            'A DOG FOLLOWED US · 3:52 · 25 °C · 13,560 STEPS',
            'HEAT · 4:17 · 33 °C · 2,930 STEPS',
            'THE WRONG TRAIN · 8:44 · 14 °C · 9,730 STEPS',
            'SOMEONE SANG · 10:10 · 18 °C · 6,290 STEPS',
            'THUNDER · 5:33 · 22 °C · 3,870 STEPS',
            'A DOOR HELD OPEN · 9:03 · 17 °C · 11,140 STEPS',
            'A NEW WORD · 7:26 · 15 °C · 5,510 STEPS',
            'FLOOD WARNING · 6:12 · 10 °C · 4,980 STEPS',
            'A LONG DINNER · 8:58 · 23 °C · 7,060 STEPS',
            'SNOW IN APRIL · 7:41 · 1 °C · 6,720 STEPS',
            'HOME · 4:17 · 21 °C · 6,204 STEPS',
          ],
        },
      ],
      dimension: { label: 'DAYS' },
    },
    fadeIn: 0.03,
    fadeOut: 0.03,
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

/** Blend two bearings the short way round the compass. */
const mixBearing = (a: number, b: number, t: number) => {
  const d = ((((b - a) % 360) + 540) % 360) - 180;
  return (((a + d * clamp01(t)) % 360) + 360) % 360;
};

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
    cloudCover: mix(a.cloudCover, b.cloudCover, k),
    cloudLit: mixHex(a.cloudLit, b.cloudLit, k),
    cloudShade: mixHex(a.cloudShade, b.cloudShade, k),
    canopyFill: mix(a.canopyFill, b.canopyFill, k),
    air: mixHex(a.air, b.air, k),
    airFall: mix(a.airFall, b.airFall, k),
    airCount: mix(a.airCount, b.airCount, k),
    windFrom: mixBearing(a.windFrom, b.windFrom, k),
    windSpeed: mix(a.windSpeed, b.windSpeed, k),
    tempGround: mix(a.tempGround, b.tempGround, k),
    tempWater: mix(a.tempWater, b.tempWater, k),
  };
}
