# Brentwood survey scripts

Survey of roads and crossings around the provisional test-centre position (see
docs/brentwood/PRACTICE-AREA-PROPOSAL.md). Input: OpenStreetMap API 0.6 map
calls saved as `t_<lat>_<lon>.osm` in one directory (not committed; download
again with the bboxes below). Data © OpenStreetMap contributors, ODbL 1.0.

    for la in 51.591 51.6095; do for lo in 0.269 0.2984; do
      curl -o t_${la}_${lo}.osm "https://api.openstreetmap.org/api/0.6/map?bbox=$lo,$la,<lo+0.0294>,<la+0.0185>"
    done; done
    python3 -I survey.py <dir>   # crossings, junctions, mini-roundabouts within 2 km (straight line)
    python3 -I route.py <dir>    # road distances (shortest drivable path, one-way respected)

Downloaded 2026-10-18 for the proposal. The centre position used (51.6095, 0.2984)
is an estimate, not DVSA-supplied.
