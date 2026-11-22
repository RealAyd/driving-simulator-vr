# Shared accounts, Premium access, progress storage, and transferability
**Driving Practice integration contract — 22 November 2026**  
**Applies to:** original Driving Practice iOS/Android app, Practical Driving Practice web app (`app.drivingpractice.live`), and VR judgement simulator (`vr.drivingpractice.live`). Theory Ready is a separate learning product and does not inherit this Premium membership without an explicit future decision.

**STATUS: target architecture and acceptance requirements, NOT a live deployment claim.**

## 1. Owner's cross-platform outcome

A learner has **one canonical Driving Practice account** and **one effective learner Premium status**, regardless of whether they use an iPhone, Android phone, practical web browser or simulator. A valid active Premium entitlement obtained through **mobile native purchase, verified web purchase or a valid recognised manual/legacy grant** should be accessible on mobile and practical web and should unlock **unlimited simulator use** for that same learner, without a separate VR pass or VR-credit deduction. All valid grants must compose: removing/refunding one grant must not cancel another independent valid grant.

Non-Premium learners may continue to use the simulator's separate verified paid-drive passes; those credits are **not** Practical Premium and must not be lost when mobile Premium changes. Instructor subscription and Theory Ready entitlements are separate.

Use an account-level eligibility check rather than relying on which platform originally sold the Premium purchase. If a web purchase is not yet recognised by the mobile app, that is a **sync defect to fix**, not a reason to create another account, charge again or grant access from an unverified client flag.

## 2. Single identity and security contract

- Source of truth: canonical authenticated backend `user_id`. Preserve the user's original RevenueCat `revenuecat_app_user_id` alias; never silently reassign identity or merge accounts by matching email alone.
- Same person signs into native, web and VR using the existing supported Driving Practice authentication methods. Ensure identity-provider credentials used for Apple/Google are registered correctly for the applicable app/domain. Don't expose any private keys.
- The simulator needs a secure sign-in/SSO bridge with a short-lived, server-verifiable exchange or first-party session. Do **not** place a long-lived bearer token in the redirect query string, log it, or pass it between origins via localStorage.
- The backend, not the frontend, verifies effective Premium including active native RevenueCat, web Stripe, manual/legacy grants and revocations. `premium_access` is the native learner entitlement; `instructor_subscription` is separate.
- Authentication and permission checks for each account and instructor must be enforced server-side. Do not share access merely because email addresses match.
- Mark instructor-initiated temporary trials separately from purchased/granted Premium until a product policy explicitly approves unlimited VR for those trial accounts. The Practical backend's `is_effectively_premium` includes certain 7-day trials; that must not silently alter the commercial simulator benefit without a documented rule.
- Test login and existing membership on iOS, Android, practical web and simulator. A user buying on web should not have to request manual enablement on mobile; failures should be fixed in entitlement reconciliation.

## 3. Account-owned progress data, not device-owned progress

The **shared backend** must hold account-scoped progress and related records as the durable source of truth. Each client can use an offline cache, but browser storage or a single phone cannot be the only copy of a signed-in learner's achievements.

| Data category | Owner and storage | Mobility rule |
| --- | --- | --- |
| Account, linked identity, Premium grants, pass balances | Authenticated backend account and verified purchase ledger | Same entitlement and remaining balance on all devices |
| Practical scenario attempts, progression and faults | Existing backend progression/attempt system, keyed to canonical `user_id` and unique `attempt_id` | Mobile ⇄ practical web; no lost or duplicated attempts |
| Practical points, badges, streaks, weak areas, practice plan and lessons | Backend sources, reconciled from underlying events | Follow the account; preserve timestamps and histories |
| Simulator exercises, findings, driving mode, outcomes and retries | **New server-backed simulator attempt store**, separately namespaced, canonical `user_id` | Phone VR ⇄ web/desktop; results visible when re-authenticated |
| VR prepaid credits, consumption, refunds | Existing or new secure VR wallet/payment backend | Keep independently of Practical Premium; atomic idempotent deduction for non-Premium sessions only |
| Instructor assignments, bookings and learner reports | Account-owned and instructor-authorized backend records | Learner keeps history when changing instructor; prior instructor's access can be revoked |
| Guest/anonymous progress | Local to the device until user authenticates and voluntarily merges | Not guaranteed to transfer until safely attached to canonical account |

