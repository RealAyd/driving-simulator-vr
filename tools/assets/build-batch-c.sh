#!/usr/bin/env bash
# Driving Practice Batch C (v0.1, British modular street scenery, supplied by the project owner
# 2026-10-19 as Driving_Practice_Batch_C_Complete.zip). The pack itself is not kept in the repository.
#
#   tools/assets/build-batch-c.sh /path/to/Driving_Practice_Batch_C
#
# Only the models the simulator places are shipped (content/assets/register.json lists the rest).
# glTF-Transform 4.5.1: weld, dedup, join, prune, simplify (meshoptimizer), quantise.
set -euo pipefail
SRC="${1:?folder with the extracted Batch C pack}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/public/assets/models/street"
TMP="$(mktemp -d)"
G="npx -y @gltf-transform/cli@4.5.1"
mkdir -p "$OUT"
# Street tree: one mesh (vertex colours); 2,056 triangles simplified for use at every mapped and garden tree.
m=uk_street_tree_lod1; slug=batch-c-street-tree
$G weld "$SRC/glb/$m.glb" "$TMP/1.glb" >/dev/null
$G dedup "$TMP/1.glb" "$TMP/2.glb" >/dev/null
$G join "$TMP/2.glb" "$TMP/3.glb" >/dev/null
$G prune "$TMP/3.glb" "$TMP/4.glb" >/dev/null
$G simplify --ratio 0.15 --error 0.02 "$TMP/4.glb" "$TMP/5.glb" >/dev/null
$G quantize "$TMP/5.glb" "$OUT/$slug.glb" >/dev/null
echo "$m -> public/assets/models/street/$slug.glb ($(stat -c %s "$SRC/glb/$m.glb") -> $(stat -c %s "$OUT/$slug.glb") bytes)"
rm -rf "$TMP"
