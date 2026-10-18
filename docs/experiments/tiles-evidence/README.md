# Evidence: tiles experiment (2026-10-18)

Headless Chromium 1280×720, software WebGL (SwiftShader), desktop profile, Brentwood exercise start
(x −29.26, z 19.40, heading 64.4°), 95° horizontal field of view. Not iPhone or headset measurements.

* `driver-*-{constructed,tiles,hybrid}.png`: forward, right door mirror and interior mirror views from the driver's eye.
* `raised-junctions-*.png`: diagnostic camera 28 m up (not a driver view), to show alignment.
* `drive-*.mp4`, `drive-strip.jpg`: 10 s assisted drive through both mini-roundabouts (frames every 0.25 s
  of wall time, so speeds differ between modes; top row of the strip is constructed, bottom is tiles).
* `report-tiles.json`, `report-hybrid.json`: measurements with the final tile cache size (3000).
* `report.json`: the constructed-mode measurements, plus a first tiles/hybrid run with the cache limited
  to 700 tiles (cache full, finer tiles refused); kept to show that failure, not used for the tile figures.
