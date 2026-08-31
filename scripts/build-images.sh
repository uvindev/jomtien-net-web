#!/usr/bin/env bash
# Image pipeline.
#
#   1. Renders the authored social cards (assets/og/*.html) to PNG via Chrome.
#   2. Takes whatever is in assets-inbox/generated/, resizes it, and writes
#      AVIF + WebP + PNG into public/images/.
#   3. Reports what is present, what is missing, and what came in undersized.
#
# Safe to run at any time. Missing inputs are reported, never invented.
# Author: Uvin Vindula (IAMUVIN) — iamuvin.com

set -uo pipefail

IN="assets-inbox/generated"
OUT="public/images"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
mkdir -p "$OUT" "$IN"

MISSING=0

have() { command -v "$1" >/dev/null 2>&1; }
info() { printf '  %-22s %s\n' "$1" "$2"; }

echo "IMAGE PIPELINE"
echo "------------------------------------------------------------"

# ── 1. Social cards ─────────────────────────────────────────────────────────
if [ -x "$CHROME" ]; then
  for loc in en th; do
    card="assets/og/og-$loc.html"
    [ -f "$card" ] || continue
    "$CHROME" --headless --disable-gpu --hide-scrollbars \
      --force-device-scale-factor=1 --window-size=1200,630 \
      --default-background-color=00000000 \
      --screenshot="$OUT/og-$loc.png" "file://$PWD/$card" >/dev/null 2>&1
    if [ -f "$OUT/og-$loc.png" ]; then
      info "og-$loc.png" "$(wc -c < "$OUT/og-$loc.png" | tr -d ' ') bytes  (1200x630, authored)"
    else
      info "og-$loc.png" "RENDER FAILED"; MISSING=$((MISSING+1))
    fi
  done
else
  info "social cards" "SKIP — Chrome not found"
fi

# ── 2. Generated artwork ────────────────────────────────────────────────────
# name:target-width:min-source-width
ART=(
  "hero-field:2560:1920"
  "process-index:1600:1200"
  "local-field:1600:1200"
  "chart-texture:1024:512"
)

for spec in "${ART[@]}"; do
  name="${spec%%:*}"; rest="${spec#*:}"
  target="${rest%%:*}"; minw="${rest##*:}"

  src=""
  for ext in png jpg jpeg webp; do
    [ -f "$IN/$name.$ext" ] && src="$IN/$name.$ext" && break
  done

  if [ -z "$src" ]; then
    info "$name" "MISSING — see docs/IMAGE-PROMPTS.md"
    MISSING=$((MISSING+1))
    continue
  fi

  w=$(sips -g pixelWidth "$src" 2>/dev/null | awk '/pixelWidth/{print $2}')
  w=${w:-0}
  note=""
  [ "$w" -lt "$minw" ] && note="  UNDERSIZED (${w}px, want >= ${minw}px)"

  # Resize to target width, never upscale.
  tmp="$OUT/$name.png"
  cp "$src" "$tmp"
  if [ "$w" -gt "$target" ]; then
    sips --resampleWidth "$target" "$tmp" >/dev/null 2>&1
  fi

  have cwebp && cwebp -quiet -q 82 "$tmp" -o "$OUT/$name.webp" 2>/dev/null
  have ffmpeg && ffmpeg -y -loglevel error -i "$tmp" \
      -c:v libsvtav1 -crf 38 "$OUT/$name.avif" 2>/dev/null

  sizes="png $(wc -c < "$tmp" | tr -d ' ')"
  [ -f "$OUT/$name.webp" ] && sizes="$sizes · webp $(wc -c < "$OUT/$name.webp" | tr -d ' ')"
  [ -f "$OUT/$name.avif" ] && sizes="$sizes · avif $(wc -c < "$OUT/$name.avif" | tr -d ' ')"
  info "$name" "${sizes}${note}"
done

echo "------------------------------------------------------------"
if [ "$MISSING" -eq 0 ]; then
  echo "ALL IMAGES PRESENT"
else
  echo "$MISSING IMAGE(S) NOT SUPPLIED — the site renders without them"
fi
# Missing decorative art is not a build failure. The CSS layers no-op.
exit 0
