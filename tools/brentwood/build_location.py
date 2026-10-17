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

# High Street runs west -> east into rb1 so the learner's distance along it grows.
high = pts(1307620631, 1307620632, 1307620630) + pts(820166003, reverse=True)[1:]
roads = [
    road('high-street', 'High Street', 'ways 1307620631, 1307620632, 1307620630, 820166003', high, 2, False),
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

# Trees and the William Hunter memorial near the junctions.
trees = [{'x': f['x'], 'z': -f['y']} for f in OSM['features'] if f['kind'] == 'tree' and abs(f['x']) < 110 and abs(f['y']) < 110]
memorial = next(f for f in OSM['features'] if f['kind'] == 'memorial')
blocks = [{'id': 'william-hunter-memorial', 'kind': 'wall', 'position': {'x': memorial['x'], 'z': -memorial['y']},
           'size': {'width': 1.6, 'depth': 1.6, 'height': 7}, 'occludes': True, 'colour': '#9ca3af'}]
buildings = []
for b in OSM['buildings']:
    if any(abs(x - 5) < 110 and abs(y) < 110 for x, y in b['polygon']):
        levels = b.get('levels')
        buildings.append({'id': f"osm-{b['osmWay']}", 'height': round(3.2 * float(levels), 1) if levels else 9.0,
                          'footprint': [{'x': x, 'z': -y} for x, y in b['polygon']]})

# Signal crossing position. Its lights are not simulated, so no signal heads are drawn:
# a decorative signal that never changes would mislead the learner.
xing_s = round(min(((math.dist((-17.51, 15.85), point_at(poly('high-street'), s)[0]), s)
                    for s in [i * .25 for i in range(int(L_high * 4))]))[1], 1)

location = {
    'schemaVersion': 2,
    'id': 'brentwood-paired-mini-roundabouts',
    'name': 'Brentwood paired mini-roundabouts (area-inspired)',
    'fidelity': 'geographically-inspired',
    'drivingSide': 'left',
    'description': 'Area-inspired layout of the paired mini-roundabouts at High Street, Ingrave Road, '
                   "Wilson's Corner, Shenfield Road and Ongar Road, Brentwood. Not an official test route. "
                   'Road centrelines and building outlines from OpenStreetMap; lane counts and widths simplified; '
                   'traffic signals not simulated.',
    'sources': [
        {'title': 'OpenStreetMap', 'licence': 'ODbL 1.0, © OpenStreetMap contributors',
         'url': 'https://www.openstreetmap.org/copyright',
         'notes': 'API 0.6 map call, bbox 0.3020,51.6195,0.3090,51.6232, downloaded 2026-10-17. '
                  'Generated by tools/brentwood/build_location.py; way ids per road in docs/brentwood/SOURCES.md.'},
        {'title': 'Google Street View (visual reference only)', 'licence': 'Not used as assets',
         'notes': 'Used only to place the start point and check lane use; no imagery extracted.'},
    ],
    'reviewStatus': 'unreviewed',
    'roads': [{k: v for k, v in r.items() if k != '_osm'} for r in roads],
    'blocks': blocks,
    'crossings': [{'id': 'high-street-signals', 'roadId': 'high-street', 'kind': 'signal',
                   'along': xing_s,
                   'width': 3.5, 'giveWayOffset': 1.7}],
    'junctions': junctions,
    'buildings': buildings,
    'trees': trees,
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
    'title': 'Brentwood mini-roundabouts',
    'learningObjective': 'Approach and drive through two mini-roundabouts close together: plan your lane, '
                         'slow down, give way to traffic from the right, signal correctly and look again before the second one.',
    'briefing': 'High Street, Brentwood (area-inspired, not an official test route). Follow the road to the '
                'mini-roundabout, turn LEFT (first exit) into Wilson’s Corner, keep to the left lane, then go '
                'AHEAD at the second mini-roundabout into Shenfield Road. Quiet traffic: a car ahead shows the way.',
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
print(f'roads {len(roads)}, buildings {len(buildings)}, trees {len(trees)}, route points {len(route)}, '
      f'spawn {location["spawn"]}, High St {L_high:.1f} m, link {L_link:.1f} m')
