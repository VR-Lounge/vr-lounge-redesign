#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$ROOT/../.." && pwd)"
ART="$ROOT/artifacts"
V3="/opt/cursor/artifacts/vr-lounge-gift-preview-v3"
SHOT="$ART/screenshots"
mkdir -p "$SHOT" "$V3"
PORT=8770
UD=$(mktemp -d)
cleanup(){ pkill -f "python3 -m http.server $PORT" 2>/dev/null || true; }
trap cleanup EXIT
cd "$REPO"
python3 -m http.server "$PORT" >/tmp/preview-http-v3.log 2>&1 &
for i in $(seq 1 12); do curl -fsS "http://127.0.0.1:$PORT/preview/gift-card-mockup/index.html" >/dev/null && break; sleep 0.35; done
BASE="http://127.0.0.1:$PORT/preview/gift-card-mockup"
shot(){ timeout 55 google-chrome --headless=new --disable-gpu --no-sandbox --hide-scrollbars --user-data-dir="$UD" --window-size="$2" --virtual-time-budget="${4:-10000}" --run-all-compositor-stages-before-draw --screenshot="$3" "$1"; ls -la "$3"; }
shot "$BASE/index.html" "390,844" "$SHOT/v3-mobile-hero-3cta.png"
shot "$BASE/index.html?scrolled=1" "390,844" "$SHOT/v3-mobile-scrolled-callbar.png" 12000
shot "$BASE/index.html?autogift=1" "390,844" "$SHOT/v3-mobile-gift-sheet.png" 15000
shot "$BASE/gift-card-artwork.html" "880,580" "$ART/gift-card-demo.png"
timeout 55 google-chrome --headless=new --disable-gpu --no-sandbox --no-pdf-header-footer --user-data-dir="$UD" --print-to-pdf="$ART/gift-card-demo.pdf" "$BASE/gift-card-artwork.html"
python3 "$ROOT/scripts/build-gift-preview-single.py"
FP="$ROOT/artifacts/gift-preview.html"
if [[ -f "$FP" ]]; then
  timeout 55 google-chrome --headless=new --disable-gpu --no-sandbox --hide-scrollbars --user-data-dir="$UD" --window-size="390,844" --virtual-time-budget=12000 --run-all-compositor-stages-before-draw --screenshot="$SHOT/v3-offline-html-hero.png" "file://$FP"
fi
bash "$ROOT/scripts/build-standalone.sh"
cp -a "$SHOT"/v3-*.png "$ART/gift-card-demo.png" "$ART/gift-card-demo.pdf" "$FP" "$ART/vr-lounge-gift-preview-standalone.zip" "$V3/" 2>/dev/null || true
cp "$ART/PREVIEW-REPORT.md" "$V3/" 2>/dev/null || true
echo "v3 artifacts → $V3"
