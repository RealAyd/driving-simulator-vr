# Driving Practice Premium membership and VR simulator access

**Owner-approved entitlement policy, corrected 22 November 2026.**  
**Status: implementation specification, not confirmation that cross-app unlock is live.**  
**Audience:** simulator builder on `RealAyd/driving-simulator-vr`, branch `rebuild/3d-judgement-simulator`.

> **Product decision:** A learner whose **Driving Practice mobile-app account has valid, active Premium** must be able to open and use the VR judgement simulator without being required to buy a separate VR pass. The earlier version of this document incorrectly said mobile Premium could not unlock the simulator. That restriction is withdrawn.

The simulator must still support its **separate Stripe VR passes for people without qualifying mobile Premium**. The Theory Ready app remains a separate product. This document is intentionally free of production credentials and customer records.

## 1. Access matrix

| Verified learner status | Simulator access | Purchase requirement |
| --- | --- | --- |
| Mobile Driving Practice Premium active | **Allow** simulator access | **Do not demand a separate VR pass** |
| Mobile Premium through a valid manual/admin grant recognised by the mobile app | **Allow**, subject to the same verified effective-Premium status | No extra VR purchase |
| Mobile Premium expired, revoked, refunded with no other valid grant, or never held | No Premium-based unlock | Use existing valid VR pass or the VR checkout |
| No Premium, but valid purchased VR pass/credits | Allow according to the VR pass's remaining allowance | No duplicate purchase |
| Neither Premium nor VR pass | No paid simulator session | Offer existing VR pass checkout |
| Instructor subscription alone (`instructor_subscription`) | Does **not** count as learner Premium | Separate entitlement unless learner Premium is also active |
| Practical web-only Premium without mobile-recognised entitlement | **Not yet specified as part of this approval** | Do not silently expand or deny an existing verified entitlement; escalate this edge case to owner |

**Important:** The owner's approval is to unlock **simulator access and use** for valid mobile Premium members. No maximum number of drives, frequency cap, or conversion rate from Premium to VR credits has been agreed in this handover. **Do not impose a new VR pass purchase requirement on these members**, but also **do not advertise “unlimited VR drives”** until usage limits are expressly settled. Treat any Premium-session limit as a separate product decision to confirm before production enforcement.

Previous VR pass products (for example VR 5, VR 15 and VR 35) remain independent for non-Premium visitors. They are prepaid simulator usage products, not the Practical app's learner Premium subscription. Live package sizes and prices must come from verified VR Stripe configuration, not hardcoded marketing copy. The prior **no free introductory VR drive** policy remains in effect for visitors who qualify for neither access route.

## 2. Authoritative mobile Premium identity

The private `RealAyd/Driving-Practice` backend, not the VR frontend, is responsible for determining whether a learner's account has valid Premium access.

Inspected Practical-app source (`feature/practical-website-preview`) shows:
- Canonical **learner Premium** RevenueCat entitlement ID: `premium_access`.
- `instructor_subscription` is a separate entitlement and is not enough.
- A canonical backend `user_id`; legacy RevenueCat identity can be `revenuecat_app_user_id`. Do **not** create a second user solely by matching email.
- Premium can have multiple independent valid sources, including native RevenueCat purchase, valid manual/legacy grants and verified web Stripe orders. A revoked purchase must not remove some other still-valid grant.
- The backend exposes an authenticated `GET /api/auth/me` account route. **This does not prove that a dedicated simulator eligibility route or secure browser-to-VR login bridge exists.** Do not invent a route or treat a frontend boolean as verified.

A learner must authenticate as their **existing Driving Practice account**. Preserve original canonical account identity across mobile and VR. The VR app must not request the learner's Apple, Google, RevenueCat or Stripe credentials directly.

## 3. Builder implementation contract

1. **Audit what already exists** in the simulator: VR payment service, pass/credit wallet, sign-in, customer identity and secure backend. Do not replace working Stripe flows or overwrite existing VR customers.
2. **Design the shared sign-in handoff securely.** Use the Practical app's existing authentication flow or an approved short-lived exchange and verify the resulting session server-side. Never put long-lived bearer tokens in query strings, logs, public JavaScript or localStorage that another origin can read.
3. **Implement a server-verified eligibility decision**, combining two independent gates:
   - **Mobile Premium gate:** the authenticated canonical learner has valid, effective Premium recognised by Driving Practice.
   - **VR pass gate:** a non-Premium learner has a verified, unspent VR pass or other valid VR-specific credit/grant.
   Grant access if **either** gate is valid.