**Never** feed simulator `AttemptResult` directly into practical `/api/progression/attempt`: they have different scoring schemas, scenario IDs and progression semantics. Maintain separate attempt tables/collections or a versioned `product` namespace; a unified learner dashboard can aggregate both without falsely marking practical scenarios passed. Simulator attempts should include an immutable server-assigned or globally unique idempotency ID, `user_id`, scenario/route ID, stable rubric version, mode, outcome, findings, duration, timestamps and sync status. Keep personal data minimal.

## 4. Synchronisation and offline operation

1. On sign-in, authenticate canonical account and load authoritative access/progress from the shared backend.
2. After a completed session, save an attempt locally **and queue a server upload**. Reuse the same attempt ID on retry after network failure; server inserts/merges idempotently.
3. Offline or unreliable connectivity: show cached progress and queue results. On reconnect, flush only to the same authenticated account. Do not overwrite newer server data with stale device caches.
4. On a second device, fetch server records; results completed on device A should appear on device B after sync, without any manual export/import.
5. Server computes or reconciles counters/derived progression; do not resolve conflicts by blindly taking the latest device summary or highest level. Merge evidence first, then derive status.
6. When a user switches accounts, clear or isolate caches by authenticated `user_id` and backend origin; never show the previous learner's attempts, payments or Premium.
7. Provide visible sync health (`saved`, `syncing`, `offline — queued`, `retry needed`) and an explicit retry mechanism. Do not claim 'saved to account' when data exists only in IndexedDB.
8. For user-initiated account deletion/export, make sure Practical and simulator stores are included in their respective privacy/deletion and portability workflows.

## 5. Existing user migration, cutover and transferability

The old **installed mobile app has used a different backend**, and the existing shared-backend import is a **snapshot**, not an ongoing real-time feed. A rebuilt mobile app does not automatically migrate old backend data or locally queued attempts.

Before cutover:
- Determine which source and version are actually deployed for mobile and web; run a read-only audit of account count, Premium sources, assignments and attempt IDs.
- Perform **one final reconciled export immediately before production cutover**, beyond the 10 November 2026 snapshot, to capture newer users, paid status, progress, points, badges, streaks, lessons, instructor assignments, bookings and permitted support records.
- Preserve original canonical IDs, mobile RevenueCat identity mapping, transaction references and timestamps. Exclude passwords, user sessions, OAuth state, nonces, private tokens, secrets and sensitive unrelated records.
- Import and reconcile with deduplication and record-level conflict rules: **do not replace newer history**, delete valid manual grants, or overwrite a recent revocation with a stale Premium flag.
- Build and release native iOS/Android versions that point to the **same production backend as practical web**, with login/Premium and two-way progress checks on real devices before distribution.
- Old installed app versions may continue writing to the old backend. Use an approved minimum-version/update gate or controlled bridge so they cannot silently fork progress after cutover; keep source backups and a rollback plan.
- RevenueCat sync is **not progress sync**. Confirm purchases and attempts independently.

**Instructor portability:** progress belongs to the learner and remains after disconnecting from an instructor. Require permission to share reports with a new instructor; stop the previous instructor viewing newly protected learner data when access ends. Preserve legitimate historical audit/booking records according to the retention policy.

**Device portability:** users must retain account-backed progress when changing phones, reinstalling the app, clearing browser storage or moving from desktop to phone VR. Guest/local-only results are explicitly excluded until attached securely to an authenticated account.

## 6. What the inspected code already contains (NOT live proof)

