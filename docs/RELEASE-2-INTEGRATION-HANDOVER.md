# Release 2 — Simulator integration and read-only audit handover

**Status: owner-authorised build specification; no production changes authorised.**
**Pinned source base:** `ea46efc695d7e503dcfa8bc4297859beeac92ce8` (reported deployed production version, 20 November 2026). This docs-only branch starts from that exact commit so later, unvalidated work on `assets/batch-a` is not accidentally included. The reported staging commit is `06a3f016085cef3771b1352ee5bf7195c82c0349`.

## Critical architectural correction

The **live VR simulator has its own working Node 22 backend, MongoDB accounts database, Stripe live payments, Resend emails and server-side drive/credit ledger**. Verified in pinned production source: `server/src/store.ts`, `server/src/mongoStore.ts`, `server/src/config.ts`, `server/README.md`.

It has **no RevenueCat entitlement and no learner Practical Premium field** today. Do **not** migrate its accounts into the Practical database or replace its Stripe ledger. **Release 1 is limited to the original Practical mobile app and Practical web migration; this simulator release must not be bundled into it.** Release 2 comes afterward.

The live simulator already stores account records, purchase ledger entries, started/finished drive records and some lesson completion state on the server. Preserve these existing operational records. The owner's deferral applies to **new detailed simulator assessment cloud storage, cross-device assessment sync, sync-status UI and unified dashboards**, not removal of the existing server drive/transaction records. Detailed assessments can remain locally stored and should say **“Saved on this device”** on successful IndexedDB write (use truthful session-only wording if persistent storage fails).

## Approved Premium integration

- Qualifying learner Practical Premium (verified native, web or manual grant on the same canonical Practical account) opens **unlimited normal simulator sessions**, including available practice modes, while active; no extra VR purchase and **no deduction** from an owned VR pass balance.
- Instructor role or free Practical instructor app access alone gives **no** free simulator access or Premium-first challenge access. An instructor with a separate valid learner Premium or purchased VR pass is eligible under that independent purchase.
- Existing VR customers and their Stripe subscriptions, `unlimitedUntil`, credit balance, legacy Starter allowances, refunds and append-only `ledger_entries` remain independent.
- Do **not** write a one-off `migration:<id>` credit, copy a Premium flag into the simulator account, or create an unexpiring `unlimitedUntil` Stripe-like pass merely to represent a **currently active Practical Premium**. That would create stale access after cancellation. Use a server-verified, expiring/refreshable **external Practical entitlement** check tied to a securely linked account identity, and verify again before exercise launch.
- Both products can retain their own backend and account tables. Link them using a consented, verified identity exchange and a server-side eligibility contract. Do **not** rely only on matching an email, passing a long-lived bearer token in a URL or trusting browser-supplied Premium.
- Challenge content opens **first** to verified learner Practical Premium. The owner must separately authorise later general availability; do not invent a release duration, prizes, competition entry rules or a free instructor allowance.
- The simulator builder should receive an authorised, sanitised, read-only feed of new Practical “Request my test centre” demand; no requester emails or broad Practical admin token. Work claiming and publication require separate permissions.

## Read-only simulator export — authorised NOW to build, NOT authorised to run on production yet

Build a **reusable, owner-only, read-only** export tool in a separate development branch and test against invented/staging accounts. Export scope is all simulator accounts, not only paid users, and trace account grants to ledger/source. Do not export tokens, login codes, password material, payment secrets or marketing/support free-text data.

Proposed versioned output, one row per account, with linked files for per-source grants:
- account id; verified lowercase email and provider sub identifiers as available; account created date; existing Stripe subscription IDs and `unlimitedUntil` if any; general balance; Starter allowances; origin/source of credits and refunds; lesson completion count and completed-drive count; UTC export timestamp.
- a separately joined grant/ledger audit with account ID, unique ledger entry key, type, amount/allowance, payment reference *where safe*, Stripe source or admin adjustment attribution, and UTC timestamps.
- clear counts of all accounts, accounts with a balance, active subscription/pass, promo/referral entitlement and unknown source. Ensure cached `balance` agrees with append-only ledger or flag discrepancies rather than silently fixing them.

Use a **dedicated read-only MongoDB database account**, limited to the simulator database, at export execution time. A production connection string must be configured **privately** in an approved environment; never put it in GitHub code, chat, CI logs or downloaded handovers. The existing read/write application user is not acceptable for the exported job.

**Do not store real customer exports as public GitHub Actions artifacts**, even from a temporary workflow. Provide owner-only secure delivery with short retention. If there is no verified private export destination/role, stop and request configuration. Creating read-only credentials requires the simulator's Hostless database administrator or Hostless support; a GitHub code change cannot provision that identity. The tool must not be auto-scheduled or connected to a production database while being developed.

**Important scope distinction:** the owner's **four required Release 1** full-account exports are legacy-Practical-before/after and shared-Practical-before/after. A simulator account export is a **separate Release 2 baseline/reconciliation task** and cannot substitute for any of those four.

## Release discipline and verification

1. Build/read-only test export and handover on a branch pinned to the exact deployed production commit; do not merge unvalidated traffic-engine work from `assets/batch-a`.
2. Record the real production service, deployed commit, DB label (not credentials) and separate staging account/service. Validate an isolated staging export, schema, account completeness and read-only role.
3. After Release 1 Practical migration passes owner reconciliation, implement secure VR account-linking/SSO and server-verified Practical Premium eligibility. No new RevenueCat SDK or subscription catalogue inside VR.
4. Preserve non-Premium paid VR passes and existing server drive/ledger behavior; guard all session-launch routes, refresh eligibility on expiry, and verify that Premium usage never spends VR credits.
5. Build Premium-first challenge release control and the least-privilege test-centre demand feed as a separate Release 2 feature, only after Practical cutover has been signed off.
6. Run one real-device end-to-end suite across iOS, Android, Practical web and simulator. Do not publicly claim shared access before this passes.
7. Keep the actual deployed previous simulator release available for code rollback. Revert live data only via audited offsetting ledger entries where relevant; never delete source transactions or erase existing drive history.

## Builder response expected

Give the owner the **code branch/commit of the export**, staging tests for complete rows and denied unauthorised access, exact read-only database role configuration instructions that Hostless actually supports, the **private** secure export delivery plan, and list of dependencies from the Practical web builder for the proposed identity/eligibility contract.

**Stop before running any production export, creating live linking records, importing Practical accounts or deploying Release 2 without subsequent approval.**
