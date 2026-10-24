# Accounts and payments service

Node 22. `npm run build:server`, then `npm run start:server` (listens on `$PORT`; health check `GET /healthz`).
Local development with fakes (no real email, sign-in or payments): `npm run dev:server`.
Tests: `npx vitest run server/test`. Add `MONGO_TESTS=1` to also run the concurrency tests against a real MongoDB
(downloaded once, about 80 MB).

## Packs (`packs.json`)

| Pack | Price | Grants |
|---|---:|---|
| Starter Pass | £2.99 | 1 lesson + 1 mock test + 1 free drive, as three separate allowances; once per account |
| VR 5 | £9.99 | 5 sessions (any kind of drive) |
| VR 15 | £24.99 | 15 sessions |
| VR 35 | £49.99 | 35 sessions |

Each pack lists its Stripe Payment Link per mode (`links.test`, `links.live`). Changing this file never changes an
existing account: balances and ledger entries are kept as recorded (the ledger stores what was granted, not a
reference to the pack).

## How access is granted and used

- **Only the verified webhook grants anything.** `POST /api/stripe/webhook` checks Stripe's signature; the browser
  returning to `?checkout=done` only makes the app re-read the balance.
- **Which pack:** the Checkout Session's `payment_link` id is looked up with Stripe and its address matched to
  `packs.json`. Prices, session counts and pack ids from the browser are never used. A link that is not listed is
  flagged (`payment-unknown-pack`) and grants nothing, unless its Stripe metadata says `sessions` (general sessions only).
- **Which account:** `client_reference_id`, put on the link by the server (`POST /api/checkout` builds the address for
  the signed-in account), else the payer's email if it matches an account; otherwise flagged (`payment-no-account`).
- **Delayed payments:** `checkout.session.completed` with `payment_status: unpaid` grants nothing;
  `async_payment_succeeded` grants; `async_payment_failed` grants nothing.
- **Promotion codes:** a 100% code (`no_payment_required`) grants the pack, recorded as `promo` with no money; it does
  not count as the paying that rewards a referrer.
- **Idempotency:** every ledger entry has a unique idempotency key (`checkout:<session>`, `checkout:<session>:<pot>`,
  `drive:<id>`, `refund:<charge>`, ...), enforced by a unique index; the balance moves only when the entry is new.
  Replayed or simultaneous deliveries grant once; a delivery that stopped part-way completes on Stripe's retry.
- **Drives:** the server decides the kind of drive from the scenario (`*-lesson`, `*-mock-test`, otherwise a free
  drive), not from what the browser calls it. A Starter allowance of that kind is used first, then a general session.
  Taking it is a single conditional update, so simultaneous starts cannot spend the same session twice. A drive that
  reports it failed to load within 15 minutes gets its session back to the pot it came from (at most 3 a day).

## Starter Pass: once per account

- The app does not offer it once bought, and `POST /api/checkout` refuses it (`409 starter-bought`).
- The Payment Link itself is public, so it can still be paid twice (another tab, a shared link). The first checkout to
  claim the account's Starter (an atomic `claimStarter`) is granted. Any other Starter payment for that account
  **grants nothing and is refunded in full automatically** (Stripe refund, reason `duplicate`, idempotency key per
  payment), and the account history says so. The later `charge.refunded` webhook only records the money.
- If Stripe refuses that refund (for example a restricted key without the Refunds permission) the payment is flagged
  `starter-duplicate-refund-needed` with the account, payment intent and amount.
  **Reconciliation:** refund that payment intent by hand in the Stripe dashboard; the webhook then records it.
- The staging Stripe key therefore needs Refunds write permission, in addition to reading Payment Links.

## Refunds and disputes

- **Full refund of a sessions pack:** its sessions are taken back even if spent; the balance can go below zero, and
  nothing more can be started until it is topped up.
- **Full refund of a Starter Pass:** each unused allowance is taken back; one already used stays used and is flagged
  (`refund-after-use`).
- **Partial refunds** (a goodwill gesture, a missed promotion code): the money is recorded and the sessions stay.
  Under £5 in all on one payment, that is all. From £5, it is also flagged (`partial-refund`) for a person to decide
  whether to remove sessions (by hand, with an adjustment).
- **Referral rewards** earned by a payment that is later refunded stay with the referrer.
- **Disputes:** flagged (`dispute`); access is not changed automatically.

Flags are in the `flags` collection for review.

## Referrals

A new account arriving through `?ref=CODE` gets one free drive (a general session, usable for any kind of drive),
once per person (email aliases count as one person). The referrer gets one session after that person's first payment
with money (once per referred person).
