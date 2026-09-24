#!/usr/bin/env python3
"""Genera le icone PNG di Scala B, Civico 0."""

from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "icons"

PLUM = (59, 42, 74)
PLUM_D = (42, 29, 54)
TERRA = (217, 119, 87)
TERRA_D = (160, 78, 54)
WIN = (255, 217, 138)
WIN_D = (242, 178, 74)
CREAM = (251, 243, 228)
SAGE = (127, 169, 139)
GOLD = (242, 184, 75)
WHITE = (255, 246, 216)


def build(size: int, maskable: bool) -> Image.Image:
    s = 4
    W = size * s
    img = Image.new("RGB", (W, W), PLUM)
    d = ImageDraw.Draw(img)

    # scala di luce sul fondo
    for i in range(W):
        t = i / W
        c = (
            int(PLUM[0] + (107 - PLUM[0]) * t * 0.55),
            int(PLUM[1] + (83 - PLUM[1]) * t * 0.55),
            int(PLUM[2] + (132 - PLUM[2]) * t * 0.55),
        )
        d.line([(0, i), (W, i)], fill=c)

    # zona sicura per maskable
    safe = 0.86 if maskable else 1.0
    cx = cy = W / 2
    unit = W * safe

    def sc(v):
        return cx + (v - 0.5) * unit

    # stelle
    for sx, sy, r in ((0.14, 0.14, 0.013), (0.3, 0.08, 0.008), (0.7, 0.2, 0.007),
                      (0.2, 0.32, 0.006), (0.88, 0.34, 0.009)):
        x, y, rr = sc(sx), sc(sy), W * r * safe
        d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=WHITE)

    # luna piena, ben sopra il tetto
    mx, my, mr = sc(0.84), sc(0.12), W * 0.052 * safe
    d.ellipse([mx - mr, my - mr, mx + mr, my + mr], fill=GOLD, outline=CREAM,
              width=max(2, int(W * 0.01)))
    # due crateri leggeri
    for dx, dy, rr in ((-0.3, -0.2, 0.2), (0.25, 0.3, 0.14)):
        cr = mr * rr
        d.ellipse([mx + dx * mr - cr, my + dy * mr - cr, mx + dx * mr + cr, my + dy * mr + cr],
                  fill=(230, 160, 58))

    # palazzo
    bw, bh = unit * 0.5, unit * 0.6
    bx0, by0 = cx - bw / 2, cy - bh / 2 + unit * 0.04
    bx1, by1 = cx + bw / 2, cy + bh / 2 + unit * 0.04
    rad = W * 0.035 * safe
    d.rounded_rectangle([bx0, by0, bx1, by1], radius=rad, fill=TERRA, outline=TERRA_D,
                        width=max(2, int(W * 0.012)))

    # tetto
    roof_h = unit * 0.1
    d.rounded_rectangle([bx0 - unit * 0.04, by0 - roof_h, bx1 + unit * 0.04, by0 + rad],
                        radius=rad, fill=TERRA_D)

    # finestre 3 x 4
    cols, rows = 3, 4
    pad = unit * 0.05
    gw = (bw - pad * 2)
    gh = (bh - roof_h - pad * 2.1)
    gapx = gw * 0.12
    gapy = gh * 0.1
    cwid = (gw - gapx * (cols - 1)) / cols
    chei = (gh - gapy * (rows - 1)) / rows
    top = by0 + roof_h + pad
    lit = {(0, 1), (1, 2), (2, 0), (1, 0), (2, 3), (0, 3)}
    for r in range(rows):
        for c in range(cols):
            x0 = bx0 + pad + c * (cwid + gapx)
            y0 = top + r * (chei + gapy)
            color = WIN if (c, r) in lit else WIN_D
            d.rounded_rectangle([x0, y0, x0 + cwid, y0 + chei],
                                radius=W * 0.012 * safe, fill=color,
                                outline=PLUM_D, width=max(1, int(W * 0.006)))

    # porta
    dw = bw * 0.24
    dh = bh * 0.18
    d.rounded_rectangle([cx - dw / 2, by1 - dh, cx + dw / 2, by1 + unit * 0.005],
                        radius=W * 0.02 * safe, fill=PLUM_D)
    d.ellipse([cx + dw * 0.14, by1 - dh * 0.5, cx + dw * 0.14 + W * 0.014,
               by1 - dh * 0.5 + W * 0.014], fill=GOLD)

    # nuvoletta davanti a una finestra
    clx, cly, clr = sc(0.36), sc(0.44), unit * 0.055
    for dx, dy, rr in ((0, 0, 1.0), (-0.85, 0.25, 0.7), (0.8, 0.3, 0.65)):
        d.ellipse([clx + dx * clr - rr * clr, cly + dy * clr - rr * clr,
                   clx + dx * clr + rr * clr, cly + dy * clr + rr * clr],
                  fill=(255, 255, 255))

    # spilla "0" dorata in basso a destra
    bx, by, br = sc(0.82), sc(0.78), unit * 0.11
    d.ellipse([bx - br, by - br, bx + br, by + br], fill=GOLD, outline=CREAM,
              width=max(2, int(W * 0.01)))
    # anello per la cifra 0
    rr = br * 0.5
    d.ellipse([bx - rr * 0.62, by - rr, bx + rr * 0.62, by + rr], outline=PLUM_D,
              width=max(3, int(W * 0.022)))

    return img.resize((size, size), Image.LANCZOS)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    build(192, maskable=False).save(OUT / "icon-192.png", "PNG")
    build(512, maskable=False).save(OUT / "icon-512.png", "PNG")
    build(512, maskable=True).save(OUT / "icon-512-maskable.png", "PNG")
    build(180, maskable=False).save(OUT / "apple-touch-icon.png", "PNG")
    build(96, maskable=False).save(OUT / "icon-96.png", "PNG")
    print("icone scritte in", OUT)


if __name__ == "__main__":
    main()
