"""Builds the Kings Road zebra crossing location and its exercise from OpenStreetMap and Overture data.

Inputs:  content/sources/kings-road-2026-10-19.osm (OSM API 0.6 map call, bbox 0.2930,51.6135,0.3060,51.6200,
         downloaded 2026-10-19), content/sources/overture-buildings-kings-road-2026-09-23.1.json (Microsoft ML
         building outlines via Overture Maps, read 2026-10-19 by tools/brentwood/overture_extract.py).
Outputs: content/locations/brentwood-kings-road-zebra.json, content/scenarios/brentwood-kings-road-zebra.json.

Area-inspired: road centrelines, the crossing, side roads, the bus stop, trees and building outlines are from
the map data; lane widths, kerb lines, give-way and zig-zag positions, building heights and roofs are estimated,
and the bus, pedestrian and following car are authored for the exercise. Not an official test route.

Data © OpenStreetMap contributors (ODbL 1.0); building outlines © Overture Maps Foundation, Microsoft (ODbL 1.0).
Needs shapely. Run: python3 -I tools/brentwood/build_kings_road.py
"""
import json, math, pathlib, xml.etree.ElementTree as ET
from shapely.geometry import LineString, Point, Polygon
from shapely.ops import unary_union
from shapely import constrained_delaunay_triangles

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / 'content/sources/kings-road-2026-10-19.osm'
OVERTURE = json.loads((ROOT / 'content/sources/overture-buildings-kings-road-2026-09-23.1.json').read_text())
# World origin: the zebra crossing (OSM node 1691283192). x east, z south, metres.
CROSSING_NODE = '1691283192'
ORIGIN = (51.6167281, 0.2994486)
KX, KY = 111320 * math.cos(math.radians(ORIGIN[0])), 111320
LANE = 3.2

osm = ET.parse(SRC).getroot()
NODES = {n.get('id'): (float(n.get('lat')), float(n.get('lon'))) for n in osm.iter('node')}
NODE_TAGS = {n.get('id'): {t.get('k'): t.get('v') for t in n.findall('tag')} for n in osm.iter('node')}
WAYS = {w.get('id'): ([nd.get('ref') for nd in w.findall('nd') if nd.get('ref') in NODES], {t.get('k'): t.get('v') for t in w.findall('tag')})
        for w in osm.iter('way')}
def xz(i):
    lat, lon = NODES[i]
    return (round((lon - ORIGIN[1]) * KX, 2), round(-(lat - ORIGIN[0]) * KY, 2))
def local(lon, lat):
    return ((lon - ORIGIN[1]) * KX, -(lat - ORIGIN[0]) * KY)

def smooth(points, rounds=2):
    """Chaikin corner cutting (ends kept), as for the High Street."""
    for _ in range(rounds):
        out = [points[0]]
        for a, b in zip(points, points[1:]):
            out += [(.75 * a[0] + .25 * b[0], .75 * a[1] + .25 * b[1]), (.25 * a[0] + .75 * b[0], .25 * a[1] + .75 * b[1])]
        out.append(points[-1])
        points = out
    return [(round(x, 2), round(z, 2)) for x, z in points]
def length(line):
    return sum(math.dist(a, b) for a, b in zip(line, line[1:]))
def point_at(line, s):
    for a, b in zip(line, line[1:]):
        l = math.dist(a, b)
        if s <= l or (a, b) == (line[-2], line[-1]):
            t = s / l if l else 0
            return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t), ((b[0] - a[0]) / l, (b[1] - a[1]) / l)
        s -= l
def along_of(line, p):
    best, acc = (math.inf, 0), 0.0
    for a, b in zip(line, line[1:]):
        l = math.dist(a, b)
        t = max(0, min(1, ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / (l * l)))
        q = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
        best = min(best, (math.dist(p, q), acc + l * t))
        acc += l
    return best[1]
def offset(line, s, lateral):
    """Point `lateral` metres right of the direction of travel (negative: left)."""
    (x, z), (ux, uz) = point_at(line, s)
    return (x - uz * lateral, z + ux * lateral)

