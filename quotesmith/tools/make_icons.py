from PIL import Image, ImageDraw, ImageFont
import os

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out_dir = os.path.join(root, 'icons')
os.makedirs(out_dir, exist_ok=True)


def rounded(draw, box, radius, fill):
    x0, y0, x1, y1 = box
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill)


for size in (192, 512):
    s = float(size)
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # sfondo scuro arrotondato
    r = s * 0.22
    rounded(d, [0, 0, size, size], r, (18, 10, 36, 255))

    # cerchio card
    d.ellipse([s * 0.13, s * 0.13, s * 0.87, s * 0.87], fill=(36, 23, 67, 255))

    # virgolette
    d.pieslice([s * 0.28, s * 0.24, s * 0.46, s * 0.48], 180, 360, fill=(255, 210, 63, 255))
    d.pieslice([s * 0.54, s * 0.24, s * 0.72, s * 0.48], 180, 360, fill=(255, 210, 63, 255))
    d.rectangle([s * 0.28, s * 0.42, s * 0.72, s * 0.50], fill=(255, 210, 63, 255))

    # punto interrogativo
    try:
        font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', int(s * 0.44))
    except Exception:
        font = ImageFont.load_default()
    d.text((s * 0.5, s * 0.72), '?', font=font, fill=(244, 236, 255, 255), anchor='mm')

    img.save(os.path.join(out_dir, f'icon-{size}.png'))
    print(f'icon-{size}.png ok')
