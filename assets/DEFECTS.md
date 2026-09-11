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

**What is left of it.** The corners above the painting still carry some
block texture where the continuation's own elm foliage is, the far shore's
continuation around the bandshell is still soft, and the near lawn's far
edge draws a faint diagonal at the bottom left. All three are in the
continuation, not the seasons, and they are what a future pass should
take.

## Scene 01, the park (frames s01-15, s01-55, s01-90)

- **D-02 · B** A pale vertical strip down the left edge, about 20 px
  wide, the full height: the widened lawn and sky meeting the frame.
- **D-03 · B** A dark rectangular notch in the foliage at the top-left
  corner, roughly 15 × 20 px. A block of another plate.
- **D-04 · C** A faint horizontal seam across the sky at x 380–520.
- **D-05 · B** The far shore behind the bandshell goes hazy and blocky
  toward the right edge, where the band was extended.
- **D-06 · C** The lawn at bottom-right is flat: a wide patch with no
  dot texture and no shadow, paler than the grass around it.
- **D-07 · C** The reader's sandal at bottom-left has a hard keyed edge.

## Scene 02, ten minutes (s02-20, s02-60, s02-92)

- **D-08 · A** Figures sit at half opacity for long stretches — at 0.92
  the couple bottom-right, two at the shore and the man with the dog are
  all ghosts. The lapse's fade is too slow, or its window too short, so
  the crowd spends more time arriving and leaving than being there.
- **D-09 · B** The man with the dog is drawn through the bicycle: his
  head behind the wheel, the dog over the frame.
- **D-10 · B** Three figures pile up at bottom-right, overlapping each
  other with no depth between them.
- **D-11 · C** The guitar player casts no shadow; his neighbours do.

## Scene 03, the day (s03-04, s03-17, s03-36, s03-62, s03-90)

- **D-12 · B** The dusk water's far half stays daytime blue: the painted
  band's own gradient runs dark at the top, so the join with the
  painting's far water is visible across the middle of the lake.
- **D-13 · B** The night sky's warm city glow sits along the treeline in
  a straight line, because the band's bottom edge is straight and the
  mask only cuts the trees out above it.
- **D-14 · C** The deer have no reflection and no shadow; everything
  else on that bank has one.
- **D-15 · B** At 0.62 the world is back to full day while the sky is
  still pale: the light comes back faster than the sky does.

## Scene 04, the year (s04-06 … s04-90)

- **D-16 · A · FIXED 18ac** See D-01. The top of the frame was panels at
  0.22 and a chequerboard at 0.72.
- **D-17 · A · FIXED 18ac** The near lawn washed out to pale beige in
  autumn and pale yellow-green in spring. It is the painting's own lawn
  now; what remains is a faint diagonal at the bottom-left corner where
  the ground band's far edge meets the continuation.
- **D-18 · B** The season does not turn together: at 0.22 the far
  treeline is fully orange while the near lawn is still summer green; at
  0.72 the canopy is in blossom over an autumn-yellow far shore.
- **D-19 · B** The right elm's trunk is a flat purple column with a hard
  edge and a smeared pale mass behind it.
- **D-20 · B** Ghost figures mid-fade, as D-08.
- **D-21 · C** A translucent rectangle sits at bottom-left through most
  of the year.
- **D-22 · (fixed 18ab)** The elms we sit under were smears in three
  seasons out of four — a dark slab over the left trunk, a white one
  over the right. The derived canopies are gone; the boughs, which are
  painted stage by stage, carry the frame now.

## Scene 08, the two clocks (s08-20, s08-45, s08-78)

- **D-23 · (fixed 18ab)** The absorbed clock walked out of the allée
  into an empty plain: the trees were planted over the declared depth,
  which is shorter than the thirty bays it covers. Planted as far as
  either clock walks now.
- **D-24 · B** The lawn's dapple reads as horizontal stripes in the
  distance, where the map is stretched along the walk.
- **D-25 · C** Every elm's shadow falls the same way at the same length,
  so the rhythm of trunk-and-shadow repeats visibly down the avenue.
- **D-26 · C** The fragments' panes still carry a hairline border and a
  faint grey face, which reads as a UI element rather than a memory.

## Scene 09, the memory month (s09-30, s09-75)

- **D-27 · A** The panes' label strips overlap each other and the panes
  themselves: at 0.75, `04 WRONG TURN` runs into another label and a
  third pane sits on top of both.
- **D-28 · A** Panes are cut by the frame's edges — at 0.75 three are
  half outside, one of them the largest in the field.
- **D-29 · B** Label text is illegible on any pane smaller than about a
  fifth of the frame: it is drawn at a fixed size on a shared sheet and
  then scaled down with the pane.
- **D-30 · B** The black label bars and monospace readings are the only
  interface-styled thing left inside a painted world.

## Scene 05, the lifetime (s05-20, s05-50, s05-92)

- **D-31 · C** The elms in the new wide picture do not grow: the eighty
  years pass and the trees are the same size at the end as at the blink.
- **D-32 · C** Nothing moves in the second half but the camera's slow
  push; the appearances stop when the seat's park goes.

## Scene 10, the return (s10-12, s10-50, s10-80)

- **D-33 · B** The leaf with the beetle is large enough to read as a
  mistake at first glance rather than a thing noticed.
- **D-34 · C** The water on the shore is a lighter strip against a
  darker bank; the join reads as a change of material, not of light.

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
