# Tiles experiment: isolated HTTPS preview

Status: **build and workflow ready; not deployed.** This session could not create a GitHub
repository (`POST /user/repos` returned 403 "Resource not accessible by integration").

The preview is a separate GitHub Pages site, so production (`vr.drivingpractice.live`) and the
existing staging preview (`realayd.github.io/driving-practice-preview`) are not touched.

## One-time setup (repository owner)

1. Create an **empty public** repository `RealAyd/driving-practice-tiles-experiment`
   (public: free Pages; it will only hold a README and the workflow).
2. Settings → Pages → Build and deployment → Source: **GitHub Actions**.
3. Copy `.github/workflows/tiles-experiment-preview.yml` from this branch into the same path on
   that repository's `main`. Pushing it starts the build. Alternatively, let Claude access the
   repository (https://claude.ai/connect-github) and ask it to add the workflow and run it.
4. Optional: add a repository secret `GOOGLE_MAPS_BROWSER_KEY` with an appropriately restricted
   browser key. Without it, the workflow reuses the existing key from the legacy page on `main`
   (masked in logs; it ends up in the built JavaScript, as any browser key does).
5. If the key is given website restrictions, **add** (do not replace)
   `https://realayd.github.io/driving-practice-tiles-experiment/*`.

The workflow builds `experiment/babylon-photorealistic-tiles`, writes `build-info.json` with the
source commit, removes source maps, and deploys. Re-run it from that repository's Actions tab after
new commits.

## On the iPhone

Open https://realayd.github.io/driving-practice-tiles-experiment/ directly in Safari.

1. On the menu, check **About this build**: the commit should match `build-info.json` and the branch.
2. Scenery (experiment): **Constructed** first. Brentwood mini-roundabouts, Start, look around, drive.
   Note fps (top right) and About → Performance.
3. Back to the menu: **Google photorealistic tiles**. The page reloads; start Brentwood again. Wait
   until the view stops sharpening (about 30 s on desktop). The Google logo and credits should be at the
   bottom left. Repeat the same look, mirror views and drive.
4. Repeat with **Google tiles + our road surface**.
5. Record for each: iOS version, fps while parked and driving, About → Scenery line (requests, MB),
   whether Safari reloaded the page (memory), and any heat or battery notes.

Each tile-mode page load is one billable root tileset request.
