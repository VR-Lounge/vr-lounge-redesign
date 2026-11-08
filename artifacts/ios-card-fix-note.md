# iOS gift-card flip — root cause (instant swap on iPhone)

## Symptom
Desktop showed a smooth ~1s `rotateY` 3D flip. iPhone (Safari / WebKit shells) showed an **instant front↔back swap** with zero flip animation.

## Root cause (why removing coarse-pointer CSS was not enough)
A previous fix removed the `@media (hover:none) and (pointer:coarse)` crossfade that forced `transition:none` on phones. That was necessary but incomplete.

The remaining killer was **class ordering around anti-bleed settle**:

1. After each flip, `.is-face-settled` applies `display:none` to the inactive face (needed so iOS WebKit cannot keep painting a mirrored bleed).
2. On the next tap, JS toggled `.is-flipped` **while `.is-face-settled` was still present**.
3. For one style pass that matched `.is-face-settled.is-flipped .vrl-gift__front { display:none }`, the outgoing face was removed from the tree in the **same frame** as the `transform` change.
4. iOS Safari then skipped interpolating `rotateY` (no painted start state with both faces), so the card appeared to switch instantly. Desktop Chrome still often animated, which matched the report.

Secondary hardening for WebKit: missing explicit `rotateY(0deg)` from-state / `-webkit-transition`, and sheet `overflow` ancestors can flatten 3D — addressed with `translateZ(0)` on `.vrl-gift` plus webkit transition prefixes.

## Fix
1. Enter `.is-flipping`, **remove** `.is-face-settled` first (both faces re-enter the 3D tree).
2. Force layout (`offsetWidth`) + `requestAnimationFrame`, **then** toggle `.is-flipped` so the CSS transition can run.
3. Apply settle `display:none` only after `transitionend` / `webkitTransitionEnd` (with min-duration guard) or a ~950ms timeout — never mid-flip.
4. Keep ~0.9s `rotateY` transition on all pointers; no coarse-pointer shortcut.
5. GPU/compositor hints: `translateZ(0)`, `-webkit-transform`, `-webkit-transition`, `-webkit-perspective`.

## Live
https://vr-lounge.github.io/vr-lounge-redesign/?autogift=1

## Proof
`/opt/cursor/artifacts/vr-lounge-mobile-flip/` — coarse-pointer emulation, computed `transition: transform 0.9s …`, mid-flip `matrix3d(...)` screenshot.
