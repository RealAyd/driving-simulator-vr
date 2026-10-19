#!/usr/bin/env bash
# Batch B corrected car pack (QA v0.3, supplied by the project owner 2026-10-19 as
# Driving_Practice_Batch_B_Corrected_Complete.zip). LICENCE NOT CONFIRMED: the pack README says the
# vehicle source archive came without licence terms, so these build into the git-ignored
# public/assets/licensed/ only, never into the public repository or the public preview.
#
#   tools/assets/build-batch-b-cars.sh /path/to/Driving_Practice_Batch_B_Corrected
#
# Everyday models only (the pack README: compact Mini, BMW saloon, occasional pickup). Per model:
# weld, dedup, join, prune, quantise (glTF-Transform); a parked version is also simplified
# (meshoptimizer, ratio 0.25) for static parked cars.
set -euo pipefail
SRC="${1:?folder with the extracted Batch B corrected pack}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/public/assets/licensed"
TMP="$(mktemp -d)"
mkdir -p "$OUT"
for m in uk_car_03_compact_mini_white uk_car_10_bmw_coupe_silver uk_car_07_pickup_ford_raptor_white; do
  slug="batch-b-$(echo "$m" | tr '_' '-')"
  npx -y @gltf-transform/cli@4.5.1 weld "$SRC/cars_corrected/$m.glb" "$TMP/$slug.1.glb" >/dev/null
  npx -y @gltf-transform/cli@4.5.1 dedup "$TMP/$slug.1.glb" "$TMP/$slug.2.glb" >/dev/null
  npx -y @gltf-transform/cli@4.5.1 prune "$TMP/$slug.2.glb" "$TMP/$slug.3.glb" >/dev/null
  npx -y @gltf-transform/cli@4.5.1 quantize "$TMP/$slug.3.glb" "$OUT/$slug.glb" >/dev/null
  npx -y @gltf-transform/cli@4.5.1 simplify --ratio 0.25 --error 0.004 "$TMP/$slug.3.glb" "$TMP/$slug.4.glb" >/dev/null
  npx -y @gltf-transform/cli@4.5.1 quantize "$TMP/$slug.4.glb" "$OUT/$slug-parked.glb" >/dev/null
  echo "$m -> public/assets/licensed/$slug.glb ($(stat -c %s "$OUT/$slug.glb") bytes), -parked ($(stat -c %s "$OUT/$slug-parked.glb") bytes)"
done
rm -rf "$TMP"
