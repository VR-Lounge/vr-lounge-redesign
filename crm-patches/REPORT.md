# Gift CRM integration report — 2026-11-08

## Understanding: **partial**

| Area | Status | Gaps |
|---|---|---|
| CRM source (`VR-Lounge/-`) | Yes — cloned & mapped | **No push access** (403 cursor[bot]) → cannot deploy to `vr-lounge.github.io/-/` from this agent |
| Firebase project/schemas | Yes — `vr-lounge33`, collections documented | No Admin SDK / `firebase` CLI login → **cannot deploy rules/functions** |
| Telegram pipeline | Yes — `onNewBooking` → `sendNotificationToAdmins(ADMIN_GROUP_ID)` | `TELEGRAM_BOT_TOKEN` / functions config **not in this environment** → notification code written, live send deferred |
| Auth model | Yes — Firebase email/password; Mini App unauth creates with rules validation | — |
| Website gift form | Was demo-only; now wired to create `giftCards` | Live write needs rules deploy; until then localStorage fallback + honest messaging |

## Architecture decision

**Separate nav section «Подарочные карты»** + light hook in «Добавить запись клиента».

Why not only client card:
- Gift cards need issue / list / balance / ledger / void flows independent of visit history.
- Shared model (`type: gift|prepaid`) lives in `giftCards` + `giftLedger`, ready for prepaid later.
- Booking hook only attaches metadata + optional ledger debit; **does not rewrite payroll**.

## Backup / rollback

Created locally in CRM clone:

- Branch: `cursor/gift-crm-backup-e6c6` (commit with `backups/*`)
- Tag: `backup/pre-gift-crm-2026-11-08`
- Files: `backups/index.html.pre-gift-crm`, `firestore.rules.pre-gift-crm`, `functions.index.js.pre-gift-crm`

```bash
git checkout backup/pre-gift-crm-2026-11-08
# or restore file copies from backups/
```

Push of backup branch to `VR-Lounge/-` **failed (403)**. Copies also in redesign `crm-patches/`.

## Implemented

- CRM additive UI (nav + section + issue/redeem/detail) via `gift-cards.js`
- Booking form: «Подарочная карта (заметка)» → `giftPayment` + notes; `finalPaymentMethod` stays cash|transfer
- Public page `gift.html` (balance + ledger + print/PDF)
- Standalone admin on redesign: `/crm-gift/`
- Site form (`js/gift.js`) real create flow + `?giftDemo=1` escape hatch
- Firestore rules for `giftCards` / `giftLedger`
- Cloud Function `onNewGiftCard` mirroring booking admin-group notify style

## Deferred

- Prepaid card product UX (`type=prepaid` field reserved only)
- Live Telegram until functions deploy + existing bot token config
- Live CRM Pages at `github.io/-/` until someone with write access merges `crm-patches/`
- Production Firestore writes until rules deploy (UI falls back to localStorage)

## URLs (after redesign Pages deploy)

- Gift admin UI: https://vr-lounge.github.io/vr-lounge-redesign/crm-gift/?giftLocal=1
- Public card: https://vr-lounge.github.io/vr-lounge-redesign/gift.html?code=VRL-DEMO01
- Site form: https://vr-lounge.github.io/vr-lounge-redesign/ (gift sheet)
- Live CRM gift nav: **blocked** until merge into `VR-Lounge/-` → then https://vr-lounge.github.io/-/ + «Подарочные карты»

## Payroll / finance contour

**Untouched.** No edits to `calculateSalaries`, `calculateWeeklyPayroll`, `calculateRevenueStats`, or expense math.

Safe touch points only:
- New section/nav DOM
- Booking notes + optional `giftPayment` object
- `finalPaymentMethod` coerced away from `gift_note` before persist
