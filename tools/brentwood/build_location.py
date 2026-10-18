"""Builds the drivable Brentwood paired mini-roundabouts from the OSM layout.

Input:  docs/brentwood/layout-osm.json (from osm_extract.py; ODbL).
Output: content/locations/brentwood-paired-mini-roundabouts.json
        content/scenarios/brentwood-guided-traversal.json

Road centrelines come from OpenStreetMap ways (ids kept in each road's
name note). Lane counts and widths are simplified; the result is
area-inspired, not an official test route and not surveyed.

World coordinates: x = metres east, z = metres SOUTH (z = -north), as the
simulator uses -Z for north. Run: python3 tools/brentwood/build_location.py
"""
import json, math, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
OSM = json.loads((ROOT / 'docs/brentwood/layout-osm.json').read_text())
WAYS = {r['osmWay']: r for r in OSM['roads']}
LANE = 3.2

def pts(*ways, reverse=False):
    """Concatenated OSM way points in world coordinates."""
    out = []
    for w in ways:
        for x, y in WAYS[w]['points']:
            p = (round(x, 2), round(-y, 2))
            if not out or out[-1] != p:
                out.append(p)
    return out[::-1] if reverse else out

def smooth(points, rounds=2):
    """Chaikin corner cutting (ends kept), so wide roads do not fold at sharp OSM corners."""
    for _ in range(rounds):
        out = [points[0]]
        for a, b in zip(points, points[1:]):
            out += [(.75 * a[0] + .25 * b[0], .75 * a[1] + .25 * b[1]), (.25 * a[0] + .75 * b[0], .25 * a[1] + .75 * b[1])]
        out.append(points[-1])
        points = out
    return [(round(x, 2), round(z, 2)) for x, z in points]

def road(rid, name, ways_note, points, lanes, oneway, width=LANE, centre=None, pavement=2.0):
    points = smooth(points)
    if centre is None:
        centre = 'dashed' if lanes > 1 else 'none'
    return {'id': rid, 'name': name, 'oneway': oneway,
            'centreline': [{'x': x, 'z': z} for x, z in points],
            'lanes': {'count': lanes, 'width': width}, 'surfaceHeight': 0,
            'pavementWidth': pavement, 'kerbHeight': 0.12,
            'markings': {'centre': centre, 'edges': False},
            '_osm': ways_note}

RB1 = (7.87, 7.89)    # world (x, z) of the first mini-roundabout (High St / Ingrave Rd / link)
RB2 = (16.83, -9.01)  # second mini-roundabout (link / Shenfield Rd / Ongar Rd)
R1, R2 = 6.0, 6.0     # junction clear radii

# High Street runs west -> east into rb1 so the learner's distance along it grows. It starts about 330 m
# behind the learner (the whole of way 671087285, then 820165999), so the mirrors show the street into the haze.
HIGH_WEST_X = -360
high_west = [p for p in pts(671087285) if p[0] >= HIGH_WEST_X] + pts(820165999)[1:]
high = high_west + pts(1307620631, 1307620632, 1307620630)[1:] + pts(820166003, reverse=True)[1:]
roads = [
    road('high-street', 'High Street', 'ways 671087285, 820165999, 1307620631, 1307620632, 1307620630, 820166003', high, 2, False),
    road('ingrave-in', 'Ingrave Road', 'way 829734450 (towards rb1)', pts(829734450), 2, True),
    road('ingrave-out', 'Ingrave Road', 'way 793487376 (from rb1)', pts(793487376), 1, True, width=3.5),
    road('link-north', "Wilson's Corner", 'way 820166006 (rb1 to rb2)', pts(820166006), 2, True),
    road('link-south', "Wilson's Corner", 'way 793487370 (rb2 to rb1)', pts(793487370), 1, True, width=3.5),
    road('shenfield-in', 'Shenfield Road', 'way 793487371 (towards rb2)', pts(793487371), 2, True),
    road('shenfield-out', 'Shenfield Road', 'ways 793487378, 793487372 (from rb2)', pts(793487378, 793487372), 1, True, width=3.5),
    road('shenfield-road', 'Shenfield Road', 'way 424647832', pts(424647832)[:3], 2, False),
    road('ongar-in', 'Ongar Road', 'ways 1304276722, 793487377 (towards rb2)', pts(1304276722, 793487377), 2, True),
    road('ongar-out', 'Ongar Road', 'way 1304276721 (from rb2)', pts(1304276721), 1, True, width=3.5),
    road('ongar-road', 'Ongar Road', 'way 725959965', pts(725959965, reverse=True)[:7], 2, False),
]

# Side roads joining the High Street behind the start (OSM): their first 30 m, so the junction mouths exist.
# Give-way markings at these mouths are not mapped and are not drawn.
def stub(rid, name, way, join):
    w = WAYS[way]
    line = [(x, -y) for x, y in w['points']]
    toward_high = math.dist(line[-1], join) < math.dist(line[0], join)
    if toward_high:
        line = line[::-1]          # from the High Street outwards
    out, acc = [], 0.0
    start = LANE + .3                # begin at the High Street's edge
    for a, b in zip(line, line[1:]):
        l = math.dist(a, b)
        for k in range(int(l * 2) + 1):
            t = k / (l * 2) if l else 0
            q = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
            d = acc + l * t
            if start <= d <= start + 30 and (not out or math.dist(out[-1], q) >= 1):
                out.append((round(q[0], 2), round(q[1], 2)))
        acc += l
    if toward_high and w['oneway']:
        out = out[::-1]            # one-way towards the High Street: centreline in the direction of travel
    r = {'id': rid, 'name': name, 'oneway': bool(w['oneway']),
         'centreline': [{'x': x, 'z': z} for x, z in out],
         'lanes': {'count': 1, 'width': 4.0}, 'surfaceHeight': 0, 'pavementWidth': 2.0, 'kerbHeight': 0.12,
         'markings': {'centre': 'none', 'edges': False}, '_osm': f'way {way} (first 30 m from the High Street)'}
    return r
# Every drivable OSM way that meets the High Street behind the start (found from shared nodes).
HIGH_WAYS = {671087285, 820165999, 1307620631, 1307620632, 1307620630, 820166003}
high_points = {tuple(p) for w in HIGH_WAYS for p in WAYS[w]['points']}
STUBS = []
for w in OSM['roads']:
    if w['osmWay'] in HIGH_WAYS or w['highway'] not in ('residential', 'unclassified', 'tertiary', 'secondary', 'primary'):
        continue
    joins = [p for p in w['points'] if tuple(p) in high_points and p[0] < -40]
    if not joins:
        continue
    name = w['name'] or 'unnamed'
    rid = name.lower().replace("'", '').replace(' ', '-') + ('' if name != 'unnamed' else f"-{w['osmWay']}")
    if any(r['id'] == rid for r in STUBS + roads):
        rid += f"-{w['osmWay']}"
    STUBS.append(stub(rid, name, w['osmWay'], (joins[0][0], -joins[0][1])))
roads += STUBS
STUB_IDS = {r['id'] for r in STUBS}
ROADS = {r['id']: r for r in roads}

