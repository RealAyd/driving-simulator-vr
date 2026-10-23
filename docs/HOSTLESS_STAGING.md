# Hostless simulator staging

Prepared 2026-10-23 from assets/batch-a at deca126dc64d56d748032dd01cfd0ae97ab7ffee.
Infrastructure branch: infrastructure/hostless-staging.

## Architecture and prepared work

The server has already landed. One Hostless Node app will serve dist-sim at /
and the existing API at /api/*, with /healthz for health checks. This avoids
depending on undocumented static-site proxy rules. App compute serves assets;
Hostless Sites CDN caching is not assumed for this deployment.

Dockerfile.hostless builds the frontend and server using Node 22, removes CNAME,
and runs as the node user. Select hostless.staging.yaml as the Hostless config
path. Static serving supplies HTML no-cache, hashed assets immutable for one
year, other files one hour, MIME types, and gzip. API responses stay no-store.

Local frontend/backend compilation and 28 backend/hosting tests pass. These
checks initially ran on Node 24; Node 22 verification is recorded in SESSIONS.md.
No real database, payment, email, browser or Hostless deployment test is implied.
Docker image execution and hosted headers still need verification.

## Owner checklist

Public information may be shared in chat. Put private keys in Codex secret
settings for agent access, or directly in the new staging app's Hostless env.
Do not put keys in source files, chat, issues or PR comments. Provider setup
access and runtime keys are separate; sending-only/read-only keys cannot
necessarily configure domains or webhook endpoints.

- DNS provider for drivingpractice.live, and access to add staging/Resend
  records, or willingness to apply the exact records supplied. Report existing
  email provider so its mail records are preserved.
- ADMIN_EMAILS: comma-separated administrator email addresses.
- Existing TEST Stripe Payment Link URLs and which pack each unlocks. Current
  server/packs.json has three empty links: starter (3 sessions, GBP2.99),
  pack-10 (10, GBP7.99), pack-25 (25, GBP14.99). Confirm against actual products.
  Do not create replacement products/prices or use live links for staging.
- STRIPE_SECRET_KEY: test restricted read key for Payment Links, Checkout
  Sessions, Prices, Products, Charges, Refunds and Disputes. A restricted test
  key normally starts rk_test_; a standard test key starts sk_test_.
- Stripe webhook-management access, or owner creates the new endpoint after
  staging URL is confirmed and stores its STRIPE_WEBHOOK_SECRET securely.
  Events: checkout.session.completed, checkout.session.async_payment_succeeded,
  checkout.session.async_payment_failed, charge.refunded, charge.dispute.created.
- RESEND_API_KEY: sending-only key scoped to verified sending domain. Also
  Resend domain-setup access or the verification DNS records supplied by owner.
  If using a mail subdomain, EMAIL_FROM must match that verified domain.
- Owner checks delivery of the eventual test email at support.drivingpractice@gmail.com.
- GitHub Actions secret HOSTLESS_TOKEN in RealAyd/driving-practice-preview,
  scoped to the deployment operations. The Codex proxy-backed placeholder is
  not a portable API key. Do not copy it into Actions.
- If cross-repo source checkout is private and inaccessible with GITHUB_TOKEN,
  provide a narrowly scoped source-read GitHub App token/PAT via Actions secret;
  verify need before requesting a new credential.
- Optional Google sign-in: Web OAuth client ID and ability to add the exact
  staging URL as an authorized JavaScript origin. No Google client secret is
  required by the current ID-token verification implementation.
- Optional Apple web sign-in: Services ID, enabled Sign in with Apple and
  configured staging domain/return URL /api/auth/apple/callback. A native iOS
  bundle ID alone is insufficient. Review provider flow before enabling it.

## Agent-owned tasks still pending

1. Verify current Hostless default project/API access, inspect existing resources,
   create isolated simulator staging app and new Mongo instance/database.
2. Create logical database dp_sim_staging and restricted readWrite user; inject
   MONGODB_URI securely. Do not reuse DriveTest UK resources or credentials.
3. Generate SESSION_SECRET (48 random bytes, base64) and set APP_BASE_URL,
   EMAIL_FROM, EMAIL_REPLY_TO and supplied runtime settings.
4. Prepare cross-repo .github/workflows/hostless-staging.yml in
   RealAyd/driving-practice-preview, manual source_ref input, immutable commit
   provenance, test/build, deployment and health verification. Not implemented yet.
5. Configure staging DNS, Stripe test webhook and Resend verification when access
   is ready. Preserve vr.drivingpractice.live and existing mail records.
6. Verify real database writes, email sign-in, session cookies on iPhone Safari,
   Stripe test purchase/refund event handling, caching/compression and rollback.

Do not deploy DP_DEV_FAKES=1. Existing GitHub Pages, experimental tiles site,
DriveTest UK backend/database, native Routes app and existing webhooks remain
outside this staging setup.
