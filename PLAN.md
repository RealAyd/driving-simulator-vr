# Simulator staging plan

- [x] Inspect assets/batch-a and preview workflow; backend already exists.
- [x] Implement same-origin static/API serving with cache/MIME/gzip handling.
- [x] Prepare Node 22 Dockerfile and isolated Hostless configuration.
- [x] Verify frontend/backend build and 28 backend/hosting tests locally.
- [x] Verify all 28 backend/hosting tests on Node 22.23.4.
- [x] Verify Hostless API access to RealAyd's default project.
- [ ] Verify container deployment.
- [x] Create isolated Hostless MongoDB instance (RUNNING/HEALTHY, 2 GiB).
- [ ] Create simulator app, logical database and scoped database user.
- [x] Implement manual source_ref deployment workflow in preview repository.
- [ ] Resolve runner error: Missing environment secrets: RESEND_API_KEY.
- [ ] Configure owner-supplied Stripe test, Resend, admin and optional OAuth access.
- [ ] Configure new staging DNS and verify complete account/payment flows.

See docs/HOSTLESS_STAGING.md for the owner checklist and exact remaining steps.