# ---- Kings Road (B185): from the High Street junction (north) to the Queen's Road roundabout (south) ----
MAIN_WAYS = ['4077761', '794409881']
main = []
for w in MAIN_WAYS:
    for i in WAYS[w][0]:
        p = xz(i)
        if not main or main[-1] != p:
            main.append(p)
MAIN = smooth(main)
main_tags = [WAYS[w][1] for w in MAIN_WAYS]
assert all(t.get('maxspeed') == '30 mph' for t in main_tags)
roads = [{'id': 'kings-road', 'name': 'Kings Road', 'oneway': False,
          'speedLimitMph': 30, 'speedLimitSource': 'OpenStreetMap maxspeed, ways ' + ', '.join(MAIN_WAYS),
          'centreline': [{'x': x, 'z': z} for x, z in MAIN],
          'lanes': {'count': 2, 'width': LANE}, 'surfaceHeight': 0, 'pavementWidth': 2.0, 'kerbHeight': 0.12,
          'markings': {'centre': 'dashed', 'edges': False}}]
MAIN_LEN = length(MAIN)
MAIN_NODES = set(WAYS['4077761'][0]) | set(WAYS['794409881'][0])

# Side roads meeting Kings Road (shared nodes): their first 30 m, so the junction mouths are real.
DRIVABLE = {'primary', 'secondary', 'tertiary', 'residential', 'unclassified'}
ROUNDABOUT = {w for w, (nd, tg) in WAYS.items() if tg.get('junction') == 'roundabout'}
stubs = []
for wid, (nd, tg) in WAYS.items():
    if wid in MAIN_WAYS or tg.get('highway') not in DRIVABLE or wid in ROUNDABOUT:
        continue
    joins = [i for i in nd if i in MAIN_NODES]
    if not joins:
        continue
    join = xz(joins[0])
    # The southern end meets the roundabout's approach ways (Kings Road itself): not a side road.
    if tg.get('name') == 'Kings Road':
        continue
    line = [xz(i) for i in nd]
    outward = math.dist(line[0], join) <= math.dist(line[-1], join)
    if not outward:
        line = line[::-1]
    pts, acc, start = [], 0.0, LANE + .3
    for a, b in zip(line, line[1:]):
        l = math.dist(a, b)
        for k in range(int(l * 2) + 1):
            t = k / (l * 2) if l else 0
            q = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
            d = acc + l * t
            if start <= d <= start + 30 and (not pts or math.dist(pts[-1], q) >= 1):
                pts.append((round(q[0], 2), round(q[1], 2)))
        acc += l
    if len(pts) < 2:
        continue
    oneway = tg.get('oneway') == 'yes'
    if oneway and not outward:
        pts = pts[::-1]      # one-way towards Kings Road: centreline in the direction of travel
    name = tg.get('name') or 'unnamed'
    rid = name.lower().replace("'", '').replace(' ', '-')
    if any(r['id'] == rid for r in stubs) or rid == 'kings-road':
        rid += f'-{wid}'
    major = tg['highway'] in ('primary', 'secondary', 'tertiary')
    r = {'id': rid, 'name': name, 'oneway': oneway, 'centreline': [{'x': x, 'z': z} for x, z in pts],
         'lanes': {'count': 2, 'width': LANE} if major and not oneway else {'count': 1, 'width': 4.0},
         'surfaceHeight': 0, 'pavementWidth': 2.0, 'kerbHeight': 0.12,
         'markings': {'centre': 'dashed' if major and not oneway else 'none', 'edges': False}, '_osm': wid}
    if tg.get('maxspeed', '').endswith(' mph'):
        r['speedLimitMph'] = int(tg['maxspeed'].split()[0])
        r['speedLimitSource'] = f'OpenStreetMap maxspeed, way {wid}'
    stubs.append(r)
roads += stubs
MODELLED = set(MAIN_WAYS) | {r['_osm'] for r in stubs}
def road_line(r):
    return [(q['x'], q['z']) for q in r['centreline']]
def surface(r, extra=0.0):
    half = r['lanes']['count'] * r['lanes']['width'] / 2
    line = LineString(road_line(r))
    return line.buffer(half + r['pavementWidth'] + extra, cap_style=1)
KEEP_OUT = unary_union([surface(r) for r in roads])