junctions = [
    {'id': 'rb1', 'kind': 'mini-roundabout', 'position': {'x': RB1[0], 'z': RB1[1]}, 'radius': R1,
     'discDiameter': 2.6, 'entries': ['high-street', 'ingrave-in', 'link-south']},
    {'id': 'rb2', 'kind': 'mini-roundabout', 'position': {'x': RB2[0], 'z': RB2[1]}, 'radius': R2,
     'discDiameter': 2.6, 'entries': ['link-north', 'shenfield-in', 'ongar-in']},
]

# ---- geometry helpers (world x, z) ----
def poly(rid):
    return [(p['x'], p['z']) for p in ROADS[rid]['centreline']]

def length(line):
    return sum(math.dist(a, b) for a, b in zip(line, line[1:]))

def point_at(line, s):
    """Point and unit direction at distance s along a polyline."""
    for a, b in zip(line, line[1:]):
        l = math.dist(a, b)
        if s <= l or b == line[-1]:
            ux, uz = (b[0] - a[0]) / l, (b[1] - a[1]) / l
            return (a[0] + ux * s, a[1] + uz * s), (ux, uz)
        s -= l

def lane_line(rid, offset, s0, s1, step=2.0):
    """Points along a road between distances s0..s1, offset to the right of travel."""
    line, out = poly(rid), []
    n = max(1, int(abs(s1 - s0) / step))
    for k in range(n + 1):
        (x, z), (ux, uz) = point_at(line, s0 + (s1 - s0) * k / n)
        out.append((x + -uz * offset, z + ux * offset))
    return out

def connector(a_end, a_dir, b_start, b_dir, node, clearance):
    """Quadratic curve through a junction, kept clear of the painted disc."""
    # Control point: where the two lane lines would meet.
    det = a_dir[0] * -b_dir[1] - a_dir[1] * -b_dir[0]
    if abs(det) < 1e-6:
        c = ((a_end[0] + b_start[0]) / 2, (a_end[1] + b_start[1]) / 2)
    else:
        dx, dz = b_start[0] - a_end[0], b_start[1] - a_end[1]
        t = (dx * -b_dir[1] - dz * -b_dir[0]) / det
        c = (a_end[0] + a_dir[0] * t, a_end[1] + a_dir[1] * t)
    for _ in range(40):
        curve = [((1 - t) ** 2 * a_end[0] + 2 * (1 - t) * t * c[0] + t * t * b_start[0],
                  (1 - t) ** 2 * a_end[1] + 2 * (1 - t) * t * c[1] + t * t * b_start[1]) for t in [k / 10 for k in range(1, 10)]]
        if min(math.dist(p, node) for p in curve) >= clearance:
            return curve
        # Push the control point away from the disc.
        vx, vz = c[0] - node[0], c[1] - node[1]
        l = math.hypot(vx, vz) or 1
        c = (c[0] + vx / l * .3, c[1] + vz / l * .3)
    raise SystemExit('connector could not clear the disc')

def leg_end(rid, offset, at):
    (x, z), (ux, uz) = point_at(poly(rid), at)
    return (x + -uz * offset, z + ux * offset), (ux, uz)

CLEAR = 2.6 / 2 + 1.2   # disc radius + half car width + margin
L_high, L_link, L_shen = length(poly('high-street')), length(poly('link-north')), length(poly('shenfield-out'))

# Spawn: the first Street View point (S0), on the eastbound lane, heading along the road.
S0 = (-29.53, 18.95)
best = min(((math.dist(S0, point_at(poly('high-street'), s)[0]), s) for s in [i * .25 for i in range(int(L_high * 4))]))
spawn_s = best[1]
(spawn_xz, spawn_dir) = leg_end('high-street', -LANE / 2, spawn_s)
spawn_heading = math.degrees(math.atan2(spawn_dir[0], -spawn_dir[1])) % 360

route = lane_line('high-street', -LANE / 2, max(0, spawn_s - 15), L_high - R1)
a, ad = leg_end('high-street', -LANE / 2, L_high - R1)
b, bd = leg_end('link-north', -LANE / 2, R1)
route += connector(a, ad, b, bd, RB1, CLEAR)
route += lane_line('link-north', -LANE / 2, R1, L_link - R2)
a, ad = leg_end('link-north', -LANE / 2, L_link - R2)
b, bd = leg_end('shenfield-out', 0, R2)
route += connector(a, ad, b, bd, RB2, CLEAR)
route += lane_line('shenfield-out', 0, R2, L_shen)
route += lane_line('shenfield-road', -LANE / 2, 4, length(poly('shenfield-road')))
route = [{'x': round(x, 2), 'z': round(z, 2)} for x, z in route]

def seg_dist(p, a, b):
    dx, dz = b[0] - a[0], b[1] - a[1]
    l2 = dx * dx + dz * dz or 1
    t = max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2))
    return math.dist(p, (a[0] + dx * t, a[1] + dz * t))

def line_dist(p, line):
    return min(seg_dist(p, a, b) for a, b in zip(line, line[1:]))

HIGH_LINE = poly('high-street')
# The OSM download's bbox in world metres (x east, z south), less a margin: nothing is placed where we have no map data.
OSM_BOX = (-659.9 + 8, 445.6 - 8, -410.6 + 8, 424.3 - 8)
def in_scene(x, z, corridor=75):
    """The area dressed: within `corridor` metres of any modelled road, inside the OSM download."""
    if not (OSM_BOX[0] <= x <= OSM_BOX[1] and OSM_BOX[2] <= z <= OSM_BOX[3]):
        return False
    return any(line_dist((x, z), poly(r['id'])) < corridor for r in roads)

# Trees (OSM) and the William Hunter memorial.
trees = [{'x': f['x'], 'z': -f['y']} for f in OSM['features'] if f['kind'] == 'tree' and in_scene(f['x'], -f['y'], 60)]
memorial = next(f for f in OSM['features'] if f['kind'] == 'memorial' and f['osmNode'] == 2094174805)  # William Hunter Memorial
# The memorial is an obelisk; its size here is an estimate (not surveyed).
blocks = [{'id': 'william-hunter-memorial', 'kind': 'wall', 'shape': 'obelisk', 'position': {'x': memorial['x'], 'z': -memorial['y']},
           'size': {'width': 1.6, 'depth': 1.6, 'height': 7}, 'occludes': True, 'colour': '#b9b4a8'}]

# Building use from OSM tags; storeys from building:levels where mapped, otherwise estimated from the use.
USE = {'retail': 'shop', 'restaurant': 'shop', 'cafe': 'shop', 'office': 'office', 'school': 'school',
       'church': 'church', 'cathedral': 'church', 'parking': 'parking', 'garage': 'utility', 'substation': 'utility',
       'residential': 'residential', 'apartments': 'residential', 'house': 'residential', 'terrace': 'residential'}
