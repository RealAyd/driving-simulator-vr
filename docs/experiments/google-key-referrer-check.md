# Google browser key: existing configuration and referrer validation

Checked 2026-10-18. The *unmodified* legacy `index.html` on `main` contains **one** browser-format Google API key. It is already referenced by `GOOGLE_MAPS_API_KEY`, `TILES_ROOT_URL=https://tile.googleapis.com/v1/3dtiles/root.json`, and `GoogleCloudAuthPlugin`. Do not paste this key into any tracked file or documentation or print it from scripts.

## Test limitation

Finding a credential in source does not establish which APIs or website referrers its Google Cloud Console restrictions permit. No experiment preview has been deployed, so no browser-origin request has been performed. Never claim a successful Map Tiles API response based on this audit alone.

## Deploy with minimal exposure

Prefer placing the existing key in an environment-managed secret named `GOOGLE_MAPS_BROWSER_KEY`, accessible to *only* the isolated deployment. A browser API key ultimately appears in browser network requests (it is not a server secret); enforce Google Cloud Console HTTP referrer and API restrictions. Do not check generated assets containing the key into Git or publish source maps with injected credentials. For a restricted browser key use client-side requests from the actual HTTPS preview, not CI curl / a server-side probe: the latter does not establish website-referrer compatibility. Avoid printing URLs with `key=` in error telemetry.

The legacy key is already committed publicly on main. If unrestricted, review exposure/usage and arrange a controlled key rotation rather than treating it as private merely because it is not printed in this experiment.

## Proposed separately deployed GitHub Pages address

If a **new** Pages repository `RealAyd/driving-practice-tiles-experiment` is explicitly created, the URL would be `https://realayd.github.io/driving-practice-tiles-experiment/` and the desired HTTP referrer is `https://realayd.github.io/driving-practice-tiles-experiment/*`. **Neither repository nor URL is confirmed to exist.** Google/browser policies may reduce the Referer to origin only; if requests fail with pathname-specific rules, the broader `https://realayd.github.io/*` referrer permits the existing Pages host too (including the current preview). A *dedicated subdomain* is preferable if tighter security is needed. Add a new referrer: NEVER replace existing authorised referrers.

In Google Cloud Console > APIs & Services > Credentials > browser key:
- Application restrictions: Websites (HTTP referrers), add the final actual preview URL pattern and preserve all existing entries.
- API restrictions: if 'Restrict key' is selected, include **Map Tiles API** and **Maps JavaScript API** alongside any APIs already authorised. Keep previously required APIs.
- Verify billing, enabled API, quotas and restriction error messages in the Cloud Console; do not alter billing or quotas without authorisation.

## Browser acceptance procedure

Load the actual isolated HTTPS experiment URL. In DevTools Network, filter to `tile.googleapis.com`; inspect requests **without sharing full request URLs** (they contain the key). Verify root `/v1/3dtiles/root.json` returns 200, that subsequent requests succeed, and that rendered 3D geometry appears in the Babylon scene. Record only response status, sanitized error body, count/bytes and origin. HTTP 403 with `API_KEY_HTTP_REFERRER_BLOCKED` means website restrictions; `API_KEY_SERVICE_BLOCKED` indicates API restriction; other 403 conditions require examining the redacted error. A 200 response does not alone establish tile placement, performance or licence compliance.

Google's required logo and dynamically aggregated `asset.copyright` data must display on the rendered tiles in normal and stereo views. No caching/prefetching outside Google's permitted HTTP caching.

References:
https://developers.google.com/maps/documentation/tile/create-renderer
https://developers.google.com/maps/documentation/tile/policies