# ---- The zebra crossing (OSM node 1691283192: crossing_ref=zebra, flush kerb, tactile paving) ----
XING = round(along_of(MAIN, xz(CROSSING_NODE)), 1)
crossing = {'id': 'kings-road-zebra', 'roadId': 'kings-road', 'kind': 'zebra', 'along': XING,
            # Width, give-way offset and zig-zag length are not mapped: typical values (estimates).
            'width': 3.0, 'giveWayOffset': 1.1, 'zigzagMarks': 8}

# ---- Scene extent, buildings, areas ----
MAIN_LINE = LineString(MAIN)
NEAR, FAR = 60, 150
def in_scene(p, corridor=FAR):
    return MAIN_LINE.distance(Point(p)) <= corridor

OTHER = []
for wid, (nd, tg) in WAYS.items():
    if wid in MODELLED or len(nd) < 2:
        continue
    hw = tg.get('highway')
    if hw in DRIVABLE or hw in ('secondary_link', 'primary_link') or wid in ROUNDABOUT:
        lanes = int(tg['lanes']) if tg.get('lanes', '').isdigit() else (1 if tg.get('oneway') == 'yes' else 2)
        OTHER.append(LineString([xz(i) for i in nd]).buffer(lanes * 1.6, cap_style=2))
SCENE = MAIN_LINE.buffer(FAR)
OTHER_STREETS = unary_union(OTHER).difference(KEEP_OUT.buffer(.2)).intersection(SCENE)
ACCESS = unary_union([LineString([xz(i) for i in nd]).buffer(2.4 if tg.get('highway') == 'service' else 1.2, join_style=2)
                      for wid, (nd, tg) in WAYS.items()
                      if tg.get('highway') in ('service', 'footway', 'path', 'cycleway', 'pedestrian') and len(nd) > 1 and tg.get('area') != 'yes'])
ACCESS = ACCESS.difference(KEEP_OUT.buffer(.2)).difference(OTHER_STREETS).intersection(SCENE)

USE = {'retail': 'shop', 'apartments': 'residential', 'house': 'residential', 'residential': 'residential',
       'terrace': 'residential', 'semidetached_house': 'residential', 'detached': 'residential', 'garage': 'utility',
       'commercial': 'office', 'office': 'office', 'church': 'church', 'school': 'school'}
buildings, osm_shapes = [], []
for wid, (nd, tg) in WAYS.items():
    if 'building' not in tg or len(nd) < 4:
        continue
    ring = [xz(i) for i in nd][:-1]
    shape = Polygon(ring).buffer(0)
    if not in_scene(shape.centroid.coords[0]):
        continue
    osm_shapes.append(shape)
    use = USE.get(tg['building'], 'residential' if shape.area < 220 else 'other')
    if tg.get('shop') and tg.get('shop') != 'vacant':
        use = 'shop'
    levels = int(float(tg['building:levels'])) if tg.get('building:levels') else (2 if use in ('residential', 'shop') else 1 if use == 'utility' else 2)
    entry = {'id': f'osm-{wid}', 'height': round(3.2 * levels + .6, 1) if use != 'utility' else 3.0, 'levels': levels,
             'heightSource': 'map-levels' if tg.get('building:levels') else 'estimated', 'use': use,
             'footprint': [{'x': x, 'z': z} for x, z in ring]}
    # Names only for businesses that are trading (a vacant unit keeps no name).
    if tg.get('name') and tg.get('shop') != 'vacant':
        entry['name'] = tg['name']
    if not in_scene(shape.centroid.coords[0], NEAR):
        entry['detail'] = 'low'
    buildings.append(entry)

reference, dropped = [], {'overlaps OSM building': 0, 'on a road or pavement': 0, 'outside the scene': 0, 'tiny': 0}
for f in OVERTURE['features']:
    shape = Polygon([local(lon, lat) for lon, lat in f['outline']]).buffer(0)
    if shape.is_empty or shape.area < 12:
        dropped['tiny'] += 1
        continue
    c = shape.centroid
    if not in_scene((c.x, c.y)):
        dropped['outside the scene'] += 1
        continue
    if any(shape.intersection(o).area > .1 * shape.area for o in osm_shapes):
        dropped['overlaps OSM building'] += 1
        continue
    trimmed = shape.difference(KEEP_OUT.buffer(.3)).difference(OTHER_STREETS.buffer(1.0))
    if trimmed.area < .6 * shape.area:
        dropped['on a road or pavement'] += 1
        continue
    if trimmed.geom_type != 'Polygon':
        trimmed = max(trimmed.geoms, key=lambda g: g.area)
    trimmed = trimmed.simplify(.25)
    h = max(3.0, min(24.0, f['height'] or 6.0))
    reference.append((f, trimmed, h, not in_scene((c.x, c.y), NEAR)))

