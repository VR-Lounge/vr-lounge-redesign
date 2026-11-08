# VR Lounge gift preview v4 — Premium v2 card

**V2 HTML found:** `/home/ubuntu/.cursor/projects/agent-repos-vr-lounge-redesign/uploads/VR-Lounge-Premium-v2_4d2e.html` (PRIMARY, used).

## Local preview
```bash
cd preview/gift-card-mockup && python3 -m http.server 8765
```
http://127.0.0.1:8765/

## Demo messaging
- Success: «Демо: заявка никуда не отправлена» + phone `+7 930 224-45-51`
- States: `demo` / `submitting` / `success` / `error`
- Forbidden copy «Заявка принята» removed

## Address check
- Repo: `Кольчугино, ул. Зернова 11, ТЦ «ТРИО»`
- V2 HTML: `Кольчугино / ул. Зернова, 11 / ТЦ «ТРИО»`
- Same place; card uses repo form (no comma after Зернова). Minor punctuation variance only.

## Artifact paths (absolute)
- `/opt/cursor/artifacts/vr-lounge-gift-preview-v4/gift-preview.html`
- `/opt/cursor/artifacts/vr-lounge-gift-preview-v4/gift-card-demo.png`
- `/opt/cursor/artifacts/vr-lounge-gift-preview-v4/v4-gift-sheet-front.png`
- `/opt/cursor/artifacts/vr-lounge-gift-preview-v4/v4-gift-sheet-back.png`
- `/opt/cursor/artifacts/vr-lounge-gift-preview-v4/v4-gift-full-front.png`
- `/opt/cursor/artifacts/vr-lounge-gift-preview-v4/v4-gift-full-back.png`
- `/opt/cursor/artifacts/vr-lounge-gift-preview-v4/v4-gift-demo-success.png`
- `/opt/cursor/artifacts/vr-lounge-gift-preview-v4/v4-mobile-gift-sheet.png`
