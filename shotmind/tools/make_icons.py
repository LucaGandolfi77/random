#!/usr/bin/env python3
"""Genera icons/icon-192.png e icons/icon-512.png per la PWA SHOTMIND."""
from PIL import Image, ImageDraw

OUT = {192: "icons/icon-192.png", 512: "icons/icon-512.png"}


def draw_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    s = size / 512.0
    # sfondo arrotondato
    radius = int(104 * s)
    d.rounded_rectangle([0, 0, size, size], radius=radius, fill="#0b0716")
    # tavolo del martini
    d.polygon(
        [(int(120*s), int(150*s)), (int(392*s), int(150*s)), (int(256*s), int(296*s))],
        fill=(255, 210, 63, 72),
        outline=(255, 210, 63, 255),
    )
    d.line([(int(120*s), int(150*s)), (int(392*s), int(150*s))], fill=(255, 210, 63, 255), width=int(26*s))
    d.line([(int(256*s), int(296*s)), (int(256*s), int(392*s))], fill=(255, 210, 63, 255), width=int(26*s))
    d.line([(int(186*s), int(392*s)), (int(326*s), int(392*s))], fill=(255, 210, 63, 255), width=int(26*s))
    # oliva (punto rosso)
    d.ellipse([int(249*s), int(349*s), int(263*s), int(363*s)], fill=(255, 61, 110, 255))
    return img


for size, path in OUT.items():
    draw_icon(size).save(path)
    print("scritto", path, size, "x", size)