4. **Enforce the decision on actual session launch**, not just when hiding a checkout button. Direct scenario URLs, reloads, different viewer modes and retries must not bypass checks.
5. **A qualifying Premium user must not be charged again or forced to purchase VR credits.** Do not decrement a separate prepaid VR balance just because the Premium learner launches a session unless the owner explicitly approves such a rule.
6. **Keep existing VR credits separate.** Users who also own a VR pass retain it. An unrelated refund, RevenueCat expiration, or Practical membership change must not destroy legitimately purchased VR credits.
7. **Reverify when required**, especially after subscription expiry, refund, manual revocation or account changes. During a verification outage, don't invent a Premium entitlement or erase existing grants; provide a recoverable error and safe retry path.
8. **Maintain auditability and privacy.** Store the minimum access decision and source; do not publish customer lists, personal emails, purchase history, server tokens, webhook secrets or RevenueCat secret keys in this public repository.

**Do not assume cross-product access is already deployed.** The inspected simulator rebuild is a TypeScript/Vite/Babylon.js frontend; a secure account and entitlement bridge has not been verified. If the live simulator uses a separate hosted backend, discover and document that exact service before wiring the UI. Do not add a pretend `/api/vr-entitlements` endpoint without a real implementation and approved contract.

## 4. Entitlement and payment lifecycle

- A native weekly/monthly Premium subscription unlocks the simulator **while the mobile account has effective Premium**. Restore, renew, cancellation and expiration should be reflected by backend verification, not by an old screenshot.
- A valid non-expiring/lifetime mobile Premium purchase or approved manual Premium grant likewise unlocks the simulator while its verified grant remains active.
- A refund or cancellation only changes the access provided by the affected purchase or subscription. If another valid Premium grant remains, simulator access remains.
- A standalone VR pass remains subject to its own paid-drive consumption and refund rules. The system must use server-side idempotency for drive consumption and never double-decrement because of a network retry.
- The simulator's separate checkout must still work for non-Premium members; **do not add a second Premium subscription or silently convert existing VR prepaid passes into subscriptions**.
- Cross-app eligibility does **not** make Theory Ready Premium or an instructor subscription equivalent to learner Premium.

## 5. Tests required before release

- [ ] A current mobile Premium learner signs in to the simulator with the same canonical account and starts a real exercise **without a VR pass or second payment**.
- [ ] A learner with a valid manual Premium grant sees the same result, where their mobile account recognises the grant.
- [ ] A learner with only `instructor_subscription` is not mistaken for learner Premium.
- [ ] A non-Premium learner with available VR credits may start a drive and consumes only the agreed VR credit.
- [ ] A non-Premium learner with no valid pass gets the normal VR checkout, not a free drive.
- [ ] An account holding Premium **and** prepaid VR credits can use Premium access without accidentally consuming purchased credits.
- [ ] Expired Premium without another valid grant does not automatically unlock VR; a remaining independently purchased VR pass still works.
- [ ] Refunding one Premium purchase does not revoke access where another valid grant remains; VR pass balances remain unaffected.
- [ ] A mobile/web account switch does not expose the prior learner's Premium eligibility or credits.
- [ ] Direct URLs, replays, reconnects, webhook retries and concurrent sessions cannot bypass access checks or double-charge.
- [ ] iPhone Safari, Android Chrome and desktop browser sign-in, renewal/expiry and simulator launch work with a clean session.
- [ ] Production credentials and customer data are absent from source, tests, browser logs and public documentation.

## 6. Decision still required

**Premium drive allowance:** Whether mobile Premium provides unlimited simulator drives or a defined number of sessions is **not specified by the owner's current correction**. Do not invent a limit or advertise unlimited use. Before implementing a usage cap, obtain the owner's exact policy. In the meantime, the integration must **not require another VR pass purchase** for qualifying Premium members.

**Web-only Premium eligibility:** The owner's explicit correction covers Premium under the **mobile app**. If the same effective Premium entitlement is shared to the mobile account, it qualifies. Whether a web-only purchase that has not synced to mobile should immediately unlock VR requires a separately confirmed product and backend decision.

## 7. Source and status

Reviewed on 22 November 2026:
- Private Practical app `RealAyd/Driving-Practice`, `feature/practical-website-preview`: `backend/revenuecat_router.py`, `backend/web_access.py`, `backend/web_billing.py`, `backend/auth.py`.
- Public VR app `RealAyd/driving-simulator-vr`, `rebuild/3d-judgement-simulator`: `package.json`, `src/app/main.ts`, `docs/STANDALONE_PREVIEW.md`.
- **Owner's latest explicit rule supersedes earlier statements that Practical/mobile Premium could not open the simulator.**

This document specifies the approved access relationship; it does **not** report a successful production implementation, live Stripe checkout verification, or deployed shared authentication.

**Builder next action:** Review the existing VR access architecture, identify the smallest secure backend integration needed for the approved mobile-Premium unlock, and deliver a staging-tested implementation. Keep existing non-Premium VR passes and all production payments unchanged until validation.
