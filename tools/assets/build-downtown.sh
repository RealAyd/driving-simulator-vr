#!/usr/bin/env bash
# Builds the simulator's GLBs from the Downtown City MegaKit (Standard, CC0,
# Quaternius) starter selection: the "prepared" GLBs in Downtown_City_UK_Starter.zip.
#   tools/assets/build-downtown.sh <extracted Downtown_City_UK_Starter folder> Building_Small_1 [more names]
# Needs a scratch folder with @gltf-transform/core, /extensions, /functions 4.5.1 and sharp
# (set TOOLS=/path/to/that folder); see tools/assets/slim-textures.mjs.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$1"; shift
OUT="$ROOT/public/assets/models/buildings"
mkdir -p "$OUT"
GT="npx -y @gltf-transform/cli@4.5.1"
cp "$ROOT/tools/assets/slim-textures.mjs" "$TOOLS/"
for name in "$@"; do
  in="$(ls "$SRC"/prepared/*/"$name.glb")"
  out="$OUT/quaternius-downtown-$(echo "$name" | tr '[:upper:]_' '[:lower:]-').glb"
  t="$(mktemp -d)"
  # Window interiors (only seen through glass), marble floor and asphalt: 256 px; others 512 px.
  node "$TOOLS/slim-textures.mjs" "$in" "$t/0.glb" 512 'interior|marble|asphalt' 256 >/dev/null
  $GT weld "$t/0.glb" "$t/1.glb" >/dev/null; $GT dedup "$t/1.glb" "$t/2.glb" >/dev/null
  $GT join "$t/2.glb" "$t/3.glb" >/dev/null; $GT prune "$t/3.glb" "$t/4.glb" >/dev/null
  $GT quantize "$t/4.glb" "$out" >/dev/null; rm -rf "$t"
  echo "$(basename "$out"): $(stat -c %s "$out") bytes"
done
