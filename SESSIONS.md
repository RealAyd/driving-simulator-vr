# Sessions

## 2026-10-23: staging preparation while owner sources access

Cloned simulator assets/batch-a at deca126 and inspected the preview repository.
The accounts/payments backend has landed; Payment Links are still blank.
Created local infrastructure/hostless-staging branch. Implemented same-origin
static hosting, Node 22 Docker packaging and Hostless resource/health settings.
Frontend typecheck/build and backend typecheck/build passed on Node 24.19.0.
All 28 tests across four server test files passed, including five new hosting
tests for API body preservation, caching, MIME, gzip, HEAD and file isolation.
No external resources, DNS, payments, email or existing deployments changed.
Owner access checklist and remaining deployment work: docs/HOSTLESS_STAGING.md.

Follow-up verification: all 28 backend/hosting tests also pass on Node 22.23.4.
Authenticated GET https://api.hostless.cloud/v1/projects succeeded and confirmed
the existing default project 6ac5392e4b1c266c8f3f9f1b. No new Hostless account or
replacement Codex token is needed. Container build/run remains unverified.

## 2026-10-23: deployment wiring after owner saved GitHub secrets

Merged source commit d4da039 into infrastructure/hostless-staging. Added explicit
gate=true access.json generation to Docker packaging. Owner confirmed the keys
are in GitHub environment github-pages (24581186593), DNS is Namecheap and admin
email is dosumuaybamo1@gmail.com. Secret-name listing returns GitHub HTTP 403,
so Actions checks required names without printing values.

Created isolated Hostless Mongo instance dp-sim-staging, id
6adbe06836e6999aa2a99239, Mongo 7.0, 0.2 CPU / 512 MB / 2 GiB. It reports RUNNING
and HEALTHY. Logical database/user creation is delegated to the GitHub runner,
which can use Mongo TCP without this environment's restricted TCP networking.

Published manual hostless-staging.yml and hosting scripts in preview repo main,
commit 5762b1d. The workflow builds source_ref and publishes immutable build
content with provenance to the separate hostless-staging-release branch, then
configures/deploys the new app. No existing Pages workflow is changed.
First run: https://github.com/RealAyd/driving-practice-preview/actions/runs/40034622191
The updated source build and 23 upstream server tests passed locally. Workflow
lint and JavaScript syntax checks passed. Hosted result remains pending.

Owner is supplying test Payment Links. Resend currently has another verified
domain: the new key does not verify drivingpractice.live. Owner needs to add
Resend's records at Namecheap before email delivery can be verified.

First Actions run failed because checkout treated abbreviated commit d4da039
as a branch. Added full-SHA resolution and reran:
https://github.com/RealAyd/driving-practice-preview/actions/runs/40034741800
Checkout/setup passed. Secret check confirmed HOSTLESS_TOKEN and
STRIPE_SECRET_KEY are available, but failed with exactly:
`Missing environment secrets: RESEND_API_KEY`.
Asked owner to add that exact name or supply its current name (never value).
The workflow stopped before release publication, app creation or Mongo user
provisioning. No hosted backend health claim is made.

## Successful hosted staging startup

After mapping GitHub secret RESEND to runtime RESEND_API_KEY and the owner
updating STRIPE_SECRET_KEY to a test key, Actions run 40036203680 succeeded.
https://github.com/RealAyd/driving-practice-preview/actions/runs/40036203680
Created dp-sim-staging app with a scoped Mongo readWrite user for dp_sim_staging.
Verified health HTTP 200, gate=true, devCheckout=false and exact source d4da039.
URL: https://dp-sim-staging.hostless.app
Hostless deployment: 6adbe4fe9600443a5d3b1fff.
Added staging.drivingpractice.live as custom domain (DNS Pending); no DNS edits.
Remaining: configure four supplied test Payment Links and Starter mode quotas,
verify Resend domain, configure custom DNS and verify webhook/payment/email flows.