def four_sided(ring):
    shp = Polygon(ring).simplify(.6)
    return len(shp.exterior.coords) - 1 == 4 and shp.area > .8 * shp.minimum_rotated_rectangle.area
for k, (f, shape, h, low) in enumerate(reference):
    ring = [(round(x, 2), round(z, 2)) for x, z in list(shape.exterior.coords)[:-1]]
    house = shape.area < 220 and h < 10.5
    if house and four_sided(ring):
        ring = [(round(x, 2), round(z, 2)) for x, z in list(Polygon(ring).simplify(.6).exterior.coords)[:-1]]
        short = min(math.dist(ring[i], ring[(i + 1) % 4]) for i in range(4))
        rise = round(min(3.2, max(1.6, short * .35)), 1)
        walls, roof = max(3.0, h - rise), 'pitched'
    else:
        walls, roof = h, 'flat'
    entry = {'id': f"ml-{f['id'][:8]}-{k}", 'height': round(walls, 1), 'levels': max(1, round((walls - .6) / 3.0)),
             'heightSource': 'reference-estimated', 'use': 'residential' if house else 'other', 'source': 'reference',
             'roof': roof, 'footprint': [{'x': x, 'z': z} for x, z in ring]}
    if low:
        entry['detail'] = 'low'
    buildings.append(entry)
for b in buildings:
    ring = [(q['x'], q['z']) for q in b['footprint']]
    if b.get('source', 'map') == 'map' and b['use'] == 'residential' and four_sided(ring) and Polygon(ring).area < 220:
        b['roof'] = 'pitched'
    b.setdefault('roof', 'flat')

def area_entries(geom, kind, min_area=6):
    out = []
    parts = [geom] if geom.geom_type == 'Polygon' else list(getattr(geom, 'geoms', []))
    for part in parts:
        if part.geom_type != 'Polygon' or part.area < min_area:
            continue
        part = part.simplify(.3)
        if part.is_empty or part.geom_type != 'Polygon':
            continue
        pieces = [part] if not part.interiors else list(constrained_delaunay_triangles(part).geoms)
        for piece in pieces:
            out.append({'kind': kind, 'polygon': [{'x': round(x, 2), 'z': round(z, 2)} for x, z in list(piece.exterior.coords)[:-1]]})
    return out
ALL_BUILDINGS = unary_union([Polygon([(q['x'], q['z']) for q in b['footprint']]).buffer(0) for b in buildings])
areas = []
for wid, (nd, tg) in WAYS.items():
    kind = 'parking' if tg.get('amenity') == 'parking' else 'grass' if tg.get('landuse') in ('grass', 'recreation_ground') or tg.get('leisure') in ('park', 'garden') else None
    if kind and len(nd) >= 4:
        shape = Polygon([xz(i) for i in nd]).buffer(0).difference(KEEP_OUT.buffer(.2)).difference(ALL_BUILDINGS).intersection(SCENE)
        areas += area_entries(shape, kind)
areas += area_entries(ACCESS.difference(ALL_BUILDINGS), 'access')
areas += area_entries(OTHER_STREETS, 'street')

trees = [{'x': round(xz(i)[0], 2), 'z': round(xz(i)[1], 2)} for i, tg in NODE_TAGS.items()
         if tg.get('natural') == 'tree' and in_scene(xz(i), 80) and not KEEP_OUT.contains(Point(xz(i)))]

