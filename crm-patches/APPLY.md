# Apply gift CRM module to `VR-Lounge/-`

This agent **cannot push** to `https://github.com/VR-Lounge/-` (403 for cursor[bot]).
Apply these files on a machine with write access, then push to `main` (GitHub Pages) and deploy Firebase.

## Rollback

Local CRM clone backup:

```bash
cd vr-lounge-crm   # clone of VR-Lounge/-
git checkout backup/pre-gift-crm-2026-11-08
# or
git checkout cursor/gift-crm-backup-e6c6
```

Restore files from `backups/` if needed:
- `backups/index.html.pre-gift-crm`
- `backups/firestore.rules.pre-gift-crm`
- `backups/functions.index.js.pre-gift-crm`

## Files to copy into CRM repo root

| Source (this folder) | Destination in `VR-Lounge/-` |
|---|---|
| `gift-cards.js` | `./gift-cards.js` |
| `gift.html` | `./gift.html` |
| `firestore.rules` | `./firestore.rules` |
| `functions.index.js` | `./functions/index.js` |
| `index.html.gift.diff` | apply with `patch -p0 < index.html.gift.diff` from repo root **or** manually merge |

Prefer applying the full patched `index.html` from the local agent clone if available:
`/agent/repos/vr-lounge-crm/index.html`

## Firebase deploy (requires credentials)

```bash
firebase deploy --only firestore:rules
firebase deploy --only functions:onNewGiftCard
# optional composite indexes if console prompts:
# giftCards: createdAt DESC
# giftLedger: cardId ASC, createdAt DESC
```

Secrets already used by existing booking notifications:
- `functions.config().telegram.bot_token`
- `functions.config().telegram.admin_group_id`

No new bot — `onNewGiftCard` reuses `sendNotificationToAdmins`.

## Payroll / finance safety

- New nav + section only; salary/revenue formulas untouched.
- Booking form may attach `giftPayment` metadata and a notes line.
- `finalPaymentMethod` is **never** persisted as `gift_note` — stays `cash|transfer`.
- Gift balance lives in `giftCards` + `giftLedger` only.

## Standalone UI (already on redesign Pages after merge)

- Admin: https://vr-lounge.github.io/vr-lounge-redesign/crm-gift/
- Public card: https://vr-lounge.github.io/vr-lounge-redesign/gift.html?code=VRL-XXXXXX
