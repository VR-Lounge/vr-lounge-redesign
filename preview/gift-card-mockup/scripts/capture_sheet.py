#!/usr/bin/env python3
"""Open gift sheet on mobile and capture screenshot via Chrome DevTools protocol lite."""
import json
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "artifacts" / "screenshots" / "03-mobile-sheet-open.png"
INDEX = ROOT / "index.html"
CHROME = "google-chrome"
PROFILE = subprocess.check_output(["mktemp", "-d"], text=True).strip()

js = """
document.getElementById('btn-gift-open').click();
"""

# Use headless with run-as-node pattern: simpler puppeteer-less via --virtual-time-budget
subprocess.run(
    [
        CHROME,
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        f"--user-data-dir={PROFILE}",
        "--window-size=390,844",
        f"--screenshot={OUT}",
        "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=8000",
        f"file://{INDEX}",
    ],
    check=False,
    capture_output=True,
)

# Inject via bookmarklet not available headless — regenerate with selenium-style:
# Fallback: write small HTML that auto-opens sheet
auto = ROOT / "scripts" / "_capture-mobile-sheet.html"
auto.write_text(
    (INDEX.read_text(encoding="utf-8")).replace(
        '<script src="js/preview.js" defer></script>',
        '<script src="js/preview.js"></script><script>window.addEventListener("DOMContentLoaded",function(){setTimeout(function(){document.getElementById("btn-gift-open").click();},400);});</script>',
    ),
    encoding="utf-8",
)
subprocess.run(
    [
        CHROME,
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        f"--user-data-dir={PROFILE}",
        "--window-size=390,844",
        f"--screenshot={OUT}",
        "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=6000",
        f"file://{auto}",
    ],
    check=True,
)
auto.unlink(missing_ok=True)
print(f"Wrote {OUT}")
