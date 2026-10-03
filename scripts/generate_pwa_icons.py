#!/usr/bin/env python3
"""Generate PWA icons for RDx Road Project Control.

Creates font-free, full-bleed PNG icons (safe for maskable purpose):
dark slate background (#020617) with an amber road + white dashed
center line motif. Key art stays inside the center safe zone.

Outputs (into client/public/):
  icon-192.png        192x192  (PWA manifest)
  icon-512.png        512x512  (PWA manifest)
  apple-touch-icon.png 180x180 (iOS)

Run: python3 scripts/generate_pwa_icons.py
Idempotent: safe to re-run (overwrites).
"""

import os
import sys

try:
    from PIL import Image, ImageDraw
except ImportError:
    sys.exit("Pillow is required: apt-get install -y python3-pil  (or pip install pillow)")

BG = (2, 6, 23)        # #020617 app dark slate
AMBER = (245, 158, 11)  # #f59e0b app accent
WHITE = (255, 255, 255)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.normpath(os.path.join(HERE, "..", "client", "public"))


def draw_icon(size: int) -> Image.Image:
    img = Image.new("RGB", (size, size), BG)
    d = ImageDraw.Draw(img)

    # Amber road: vertical bar, centered, full-bleed top/bottom.
    # Width ~30% of size keeps it inside the maskable safe zone.
    road_w = int(size * 0.30)
    x0 = (size - road_w) // 2
    x1 = x0 + road_w
    d.rectangle([x0, 0, x1, size], fill=AMBER)

    # White dashed center line.
    dash_w = max(2, int(size * 0.035))
    dash_h = int(size * 0.11)
    gap_h = int(size * 0.075)
    cx = size // 2
    y = gap_h
    while y < size:
        d.rectangle(
            [cx - dash_w // 2, y, cx + dash_w // 2, min(y + dash_h, size)],
            fill=WHITE,
        )
        y += dash_h + gap_h

    return img


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    targets = {
        "icon-192.png": 192,
        "icon-512.png": 512,
        "apple-touch-icon.png": 180,
    }
    for name, size in targets.items():
        path = os.path.join(OUT_DIR, name)
        draw_icon(size).save(path, "PNG")
        print(f"wrote {path} ({size}x{size})")


if __name__ == "__main__":
    main()
