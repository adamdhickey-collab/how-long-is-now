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
 * A window of a scene's progress something is there for, with the
 * distance it takes to arrive and to go. A plate or a sheet of figures
 * may declare several: the summer crowd is there at the year's opening
 * and again at its close. A window is fully gone at its own end, so one
 * meant to hold through the close runs a little past 1.
 */
export interface Window {
  from: number;
  to: number;
  edge: number;
}

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
  /** World x, for a plate that is one object rather than a whole band of
   *  scenery. The bands are centred and leave this alone. */
  x?: number;
  /**
   * The window of the scene's own progress the plate is present for,
   * with the distance it takes to arrive and to go. A plate that is one
   * season's object rather than a thing the year happens to declares it:
   * the bench is an August cutout, so it is there in the second the
   * piece sits in and gone by the time the year has turned.
   */
  present?: Window | Window[];
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
  /**
   * A picture drawn to tile, laid across the plate's quad this many times
   * rather than stretched over it once (18aj). The turf at our feet
   * covers twenty units of ground with one 1536-pixel drawing, so its
   * dots came out three times the size of the painting's and the foot of
   * the frame was the one place the world showed it was made of pictures.
   * Across only: down the quad the perspective does the compressing.
   */
  tile?: number | [number, number];
  /**
   * A lying plate that is part of the ground rather than a thing on it
   * (18ak): it draws with the ground, under everyone standing or sitting
   * on it. The turf at our feet is ordered by its own far edge like any
   * other lying plate, which put it in front of the nearest people and
   * cut a man off at the waist.
   */
  under?: boolean;
  /**
   * A plate that lies flat rather than standing: the ground itself, a
   * plane at baseY running from z to z + depth, its image tiled across
   * it both ways, mirrored at every seam. The lawn.
   */
  ground?: { depth: number; repeat: [number, number] };
  /**
   * Where the plate is in the reference painting (session 18): its box
   * as [x, y, w, h] in the painting's own pixels. The scene projects the
   * box through the seat's camera onto the plate's plane, so from the
   * seat the plate lands where the painting had it, to the pixel, and
   * from anywhere else it is a thing at an honest distance. A plate
   * with a `ref` derives its width, height, x and baseY; the ones it
   * declares are ignored.
   */
  ref?: [number, number, number, number];
  /**
   * A plate placed in the world instead of projected from the painting
   * (18t): the boughs overhead, the trunks either side and the grass at
   * our feet, which the pull-back reveals. `x`, `y`, `z` are the quad's
   * centre and `w`, `h` its size in world units — for a `lay` plate, `h`
   * is its depth and `y` the ground it lies on. `flip` mirrors it in u;
   * `u` runs the texture more than once across it, mirrored at each
   * whole number, so a wide plate is not one stretched image.
   */
  world?: { x: number; y: number; z: number; w: number; h: number; flip?: boolean; u?: [number, number] };
  /**
   * How tall the plate really is, in world units (18u). A figure the
   * painting does not have is drawn at whatever size its own picture
   * came out, and fitting it into a box borrowed from an element of the
   * same stance made its height depend on the shape of the image rather
   * than on the person: joggers came out a head shorter than the
   * painting's jogger, picnickers a head taller than its picnickers.
   * With `tall` the plate is a plain quad of that height standing at the
   * box's foot, its width from the image, so a standing adult is a
   * standing adult wherever the lapse puts them. The painting's own
   * elements never take it: they are the painting, to the pixel.
   * (An adult standing is 1.5; sitting about 1.0; a child 1.1–1.25.)
   */
  tall?: number;
  /**
   * A plate painted at stages around the year (18v), in place of one
   * picture per season: `at` is where in the scene the stage stands, 0
   * to 1, and the plate mixes the two stages the year stands between in
   * a single draw. The elms and the boughs use it, because a canopy
   * turning is a slow thing with more than four states in it, and
   * because two cut-outs cannot cross-fade by opacity.
   */
  stages?: { at: number; image: string }[];
  /**
   * Beyond the seat's frame (18t): nothing at the seat, arriving as the
   * eye leaves it — `from` is the camera height it starts at and `over`
   * how far it takes — and gone again with the elms as the eye rises,
   * since a bough overhead is only overhead while we are under it.
   */
  beyond?: { from: number; over: number; exceptSeason?: string };
  /** Drawn over the painting whatever its distance (18y): the lifetime's
   *  own picture is a long way off, so that the camera's rise barely
   *  moves it, but it has to cover the seat's plates rather than sit
   *  behind them. */
  front?: boolean;
  /** Never drawn on its own account (18y): a plate the painting does not
   *  have until a later scene holds this world and reveals it. */
  hidden?: boolean;
  /** With `ref`: the plate lies on the ground (y = baseY) from the
   *  box's nearest row to its furthest, instead of standing at z. */
  lay?: boolean;
  /** With `ref`: the plate stands with its feet on the ground, so its
   *  z is found from the box's bottom row rather than declared. */
  feet?: boolean;
  /**
   * With `ref`, for an image that is one element redrawn whole where
   * the painting's frame cut it off: which side of the box to trust.
   * 'w' matches the width and hangs from the top (a figure cut by the
   * frame's foot); 'h' matches the height and keeps the right edge (one
   * cut by its left edge); the default fits the whole image inside the
   * box, standing on its bottom.
   */
  fit?: 'w' | 'h';
  /** Only real from the seat: fades as the camera rises, like the elms
   *  we sit under. */
  seat?: boolean;
  /**
   * What ground the element keeps to, for the time lapse (session 18k):
   * an element with a kind comes and goes on the world's clock and, each
   * time it comes, takes one of the spots its kind's elements stand on
   * in the painting. One without a kind stays where it was painted.
   */
  kind?: 'lawn' | 'path' | 'water';
  /** Not in the painting: arrives only once the time lapse is running,
   *  never in the first frame (session 18r). */
  later?: boolean;
}

/**
 * The time lapse (session 18k): people as stills that come and go on
 * the world's own clock rather than walkers animated in stride. Each
 * element's time is cut into slots of `dwell + gap` world seconds,
 * offset by its own phase; in a slot it is present with probability
 * `density`, at a spot of its kind chosen for that slot, arriving and
 * leaving over `edge` of its dwell. Scroll is the clock, so scrubbing
 * back shows the same afternoon again.
 */
export interface Lapse {
  /** How long a visitor stays, in the world's seconds. */
  dwell: number;
  /** How long their spot is empty after, in the world's seconds. */
  gap: number;
  /**
   * The dissolve in and out, as a fraction of the dwell. Small: at an
   * eighth, a third of everyone in the park is half-there at any moment
   * and the lawn reads as a crowd of ghosts (18af). Someone arriving
   * should be arriving, not fading up.
   */
  edge?: number;
  /** The chance a slot is taken, 0–1. */
  density?: number;
  /** At most this many visitors of a kind at once (session 18r). */
  cap?: Partial<Record<'lawn' | 'path' | 'water', number>>;
}

/**
 * People and boats: cutouts from one sheet, stood in the world. Each
 * placement stands one cell of the atlas on the ground at x, z, a
 * square `size` world units across with its feet at baseY. A placement
 * with a speed walks the span the sheet declares, in metres per second
 * of the world's real time, wrapping at the ends and facing the way it
 * goes; a negative speed walks left. The present window is the year's,
 * as a plate's: the people of one August are not there in the snow.
 */
