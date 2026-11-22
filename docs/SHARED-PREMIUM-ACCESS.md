# Driving Practice membership and VR simulator access
**Builder handover | 22 November 2026 | Documentation only**

**Applies to:** VR Driving Practice judgement simulator (`vr.drivingpractice.live`) and its relationship to the separate Practical Driving Practice app. This is a public, secrets-free integration guide for the simulator builder. It is **not** an instruction to change live entitlements, billing, customer data or production configuration.

## 1. Non-negotiable product boundary

| Product | What a purchase currently unlocks | Billing and authority |
| --- | --- | --- |
| Practical Driving Practice (web, iOS, Android) | Practical scenarios/features governed by the existing app's Premium entitlement | Practical app backend and verified RevenueCat/Stripe/manual-grant state |
| VR Driving Practice judgement simulator | A finite number of paid simulator drives, usable across simulator modes according to its own pass rules | VR's own verified Stripe checkout and server-side drive allowance |
| Theory Ready | Theory preparation; separate product/access | Its own implementation and terms |

**Do not infer that Practical Premium automatically grants simulator drives.** No cross-product Premium-to-VR unlock has been approved or evidenced in the inspected code. Do not show “VR included with Practical Premium,” grant unlimited VR, or create a hidden bundle. Practical and VR can cross-promote, but access is separate.

**No free VR drive:** the last explicit product decision was that simulator sessions are paid, with no free introductory drive. Do not grant a “one free drive” allowance. A staging/test scenario can be available only behind development/test controls and must not become public paid-content bypass.

The simulator has used Stripe prepaid passes (including packages described as VR 5 / VR 15 / VR 35 drives and earlier Starter/top-up offers). **Do not hard-code sizes, prices or promotional claims from this document**: retrieve live package definitions and allowances from the simulator's actual Stripe/payment configuration. A pass is finite usage, not a Premium subscription. One VR wallet should be usable across VR lessons, mock tests, free-drive mode and future manoeuvres where supported.

## 2. Practical Driving Practice: what “Premium” means

The **private** source repository is `RealAyd/Driving-Practice`. The simulator builder does not need access to that private repository to read this document.

The inspected Practical app source defines:
- Canonical learner Premium entitlement ID: `premium_access` in RevenueCat. A separate `instructor_subscription` entitlement is **not** learner Premium.
- Native iOS/Android purchases and restores use RevenueCat. Keep each person's existing `user_id` and original `revenuecat_app_user_id` linkage; never infer entitlement from an email match.
- Practical web checkout code offers a **£19.99 one-time** and **£4.99 weekly** product through verified Stripe checkout. These are **source-code configured amounts, not a promise that every plan is live**.
- Account Premium can also come from a valid manual/admin grant or an existing legacy entitlement. Backend reconciliation considers independent valid grants; a refund/revocation should remove only the benefit of the affected purchase, not unrelated valid grants.
- A frontend flag, browser return URL, screenshot of payment, webhook with an invalid signature or an unverified RevenueCat SDK state **must not independently grant Premium**.
- Existing mobile Premium is intended to carry into the **Practical web app** without a second purchase. Any reverse web-to-mobile sync and migrations need verified production testing; do not claim they're finished.

For orientation only, the Practical backend includes `GET /api/auth/me` (authenticated bearer session) and its own entitlement reconciliation. **This is not a public simulator entitlement API.** Never call it from a public simulator with a server secret, copy an admin token, or mirror the entire user database into the VR application.

## 3. What the simulator builder should implement