# ---- Bus stop: Queens Road Roundabout (OSM node 474891874, NaPTAN bearing S: southbound, no shelter) ----
STOP_NODE = '474891874'
stop_tags = NODE_TAGS[STOP_NODE]
STOP_ALONG = round(along_of(MAIN, xz(STOP_NODE)), 1)
pole = offset(MAIN, STOP_ALONG, -(LANE + .5))           # the back of the southbound (left) kerb
assert math.dist(pole, xz(STOP_NODE)) < 4, 'the mapped stop is beside the southbound kerb'
furniture = [{'kind': 'bus-stop', 'position': {'x': round(pole[0], 2), 'z': round(pole[1], 2)},
              'facingDeg': round(math.degrees(math.atan2(*(lambda d: (d[1], -d[0]))(point_at(MAIN, STOP_ALONG)[1]))) % 360, 1),
              'source': f"OSM node {STOP_NODE} ({stop_tags['name']}; NaPTAN bearing {stop_tags['naptan:Bearing']})",
              'name': stop_tags['name'], 'shelter': stop_tags.get('shelter') == 'yes'}]

# ---- Learner start: southbound, 160 m before the crossing, in the left lane ----
START = round(XING - 160, 1)
sp = offset(MAIN, START, -LANE / 2)
(_, _), (ux, uz) = point_at(MAIN, START)
spawn_heading = round(math.degrees(math.atan2(ux, -uz)) % 360, 1)

location = {
    'schemaVersion': 2,
    'id': 'brentwood-kings-road-zebra',
    'name': 'Kings Road zebra crossing, Brentwood (area-inspired)',
    'placeName': 'Brentwood',
    'fidelity': 'geographically-inspired',
    'drivingSide': 'left',
    'description': 'Area-inspired layout of Kings Road (B185), Brentwood, from the High Street junction to just before '
                   "the Queen's Road roundabout, with its zebra crossing. Not an official test route. Road centrelines, "
                   'side roads, the crossing, the bus stop and trees from OpenStreetMap; building outlines from '
                   'OpenStreetMap ("map") and Microsoft machine-detected outlines via Overture Maps ("reference"); '
                   'lane widths, kerb lines, the give-way lines, zig-zag length, building heights and roof styles are '
                   'estimated; street lights are representative.',
    'sources': [
        {'title': 'OpenStreetMap', 'licence': 'ODbL 1.0, © OpenStreetMap contributors', 'url': 'https://www.openstreetmap.org/copyright',
         'notes': 'API 0.6 map call, bbox 0.2930,51.6135,0.3060,51.6200, downloaded 2026-10-19. Kings Road ways 4077761, 794409881; '
                  'zebra crossing node 1691283192; bus stop node 474891874. Generated by tools/brentwood/build_kings_road.py.'},
        {'title': 'Overture Maps buildings (Microsoft ML Buildings)', 'licence': 'ODbL 1.0, © OpenStreetMap contributors, Overture Maps Foundation, Microsoft',
         'url': 'https://docs.overturemaps.org/attribution/',
         'notes': 'Release 2026-09-23.1, bbox 0.2930,51.6135,0.3060,51.6200, read 2026-10-19. Only machine-detected outlines with no '
                  'OpenStreetMap equivalent (source "reference").'},
    ],
    'reviewStatus': 'unreviewed',
    'roads': [{k: v for k, v in r.items() if k != '_osm'} for r in roads],
    'blocks': [],
    'crossings': [crossing],
    'junctions': [],
    'buildings': buildings,
    'trees': trees,
    'ground': 'grass',
    'areas': areas,
    'furniture': furniture,
    'townLampSpacing': 30,
    'spawn': {'position': {'x': round(sp[0], 2), 'z': round(sp[1], 2)}, 'headingDeg': spawn_heading, 'roadId': 'kings-road'},
}

# ---- The exercise ----
BUS_LENGTH = 11.5
GIVE_WAY = XING - crossing['width'] / 2 - crossing['giveWayOffset']
def path(s0, s1, lateral, step=4.0):
    n = max(1, int(abs(s1 - s0) / step))
    return [dict(zip('xz', (round(c, 2) for c in offset(MAIN, s0 + (s1 - s0) * k / n, lateral)))) for k in range(n + 1)]
def zone(zid, a, b, label):
    return {'id': zid, 'roadId': 'kings-road', 'from': round(a, 1), 'to': round(b, 1), 'label': label}
