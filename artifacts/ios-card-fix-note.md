# iOS gift-card back-face bleed — root cause

## Symptom
On iPhone Safari and Yandex (WebKit), the gift-card **back** showed mirrored front content overlaid on the reverse (David bust, “VR LOUNGE”, amount, etc.). Desktop browsers were fine.

## Cause
Classic WebKit 3D-flip failure:

1. `.vrl-gift__face` used `overflow: hidden` **on the same element** as `backface-visibility: hidden`. iOS Safari often ignores backface hiding in that combo, so the front stays painted (mirrored) while the back is shown.
2. Faces lacked a small `translateZ` separation, which further confuses WebKit’s preserve-3d compositing under a nested tilt (`preserve-3d` on tilt + card).

David appearing on the back was **not** wrong markup — the portrait lives only on the front and was bleeding through.

## Fix
- Replace face `overflow: hidden` with `clip-path: inset(0 round …)`.
- Explicit `-webkit-backface-visibility` + `translateZ(1px)` on front/back.
- After flip settles, `.is-face-settled` hides the inactive face (`visibility` / `pointer-events`).
- On coarse pointers (phones): skip CSS 3D and crossfade faces instead (reliable on iOS WebKit).
- `prefers-reduced-motion` still disables transitions.

Live check: `https://vr-lounge.github.io/vr-lounge-redesign/?autogift=1` (after merge to `main`).
