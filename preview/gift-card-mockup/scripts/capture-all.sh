#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$ROOT/../.." && pwd)"
ART="$ROOT/artifacts"
SHOT="$ART/screenshots"
mkdir -p "$SHOT"
PORT=8769
UD=$(mktemp -d)
cleanup(){ pkill -f "python3 -m http.server $PORT" 2>/dev/null || true; pkill -9 -f "remote-debugging-port" 2>/dev/null || true; }
trap cleanup EXIT

cd "$REPO"
python3 -m http.server "$PORT" >/tmp/preview-http.log 2>&1 &
for i in 1 2 3 4 5 6 7 8 9 10; do
  curl -fsS "http://127.0.0.1:$PORT/preview/gift-card-mockup/index.html" >/dev/null && break
  sleep 0.4
done
BASE="http://127.0.0.1:$PORT/preview/gift-card-mockup"

shot(){
  local url="$1" size="$2" out="$3"
  shift 3
  timeout 50 google-chrome --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
    --user-data-dir="$UD" --window-size="$size" --virtual-time-budget=8000 \
    --run-all-compositor-stages-before-draw "$@" --screenshot="$out" "$url"
  python3 - <<PY
from PIL import Image
p="$out"
im=Image.open(p)
px=im.getdata()
# fail if almost uniform (unstyled / broken)
samples=[px[i] for i in range(0,min(len(px),40000),max(1,len(px)//5000))]
uniq=len(set(samples))
if uniq < 12:
    raise SystemExit(f"screenshot looks flat/broken ({uniq} colors): {p}")
print("ok", p, im.size, "uniq", uniq)
PY
}

shot "$BASE/index.html" "1440,900" "$SHOT/01-hero-desktop.png"
shot "$BASE/index.html" "390,844" "$SHOT/02-mobile-hero.png"
shot "$BASE/index.html?autogift=1" "390,844" "$SHOT/03-mobile-sheet-open.png" --virtual-time-budget=12000
shot "$BASE/index.html" "320,568" "$SHOT/02-mobile-320.png"
shot "$BASE/index.html" "768,1024" "$SHOT/02-tablet-768.png"
shot "$BASE/admin-preview.html" "1440,1200" "$SHOT/05-admin.png"
shot "$BASE/gift-card-artwork.html" "900,580" "$ART/gift-card-demo.png"
shot "$BASE/gift-card-artwork.html" "520,520" "$SHOT/04-gift-card-closeup.png"
timeout 50 google-chrome --headless=new --disable-gpu --no-sandbox --no-pdf-header-footer \
  --user-data-dir="$UD" --print-to-pdf="$ART/gift-card-demo.pdf" "$BASE/gift-card-artwork.html"
echo "Artifacts in $ART"
