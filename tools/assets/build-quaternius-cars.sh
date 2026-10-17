#!/usr/bin/env bash
# Converts Quaternius "LowPoly Cars" OBJ models (CC0 1.0) to optimised GLB
# for the simulator. The original pack is NOT kept in the repository; pass the
# folder that contains the extracted OBJ/MTL files.
#
#   tools/assets/build-quaternius-cars.sh /path/to/OBJ  [Model ...]
#
# Steps per model: OBJ+MTL -> GLB (obj2gltf), then weld vertices, remove
# duplicates, join primitives that share a material, prune unused data
# and quantise vertex data (glTF-Transform). Geometry is not simplified (about 1,500 vertices each).
# Materials keep their names so the simulator can tint the body paint.
set -euo pipefail
SRC="${1:?folder with the extracted OBJ files}"; shift
MODELS=("${@:-NormalCar1}")
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/public/assets/models/vehicles"
TMP="$(mktemp -d)"
mkdir -p "$OUT"
for m in "${MODELS[@]}"; do
  slug="quaternius-$(echo "$m" | sed -E 's/([a-z])([A-Z0-9])/\1-\2/g' | tr 'A-Z' 'a-z')"
  npx -y obj2gltf@3.2.0 -i "$SRC/$m.obj" -o "$TMP/$slug.raw.glb" >/dev/null
  npx -y @gltf-transform/cli@4.5.1 weld "$TMP/$slug.raw.glb" "$TMP/$slug.1.glb" >/dev/null
  npx -y @gltf-transform/cli@4.5.1 dedup "$TMP/$slug.1.glb" "$TMP/$slug.2.glb" >/dev/null
  npx -y @gltf-transform/cli@4.5.1 join "$TMP/$slug.2.glb" "$TMP/$slug.3.glb" >/dev/null
  npx -y @gltf-transform/cli@4.5.1 prune "$TMP/$slug.3.glb" "$TMP/$slug.4.glb" >/dev/null
  # Smaller vertex data (KHR_mesh_quantization, supported by Babylon's glTF loader).
  npx -y @gltf-transform/cli@4.5.1 quantize "$TMP/$slug.4.glb" "$OUT/$slug.glb" >/dev/null
  echo "$m -> public/assets/models/vehicles/$slug.glb ($(stat -c %s "$OUT/$slug.glb") bytes)"
done
rm -rf "$TMP"
