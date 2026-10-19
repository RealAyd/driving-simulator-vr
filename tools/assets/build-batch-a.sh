#!/usr/bin/env bash
# Driving Practice street asset Batch A (v0.1.0, supplied by the project owner 2026-10-19 as
# Driving_Practice_Batch_A_Complete_6.zip). The pack itself is NOT kept in the repository; pass the
# extracted folder that contains glb/ and manifest.json.
#
#   tools/assets/build-batch-a.sh /path/to/Driving_Practice_Batch_A
#
# Only the models the simulator places are shipped (content/assets/register.json lists the rest).
# Steps per model: weld, dedup, join primitives sharing a material, prune, quantise (glTF-Transform),
# as for the other shipped models; the signal head is also simplified (meshoptimizer, ratio 0.3).
set -euo pipefail
SRC="${1:?folder with the extracted Batch A pack}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/public/assets/models/street"
TMP="$(mktemp -d)"
mkdir -p "$OUT"
for m in belisha_beacon bus_shelter_modern uk_vehicle_signal_green; do
  slug="batch-a-$(echo "$m" | tr '_' '-')"
  npx -y @gltf-transform/cli@4.5.1 weld "$SRC/glb/$m.glb" "$TMP/$slug.1.glb" >/dev/null
  npx -y @gltf-transform/cli@4.5.1 dedup "$TMP/$slug.1.glb" "$TMP/$slug.2.glb" >/dev/null
  npx -y @gltf-transform/cli@4.5.1 join "$TMP/$slug.2.glb" "$TMP/$slug.3.glb" >/dev/null
  npx -y @gltf-transform/cli@4.5.1 prune "$TMP/$slug.3.glb" "$TMP/$slug.4.glb" >/dev/null
  # The signal head's lamp spheres are finely tessellated (4,092 triangles); six heads stand on the Brentwood route.
  if [ "$m" = uk_vehicle_signal_green ]; then
    npx -y @gltf-transform/cli@4.5.1 simplify --ratio 0.3 --error 0.002 "$TMP/$slug.4.glb" "$TMP/$slug.5.glb" >/dev/null
    mv "$TMP/$slug.5.glb" "$TMP/$slug.4.glb"
  fi
  npx -y @gltf-transform/cli@4.5.1 quantize "$TMP/$slug.4.glb" "$OUT/$slug.glb" >/dev/null
  echo "$m -> public/assets/models/street/$slug.glb ($(stat -c %s "$SRC/glb/$m.glb") -> $(stat -c %s "$OUT/$slug.glb") bytes)"
done
rm -rf "$TMP"
