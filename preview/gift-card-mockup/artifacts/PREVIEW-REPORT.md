# Gift preview v3 (same PR, preview-only)

## v3 changes

- Hero: only **Поиграть / День рождения / Подарить** (header **Забронировать** kept).
- Callbar: after hero leaves viewport (`intersectionRatio ≤ 6%`); hidden with sheet/lightbox open.
- Gift sheet: **scroll body + fixed foot**; reserved `padding-bottom` so phone/recipient sit above CTA; CTA **«Оставить заявку на сертификат»**.
- Card grid UX: 40% / 5% / 55%, footer band ≥6%, export **1.6:1** (800×500 + 5% pad) PNG/PDF.
- Offline file: `artifacts/gift-preview.html` (~1.5 MiB, embedded assets).

## Artifacts (box paths)

`/opt/cursor/artifacts/vr-lounge-gift-preview-v3/`

- `gift-preview.html` — open locally via `file://`
- `gift-card-demo.png`, `gift-card-demo.pdf`
- `v3-mobile-hero-3cta.png`, `v3-mobile-scrolled-callbar.png`
- `v3-mobile-gift-sheet.png`, `v3-mobile-gift-sheet-phone.png` (scroll to phone)
- `vr-lounge-gift-preview-standalone.zip`
