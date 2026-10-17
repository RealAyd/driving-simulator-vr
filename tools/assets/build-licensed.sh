#!/usr/bin/env bash
# Builds optimised GLBs from packs whose licences do NOT allow public
# redistribution (or whose licence is not yet confirmed). Outputs go to
# public/assets/licensed/, which git ignores: never commit them, and never
# deploy them to the public staging site. See docs/assets/ASSET-REGISTER.md.
#
#   tools/assets/build-licensed.sh london  <extracted london-street-starter folder>
#   tools/assets/build-licensed.sh street  <street_pack.glb converted from the FBX with FBX2glTF>
#   tools/assets/build-licensed.sh market  <model_for_supermarket.glb>
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/public/assets/licensed"
mkdir -p "$OUT"
GT="npx -y @gltf-transform/cli@4.5.1"
opt(){ # in out: weld, merge duplicates, one primitive per material, prune, quantise
  local t; t="$(mktemp -d)"
  $GT weld "$1" "$t/1.glb" >/dev/null; $GT dedup "$t/1.glb" "$t/2.glb" >/dev/null
  $GT join "$t/2.glb" "$t/3.glb" >/dev/null; $GT prune "$t/3.glb" "$t/4.glb" >/dev/null
  $GT quantize "$t/4.glb" "$2" >/dev/null; rm -rf "$t"
  echo "$(basename "$2"): $(stat -c %s "$2") bytes"
}
case "$1" in
  london) # Lowest detail level, from the uncompressed copies (no meshopt decoder needed).
    opt "$2/buildings-uncompressed/london-residential-benchmark/low-london-residential-benchmark.glb" "$OUT/a3js-london-terrace-house-low.glb";;
  street) # One object at a time, stood on the origin (tools/assets/extract-object.mjs).
    node "$ROOT/tools/assets/extract-object.mjs" "$2" "Traffic Lights" "$OUT/cadmando-traffic-lights.raw.glb"
    opt "$OUT/cadmando-traffic-lights.raw.glb" "$OUT/cadmando-traffic-lights.glb"; rm "$OUT/cadmando-traffic-lights.raw.glb";;
  market)
    opt "$2" "$OUT/supermarket.glb";;
  *) echo "usage: $0 london|street|market <input>" >&2; exit 1;;
esac
