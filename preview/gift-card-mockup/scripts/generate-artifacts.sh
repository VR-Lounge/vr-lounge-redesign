#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$ROOT/../.." && pwd)"
ART="$ROOT/artifacts"
SHOT="$ART/screenshots"
mkdir -p "$ART" "$SHOT"

CARD_URL="file://${ROOT}/gift-card-artwork.html"
INDEX_URL="file://${ROOT}/index.html"
ADMIN_URL="file://${ROOT}/admin-preview.html"
CHROME="${CHROME:-google-chrome}"

"$CHROME" --headless=new --disable-gpu --hide-scrollbars \
  --window-size=900,580 --screenshot="$ART/gift-card-demo.png" "$CARD_URL" 2>/dev/null

"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="$ART/gift-card-demo.pdf" "$CARD_URL" 2>/dev/null

"$CHROME" --headless=new --disable-gpu --hide-scrollbars \
  --window-size=1440,900 --screenshot="$SHOT/01-hero-desktop.png" "$INDEX_URL" 2>/dev/null

"$CHROME" --headless=new --disable-gpu --hide-scrollbars \
  --window-size=390,844 --screenshot="$SHOT/02-mobile-hero.png" "$INDEX_URL" 2>/dev/null

# mobile sheet open
"$CHROME" --headless=new --disable-gpu --hide-scrollbars \
  --window-size=390,844 --screenshot="$SHOT/03-mobile-sheet-prep.png" \
  "${INDEX_URL}#gift-open" 2>/dev/null || true

node "$ROOT/scripts/capture-sheet.mjs" 2>/dev/null || python3 "$ROOT/scripts/capture_sheet.py" || true

"$CHROME" --headless=new --disable-gpu --hide-scrollbars \
  --window-size=520,520 --screenshot="$SHOT/04-gift-card-closeup.png" "$CARD_URL" 2>/dev/null

"$CHROME" --headless=new --disable-gpu --hide-scrollbars \
  --window-size=1440,1200 --screenshot="$SHOT/05-admin.png" "$ADMIN_URL" 2>/dev/null

echo "Artifacts in $ART"
