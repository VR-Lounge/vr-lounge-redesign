#!/usr/bin/env python3
"""Build offline gift-preview.html with embedded CSS/JS/fonts/images."""
from __future__ import annotations

import base64
import mimetypes
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
OUT = ROOT / "artifacts" / "gift-preview.html"

ASSETS = [
    REPO / "img/hero-collage.webp",
    REPO / "img/hero-collage-600.webp",
    REPO / "img/hero-david.webp",
    REPO / "img/gallery-guest-20.webp",
    REPO / "img/zone-karaoke.webp",
    REPO / "img/gallery-guest-03.webp",
    REPO / "img/yandex-good-place-2025.svg",
    REPO / "img/yandex-good-place-2026.svg",
    REPO / "img/favicon.svg",
    ROOT / "img/david-vr-v2.png",
]


def b64(path: Path) -> str:
    mime, _ = mimetypes.guess_type(str(path))
    mime = mime or "application/octet-stream"
    raw = path.read_bytes()
    return f"data:{mime};base64,{base64.standard_b64encode(raw).decode('ascii')}"


def inline_fonts(css: str) -> str:
    def repl(match: re.Match[str]) -> str:
        url = match.group(1).strip("'\"")
        if url.startswith("data:"):
            return match.group(0)
        p = (REPO / "css" / url).resolve() if not url.startswith("..") else (REPO / url.replace("../", "")).resolve()
        if not p.is_file():
            p = (ROOT / url).resolve()
        if p.is_file():
            return f'url("{b64(p)}")'
        return match.group(0)

    return re.sub(r"url\(([^)]+)\)", repl, css)


def main() -> None:
    site_css = inline_fonts((REPO / "css/style.css").read_text(encoding="utf-8"))
    site_css = re.sub(r"url\(\.\./img/", 'url("embedded://img/', site_css)
    gift_css = (ROOT / "css/preview-gift.css").read_text(encoding="utf-8")
    vrl_css = (ROOT / "css/vrl-gift.css").read_text(encoding="utf-8")
    export_css = (ROOT / "css/export-card.css").read_text(encoding="utf-8")
    js = (ROOT / "js/preview.js").read_text(encoding="utf-8")

    html = (ROOT / "index.html").read_text(encoding="utf-8")
    html = re.sub(r'<link rel="stylesheet" href="../../css/style.css">', "", html)
    html = re.sub(r'<link rel="stylesheet" href="css/preview-gift.css">', "", html)
    html = re.sub(r'<link rel="stylesheet" href="css/vrl-gift.css">', "", html)
    html = re.sub(r'<script src="js/preview.js" defer></script>', "", html)
    html = re.sub(r'href="admin-preview.html"', 'href="#" data-offline-admin', html)

    david = ROOT / "img/david-vr-v2.png"
    david_data = b64(david) if david.is_file() else ""

    for rel in ASSETS:
        if not rel.is_file():
            continue
        data = b64(rel)
        name = rel.name
        html = html.replace(f"../../img/{name}", data)
        html = html.replace(f"../img/{name}", data)
        html = html.replace(f"img/{name}", data)

    if david_data:
        html = html.replace("img/david-vr-v2.png", david_data)

    fonts_block = ""
    for f in (REPO / "fonts").glob("*.woff2"):
        fonts_block += (
            f"@font-face{{font-family:'Mont Cyr';src:url('{b64(f)}') format('woff2');font-display:swap;}}\n"
            if "mont" in f.name
            else f"@font-face{{font-family:'Inter Cyr';src:url('{b64(f)}') format('woff2');font-display:swap;}}\n"
        )

    card_presentation = (ROOT / "gift-card-artwork.html").read_text(encoding="utf-8")
    card_inner = re.search(r'<body class="export-root">(.*)</body>', card_presentation, re.S)
    card_fragment = card_inner.group(1).strip() if card_inner else ""
    if david_data:
        card_fragment = card_fragment.replace("img/david-vr-v2.png", david_data)

    body = re.sub(r"<!doctype html>.*?<body[^>]*>", "", html, flags=re.S | re.I)
    body = body.replace("</body></html>", "")

    embedded = f"""<!doctype html>
<html lang="ru" class="js" data-offline-preview="1">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>VR Lounge · подарочная карта (offline demo)</title>
<style id="embedded-fonts">{fonts_block}</style>
<style id="embedded-site">{site_css}</style>
<style id="embedded-gift">{gift_css}</style>
<style id="embedded-vrl">{vrl_css}</style>
<style id="embedded-export">{export_css}</style>
</head>
<body>
{body}
<template id="card-export-template">{card_fragment}</template>
<script>{js}</script>
</body>
</html>"""

    OUT.write_text(embedded, encoding="utf-8")
    print(f"Wrote {OUT} ({OUT.stat().st_size // 1024} KiB)")


if __name__ == "__main__":
    main()
