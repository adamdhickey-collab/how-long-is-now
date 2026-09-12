# Visual defects, first pass

A frame-by-frame audit, 2026-09-11. Thirty-one frames at 1400 × 800,
drawn through the composition's own lens, one every scene at several
points: `scripts` has no part in this — the frames are readbacks of the
running piece, and the method is written down at the end so the next
pass can add to the list rather than start it again.

Severity: **A** breaks the frame — you see it before you see the park.
**B** is visible once looked for. **C** is polish.

## The one that explains most of the others

**D-01 · A · FIXED 18ac · scenes 03, 04, 05, 07, 10 — the widened bands
carried rectangles.** Every whole-frame plate (sky, far shore, water, ground)
was painted at 1536 × 1024 and widened to 3072 × 2048 so the camera can
leave the painting's frame. Summer's were cleaned by hand (18s). The
other three seasons' were not, and the fill shows as pale rectangular
panels, mosaic blocks and vertical seams — worst in spring, where the
sky above the far shore is a visible chequerboard, and in autumn, where
a pale panel runs the width of the frame across the top.

Everything in the year after the first turn of the season was sitting
under this, and it was one fault in three parts, not fifty defects.

**What it actually was.** A season's band used to be built by setting
that season's painting into August's outpainted continuation, recolouring
the continuation through a 24³ colour lookup learned from the two
paintings, and grading the result. The lookup was read cell by cell, so
a smooth sky came out in flat patches; cells it had no data for were
skipped entirely, so August showed through them as pale panels; and the
grade's lift took the seasons nearly white. Above the painting there was
a fourth thing, and it was August's too: the continuation's own sky
arrives as vertical panels of slightly different blue, invisible from the
seat and the first thing the eye finds when the camera draws back.

**What they are now.** August's band is right — its matte was drawn by
hand and its continuation cleaned — so a season takes that band's own
alpha and its continuation, mapped to the season by matching the two
paintings' own distributions channel by channel over the band, with the
season's painting laid into it where the painting reaches. No lookup, no
cells, nothing invented: inside the frame it is the season as painted,
outside it is August's continuation wearing the season's colour. And the
sky above the painting is held from the painting's own topmost sky,
column by column, with the continuation's grain kept.

**And a fifth thing, which was the one that made the canopy look
broken.** A keyed plate's transparent pixels still hold a colour, and it
is whatever the key threw away — for the elms' boughs, a dark ground.
Nothing samples them at full size, because the alpha is zero, but
everything samples them the moment the plate is minified: a mip level is
the average of the pixels under it, alpha and colour alike, so a branch
a pixel wide over a field of dark averages to a dark smudge, and a
canopy's worth of them arrives as a field of grey rectangles. It was
invisible in the plate, which is clean, and it was in every keyed plate
in the piece. The cutter bleeds each subject's colour outward under its
own transparency now, so minifying a canopy averages leaves with leaves.

**What is left of it.** A pale panel over the trees left of the
bandshell, and some faint tiling above it — the far shore's own
continuation. The lawn's diagonal is gone: the turf is a rectangle of
lawn laid over a lawn, and its sides are feathered now as its far edge
already was.

## Scene 01, the park (frames s01-15, s01-55, s01-90)

- **D-02 · B · FIXED 18ag** A pale vertical strip down the left edge, about
  20 px wide, the full height. Not the widened lawn: the left elm's own
  matte. The tree matte is what differs between the painting and the
  park with its trees inpainted away, and at the trunk's foot the model
  had repainted the lawn a shade off, so forty pixels of sunlit grass
  came away with the tree and hung over the frame's edge as a haze.
  Colour cannot tell bark in shade from grass in shade — the painting
  lays the same dots on both — so the trunks are now cut by shape: each
  is walked down its own rows from a row where it is only trunk, and
  every row keeps the run under the one above it, free to flare a
  fraction either side and no more.
- **D-03 · B · FIXED 18ag** A dark rectangular notch in the foliage at the
  top-left corner. The same milk as D-04 and D-05, read against the
  leaves rather than the sky.
