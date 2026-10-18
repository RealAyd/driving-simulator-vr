"""Extracts the Brentwood paired mini-roundabouts from an OpenStreetMap export.

Input:  content/sources/brentwood-2026-10-17.osm (OSM API 0.6 map call,
        bbox 0.3020,51.6195,0.3090,51.6232, downloaded 2026-10-17).
Output: docs/brentwood/layout-osm.json (metres east/north of the review origin).

Data © OpenStreetMap contributors, ODbL 1.0. Run: python3 tools/brentwood/osm_extract.py
"""
import json, math, pathlib, xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / 'content/sources/brentwood-2026-10-17.osm'
ORIGIN = (51.6213112, 0.3055506)
KX = 111320 * math.cos(math.radians(ORIGIN[0]))
KY = 111320
EXTENT = 130  # metres around the origin

osm = ET.parse(SRC).getroot()
nodes = {n.get('id'): (float(n.get('lat')), float(n.get('lon'))) for n in osm.iter('node')}
tags = lambda e: {t.get('k'): t.get('v') for t in e.findall('tag')}
def xy(i):
    lat, lon = nodes[i]
    return [round((lon - ORIGIN[1]) * KX, 2), round((lat - ORIGIN[0]) * KY, 2)]
near = lambda p, r=EXTENT: abs(p[0]) <= r and abs(p[1]) <= r

DRIVABLE = {'primary', 'secondary', 'tertiary', 'residential', 'unclassified'}
BUSINESS = ('shop', 'office', 'craft')
BUSINESS_AMENITY = {'cafe', 'fast_food', 'restaurant', 'bank', 'pharmacy', 'pub', 'bar', 'dentist', 'doctors', 'theatre', 'studio', 'dojo'}

def inside(p, poly):
    """Point in polygon (ray casting)."""
    x, y, hit = p[0], p[1], False
    for (x1, y1), (x2, y2) in zip(poly, poly[1:] + poly[:1]):
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
            hit = not hit
    return hit
roads, buildings, areas = [], [], []
for w in osm.iter('way'):
    tg = tags(w)
    ids = [nd.get('ref') for nd in w.findall('nd') if nd.get('ref') in nodes]
    pts = [xy(i) for i in ids]
    if not pts or not any(near(p) for p in pts):
        continue
    if tg.get('highway') in DRIVABLE:
        roads.append({'osmWay': int(w.get('id')), 'name': tg.get('name'), 'ref': tg.get('ref'),
                      'highway': tg['highway'], 'oneway': tg.get('oneway') == 'yes',
                      'lanes': int(tg['lanes']) if tg.get('lanes', '').isdigit() else None,
                      'points': pts})
    elif 'building' in tg:
        buildings.append({'osmWay': int(w.get('id')), 'name': tg.get('name'), 'levels': tg.get('building:levels'),
                          'building': tg['building'],
                          # A shop, café, bank, office etc. mapped on the building itself.
                          'business': any(k in tg for k in BUSINESS) or tg.get('amenity') in BUSINESS_AMENITY,
                          'polygon': pts})
    elif tg.get('amenity') == 'parking' or tg.get('landuse') in ('grass',) or tg.get('leisure') == 'park':
        areas.append({'osmWay': int(w.get('id')), 'kind': tg.get('amenity') or tg.get('landuse') or tg.get('leisure'), 'polygon': pts})

# Businesses mapped as points inside a building outline (most shops in OSM are mapped this way).
business_points = []
for n in osm.iter('node'):
    tg = tags(n)
    if any(k in tg for k in BUSINESS) or tg.get('amenity') in BUSINESS_AMENITY:
        business_points.append(xy(n.get('id')))
for b in buildings:
    b['businessPoints'] = sum(1 for p in business_points if inside(p, b['polygon']))

features = []
for n in osm.iter('node'):
    tg = tags(n)
    p = xy(n.get('id'))
    if not tg or not near(p):
        continue
    kind = None
    if tg.get('highway') == 'mini_roundabout': kind = 'mini-roundabout'
    elif tg.get('highway') == 'crossing': kind = 'crossing-' + tg.get('crossing', 'unspecified')
    elif tg.get('highway') == 'traffic_signals': kind = 'traffic-signals'
    elif tg.get('highway') == 'bus_stop': kind = 'bus-stop'
    elif tg.get('historic') == 'memorial': kind = 'memorial'
    elif tg.get('natural') == 'tree': kind = 'tree'
    if kind:
        features.append({'osmNode': int(n.get('id')), 'kind': kind, 'name': tg.get('name'), 'x': p[0], 'y': p[1]})

out = {
    'source': 'OpenStreetMap API 0.6 map call, bbox 0.3020,51.6195,0.3090,51.6232, downloaded 2026-10-17',
    'licence': 'Data © OpenStreetMap contributors, available under the Open Database Licence (ODbL) 1.0. https://www.openstreetmap.org/copyright',
    'origin': {'lat': ORIGIN[0], 'lng': ORIGIN[1]},
    'units': 'metres east (x) and north (y) of the origin',
    'roads': roads, 'buildings': buildings, 'areas': areas, 'features': features,
}
(ROOT / 'docs/brentwood/layout-osm.json').write_text(json.dumps(out, indent=1))
print(f'{len(roads)} road ways, {len(buildings)} buildings, {len(areas)} areas, {len(features)} features')