**Practical app** (`RealAyd/Driving-Practice`, `feature/practical-website-preview`):
- `backend/auth.py`: canonical `user_id`, `GET /api/auth/me`, backend Premium state and 7-day instructor trial logic.
- `backend/progression.py`: `POST /api/progression/attempt`, `GET /api/progression/state`, `POST /api/progression/merge`, attempt idempotency.
- `frontend/src/progression/progressionRepository.ts`: account-scoped local cache and queued outbound attempts with server refresh when signed in.
- `backend/web_access.py`: combines valid web and native-related Premium signals, with source-specific limitations to verify against production.
- `docs/mobile-shared-backend-cutover.md`: earlier mobile migration and launch work. Its 12 November 2026 status says snapshot imported but native production sync and two-device cutover **not yet proven**.

**Simulator** (`RealAyd/driving-simulator-vr`, `rebuild/3d-judgement-simulator`):
- `src/storage/attempts.ts` saves simulator results to browser IndexedDB or volatile memory. **No verified account-backed cloud sync or transfer to another browser/device.**
- `src/contracts/assessment.ts` defines simulator-specific assessment output distinct from Practical progression.
- `src/app/main.ts` saves completed simulator attempts locally.
- `docs/SHARED-PREMIUM-ACCESS.md` specifies unlimited VR simulations for effective Premium members, but shared authentication/verification is not verified live.

Do not assume a separate legacy VR production payment backend is absent simply because this reconstruction branch is frontend-heavy. Discover its deployed payment service and reuse it rather than creating duplicate transactions.

## 7. Build order and gates

**Phase A — shared identity and backend:** verify deployed service/branch and production database; complete correct account linkage; migrate and reconcile existing mobile users; implement tested access checks from server; web and mobile must use the same backend.

**Phase B — Practical two-way sync:** prepare new native builds; verify both directions (iOS ⇄ web, Android ⇄ web), restores, grants, points/badges, account switching, offline queue, conflict resolution and instructor records. No launch until real-device tests pass.

**Phase C — simulator integration:** add account sign-in and server-verified unlimited Premium gate; use existing paid VR passes for non-Premium. Introduce simulator attempt endpoints, ownership and offline sync; retrieve history on second device. Avoid deducting VR credits for Premium sessions.

**Phase D — cutover and portability:** final source-data reconciliation, controlled native release, legacy-client management, account export/deletion and progress portability, rollback. Announce claims only after end-to-end tests.

## 8. Required acceptance tests

- [ ] Existing iOS Premium account signs in on practical web and simulator; Premium is recognised with no repurchase and unlimited simulator sessions.
- [ ] Existing Android Premium works similarly.
- [ ] Valid web-purchased Premium becomes recognised on mobile and simulator under the **same canonical account**.
- [ ] A valid manually granted Premium membership works on all platforms. Revoke only its own grant when appropriate.
- [ ] Non-Premium VR pass remains usable and deductible as specified; another VR purchase is not demanded while qualifying Premium remains active.
- [ ] Practical attempt on phone appears on web with same result/points, and web attempt appears on phone; no duplicate on retry.
- [ ] Simulator attempt on phone viewer appears on simulator desktop and back; not miscounted as Practical progression.
- [ ] Offline attempts survive process restart and sync once when network returns.
- [ ] Switching accounts, changing instructor, reinstalling app and using a clean browser do not leak or erase another account's data.
- [ ] Old mobile-version cutover does not fork progress after migration.
- [ ] Results/records export, data deletion, refund, subscription expiry and restoring purchases behave according to source-specific entitlements.
- [ ] No sensitive keys, customer lists or long-lived tokens are committed to public code or transmitted in login redirects.

**Next for builder:** Report exact deployed backend(s), database migrations, authentication bridge, simulator attempt API, payment service, test account and staging URLs, and a pass/fail record for the above. Do **not** claim shared progress is working based only on a local screenshot or a single-platform successful login.