ESTIMATED_LEVELS = {'shop': 3, 'office': 3, 'other': 3, 'residential': 2, 'school': 2, 'church': 1, 'parking': 2, 'utility': 1, 'civic': 2}
STOREY = 3.2
def building_use(b):
    """Shops (shopfronts) only where OSM maps a shop, café, restaurant, bank, pharmacy or pub; offices and
    surgeries get ordinary windows."""
    use = USE.get(b['building'], 'other')
    if use in ('school', 'church', 'parking'):
        return use
    if b['business'] == 'shop' or b['shopPoints'] > 0:
        return 'shop'
    if b['business'] == 'office' or b['officePoints'] > 0:
        return 'office'
    return use

buildings = []
# Buildings within 75 m of a modelled road are drawn in full; those 75-170 m away form a background ring in
# lower detail (walls and roofs, no windows), so the views do not end at the edge of the dressed streets.
NEAR, FAR = 75, 170
for b in OSM['buildings']:
    if any(in_scene(x, -y, FAR) for x, y in b['polygon']):
        use = building_use(b)
        mapped = b.get('levels')
        levels = int(float(mapped)) if mapped else ESTIMATED_LEVELS[use]
        if use == 'church':
            height = 10.0                       # tall single volume (estimate)
        elif use == 'utility':
            height = 3.6
        else:
            height = round(STOREY * levels + .6, 1)   # storeys plus a parapet
        entry = {'id': f"osm-{b['osmWay']}", 'height': height, 'levels': levels,
                 'heightSource': 'map-levels' if mapped else 'estimated', 'use': use,
                 'footprint': [{'x': x, 'z': -y} for x, y in b['polygon']]}
        if b.get('name'):
            entry['name'] = b['name']
        if not any(in_scene(x, -y, NEAR) for x, y in b['polygon']):
            entry['detail'] = 'low'
        buildings.append(entry)

areas = [{'kind': 'parking' if a['kind'] == 'parking' else 'grass', 'polygon': [{'x': x, 'z': -y} for x, y in a['polygon']]}
         for a in OSM['areas'] if any(in_scene(x, -y, 60) for x, y in a['polygon'])]

def inside(p, ring):
    hit = False
    for (x1, z1), (x2, z2) in zip(ring, ring[1:] + ring[:1]):
        if (z1 > p[1]) != (z2 > p[1]) and p[0] < x1 + (p[1] - z1) * (x2 - x1) / (z2 - z1):
            hit = not hit
    return hit

def frame_at(rid, s):
    """Point and unit direction on a road's centreline at distance s; right of travel is (-dz, dx)."""
    (x, z), (ux, uz) = point_at(poly(rid), max(0, min(length(poly(rid)), s)))
    return (x, z), (ux, uz)

def offset_point(rid, s, lateral):
    (x, z), (ux, uz) = frame_at(rid, s)
    return (x - uz * lateral, z + ux * lateral)

RINGS = [([(q['x'], q['z']) for q in b['footprint']], b['use']) for b in buildings]

# Pavements up to the shop fronts. Where a mapped shop faces the road, the pavement runs from the kerb to its
# front wall (less 0.3 m). Reference: OSM building outlines, with OSM trees, bus stops and cycle stands standing
# 4-12 m from the centreline on these stretches. The kerb line itself stays at the modelled lane edge; it is not
# surveyed. Elsewhere the pavement is 2 m (with paved ground beyond).
STATION = 2.5
def project(rid, q):
    """(along, signed lateral: + right of travel) of a point on a road's centreline."""
    line, acc, best = poly(rid), 0.0, None
    for a, b in zip(line, line[1:]):
        dx, dz = b[0] - a[0], b[1] - a[1]
        l = math.hypot(dx, dz) or 1
        t = max(0, min(l, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dz) / l))
        px_, pz_ = a[0] + dx * t / l, a[1] + dz * t / l
        d = math.hypot(q[0] - px_, q[1] - pz_)
        if best is None or d < best[0]:
            best = (d, acc + t, (q[0] - px_) * (-dz / l) + (q[1] - pz_) * (dx / l))
        acc += l
    return best

# Shop walls, sampled every 0.5 m: the pavement in each 5 m station runs to the nearest shop wall point there
# (so walls at an angle to the road are reached too), when that wall faces this road from within 16 m of the kerb.
def wall_samples(rings):
    """Points every 0.5 m along every building wall, each with whether the building is a shop."""
    out = []
    for ring, use in rings:
        for a, b in zip(ring, ring[1:] + ring[:1]):
            l = math.dist(a, b)
            for k in range(int(l * 2) + 1):
                t = k / (l * 2) if l else 0
                out.append(((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t), use == 'shop'))
    return out
WALL_SAMPLES = wall_samples(RINGS)

