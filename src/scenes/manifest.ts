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
   * A plate that lies flat rather than standing: the ground itself, a
   * plane at baseY running from z to z + depth, its image tiled across
   * it both ways, mirrored at every seam. The lawn.
   */
  ground?: { depth: number; repeat: [number, number] };
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
  life?: { breath?: number; sway?: number; bob?: number; lean?: number; wobble?: number; heel?: number };
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

export const scenes: Scene[] = [
  {
    id: 'scene-01-now',
    label: '1 SECOND',
    lengthVh: 150,
    timeRate: 1,
    // The park, at the bench, at the second the year opens on. Nothing
    // the scroll does moves it: the second is inhabited, not crossed. The
    // world lives on its own — the air, the water, the clouds — and after
    // a moment the first thing is noticed: what the sun is doing to the
    // grass, as a thermal reading that arrives on its own time.
    hold: { of: 'scene-04-year', at: 0, life: ['jogger'] },
    camera: {
      from: { y: 2.5, z: 16, lookY: 0.35 },
      to: { y: 2.5, z: 16, lookY: 0.35 },
    },
    // The ramp spread across what one August afternoon holds: the lake
    // at 24 °C sits low and blue, the sunned grass at 32 near the top.
    instruments: [
      // Lighter than it was, and later: over the pointillist park the
      // reading at full strength was a beige wash, and the first thing
      // noticed should not take the afternoon's colour away before the
      // visitor has arrived in it. It comes after the blink.
      { kind: 'thermal', from: 0, to: 1, after: 7, strength: 0.3, ramp: [0x24425f, 0x35566a, 0xe0b884, 0xffe6b0], range: [18, 34] },
    ],
    // Someone blinks: the viewer, once, after the reading has settled
    // and the second has been sat in long enough to forget the eye.
    blink: { after: 5.5, close: 0.1, open: 0.18 },
  },
  {
    id: 'scene-02-ten-minutes',
    label: '10 MINUTES',
    lengthVh: 150,
    timeRate: 600,
    // The same park, from the same bench, with time switched on: scroll
    // runs ten minutes of the world's own motion. The camera does not
    // move; the environment does. And the world starts to be read: the
    // wind on the water first, then the air, through the radar.
    hold: { of: 'scene-04-year', at: 0, seconds: 600, churn: 1.5 },
    camera: {
      from: { y: 2.5, z: 16, lookY: 0.35 },
      to: { y: 2.5, z: 16, lookY: 0.35 },
    },
    instruments: [
      { kind: 'flow', from: 0.06, to: 1 },
      {
        kind: 'radar',
        from: 0.4,
        to: 1,
        period: 6,
        scope: { corner: 'top-right', size: 0.28, inset: { x: 0.04, y: 0.095 } },
      },
    ],
  },
  {
    id: 'scene-03-day',
    label: '1 DAY',
    lengthVh: 150,
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
    },
    camera: {
      from: { y: 2.5, z: 16, lookY: 0.35 },
      to: { y: 2.5, z: 16, lookY: 0.35 },
    },
    instruments: [
      { kind: 'arc', from: 0.02, to: 1 },
      // A day's spread: the grass falls to 14 °C by the small hours and
      // climbs past 30 by afternoon, the lake barely moving under it.
      { kind: 'thermal', from: 0.05, to: 1, strength: 0.6, ramp: [0x24425f, 0x35566a, 0xe0b884, 0xffe6b0], range: [10, 34] },
    ],
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
      from: { y: 2.5, z: 16, lookY: 0.35 },
      to: { y: 9.5, z: 27, lookY: 9.5 },
    },
    plates: [
      { id: 'sky', z: -170, width: 620, height: 340, baseY: -90 },
      // The park, in the reference's layers (LEDGER session 10), every
      // one generated on white and keyed. The far shore: the treeline
      // and the bandshell across the water as one strip, its foot just
      // under the waterline. It keeps the canopy's id — the elms that
      // grow through a lifetime and count its years are these. 1536 × 232.
      {
        id: 'canopy',
        z: -90,
        width: 290,
        height: 47.6,
        baseY: -1,
        shade: 0.12,
        images: {
          'LATE SUMMER': 'plates/scene-04/park/far-shore-late-summer.webp',
          AUTUMN: 'plates/scene-04/park/far-shore-autumn.webp',
          WINTER: 'plates/scene-04/park/far-shore-winter.webp',
          SPRING: 'plates/scene-04/park/far-shore-spring.webp',
        },
      },
      // The near shore: the sea wall and the shrubs along the path, one
      // short band tiled along the water's edge. Keeps the far bank's id.
      {
        id: 'far-bank',
        z: 4,
        width: 96,
        height: 1.06,
        baseY: -0.1,
        shade: 0.08,
        lip: 0.42,
        // A stone wall is the same wall all year.
        images: { '*': 'plates/scene-04/park/shoreline.webp' },
        imageRepeat: 12,
      },
      // The lawn: the ground itself, from the wall back past the seat,
      // its tile mirrored across it. Keeps the near bank's id; the
      // thermal reads it as the grass it is.
      {
        id: 'near-bank',
        z: 4,
        width: 200,
        height: 40,
        baseY: 0,
        shade: 0.1,
        ground: { depth: 40, repeat: [32, 6.5] },
        images: {
          'LATE SUMMER': 'plates/scene-04/park/lawn-late-summer.webp',
          AUTUMN: 'plates/scene-04/park/lawn-autumn.webp',
          WINTER: 'plates/scene-04/park/lawn-winter.webp',
          SPRING: 'plates/scene-04/park/lawn-spring.webp',
        },
      },
      // The nearest people: the couple, the reader, the man with his dog,
      // on their blanket just ahead of the seat, cropped by the frame's
      // foot. An August cutout, as the bench was: there for the second
      // and gone once the year turns. 1526 × 556.
      {
        id: 'foreground',
        x: 0.3,
        z: 12,
        width: 5.2,
        height: 1.9,
        baseY: -0.9,
        shade: 0.1,
        present: [
          { from: 0, to: 0.12, edge: 0.04 },
          { from: 0.93, to: 1.06, edge: 0.04 },
        ],
        images: { '*': 'plates/scene-04/park/foreground.webp' },
      },
      // The elms we sit under: two trunks at the frame's edges and their
      // canopy across its top, a card just ahead of the camera. It goes
      // with the seat: the rise leaves it below and the lifetime never
      // has it. 1536 × 1024.
      {
        id: 'trees',
        z: 13.5,
        width: 6.4,
        height: 4.27,
        // High enough that only the canopy's fringe hangs into the top
        // of the frame; the trunks run out of its foot.
        baseY: 0.6,
        shade: 0.08,
        images: {
          'LATE SUMMER': 'plates/scene-04/park/trees-late-summer.webp',
          AUTUMN: 'plates/scene-04/park/trees-autumn.webp',
          WINTER: 'plates/scene-04/park/trees-winter.webp',
          SPRING: 'plates/scene-04/park/trees-spring.webp',
        },
      },
    ],
    figures: [
      // Who is on the lawn: two sheets of nine, each group placed at most
      // once and spaced so the lawn is company, not a crowd; the second
      // sheet is Minneapolis without saying so. A sheet is cut at one
      // scale, so `size` is the world size of a tile — the largest group
      // fills it and the rest keep their drawn proportions — and depth
      // does the rest; no placement has a size of its own. The couple and the reader
      // of the first sheet are the foreground's own and are not placed.
      {
        id: 'sitters',
        atlas: { image: 'plates/scene-04/park/sitters.webp', cols: 3, rows: 6, count: 18 },
        size: 2.7,
        baseY: 0,
        life: { breath: 0.012, sway: 0.5 },
        present: [
          { from: 0, to: 0.12, edge: 0.04 },
          { from: 0.93, to: 1.06, edge: 0.04 },
        ],
        places: [
          { id: 'family', cell: 1, x: 7.2, z: 6.6 },
          { id: 'man-dog', cell: 4, x: -6.4, z: 6.8 },
          { id: 'chair', cell: 6, x: -9.2, z: 5.6 },
          { id: 'lying', cell: 8, x: 4.0, z: 6.2 },
          { id: 'somali-family', cell: 9, x: -4.6, z: 9.2 },
          { id: 'thermos-couple', cell: 10, x: 5.4, z: 10.6 },
          { id: 'purple-hoodie', cell: 12, x: 7.6, z: 6.4 },
          { id: 'grandmother', cell: 13, x: -1.6, z: 6.4 },
          { id: 'paddle', cell: 16, x: -4.8, z: 5.3 },
          { id: 'growler', cell: 17, x: -13, z: 9.8 },
        ],
      },
      // Who is passing: on the path along the wall, each at their own
      // pace, wrapping beyond the frame's edges.
      {
        id: 'movers',
        atlas: { image: 'plates/scene-04/park/movers.webp', cols: 6, rows: 4, count: 24, frames: 2 },
        size: 2.6,
        baseY: 0,
        walk: { from: -34, to: 34 },
        life: { bob: 0.022, lean: 3, wobble: 1 },
        present: [
          { from: 0, to: 0.12, edge: 0.04 },
          { from: 0.93, to: 1.06, edge: 0.04 },
        ],
        places: [
          { id: 'jogger', cell: 0, x: -20, z: 4.7, speed: 2.6 },
          { id: 'woman', cell: 1, x: 8, z: 4.8, speed: -1.25 },
          { id: 'man', cell: 2, x: 24, z: 4.7, speed: 1.4 },
          { id: 'cyclist', cell: 3, x: -30, z: 4.6, speed: 4.4, ride: true },
          { id: 'family', cell: 4, x: -4, z: 4.9, speed: -0.9 },
          { id: 'stroller', cell: 5, x: 16, z: 4.8, speed: 1.1 },
          { id: 'dog-walker', cell: 6, x: 30, z: 4.7, speed: 1.3 },
          { id: 'child', cell: 7, x: -12, z: 4.9, speed: 2.2 },
          { id: 'runner', cell: 8, x: 2, z: 4.6, speed: -2.4 },
          { id: 'skater', cell: 9, x: -26, z: 4.8, speed: 3.2, ride: true },
          { id: 'small-dog', cell: 10, x: 20, z: 4.9, speed: -0.9 },
          { id: 'bike-walker', cell: 11, x: -18, z: 4.7, speed: 1.2 },
        ],
      },
      // The boats: sails across the lake, drifting. Not there in the ice.
      {
        id: 'boats',
        atlas: { image: 'plates/scene-04/park/boats.webp', cols: 3, rows: 3, count: 9 },
        size: 6,
        baseY: -0.3,
        walk: { from: -70, to: 70 },
        life: { heel: 2, breath: 0.006 },
        present: [
          { from: 0, to: 0.12, edge: 0.04 },
          { from: 0.93, to: 1.06, edge: 0.04 },
        ],
        places: [
          { id: 'boat-a', cell: 0, x: -30, z: -60, speed: 0.5 },
          { id: 'boat-b', cell: 4, x: 10, z: -44, speed: -0.4 },
          { id: 'boat-c', cell: 7, x: 40, z: -70, speed: 0.35 },
          { id: 'boat-d', cell: 2, x: -55, z: -30, speed: 0.55 },
          { id: 'boat-e', cell: 5, x: 25, z: -34, speed: -0.6 },
          { id: 'boat-f', cell: 8, x: 60, z: -52, speed: -0.45 },
        ],
      },
      // ---- the crowd through the year (LEDGER 10d). Late October: the
      // few who stay on the lawn in the cold, and the path's traffic in
      // jackets; a man raking at the path's edge does not move.
      {
        id: 'sitters-autumn',
        atlas: { image: 'plates/scene-04/park/sitters-autumn.webp', cols: 3, rows: 3, count: 9 },
        size: 2.5,
        baseY: 0,
        life: { breath: 0.012, sway: 0.5 },
        present: { from: 0.2, to: 0.42, edge: 0.04 },
        places: [
          { id: 'sweater-couple', cell: 0, x: -5, z: 9 },
          { id: 'leaf-pile', cell: 1, x: 6, z: 7.5 },
          { id: 'photographer', cell: 3, x: -2, z: 5.8 },
          { id: 'chair-blanket', cell: 4, x: -10, z: 6.2 },
          { id: 'pumpkin-family', cell: 5, x: 4, z: 11 },
          { id: 'hat-dog', cell: 7, x: 10, z: 9.5 },
        ],
      },
      {
        id: 'movers-autumn',
        atlas: { image: 'plates/scene-04/park/movers-autumn.webp', cols: 6, rows: 3, count: 18, frames: 2 },
        size: 2.3,
        baseY: 0,
        walk: { from: -34, to: 34 },
        life: { bob: 0.022, lean: 3, wobble: 1 },
        present: { from: 0.2, to: 0.42, edge: 0.04 },
        places: [
          { id: 'runner', cell: 0, x: -20, z: 4.7, speed: 2.5 },
          { id: 'dog-walker', cell: 1, x: 10, z: 4.8, speed: -1.2 },
          { id: 'cyclist', cell: 2, x: -30, z: 4.6, speed: 4.2, ride: true },
          { id: 'raker', cell: 3, x: -14, z: 5.0 },
          { id: 'coffee-friends', cell: 4, x: 22, z: 4.8, speed: 1.1 },
          { id: 'kid-bike', cell: 5, x: -8, z: 4.9, speed: 2.0, ride: true },
          { id: 'old-couple', cell: 6, x: 30, z: 4.7, speed: -0.8 },
          { id: 'stroller-jogger', cell: 7, x: 2, z: 4.8, speed: 2.2 },
        ],
      },
      // Mid January: the lake is the park. What stays put on the ice —
      // a fishing house, a man on a bucket, a bonfire, a rink's net — and
      // a snowman and a sled on the lawn; skaters and a skier and a man
      // with an auger crossing the ice, a few on the path in parkas.
      {
        id: 'ice-winter',
        atlas: { image: 'plates/scene-04/park/ice-winter.webp', cols: 3, rows: 3, count: 9 },
        size: 3.0,
        baseY: 0,
        life: { breath: 0.008 },
        present: { from: 0.46, to: 0.64, edge: 0.04 },
        places: [
          { id: 'ice-house', cell: 0, x: -34, z: -44 },
          { id: 'fisherman', cell: 1, x: -12, z: -30 },
          { id: 'snowman', cell: 2, x: 9, z: 6.6 },
          { id: 'bonfire', cell: 4, x: 24, z: -36 },
          { id: 'sled', cell: 5, x: -7, z: 7.4 },
          { id: 'hockey-net', cell: 6, x: 36, z: -26 },
          { id: 'standing-pair', cell: 7, x: 4, z: -18 },
          { id: 'kneeling-child', cell: 8, x: -22, z: -20 },
        ],
      },
      {
        id: 'movers-winter',
        atlas: { image: 'plates/scene-04/park/movers-winter.webp', cols: 6, rows: 3, count: 18, frames: 2 },
        size: 2.5,
        baseY: 0,
        walk: { from: -60, to: 60 },
        life: { bob: 0.02, lean: 3, wobble: 1.2 },
        present: { from: 0.46, to: 0.64, edge: 0.04 },
        places: [
          { id: 'skater', cell: 0, x: -10, z: -24, speed: 2.4, ride: true },
          { id: 'skating-couple', cell: 1, x: 20, z: -28, speed: -1.6, ride: true },
          { id: 'hockey-player', cell: 2, x: 34, z: -26, speed: 2.8, ride: true },
          { id: 'sled-puller', cell: 3, x: -30, z: -16, speed: 0.9 },
          { id: 'parka-dog', cell: 4, x: 12, z: 4.8, speed: -1.0 },
          { id: 'runner-tights', cell: 5, x: -25, z: 4.7, speed: 2.4 },
          { id: 'runner-yellow', cell: 6, x: 5, z: 4.7, speed: -2.2 },
          { id: 'fat-bike', cell: 7, x: 26, z: 4.6, speed: 3.4, ride: true },
          { id: 'auger-man', cell: 8, x: 0, z: -40, speed: -0.7 },
        ],
      },
      // Late April: the first blankets back, in jackets, and the geese.
      {
        id: 'sitters-spring',
        atlas: { image: 'plates/scene-04/park/sitters-spring.webp', cols: 3, rows: 3, count: 9 },
        size: 2.5,
        baseY: 0,
        life: { breath: 0.012, sway: 0.5 },
        present: { from: 0.68, to: 0.88, edge: 0.04 },
        places: [
          { id: 'takeout-couple', cell: 0, x: -4, z: 8.8 },
          { id: 'hoodie-man', cell: 1, x: 6, z: 6.2 },
          { id: 'mother-baby', cell: 2, x: 2, z: 10.8 },
          { id: 'chair-reader', cell: 4, x: 11, z: 8 },
          { id: 'goslings', cell: 5, x: -9, z: 5.6 },
          { id: 'sketchbook', cell: 6, x: 8, z: 11.4 },
          { id: 'kite-boy', cell: 8, x: -12, z: 9 },
        ],
      },
      {
        id: 'movers-spring',
        atlas: { image: 'plates/scene-04/park/movers-spring.webp', cols: 6, rows: 3, count: 18, frames: 2 },
        size: 2.0,
        baseY: 0,
        walk: { from: -34, to: 34 },
        life: { bob: 0.022, lean: 3, wobble: 1 },
        present: { from: 0.68, to: 0.88, edge: 0.04 },
        places: [
          { id: 'runner', cell: 0, x: -18, z: 4.7, speed: 2.6 },
          { id: 'rollerblader', cell: 1, x: 8, z: 4.6, speed: -3.0, ride: true },
          { id: 'dog-coffee', cell: 2, x: 24, z: 4.8, speed: 1.2 },
          { id: 'child-bike-parent', cell: 3, x: -30, z: 4.8, speed: 1.8, ride: true },
          { id: 'cyclist', cell: 4, x: 14, z: 4.6, speed: 4.6, ride: true },
          { id: 'umbrella-man', cell: 5, x: -6, z: 4.7, speed: -1.3 },
          { id: 'teens', cell: 6, x: 30, z: 4.8, speed: 1.0 },
          { id: 'stroller-rain', cell: 7, x: -2, z: 4.9, speed: -1.1 },
          { id: 'geese-walking', cell: 8, x: -12, z: 5.2, speed: 0.4 },
        ],
      },
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
      // Softer than full over the pointillist park: cold ground read at
      // full strength was a dark wash over a pale spring lawn.
      {
        kind: 'thermal',
        from: 0.3,
        to: 0.9,
        strength: 0.55,
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
    // The survey. Once the year turns (local 0.12), a day of the record is
    // 0.0024 of local progress; the events below fall where the real sun
    // puts them — equinox 23 Sep (0.21), sundial fastest 2 Nov (0.31),
    // solstice 21 Dec (0.43), sundial slowest 11 Feb (0.55), equinox
    // 20 Mar (0.64), the figure crosses itself mid-April (0.70), solstice
    // 21 Jun (0.87). Each callout opens a little ahead of its instant and
    // stays a few weeks. The live blocks are up before the year turns, so
    // the survey is set before there is anything to measure; everything
    // is off the page before the scene's own fade at 0.95.
    figure: {
      enter: 0.02,
      exit: 0.012,
      callouts: [
        { kind: 'header', from: 0.04, to: 0.955 },
        { kind: 'plan', from: 0.06, to: 0.955 },
        { kind: 'specimen', from: 0.08, to: 0.955 },
        { kind: 'datum', from: 0.1, to: 0.95 },
        { kind: 'trace', from: 0.12, to: 0.95 },
        { kind: 'now', from: 0.125, to: 0.95 },
        { kind: 'altitude', from: 0.14, to: 0.2 },
        { kind: 'equinox-autumn', from: 0.2, to: 0.25 },
        { kind: 'azimuth', from: 0.25, to: 0.36 },
        { kind: 'title', from: 0.3, to: 0.95 },
        { kind: 'eot-fast', from: 0.3, to: 0.37 },
        { kind: 'solstice-winter', from: 0.41, to: 0.5 },
        { kind: 'altitude', from: 0.42, to: 0.5 },
        { kind: 'eot-slow', from: 0.54, to: 0.61 },
        { kind: 'equinox-spring', from: 0.63, to: 0.7 },
        { kind: 'node', from: 0.695, to: 0.78 },
        { kind: 'solstice-summer', from: 0.85, to: 0.94 },
        { kind: 'altitude', from: 0.86, to: 0.9 },
        { kind: 'height', from: 0.89, to: 0.95 },
        { kind: 'width', from: 0.9, to: 0.95 },
      ],
    },
    fadeIn: 0.035,
    fadeOut: 0.05,
  },
  {
    id: 'scene-05-lifetime',
    label: 'A LIFETIME',
    lengthVh: 200,
    timeRate: 2_524_608_000,
    // The year's world, held at the August it closed on, seen from
    // higher and further back as eighty years pass: the elms grow
    // enormous, the sun's record stacks year on year into a band, and an
    // elm counts the years as rings. The starting afternoon becomes one
    // coordinate. Then the world fades, for the turn.
    // The afternoon's people, over eighty years: appearances. Each is
    // there for a third of a second every couple of seconds, leaving a
    // trace, and by the end three times rarer.
    hold: {
      of: 'scene-04-year',
      at: 1,
      years: 80,
      grow: 1.7,
      appearances: { period: 2.4, dwell: 0.3, trace: 1.6, rarer: 3 },
    },
    camera: {
      from: { y: 9.5, z: 27, lookY: 9.5 },
      to: { y: 20, z: 44, lookY: 16 },
    },
    instruments: [
      { kind: 'band', from: 0.02, to: 0.96 },
      { kind: 'rings', from: 0.05, to: 0.94 },
      // The far shore cut open: the stand's roots, one hairline a root,
      // growing with the years under the elms, and joining underground
      // as a stand's do — the memory corridor's metaphor, made literal
      // on the ground the piece was looking at all along.
      { kind: 'roots', from: 0.04, to: 0.95, strength: 0.7, depth: 8, stand: 13 },
    ],
    fadeOut: 0.06,
  },
  {
    id: 'scene-06-return',
    label: '',
    // Long enough that the stop is a stop: the black has to be sat in
    // before the line arrives, and the line before the fall.
    lengthVh: 140,
    caption: 'But that isn’t how you experienced it.',
    captionAt: { from: 0.12, to: 0.52 },
    timeRate: 0,
    // Everything stops. Black, the line, and then the fall: the park
    // comes back — the same August afternoon the piece opened on, the
    // elms their own size again — from where the lifetime left the eye,
    // all the way down to the bench.
    hold: { of: 'scene-04-year', at: 0, from: 0.56 },
    // The fall starts high but no further back than the treeline can
    // fill — beyond about z 28 the strip shows its ends — and the black
    // before it hides the join, so it need not begin where the lifetime
    // left the eye. What is left is a drop: twenty units down to the seat.
    camera: {
      from: { y: 20, z: 28, lookY: 14 },
      to: { y: 2.5, z: 16, lookY: 0.35 },
      ease: 'fall',
    },
    cameraAt: { from: 0.56, to: 1 },
    fadeIn: 0.2,
  },
  {
    id: 'scene-07-attention',
    label: '1 SECOND',
    lengthVh: 150,
    timeRate: 0.1,
    // The inward zoom. The same second the piece opened on, held: the
    // clock does not move and neither does the world. What changes is
    // how finely the second is divided — the label descends from one
    // second to a hundredth — and how much of what was always there is
    // being read. The instruments arrive one after another and none of
    // them leaves, so the scene ends with every layer on at once: the
    // absorbed state, which is what scene 08 then walks a corridor in.
    hold: { of: 'scene-04-year', at: 0 },
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
    instruments: [
      { kind: 'thermal', from: 0.08, to: 1, strength: 0.5, ramp: [0x24425f, 0x35566a, 0xe0b884, 0xffe6b0], range: [18, 34] },
      { kind: 'flow', from: 0.3, to: 1 },
      {
        kind: 'radar',
        from: 0.52,
        to: 1,
        period: 6,
        scope: { corner: 'top-right', size: 0.28, inset: { x: 0.04, y: 0.095 } },
      },
      // The finest division: one leaf read as the network it is, drawn
      // in vein by vein as the label descends to a hundredth of a second,
      // and still being drawn when the corridor takes the frame.
      {
        kind: 'leaf',
        from: 0.66,
        to: 1,
        scope: { corner: 'bottom-right', size: 0.34, inset: { x: 0.04, y: 0.095 } },
      },
    ],
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
          atlas: { image: 'plates/scene-09/days-same.webp', cols: 6, rows: 2, count: 9 },
        },
        {
          id: 'vivid',
          label: 'A MONTH OF DIFFERENT DAYS',
          from: 0.54,
          to: 0.97,
          scatter: { x: 4, y: 2.4, z: 10, tilt: 30 },
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
    id: 'scene-10-return-to-now',
    label: '1 SECOND',
    // Longer than the second it opened on: an ending needs room to leave in.
    lengthVh: 180,
    caption: 'The moment didn’t get longer.\nYou got closer.',
    captionAt: { from: 0.58, to: 0.88 },
    timeRate: 1,
    // Exactly the same lake, from exactly the same seat, at exactly the
    // same second the piece opened on — the camera does not move,
    // because nothing about the afternoon has changed. Only what is
    // being noticed has. Every instrument is faintly on at once, and
    // then they go, one by one: the ring of seasons first, the most
    // abstract of them, and the wind on the water last, being the least
    // like an instrument and the most like the world. Then the line,
    // and then the interface itself.
    hold: { of: 'scene-04-year', at: 0 },
    camera: {
      from: { y: 2.5, z: 16, lookY: 0.35 },
      to: { y: 2.5, z: 16, lookY: 0.35 },
    },
    instruments: [
      { kind: 'ring', from: 0, to: 0.18, strength: 0.5 },
      { kind: 'radar', from: 0, to: 0.3, strength: 0.5, period: 6, scope: { corner: 'top-right', size: 0.28, inset: { x: 0.04, y: 0.095 } } },
      { kind: 'thermal', from: 0, to: 0.42, strength: 0.32, ramp: [0x24425f, 0x35566a, 0xe0b884, 0xffe6b0], range: [18, 34] },
      { kind: 'flow', from: 0, to: 0.54, strength: 0.5 },
    ],
    hudOut: { from: 0.88, to: 0.98 },
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