- **D-04 · B · FIXED 18ag** A faint horizontal seam across the sky — in
  fact a band of milk the width of the frame, and the largest thing
  wrong with the opening view. The far shore was cut at a line: one row
  a column, taken where the sky's key first fails, then run through a
  forty-one column median so it would not wander. A median of a treeline
  is a plateau; every crown was levelled, and the strip between the real
  tops and the levelled line went to the sky band, which fills below its
  own line with the sky mirrored down — so what lay across the frame
  where the trees' tops belong was smeared sky with the bandshell's
  ghost in it. The shore's top is no longer a line: within a hundred
  rows of it the shore is as opaque as its picture is not sky, so the
  silhouette is the painted one. And the sky's fill now begins a crown's
  height above that, where the sky is only sky, carrying the column's
  own gradient down instead of one flat blue.
- **D-05 · B · FIXED 18ag** The far shore behind the bandshell goes hazy
  and blocky toward the right edge. The blocks were the levelled line
  stepping from column to column and the fill's panels either side of
  it; both are gone with D-04. What is left there is the elms' own
  canopy, which is thinner than the painting's in places — the matte's,
  not the band's.
- **D-06 · C · NOT A DEFECT (18ag)** The lawn at bottom-right was called
  flat. Measured against the painting at the same place, its local
  contrast is the painting's to a fiftieth (sd 23.7 against 23.5); the
  frames had been compared at the same screen position, where the
  composite has a man and a dog and the painting has grass.
- **D-07 · C · NOT A DEFECT (18ag)** The reader's sandal at bottom-left,
  looked at three times over, has a painted edge like the rest of her.
  What is a little hard is the outside of her calf, and that is one
  stroke's worth.

## Scene 02, ten minutes (s02-20, s02-60, s02-92)

- **D-08 · A · FIXED 18af** Figures sat at half opacity for long stretches — at 0.92
  the couple bottom-right, two at the shore and the man with the dog are
  all ghosts. The lapse's fade is too slow, or its window too short, so
  the crowd spends more time arriving and leaving than being there.
- **D-09 · B · FIXED 18af** The man with the dog was drawn through the bicycle: his
  head behind the wheel, the dog over the frame.
- **D-10 · B · FIXED 18af** Three figures piled up at bottom-right, overlapping each
  other with no depth between them.
- **D-11 · NOT A DEFECT** The guitar player does have a shadow; a seated
  figure's is small and I misread the frame.

## Scene 03, the day (s03-04, s03-17, s03-36, s03-62, s03-90)

- **D-12 · B · FIXED 18ah** The dusk water's far half stayed daytime blue,
  so the join with the painting's far water showed across the middle of
  the lake. Repainted with its own depth in it — pale and hazy where it
  is furthest, darkening toward the shore, a path of gold down the
  middle — and it meets the painting without a line.
- **D-13 · B · FIXED 18ah** The night sky's city glow sat along the
  treeline in a ruled line. Repainted uneven: brighter in three places
  and gone between them, its upper edge ragged.
- **D-14 · C · FIXED 18ah** The deer had no shadow, where everything else
  on that bank has one. Redrawn with a soft pool of their own ground
  under each of them, fading out within a pace.
- **D-15 · B · FIXED 18af** At 0.62 the world was back to full day while the sky is
  still pale: the light comes back faster than the sky does.

## Scene 04, the year (s04-06 … s04-90)

- **D-16 · A · FIXED 18ac** See D-01. The top of the frame was panels at
  0.22 and a chequerboard at 0.72.
- **D-17 · A · FIXED 18ac** The near lawn washed out to pale beige in
  autumn and pale yellow-green in spring. It is the painting's own lawn
  now; what remains is a faint diagonal at the bottom-left corner where
  the ground band's far edge meets the continuation.
- **D-18 · B · FIXED 18ag** The season did not turn together: at 0.22 the
  far treeline was orange over a summer-green lawn. It turns together
  now — the bands share one set of weights, and what made one band look
  ahead of another was the continuation outside the painting keeping
  August's colour in three of them (D-21). Checked at 0.18, 0.22, 0.26,
  0.68, 0.72 and 0.76.
- **D-19 · B · FIXED 18ad** The right elm's trunk was a flat purple
  column with a hard edge and a smeared pale mass behind it. It is bark
  now: this was the colour under the transparency, not the trunk.
