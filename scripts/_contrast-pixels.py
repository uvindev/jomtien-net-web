"""
Pixel-level text contrast analysis.

Given two renders of the same page — one normal, one with every glyph made
transparent — the difference is exactly where text ink lands. Sampling the
text-free render at those coordinates gives the true background behind each
glyph, including whatever a background image happens to be doing there.

Fully vectorised: the first version looped in Python over an 8400px-tall image
per element and took minutes. This runs the whole page in well under a second.

Called by scripts/check-text-contrast.mjs. Not run directly.

Author: Uvin Vindula (IAMUVIN) — iamuvin.com
"""

import json
import sys

import numpy as np
from PIL import Image

INK_THRESHOLD = 20  # per-channel delta that counts as glyph ink


def luminance_map(rgb: np.ndarray) -> np.ndarray:
    """WCAG relative luminance for an (H, W, 3) uint8 array."""
    c = rgb.astype(np.float32) / 255.0
    lin = np.where(c <= 0.03928, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return lin[..., 0] * 0.2126 + lin[..., 1] * 0.7152 + lin[..., 2] * 0.0722


def luminance_one(rgb) -> float:
    arr = np.array(rgb, dtype=np.float32).reshape(1, 1, 3)
    return float(luminance_map(arr)[0, 0])


def main() -> None:
    payload = json.loads(sys.stdin.read())
    normal = np.asarray(Image.open(payload["normal"]).convert("RGB"))
    plain = np.asarray(Image.open(payload["plain"]).convert("RGB"))
    dpr = payload.get("dpr", 1)

    if normal.shape != plain.shape:
        print(json.dumps({"error": f"size mismatch {normal.shape} vs {plain.shape}"}))
        return

    # Glyph ink = where the two renders disagree.
    ink = np.abs(normal.astype(np.int16) - plain.astype(np.int16)).max(axis=2) > INK_THRESHOLD
    bg_lum = luminance_map(plain)
    height, width = bg_lum.shape

    results = []
    for item in payload["elements"]:
        x0 = max(0, int(item["x"] * dpr))
        y0 = max(0, int(item["y"] * dpr))
        x1 = min(width, int((item["x"] + item["w"]) * dpr))
        y1 = min(height, int((item["y"] + item["h"]) * dpr))
        if x1 <= x0 or y1 <= y0:
            continue

        mask = ink[y0:y1, x0:x1]
        if not mask.any():
            continue

        fg_lum = luminance_one(item["color"])
        sampled = bg_lum[y0:y1, x0:x1][mask]
        if sampled.size < 3:
            continue

        # Contrast is monotonic in |bg - fg| for a fixed foreground, so the
        # worst pixel is simply the background luminance nearest the text's.
        worst_idx = int(np.abs(sampled - fg_lum).argmin())
        worst_bg_lum = float(sampled[worst_idx])
        hi, lo = max(fg_lum, worst_bg_lum), min(fg_lum, worst_bg_lum)
        ratio = (hi + 0.05) / (lo + 0.05)

        # Recover the actual pixel colour for the report.
        region = plain[y0:y1, x0:x1]
        bg_px = region[mask][worst_idx]

        results.append(
            {
                "label": item["label"],
                "text": item["text"],
                "ratio": round(float(ratio), 2),
                "required": item["required"],
                "fg": "#%02x%02x%02x" % tuple(item["color"]),
                "bg": "#%02x%02x%02x" % tuple(int(v) for v in bg_px),
                "pass": bool(ratio >= item["required"]),
                "px": int(mask.sum()),
            }
        )

    print(json.dumps(results))


if __name__ == "__main__":
    main()
