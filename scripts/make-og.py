#!/usr/bin/env python3
"""Generate the social preview card for HOW LONG IS NOW?

The card is the piece itself — Lake Harriet on a late-summer afternoon,
painted from the same palette scene 04 declares in src/scenes/manifest.ts.
No title is drawn into it: the words come from the Open Graph tags, and
the piece has no hero. Deterministic, so re-running produces the same card.

    python3 scripts/make-og.py public/og.png
"""

import math
import random
import struct
import sys
import zlib

W, H = 1200, 630
HORIZON = 372      # far bank meets the water
WATER_END = 505    # water meets the near bank
SUN = (790.0, 118.0)

# Late summer, verbatim from the manifest's LATE_SUMMER palette.
ZENITH = (0x5a, 0x92, 0xbd)
HORIZON_C = (0xd8, 0xc9, 0xa8)
HAZE = (0xa9, 0xa0, 0x84)
CANOPY = (0x2f, 0x41, 0x28)
BANK = (0x1b, 0x24, 0x18)
WATER = (0x35, 0x56, 0x6a)
SUNC = (0xff, 0xe6, 0xb0)

buf = bytearray(W * H * 3)


def mix(a, b, t):
    t = 0.0 if t < 0 else 1.0 if t > 1 else t
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def row_fill(y, color):
    r, g, b = (int(c) & 255 for c in color)
    buf[y * W * 3:(y + 1) * W * 3] = bytes((r, g, b)) * W


def blend(x, y, color, alpha):
    if alpha <= 0 or x < 0 or y < 0 or x >= W or y >= H:
        return
    if alpha > 1:
        alpha = 1.0
    i = (y * W + x) * 3
    for k in range(3):
        buf[i + k] = int(buf[i + k] + (color[k] - buf[i + k]) * alpha)


def disc(cx, cy, r, color, alpha=1.0, falloff=False):
    """Anti-aliased filled circle; falloff makes it a soft radial glow."""
    x0, x1 = int(cx - r - 1), int(cx + r + 2)
    y0, y1 = int(cy - r - 1), int(cy + r + 2)
    for y in range(max(0, y0), min(H, y1)):
        dy = y - cy
        for x in range(max(0, x0), min(W, x1)):
            dx = x - cx
            d = math.sqrt(dx * dx + dy * dy)
            if falloff:
                if d < r:
                    blend(x, y, color, alpha * (1.0 - d / r) ** 2)
            else:
                cov = r + 0.5 - d
                if cov > 0:
                    blend(x, y, color, alpha * min(1.0, cov))


def vline(x, y0, y1, color, width=1.0, alpha=1.0):
    half = width / 2.0
    for y in range(int(min(y0, y1)), int(max(y0, y1)) + 1):
        for x2 in range(int(x - half - 1), int(x + half + 2)):
            cov = half + 0.5 - abs(x2 - x)
            if cov > 0:
                blend(x2, y, color, alpha * min(1.0, cov))


def stroke(x0, y0, x1, y1, color, width=1.0, alpha=1.0):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for i in range(n + 1):
        t = i / n
        disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, width / 2.0, color, alpha)


# ---------------------------------------------------------------- sky
for y in range(HORIZON + 4):
    t = y / float(HORIZON)
    row_fill(y, mix(ZENITH, HORIZON_C, t ** 2.4))

# the sun, and the glow it throws into the haze
disc(SUN[0], SUN[1], 190, SUNC, 0.42, falloff=True)
disc(SUN[0], SUN[1], 72, SUNC, 0.55, falloff=True)
disc(SUN[0], SUN[1], 21, SUNC, 0.97)

# haze thickening toward the horizon line
for y in range(HORIZON - 120, HORIZON + 4):
    t = (y - (HORIZON - 120)) / 120.0
    for x in range(W):
        blend(x, y, HORIZON_C, 0.45 * t * t)

# ---------------------------------------------------------------- the elms
rnd = random.Random(0x1A1E)
trunk_c = mix(CANOPY, (8, 11, 9), 0.5)