- **D-20 · B · FIXED 18af** Ghost figures mid-fade, as D-08.
- **D-21 · B · PART FIXED 18ag** A translucent rectangle at bottom-left,
  with a pink cast, and a band of different grass across the bottom.
  Most of it was the season bands: the lookup that dresses August's band
  in a season works a channel at a time, which lifts the lawn until it
  is pale but cannot take the green out of it, so outside the painting
  January carried a band of summer along the frame's edge and its foot,
  and where the lookup ran off its table on the continuation's bark, a
  streak of magenta. The continuation is now brought to the chroma the
  season actually has inside the painting, and no pixel is allowed far
  past it. The rows either side of the painting's left and right edges
  are joined tone for tone as well, so the edge cannot be found by
  looking. What remains is the last of it: the continuation is smooth
  where the painting is a mat of dots, and once the year pulls back past
  the painting's own edges that smoothness has a straight edge running
  out of each bottom corner. Filling it with the painting's lawn
  mirrored outward was tried and withdrawn — it laid the elms' shadow
  bands in stripes where there are no elms. It wants a painted wide
  lawn, and is queued as one.
- **D-22 · (fixed 18ab)** The elms we sit under were smears in three
  seasons out of four — a dark slab over the left trunk, a white one
  over the right. The derived canopies are gone; the boughs, which are
  painted stage by stage, carry the frame now.

## Scene 08, the two clocks (s08-20, s08-45, s08-78)

- **D-23 · (fixed 18ab)** The absorbed clock walked out of the allée
  into an empty plain: the trees were planted over the declared depth,
  which is shorter than the thirty bays it covers. Planted as far as
  either clock walks now.
- **D-24 · B · FIXED 18ah** The dapple read as horizontal stripes down
  the walk. It was a band of the painting's own near lawn, read for its
  light: a band of a painting is a band, and laid over the allée at any
  size it had a direction in it. It is now a square painted as nothing
  but that light, drawn to tile, so there is no direction to stretch.
- **D-25 · C · FIXED 18af** Every elm's shadow fell the same way at the same length,
  so the rhythm of trunk-and-shadow repeats visibly down the avenue.
- **D-26 · C · FIXED 18af** The fragments' panes carried a hairline border and a
  faint grey face, which reads as a UI element rather than a memory.

## Scene 09, the memory month (s09-30, s09-75)

- **D-27 · A · FIXED 18af** The panes' label strips overlapped each other and the panes
  themselves: at 0.75, `04 WRONG TURN` runs into another label and a
  third pane sits on top of both.
- **D-28 · A · FIXED 18af** Panes were cut by the frame's edges — at 0.75 three are
  half outside, one of them the largest in the field.
- **D-29 · B · FIXED 18af** Label text was illegible on any pane smaller than about a
  fifth of the frame: it is drawn at a fixed size on a shared sheet and
  then scaled down with the pane.
- **D-30 · B · FIXED 18af** The black label bars and monospace readings are the only
  interface-styled thing left inside a painted world.

## Scene 05, the lifetime (s05-20, s05-50, s05-92)

- **D-31 · C · FIXED 18ah** The elms in the wide picture did not grow.
  The same two elms are now painted twice, at twenty years and grown,
  and the lifetime blinks a second time at sixty years to change one for
  the other — so the trees age without either picture being dissolved
  through the other.
- **D-32 · C · FIXED 18ah** Nothing moved in the second half but the
  camera's slow push: the appearances are the year's own people, and the
  blink takes them away with the rest of the seat's park, leaving a
  painting with nobody in it. Twelve people are now drawn at the wide
  picture's own scale, cut from one sheet, and each comes and goes on
  the scene's own progress — a moment at a time, and more rarely as the
  years run out.

## Scene 10, the return (s10-12, s10-50, s10-80)

- **D-33 · B · FIXED 18af** The leaf with the beetle was large enough to
  read as a mistake at first glance; it is a third smaller.
- **D-34 · C · FIXED 18ah** The water on the shore read as a change of
  material, not of light, and the plate was why: a photographic close-up
  of a pebble beach, in neither the painting's idiom nor its subject.
  The park's lake meets grass. It is now the lake's last few feet running
  up into the bank, with the light on that inch of water as the whole of
  it.

## Where this stops

