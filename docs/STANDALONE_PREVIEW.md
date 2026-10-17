# Standalone iPhone staging

Production is not a deployment target of this workflow.

## Prepared deployment

Create the public repository `RealAyd/driving-practice-preview`. Copy
`.github/workflows/standalone-preview.yml` from this branch into the same
path on that repository's default `main` branch. The staging repository
needs only this workflow and a README, not a duplicate simulator checkout.

In staging Settings → Pages, select **GitHub Actions** as the source.
Run **Standalone iPhone preview** in staging Actions (or push its workflow).
It builds the latest public `rebuild/3d-judgement-simulator` source and deploys
to https://realayd.github.io/driving-practice-preview/ .

For subsequent updates, run the staging workflow again. Source pushes
build an artifact in this repository but do not trigger a cross-repository
deployment. No personal access token is needed.

Do not configure a custom domain. The workflow removes any inherited CNAME.
Build provenance is at `build-info.json` on the staging site.
This repository's production Pages configuration is never modified.

## iPhone test

Open the staging HTTPS URL directly in Safari, outside the Claude frame.
Select Tilt and grant motion/orientation permission when requested by the
app. Check landscape steering direction, neutral position, recentering,
sensitivity, and that controls release on pause or app switching.
Record iOS version and build-info commit. A successful simulated-input test
does not establish real sensor access or phone-viewer VR support.

## Current limits

This adds hosting infrastructure only. It does not change the simulator's
existing tilt permission UI, cockpit, exercises, or phone-VR implementation.
If tilt still fails when opened directly, inspect actual permission errors
and real event delivery before attributing the failure to the hardware.
