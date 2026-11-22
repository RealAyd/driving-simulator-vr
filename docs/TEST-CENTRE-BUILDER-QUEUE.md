# Request my test centre → simulator builder queue

**Integration contract, 22 November 2026. Planned for simulator phase after mobile/web cutover. NOT a deployed API or live builder permission.**

## Actual existing source

Private repo: `RealAyd/Driving-Practice`, `backend/test_routes.py`.

- Learner/visitor submits centre name, town/city, optional message/feature suggestion via `POST /api/test-routes/request-centre`.
- The backend records requests in `test_centre_requests` with one request per requester/normalized centre. Premium, Free and anonymous callers are permitted.
- Existing `GET /api/admin/test-routes/centre-requests` groups demand, but exposes requester email, town/city, free-text messages, feature suggestions, tier and timestamps. It is **admin-only**. **Do not** use this as a public builder feed or distribute an admin bearer token.
- The existing grouping normalizes centre-name suffixes, but a builder queue must also respect town/city to avoid combining distinct centres with identical names.

## Owner's goal

The authorized simulator builder should see **new centre demand as it arrives**, pick up requested centres, build grounded simulator scenarios/route sets, and report their development/review status. The original form remains the input; **no duplicate form or separate learner account**. No automatic route publishing or fabricated official DVSA routes.

## Proposed minimal read-only feed

Endpoint name below is a **proposed contract, not a confirmed working URL**:
`GET /api/builder/test-centre-demand?status=new&updated_since=<ISO_TIMESTAMP>&limit=100&cursor=<opaque>`

Use server-to-server service identity with **read-only scope** `centre_requests:read_aggregate`, or an equivalent explicit builder role. Authentication is mandatory. No unauthenticated/public HTML JSON and no broad admin role. A builder agent cannot access this feed without an approved connection and independently configured credentials — documentation alone cannot grant access.

Example **synthetic** response shape:

```json
{
  "items": [
    {
      "centre_request_group_id": "centre:london:wanstead",
      "centre_name": "Wanstead",
      "town_city": "London",
      "unique_request_count": 12,
      "first_requested_at": "2026-11-10T09:00:00Z",
      "last_requested_at": "2026-11-22T12:00:00Z",
      "status": "new",
      "assigned_work_ref": null,
      "updated_at": "2026-11-22T12:00:00Z"
    }
  ],
  "next_cursor": null
}
```

**Privacy:**
- Only sanitized centre, city, aggregated unique demand and workflow status. Never include `user_email`, `user_id`, `requester_key`, anonymous device identifiers or unreviewed messages/feature suggestions.
- Explicitly consider low-count / unusual requests, abuse, injection via centre-name fields and privacy; escaped names and normalized names must be treated as untrusted data.
- Do not publicly expose the private feed in `docs/`, GitHub Actions logs, CDN assets or repo issues.
- Paginate; don't leak the full existing admin demand list.

## Builder workflow / status ownership

1. `new`: created by grouped incoming requests; new demand updates `last_requested_at` and `unique_request_count` without resetting completed work.
2. `triaged`: authorized builder accepts valid location, merges spelling variants, verifies test centre actually exists; rejects invalid or duplicate requests with reason retained privately.
3. `claimed`: authorized builder claims the centre atomically with an idempotent claim/update operation; prevent competing agents claiming same centre blindly.
4. `building`: develop geographically sourced routes and meaningful judgement scenarios using simulator's content schema; do not claim a fabricated route is an official test route.
5. `review`: record commit/PR, reviewed geometry and scenario tests; require owner approval before release.
6. `published`: owner-approved simulator content becomes available according to the appropriate Premium-first challenge and general release rules.
7. `rejected`: non-existent, abusive or unbuildable centre, with internal reasons and scope to reopen.

**Writes must be separate** from read access: proposed `centre_requests:claim` and `centre_requests:status_write` scopes under review with audit history, optimistic locking, rate limits and owner controls. Do not grant database writes because the builder can read aggregated demand.

**Not every submission is a promise of new simulation content.** Prioritize by legitimate demand and feasibility, and let the owner approve release.

## Integration acceptance

- [ ] Existing mobile/web “Request my test centre” submission appears once in authorized builder feed without requester identity.
- [ ] Same centre submitted by multiple legitimate people increases unique requester count; wrong-town centres do not merge.
- [ ] New request is discoverable incrementally (poll/cursor) without full export or duplicate work.
- [ ] Builder claims and records status; unauthorized caller cannot read/claim; role-scoped error handling works.
- [ ] Existing admin endpoint still works for owner but is never exposed to simulator browser.
- [ ] Claimed/building centre produces a source-grounded scenario/route candidate, with owner review before publication.
- [ ] Queue appears in phase 2 of release; migration-only phase 1 does not change request form or checkout.

**Owner action only when integration is ready:** approve a dedicated restricted builder identity/service credential in the private backend hosting platform. Enter credentials directly in the appropriate secure connection/secret setting, never in GitHub or chat. A builder agent still needs an installed connector or tool capable of authenticating to that backend; otherwise it cannot automatically fetch the queue.