# Steering assistance: the left lane, out into the other lane to pass the bus at the stop (clear of its side by
# about a metre), and back into the lane well before the crossing.
bus_rear, bus_front = STOP_ALONG - BUS_LENGTH, STOP_ALONG
assist = path(START, bus_rear - 14, -LANE / 2) + path(bus_rear - 6, bus_front + 4, LANE / 2)[0:] + \
         path(bus_front + 12, XING + 45, -LANE / 2)
ped_side = -(LANE + 1.0)     # the southbound (left) pavement, a metre from the kerb
scenario = {
    'schemaVersion': 1,
    'id': 'brentwood-kings-road-zebra',
    'locationId': location['id'],
    'title': 'Kings Road zebra (Brentwood)',
    'learningObjective': 'Approach a real zebra crossing past a bus at its stop: plan to pass the bus, keep a speed at which '
                         'you can stop, check the mirror before slowing, and give way to a pedestrian who steps onto the crossing.',
    'briefing': 'Kings Road zebra crossing\n\nDrive south along Kings Road towards the zebra crossing. A bus is waiting at the stop '
                'on your side just before it, and a passenger who has just got off may be heading for the crossing.\n\n'
                'A car is following you, so check your mirror before you slow down.\n\nGive way to anyone who steps onto the '
                'crossing. The exercise ends once you have driven past the crossing, before the roundabout.\n\n'
                'Area-inspired: the bus, the pedestrian and the following car are part of the exercise, not a record of real traffic.',
    'rubricId': 'crossing-restricted-view',
    'restrictedViewBy': 'the bus at the stop',
    'controllerDriving': {'assistedSpeedMph': 20, 'accelerationLimit': 1.5},
    'assistPath': assist,
    'zones': [
        zone('restricted-approach', bus_rear, GIVE_WAY, 'Past the bus at the stop to the give-way line'),
        zone('pedestrian-trigger', XING - 26, XING + 4, 'Close enough that the pedestrian starts to cross'),
        zone('end', XING + 12, XING + 45, 'Clear of the crossing, before the roundabout'),
    ],
    'actors': [
        {'id': 'pedestrian-1', 'kind': 'pedestrian',
         # Off the bus: walking along the pavement from near its front to the crossing.
         'walkFrom': dict(zip('xz', (round(c, 2) for c in offset(MAIN, bus_front + 18, ped_side)))),
         'waitAt': dict(zip('xz', (round(c, 2) for c in offset(MAIN, XING, -(LANE + .6))))),
         'crossTo': dict(zip('xz', (round(c, 2) for c in offset(MAIN, XING, LANE + .6)))),
         'walkSpeed': 1.3, 'prepareSeconds': 1.5, 'crossingId': crossing['id']},
        {'id': 'following-car', 'kind': 'following-vehicle', 'startBehind': 35, 'desiredSpeed': 13.4, 'headway': 1.5, 'colour': '#9aa3ad'},
    ],
    # The bus stands at the stop (front at the flag) throughout the exercise, then would pull away.
    'buses': [{'id': 'bus-at-stop', 'roadId': 'kings-road', 'direction': 'with', 'from': STOP_ALONG, 'to': round(XING + 40, 1),
               'startDwellSeconds': 600, 'cruiseMph': 17, 'end': 'leave'}],
    'triggers': [{'id': 'pedestrian-steps-out', 'when': {'zoneEntered': 'pedestrian-trigger'}, 'once': True,
                  'actions': [{'actor': 'pedestrian-1', 'do': 'start-crossing', 'delaySeconds': 0}]}],
    'start': {'position': location['spawn']['position'], 'headingDeg': spawn_heading},
    'end': {'zone': 'end', 'timeLimitSeconds': 240},
}

(ROOT / 'content/locations/brentwood-kings-road-zebra.json').write_text(json.dumps(location, indent=1) + '\n')
(ROOT / 'content/scenarios/brentwood-kings-road-zebra.json').write_text(json.dumps(scenario, indent=1) + '\n')
print('roads', [r['id'] for r in roads])
print('Kings Road length', round(MAIN_LEN, 1), 'crossing along', XING, 'stop along', STOP_ALONG, 'start', START)
print('buildings', len(buildings), '(OSM', len(osm_shapes), ', reference', len(reference), ')', 'dropped', dropped)
print('areas', len(areas), 'trees', len(trees))
