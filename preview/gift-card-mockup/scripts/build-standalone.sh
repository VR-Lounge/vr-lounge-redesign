#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$ROOT/../.." && pwd)"
DIST="$ROOT/artifacts/standalone"
ZIP="$ROOT/artifacts/vr-lounge-gift-preview-standalone.zip"
rm -rf "$DIST"
mkdir -p "$DIST/css" "$DIST/js" "$DIST/img" "$DIST/fonts" "$DIST/artifacts"

cp "$ROOT/index.html" "$ROOT/admin-preview.html" "$ROOT/gift-card-artwork.html" "$ROOT/README.md" "$DIST/"
cp -r "$ROOT/css/." "$DIST/css/"
cp -r "$ROOT/js/." "$DIST/js/"
cp "$REPO/img/hero-david.webp" "$REPO/img/favicon.svg" "$REPO/img/zone-vr.webp" "$REPO/img/zone-ps5.webp" "$REPO/img/zone-karaoke.webp" "$DIST/img/"
cp "$REPO/fonts/"*.woff2 "$DIST/fonts/"

# rewrite asset paths for standalone tree
sed -i 's|../../img/|img/|g; s|../../fonts/|fonts/|g' "$DIST/index.html" "$DIST/admin-preview.html" "$DIST/gift-card-artwork.html" "$DIST/css/preview.css"

if [ -f "$ROOT/artifacts/gift-card-demo.png" ]; then
  cp "$ROOT/artifacts/gift-card-demo."{png,pdf} "$DIST/artifacts/" 2>/dev/null || true
fi

(cd "$(dirname "$DIST")" && zip -qr "$ZIP" "$(basename "$DIST")")
echo "Standalone ZIP: $ZIP"
