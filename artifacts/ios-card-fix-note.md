# iOS gift-card back-face bleed — root cause

## Symptom
On iPhone Safari and Yandex (WebKit), the gift-card **back** showed mirrored front content overlaid on the reverse (David bust, “VR LOUNGE”, amount, etc.). Desktop browsers were fine.

## Cause
Classic WebKit 3D-flip failure:

1. `.vrl-gift__face` used `overflow: hidden` **on the same element** as `backface-visibility: hidden`. iOS Safari often ignores backface hiding in that combo, so the front stays painted (mirrored) while the back is shown.
2. Faces lacked a small `translateZ` separation, which further confuses WebKit’s preserve-3d compositing under a nested tilt (`preserve-3d` on tilt + card).

David appearing on the back was **not** wrong markup — the portrait lives only on the front and was bleeding through.

## Fix (smooth 3D + anti-bleed)
- Replace face `overflow: hidden` with `clip-path: inset(0 round …)`.
- Explicit `-webkit-backface-visibility` + `translateZ(2px)` on front/back.
- Keep CSS `rotateY` 3D flip on **all** pointers (desktop and mobile) — no coarse-pointer crossfade shortcut.
- Mid-flip: both faces stay in the 3D tree (no `display:none` / visibility hide).
- After settle (`transitionend` + timeout fallback): `.is-face-settled` applies `visibility` / `pointer-events` / `display:none` on the inactive face so WebKit cannot keep a mirrored layer.
- `prefers-reduced-motion` still disables transitions and settles immediately.

Live check: `https://vr-lounge.github.io/vr-lounge-redesign/?autogift=1` (after merge to `main`).