1. **Keep VR pass ownership separate.** A visitor's Practical Premium flag must not unlock a VR session. A verified VR pass or approved VR-specific grant is required.
2. **Re-use the VR's existing account and payment flow**, if present, rather than spinning up another Stripe customer/payment system. If no secure server-side wallet exists, report that dependency; do not fake a balance in localStorage or deliver a browser-only access gate.
3. **Verify VR payment server-side** (signed Stripe webhooks plus provider reconciliation as needed). Redirects and client-supplied order IDs alone are not proof of payment. Never put Stripe secret keys or webhook secrets in browser code.
4. **Gate every paid launch path**, including direct scenario URLs, alternate modes, mobile/VR routes and “retry” routes. A UI paywall without a server-enforced allowance check is not sufficient.
5. **Spend a drive exactly once under the agreed usage rule.** Use an atomic server-side decrement with an idempotency key. Retries caused by network errors must not double-charge a drive. Define precisely what constitutes a started/consumed drive in the VR product before enabling billing.
6. **Keep passes account-bound**, not solely device-bound. Persist remaining allowance and purchase records securely. Restoring an existing pass must not create additional drives.
7. **Handle refunds/chargebacks correctly.** Remove only the VR allowance or credits associated with the affected transaction (including unspent remaining units according to the documented refund policy); do not revoke a separate Practical Premium grant.
8. **Display an accurate access message.** Example: “VR sessions require a simulator pass.” Link to `https://vr.drivingpractice.live/` for the current passes. Do not promise a specific pack or price until verified.
9. **Avoid sharing sensitive information.** No production CSV export, customer emails, RevenueCat secret/API key, private purchase ledger, bearer tokens, webhook signing key or customer credentials in this public repository.

A simulator **test/pre-release environment** must use isolated test payments and test accounts. Do not submit real charges during integration testing.

## 4. Shared accounts or a bundle: FUTURE DECISION, not live functionality

A future sign-in bridge, combined bundle or promotional benefit could be designed, but **none is authorised by this handover**. If the owner later approves one, define:
- A written entitlement matrix by product and purchase type (including weekly, one-time, manual grants, expiration, refunds and grandfathered memberships).
- A server-to-server, least-privilege eligibility check linked by canonical account identity; identity verification cannot rely solely on a matching email.
- Separate fields for **Practical Premium active** and **VR credits remaining**. An “active” Premium response must not be treated as unlimited drives.
- Explicit rules for consumer consent, privacy, cancellation and source-specific revocation.
- Audit logs, replay protection, downtime behavior and acceptance tests on staging.

**Do not invent or call a `/api/vr-entitlements` or shared access endpoint: no such integration endpoint was verified.** A development agent must obtain an approved contract before implementing any cross-product access.

## 5. Acceptance checklist for the VR builder

- [ ] No VR pass: a normal visitor cannot start a paid drive, including via deep links.
- [ ] Practical Premium only: still no VR drives unless the user separately owns a valid VR pass.
- [ ] Valid VR pass: the user can enter allowed VR modes; remaining allowance is read from verified server state.
- [ ] Completed paid drive: one and only one unit is consumed according to the documented VR usage rule.
- [ ] Network retry, page reload or webhook replay: no duplicate charge, credit or consumption.
- [ ] Refunded/disputed VR purchase: remove only its VR-specific benefit; other purchases remain intact.
- [ ] Practical web/mobile Premium and manual grants: unchanged by VR billing or refunds.
- [ ] No live secrets or customer PII exposed in frontend code, GitHub or logs.
- [ ] Staging Stripe test journey passes before production changes.

## 6. Source and verification notes

**Inspected 22 November 2026:**
- Private Practical source `RealAyd/Driving-Practice`, `feature/practical-website-preview`: `backend/revenuecat_router.py`, `backend/web_access.py`, `backend/web_billing.py`, `backend/auth.py`.
- Public VR source `RealAyd/driving-simulator-vr`, `rebuild/3d-judgement-simulator`: `package.json`, `src/app/main.ts`, `docs/STANDALONE_PREVIEW.md`.
- The checked VR rebuild is a browser-side TypeScript/Babylon app; the inspected build did **not** establish an operational, server-enforced VR membership wallet. A dedicated backend or existing VR payment service must enforce access.
- These are code and product-rule findings, **not** confirmation of current live Stripe package prices, payment webhook health, successful purchases or membership synchronization.

**Builder instruction:** Build only the VR access described above. Keep all Practical/VR/Theory product boundaries intact and return a concise implementation plan naming the existing services, missing server-side dependencies and exact acceptance evidence. Do not change billing or access terms without explicit owner approval.
