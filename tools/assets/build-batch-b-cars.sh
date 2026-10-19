#!/usr/bin/env bash
# Batch B corrected car pack (QA v0.3, supplied by the project owner 2026-10-19 as
# Driving_Practice_Batch_B_Corrected_Complete.zip). The owner confirmed on 2026-10-19 that the
# licence allows use in the published app and in this public repository (models mostly generated
# by the owner). The pack itself is not kept in the repository.
#
#   TOOLS=<scratch folder with @gltf-transform/* 4.5.1 and meshoptimizer 0.22.0> tools/assets/build-batch-b-cars.sh /path/to/Driving_Practice_Batch_B_Corrected
#
# Everyday models only (the pack README: compact Mini, BMW saloon). Per model, glTF-Transform 4.5.1:
# weld, dedup, prune; the moving version is simplified to half (meshoptimizer, ratio 0.5) and the
# parked version much further (ratio 0.06, error 0.05, normals dropped so faces can be merged; flat normals are
# rebuilt when parked cars are baked, as for the Quaternius parked cars). Then quantise.
set -euo pipefail
SRC="${1:?folder with the extracted Batch B corrected pack}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/public/assets/models/vehicles"
TMP="$(mktemp -d)"
G="npx -y @gltf-transform/cli@4.5.1"
mkdir -p "$OUT"
cp "$ROOT/tools/assets/simplify.mjs" "${TOOLS:?scratch folder, see above}/"
for pair in "uk_car_03_compact_mini_white:batch-b-compact-hatchback" "uk_car_10_bmw_coupe_silver:batch-b-saloon"; do
  m="${pair%%:*}"; slug="${pair##*:}"
  $G weld "$SRC/cars_corrected/$m.glb" "$TMP/$slug.1.glb" >/dev/null
  $G dedup "$TMP/$slug.1.glb" "$TMP/$slug.2.glb" >/dev/null
  $G prune "$TMP/$slug.2.glb" "$TMP/$slug.3.glb" >/dev/null
  $G simplify --ratio 0.5 --error 0.001 "$TMP/$slug.3.glb" "$TMP/$slug.4.glb" >/dev/null
  $G quantize "$TMP/$slug.4.glb" "$OUT/$slug.glb" >/dev/null
  # Parked: one primitive per material, then tools/assets/simplify.mjs (drops normals, as for the Quaternius parked cars).
  $G join "$TMP/$slug.3.glb" "$TMP/$slug.p1.glb" >/dev/null
  (cd "$TOOLS" && node simplify.mjs "$TMP/$slug.p1.glb" "$TMP/$slug.p2.glb" "${PARKED_RATIO:-0.06}" "${PARKED_ERROR:-0.05}")
  $G quantize "$TMP/$slug.p2.glb" "$OUT/$slug-parked.glb" >/dev/null
  echo "$m -> public/assets/models/vehicles/$slug.glb ($(stat -c %s "$OUT/$slug.glb") bytes), $slug-parked.glb ($(stat -c %s "$OUT/$slug-parked.glb") bytes)"
done
rm -rf "$TMP"
