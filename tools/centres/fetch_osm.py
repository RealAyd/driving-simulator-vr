#!/usr/bin/env python3
"""Downloads the OpenStreetMap data for a scene too big for one OSM API call, in n x n tiles, merged into one file.

    python3 -I tools/centres/fetch_osm.py <out.osm> <lat> <lon> <half> [n=3] [--patches <osm-patches.json>]

The area is the one tools/scenes/build_scene.mjs builds (centreBbox: half + 60 m each way round lat, lon). Tiles are
kept next to the output and reused when a rerun finds them, so a failed tile can be fetched again on its own. With
--patches, the centre's map fixes (tools/centres/patch_osm.py) are applied to the merged file.
"""
import math, os, subprocess, sys, time
import xml.etree.ElementTree as E

args = sys.argv[1:]
patches = None
if '--patches' in args:
    i = args.index('--patches'); patches = args[i + 1]; del args[i:i + 2]
if len(args) < 4:
    sys.exit(__doc__)
out, lat, lon, half = args[0], float(args[1]), float(args[2]), float(args[3])
n = int(args[4]) if len(args) > 4 else 3

KX = 111320 * math.cos(lat * math.pi / 180)
w, s, e, nn = lon - (half + 60) / KX, lat - (half + 60) / 111320, lon + (half + 60) / KX, lat + (half + 60) / 111320
tiles = os.path.join(os.path.dirname(os.path.abspath(out)), 'tiles-' + os.path.splitext(os.path.basename(out))[0])
os.makedirs(tiles, exist_ok=True)

files = []
for i in range(n):
    for j in range(n):
        bbox = f'{w+(e-w)*i/n:.5f},{s+(nn-s)*j/n:.5f},{w+(e-w)*(i+1)/n:.5f},{s+(nn-s)*(j+1)/n:.5f}'
        f = os.path.join(tiles, f't{i}-{j}.osm')
        files.append(f)
        if os.path.exists(f) and os.path.getsize(f) > 200:
            continue
        for attempt in range(4):
            code = subprocess.run(['curl', '-sS', '--compressed', '-m', '180', '-A', 'DrivingPractice-scene-builder/1.0',
                                   '-o', f, '-w', '%{http_code}', f'https://api.openstreetmap.org/api/0.6/map?bbox={bbox}'],
                                  capture_output=True, text=True).stdout
            if code == '200':
                break
            time.sleep(5 * (attempt + 1))
        else:
            sys.exit(f'Tile {i},{j} failed (HTTP {code}): run again to fetch the missing tiles.')
        print(f'tile {i},{j}')
        time.sleep(1)

seen = {'node': {}, 'way': {}, 'relation': {}}
for f in files:
    for el in E.parse(f).getroot():
        if el.tag in seen:
            seen[el.tag].setdefault(el.get('id'), el)
root = E.Element('osm', {'version': '0.6', 'generator': 'DrivingPractice fetch_osm'})
for t in ('node', 'way', 'relation'):
    for el in seen[t].values():
        root.append(el)
E.ElementTree(root).write(out, encoding='utf-8', xml_declaration=True)
print(out, {t: len(v) for t, v in seen.items()})

if patches:
    subprocess.run([sys.executable, '-I', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'patch_osm.py'), out, patches, out], check=True)
