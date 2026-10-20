#!/usr/bin/env bash
# Animated people: the project owner's Tripo characters (Driving_Practice_Animated_Tripo_People.zip, supplied
# 2026-10-20; the owner holds a commercial licence to use them). The pack itself is not kept in the repository.
#
#   TOOLS=<scratch folder with @gltf-transform/core|functions|extensions 4.5.1, meshoptimizer 0.22.0, sharp 0.33.5> \
#     tools/assets/build-people.sh /path/to/Driving_Practice_Animated_Tripo_People
#
# The four pedestrians with a Walk clip; clips kept: Walk, Idle, LookLeft, LookRight. About 20% of the welded
# vertices, 512 px textures (tools/assets/optimise-person.mjs).
set -euo pipefail
SRC="${1:?folder with the extracted Animated Tripo People pack}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/public/assets/models/people"
mkdir -p "$OUT"
cp "$ROOT/tools/assets/optimise-person.mjs" "${TOOLS:?scratch folder, see above}/"
for pair in "pedestrian_male_01:person-man-jacket" "pedestrian_male_02:person-man-zip-jacket" \
            "pedestrian_woman_04:person-woman-jacket" "pedestrian_adult_05:person-older-man-coat"; do
  m="${pair%%:*}"; slug="${pair##*:}"
  (cd "$TOOLS" && node optimise-person.mjs "$SRC/Animated_GLBS/$m.glb" "$OUT/$slug.glb" 0.2 Walk,Idle,LookLeft,LookRight 512)
  echo "$slug: $(stat -c %s "$OUT/$slug.glb") bytes"
done
