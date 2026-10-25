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

## Admin hub (`/admin.html`)

For the accounts in `ADMIN_EMAILS` (comma-separated, matched against the account's verified email). Everyone else gets
403. The hub needs a sign-in from the last 12 hours (an older cookie still works for driving, but the hub asks to sign
in again). Changes are accepted only from this site's own page.

- **Overview:** accounts (new in 7 and 30 days), paying customers, money paid and refunded (from the ledger), drives in
  the last 30 days by kind and how many failed to load, sessions held by customers, open flags.
- **Customers:** search by part of the email, a referral code or an account id; each customer's full ledger and
  recent drives.
- **Adjust sessions:** add or remove general sessions or one Starter Pass pot, with a reason. It is a new `adjustment`
  entry in the ledger carrying the admin's email (`by`); entries are never edited. A removal cannot take a balance
  below zero. Each submission carries a request id, so a double click records once.
- **Payments:** purchases, promotion-code checkouts, refunds and duplicate Starter Passes in a date range, with a CSV
  download (spreadsheet formulas in text cells are made plain).
- **Flags:** everything the service has set aside for a person (partial refunds of £5 or more, disputes, unmatched
  payments, refused invites, ...). Marking one resolved records who and a note.
- **Referrals:** each referrer, how many joined with their link, how many of those have paid, sessions earned.

API: `GET /api/admin/overview`, `GET /api/admin/customers?q=`, `GET /api/admin/customers/:id`,
`POST /api/admin/customers/:id/adjust {sessions, pot|null, reason, requestId}`,
`GET /api/admin/payments?from=YYYY-MM-DD&to=YYYY-MM-DD[&format=csv]`, `GET /api/admin/flags?state=open|resolved|all`,
`POST /api/admin/flags/:id/resolve {note}`, `GET /api/admin/referrals`.

## Support (`/support.html`, and the hub's Support tab)

- **Asking:** anyone can send a request, signed in or not: contact email (where replies go), optional phone (stored
  in international form; a UK number starting 0 becomes +44), category, description and up to 5 screenshots (10 MB
  each; JPEG, PNG, WebP or HEIC, checked by their bytes, never by what the browser says). A hidden field catches
  bots; requests are rate-limited per address and per email.
- **References and links:** each request is `DP-0001`, `DP-0002`, … The customer's emails carry a link to that one
  request (a signature of its id with `SESSION_SECRET`), so they can read replies and answer without signing in.
  A request is tied to an account only when sent signed in (anyone could type an email address; replies still go
  only to that address).
- **Priority** from the category (Highest: refund request; High: paid but cannot get in, sessions missing, a payment
  or drive failed; Normal: bugs, questions, complaints; Lower: suggestions). An admin can change it; every change is
  logged on the request.
- **States:** Awaiting admin (new, or the customer replied) → In progress (acknowledged) / Awaiting customer
  (answered) → Resolved. A reply to a resolved request reopens it.
- **Response timer:** 5 minutes from the request (or the first customer reply after an answer). An admin reply or
  **Acknowledge** stops it; opening the request or an internal note does not. When it passes, the request is marked
  overdue and a reminder is sent, again every `SUPPORT_REMINDER_MINUTES` (30) until acknowledged. A worker in the
  server does this every 20 seconds, with or without anyone in the hub; with several servers each reminder is
  claimed once.
- **Delivery:** every email and alert goes through `notification_outbox` and is retried after 1, 5, 15 and 60
  minutes, then shown in the hub as not sent, with Retry now. The request and its messages are saved first, so a
  failed email never loses one.
- **Who is told:** new requests, customer replies and reminders go to `SUPPORT_INBOX` (default `EMAIL_REPLY_TO`).
  Phone alerts are optional: set `SUPPORT_PUSH_URL` to a private ntfy topic URL (e.g. `https://ntfy.sh/<long random
  name>`, kept as a secret) and install the ntfy app; Highest and High arrive as urgent alerts.
- **Privacy:** internal notes and logged changes are never shown to the customer; screenshots are served only to the
  request's customer and admins, as images (never as pages).

## Free try (no sign-up)

Each device can try **one lesson, one mock test and one free drive** without an account. The try is held by the
server (`trials`), named in an HttpOnly signed cookie (`dp_trial`, a year); using one is atomic, so it cannot be
used twice at once. New tries are limited to 4 a day per address (clearing cookies does not give unlimited drives).
Signed in, an account's sessions and Starter Pass are used first; with none left, the device's free try. A free-try
drive that fails to load is given back. Admins (`ADMIN_EMAILS`) drive without sessions or tries.