def stand(spacing, scale, colour, alpha, trunks):
    """One row of elms. The far row is hazier and shorter, so the
    treeline reads as a stand with depth rather than a hedge."""
    row = []
    x = -40.0
    while x < W + 50:
        h = (74 + rnd.random() * 132) * scale
        row.append({'x': x, 'h': h, 'w': (30 + rnd.random() * 30) * scale,
                    'seed': rnd.randrange(10 ** 6)})
        x += spacing * (0.72 + rnd.random() * 0.85)
    if trunks:
        for t in row:
            vline(t['x'], HORIZON - t['h'] * 0.96, HORIZON, trunk_c, 4.0, 0.95)
    for t in row:
        r2 = random.Random(t['seed'])
        crown_h = t['h'] * 0.7
        cy = HORIZON - t['h'] + crown_h * 0.55
        rx, ry = t['w'] * 0.82, crown_h * 0.5
        blobs = int(14 + 18 * (ry / rx))
        for _ in range(blobs):
            a = r2.random() * math.tau
            d = math.sqrt(r2.random())
            disc(t['x'] + math.cos(a) * rx * d * 0.8,
                 cy + math.sin(a) * ry * d * 0.85,
                 t['w'] * (0.27 + r2.random() * 0.2),
                 colour, alpha)


stand(58, 0.78, mix(CANOPY, HORIZON_C, 0.34), 0.9, False)
stand(46, 1.0, CANOPY, 0.97, True)

# ---------------------------------------------------------------- far bank
far = mix(BANK, (0, 0, 0), 0.18)
for x in range(W):
    top = HORIZON - 9 + 4 * math.sin(x / 190.0) + 2 * math.sin(x / 61.0)
    for y in range(int(top), HORIZON + 4):
        blend(x, y, far, 1.0)

# ---------------------------------------------------------------- the lake
for y in range(HORIZON + 4, WATER_END):
    t = (y - HORIZON - 4) / float(WATER_END - HORIZON - 4)
    row_fill(y, mix(mix(WATER, HAZE, 0.8), WATER, min(1.0, t * 2.4)))

# the glitter path, tracking the sun across the water
gr = random.Random(0x91A7)
for _ in range(2600):
    y = HORIZON + 6 + gr.random() * (WATER_END - HORIZON - 10)
    spread = 26 + (y - HORIZON) * 1.9
    gx = SUN[0] + (gr.random() - 0.5) * spread * 2
    if gx < -6 or gx > W + 6:
        continue
    w = 2 + gr.random() * 9
    for x in range(int(gx), int(gx + w)):
        blend(x, int(y), SUNC, 0.16 + gr.random() * 0.4)

# ---------------------------------------------------------------- near bank
reed_c = mix(BANK, (0, 0, 0), 0.55)
rr = random.Random(0x5EED)
for _ in range(165):
    rx0 = rr.random() * (W + 60) - 30
    h = 38 + rr.random() * 72
    stroke(rx0, WATER_END + 18, rx0 + (rr.random() - 0.5) * 34,
           WATER_END + 18 - h, reed_c, 1.2 + rr.random() * 2.0, 0.9)

near_c = mix(BANK, (0, 0, 0), 0.64)
for x in range(W):
    top = (WATER_END + 26
           + 20 * math.sin(x / 240.0 + 0.6)
           + 9 * math.sin(x / 83.0))
    for y in range(int(top), H):
        blend(x, y, near_c, 1.0)

# ---------------------------------------------------------------- encode
def chunk(tag, data):
    return (struct.pack('>I', len(data)) + tag + data
            + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff))


raw = bytearray()
for y in range(H):
    raw.append(0)
    raw += buf[y * W * 3:(y + 1) * W * 3]

png = (b'\x89PNG\r\n\x1a\n'
       + chunk(b'IHDR', struct.pack('>IIBBBBB', W, H, 8, 2, 0, 0, 0))
       + chunk(b'IDAT', zlib.compress(bytes(raw), 9))
       + chunk(b'IEND', b''))

out = sys.argv[1] if len(sys.argv) > 1 else 'public/og.png'
with open(out, 'wb') as f:
    f.write(png)
print('wrote %s  %dx%d  %d bytes' % (out, W, H, len(png)))
