#!/usr/bin/env python3
"""Generates the PWA icons: a dark rounded square with a '>_' terminal glyph,
drawn geometrically (no font files needed)."""

import math
import os

from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
os.makedirs(OUT, exist_ok=True)

BG = (11, 18, 32, 255)        # #0b1220
PANEL = (15, 23, 42, 255)     # #0f172a
FG = (56, 189, 248, 255)      # #38bdf8


def rounded_rect(draw, box, radius, fill):
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def draw_glyph(draw, size, pad_ratio=0.24, stroke_ratio=0.10):
    """Draws '>_' centered in the icon."""
    pad = size * pad_ratio
    stroke = max(2, int(size * stroke_ratio))
    # '>' chevron
    x0, x1 = pad, pad + size * 0.22
    yc = size * 0.42
    dy = size * 0.13
    draw.line([(x0, yc - dy), (x1, yc), (x0, yc + dy)], fill=FG, width=stroke, joint="curve")
    # '_' underscore
    ux0 = pad + size * 0.30
    ux1 = pad + size * 0.52
    uy = size * 0.58
    draw.line([(ux0, uy), (ux1, uy)], fill=FG, width=stroke)


def make(size, maskable=False):
    img = Image.new("RGBA", (size, size), BG)
    d = ImageDraw.Draw(img)
    if maskable:
        # Full-bleed background (safe zone) + slightly smaller glyph.
        d.rectangle([0, 0, size, size], fill=PANEL)
        draw_glyph(d, size, pad_ratio=0.30, stroke_ratio=0.09)
    else:
        rounded_rect(d, [0, 0, size - 1, size - 1], int(size * 0.22), PANEL)
        draw_glyph(d, size)
    return img


jobs = [
    ("icon-192.png", make(192)),
    ("icon-512.png", make(512)),
    ("icon-maskable-192.png", make(192, maskable=True)),
    ("icon-maskable-512.png", make(512, maskable=True)),
    ("apple-touch-icon.png", make(180, maskable=True)),  # iOS wants opaque, full-bleed
]

for name, img in jobs:
    path = os.path.join(OUT, name)
    img.convert("RGB").save(path, "PNG")
    print("wrote", os.path.relpath(path))
