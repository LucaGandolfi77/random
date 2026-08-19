#!/usr/bin/env python3
"""Genera le icone PNG della PWA (nessuna dipendenza: zlib+struct)."""
import zlib, struct

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
    def inside_ell(nx, ny, cx, cy, rx, ry):
        return ((nx - cx) / rx) ** 2 + ((ny - cy) / ry) ** 2 <= 1.0
    def px(x, y):
        nx, ny = x / w, y / h
        t = ny
        r = int(43 + (242 - 43) * t)
        g = int(67 + (166 - 67) * t)
        b = int(100 + (90 - 100) * t)
        col = None
        if inside_ell(nx, ny, 0.5, 0.58, 0.17, 0.12): col = (255, 246, 232)          # corpo
        if (nx - 0.66) ** 2 + (ny - 0.50) ** 2 <= 0.075 ** 2: col = (255, 246, 232)  # testa
        if 0.70 <= nx <= 0.82 and abs(ny - (0.50 + (nx - 0.70) * 1.1)) <= 0.022: col = (247, 200, 90)  # becco
        if inside_ell(nx, ny, 0.42, 0.60, 0.11, 0.075): col = (122, 74, 46)          # ala
        if 0.28 <= nx <= 0.40 and 0.50 <= ny <= 0.66 and (ny - 0.50) <= (nx - 0.28) * 0.9: col = (122, 74, 46)  # coda
        if col:
            return col
        return (r, g, b)
    return px

for size, name in ((512, "icon-512.png"), (192, "icon-192.png"), (180, "apple-touch-icon.png")):
    write_png(f"icons/{name}", size, size, make_px(size))
    print("generata", name)
