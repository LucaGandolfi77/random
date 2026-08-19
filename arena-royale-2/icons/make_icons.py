#!/usr/bin/env python3
"""Icone PWA Arena Royale: cerchio di tempesta su sfondo navy + mirino."""
import zlib, struct, math

def chunk(t, d):
    return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)

def write_png(path, w, h, px):
    raw = b"".join(b"\x00" + bytes(px(x, y)) for y in range(h) for x in range(w))
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)
    data = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(data)

def make_px(size):
    w = h = size
    def px(x, y):
        nx, ny = (x + 0.5) / w, (y + 0.5) / h
        # sfondo navy con leggero gradiente
        t = ny
        r = int(20 + (10 - 20) * t); g = int(30 + (18 - 30) * t); b = int(58 + (42 - 58) * t)
        c = (x - w/2) / (w/2), (y - h/2) / (h/2)
        d = math.hypot(c[0], c[1])
        # anello della tempesta (rosso/arancio)
        if 0.30 <= d <= 0.52:
            shade = 1 - (d - 0.30) / 0.22
            return (int(240 - 60*shade), int(70 + 40*shade), int(50))
        # cerchio interno (zona sicura, blu chiaro)
        if d <= 0.30:
            return (90, 150, 210)
        # mirino: croce
        if (abs(c[0]) < 0.03 and d > 0.55) or (abs(c[1]) < 0.03 and d > 0.55):
            return (255, 240, 200)
        return (r, g, b)
    return px

for size, name in ((512, "icon-512.png"), (192, "icon-192.png"), (180, "apple-touch-icon.png")):
    write_png(f"icons/{name}", size, size, make_px(size))
    print("generata", name)
