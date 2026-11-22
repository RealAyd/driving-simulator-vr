# Driving Practice — shared accounts, migration and simulator integration

**Owner-approved scope, 22 November 2026. Specification only; not a live-access or migration-completion claim.**

## 1. Products, identity and the approved release order

**Products:** Driving Practice practical mobile app (iOS/Android), Practical Driving Practice web app (`app.drivingpractice.live`), VR judgement simulator (`vr.drivingpractice.live`), and the separate **Driving Practice Theory App**. The paid upgrade in the theory product is always named **Theory Premium**. Do not use the retired product name “Theory Ready.”

**Release sequence — strict:**

1. **Shared accounts + practical mobile/web migration first.** Confirm real deployed mobile/web source and backend, final reconciliation, shared learner identity, Premium and Practical progress. This cutover release contains **migration work only**: NO paywall, banner, pricing, checkout offer, promotional copy or unrelated UI change in the same binary/deployment.
2. **Simulator integration second.** Reuse account identity for unlimited Premium simulations, give eligible Practical Premium learners first access to new simulator challenges, and provide the simulator builder a **restricted shared work queue** for “Request my test centre.” Preserve non-Premium VR pass purchases.
3. **One end-to-end validation third**, on real iOS and Android devices plus practical web and simulator. No public claim that shared accounts, access or progress are available until acceptance evidence passes.

Phased releases and rollbacks are part of step 1, not a fourth feature release. Keep the old backend **intact and available** until reconciliation passes.

## 2. Shared account and access policy

- One canonical authenticated learner `user_id` for Practical mobile, Practical web and simulator. Keep the original `revenuecat_app_user_id` alias linked; never merge accounts based only on matching email.
- Verified learner **Practical Premium** from eligible iOS/Android purchase, web purchase, valid manual grant or legacy grant must work in **both Practical clients** and unlock **unlimited simulator training sessions** while active. Do not deduct VR credits or demand another VR pass. If web Premium is not recognised on mobile, treat it as a sync defect.
- **Instructor accounts:** instructors may use the Practical mobile app's instructor features for free, but **instructor role, instructor subscription or free instructor-app access never gives free simulator access**. An instructor who separately owns verified learner Practical Premium or a purchased VR pass is evaluated under that independent purchase; never grant simulator credits merely for being an instructor.
- Non-Premium visitors may use verified prepaid VR passes. Keep VR credit balances and refunds independent of Practical Premium. Cancel/refund only the specific source's benefit; another valid grant remains valid.
- **Driving Practice Theory App / Theory Premium** is a separate entitlement and does not unlock Practical Premium or simulator sessions.
- Do not automatically treat an instructor-initiated temporary trial as paid learner Premium for VR; distinguish it from independently purchased/granted Premium and settle eligibility before implementing a trial path.
- VR cross-origin login needs secure, verified identity exchange. No long-lived session tokens in URLs, public frontend storage shared across origins, or copied customer databases.

## 3. What progress is shared — and what is explicitly deferred

| Item | Approved storage | Transferability |
| --- | --- | --- |
| Account identity, learner Practical Premium, verified grant sources | One authenticated backend | Same account and valid access across iOS/Android/Practical web; simulator queries eligibility securely |
| Practical attempts, decisions, progression, points, badges, streaks, plans and instructor-authorized records | Shared Practical backend, account-owned | **Mobile ⇄ Practical web** after cutover; offline queue and idempotent attempt uploads |
| VR simulator assessment results, scenario attempts and local replay history | **Existing local device/browser IndexedDB**, or current local fallback | **DO NOT add cloud storage or cross-device sync in this scope.** Show exactly **“Saved on this device”** when persisted locally; do not claim cross-device history |
| VR passes, balances and spend ledger | Secure existing VR payment/wallet backend (not simulator result storage) | Account-bound payment rights as already implemented/verified; idempotent spending for non-Premium |
| Simulator challenge eligibility and test-centre builder queue | Secure server entitlement/queue service | Shared *access/workflow*, NOT shared simulator progress |
| Driving Practice Theory App and Theory Premium | Separate theory app/account-entitlement system | No implied shared Premium or practical progress |

**Explicitly deferred:** simulator cloud attempt/progress storage, simulator cross-device progress transfer, simulator sync-status UI, simulator offline-to-cloud upload, any combined Practical/VR dashboard. Do not put these in the mobile migration or simulator integration release. A simulator attempt on device A does **not** appear automatically on device B. Don't imply that replacing a phone transfers local simulator results.

