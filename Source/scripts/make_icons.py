from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'build')
os.makedirs(OUT, exist_ok=True)


def rounded_rect(draw, xy, radius, fill):
    draw.rounded_rectangle(xy, radius=radius, fill=fill)


def make_icon(size: int) -> Image.Image:
    s = size
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    margin = max(1, int(s * 0.015))
    radius = int(s * 0.24)
    grad = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    c1 = (74, 144, 255)
    c2 = (31, 95, 214)
    for y in range(s):
        t = y / max(1, s - 1)
        r = int(c1[0] + (c2[0] - c1[0]) * t)
        g = int(c1[1] + (c2[1] - c1[1]) * t)
        b = int(c1[2] + (c2[2] - c1[2]) * t)
        gd.line([(0, y), (s, y)], fill=(r, g, b, 255))

    mask = Image.new('L', (s, s), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([margin, margin, s - margin, s - margin], radius=radius, fill=255)
    img.paste(grad, (0, 0), mask)
    white = (255, 255, 255, 255)
    w = max(2, int(s * 0.10))          
    cx = s / 2
    top = s * 0.28
    bottom = s * 0.66
    half = s * 0.20
    head_drop = s * 0.22

    lw = w 

    def thick_line(p1, p2, width):
        d.line([p1, p2], fill=white, width=width)
        r = width / 2
        for p in (p1, p2):
            d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=white)

    
    thick_line((cx, bottom), (cx, top + head_drop * 0.6), lw)
    
    thick_line((cx - half, top + head_drop), (cx, top), lw)
    thick_line((cx, top), (cx + half, top + head_drop), lw)
    
    by = s * 0.78
    thick_line((s * 0.30, by), (s * 0.70, by), int(w * 0.85))

    return img


sizes = [16, 24, 32, 48, 64, 128, 256, 512]
base = make_icon(512)
base.save(os.path.join(OUT, 'icon.png'))
base.resize((256, 256), Image.LANCZOS).save(os.path.join(OUT, 'icon@2x.png'))

ico_sizes = [16, 24, 32, 48, 64, 128, 256]
imgs = [make_icon(x) for x in ico_sizes]
imgs[-1].save(os.path.join(OUT, 'icon.ico'), format='ICO', sizes=[(x, x) for x in ico_sizes], append_images=imgs[:-1])

print('icons written to', os.path.abspath(OUT))
for f in sorted(os.listdir(OUT)):
    print(' -', f)
