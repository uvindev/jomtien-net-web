#!/usr/bin/env bash
# Produces deploy/ — exactly what gets uploaded to Hostinger's public_html/,
# and nothing else.
#
# This exists because the repo is not the deployable artefact. dist/ is
# gitignored build output the site cannot run without, and src/, tests/,
# scripts/ and node_modules/ must never reach a public web root.
#
# Usage: npm run deploy:bundle
# Author: Uvin Vindula (IAMUVIN) — iamuvin.com

set -euo pipefail
OUT="deploy"

echo "BUILD DEPLOY BUNDLE"
echo "------------------------------------------------------------"

# 1. Always build fresh. A stale dist/ is the most likely upload mistake.
npm run build:css >/dev/null
npm run build:ts  >/dev/null
npm run images    >/dev/null
echo "  built  css, js, images"

rm -rf "$OUT"
mkdir -p "$OUT"

# 2. Copy only what the running site needs.
cp -R en th dist public "$OUT"/
cp index.html 404.html humans.txt robots.txt sitemap.xml .htaccess favicon.ico "$OUT"/
echo "  copied pages, dist, public, root files, .htaccess"

# 3. Nothing that is not runtime.
find "$OUT" -name ".DS_Store" -delete
find "$OUT" -name "*.map" -delete          # source maps are for local debugging
# The map is gone but the comment pointing at it is not, so DevTools requests
# it and gets a 403 from the .map FilesMatch rule.
if [ -f "$OUT/dist/main.js" ]; then
  sed -i "" "/^\/\/# sourceMappingURL=/d" "$OUT/dist/main.js"
fi
rm -rf "$OUT/public/fonts/README.txt"      # internal note; licence stays

# Drop images nothing references. Generated artwork the photography replaced,
# and PNG fallbacks that only image-set()'s avif/webp candidates supersede.
python3 - "$OUT" <<'PRUNE'
import pathlib, re, sys, os
out = pathlib.Path(sys.argv[1])
refs = set()
for f in list(out.rglob("*.html")) + list(out.rglob("*.css")):
    refs.update(re.findall(r"/public/images/([\w.-]+\.(?:avif|webp|jpg|png))", f.read_text()))
removed = 0
freed = 0
for f in (out / "public/images").glob("*"):
    if f.is_file() and f.name not in refs:
        freed += os.path.getsize(f); f.unlink(); removed += 1
print(f"  pruned {removed} unreferenced images, {freed // 1024} KB")
PRUNE
echo "  stripped source maps and dev files"

# 4. Prove the bundle is complete and clean.
echo "------------------------------------------------------------"
FAIL=0
need() { [ -e "$OUT/$1" ] || { echo "  MISSING  $1"; FAIL=1; }; }
for f in index.html 404.html .htaccess humans.txt robots.txt sitemap.xml favicon.ico \
         en/index.html th/index.html en/estimate/index.html th/estimate/index.html \
         en/privacy/index.html th/privacy/index.html \
         dist/styles.css dist/main.js \
         public/fonts/plex-sans-latin-var.woff2 public/fonts/OFL-IBM-Plex.txt \
         public/images/og-en.png public/images/hero-jomtien-1200.avif \
         public/images/local-jomtien-1200.avif public/images/hero-jomtien-1600.jpg \
         public/brand/favicon.svg public/brand/apple-touch-icon.png \
         public/images/hero-b1-800.avif public/images/hero-b2-800.avif \
         public/images/hero-b3-800.avif; do
  need "$f"
done

for d in node_modules src tests e2e scripts docs assets assets-inbox instructions; do
  [ -e "$OUT/$d" ] && { echo "  LEAKED   $d/ is in the bundle"; FAIL=1; }
done
for f in package.json tsconfig.json vercel.json _headers _redirects; do
  [ -e "$OUT/$f" ] && { echo "  LEAKED   $f"; FAIL=1; }
done

# Every asset the HTML references must resolve inside the bundle.
MISSING_REF=0
while IFS= read -r ref; do
  [ -e "$OUT$ref" ] || { echo "  DEAD REF $ref"; MISSING_REF=1; FAIL=1; }
done < <(grep -rhoE '(href|src)="/[^"#]+\.(css|js|woff2|avif|webp|png|jpg|svg|ico|txt|xml)"' \
           "$OUT"/*.html "$OUT"/*/*.html "$OUT"/*/*/*.html 2>/dev/null \
         | sed -E 's/.*"(\/[^"]+)"/\1/' | sort -u)
[ "$MISSING_REF" -eq 0 ] && echo "  all asset references resolve"

echo "------------------------------------------------------------"
printf "  files: %s\n" "$(find "$OUT" -type f | wc -l | tr -d ' ')"
printf "  size:  %s\n" "$(du -sh "$OUT" | cut -f1)"
echo "------------------------------------------------------------"
if [ "$FAIL" -eq 0 ]; then
  echo "BUNDLE READY — upload the CONTENTS of $OUT/ into public_html/"
  echo "(upload the files themselves, not the deploy folder)"
else
  echo "BUNDLE INCOMPLETE"
fi
exit "$FAIL"