**Local save label:** show **“Saved on this device”** only when the local write succeeds. If IndexedDB is unavailable and results are temporary/in-memory, display a truthful alternative, e.g. **“Not saved — this session only.”** Distinguish visitor storage from account-backed Practical progress.

Never upload simulator-specific assessment output into Practical `/api/progression/attempt` or count VR results as passed Practical scenarios. Their rubrics and progression schemes are separate.

## 4. Premium-first simulator challenges

**Owner's rule:** new simulator **challenges open first to verified learner Practical Premium members**. This is a **staged content release**, not a grant to instructors. Premium users get the first access window; a later rollout to VR-pass users or others requires the owner's release decision.

- Challenge eligibility is separate from normal simulator exercise access. Check verified Practical Premium and approved challenge availability on the server.
- Do not bypass an independently required challenge entry condition or invent prize/competition rules. “Unlimited simulator sessions” does not by itself set prizes, entry fees or replay rules for a competition.
- Assign each challenge a release state (e.g. `premium_early`, `general_release`, `closed`), with owner-controlled transition dates; do not invent a release duration.
- **No free instructor challenge access** solely from their instructor role or free mobile app.
- If the challenge UI/backend is not present in the inspected rebuild, implement it in **simulator phase**, not the migration-only cutover.

## 5. Shared “Request my test centre” builder queue

The Practical app already provides a public `POST /api/test-routes/request-centre` form; the original backend stores data in `test_centre_requests`. There is an **admin-only** `GET /api/admin/test-routes/centre-requests` endpoint that includes requester emails, notes, and tiers. **Never expose or reuse that full admin response in the public simulator or give the simulator builder a broad admin token.**

After the migration cutover, create an **authenticated, least-privilege, read-only work queue/feed** the simulator builder can retrieve on demand or poll. It must expose only necessary data, aggregated by verified test centre **and town/city**:
- `centre_request_group_id`, normalized centre display name, town/city, number of unique requesters, first/last request dates, request status and assigned build reference.
- States: `new`, `triaged`, `claimed`, `building`, `review`, `published`, `rejected` (or an agreed compatible workflow), with timestamps and idempotent claim transitions.
- Stable cursor or `updated_since` filter so builders can **pick up new requests** without downloading the entire history.
- No requester email, name, `user_id`, device ID, token, unreviewed free-text message or other PII. Do not publish the private queue in GitHub Pages, public static JSON or unrestricted endpoints.
- Claim/assignment and publication actions must be **separately authorized**. Reading demand cannot grant database admin access or publish scenarios. Owner/instructor permissions stay unchanged.
- Request volume is demand evidence, **not** proof a route is verified or permission to invent a DVSA official route. Builder researches/constructs, tests, and submits candidate scenario routes for owner review.

**Build-phase handover:** [Test-centre demand queue contract](TEST-CENTRE-BUILDER-QUEUE.md) gives schema, permissions and acceptance. The endpoint and authorization are **not verified as deployed**. Do not treat documentation as a working connector.

## 6. Migration-only cutover: prerequisites, exports and reconciliation

**Two backends must be audited:** legacy mobile backend and target Practical web/shared backend. The existing 10 November 2026 snapshot import is insufficient for a final live cutover; recent writes and membership changes must be reconciled.

**Required before AND after the cutover:** owner receives **one full read-only per-account export from EACH backend**, plus a reconciliation report. This means at least **four owner-only exports**: legacy-before, target-before, legacy-after and target-after. Export every account, not only Premium users, including a Premium status and source for each; compare totals by backend and per canonical identity. Never upload customer files to this public GitHub repo.

Suggested fields (when available, otherwise blank with availability flagged): `exported_at_utc`, `backend`, `user_id`, `email`, `revenuecat_app_user_id`, `is_premium`, `effective_premium`, `premium_source`, `rc_premium_active`, `web_premium_active`, `legacy_premium_active`, `manual_grant_status`, `subscription_status`, `premium_expires_at`, `created_at`. The report must show account counts; Premium counts by source (including unknown/unmapped); duplicates; aliases; grants/refunds; missing accounts; mismatched status; and unresolved issues. Validate native purchases independently where necessary.

Use an authenticated owner-only export job/endpoints on each real deployed backend, with no secret tokens in chat; no destructive writes. The existing `/api/admin/users.csv` is a **newsletter export**, not sufficient Premium audit. A draft `PREMIUM-AUDIT-EXPORT` branch/document alone is not evidence that either backend can export. Implement/verify safe exports against the **actual deployed backend code** before cutover. Deliver files to the owner securely, not via public artifacts.