export interface Figures {
  id: string;
  /** The sheet's cells, and how many frames each figure has in them: a
   *  figure with two is drawn in both phases of its stride, its second
   *  frame `count / frames` cells on from its first. */
  atlas: { image: string; cols: number; rows: number; count: number; frames?: number };
  size: number;
  baseY: number;
  places: { id: string; cell: number; x: number; z: number; size?: number; speed?: number; ride?: boolean }[];
  walk?: { from: number; to: number };
  present?: Window | Window[];
  /**
   * How the figures move where they are, so nobody is a statue. Sitters
   * breathe: the cutout rises and falls by this fraction over a few
   * seconds, and sways by this many degrees over ten. Walkers bob with
   * their stride — this much, in world units, at a walking pace, more
   * at a run — and lean into it by this many degrees; a placement that
   * rides rather than walks wobbles by this many degrees instead. Sails
   * heel by this many degrees. All in real time; stilled under reduced
   * motion.
   */
  life?: {
    breath?: number;
    sway?: number;
    bob?: number;
    lean?: number;
    wobble?: number;
    heel?: number;
    /**
     * Whether a sheet drawn in both phases of its stride steps: a walker
     * then advances one stride's length in the instant it swaps pose and
     * stands planted between, like a paper puppet, so a foot never
     * slides while it is down. Off, the figures glide as the cutouts
     * they are. Wheels and blades glide either way.
     */
    gait?: boolean;
  };
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

/**
 * A camera move, declared start to end across the scene's own progress,
 * or across the window `Scene.cameraAt` names. `ease` is how the move is
 * travelled: `linear` for a rise the scroll drives directly, `fall` for
 * one that gathers speed and lands gently — the return to the afternoon.
 */
export interface CameraMove {
  from: { y: number; z: number; lookY: number };
  to: { y: number; z: number; lookY: number };
  ease?: 'linear' | 'fall';
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
 * present as a tick, the scene's dated marks on its rim; `roots` cuts the
 * far shore open and draws the stand's roots as a network under it,
 * growing with the years and joining tree to tree; `leaf` reads one elm
 * leaf as the network it is, its venation drawn vein by vein and lit
 * node by node into a scope, across the instrument's window. Scroll switches
 * instruments on: each is on screen for a window
 * of the scene's local progress, easing in and out at its edges.
 */
export type InstrumentKind = 'flow' | 'radar' | 'thermal' | 'ring' | 'arc' | 'band' | 'rings' | 'roots' | 'leaf';

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
  /**
   * Seconds of the scene's own running time before the instrument comes
   * on, for a reading that is noticed rather than switched on: scroll
   * may sit still and the instrument still arrives. Under reduced motion
   * it is on from the start.
   */
  after?: number;
  /** How far the reading goes, 0–1, when fully on: 1 replaces the world
   *  with the reading, less leaves the world legible beneath it. */
  strength?: number;
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
  /** How far below the ground an instrument that draws underground
   *  reaches, in world units; and how many trees the stand it draws has. */
  depth?: number;
  stand?: number;
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
  /** Whether the record's trail — the figure of eight — is drawn across
   *  the sky. The sun moves either way. */
  trace?: boolean;
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
 * What a figure callout draws. Each kind is a drawing the scene knows how
 * to make from its own sun record; the manifest decides which appear and
 * when. The live kinds read the sun every frame; the event kinds anchor
 * to an instant the solar arithmetic finds — an equinox, a solstice, the
 * day the figure crosses itself.
 */
export type FigureKind =
  /** Top-left: the survey's header. Place, date, clock. Live. */
  | 'header'
  /** Top-left, under the header: the plan. A compass, the bench, the
   *  sightline to the sun swinging through its year. Live. */
  | 'plan'
  /** Bottom-right: the specimen block. Every measurement, live. */
  | 'specimen'
  /** The record itself as a hairline over the exposure, ticked by week
   *  and labelled by month. */
  | 'trace'
  /** The horizon through the lens: the datum every altitude is measured
   *  from, with compass bearings ticked along it. */
  | 'datum'
  /** A crosshair on today's sun, and its readout. The one use of the
   *  accent. Live. */
  | 'now'
  /** A dimension from the datum up to today's sun. Live. */
  | 'altitude'
  /** A dimension along the datum from due west to the sun's foot. Live. */
  | 'azimuth'
  /** The name of the figure. */
  | 'title'
  /** The sun crosses the equator, going south. */
  | 'equinox-autumn'
  /** The sundial runs furthest ahead of the clock. */
  | 'eot-fast'
  /** The low point. */
  | 'solstice-winter'
  /** The sundial runs furthest behind the clock. */
  | 'eot-slow'
  /** The sun crosses the equator, going north. */
  | 'equinox-spring'
  /** The figure crosses itself: two days, one place in the sky. */
  | 'node'
  /** The high point. */
  | 'solstice-summer'
  /** The figure's full width, dimensioned: the year's azimuth span. */
  | 'width'
  /** The figure's full height, dimensioned: the year's altitude span. */
  | 'height';

export interface FigureCallout {
  kind: FigureKind;
  /** The window of the scene's local progress this callout is on screen.
   *  It draws itself in over `Figure.enter` at the start and leaves over
   *  `Figure.exit` at the end. A kind may be declared more than once. */
  from: number;
  to: number;
}

/**
 * A drafting overlay on the scene: hairlines, dimensions, ticks and
 * monospace labels drawn in screen space over the world, measuring what
 * the world is doing in real units. Scroll is the exposure here too —
 * every callout is a timeline scrubbed by progress, so scrolling back
 * takes a measurement off the page the way it went on.
 */
export interface Figure {
  /** Local progress a callout spends drawing itself in, and leaving. */
  enter: number;
  exit: number;
  callouts: FigureCallout[];
}

/**
 * Scene 08's walk. Both clocks go down the same one — the elm allée
 * along the lake's shore, an elm every bay on either hand with its
 * crown closed overhead, the water glimpsed between the trunks — because the
 * point is that the ten minutes are identical and only the time is
 * different. (Until 18x this was a fluorescent office corridor, which
 * read as a different piece spliced into the park; the allée is the same
 * shape, and it is the park's.) World units; the camera stands at eye
 * height on the path and looks along it.
 */
export interface Corridor {
  /** How far apart the two ranks of trunks stand. */
  width: number;
  /** How high the crowns close over the path: what is hung in the
   *  allée — the motes, the fragments — is hung within it. */
  height: number;
  /** How far it runs before the haze takes it: as good as endless. */
  depth: number;
  /** Distance between trunks, and between one crown's shade and the next. */
  bay: number;
  lamp: number;
  /** The afternoon's own colours, for the sky above the allée and for
   *  the ground until its drawing has loaded. */
  sky: { zenith: number; horizon: number; grass: number; gravel: number; water: number };
  /** How big each drawing stands in the world. `tile` is the width of
   *  one square of path-and-verge, its path down the middle, laid over a
   *  lawn of `grass` squares, which is lit through a `dapple` square of
   *  the painting's own light; `tree` and
   *  `thicket` are heights; `brush` scatters the
   *  thicket drawing over the lawn between `from` and `to` out from the
   *  path, one every `every`; `shore` is the far treeline, `at` across
   *  the water and `height` tall, with `waterRows` of its foot — the far
   *  water — cut away where it stands behind the lawn instead; `water`
   *  begins `from` out from the path and tiles every `tile`. */
  plates: {
    tile: number;
    grass: number;
    dapple: number;
    tree: number;
    thicket: number;
    brush: { height: number; from: number; to: number; every: number };
    shore: { at: number; height: number; waterRows: number };
    water: { from: number; tile: number };
    /** How far the standing plates are set into the ground, so the rows
     *  taken off their feet by the cutter are under the grass. */
    sink: number;
    /** How far above the horizon the painted sky reaches, in world
     *  units at the card's distance; above and below it, its own top
     *  and bottom rows hold. */
    sky: number;
  };
  /**
   * The drawings, under public/plates/. `path` is the square tile of path
   * and verge, laid over the square `grass` tile that is the lawn — which is the
   * sunlit grading of one drawing, `grassShade` the shaded one, mixed
   * between by `dapple`, the light the painting has on its own lawn; the
   * `trees` are keyed cutouts standing on their feet, one drawing per
   * rank, taken in turn; `thicket` closes the waiting clock's stub and is scattered
   * as the brush; `shore` is the painting's own far treeline; `water`
   * is a tile of the lake; `sky` is the afternoon over all of it. Each is shown the moment it has arrived, so
   * the allée fills in rather than waiting on the slowest.
   */
  images?: {
    path: string;
    grass: string;
    grassShade: string;
    dapple: string;
    trees: string[];
    thicket: string;
    shore: string;
    water: string;
    sky: string;
  };
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
  /** The days' images, packed into one atlas of `count` square tiles,
   *  `cols` across. A month with fewer tiles than days reuses them in
   *  turn — which, for a month of the same day, is the point. Without
   *  an atlas the panes carry plain marks. */
  atlas?: { image: string; cols: number; rows: number; count: number };
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
  /** The window of local progress the camera move runs over. Absent, it
   *  runs the whole scene. Before and after, the camera holds at the
   *  move's two ends. */
  cameraAt?: { from: number; to: number };
  /**
   * A scene whose scale changes inside itself: each entry replaces the
   * HUD's label from its point in local progress onward. The outward
   * journey crosses a scene to change scale; the inward one subdivides
   * a single second without leaving it, and this is how it says so.
   */
  labelAt?: { from: number; label: string }[];
  /**
   * The window of local progress over which the interface itself leaves:
   * the scale label, the hint and the clock fade out and do not come
   * back. The piece's last gesture, and the only place it is declared —
   * a scene that ends the piece ends the HUD with it.
   */
  hudOut?: { from: number; to: number };
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
  /** The scene's own time lapse, when it runs the world's clock itself. */
  lapse?: Lapse;
  /**
   * The living painting (session 18n): the plates' dots wander and
   * flicker at this many frames a second, the figures breathe and sway,
   * the elms sway at the top, the water and lawn shimmer — one pulse for
   * the whole picture, scaled by `amount`. Off under reduced motion.
   */
  boil?: { fps: number; amount: number };
  /**
   * The grain (session 18o): one dot screen over every plate of the park
   * in screen space, dots `size` CSS pixels across, modulating luminance
   * by `amount` and casting each dot its own faint colour by `tint`. The
   * surface the people and the backdrop share. The lattice re-throws on
   * the boil's clock; still under reduced motion.
   */
  grain?: {
    size: number;
    amount: number;
    tint: number;
    /** Old film (18p): a fine grain per pixel by `noise`, and the exposure
     *  flickering by up to `flicker`, both re-thrown every frame. */
    film?: { noise: number; flicker: number };
  };
  /**
   * The painting the world is laid out from (session 18): the frame's
   * size in pixels, and the vertical field of view the seat's camera
   * sees it through when the viewport has the frame's shape. Plates
   * with a `ref` are placed by projecting their box through the
   * scene's opening camera; the renderer narrows the lens on wider
   * viewports so the frame always covers the view.
   */
  composition?: {
    frame: [number, number];
    fov: number;
    /**
     * The painting continued outward (session 18i): whole-frame layers
     * this size are the wide frame, with the painting's own pixel (0, 0)
     * at `origin` in them, so the ground, the water and the sky run on
     * past the frame the boxes are measured in.
     */
    wide?: { frame: [number, number]; origin: [number, number] };
    /**
     * Contact shadows (session 18q): a soft cool ellipse on the ground
     * under every standing element on the lawn or the path, its width the
     * element's, `depth` of that width deep, leaning `lean` of it to the
     * right as the painting's light falls, at `strength` in full sun and
     * fading with the light. The boats keep their painted reflections.
     */
    shadows?: { strength: number; lean: number; depth: number; color: number };
    /** Plates marked `seat` are whole until the camera's y reaches
     *  `until`, and gone `over` higher. */
    seatFade?: { until: number; over: number };
    /**
     * Where a visitor may stand (session 18r): foot points in the
     * painting's pixels, per kind of ground. The time lapse seats each
     * slot's visitors on distinct spots from these; the painting's own
     * people stand on their own feet in the first slot.
     */
    spots?: Record<'lawn' | 'path' | 'water', [number, number][]>;
    /**
     * The light of the day on the painting (session 18r): as the sun
     * sets, the sky goes from `dusk.zenith` overhead to `dusk.horizon`
     * at the treeline and the ground and water take `dusk.ground`; by
     * night the same three of `night`. The strength follows the real
     * sun's altitude. Colours packed 0xRRGGBB.
     */
    light?: {
      dusk: { zenith: number; horizon: number; ground: number };
      night: { zenith: number; horizon: number; ground: number };
      /**
       * The lowest sun altitude, in degrees, the light will read when
       * this scene runs on its own (18v) — so a year of afternoons stays
       * an afternoon whatever the real sun does at 4:17 in January. A
       * scene that holds this world declares its own darkness and is not
       * floored: the day is still allowed to end.
       */
      floor?: number;
    };
  };
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
  /** Who is in the world: sheets of cutouts, stood and walked. */
  figures?: Figures[];
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
  /** The survey drawn over the sun's record. */
  figure?: Figure;
  /** Scene 08: the two clocks. A scene that declares this owns the world. */
  twoClocks?: TwoClocks;
  /** Scene 09: the memory corridor. Owns the world too. */
  memory?: MemoryCorridor;
  /**
   * A scene that shows another scene's world, held at that scene's local
   * progress, seen through this scene's own camera and read through its
   * own instruments. The park at one second is the park of the year,
   * held at its opening frame: one world, declared once.
   */
  hold?: {
    of: string;
    at: number;
    /** The holder's own progress at which the world arrives. Before it
     *  there is nothing to see: the scene is its own black. */
    from?: number;
    /**
     * The span of the held world's own time this scene covers, in
     * seconds: scroll advances the world's clock through it, on top of
     * the real time that always passes. Ten minutes of the park: the
     * clouds drift, the air falls, the water moves, the sun creeps and
     * its shadows crawl, all under the visitor's hand.
     */
    seconds?: number;
    /** How far the cloud field evolves across the holder's span, in the
     *  deck's own units (the year's deck declares 9 for its whole run).
     *  Scroll runs it; the clouds are the one motion slow enough to. */
    churn?: number;
    /**
     * The holder's own lens on the sky, where the held world's would not
     * do: the year's lens keeps a figure of eight in the band above the
     * elms, and through it the sun could never set. A day needs one that
     * lets it. Same terms as the record's lens.
     */
    lens?: { scale: number; altitude: number; west: number };
    /**
     * The years the holder's span covers, for a hold that runs decades
     * rather than a day: the record stacks a figure per year into a band
     * (the instrument `band`), and an elm counts them as rings (`rings`).
     */
    years?: number;
    /** How much taller the elms stand at the end of the span, as a
     *  multiple of their height now: trees become enormous. */
    grow?: number;
    /**
     * Which of the world's walkers are on their way while this scene
     * holds it, by placement id; absent, all of them. The held second
     * has one jogger, so that one thing passing is what makes a second
     * feel inhabited.
     */
    life?: string[];
    /**
     * People become appearances. While this scene holds the world, its
     * figures are not there and then there and then gone: each shows for
     * `dwell` seconds every `period` seconds on its own count, snapping
     * in and fading out over `trace` seconds, walkers and sails at a
     * different point of their span each time rather than travelling;
     * by the end of the holder's span an appearance is `rarer` times
     * rarer than at its start. Appearances cast no shadow. Under reduced
     * motion every figure stands faint and still instead.
     */
    appearances?: { period: number; dwell: number; trace: number; rarer: number };
    /** The holder's time lapse, on the span of world time it covers. */
    lapse?: Lapse;
    /**
     * Plates this scene brings in on its own progress (18y), by id: from
     * this point, eased over `over`, and there for the rest of it, or
     * until `to` if it gives one — the day's night comes and goes. A
     * held world's own plate windows are frozen — the hold pins the year
     * at one instant — so anything that is to arrive while it is held
     * has to be the holder's own doing. The ending uses it for the three
     * things it notices.
     */
    reveal?: Record<string, { from: number; to?: number; over?: number } | { from: number; to?: number; over?: number }[]>;
  };
  /** Local progress spent fading the scene's world in and out. */
  fadeIn?: number;
  fadeOut?: number;
  /**
   * The viewer's own eye: one blink, so many seconds after the scene is
   * entered, the lids taking so long to close and to open. The small
   * life of a held second, and the one thing in the piece the viewer
   * does rather than watches. Under reduced motion the eye stays open.
   */
  blink?: { after: number; close: number; open: number };
  /**
   * A scene holding another's world can close the eye once in the middle
   * of itself (18y): over `over` of the scene, centred on `at`, the world
   * goes to black and comes back. The lifetime uses it to change what it
   * is looking at — the seat's park for the park seen from further back
   * — without dissolving one painting through another. More than one may
   * be declared (18ah): the eighty years blink twice, once to step back
   * and once to let the elms it is watching grow up.
   */
  dip?: { at: number; over: number } | { at: number; over: number }[];
  /**
   * The eye closing at the end (18y), and staying closed: the lids come
   * in from the frame's edges across this stretch of the scene, on the
   * scroll rather than on a clock, so the last thing the piece does is
   * the visitor's own. The piece used to stop by taking its interface
   * away and leaving the painting up, which is not an ending.
   */
  close?: { from: number; to: number };
  /**
   * The invitation: the HUD's hint arrives so many seconds after the
   * scene is entered rather than with the rest of the interface, so the
   * visitor is first left alone in the second — the blink, the first
   * reading — and only then told they may leave it. Under reduced
   * motion it is up from arrival. Only the opening scene has one.
   */
  hint?: { after: number };
  /**
   * A black scene: nothing is drawn, the placeholder field included.
   * The turn is one — the frame goes dark and a line is said in it.
   */
  black?: boolean;
  /**
   * What the scene shows, for whoever cannot see it: read into a hidden
   * live region as the scene is entered, the way the caption is spoken,
   * so the argument reaches a screen reader and not only the lines. A
   * scene whose picture changes inside itself replaces it from a point
   * in local progress, as `labelAt` does the label.
   */
  describe?: string;
  describeAt?: { from: number; text: string }[];
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

// Regraded 2026-09-08 to the pointillist park (ledger session 10): the
// sky a bright, pale-horizoned blue, the water cobalt, the haze a cool
// pale grey that the far shore dissolves into; winter's water is ice.
const LATE_SUMMER: Palette = {
  name: 'LATE SUMMER',
  skyZenith: 0x4f8ed6,
  skyHorizon: 0xd6e6f2,
  haze: 0xbfd0d8,
  canopy: 0x2f4128,
  bank: 0x1b2418,
  water: 0x3a80d2,
  sun: 0xffe6b0,
  cloudCover: 0.32,
  cloudLit: 0xfaf8f2,
  cloudShade: 0xb9c3d6,
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
  skyZenith: 0x4a86c6,
  skyHorizon: 0xe0dccc,
  haze: 0xcfc2a6,
  canopy: 0x8a5a24,
  bank: 0x2a2015,
  water: 0x3a6ea8,
  sun: 0xffd79a,
  cloudCover: 0.5,
  cloudLit: 0xf8efe0,
  cloudShade: 0xb0aba8,
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
  skyZenith: 0x8fa9c6,
  skyHorizon: 0xe8edf2,
  haze: 0xd3dbe6,
  canopy: 0x2c3238,
  bank: 0xc6ccd2,
  water: 0x9fb3c8,
  sun: 0xdfe6ee,
  cloudCover: 0.78,
  cloudLit: 0xf2f4f7,
  cloudShade: 0xb4bcc8,
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
  skyZenith: 0x5c95d2,
  skyHorizon: 0xdfe9ee,
  haze: 0xc8d2cc,
  canopy: 0x4e6b34,
  bank: 0x2f3a20,
  water: 0x3f80c4,
  sun: 0xffeec6,
  cloudCover: 0.46,
  cloudLit: 0xf9f8f3,
  cloudShade: 0xb7c0cc,
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

/**
 * The order, and its proportion (2026-09-09, after the second critique).
 * The outward journey — the second, ten minutes, a day, a year — is the
 * piece's setup and the two clocks are its argument, so the argument
 * comes straight after the turn: the year, black and the line, then
 * the corridor walked twice. What was learned there is then taken back
 * to the bench — the second subdivided, the month as panes of glass, a
 * lifetime seen from above — before the return to the same second. The
 * setup is 640 of 1610 vh; the two clocks begin at 45 % and are the
 * longest scene. Scene ids keep the numbers they were built under; the
 * array is the order.
 */
export const scenes: Scene[] = [
  {
    id: 'scene-01-now',
    label: '1 SECOND',
    lengthVh: 100,
    describe:
      'A pointillist park on a lake, late on an August afternoon, seen from a bench on the lawn. People sit on blankets, a bandshell stands on the far shore, and nothing moves but the air and the water. After a while a heat reading tints the sunned grass warm and the lake cool.',
    timeRate: 1,
    // The park, at the bench, at the second the year opens on. Nothing
    // the scroll does moves it: the second is inhabited, not crossed. The
    // world lives on its own — the air, the water, the clouds — and after
    // a moment the first thing is noticed: what the sun is doing to the
    // grass, as a thermal reading that arrives on its own time.
    hold: { of: 'scene-04-year', at: 0, life: ['jogger'] },
    camera: {
      from: { y: 2.5, z: 16, lookY: -1.77 },
      to: { y: 2.5, z: 16, lookY: -1.77 },
    },
    // The ramp spread across what one August afternoon holds: the lake
    // at 24 °C sits low and blue, the sunned grass at 32 near the top.
    // The overlays were switched off on 2026-09-09 (session 18h): every
    // instrument is to be rebuilt for the new direction, and until then
    // the world is looked at plain.
    instruments: [],
    // Someone blinks: the viewer, once, after the second has been sat
    // in long enough to forget the eye, and before the reading arrives.
    blink: { after: 5.5, close: 0.1, open: 0.18 },
    // Only then the invitation. The reading rises over a second and a
    // half from 7; the hint comes up as it settles, so the first thing
    // the visitor is told is not to leave before the first thing
    // happens.
    hint: { after: 8.5 },
  },
  {
    id: 'scene-02-ten-minutes',
    label: '10 MINUTES',
    lengthVh: 110,
    describe:
      'The same view with ten minutes running as you scroll: people come and go, wind is drawn as streamlines on the water, and a small radar scope in the corner tracks what is in the air.',
    timeRate: 600,
    // The same park, from the same bench, with time switched on: scroll
    // runs ten minutes of the world's own motion. The camera does not
    // move; the environment does. And the world starts to be read: the
    // wind on the water first, then the air, through the radar.
    // Ten minutes as a time lapse: a visitor stays two and a half
    // minutes, the spot is empty for a minute or two, and the crowd is
    // two thirds full — so the painting's people leave one by one and
    // others take their places as the scroll runs.
    hold: { of: 'scene-04-year', at: 0, seconds: 600, churn: 1.5, lapse: { dwell: 150, gap: 100, edge: 0.05, density: 0.65, cap: { lawn: 7, path: 4, water: 4 } } },
    camera: {
      from: { y: 2.5, z: 16, lookY: -1.77 },
      to: { y: 2.5, z: 16, lookY: -1.77 },
    },
    // The overlays were switched off on 2026-09-09 (session 18h): every
    // instrument is to be rebuilt for the new direction, and until then
    // the world is looked at plain.
    instruments: [],
  },
  {
    id: 'scene-03-day',
    label: '1 DAY',
    lengthVh: 110,
    describe:
      'The same view across one day: the sun sets behind the elms, night falls, and the sun comes back over the left of the frame. Its arc is drawn across the sky as it happens, and the heat reading swings with it.',
    timeRate: 86_400,
    // The same park, from the same bench, for a day: scroll runs the
    // world's clock from 4:17 round to 4:17. The sun sets behind the
    // elms, night falls, the sun comes back over the left of the frame
    // and climbs past the top before it settles where it began — through
    // a lens of its own, since the year's would never let it set. The
    // day's arc is drawn as it happens, and the thermal reading swings
    // with the light.
    hold: {
      of: 'scene-04-year',
      at: 0,
      seconds: 86_400,
      churn: 24,
      lens: { scale: 0.6, altitude: 25.5, west: 10 },
      // A day as a time lapse: an hour and a half's stay, an hour's gap;
      // the lawn empties with the light.
      lapse: { dwell: 5400, gap: 4200, edge: 0.05, density: 0.6, cap: { lawn: 6, path: 4, water: 3 } },
      // The hours, painted (18aa). Scroll runs the clock from 4:17 in
      // the afternoon round to 4:17 again, so the sun goes down about a
      // sixth of the way in and comes up again past the half. The sky
      // and the lake take their sunset, then their night, and give them
      // back; the deer come down to the water while it is dark and the
      // fireflies are out over the lawn a little longer.
      // The evening runs under the whole of the dark, and the night sits
      // on top of it (18ai). Each of these is a painting laid over the
      // afternoon's, so two of them part-way through at once leaves the
      // afternoon showing between: at the second the night was going and
      // the dawn had not come, a quarter of the frame was still August at
      // four in the afternoon, and the whole park washed out. The evening
      // now holds from the first loss of the sun to the last of the
      // sunrise, and the night fades up and down inside it — so whatever
      // is part-way through, the hour underneath it is never the wrong
      // one. (The sunrise is the sunset's own painting: a sunrise and a
      // sunset are the same hour seen from the other side.)
      reveal: {
        'sky-dusk': { from: 0.12, to: 0.70, over: 0.05 },
        'water-dusk': { from: 0.12, to: 0.70, over: 0.05 },
        // The shore and the lawn turn on the same windows as the sky and
        // the lake. Everything the day has a painting for changes hour
        // together, or the world does not change hour at all.
        'shore-dusk': { from: 0.12, to: 0.70, over: 0.05 },
        'ground-dusk': { from: 0.12, to: 0.70, over: 0.05 },
        'sky-night': { from: 0.24, to: 0.57, over: 0.055 },
        'water-night': { from: 0.24, to: 0.57, over: 0.055 },
        'shore-night': { from: 0.24, to: 0.57, over: 0.055 },
        'ground-night': { from: 0.24, to: 0.57, over: 0.055 },
        'night-fireflies': { from: 0.26, to: 0.5, over: 0.06 },
        'night-deer': { from: 0.32, to: 0.47, over: 0.04 },
      },
    },
    camera: {
      from: { y: 2.5, z: 16, lookY: -1.77 },
      to: { y: 2.5, z: 16, lookY: -1.77 },
    },
    // The overlays were switched off on 2026-09-09 (session 18h): every
    // instrument is to be rebuilt for the new direction, and until then
    // the world is looked at plain.
    instruments: [],
  },
  {
    id: 'scene-04-year',
    label: '1 YEAR',
    describe:
      'The same view across one year. Summer turns to autumn, the lake freezes and is skated on, spring returns, and the people change with the season. The sun\u2019s position at 4:17 each day is plotted in the sky as a figure of eight, annotated like a survey drawing with the solstices and equinoxes.',
    // Three times the runway of the scenes around it: a year should take a
    // while, and at 200 a mouse wheel crossed a season in a few notches.
    lengthVh: 320,
    timeRate: 31_557_600,
    // The first rise: from the bench, up over the elms, the lake opening
    // out below. The park stops being a place you sit in. The gaze lifts
    // as the camera does — it ends level, not looking down — so the sun,
    // which is fixed to the sky and not to the ground, stays in the frame
    // for the whole year.
    camera: {
      from: { y: 2.5, z: 16, lookY: -1.77 },
      // A small pull back rather than a rise (18r): the seat is the
      // subject, the elms stay in frame, and the edges stay inside what
      // the painting knows.
      to: { y: 3.4, z: 19.5, lookY: -1.3 },
    },
    // The park is laid out from the reference painting (session 18,
    // LEDGER 18): every plate names its box in the painting's 1536 × 1024
    // pixels and the scene projects it through the seat's camera onto
    // the plate's plane, so from the seat the plates stack back into the
    // painting and from anywhere else they are things at honest
    // distances. The lens: a 3:2 viewport sees the whole frame at 55°;
    // wider ones see it through a narrower lens so it always covers. The
    // seat looks at y −1.77: that puts the world's horizon a quarter of
    // the way down the frame, just above the painting's own far
    // waterline, so every row of water lies on the ground — a lying
    // plate cannot show a row that is above the horizon.
    composition: {
      frame: [1536, 1024],
      fov: 55,
      wide: { frame: [3072, 2048], origin: [768, 512] },
      // The shadow's blue is the palette's own: the summer lake's deep.
      shadows: { strength: 0.42, lean: 0.24, depth: 0.34, color: 0x24425f },
      // What is only real from the seat fades once the eye is this high,
      // over this much more: above the year's small pull back, so the elms
      // frame the whole year and go only as the lifetime climbs. Shortened
      // in 18ah: at 0.3 the last of the seat's people were still a few per
      // cent there as the lifetime's first blink opened again, and a
      // handful of ghosts stood on a lawn that no longer had them.
      seatFade: { until: 4.55, over: 0.22 },
      // Sunset: the sky pale violet overhead and apricot at the treeline,
      // the ground warmed; night: deep blue, the ground blue-black.
      light: {
        dusk: { zenith: 0x8d7fb0, horizon: 0xf2a86a, ground: 0xe8b07a },
        night: { zenith: 0x0a1230, horizon: 0x263a63, ground: 0x2b3555 },
        // The year is a year of afternoons (18v): its light never leaves
        // the day, whatever the sun's real altitude is at 4:17 in
        // January. Only the scene that holds this world for a day — where
        // the sun setting is the whole point — is allowed the dark, so
        // the floor applies to the year running on its own.
        floor: 14,
      },
      // The painting's own feet first, then more of the lawn, the path
      // and the lake, spaced so a full slot is company, not a crowd.
      spots: {
        // Measured by eye in the painting's pixels, then checked against
        // the waterline the bands found (18u): one of them stood four
        // pixels from the water, and the man raking leaves stood in the
        // lake. Three more, and the nearest pulled back from the frame's
        // foot where a visitor would have been cut off at the waist.
        // ([210, 900] was dropped in 18af: the ground kept a person clear
        // of the bicycle, but from the seat they still sat in front of it,
        // and a man and his dog through a bicycle is the sort of thing
        // you cannot stop seeing.)
        lawn: [[640, 905], [1205, 930], [697, 620], [950, 715], [1377, 725], [1418, 545], [1175, 610], [380, 800], [1000, 870], [800, 660], [1250, 520], [460, 660], [1450, 645], [620, 760], [300, 700], [1100, 780], [880, 570]],
        path: [[210, 605], [495, 563], [668, 510], [835, 500], [1185, 495], [1355, 445], [1480, 405], [320, 575], [1000, 475], [1110, 462]],
        water: [[275, 363], [572, 312], [727, 337], [1165, 337], [420, 335], [900, 325], [1050, 345], [150, 345]],
      },
    },
    // The painting lives: strokes shifting at a hand-drawn nine frames a
    // second, the people breathing, the elms swaying, the water shimmering.
    boil: { fps: 9, amount: 1 },
    // No grain (18y). A dot screen in screen space and an emulsion
    // re-thrown every frame were laid over the park in 18o and 18p, to
    // give the plates one surface and the piece the feel of film. Adam:
    // remove the static, I really don't like that anymore. It was an
    // effect over artwork that already has its own dots, and it crawled.
    // The declaration is kept, unset, because the reader is still built
    // and one line here brings it back.
    // The year as a time lapse: three days' stay, two days' gap, so the
    // August crowd flickers through its window of the year.
    lapse: { dwell: 3 * 86_400, gap: 2 * 86_400, edge: 0.045, density: 0.85, cap: { lawn: 7, path: 5, water: 3 } },
    plates: [
      // The whole-frame layers cut from the painting with its people
      // painted out: the sky and the far shore stand at the back, the
      // water and the ground lie flat from their nearest row to their
      // furthest, and the elms we sit under stand just ahead of the seat
      // and go with it. The ids are the drawn world's, kept: the far
      // shore is the canopy, the water the far bank, the ground the near
      // bank, so the thermal reads the grass as the grass it is. A plate
      // with a ref derives its size and place; the zeros are ignored.
      { id: 'sky', z: -170, ref: [0, 0, 1536, 320], width: 0, height: 0, baseY: 0, images: { 'LATE SUMMER': 'plates/scene-04/ref/sky.webp', AUTUMN: 'plates/scene-04/ref/sky-autumn.webp', WINTER: 'plates/scene-04/ref/sky-winter.webp', SPRING: 'plates/scene-04/ref/sky-spring.webp' } },
      // The far shore stands where the painting's water ends: through the
      // seat's lens the far waterline lies about fifty units out.
      { id: 'canopy', z: -52, ref: [0, 120, 1536, 200], width: 0, height: 0, baseY: 0, shade: 0.12, images: { 'LATE SUMMER': 'plates/scene-04/ref/far-shore.webp', AUTUMN: 'plates/scene-04/ref/far-shore-autumn.webp', WINTER: 'plates/scene-04/ref/far-shore-winter.webp', SPRING: 'plates/scene-04/ref/far-shore-spring.webp' } },
      { id: 'far-bank', z: -52, lay: true, ref: [0, 260, 1536, 360], width: 0, height: 0, baseY: 0, shade: 0.08, images: { 'LATE SUMMER': 'plates/scene-04/ref/water.webp', AUTUMN: 'plates/scene-04/ref/water-autumn.webp', WINTER: 'plates/scene-04/ref/water-winter.webp', SPRING: 'plates/scene-04/ref/water-spring.webp' } },
      { id: 'near-bank', z: 4, lay: true, ref: [0, 280, 1536, 744], width: 0, height: 0, baseY: 0, shade: 0.1, images: { 'LATE SUMMER': 'plates/scene-04/ref/ground.webp', AUTUMN: 'plates/scene-04/ref/ground-autumn.webp', WINTER: 'plates/scene-04/ref/ground-winter.webp', SPRING: 'plates/scene-04/ref/ground-spring.webp' } },
      // Just behind the bicycle that leans on the trunk (its feet put it
      // at about 11.5) and the three nearest people, ahead of everyone else.
      // The elms we sit under. Only August's is the painting's own; the
      // other three were derived from it (18w) by filling its silhouette
      // with leaves painted for the season, and they came out as smears
      // — a dark slab over the left trunk, a white one over the right —
      // which is what there was to see the moment the camera began to
      // pull back. They are gone (18ab). The same elms are painted
      // properly stage by stage as the boughs below, which hang from the
      // seat in every season but this one, so the frame's top is theirs
      // from the first turn of the year.
      { id: 'trees', z: 11, seat: true, ref: [0, 0, 1536, 760], width: 0, height: 0, baseY: 0, shade: 0.08, images: { 'LATE SUMMER': 'plates/scene-04/ref/trees.webp' } },
      // The frame beyond the painting (18t). The pull-back used to be fed
      // by the continuation on every side, and its far edges read as
      // patchwork — the canopy cut off straight at the painting's top,
      // blocks of another treeline at the sides, wedges of another green
      // on the lawn. What leaning back from a blanket actually shows is
      // not more distance but more of where we are sitting, so these are
      // painted as their own elements and placed just outside the seat's
      // frame: two swags of boughs overhead (the second mirrored), a
      // trunk either side, and the grass at our feet. The lake and the
      // far shore need no extending — they stay inside the painting at
      // every height the year reaches.
      { id: 'boughs-left', z: 11.5, seat: true, beyond: { from: 2.52, over: 0.35, exceptSeason: 'LATE SUMMER' }, world: { x: -3.6, y: 4.2, z: 11.5, w: 8.4, h: 5.6 }, width: 0, height: 0, baseY: 0, shade: 0.08, stages: [{ at: 0, image: 'plates/scene-04/frame/boughs-summer.webp' }, { at: 0.16, image: 'plates/scene-04/frame/boughs-turning.webp' }, { at: 0.3, image: 'plates/scene-04/frame/boughs-autumn.webp' }, { at: 0.42, image: 'plates/scene-04/frame/boughs-late-autumn.webp' }, { at: 0.55, image: 'plates/scene-04/frame/boughs-winter.webp' }, { at: 0.68, image: 'plates/scene-04/frame/boughs-budding.webp' }, { at: 0.78, image: 'plates/scene-04/frame/boughs-spring.webp' }, { at: 0.88, image: 'plates/scene-04/frame/boughs-fresh.webp' }] },
      { id: 'boughs-right', z: 11.5, seat: true, beyond: { from: 2.52, over: 0.35, exceptSeason: 'LATE SUMMER' }, world: { x: 3.6, y: 4.2, z: 11.5, w: 8.4, h: 5.6 }, width: 0, height: 0, baseY: 0, shade: 0.08, stages: [{ at: 0, image: 'plates/scene-04/frame/boughs-summer-b.webp' }, { at: 0.16, image: 'plates/scene-04/frame/boughs-turning-b.webp' }, { at: 0.3, image: 'plates/scene-04/frame/boughs-autumn-b.webp' }, { at: 0.42, image: 'plates/scene-04/frame/boughs-late-autumn-b.webp' }, { at: 0.55, image: 'plates/scene-04/frame/boughs-winter-b.webp' }, { at: 0.68, image: 'plates/scene-04/frame/boughs-budding-b.webp' }, { at: 0.78, image: 'plates/scene-04/frame/boughs-spring-b.webp' }, { at: 0.88, image: 'plates/scene-04/frame/boughs-fresh-b.webp' }] },
      // The trunks are bark in every season, as the painting's own are:
      // one image under all four, so they stack rather than cross-fade
      // and never go half-there at the turn of a season.
      { id: 'trunk-left', z: 11, seat: true, beyond: { from: 2.52, over: 0.35 }, world: { x: -6.9, y: 3.1, z: 11, w: 4.33, h: 6.5 }, width: 0, height: 0, baseY: 0, shade: 0.08, images: { 'LATE SUMMER': 'plates/scene-04/frame/trunk-left.webp', AUTUMN: 'plates/scene-04/frame/trunk-left.webp', WINTER: 'plates/scene-04/frame/trunk-left.webp', SPRING: 'plates/scene-04/frame/trunk-left.webp' } },
      { id: 'trunk-right', z: 11, seat: true, beyond: { from: 2.52, over: 0.35 }, world: { x: 6.9, y: 3.1, z: 11, w: 4.33, h: 6.5 }, width: 0, height: 0, baseY: 0, shade: 0.08, images: { 'LATE SUMMER': 'plates/scene-04/frame/trunk-right.webp', AUTUMN: 'plates/scene-04/frame/trunk-right.webp', WINTER: 'plates/scene-04/frame/trunk-right.webp', SPRING: 'plates/scene-04/frame/trunk-right.webp' } },
      { id: 'turf', lay: true, tile: [7, 2], under: true, z: 16.8, seat: true, beyond: { from: 2.52, over: 0.35 }, world: { x: 0, y: 0, z: 14.4, w: 26, h: 5 }, width: 0, height: 0, baseY: 0, shade: 0.1, images: { 'LATE SUMMER': 'plates/scene-04/frame/turf-summer.webp', AUTUMN: 'plates/scene-04/frame/turf-autumn.webp', WINTER: 'plates/scene-04/frame/turf-winter.webp', SPRING: 'plates/scene-04/frame/turf-spring.webp' } },
      // The lifetime's own picture (18y). The eighty years used to be
      // watched from a camera that climbed out of the painting, and the
      // painting went with it: what is only real from the seat — the
      // elms, the people, the turf — fades as the eye rises, and what
      // was left was the widened bands with their seams, a smeared
      // foreground and no frame at all. So the lifetime has a picture of
      // its own: the park seen standing and stepped back, painted whole,
      // with its near elms as a second plate laid over it in register.
      // A long way off, so the rise barely moves it, and drawn in front
      // of everything, so it covers the seat's park as that goes.
      {
        id: 'wide-park',
        z: -60,
        front: true,
        beyond: { from: 4.62, over: 0.18 },
        world: { x: 0, y: -13, z: -60, w: 150, h: 100 },
        width: 0,
        height: 0,
        baseY: 0,
        images: {
          'LATE SUMMER': 'plates/scene-05/wide-park.webp',
          AUTUMN: 'plates/scene-05/wide-park.webp',
          WINTER: 'plates/scene-05/wide-park.webp',
          SPRING: 'plates/scene-05/wide-park.webp',
        },
      },
      // The people of the lifetime's own picture (18ah). The eighty years
      // used to stop moving at the blink: the appearances that carry the
      // first half are the year's own people, and the blink takes them
      // away with the rest of the seat's park, leaving a painting with
      // nobody in it. These are drawn at the wide picture's own scale and
      // stand on its near lawn; each is hidden, and the scene watching
      // the eighty years says when it is there — a moment at a time, and
      // more rarely as the years run out.
      { id: 'life-figure-01', z: -59.6, front: true, hidden: true, world: { x: -45.70, y: -21.98, z: -60.4, w: 4.36, h: 7.03 }, width: 0, height: 0, baseY: 0, shade: 0.04, images: { 'LATE SUMMER': 'plates/scene-05/life-figure-01.webp', AUTUMN: 'plates/scene-05/life-figure-01.webp', WINTER: 'plates/scene-05/life-figure-01.webp', SPRING: 'plates/scene-05/life-figure-01.webp' } },
      { id: 'life-figure-02', z: -59.6, front: true, hidden: true, world: { x: -24.22, y: -27.55, z: -60.4, w: 4.72, h: 7.62 }, width: 0, height: 0, baseY: 0, shade: 0.04, images: { 'LATE SUMMER': 'plates/scene-05/life-figure-02.webp', AUTUMN: 'plates/scene-05/life-figure-02.webp', WINTER: 'plates/scene-05/life-figure-02.webp', SPRING: 'plates/scene-05/life-figure-02.webp' } },
      { id: 'life-figure-03', z: -59.6, front: true, hidden: true, world: { x: 1.17, y: -23.84, z: -60.4, w: 4.48, h: 7.23 }, width: 0, height: 0, baseY: 0, shade: 0.04, images: { 'LATE SUMMER': 'plates/scene-05/life-figure-03.webp', AUTUMN: 'plates/scene-05/life-figure-03.webp', WINTER: 'plates/scene-05/life-figure-03.webp', SPRING: 'plates/scene-05/life-figure-03.webp' } },
      { id: 'life-figure-04', z: -59.6, front: true, hidden: true, world: { x: 24.61, y: -29.59, z: -60.4, w: 4.86, h: 7.83 }, width: 0, height: 0, baseY: 0, shade: 0.04, images: { 'LATE SUMMER': 'plates/scene-05/life-figure-04.webp', AUTUMN: 'plates/scene-05/life-figure-04.webp', WINTER: 'plates/scene-05/life-figure-04.webp', SPRING: 'plates/scene-05/life-figure-04.webp' } },
      { id: 'life-figure-05', z: -59.6, front: true, hidden: true, world: { x: -55.47, y: -33.30, z: -60.4, w: 5.10, h: 8.22 }, width: 0, height: 0, baseY: 0, shade: 0.04, images: { 'LATE SUMMER': 'plates/scene-05/life-figure-05.webp', AUTUMN: 'plates/scene-05/life-figure-05.webp', WINTER: 'plates/scene-05/life-figure-05.webp', SPRING: 'plates/scene-05/life-figure-05.webp' } },
      { id: 'life-figure-06', z: -59.6, front: true, hidden: true, world: { x: -12.50, y: -37.01, z: -60.4, w: 5.34, h: 8.61 }, width: 0, height: 0, baseY: 0, shade: 0.04, images: { 'LATE SUMMER': 'plates/scene-05/life-figure-06.webp', AUTUMN: 'plates/scene-05/life-figure-06.webp', WINTER: 'plates/scene-05/life-figure-06.webp', SPRING: 'plates/scene-05/life-figure-06.webp' } },
      { id: 'life-figure-07', z: -59.6, front: true, hidden: true, world: { x: 12.89, y: -35.16, z: -60.4, w: 5.22, h: 8.42 }, width: 0, height: 0, baseY: 0, shade: 0.04, images: { 'LATE SUMMER': 'plates/scene-05/life-figure-07.webp', AUTUMN: 'plates/scene-05/life-figure-07.webp', WINTER: 'plates/scene-05/life-figure-07.webp', SPRING: 'plates/scene-05/life-figure-07.webp' } },
      { id: 'life-figure-08', z: -59.6, front: true, hidden: true, world: { x: 40.23, y: -24.03, z: -60.4, w: 4.49, h: 7.25 }, width: 0, height: 0, baseY: 0, shade: 0.04, images: { 'LATE SUMMER': 'plates/scene-05/life-figure-08.webp', AUTUMN: 'plates/scene-05/life-figure-08.webp', WINTER: 'plates/scene-05/life-figure-08.webp', SPRING: 'plates/scene-05/life-figure-08.webp' } },
      { id: 'life-figure-09', z: -59.6, front: true, hidden: true, world: { x: -33.98, y: -42.58, z: -60.4, w: 5.70, h: 9.20 }, width: 0, height: 0, baseY: 0, shade: 0.04, images: { 'LATE SUMMER': 'plates/scene-05/life-figure-09.webp', AUTUMN: 'plates/scene-05/life-figure-09.webp', WINTER: 'plates/scene-05/life-figure-09.webp', SPRING: 'plates/scene-05/life-figure-09.webp' } },
      { id: 'life-figure-10', z: -59.6, front: true, hidden: true, world: { x: 51.95, y: -36.83, z: -60.4, w: 5.33, h: 8.59 }, width: 0, height: 0, baseY: 0, shade: 0.04, images: { 'LATE SUMMER': 'plates/scene-05/life-figure-10.webp', AUTUMN: 'plates/scene-05/life-figure-10.webp', WINTER: 'plates/scene-05/life-figure-10.webp', SPRING: 'plates/scene-05/life-figure-10.webp' } },
      { id: 'life-figure-11', z: -59.6, front: true, hidden: true, world: { x: -60.35, y: -18.64, z: -60.4, w: 4.14, h: 6.68 }, width: 0, height: 0, baseY: 0, shade: 0.04, images: { 'LATE SUMMER': 'plates/scene-05/life-figure-11.webp', AUTUMN: 'plates/scene-05/life-figure-11.webp', WINTER: 'plates/scene-05/life-figure-11.webp', SPRING: 'plates/scene-05/life-figure-11.webp' } },
      { id: 'life-figure-12', z: -59.6, front: true, hidden: true, world: { x: 27.54, y: -44.62, z: -60.4, w: 5.84, h: 9.41 }, width: 0, height: 0, baseY: 0, shade: 0.04, images: { 'LATE SUMMER': 'plates/scene-05/life-figure-12.webp', AUTUMN: 'plates/scene-05/life-figure-12.webp', WINTER: 'plates/scene-05/life-figure-12.webp', SPRING: 'plates/scene-05/life-figure-12.webp' } },
      // The near elms of the lifetime's own picture, at twenty years and
      // grown (18ah). They used to be one picture: eighty years passed
      // and the trees were the same size at the end as at the blink,
      // which is the one thing a lifetime of a park should not show. Both
      // are hidden, and the scene that watches the eighty years says when
      // each of them is there — the change falling inside its second
      // blink, so that neither tree is ever dissolved through the other.
      {
        id: 'wide-elms-young',
        z: -60,
        front: true,
        hidden: true,
        beyond: { from: 4.62, over: 0.18 },
        world: { x: 0, y: -13, z: -60, w: 150, h: 100 },
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.06,
        images: {
          'LATE SUMMER': 'plates/scene-05/wide-elms-young.webp',
          AUTUMN: 'plates/scene-05/wide-elms-young.webp',
          WINTER: 'plates/scene-05/wide-elms-young.webp',
          SPRING: 'plates/scene-05/wide-elms-young.webp',
        },
      },
      {
        id: 'wide-elms',
        z: -60,
        front: true,
        hidden: true,
        beyond: { from: 4.62, over: 0.18 },
        world: { x: 0, y: -13, z: -60, w: 150, h: 100 },
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.06,
        images: {
          'LATE SUMMER': 'plates/scene-05/wide-elms.webp',
          AUTUMN: 'plates/scene-05/wide-elms.webp',
          WINTER: 'plates/scene-05/wide-elms.webp',
          SPRING: 'plates/scene-05/wide-elms.webp',
        },
      },
      // The day's dusk and its night (18aa). The sun setting used to be a
      // tint: the plates darkened toward two declared colours and the
      // painting sat in the dark with its afternoon still in it. These
      // are the hours painted — the sky and the water get their own
      // pictures over the afternoon's, laid in the same boxes so the
      // geometry never moves — and two things that are only out after
      // dark. The day's own scene says when each of them comes and goes.
      {
        id: 'sky-dusk',
        z: -169,
        hidden: true,
        ref: [0, 0, 1536, 340],
        width: 0,
        height: 0,
        baseY: 0,
        images: {
          'LATE SUMMER': 'plates/scene-03/sky-dusk.webp',
          AUTUMN: 'plates/scene-03/sky-dusk.webp',
          WINTER: 'plates/scene-03/sky-dusk.webp',
          SPRING: 'plates/scene-03/sky-dusk.webp',
        },
      },
      {
        id: 'sky-night',
        z: -168,
        hidden: true,
        ref: [0, 0, 1536, 340],
        width: 0,
        height: 0,
        baseY: 0,
        images: {
          'LATE SUMMER': 'plates/scene-03/sky-night.webp',
          AUTUMN: 'plates/scene-03/sky-night.webp',
          WINTER: 'plates/scene-03/sky-night.webp',
          SPRING: 'plates/scene-03/sky-night.webp',
        },
      },
      {
        id: 'water-dusk',
        // Laid exactly where the painting's own water is laid (18aa):
        // the band is dropped into the wide frame by the cutter, so the
        // composition places it by the same path and it lies on the same
        // ground rather than standing in front of it.
        z: -52,
        lay: true,
        hidden: true,
        ref: [0, 260, 1536, 360],
        width: 0,
        height: 0,
        baseY: 0,
        images: {
          'LATE SUMMER': 'plates/scene-03/water-dusk.webp',
          AUTUMN: 'plates/scene-03/water-dusk.webp',
          WINTER: 'plates/scene-03/water-dusk.webp',
          SPRING: 'plates/scene-03/water-dusk.webp',
        },
      },
      {
        id: 'water-night',
        z: -52,
        lay: true,
        hidden: true,
        ref: [0, 260, 1536, 360],
        width: 0,
        height: 0,
        baseY: 0,
        images: {
          'LATE SUMMER': 'plates/scene-03/water-night.webp',
          AUTUMN: 'plates/scene-03/water-night.webp',
          WINTER: 'plates/scene-03/water-night.webp',
          SPRING: 'plates/scene-03/water-night.webp',
        },
      },
      // The far shore and the near ground at the same two hours (18ai).
      // The day changed only its sky and its lake, so at midnight the
      // treeline and the lawn were still in full afternoon and the night
      // was a dark band across the top of a daylight park. Each of these
      // is laid in the box its daylight plate is laid in and wears that
      // plate's own matte, so it covers what it stands in for exactly and
      // the geometry never moves.
      {
        id: 'shore-dusk',
        z: -52,
        hidden: true,
        ref: [0, 120, 1536, 200],
        width: 0,
        height: 0,
        baseY: 0,
        images: {
          'LATE SUMMER': 'plates/scene-03/shore-dusk.webp',
          AUTUMN: 'plates/scene-03/shore-dusk.webp',
          WINTER: 'plates/scene-03/shore-dusk.webp',
          SPRING: 'plates/scene-03/shore-dusk.webp',
        },
      },
      {
        id: 'shore-night',
        z: -52,
        hidden: true,
        ref: [0, 120, 1536, 200],
        width: 0,
        height: 0,
        baseY: 0,
        images: {
          'LATE SUMMER': 'plates/scene-03/shore-night.webp',
          AUTUMN: 'plates/scene-03/shore-night.webp',
          WINTER: 'plates/scene-03/shore-night.webp',
          SPRING: 'plates/scene-03/shore-night.webp',
        },
      },
      {
        id: 'ground-dusk',
        z: 4,
        lay: true,
        hidden: true,
        ref: [0, 280, 1536, 744],
        width: 0,
        height: 0,
        baseY: 0,
        images: {
          'LATE SUMMER': 'plates/scene-03/ground-dusk.webp',
          AUTUMN: 'plates/scene-03/ground-dusk.webp',
          WINTER: 'plates/scene-03/ground-dusk.webp',
          SPRING: 'plates/scene-03/ground-dusk.webp',
        },
      },
      {
        id: 'ground-night',
        z: 4,
        lay: true,
        hidden: true,
        ref: [0, 280, 1536, 744],
        width: 0,
        height: 0,
        baseY: 0,
        images: {
          'LATE SUMMER': 'plates/scene-03/ground-night.webp',
          AUTUMN: 'plates/scene-03/ground-night.webp',
          WINTER: 'plates/scene-03/ground-night.webp',
          SPRING: 'plates/scene-03/ground-night.webp',
        },
      },
      {
        id: 'night-deer',
        z: 6,
        hidden: true,
        // On the bank, not in the lake: the box's foot is on the grass
        // below the near waterline, and `feet` puts them at the distance
        // that row stands at.
        feet: true,
        ref: [86, 468, 168, 100],
        width: 0,
        height: 0,
        baseY: 0,
        images: {
          'LATE SUMMER': 'plates/scene-03/night-deer.webp',
          AUTUMN: 'plates/scene-03/night-deer.webp',
          WINTER: 'plates/scene-03/night-deer.webp',
          SPRING: 'plates/scene-03/night-deer.webp',
        },
      },
      {
        id: 'night-fireflies',
        z: 10,
        hidden: true,
        ref: [120, 600, 1100, 380],
        width: 0,
        height: 0,
        baseY: 0,
        images: {
          'LATE SUMMER': 'plates/scene-03/night-fireflies.webp',
          AUTUMN: 'plates/scene-03/night-fireflies.webp',
          WINTER: 'plates/scene-03/night-fireflies.webp',
          SPRING: 'plates/scene-03/night-fireflies.webp',
        },
      },
      // The four oddballs (18ae), one a season and each a different kind
      // of strange: a man who has waded into the lake in his suit to
      // read the paper; a sofa carried across the lawn with the cat
      // still aboard; someone about to swim in January; and a knight
      // walking a very small dog in April. Each is there for about a
      // tenth of the year and then gone, so they are a surprise rather
      // than furniture, and none of them is in the painting the opening
      // and the ending hold — the windows all begin after the year has
      // started to turn.
      {
        id: 'odd-summer-bather',
        // Cut off at the waist by the cutter, so the box's foot is the
        // waterline and he stands in the lake rather than on it.
        z: -18,
        ref: [258, 372, 78, 88],
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.08,
        present: { from: 0.06, to: 0.15, edge: 0.025 },
        images: { '*': 'plates/scene-04/people/odd-summer-bather.webp' },
      },
      {
        id: 'odd-autumn-sofa',
        tall: 1.7,
        z: 14,
        ref: [520, 560, 280, 160],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.3, to: 0.4, edge: 0.025 },
        images: { '*': 'plates/scene-04/people/odd-autumn-sofa.webp' },
      },
      {
        id: 'odd-winter-swimmer',
        // Out on the ice, and wholly above the near bank's waterline:
        // the bank is drawn after anything further out than it, and a
        // box that reached below the shore put him behind the lawn.
        tall: 1.8,
        z: -14,
        ref: [975, 332, 104, 114],
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.08,
        present: { from: 0.55, to: 0.66, edge: 0.025 },
        images: { '*': 'plates/scene-04/people/odd-winter-swimmer.webp' },
      },
      {
        id: 'odd-spring-knight',
        tall: 1.85,
        z: 8,
        ref: [960, 372, 175, 170],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.8, to: 0.9, edge: 0.025 },
        images: { '*': 'plates/scene-04/people/odd-spring-knight.webp' },
      },
      // What the ending notices (18y): three things that were always in
      // this park and never looked at. They are not in the painting, so
      // nothing draws them until the last scene holds this world and
      // asks for them, one at a time. The water goes just in front of
      // the near bank and behind everyone standing on it; the cloud in
      // the sky; the leaf at our feet, nearer than anyone. All three sit
      // well inside the painting's height: a viewport wider than the
      // frame sees the frame through a narrower lens, so the top and the
      // bottom of the picture are off the screen on anything widescreen,
      // and a notice placed in either is a notice nobody sees.
      {
        id: 'notice-water',
        z: 4.5,
        hidden: true,
        ref: [0, 344, 400, 141],
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.08,
        images: {
          'LATE SUMMER': 'plates/scene-10/notice-water.webp',
          AUTUMN: 'plates/scene-10/notice-water.webp',
          WINTER: 'plates/scene-10/notice-water.webp',
          SPRING: 'plates/scene-10/notice-water.webp',
        },
      },
      {
        id: 'notice-cloud',
        z: -160,
        hidden: true,
        ref: [430, 126, 400, 137],
        width: 0,
        height: 0,
        baseY: 0,
        images: {
          'LATE SUMMER': 'plates/scene-10/notice-cloud.webp',
          AUTUMN: 'plates/scene-10/notice-cloud.webp',
          WINTER: 'plates/scene-10/notice-cloud.webp',
          SPRING: 'plates/scene-10/notice-cloud.webp',
        },
      },
      {
        id: 'notice-beetle',
        z: 14,
        hidden: true,
        ref: [268, 742, 132, 127],
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        images: {
          'LATE SUMMER': 'plates/scene-10/notice-beetle.webp',
          AUTUMN: 'plates/scene-10/notice-beetle.webp',
          WINTER: 'plates/scene-10/notice-beetle.webp',
          SPRING: 'plates/scene-10/notice-beetle.webp',
        },
      },
      // The nearest people, each one its own plate at its own distance, redrawn from the painting and fitted into its box there. All August: there for the second and gone once the year turns.
      {
        // Nearer the bicycle than the painting had her, by a little (18g):
        // a box may run past the frame's edge.
        id: 'reader',
        kind: 'lawn',
        z: 12,
        ref: [-45, 640, 420, 293],
        feet: true,
        fit: 'w',
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: [
          { from: 0, to: 0.22, edge: 0.05 },
          { from: 0.88, to: 1.06, edge: 0.05 },
        ],
        images: { '*': 'plates/scene-04/ref/reader.webp' },
      },
      {
        id: 'couple',
        kind: 'lawn',
        z: 12,
        ref: [375, 600, 530, 335],
        feet: true,
        fit: 'w',
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: [
          { from: 0, to: 0.22, edge: 0.05 },
          { from: 0.88, to: 1.06, edge: 0.05 },
        ],
        images: { '*': 'plates/scene-04/ref/couple.webp' },
      },
      {
        id: 'man-dog',
        kind: 'lawn',
        z: 12,
        ref: [960, 680, 490, 320],
        feet: true,
        fit: 'w',
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: [
          { from: 0, to: 0.22, edge: 0.05 },
          { from: 0.88, to: 1.06, edge: 0.05 },
        ],
        images: { '*': 'plates/scene-04/ref/man-dog.webp' },
      },
      {
        id: 'bicycle',
        z: 12,
        ref: [0, 505, 205, 250],
        feet: true,
        fit: 'h',
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: [
          { from: 0, to: 0.22, edge: 0.05 },
          { from: 0.88, to: 1.06, edge: 0.05 },
        ],
        images: { '*': 'plates/scene-04/ref/bicycle.webp' },
      },
      {
        id: 'sitters-lawn',
        kind: 'lawn',
        z: 12,
        ref: [585, 462, 225, 138],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: [
          { from: 0, to: 0.22, edge: 0.05 },
          { from: 0.88, to: 1.06, edge: 0.05 },
        ],
        images: { '*': 'plates/scene-04/ref/sitters-lawn.webp' },
      },
      {
        id: 'straw-hat',
        kind: 'lawn',
        z: 12,
        ref: [800, 420, 300, 295],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: [
          { from: 0, to: 0.22, edge: 0.05 },
          { from: 0.88, to: 1.06, edge: 0.05 },
        ],
        images: { '*': 'plates/scene-04/ref/straw-hat.webp' },
      },
      {
        id: 'family',
        kind: 'lawn',
        z: 12,
        ref: [1225, 505, 305, 220],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: [
          { from: 0, to: 0.22, edge: 0.05 },
          { from: 0.88, to: 1.06, edge: 0.05 },
        ],
        images: { '*': 'plates/scene-04/ref/family.webp' },
      },
      {
        id: 'chairs',
        kind: 'lawn',
        z: 12,
        ref: [1300, 400, 236, 130],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: [
          { from: 0, to: 0.22, edge: 0.05 },
          { from: 0.88, to: 1.06, edge: 0.05 },
        ],
        images: { '*': 'plates/scene-04/ref/chairs.webp' },
      },
      // On the path and at the water's edge.
      {
        id: 'jogger',
        kind: 'path',
        z: 12,
        ref: [160, 400, 100, 205],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: [
          { from: 0, to: 0.22, edge: 0.05 },
          { from: 0.88, to: 1.06, edge: 0.05 },
        ],
        images: { '*': 'plates/scene-04/ref/jogger.webp' },
      },
      {
        id: 'edge-family',
        kind: 'path',
        z: 12,
        ref: [430, 398, 130, 165],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: [
          { from: 0, to: 0.22, edge: 0.05 },
          { from: 0.88, to: 1.06, edge: 0.05 },
        ],
        images: { '*': 'plates/scene-04/ref/edge-family.webp' },
      },
      {
        // The two children at the water's edge; the woman who sat on the
        // wall beside them was asked away (LEDGER 18g), so the box is theirs.
        id: 'wall-group',
        kind: 'path',
        z: 12,
        ref: [678, 398, 60, 114],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: [
          { from: 0, to: 0.22, edge: 0.05 },
          { from: 0.88, to: 1.06, edge: 0.05 },
        ],
        images: { '*': 'plates/scene-04/ref/wall-group.webp' },
      },
      {
        id: 'standing-group',
        kind: 'path',
        z: 12,
        ref: [762, 345, 145, 155],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: [
          { from: 0, to: 0.22, edge: 0.05 },
          { from: 0.88, to: 1.06, edge: 0.05 },
        ],
        images: { '*': 'plates/scene-04/ref/standing-group.webp' },
      },
      {
        id: 'dog-walkers',
        kind: 'path',
        z: 12,
        ref: [1075, 355, 220, 140],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: [
          { from: 0, to: 0.22, edge: 0.05 },
          { from: 0.88, to: 1.06, edge: 0.05 },
        ],
        images: { '*': 'plates/scene-04/ref/dog-walkers.webp' },
      },
      // On the water, their feet the waterline: with the horizon a
      // quarter of the way down the frame every hull's row is well below
      // it, and the water's depth places them. The z is the fallback.
      {
        id: 'sailboat',
        kind: 'water',
        z: -40,
        ref: [225, 238, 100, 125],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: [
          { from: 0, to: 0.22, edge: 0.05 },
          { from: 0.88, to: 1.06, edge: 0.05 },
        ],
        images: { '*': 'plates/scene-04/ref/sailboat.webp' },
      },
      {
        id: 'sails-mid',
        kind: 'water',
        z: -110,
        ref: [535, 252, 75, 60],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: [
          { from: 0, to: 0.22, edge: 0.05 },
          { from: 0.88, to: 1.06, edge: 0.05 },
        ],
        images: { '*': 'plates/scene-04/ref/sails-mid.webp' },
      },
      {
        id: 'sailboat-right',
        kind: 'water',
        z: -80,
        ref: [695, 252, 65, 85],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: [
          { from: 0, to: 0.22, edge: 0.05 },
          { from: 0.88, to: 1.06, edge: 0.05 },
        ],
        images: { '*': 'plates/scene-04/ref/sailboat-right.webp' },
      },
      {
        id: 'sails-far',
        kind: 'water',
        z: -140,
        ref: [1120, 305, 90, 32],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: [
          { from: 0, to: 0.22, edge: 0.05 },
          { from: 0.88, to: 1.06, edge: 0.05 },
        ],
        images: { '*': 'plates/scene-04/ref/sails-far.webp' },
      },
      // ---- new people for every season (18r): each its own plate in the
      // painting's hand, on the ground its kind keeps to, in its season's
      // window; the box is a footprint borrowed from an element of the same
      // stance and distance, for scale and a first spot.
      {
        id: 'frisbee-pair',
        later: true,
        tall: 1.5,
        kind: 'lawn',
        z: 12,
        ref: [560, 450, 240, 150],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: [
          { from: 0, to: 0.22, edge: 0.05 },
          { from: 0.88, to: 1.06, edge: 0.05 },
        ],
        images: { '*': 'plates/scene-04/people/frisbee-pair.webp' },
      },
      {
        id: 'sunbather',
        later: true,
        tall: 0.5,
        kind: 'lawn',
        z: 12,
        ref: [800, 430, 280, 120],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: [
          { from: 0, to: 0.22, edge: 0.05 },
          { from: 0.88, to: 1.06, edge: 0.05 },
        ],
        images: { '*': 'plates/scene-04/people/sunbather.webp' },
      },
      {
        id: 'ice-cream-kids',
        later: true,
        tall: 1.15,
        kind: 'path',
        z: 12,
        ref: [430, 398, 130, 165],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: [
          { from: 0, to: 0.22, edge: 0.05 },
          { from: 0.88, to: 1.06, edge: 0.05 },
        ],
        images: { '*': 'plates/scene-04/people/ice-cream-kids.webp' },
      },
      {
        id: 'guitar',
        later: true,
        tall: 0.95,
        kind: 'lawn',
        z: 12,
        ref: [1080, 510, 190, 120],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: [
          { from: 0, to: 0.22, edge: 0.05 },
          { from: 0.88, to: 1.06, edge: 0.05 },
        ],
        images: { '*': 'plates/scene-04/people/guitar.webp' },
      },
      {
        id: 'grandparents',
        later: true,
        tall: 1.0,
        kind: 'lawn',
        z: 12,
        ref: [1225, 505, 305, 180],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: [
          { from: 0, to: 0.22, edge: 0.05 },
          { from: 0.88, to: 1.06, edge: 0.05 },
        ],
        images: { '*': 'plates/scene-04/people/grandparents.webp' },
      },
      {
        id: 'kayak',
        later: true,
        tall: 0.9,
        kind: 'water',
        z: -60,
        ref: [225, 300, 140, 60],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: [
          { from: 0, to: 0.22, edge: 0.05 },
          { from: 0.88, to: 1.06, edge: 0.05 },
        ],
        images: { '*': 'plates/scene-04/people/kayak.webp' },
      },
      {
        id: 'raker',
        later: true,
        tall: 1.5,
        kind: 'lawn',
        z: 12,
        ref: [1080, 470, 150, 160],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.20, to: 0.50, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/raker.webp' },
      },
      {
        id: 'leaf-pile-kids',
        later: true,
        tall: 1.25,
        kind: 'lawn',
        z: 12,
        ref: [800, 460, 300, 180],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.20, to: 0.50, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/leaf-pile-kids.webp' },
      },
      {
        id: 'coffee-walkers',
        later: true,
        tall: 1.5,
        kind: 'path',
        z: 12,
        ref: [762, 345, 145, 155],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.20, to: 0.50, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/coffee-walkers.webp' },
      },
      {
        id: 'photographer',
        later: true,
        tall: 1.5,
        kind: 'path',
        z: 12,
        ref: [1075, 355, 120, 150],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.20, to: 0.50, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/photographer.webp' },
      },
      {
        id: 'pumpkin-family',
        later: true,
        tall: 1.05,
        kind: 'lawn',
        z: 12,
        ref: [1225, 505, 305, 200],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.20, to: 0.50, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/pumpkin-family.webp' },
      },
      {
        id: 'autumn-dog',
        later: true,
        tall: 1.5,
        kind: 'path',
        z: 12,
        ref: [1075, 355, 220, 140],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.20, to: 0.50, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/autumn-dog.webp' },
      },
      {
        id: 'bench-reader',
        later: true,
        tall: 1.0,
        kind: 'lawn',
        z: 12,
        ref: [585, 462, 225, 138],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.20, to: 0.50, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/bench-reader.webp' },
      },
      {
        id: 'autumn-jogger',
        later: true,
        tall: 1.5,
        kind: 'path',
        z: 12,
        ref: [160, 400, 100, 205],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.20, to: 0.50, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/autumn-jogger.webp' },
      },
      {
        id: 'skaters',
        later: true,
        tall: 1.45,
        kind: 'water',
        z: -60,
        ref: [535, 300, 180, 90],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.46, to: 0.74, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/skaters.webp' },
      },
      {
        id: 'sledders',
        later: true,
        tall: 1.5,
        kind: 'lawn',
        z: 12,
        ref: [800, 460, 300, 180],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.46, to: 0.74, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/sledders.webp' },
      },
      {
        id: 'snowman-builders',
        later: true,
        tall: 1.2,
        kind: 'lawn',
        z: 12,
        ref: [1225, 505, 305, 220],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.46, to: 0.74, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/snowman-builders.webp' },
      },
      {
        id: 'winter-walkers',
        later: true,
        tall: 1.45,
        kind: 'path',
        z: 12,
        ref: [762, 345, 145, 155],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.46, to: 0.74, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/winter-walkers.webp' },
      },
      {
        id: 'hockey-kids',
        later: true,
        tall: 1.4,
        kind: 'water',
        z: -60,
        ref: [700, 300, 200, 90],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.46, to: 0.74, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/hockey-kids.webp' },
      },
      {
        id: 'winter-dog',
        later: true,
        tall: 1.5,
        kind: 'lawn',
        z: 12,
        ref: [585, 462, 225, 138],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.46, to: 0.74, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/winter-dog.webp' },
      },
      {
        id: 'thermos-pair',
        later: true,
        tall: 1.0,
        kind: 'lawn',
        z: 12,
        ref: [1080, 500, 200, 130],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.46, to: 0.74, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/thermos-pair.webp' },
      },
      {
        id: 'ice-fisher',
        later: true,
        tall: 1.1,
        kind: 'water',
        z: -60,
        ref: [225, 300, 120, 100],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.46, to: 0.74, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/ice-fisher.webp' },
      },
      {
        id: 'kite-flyer',
        later: true,
        tall: 1.2,
        kind: 'lawn',
        z: 12,
        ref: [560, 450, 200, 200],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.70, to: 0.96, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/kite-flyer.webp' },
      },
      {
        id: 'geese-kids',
        later: true,
        tall: 0.9,
        kind: 'path',
        z: 12,
        ref: [430, 398, 180, 150],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.70, to: 0.96, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/geese-kids.webp' },
      },
      {
        id: 'spring-picnic',
        later: true,
        tall: 1.05,
        kind: 'lawn',
        z: 12,
        ref: [800, 430, 300, 170],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.70, to: 0.96, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/spring-picnic.webp' },
      },
      {
        id: 'bike-walker',
        later: true,
        tall: 1.5,
        kind: 'path',
        z: 12,
        ref: [1075, 355, 220, 150],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.70, to: 0.96, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/bike-walker.webp' },
      },
      {
        id: 'blossom-photo',
        later: true,
        tall: 1.5,
        kind: 'path',
        z: 12,
        ref: [762, 345, 120, 155],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.70, to: 0.96, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/blossom-photo.webp' },
      },
      {
        id: 'stroller-pair',
        later: true,
        tall: 1.5,
        kind: 'path',
        z: 12,
        ref: [1290, 325, 180, 140],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.70, to: 0.96, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/stroller-pair.webp' },
      },
      {
        id: 'spring-dog',
        later: true,
        tall: 1.35,
        kind: 'lawn',
        z: 12,
        ref: [1225, 505, 280, 160],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.70, to: 0.96, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/spring-dog.webp' },
      },
      {
        id: 'painter',
        later: true,
        tall: 1.2,
        kind: 'lawn',
        z: 12,
        ref: [1080, 500, 160, 190],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.70, to: 0.96, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/painter.webp' },
      },
      {
        id: 'book-club',
        later: true,
        tall: 1.0,
        kind: 'lawn',
        z: 12,
        ref: [800, 430, 300, 170],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: [
          { from: 0, to: 0.22, edge: 0.05 },
          { from: 0.88, to: 1.06, edge: 0.05 },
        ],
        images: { '*': 'plates/scene-04/people/book-club.webp' },
      },
      {
        id: 'toddler-run',
        later: true,
        tall: 1.15,
        kind: 'lawn',
        z: 12,
        ref: [585, 462, 225, 138],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: [
          { from: 0, to: 0.22, edge: 0.05 },
          { from: 0.88, to: 1.06, edge: 0.05 },
        ],
        images: { '*': 'plates/scene-04/people/toddler-run.webp' },
      },
      {
        id: 'yoga-mat',
        later: true,
        tall: 0.65,
        kind: 'lawn',
        z: 12,
        ref: [800, 430, 300, 150],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: [
          { from: 0, to: 0.22, edge: 0.05 },
          { from: 0.88, to: 1.06, edge: 0.05 },
        ],
        images: { '*': 'plates/scene-04/people/yoga-mat.webp' },
      },
      {
        id: 'runners-pair',
        later: true,
        tall: 1.5,
        kind: 'path',
        z: 9,
        ref: [762, 345, 145, 155],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: [
          { from: 0, to: 0.22, edge: 0.05 },
          { from: 0.88, to: 1.06, edge: 0.05 },
        ],
        images: { '*': 'plates/scene-04/people/runners-pair.webp' },
      },
      {
        id: 'rollerblader',
        later: true,
        tall: 1.55,
        kind: 'path',
        z: 9,
        ref: [1290, 325, 180, 140],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: [
          { from: 0, to: 0.22, edge: 0.05 },
          { from: 0.88, to: 1.06, edge: 0.05 },
        ],
        images: { '*': 'plates/scene-04/people/rollerblader.webp' },
      },
      {
        id: 'paddleboard',
        later: true,
        tall: 1.6,
        kind: 'water',
        z: -60,
        ref: [535, 300, 180, 90],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: [
          { from: 0, to: 0.22, edge: 0.05 },
          { from: 0.88, to: 1.06, edge: 0.05 },
        ],
        images: { '*': 'plates/scene-04/people/paddleboard.webp' },
      },
      {
        id: 'chess-pair',
        later: true,
        tall: 1.0,
        kind: 'lawn',
        z: 12,
        ref: [800, 430, 300, 160],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.20, to: 0.50, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/chess-pair.webp' },
      },
      {
        id: 'leaf-collector',
        later: true,
        tall: 0.85,
        kind: 'lawn',
        z: 12,
        ref: [585, 462, 200, 130],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.20, to: 0.50, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/leaf-collector.webp' },
      },
      {
        id: 'cyclist-autumn',
        later: true,
        tall: 1.6,
        kind: 'path',
        z: 9,
        ref: [1290, 325, 200, 140],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.20, to: 0.50, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/cyclist-autumn.webp' },
      },
      {
        id: 'sketcher',
        later: true,
        tall: 1.0,
        kind: 'lawn',
        z: 12,
        ref: [585, 462, 180, 150],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.20, to: 0.50, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/sketcher.webp' },
      },
      {
        id: 'rowers',
        later: true,
        tall: 0.7,
        kind: 'water',
        z: -60,
        ref: [535, 300, 200, 80],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.20, to: 0.50, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/rowers.webp' },
      },
      {
        id: 'stroller-autumn',
        later: true,
        tall: 1.5,
        kind: 'path',
        z: 9,
        ref: [762, 345, 150, 155],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.20, to: 0.50, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/stroller-autumn.webp' },
      },
      {
        id: 'snow-angel',
        later: true,
        tall: 0.35,
        kind: 'lawn',
        z: 12,
        ref: [800, 460, 300, 150],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.46, to: 0.74, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/snow-angel.webp' },
      },
      {
        id: 'shoveller',
        later: true,
        tall: 1.5,
        kind: 'path',
        z: 9,
        ref: [762, 345, 150, 165],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.46, to: 0.74, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/shoveller.webp' },
      },
      {
        id: 'skate-child',
        later: true,
        tall: 1.45,
        kind: 'water',
        z: -60,
        ref: [700, 300, 150, 110],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.46, to: 0.74, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/skate-child.webp' },
      },
      {
        id: 'bird-feeder',
        later: true,
        tall: 1.5,
        kind: 'lawn',
        z: 12,
        ref: [585, 462, 170, 165],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.46, to: 0.74, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/bird-feeder.webp' },
      },
      {
        id: 'cross-country',
        later: true,
        tall: 1.55,
        kind: 'path',
        z: 9,
        ref: [1290, 325, 200, 150],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.46, to: 0.74, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/cross-country.webp' },
      },
      {
        id: 'snowball-kids',
        later: true,
        tall: 1.15,
        kind: 'lawn',
        z: 12,
        ref: [800, 460, 300, 170],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.46, to: 0.74, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/snowball-kids.webp' },
      },
      {
        id: 'tulip-photo',
        later: true,
        tall: 0.9,
        kind: 'lawn',
        z: 12,
        ref: [585, 462, 180, 140],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.70, to: 0.96, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/tulip-photo.webp' },
      },
      {
        id: 'joggers-spring',
        later: true,
        tall: 1.5,
        kind: 'path',
        z: 9,
        ref: [762, 345, 150, 155],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.70, to: 0.96, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/joggers-spring.webp' },
      },
      {
        id: 'reading-blanket',
        later: true,
        tall: 0.5,
        kind: 'lawn',
        z: 12,
        ref: [800, 430, 300, 140],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.70, to: 0.96, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/reading-blanket.webp' },
      },
      {
        id: 'ducklings',
        later: true,
        tall: 0.35,
        kind: 'water',
        z: -60,
        ref: [535, 300, 160, 60],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.70, to: 0.96, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/ducklings.webp' },
      },
      {
        id: 'skateboarder',
        later: true,
        tall: 1.5,
        kind: 'path',
        z: 9,
        ref: [1290, 325, 170, 145],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.70, to: 0.96, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/skateboarder.webp' },
      },
      {
        id: 'family-walk',
        later: true,
        tall: 1.5,
        kind: 'path',
        z: 9,
        ref: [762, 345, 220, 160],
        feet: true,
        width: 0,
        height: 0,
        baseY: 0,
        shade: 0.1,
        present: { from: 0.70, to: 0.96, edge: 0.05 },
        images: { '*': 'plates/scene-04/people/family-walk.webp' },
      },
    ],
    figures: [
    ],
    // From the far shore to the wall: the lawn, not the lake, is under the seat.
    water: { width: 420, depth: 96, z: -44 },
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
    // The overlays were switched off on 2026-09-09 (session 18h): every
    // instrument is to be rebuilt for the new direction, and until then
    // the world is looked at plain.
    instruments: [],
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
      // The record's figure of eight is not drawn (18h): the sun itself
      // still moves, and lights the world.
      trace: false,
    },
    // The deck sits just ahead of the sky and behind the sun's trail. A
    // year of weather passes in the scene; the field churns enough that
    // no cloud survives a season, and drifts a little on its own.
    clouds: { z: -158, width: 620, height: 250, baseY: 6, scale: 1.7, churn: 9, drift: 0.02, wind: 0.6 },
    // The survey. Once the year turns (local 0.12), a day of the record is
    // 0.0024 of local progress; the events below fall where the real sun
    // puts them — equinox 23 Sep (0.21), sundial fastest 2 Nov (0.31),
    // solstice 21 Dec (0.43), sundial slowest 11 Feb (0.55), equinox
    // 20 Mar (0.64), the figure crosses itself mid-April (0.70), solstice
    // 21 Jun (0.87). Each callout opens a little ahead of its instant and
    // stays a few weeks. The live blocks are up before the year turns, so
    // the survey is set before there is anything to measure; everything
    // is off the page before the scene's own fade at 0.95.
    // (The survey overlay was withdrawn 2026-09-09, session 18h, with the
    // other instruments; its callouts are still declared in the code.)
    // The day holds this world before it and the lifetime after it, so
    // the year neither arrives nor leaves: fading at these edges dipped
    // the park through black twice in the middle of one continuous view
    // (18u).
    fadeIn: 0,
    fadeOut: 0,
  },
  {
    id: 'scene-06-return',
    label: '',
    describe: 'Black. A line is spoken in it. Then a corridor.',
    // Long enough that the stop is a stop: the black has to be sat in
    // before the line arrives, and after it, before the corridor.
    lengthVh: 80,
    caption: 'But that isn’t how you experienced it.',
    captionAt: { from: 0.18, to: 0.72 },
    timeRate: 0,
    // Everything stops. Black, and the line; the corridor follows out of
    // the dark. (The fall back to the bench that used to follow the line
    // was withdrawn 2026-09-09 when the two clocks moved to this side of
    // the turn: the eye no longer goes home here, it goes indoors.)
    black: true,
  },
  {
    id: 'scene-08-two-clocks',
    label: '10 MINUTES',
    lengthVh: 240,
    describe:
      'Two views of one walk down an avenue of elms beside the lake, side by side, or one above the other on a phone. Labelled WHILE IT WAS HAPPENING. The waiting clock\u2019s avenue barely advances while a seconds dial counts the ten minutes; the absorbed clock\u2019s races, with seeds adrift in the air and three readings called out: the light, the water, the breeze.',
    describeAt: [
      {
        from: 0.5,
        text: 'Labelled LOOKING BACK, the relationship reverses. The waiting avenue is now a few paces long with a thicket across it. The absorbed avenue runs on and on, hung with dozens of remembered fragments.',
      },
    ],
    caption: 'Same ten minutes. Different time.',
    captionAt: { from: 0.86, to: 1 },
    timeRate: 600,
    // The same ten minutes, walked twice. While it is happening the
    // waiting clock covers a bay and a half in the whole scene's first
    // half, the absorbed one thirty. Looking back, the waiting walk is a
    // stub one bay long with a thicket across it; the absorbed one runs
    // twenty bays hung with three dozen fragments. The turn is the exact
    // middle.
    twoClocks: {
      corridor: {
        width: 7.6,
        height: 9,
        depth: 160,
        bay: 6.2,
        lamp: 6.2,
        // The 4:17 afternoon, read off the painting itself: its zenith,
        // its haze at the horizon, its lawn, its path and its water.
        sky: { zenith: 0x83a9cf, horizon: 0xc1d8e7, grass: 0x64785c, gravel: 0xd8cbb0, water: 0xa0bed5 },
        plates: {
          tile: 6.5,
          grass: 5,
          dapple: 26,
          tree: 10.5,
          thicket: 3.6,
          brush: { height: 3.2, from: 9, to: 30, every: 8 },
          shore: { at: 46, height: 7.5, waterRows: 0.08 },
          water: { from: 8.5, tile: 6 },
          sink: 0.22,
          sky: 165,
        },
        images: {
          path: 'plates/scene-08/allee-path.webp',
          grass: 'plates/scene-08/allee-grass.webp',
          grassShade: 'plates/scene-08/allee-grass-shade.webp',
          dapple: 'plates/scene-08/allee-dapple.webp',
          trees: [
            'plates/scene-08/allee-tree-a.webp',
            'plates/scene-08/allee-tree-b.webp',
            'plates/scene-08/allee-tree-c.webp',
          ],
          thicket: 'plates/scene-08/allee-thicket.webp',
          shore: 'plates/scene-08/allee-shore.webp',
          water: 'plates/scene-08/allee-water.webp',
          sky: 'plates/scene-08/allee-sky.webp',
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
      waiting: { livedBays: 1.5, rememberedBays: 1.4 },
      // The absorbed clock's layers come on one after another through
      // the lived half and all go off as the turn begins to dip. Kept
      // deliberately few: the contrast with the waiting clock has to be
      // felt, not read, so the absorbed view is motion, depth and three
      // things noticed — one for the eye, one for the ear, one for the
      // skin — over an afternoon that keeps its own colour. (The thermal
      // pass and the seven-reading survey were tried and withdrawn
      // 2026-09-09: they made the viewer read at the moment they should
      // be feeling.)
      absorbed: {
        livedBays: 30,
        rememberedBays: 20,
        fragments: 36,
        layers: [
          { kind: 'motes', from: 0.08, to: 0.46, count: 700 },
          {
            kind: 'survey',
            from: 0.14,
            to: 0.46,
            callouts: [
              { text: 'LIGHT · THROUGH THE LEAVES · 4700 K', at: [0.46, 0.16], from: 0.14, to: 0.46 },
              { text: 'WATER · ON THE SHORE · EVERY 4 S', at: [0.78, 0.52], from: 0.22, to: 0.46 },
              { text: 'BREEZE · 0.4 M/S · OFF THE LAKE · 21 °C', at: [0.3, 0.66], from: 0.3, to: 0.46 },
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
    id: 'scene-07-attention',
    label: '1 SECOND',
    lengthVh: 120,
    describe:
      'Back inside the single second the piece opened on. The clock does not move; the scale label divides the second finer and finer, down to a hundredth, and the readings arrive one after another and stay: heat, wind, the air, and an elm leaf drawn vein by vein as a network.',
    timeRate: 0.1,
    // The inward zoom. The same second the piece opened on, held: the
    // clock does not move and neither does the world. What changes is
    // how finely the second is divided — the label descends from one
    // second to a hundredth — and how much of what was always there is
    // being read. The instruments arrive one after another and none of
    // them leaves, so the scene ends with every layer on at once: the
    // absorbed state the corridor was just walked in, found again at the
    // bench. Out of the corridor's black, and into the panes' after.
    hold: { of: 'scene-04-year', at: 0 },
    fadeIn: 0.08,
    fadeOut: 0.05,
    // Not a zoom into anything — there is nothing yet to zoom into — but
    // a lean forward: the grass a little larger, the frame a little
    // tighter, over the whole scene.
    camera: {
      from: { y: 2.5, z: 16, lookY: 0.35 },
      to: { y: 2.4, z: 14.6, lookY: 0.3 },
    },
    labelAt: [
      { from: 0, label: '1 SECOND' },
      { from: 0.2, label: '½ SECOND' },
      { from: 0.38, label: '¼ SECOND' },
      { from: 0.56, label: '⅒ SECOND' },
      { from: 0.78, label: '1/100 SECOND' },
    ],
    // The overlays were switched off on 2026-09-09 (session 18h): every
    // instrument is to be rebuilt for the new direction, and until then
    // the world is looked at plain.
    instruments: [],
  },
  {
    id: 'scene-09-memory-compression',
    label: '30 DAYS',
    lengthVh: 200,
    describe:
      'Thirty days as thirty panes of glass receding down a corridor. A month of the same day aligns into what looks like one thin sheet.',
    describeAt: [
      {
        from: 0.5,
        text: 'A month of different days, each pane carrying its own reading, scatters into a wide field that makes the same thirty days look enormous.',
      },
    ],
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
          atlas: { image: 'plates/scene-09/days-same.webp', cols: 6, rows: 2, count: 9 },
        },
        {
          id: 'vivid',
          label: 'A MONTH OF DIFFERENT DAYS',
          from: 0.54,
          to: 0.97,
          // The push is taken as far as the frame will allow at each
          // pane's own depth (18af), so these are ceilings rather than
          // distances: raised, since the near panes no longer run off
          // the picture and the month should still feel enormous.
          scatter: { x: 7, y: 4, z: 13, tilt: 30 },
          atlas: { image: 'plates/scene-09/days-vivid.webp', cols: 6, rows: 5, count: 30 },
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
    id: 'scene-05-lifetime',
    label: 'A LIFETIME',
    lengthVh: 150,
    describe:
      'Eighty years pass over the same park, seen from higher and further back. The elms grow enormous, an elm counts the years as rings, the sun\u2019s yearly figures stack into a band, and the people flicker as brief appearances. Then the world fades to black.',
    timeRate: 2_524_608_000,
    // The year's world, held at the August it closed on, seen from
    // higher and further back as eighty years pass: the elms grow
    // enormous, the sun's record stacks year on year into a band, and an
    // elm counts the years as rings. The starting afternoon becomes one
    // coordinate. Then the world fades, for the return. It comes out of
    // the memory corridor's black, so it fades in as well as out.
    // The afternoon's people, over eighty years: appearances. Each is
    // there for a third of a second every couple of seconds, leaving a
    // trace, and by the end three times rarer.
    hold: {
      of: 'scene-04-year',
      at: 1,
      years: 80,
      grow: 1.7,
      appearances: { period: 2.4, dwell: 0.3, trace: 1.6, rarer: 3 },
      // The elms of the lifetime's own picture, young and then grown.
      // Each arrives in the dark of a blink and the other leaves in the
      // same dark, so the two pictures never overlap.
      reveal: {
        'wide-elms-young': { from: 0.42, to: 0.72, over: 0.01 },
        'wide-elms': { from: 0.72, to: 1, over: 0.01 },
        'life-figure-01': [{ from: 0.455, to: 0.471, over: 0.006 }, { from: 0.507, to: 0.523, over: 0.006 }, { from: 0.570, to: 0.586, over: 0.006 }, { from: 0.648, to: 0.664, over: 0.006 }, { from: 0.742, to: 0.758, over: 0.006 }, { from: 0.857, to: 0.873, over: 0.006 }],
        'life-figure-02': [{ from: 0.467, to: 0.483, over: 0.006 }, { from: 0.525, to: 0.541, over: 0.006 }, { from: 0.596, to: 0.612, over: 0.006 }, { from: 0.682, to: 0.698, over: 0.006 }, { from: 0.787, to: 0.803, over: 0.006 }, { from: 0.916, to: 0.932, over: 0.006 }],
        'life-figure-03': [{ from: 0.479, to: 0.495, over: 0.006 }, { from: 0.543, to: 0.559, over: 0.006 }, { from: 0.621, to: 0.637, over: 0.006 }, { from: 0.716, to: 0.732, over: 0.006 }, { from: 0.833, to: 0.849, over: 0.006 }],
        'life-figure-04': [{ from: 0.491, to: 0.507, over: 0.006 }, { from: 0.543, to: 0.559, over: 0.006 }, { from: 0.606, to: 0.622, over: 0.006 }, { from: 0.684, to: 0.700, over: 0.006 }, { from: 0.778, to: 0.794, over: 0.006 }, { from: 0.893, to: 0.909, over: 0.006 }],
        'life-figure-05': [{ from: 0.459, to: 0.475, over: 0.006 }, { from: 0.517, to: 0.533, over: 0.006 }, { from: 0.588, to: 0.604, over: 0.006 }, { from: 0.674, to: 0.690, over: 0.006 }, { from: 0.779, to: 0.795, over: 0.006 }, { from: 0.908, to: 0.924, over: 0.006 }],
        'life-figure-06': [{ from: 0.471, to: 0.487, over: 0.006 }, { from: 0.535, to: 0.551, over: 0.006 }, { from: 0.613, to: 0.629, over: 0.006 }, { from: 0.708, to: 0.724, over: 0.006 }, { from: 0.825, to: 0.841, over: 0.006 }],
        'life-figure-07': [{ from: 0.483, to: 0.499, over: 0.006 }, { from: 0.535, to: 0.551, over: 0.006 }, { from: 0.598, to: 0.614, over: 0.006 }, { from: 0.676, to: 0.692, over: 0.006 }, { from: 0.770, to: 0.786, over: 0.006 }, { from: 0.885, to: 0.901, over: 0.006 }],
        'life-figure-08': [{ from: 0.495, to: 0.511, over: 0.006 }, { from: 0.553, to: 0.569, over: 0.006 }, { from: 0.624, to: 0.640, over: 0.006 }, { from: 0.710, to: 0.726, over: 0.006 }, { from: 0.815, to: 0.831, over: 0.006 }, { from: 0.944, to: 0.960, over: 0.006 }],
        'life-figure-09': [{ from: 0.463, to: 0.479, over: 0.006 }, { from: 0.527, to: 0.543, over: 0.006 }, { from: 0.605, to: 0.621, over: 0.006 }, { from: 0.700, to: 0.716, over: 0.006 }, { from: 0.817, to: 0.833, over: 0.006 }, { from: 0.958, to: 0.974, over: 0.006 }],
        'life-figure-10': [{ from: 0.475, to: 0.491, over: 0.006 }, { from: 0.527, to: 0.543, over: 0.006 }, { from: 0.590, to: 0.606, over: 0.006 }, { from: 0.668, to: 0.684, over: 0.006 }, { from: 0.762, to: 0.778, over: 0.006 }, { from: 0.877, to: 0.893, over: 0.006 }],
        'life-figure-11': [{ from: 0.487, to: 0.503, over: 0.006 }, { from: 0.545, to: 0.561, over: 0.006 }, { from: 0.616, to: 0.632, over: 0.006 }, { from: 0.702, to: 0.718, over: 0.006 }, { from: 0.807, to: 0.823, over: 0.006 }, { from: 0.936, to: 0.952, over: 0.006 }],
        'life-figure-12': [{ from: 0.499, to: 0.515, over: 0.006 }, { from: 0.563, to: 0.579, over: 0.006 }, { from: 0.641, to: 0.657, over: 0.006 }, { from: 0.736, to: 0.752, over: 0.006 }, { from: 0.853, to: 0.869, over: 0.006 }],
      },
    },
    // Halfway through the eighty years the eye closes, and when it opens
    // the park is seen from further back: the seat's elms and lawn have
    // gone and the lifetime's own painting has taken the frame. Both
    // changes happen inside the dark, so no picture is ever dissolved
    // through another.
    dip: [
      { at: 0.42, over: 0.13 },
      // and again at sixty years, so the elms it is watching can grow up
      // between one opening of the eye and the next (18ah).
      { at: 0.72, over: 0.09 },
    ],
    camera: {
      from: { y: 3.4, z: 19.5, lookY: -1.3 },
      to: { y: 6.5, z: 26, lookY: 1.5 },
    },
    // Two instruments, both about the years: the band and the rings.
    // The roots — the far shore cut open, the stand's network under it —
    // were withdrawn 2026-09-09: beautiful, but they showed a property
    // of the place, not a property of time, and the rule now is that
    // every instrument has to change how long something feels. The
    // `roots` reader is still built; one line here brings it back.
    // The overlays were switched off on 2026-09-09 (session 18h): every
    // instrument is to be rebuilt for the new direction, and until then
    // the world is looked at plain.
    instruments: [],
    // …and the lifetime takes the year's last frame, so it does not
    // arrive either.
    fadeIn: 0,
    fadeOut: 0.06,
  },
  {
    id: 'scene-10-return-to-now',
    label: '1 SECOND',
    // Longer than the second it opened on: an ending needs room to leave in.
    lengthVh: 180,
    describe:
      'The park again, exactly as it opened, from the same bench at the same second. Nothing has changed in it; three things in it are noticed that were not before \u2014 the water breaking on the near shore, a cloud that has formed over the far trees, and a leaf at our feet with a beetle crossing it. Then the line, the clock and the labels fade, and the eye closes.',
    caption: 'The moment didn’t get longer.\nYou got closer.',
    captionAt: { from: 0.58, to: 0.88 },
    timeRate: 1,
    // Exactly the same lake, from exactly the same seat, at exactly the
    // same second the piece opened on — the camera does not move,
    // because nothing about the afternoon has changed. Only what is
    // being noticed has. Then the line, and then the interface itself.
    // The same second, and three things in it that were always there:
    // the water on the shore, then a cloud that was not in the sky when
    // we sat down, then a leaf at our feet with a beetle crossing it.
    // Each arrives and stays, so the picture thickens with noticing
    // rather than turning over.
    hold: {
      of: 'scene-04-year',
      at: 0,
      reveal: {
        'notice-water': { from: 0.24, over: 0.08 },
        'notice-cloud': { from: 0.42, over: 0.08 },
        'notice-beetle': { from: 0.6, over: 0.08 },
      },
    },
    camera: {
      from: { y: 2.5, z: 16, lookY: -1.77 },
      to: { y: 2.5, z: 16, lookY: -1.77 },
    },
    // The ending used to take its instruments off one by one — the ring
    // of seasons, then a radar, a thermal, the wind on the water — while
    // the rest of the piece had had its overlays switched off since 18h.
    // What the concept asks for here is not instruments going but things
    // arriving: what was background, noticed. They are painted, and the
    // hold below says when each of them comes.
    instruments: [],
    hudOut: { from: 0.84, to: 0.93 },
    // And then the eye closes, and stays closed.
    close: { from: 0.94, to: 1 },
    // The same eye blinks in the same second, on the same count as it
    // did at the opening: the one thing that happens here that also
    // happened then.
    blink: { after: 5.5, close: 0.1, open: 0.18 },
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
