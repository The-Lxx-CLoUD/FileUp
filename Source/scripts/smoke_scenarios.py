from PIL import Image, ImageDraw
import os, json, random, subprocess, sys, time

DEMO = '/tmp/FileUpDemo'
os.makedirs(DEMO, exist_ok=True)
os.makedirs(f'{DEMO}/Documents', exist_ok=True)
os.makedirs(f'{DEMO}/Project/src', exist_ok=True)

img = Image.new('RGB', (800, 600))
d = ImageDraw.Draw(img)
for y in range(600):
    t = y / 600
    d.line([(0, y), (800, y)], fill=(int(47 + 40 * t), int(128 + 60 * t), 255 - int(60 * t)))
d.ellipse([280, 180, 520, 420], fill=(255, 255, 255))
img.save(f'{DEMO}/wallpaper.png')

random.seed(7)
img2 = Image.new('RGB', (800, 600), (18, 24, 38))
d2 = ImageDraw.Draw(img2)
for i in range(140):
    x, y = random.randint(0, 800), random.randint(0, 600)
    r = random.randint(6, 60)
    c = (random.randint(40, 255), random.randint(40, 200), random.randint(120, 255))
    d2.ellipse([x - r, y - r, x + r, y + r], outline=c, width=3)
img2.save(f'{DEMO}/artwork.jpg', quality=88)

open(f'{DEMO}/README.md', 'w').write('# FileUp Demo\n\nThis folder exercises preview, icons and grid view.\n')
open(f'{DEMO}/main.py', 'w').write('def main():\n    print("Hello from FileUp demo")\n\n\nif __name__ == "__main__":\n    main()\n')
open(f'{DEMO}/report.pdf', 'w').write('%PDF-1.4 fake pdf header for icon demo')
open(f'{DEMO}/backup.zip', 'w').write('PK\x03\x04 fake zip for icon demo')
open(f'{DEMO}/song.mp3', 'w').write('ID3 fake mp3 for icon demo')
open(f'{DEMO}/Project/src/index.js', 'w').write('console.log("demo");\n')
open(f'{DEMO}/Documents/notes.txt', 'w').write('Shopping list:\n- coffee\n- SSD 2TB\n- mechanical keyboard\n')

cfg_dir = os.path.expanduser('~/.config/FileUp')

def write_cfg(theme='dark', view='grid'):
    os.makedirs(cfg_dir, exist_ok=True)
    cfg = {
        'theme': theme,
        'viewMode': view,
        'showHidden': False,
        'previewVisible': True,
        'lastPath': DEMO,
        'window': {'width': 1280, 'height': 800}
    }
    with open(os.path.join(cfg_dir, 'fileup-config.json'), 'w') as f:
        json.dump(cfg, f, indent=2)

def shoot(out, theme, view):
    write_cfg(theme, view)
    env = dict(os.environ, FILEUP_SMOKE=out, DISPLAY=':99')
    subprocess.run(['npx', 'electron', '.', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
                   cwd='/home/z/my-project/projects/FileUp', env=env, timeout=70,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print('shot →', out, os.path.getsize(out), 'bytes')

def ensure_xvfb():
    """Start Xvfb :99 if not reachable; return Popen or None."""
    if os.path.exists('/tmp/.X11-unix/X99'):
        return None
    p = subprocess.Popen(['Xvfb', ':99', '-screen', '0', '1400x900x24'],
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(50):
        if os.path.exists('/tmp/.X11-unix/X99'):
            time.sleep(0.4)
            return p
        time.sleep(0.2)
    raise RuntimeError('Xvfb failed to start')

if __name__ == '__main__':
    xv = ensure_xvfb()
    try:
        which = sys.argv[1] if len(sys.argv) > 1 else 'all'
        if which in ('all', 'grid'):
            shoot('/tmp/fileup-grid.png', 'dark', 'grid')
        if which in ('all', 'light'):
            shoot('/tmp/fileup-light.png', 'light', 'details')
    finally:
        if xv:
            xv.terminate()