**Cutover-only binary/deployment:** changes limited to backend address, identity mapping, migration-safe auth/progression, reconciliation/observability and associated compatibility fixes. **No** paywall, price, offer, banners, promotional content or simulator challenge UI changes in that release.

**Phased rollout:** confirm actual old/new backend endpoints, branches and databases; back up both; capture signed/account IDs and pre-cutover snapshots; pilot with owner/test users then small cohorts; verify login, native purchases/restore, manual grants and Practical progress each direction with real devices; run legacy and target post-rollout exports/reconciliation; only expand when mismatches are understood. Keep the old backend intact and servicing old versions while active; prevent old clients from silently forking writes by a tested bridge or update/version gate. Do not assume simply changing a Hostless environment variable changes installed mobile binaries.

### Written rollback runbook (must rehearse)

1. **Stop rollout and new migrations**, retain snapshots/logs, leave both backend databases intact.
2. Identify all writes and entitlement changes made on the target since the last reconciled snapshot; **export and preserve them**, including attempts, grants, renewals and refunds.
3. If returning users to the legacy backend, **reconcile/merge those target writes safely first**, without overwriting newer records or revoking a separate valid grant. Do not point users back at stale accounts.
4. Route cohorts back using the **tested rollback app build or routing mechanism**; a compile-time `EXPO_PUBLIC_BACKEND_URL` cannot be reverted remotely inside an installed binary. Ensure a viable prebuilt rollback path before rollout.
5. Re-run owner-only account/Premium exports from both backends, compare deltas and check two-device Practical progress plus sign-in and restore purchases.
6. Resume only after the owner accepts the discrepancy report. Do not delete or retire the old backend until **all** cohorts and account counts reconcile and the rollback window closes.

**Private implementation checklist:** see `RealAyd/Driving-Practice`, `mobile/shared-progress-preparation`, `docs/mobile-shared-backend-cutover.md` and `docs/MIGRATION-PREMIUM-RECONCILIATION.md`.

## 7. Simulator phase — only after migration sign-off

- Securely link simulator sign-in to canonical learner account and verify eligibility without exposing private backend credentials.
- Premium learner: unlimited ordinary simulator sessions and Premium-first challenge access, no credit deduction.
- Non-Premium: retain existing purchased VR passes, their independent balance and refund logic.
- Implement builder's sanitized centre-demand queue and restricted assignment flow from section 5.
- **Do not implement simulator cloud results storage, simulator sync-status UI or combined dashboards.** Retain local results and truthful device-only label.

## 8. One final end-to-end acceptance gate

- [ ] Before-cutover and after-cutover **legacy and target** full account/Premium exports delivered to owner; totals, sources, missing users and mismatches reconciled in writing.
- [ ] Phased native migration uses a release containing **only migration changes**; rollback tested and legacy backend preserved until signed off.
- [ ] Same learner `user_id` and valid Practical Premium on iOS, Android and Practical web; web-to-native purchase recognition and native-to-web recognition checked.
- [ ] Practical attempts, points and owned progress transfer mobile ⇄ Practical web; one replayed attempt never duplicates results.
- [ ] Instructor's free mobile access **does not** unlock VR or Premium-first challenges. Instructor with a separately valid paid learner Premium/VR pass is assessed on that purchase alone.
- [ ] Active learner Premium unlocks unlimited simulator sessions without using VR credits; non-Premium VR passes retain proper purchase/spend rules.
- [ ] New challenge available to verified Practical Premium members first; not accessible to instructor/free accounts by role; general release requires separate owner action.
- [ ] “Request my test centre” produces a sanitized, permission-checked centre-demand item visible to authorized simulator builder; new requests picked up, claim/build/review state tracked, no requester PII leaked.
- [ ] VR results persist only locally and say exactly **“Saved on this device”** after successful local save; no false promise of sync, and truthful message for memory-only fallback.
- [ ] Driving Practice Theory App and **Theory Premium** are named correctly and neither is conflated with learner Practical Premium.
- [ ] Real-device iOS and Android, clean practical web browser and simulator phone/desktop test journey passed. No public shared-access claim before **all applicable tests** pass.

**Status:** documentation updated; **no backend cutover, owner exports, simulator builder queue or production entitlement changes are claimed completed**.
