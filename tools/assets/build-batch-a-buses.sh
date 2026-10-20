#!/usr/bin/env bash
# Red buses from asset Batch A (Driving_Practice_Batch_A_Complete_6.zip, supplied by the project owner; the pack is
# not kept in the repository). Only the lightweight legacy single- and double-decker are shipped (the populated
# versions are about 18.8 MB each).
#
#   TOOLS=<scratch folder with @gltf-transform/core|functions|extensions 4.5.1> \
#     tools/assets/build-batch-a-buses.sh /path/to/Driving_Practice_Batch_A
set -euo pipefail
SRC="${1:?folder with the extracted Batch A pack}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/public/assets/models/vehicles"
mkdir -p "$OUT"
cp "$ROOT/tools/assets/optimise-bus.mjs" "${TOOLS:?scratch folder, see above}/"
for deck in single double; do
  (cd "$TOOLS" && node optimise-bus.mjs "$SRC/glb/uk-$deck-decker-bright-red-lightweight-legacy.glb" "$OUT/batch-a-bus-$deck-decker-red.glb")
  echo "$deck: $(stat -c %s "$OUT/batch-a-bus-$deck-decker-red.glb") bytes"
done