Thirty-one frames is a sample, not the piece. Three scenes were looked
at only in the small (02, 06, 07), and none of the transitions between
scenes were looked at at all — the joins are where the piece has always
been weakest, and they are not in this list. What is here is enough to
work from: D-01 alone accounts for most of what the year and the day
look like after the first season turns.

## How the frames were made

The browser pane reports a zero-size window, so anything laid out from
`innerWidth` — the memory scene's camera among them — draws nothing.
Define `innerWidth` and `innerHeight` on the window first, then set the
renderer's size, the camera's aspect and the composition's own fov for
the shape being captured, step the scene, and read the drawing buffer
back with `gl.readPixels`. `scripts/.tmp-frames.mjs` catches them to
disk by name. The whole set takes about a minute.


## The day and night (18ai)

- **D-35 · A · FIXED 18ai** Only the sky and the lake changed hour. The
  far treeline and the near lawn stayed in full afternoon through the
  sunset and the night, so midnight was a daylight park with a dark band
  across the top. Both are painted at both hours now, cut by their own
  daylight plates' mattes so nothing moves but the light.
- **D-36 · B · FIXED 18ai** Between the night going and the dawn coming,
  a quarter of the frame was still August at four in the afternoon and
  the park washed out: two hour-paintings part-way through at once leave
  the afternoon showing between them. The evening holds under the whole
  of the dark now, and the night fades up and down inside it.
- **D-37 · B · FIXED 18ai** The invitation in the lower left read as
  decoration: dim type on a slow breath, saying something a visitor has
  to understand before the piece works at all. It is drawn now — a gauge
  whose top tick is the span being stood in, a bead falling it, and the
  fact in the HUD's own caps under the line.

## The frame beyond the painting (18aj)

- **D-38 · A · FIXED 18aj** Thirty per cent of the year's widest frame,
  and half of the lifetime's, was the model's continuation: one outpaint
  drawn at half size and doubled, so its dots were twice the painting's
  and every join showed. Measured by drawing each band with a flat
  texture, the painting green and the continuation magenta. The margin is
  now the painting's own paint, mirror-folded outward with a wander, and
  nothing out there is invented.
- **D-39 · A · FIXED 18aj** The turf at our feet was one drawn rectangle
  of grass stretched over twenty units of ground: its dots three times
  the painting's, its colour a third of a season off, and a hard line
  where it met the painting's lawn. It is a tile now, laid across three
  times rather than stretched once, graded to each season's near lawn.
- **D-40 · B · FIXED 18aj** Folded from the whole width, the margin
  brought the right elm's trunk and its shadow out with it over and over,
  and the lawn beside the frame read as a rank of felled logs. The fold
  draws only from the middle of the painting now, where nothing can be
  recognised twice.
- **D-41 · B · FIXED 18aj** The far shore folded outward gave the park a
  second bandshell. Its band takes a drawn treeline instead, made to
  repeat end to end and carrying no landmark.
- **D-42 · B · FIXED 18aj** Below twice the painting's height the foot
  mirror clamped instead of folding, so every row took the same source
  row and the foot of the frame drew as vertical streaks.

- **D-43 · A · FIXED 18ak** The foot of the frame was one row of the
  painting drawn toward the viewer as vertical stripes: a lying plate's
  skirt held a single texture row from where the last ray meets the
  ground back to behind the seat. It sweeps a tenth of the frame now,
  into the folded near lawn.
- **D-44 · A · FIXED 18ak** The turf covering that band was stretched
  (dots four times the painting's), placed over half the lawn rather than
  the strip it is for, and ordered in front of the nearest people, whom
  it cut off at the waist. It tiles in both directions now, its far edge
  is eased in the vertices rather than in the picture, it covers the two
  hundred rows the ground plate cannot reach, and it draws with the
  ground.

## Waiting on art

The seven prompts that had been written and queued were all drawn in
18ah, and the plates they feed are cut: D-12, D-13, D-14, D-24, D-31,
D-32 and D-34 are closed. One thing is still owed a picture:

- **D-21** the near lawn beyond the painting's own left and right edges,
  painted rather than continued, so the year's pull-back does not find a
  straight edge in the grass. Mirroring the painting's own lawn outward
  was tried in 18ag and withdrawn: it laid the elms' shadow bands in
  stripes where there are no elms.
