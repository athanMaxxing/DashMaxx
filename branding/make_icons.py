import sys, math
from PIL import Image
import numpy as np

src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGBA')
N = im.width
a = np.asarray(im).astype(np.float32)

# Background colour depends only on s = x + y (diagonal stripes). Sample it from an outer ring
# of the circle, clear of the white D and its shadow.
yy, xx = np.mgrid[0:N, 0:N]
c = (N - 1) / 2
d = np.hypot(xx - c, yy - c)
ring = (d > 0.86 * N / 2) & (d < 0.97 * N / 2) & (a[..., 3] == 255)
s = (xx + yy)[ring]
cols = a[..., :3][ring]
f = np.full((2 * N, 3), np.nan, np.float32)
for v in np.unique(s):
    f[v] = np.median(cols[s == v], axis=0)
idx = np.arange(2 * N)
for ch in range(3):  # fill gaps and clamp the ends
    ok = ~np.isnan(f[:, ch])
    f[:, ch] = np.interp(idx, idx[ok], f[ok, ch])


def full_bleed(scale):
    """Square image: logo circle scaled by `scale` on a seamless extension of its own gradient."""
    L = int(round(N / scale))
    pad = (L - N) // 2
    Y, X = np.mgrid[0:L, 0:L]
    sv = np.clip(X + Y - 2 * pad, 0, 2 * N - 1)
    bg = Image.fromarray(np.concatenate([f[sv], np.full((L, L, 1), 255, np.float32)], -1).astype(np.uint8), 'RGBA')
    # Feather the circle's anti-aliased rim away so no seam shows against the extended gradient.
    t = np.clip((0.96 * N / 2 - d) / (0.04 * N / 2), 0, 1)
    inner = a.copy()
    inner[..., 3] = 255 * t * t * (3 - 2 * t)
    bg.alpha_composite(Image.fromarray(inner.astype(np.uint8), 'RGBA'), (pad, pad))
    return bg.resize((N, N), Image.LANCZOS)


def save(img, size, name):
    img.resize((size, size), Image.LANCZOS).save(f'{out}/{name}', optimize=True)


# Transparent round icons for "any" purpose, favicon and the in-app brand mark.
for sz in (64, 192, 512):
    save(im, sz, f'pwa-{sz}x{sz}.png')
save(im, 256, 'logo.png')
im.resize((256, 256), Image.LANCZOS).save(f'{out}/favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
# Apple rounds the corners itself: full-bleed, glyph at original size.
save(full_bleed(1.0).convert('RGB'), 180, 'apple-touch-icon-180x180.png')
# Android maskable: full-bleed and a bit smaller so the D stays inside the safe zone.
save(full_bleed(0.82), 512, 'maskable-icon-512x512.png')
print('ok')