def pavement_profile(rid):
    r = ROADS[rid]
    half = r['lanes']['count'] * r['lanes']['width'] / 2
    total = length(poly(rid))
    stations = [i * STATION for i in range(int(total // STATION) + 1)] + [total]
    nearest, nearest_any = {}, {}
    for q, shop in WALL_SAMPLES:
        d, along, lat = project(rid, q)
        if not (0 <= along <= total) or abs(lat) - half > 16.3 or abs(lat) <= half:
            continue
        # Only walls this road is the nearest modelled road to (not walls facing another street).
        if any(r2['id'] != rid and project(r2['id'], q)[0] < d - .5 for r2 in roads):
            continue
        # Nothing else (another building) in between.
        side = 1 if lat > 0 else -1
        # Each wall point limits the stations within one station spacing of it, so the pavement interpolated
        # between stations cannot cut a corner of the building.
        w = round(abs(lat) - half - .3, 1)
        for i in range(len(stations)):
            if abs(stations[i] - along) <= STATION:
                nearest_any[(i, side)] = min(nearest_any.get((i, side), 99), w)
                if shop:
                    nearest[(i, side)] = min(nearest.get((i, side), 99), w)
    widths = {-1: [], 1: []}
    for i in range(len(stations)):
        for side in (-1, 1):
            w = nearest.get((i, side))
            # Widen only where the nearest building at this station is a shop (never under another building).
            if w is not None and nearest_any[(i, side)] < w - .5:
                w = None
            widths[side].append(max(r['pavementWidth'], w) if w is not None else r['pavementWidth'])
    for side in (-1, 1):
        ws = widths[side]
        # Fill short breaks (alleys, a gap between shop units) of up to 15 m between widened stations.
        wide = [i for i, w in enumerate(ws) if w > r['pavementWidth']]
        for a, b in zip(wide, wide[1:]):
            if 1 < b - a <= 15 // STATION + 1:
                for i in range(a + 1, b):
                    ws[i] = min(round(ws[a] + (ws[b] - ws[a]) * (i - a) / (b - a), 1), max(r['pavementWidth'], nearest_any.get((i, side), 99)))
    if all(w == r['pavementWidth'] for side in (-1, 1) for w in widths[side]):
        return None
    return [{'along': round(st, 1), 'left': widths[-1][i], 'right': widths[1][i]} for i, st in enumerate(stations)]

for r in roads:
    prof = pavement_profile(r['id'])
    if prof:
        r['pavementProfile'] = prof

def pavement_at(rid, s, side):
    r = ROADS[rid]
    prof = r.get('pavementProfile')
    if not prof:
        return r['pavementWidth']
    key = 'left' if side < 0 else 'right'
    if s <= prof[0]['along']:
        return prof[0][key]
    for a, b in zip(prof, prof[1:]):
        if s <= b['along']:
            t = (s - a['along']) / ((b['along'] - a['along']) or 1)
            return a[key] + (b[key] - a[key]) * t
    return prof[-1][key]

# Approximate buildings where the street is built up but OSM has no outline. Placed along modelled road frontages,
# behind the pavement, only where nothing mapped is there: no OSM building, road, footway, service road, car park,
# park or grass, tree, junction or other placed building. They are marked source 'approximate' and drawn like the
# others, without shopfronts (what they contain is not known).
# ---- Reference buildings: Microsoft ML building outlines (via Overture Maps, ODbL) where OSM has none ----
# Machine-detected footprints with machine-estimated heights. Kept only where they do not overlap an OSM building,
# a mapped car park or park, or the modelled carriageways and pavements (outlines that cross them are trimmed, or
# dropped if most of the outline would go). Marked source 'reference', heightSource 'reference-estimated'.
from shapely.geometry import Polygon, LineString, Point
from shapely.ops import unary_union
OVERTURE = json.loads((ROOT / 'content/sources/overture-buildings-brentwood-2026-09-23.1.json').read_text())
def local(lon, lat):
    return ((lon - OSM['origin']['lng']) * 111320 * math.cos(math.radians(OSM['origin']['lat'])),
            -(lat - OSM['origin']['lat']) * 111320)

def road_surface(rid):
    """Carriageway and pavement of a modelled road (pavement profile included) as a polygon."""
    r = ROADS[rid]
    half = r['lanes']['count'] * r['lanes']['width'] / 2
    total = length(poly(rid))
    n = max(2, int(total / 2))
    left, right = [], []
    for k in range(n + 1):
        st = total * k / n
        left.append(offset_point(rid, st, -(half + pavement_at(rid, st, -1))))
        right.append(offset_point(rid, st, half + pavement_at(rid, st, 1)))
    # A union of small quads (one long outline can self-intersect on bends and lose pieces when repaired).
    # The simulator treats a disc around each end of a road's centreline as part of the road (distance to the
    # end point), so the ends are rounded here too.
    ends = [Point(*poly(rid)[0]).buffer(half + pavement_at(rid, 0, 1)), Point(*poly(rid)[-1]).buffer(half + pavement_at(rid, total, 1))]
    return unary_union([Polygon([left[k], left[k + 1], right[k + 1], right[k]]).buffer(.05) for k in range(n)] + ends)

KEEP_OUT = unary_union([road_surface(r['id']) for r in roads] +
                       [Point(j['position']['x'], j['position']['z']).buffer(j['radius'] + 2) for j in junctions])
# Other OSM streets (not driven in this exercise): their carriageways as surfaces, so the street network reads as
# connected in the views. Mapped centrelines; widths assumed (3.2 m lanes); not drivable.
MODELLED_WAYS = HIGH_WAYS | {829734450, 793487376, 820166006, 793487370, 793487371, 793487378, 793487372, 424647832,
                             1304276722, 793487377, 1304276721, 725959965} | {int(r['_osm'].split()[1]) for r in STUBS}
OTHER_STREETS = unary_union([LineString([(x, -y) for x, y in w['points']]).buffer((w['lanes'] or (1 if w['oneway'] else 2)) * 1.6, cap_style=2)
                             for w in OSM['roads'] if w['osmWay'] not in MODELLED_WAYS and len(w['points']) > 1]).difference(KEEP_OUT.buffer(.2))
ACCESS_SHAPE = unary_union([LineString([(x, -y) for x, y in pth['points']]).buffer(1.5, join_style=2) for pth in OSM['paths']
                            if len(pth['points']) > 1 and not pth['area']])
OSM_BUILDING_SHAPES = [Polygon([(x, -y) for x, y in b['polygon']]).buffer(0) for b in OSM['buildings']]
OSM_OPEN_SHAPES = [Polygon([(x, -y) for x, y in a['polygon']]).buffer(0) for a in OSM['areas']]
ACCESS_LINES = [LineString([(x, -y) for x, y in pth['points']]) for pth in OSM['paths'] if len(pth['points']) > 1 and not pth['area']]

reference, dropped = [], {'overlaps OSM building': 0, 'on a car park or park': 0, 'on a road or pavement': 0, 'outside the scene': 0, 'tiny': 0}
for f in OVERTURE['features']:
    shape = Polygon([local(lon, lat) for lon, lat in f['outline']]).buffer(0)
    if shape.is_empty or shape.area < 12:
        dropped['tiny'] += 1
        continue
    c = shape.centroid
    if not in_scene(c.x, c.y, FAR):
        dropped['outside the scene'] += 1
        continue
    if any(shape.intersection(o).area > .1 * shape.area for o in OSM_BUILDING_SHAPES):
        dropped['overlaps OSM building'] += 1
        continue
    if any(shape.intersection(o).area > .3 * shape.area for o in OSM_OPEN_SHAPES):
        dropped['on a car park or park'] += 1
        continue
    trimmed = shape.difference(KEEP_OUT.buffer(.3)).difference(OTHER_STREETS.buffer(1.0))
    if trimmed.area < .6 * shape.area:
        dropped['on a road or pavement'] += 1
        continue
    if trimmed.geom_type != 'Polygon':
        trimmed = max(trimmed.geoms, key=lambda g: g.area)
    trimmed = trimmed.simplify(.25)
    h = f['height'] if f['height'] else 6.0
    h = max(3.0, min(24.0, h))
    area = trimmed.area
    house_like = area < 220 and h < 10.5
    reference.append({'id': f"ml-{f['id'][:8]}-{len(reference)}", 'shape': trimmed, 'height_total': h,
                      'use': 'residential' if house_like else 'other', 'house_like': house_like,
                      'low': not in_scene(c.x, c.y, NEAR)})

OBST_POLYS = [[(x, -y) for x, y in b['polygon']] for b in OSM['buildings']]
OBST_POLYS += [list(r['shape'].exterior.coords)[:-1] for r in reference]
OBST_POLYS += [[(x, -y) for x, y in a['polygon']] for a in OSM['areas']]
OBST_LINES = [([(x, -y) for x, y in w['points']], 5.5) for w in OSM['roads']]
OBST_LINES += [([(x, -y) for x, y in pth['points']], 3.5 if pth['highway'] in ('service', 'pedestrian') else 2.0) for pth in OSM['paths']]
OBST_POINTS = [((t['x'], t['z']), 1.5) for t in trees] + [((j['position']['x'], j['position']['z']), j['radius'] + 6) for j in junctions]
# The memorial's setting at Wilson's Corner stays open.
OBST_POINTS += [((memorial['x'], -memorial['y']), 15)]
def blocked(q, extra_polys):
    if any(inside(q, ring) or line_dist(q, ring + ring[:1]) < 1.0 for ring in OBST_POLYS + extra_polys):
        return True
    if any(math.dist(q, c) < m for c, m in OBST_POINTS):
        return True
    for line, m in OBST_LINES:
        if len(line) > 1 and line_dist(q, line) < m:
            return True
    # Modelled roads (their carriageway and pavement).
    for r2 in roads:
        half2 = r2['lanes']['count'] * r2['lanes']['width'] / 2
        if line_dist(q, poly(r2['id'])) < half2 + 2.2:
            return True
    return False

infill, infill_polys = [], []
FRONTAGE_SHAPES = OSM_BUILDING_SHAPES + [r['shape'] for r in reference]
# Businesses and addresses mapped as points with no building outline around them (OSM): evidence that a building
# stands there although neither OSM nor the Microsoft outlines have it.
ALL_OUTLINES = unary_union(FRONTAGE_SHAPES).buffer(1.0)
ORPHANS = [(Point(f['x'], -f['y']), f) for f in OSM['features'] if f['kind'].startswith('poi-')
           and not ALL_OUTLINES.contains(Point(f['x'], -f['y'])) and in_scene(f['x'], -f['y'], NEAR)]
UNIT, DEPTH, MIN_DEPTH, SETBACK = 9.0, 10.0, 6.0, .5
for r in roads:
    rid = r['id']
    half = r['lanes']['count'] * r['lanes']['width'] / 2
    total = length(poly(rid))
    for side in (-1, 1):
        s = 0.0
        while s + UNIT <= total:
            def quad(depth, s0=s):
                pb0 = half + pavement_at(rid, s0, side) + SETBACK
                pb1 = half + pavement_at(rid, s0 + UNIT, side) + SETBACK
                return [offset_point(rid, s0, side * pb0), offset_point(rid, s0 + UNIT, side * pb1),
                        offset_point(rid, s0 + UNIT, side * (pb1 + depth)), offset_point(rid, s0, side * (pb0 + depth))]
            placed = False
            # Only to close a short gap in a built-up frontage: a mapped or reference building within 12 m on both
            # sides along the street. With Microsoft's outlines in hand, longer stretches without any building are
            # most likely really open (forecourts, yards, car parks, gardens) and are left as ground.
            def neighbour(s0, s1):
                lat0, lat1 = half + pavement_at(rid, (s0 + s1) / 2, side) + SETBACK, half + pavement_at(rid, (s0 + s1) / 2, side) + SETBACK + 12
                probe = Polygon([offset_point(rid, max(0, s0), side * lat0), offset_point(rid, min(total, s1), side * lat0),
                                 offset_point(rid, min(total, s1), side * lat1), offset_point(rid, max(0, s0), side * lat1)]).buffer(0)
                return any(probe.intersects(g) for g in FRONTAGE_SHAPES)
            evidence = []
            gap = rid not in STUB_IDS and neighbour(s - 12, s) and neighbour(s + UNIT, s + UNIT + 12)
            if not gap:
                s += 1.0
                continue
            for depth in (DEPTH, 8.0, MIN_DEPTH):
                q4 = quad(depth)
                if not all(in_scene(x, z, 40) for x, z in q4):
                    break
                # Probe a 1 m grid inside the quad.
                ok = True
                for i in range(int(UNIT) + 1):
                    for j in range(int(depth) + 1):
                        u, v = i / UNIT, j / depth
                        a = (q4[0][0] + (q4[1][0] - q4[0][0]) * u, q4[0][1] + (q4[1][1] - q4[0][1]) * u)
                        b = (q4[3][0] + (q4[2][0] - q4[3][0]) * u, q4[3][1] + (q4[2][1] - q4[3][1]) * u)
                        q = (a[0] + (b[0] - a[0]) * v, a[1] + (b[1] - a[1]) * v)
                        if blocked(q, infill_polys):
                            ok = False
                            break
                    if not ok:
                        break
                if ok:
                    # Height: three storeys beside shops, otherwise two (estimated).
                    mid = ((q4[0][0] + q4[2][0]) / 2, (q4[0][1] + q4[2][1]) / 2)
                    near_shop = any(use == 'shop' and line_dist(mid, ring + ring[:1]) < 30 for ring, use in RINGS)
                    levels = 3 if near_shop else 2
                    k = len(infill)
                    entry = {'id': f'approx-{rid}-{k}', 'height': round(STOREY * levels + .6, 1), 'levels': levels,
                             'heightSource': 'estimated', 'use': 'other', 'source': 'approximate',
                             'footprint': [{'x': round(x, 2), 'z': round(z, 2)} for x, z in q4]}
                    if evidence:
                        # Use from the mapped point: a shop, café, pub etc. gets a shopfront; an office windows.
                        kinds = {f['kind'] for f in evidence}
                        entry['use'] = 'shop' if 'poi-shop' in kinds else 'office' if 'poi-office' in kinds else 'other'
                        entry['evidence'] = '; '.join(f"OSM node {f['osmNode']}" + (f" ({f['name']})" if f['name'] else '') +
                                                      (f", {f['address']}" if f.get('address') else '') for f in evidence)
                    else:
                        entry['evidence'] = 'gap of under 21 m in a built-up frontage (mapped or reference buildings on both sides)'
                    infill.append(entry)
                    infill_polys.append(q4)
                    placed = True
                    break
            s += UNIT if placed else 1.0

# Blocks around businesses and addresses mapped as points with no outline (OSM): the points are grouped
# (15 m apart or closer) and each group gets one block, its outline the points buffered by 6 m, trimmed clear of
# roads, pavements, other streets, footways, open areas and existing buildings. Position and size are estimates;
# the evidence is recorded on each block.
groups = []
for pt, f in ORPHANS:
    near = [g for g in groups if any(pt.distance(q) <= 15 for q, _ in g)]
    merged = [(pt, f)] + [m for g in near for m in g]
    groups = [g for g in groups if g not in near] + [merged]
CLEAR = unary_union([KEEP_OUT.buffer(.5, join_style=2), OTHER_STREETS.buffer(1.0, join_style=2), ACCESS_SHAPE,
                     unary_union(OSM_OPEN_SHAPES), unary_union(FRONTAGE_SHAPES).buffer(.5, join_style=2),
                     unary_union([Polygon(q) for q in infill_polys]).buffer(.5, join_style=2)])
STREET_LINES = [LineString(poly(r['id'])) for r in roads] + \
    [LineString([(x, -y) for x, y in w['points']]) for w in OSM['roads'] if len(w['points']) > 1]
def street_direction(pt):
    """Unit direction of the nearest street (modelled or other) at a point."""
    line = min(STREET_LINES, key=lambda l: l.distance(pt))
    d = line.project(pt)
    a, b = line.interpolate(max(0, d - 2)), line.interpolate(min(line.length, d + 2))
    l = math.hypot(b.x - a.x, b.y - a.y) or 1
    return (b.x - a.x) / l, (b.y - a.y) / l
for g in groups:
    # A rectangle aligned with the nearest street, covering the group's points with 5 m to each side along the
    # street and 6 m in front and behind (a parade of shops 12 m deep).
    c = unary_union([pt for pt, _ in g]).centroid
    ux, uz = street_direction(c)
    us = [(pt.x - c.x) * ux + (pt.y - c.y) * uz for pt, _ in g]
    vs = [(pt.x - c.x) * -uz + (pt.y - c.y) * ux for pt, _ in g]
    u0, u1, v0, v1 = min(us) - 5, max(us) + 5, min(vs) - 6, max(vs) + 6
    corner = lambda u, v: (c.x + ux * u - uz * v, c.y + uz * u + ux * v)
    rect = Polygon([corner(u0, v0), corner(u1, v0), corner(u1, v1), corner(u0, v1)])
    block = rect.difference(CLEAR)
    if block.is_empty:
        continue
    if block.geom_type != 'Polygon':
        block = max(block.geoms, key=lambda x: x.area)
    # Drop slivers and tiny corner cuts without moving any edge towards a road (shrink, then grow back).
    block = block.buffer(-.8, join_style=2).buffer(.8, join_style=2).intersection(rect.difference(CLEAR))
    if block.is_empty:
        continue
    if block.geom_type != 'Polygon':
        block = max(block.geoms, key=lambda x: x.area)
    # Fewer corners, then trimmed again so simplifying cannot move an edge onto a road.
    block = block.simplify(.5).difference(CLEAR)
    if block.is_empty:
        continue
    if block.geom_type != 'Polygon':
        block = max(block.geoms, key=lambda x: x.area)
    if block.area < 30:
        continue
    kinds = {f['kind'] for _, f in g}
    use = 'shop' if 'poi-shop' in kinds else 'office' if 'poi-office' in kinds else 'other'
    ring = [(round(x, 2), round(z, 2)) for x, z in list(block.exterior.coords)[:-1]]
    infill.append({'id': f'approx-poi-{len(infill)}', 'height': round(STOREY * 2 + .6, 1), 'levels': 2,
                   'heightSource': 'estimated', 'use': use, 'source': 'approximate',
                   'evidence': '; '.join(f"OSM node {f['osmNode']}" + (f" ({f['name']})" if f['name'] else '') +
                                         (f", {f['address']}" if f.get('address') else '') for _, f in g),
                   'footprint': [{'x': x, 'z': z} for x, z in ring]})
    infill_polys.append(ring)
buildings += infill

# Second pass: pavements reach the fronts of approximate shops too.
RINGS = [([(q['x'], q['z']) for q in b['footprint']], b['use']) for b in buildings]
WALL_SAMPLES = wall_samples(RINGS + [(list(x['shape'].exterior.coords)[:-1], 'other') for x in reference])
for r in roads:
    prof = pavement_profile(r['id'])
    if prof:
        r['pavementProfile'] = prof
KEEP_OUT = unary_union([road_surface(r['id']) for r in roads] +
                       [Point(j['position']['x'], j['position']['z']).buffer(j['radius'] + 2) for j in junctions])

# Roof styles (representative: OSM maps no roof shapes here). House-sized buildings (under 220 m2, under
# 10.5 m) with a simple four-sided outline get a pitched roof; everything else a flat roof behind a parapet.
def four_sided(ring):
    shp = Polygon(ring).simplify(.6)
    return len(shp.exterior.coords) - 1 == 4 and shp.area > .8 * shp.minimum_rotated_rectangle.area

for r in reference:
    ring = [(round(x, 2), round(z, 2)) for x, z in list(r['shape'].exterior.coords)[:-1]]
    if r['house_like'] and four_sided(ring):
        ring = [(round(x, 2), round(z, 2)) for x, z in list(Polygon(ring).simplify(.6).exterior.coords)[:-1]]
        short = min(math.dist(ring[i], ring[(i + 1) % 4]) for i in range(4))
        rise = round(min(3.2, max(1.6, short * .35)), 1)
        walls, roof = max(3.0, r['height_total'] - rise), 'pitched'
    else:
        walls, roof = r['height_total'], 'flat'
    levels = max(1, round((walls - .6) / 3.0))
    entry = {'id': r['id'], 'height': round(walls, 1), 'levels': levels, 'heightSource': 'reference-estimated',
             'use': r['use'], 'source': 'reference', 'roof': roof,
             'footprint': [{'x': x, 'z': z} for x, z in ring]}
    if r['low']:
        entry['detail'] = 'low'
    buildings.append(entry)
for b in buildings:
    if b.get('source', 'map') == 'map' and b['use'] == 'residential' and four_sided([(q['x'], q['z']) for q in b['footprint']]) \
            and Polygon([(q['x'], q['z']) for q in b['footprint']]).area < 220:
        b['roof'] = 'pitched'
    b.setdefault('roof', 'flat')

# ---- Ground: buildings, gardens, forecourts and yards, parking, access routes ----
# The ground of the town centre is paving (forecourts, yards, wide pavements). Gardens (grass) are drawn around
# house-sized buildings outside the commercial core; OSM footways and service roads are drawn as paths and
# access drives. Representative: plot boundaries are not mapped.
SHOP_SHAPES = [Polygon([(q['x'], q['z']) for q in b['footprint']]).buffer(0) for b in buildings if b['use'] == 'shop']
CORE = unary_union([g.buffer(14) for g in SHOP_SHAPES] + [LineString(HIGH_LINE).buffer(22)])
HOUSES = [Polygon([(q['x'], q['z']) for q in b['footprint']]).buffer(0) for b in buildings
          if b.get('roof') == 'pitched' or b['use'] == 'residential']
ACCESS = unary_union([l.buffer(1.2) for l in ACCESS_LINES] +
                     [LineString([(x, -y) for x, y in pth['points']]).buffer(2.4) for pth in OSM['paths']
                      if pth['highway'] in ('service',) and len(pth['points']) > 1])
SCENE_BOX = Polygon([(OSM_BOX[0], OSM_BOX[2]), (OSM_BOX[1], OSM_BOX[2]), (OSM_BOX[1], OSM_BOX[3]), (OSM_BOX[0], OSM_BOX[3])]) \
    .intersection(unary_union([LineString(poly(r['id'])).buffer(FAR) for r in roads]))
gardens = unary_union([h.buffer(7, join_style=2) for h in HOUSES]).difference(CORE).difference(KEEP_OUT.buffer(.2)) \
    .difference(ACCESS).difference(unary_union(OSM_OPEN_SHAPES)).intersection(SCENE_BOX)
access = ACCESS.difference(KEEP_OUT.buffer(.2)).intersection(SCENE_BOX)
streets = OTHER_STREETS.intersection(SCENE_BOX)
# Car parks shown by OSM parking aisles (service=parking_aisle) but not mapped as areas: the aisle with a row of
# bays each side (about 8 m either side of the aisle line), clear of buildings, roads and other areas.
ALL_BUILDINGS = unary_union([Polygon([(q['x'], q['z']) for q in b['footprint']]).buffer(0) for b in buildings])
aisle_parks = unary_union([LineString([(x, -y) for x, y in pth['points']]).buffer(8, cap_style=2, join_style=2)
                           for pth in OSM['paths'] if pth.get('service') == 'parking_aisle' and len(pth['points']) > 1])
aisle_parks = aisle_parks.difference(ALL_BUILDINGS.buffer(1)).difference(KEEP_OUT.buffer(.3)).difference(OTHER_STREETS) \
    .difference(unary_union(OSM_OPEN_SHAPES)).intersection(SCENE_BOX)
gardens = gardens.difference(aisle_parks)
gardens = gardens.difference(streets.buffer(1.5))
access = access.difference(streets)

def area_entries(geom, kind, min_area=6):
    """Simple polygons for the location (holes are triangulated, as the renderer draws simple polygons)."""
    out = []
    parts = [geom] if geom.geom_type == 'Polygon' else list(getattr(geom, 'geoms', []))
    for part in parts:
        if part.geom_type != 'Polygon' or part.area < min_area:
            continue
        part = part.simplify(.3)
        if part.is_empty or part.geom_type != 'Polygon':
            continue
        pieces = [part] if not part.interiors else [t for t in constrained_delaunay_triangles(part).geoms]
        for piece in pieces:
            out.append({'kind': kind, 'polygon': [{'x': round(x, 2), 'z': round(z, 2)} for x, z in list(piece.exterior.coords)[:-1]]})
    return out
from shapely import constrained_delaunay_triangles
# Open land the references do not explain (no building in OSM or the Microsoft outlines, no mapped area): patches of
# 200 m2 or more beside the junctions (within 45 m) or with mapped trees are drawn as landscaped grass, the rest
# stays paving (forecourts, yards). Representative: listed in the docs for checking against imagery.
ALL_TREES = [Point(f['x'], -f['y']) for f in OSM['features'] if f['kind'] == 'tree']
NEAR_ZONE = unary_union([LineString(poly(r['id'])).buffer(NEAR) for r in roads]).intersection(SCENE_BOX)
used = unary_union([ALL_BUILDINGS.buffer(1.5), KEEP_OUT.buffer(.3), OTHER_STREETS.buffer(.5), ACCESS, gardens, aisle_parks,
                    unary_union(OSM_OPEN_SHAPES)])
residual = NEAR_ZONE.difference(used)
green, open_patches = [], []
for part in (residual.geoms if residual.geom_type != 'Polygon' else [residual]):
    part = part.buffer(-1, join_style=2).buffer(1, join_style=2)
    for piece in (part.geoms if part.geom_type == 'MultiPolygon' else [part]):
        if piece.is_empty or piece.area < 200:
            continue
        near_junction = any(piece.distance(Point(j['position']['x'], j['position']['z'])) < 45 for j in junctions)
        has_tree = any(piece.contains(t) for t in ALL_TREES)
        c = piece.representative_point()
        lat = OSM['origin']['lat'] - c.y / 111320
        lon = OSM['origin']['lng'] + c.x / (111320 * math.cos(math.radians(OSM['origin']['lat'])))
        open_patches.append({'x': round(c.x), 'z': round(c.y), 'lat': round(lat, 6), 'lon': round(lon, 6), 'area': round(piece.area),
                             'drawnAs': 'green' if near_junction or has_tree else 'paving',
                             'map': f'https://www.openstreetmap.org/?mlat={lat:.6f}&mlon={lon:.6f}#map=19/{lat:.6f}/{lon:.6f}'})
        if near_junction or has_tree:
            green.append(piece)
areas += area_entries(gardens, 'garden') + area_entries(unary_union(green) if green else Polygon(), 'green') + \
    area_entries(aisle_parks, 'parking') + area_entries(access, 'access') + area_entries(streets, 'street')

def nearest_on_roads(p):
    """(distance to centreline, road, point on centreline, unit direction) of the nearest modelled road."""
    best = None
    for r in roads:
        line = poly(r['id'])
        for a, b in zip(line, line[1:]):
            dx, dz = b[0] - a[0], b[1] - a[1]
            l2 = dx * dx + dz * dz or 1
            t = max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2))
            q = (a[0] + dx * t, a[1] + dz * t)
            d = math.dist(p, q)
            if best is None or d < best[0]:
                l = math.sqrt(l2)
                best = (d, r, q, (dx / l, dz / l))
    return best

# Bus stops mapped in OSM beside a road we model: a pole at the back of the kerb, flag facing the road.
furniture, skipped_stops = [], []
for f in OSM['features']:
    if f['kind'] != 'bus-stop':
        continue
    p = (f['x'], -f['y'])
    d, r, q, (ux, uz) = nearest_on_roads(p)
    half = r['lanes']['count'] * r['lanes']['width'] / 2
    along_stop = min(((math.dist(q, point_at(poly(r['id']), t)[0]), t) for t in [i * .5 for i in range(int(length(poly(r['id'])) * 2))]))[1]
    if r['id'] in STUB_IDS or d > half + pavement_at(r['id'], along_stop, 1 if (p[0] - q[0]) * -uz + (p[1] - q[1]) * ux > 0 else -1) + 3:
        skipped_stops.append(f"{f['osmNode']} ({f['name']}, {d:.0f} m from {r['id']})")
        continue
    side = 1 if (p[0] - q[0]) * -uz + (p[1] - q[1]) * ux > 0 else -1
    lateral = half + .5
    pos = (q[0] + -uz * side * lateral, q[1] + ux * side * lateral)
    facing = math.degrees(math.atan2(-(-uz * side), (ux * side))) % 360
    furniture.append({'kind': 'bus-stop', 'position': {'x': round(pos[0], 2), 'z': round(pos[1], 2)},
                      'facingDeg': round(facing, 1), 'source': f"OSM node {f['osmNode']} ({f['name']})"})

# Signal crossing position. Its lights are not simulated, so no signal heads are drawn:
# a decorative signal that never changes would mislead the learner.
def along_of(rid, xz):
    line = poly(rid)
    return round(min(((math.dist(xz, point_at(line, s)[0]), s) for s in [i * .25 for i in range(int(length(line) * 4))]))[1], 1)
xing_s = along_of('high-street', (-17.51, 15.85))
# The High Street signal crossings behind the start (OSM nodes 1763175237 and 1763175242).
xing_west = along_of('high-street', (-99.17, 55.57))
xing_west2 = along_of('high-street', (-266.3, 125.5))
# OSM: the High Street west of node 1763175237 (way 671087285) has no lane markings.
ROADS['high-street']['markings']['centreFrom'] = xing_west

location = {
    'schemaVersion': 2,
    'id': 'brentwood-paired-mini-roundabouts',
    'name': 'Brentwood paired mini-roundabouts (area-inspired)',
    'fidelity': 'geographically-inspired',
    'drivingSide': 'left',
    'description': 'Area-inspired layout of the paired mini-roundabouts at High Street, Ingrave Road, '
                   "Wilson's Corner, Shenfield Road and Ongar Road, Brentwood. Not an official test route. "
                   'Road centrelines from OpenStreetMap; lane counts and widths simplified; '
                   'building outlines from OpenStreetMap ("map") and, where it has none, Microsoft machine-detected '
                   'outlines via Overture Maps ("reference"); buildings marked approximate are placeholders placed on '
                   'the evidence recorded with each; pavement widths to the shop fronts derived from map data; '
                   'gardens, landscaped open land, roof styles and street lights are representative; traffic '
                   'signals are not simulated (an exercise may hold them at green).',
    'sources': [
        {'title': 'OpenStreetMap', 'licence': 'ODbL 1.0, © OpenStreetMap contributors',
         'url': 'https://www.openstreetmap.org/copyright',
         'notes': 'API 0.6 map call, bbox 0.2960,51.6175,0.3120,51.6250, downloaded 2026-10-18. '
                  'Generated by tools/brentwood/build_location.py; way ids per road in docs/brentwood/SOURCES.md.'},
        {'title': 'Overture Maps buildings (Microsoft ML Buildings)', 'licence': 'ODbL 1.0, © OpenStreetMap contributors, Overture Maps Foundation, Microsoft',
         'url': 'https://docs.overturemaps.org/attribution/',
         'notes': 'Release 2026-09-23.1, theme=buildings, bbox 0.296,51.617,0.312,51.626, read 2026-10-18 (tools/brentwood/overture_extract.py). '
                  'Only machine-detected outlines with no OpenStreetMap equivalent; used where OSM has no outline (source "reference").'},
        {'title': 'Google Street View (visual reference only)', 'licence': 'Not used as assets',
         'notes': 'Used only to place the start point and check lane use; no imagery extracted.'},
    ],
    'reviewStatus': 'unreviewed',
    'roads': [{k: v for k, v in r.items() if k != '_osm'} for r in roads],
    'blocks': blocks,
    'crossings': [{'id': 'high-street-signals', 'roadId': 'high-street', 'kind': 'signal',
                   'along': xing_s,
                   'width': 3.5, 'giveWayOffset': 1.7},
                  {'id': 'high-street-signals-west', 'roadId': 'high-street', 'kind': 'signal',
                   'along': xing_west,
                   'width': 3.5, 'giveWayOffset': 1.7},
                  {'id': 'high-street-signals-west-2', 'roadId': 'high-street', 'kind': 'signal',
                   'along': xing_west2,
                   'width': 3.5, 'giveWayOffset': 1.7}],
    'junctions': junctions,
    'buildings': buildings,
    'trees': trees,
    'ground': 'paved',
    'areas': areas,
    'furniture': furniture,
    # Street lights are not mapped in OSM here: placed at a typical spacing (representative, not surveyed).
    'townLampSpacing': 30,
    'spawn': {'position': {'x': round(spawn_xz[0], 2), 'z': round(spawn_xz[1], 2)},
              'headingDeg': round(spawn_heading, 1), 'roadId': 'high-street'},
}

def zone(zid, rid, a, b, label):
    return {'id': zid, 'roadId': rid, 'from': round(a, 1), 'to': round(b, 1), 'label': label}

scenario = {
    'schemaVersion': 1,
    'id': 'brentwood-guided-traversal',
    'locationId': location['id'],
    'controllerDriving': {'assistedSpeedMph': 18, 'accelerationLimit': 1.5},
    # The High Street signal crossings are real. This exercise simulates no pedestrian phase, so in this exercise
    # only their lights stay green (the briefing says so). Other exercises draw no heads unless they set a state.
    'signals': {'high-street-signals': 'green', 'high-street-signals-west': 'green', 'high-street-signals-west-2': 'green'},
    'title': 'Brentwood mini-roundabouts',
    'learningObjective': 'Approach and drive through two mini-roundabouts close together: plan your lane, '
                         'slow down, give way to traffic from the right, signal correctly and look again before the second one.',
    'briefing': 'High Street, Brentwood (area-inspired, not an official test route). Follow the road to the '
                'mini-roundabout, turn LEFT (first exit) into Wilson’s Corner, keep to the left lane, then go '
                'AHEAD at the second mini-roundabout into Shenfield Road. Quiet traffic: a car ahead shows the way. '
                'The High Street pedestrian crossing lights stay green for you in this exercise: pedestrian '
                'crossing phases are not simulated.',
    'rubricId': 'none',
    'assistPath': route,
    'zones': [
        zone('rb1-approach', 'high-street', L_high - 30, L_high - R1 - 4, 'Approaching mini-roundabout 1'),
        zone('rb1-entry', 'high-street', L_high - R1 - 4, L_high, 'Entering mini-roundabout 1'),
        zone('rb2-approach', 'link-north', R1 + 1, L_link - R2 - 3, "Wilson's Corner, approaching mini-roundabout 2"),
        zone('rb2-entry', 'link-north', L_link - R2 - 3, L_link, 'Entering mini-roundabout 2'),
        zone('finish', 'shenfield-road', 18, 30, 'Shenfield Road, end of the route'),
    ],
    'actors': [
        {'id': 'lead-car', 'kind': 'passing-vehicle', 'body': 'car', 'path': route[20:],
         'speed': 6.5, 'delaySeconds': 0, 'repeat': False, 'colour': '#2563eb'},
    ],
    'triggers': [
        {'id': 'hint-rb1', 'when': {'zoneEntered': 'rb1-approach'}, 'once': True,
         'actions': [{'do': 'show-message', 'text': 'Mini-roundabout ahead: mirrors, signal LEFT, slow down. Give way to traffic from your right.'}]},
        {'id': 'hint-rb2', 'when': {'zoneEntered': 'rb2-approach'}, 'once': True,
         'actions': [{'do': 'show-message', 'text': 'Second mini-roundabout straight away: left lane, going AHEAD. Look right again before you go.'}]},
    ],
    'end': {'zone': 'finish', 'timeLimitSeconds': 240},
}

(ROOT / 'content/locations/brentwood-paired-mini-roundabouts.json').write_text(json.dumps(location, indent=1) + '\n')
(ROOT / 'content/scenarios/brentwood-guided-traversal.json').write_text(json.dumps(scenario, indent=1) + '\n')
print('bus stops placed:', len(furniture), '; not beside a modelled road:', ', '.join(skipped_stops) or 'none')
(ROOT / 'docs/brentwood/open-areas.json').write_text(json.dumps({'note': 'Open land within 75 m of the modelled roads that neither OSM nor the Microsoft outlines explain; drawnAs green = landscaped grass (representative), paving = forecourt/yard. Check against imagery.', 'patches': sorted(open_patches, key=lambda p: -p['area'])}, indent=1))
print('open patches:', len(open_patches), 'green:', len(green))
print('reference (Microsoft ML) buildings:', len(reference), '; dropped:', dropped)
print('approximate buildings:', len(infill), '; roads with wide pavements:', [r['id'] for r in roads if r.get('pavementProfile')])
print(f'roads {len(roads)}, buildings {len(buildings)}, trees {len(trees)}, route points {len(route)}, '
      f'spawn {location["spawn"]}, High St {L_high:.1f} m, link {L_link:.1f} m')
if __import__('os').environ.get('DEBUG_ORPHANS'):
    for pt, f in ORPHANS:
        d, r, q, _ = nearest_on_roads((pt.x, pt.y))
        print('orphan', f['osmNode'], f['kind'], f['name'], f.get('address'), f'({pt.x:.0f},{pt.y:.0f})', f'{d:.1f} m from {r["id"]}',
              'blocked' if blocked((pt.x, pt.y), []) else 'free')
