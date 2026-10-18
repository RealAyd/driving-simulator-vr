"""Draws docs/brentwood/location-review.svg from the built location (content/locations/brentwood-paired-mini-roundabouts.json).

A review plan: carriageways, pavements (including the widened pavements up to shop fronts), buildings from
OpenStreetMap (grey; shops darker) and approximate buildings (orange, hatched), crossings, bus stops, trees,
the memorial and the learner's start. World x east, z south; drawn with north up.
Run: python3 -I tools/brentwood/render_location_review.py
"""
import json, math, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
loc = json.loads((ROOT / 'content/locations/brentwood-paired-mini-roundabouts.json').read_text())

S = 1.25
X0, X1, Z0, Z1 = -560, 260, -250, 300
W, H = (X1 - X0) * S, (Z1 - Z0) * S
px = lambda x, z: ((x - X0) * S, (z - Z0) * S)
out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {H + 120:.0f}" font-family="sans-serif">',
       '<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
       '<line x1="0" y1="0" x2="0" y2="6" stroke="#9a3412" stroke-width="2"/></pattern></defs>',
       f'<rect width="{W:.0f}" height="{H + 120:.0f}" fill="#d9d6cf"/>']
add = out.append

def polygon(points, fill, stroke='none', extra=''):
    add('<polygon points="%s" fill="%s" stroke="%s" %s/>' % (' '.join('%.1f,%.1f' % px(*p) for p in points), fill, stroke, extra))

def along_line(road):
    pts = [(p['x'], p['z']) for p in road['centreline']]
    out, acc = [], 0.0
    for a, b in zip(pts, pts[1:]):
        l = math.dist(a, b)
        n = max(1, int(l / 2))
        for k in range(n):
            t = k / n
            out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, (b[0] - a[0]) / l, (b[1] - a[1]) / l, acc + l * t))
        acc += l
    a, b = pts[-2], pts[-1]
    l = math.dist(a, b)
    out.append((b[0], b[1], (b[0] - a[0]) / l, (b[1] - a[1]) / l, acc))
    return out

def width_at(road, s, side):
    prof = road.get('pavementProfile')
    if not prof:
        return road['pavementWidth']
    key = 'left' if side < 0 else 'right'
    if s <= prof[0]['along']:
        return prof[0][key]
    for a, b in zip(prof, prof[1:]):
        if s <= b['along']:
            t = (s - a['along']) / ((b['along'] - a['along']) or 1)
            return a[key] + (b[key] - a[key]) * t
    return prof[-1][key]

for area in loc.get('areas', []):
    colour = {'grass': '#9cc285', 'garden': '#b7d6a2', 'green': '#c9e3b5', 'parking': '#b9b9bd', 'access': '#a8a8a8', 'street': '#7c7f86'}[area['kind']]
    polygon([(p['x'], p['z']) for p in area['polygon']], colour, colour, 'stroke-width=".3"')
for road in loc['roads']:
    half = road['lanes']['count'] * road['lanes']['width'] / 2
    line = along_line(road)
    for side in (-1, 1):
        edge_in = [(x - uz * side * half, z + ux * side * half) for x, z, ux, uz, s in line]
        edge_out = [(x - uz * side * (half + width_at(road, s, side)), z + ux * side * (half + width_at(road, s, side))) for x, z, ux, uz, s in line]
        polygon(edge_in + edge_out[::-1], '#efede7' if road.get('pavementProfile') else '#e6e3dc')
for road in loc['roads']:
    half = road['lanes']['count'] * road['lanes']['width'] / 2
    line = along_line(road)
    left = [(x + uz * half, z - ux * half) for x, z, ux, uz, s in line]
    right = [(x - uz * half, z + ux * half) for x, z, ux, uz, s in line]
    polygon(left + right[::-1], '#55585e')
for j in loc['junctions']:
    X, Y = px(j['position']['x'], j['position']['z'])
    add(f'<circle cx="{X:.1f}" cy="{Y:.1f}" r="{j["radius"] * S:.1f}" fill="#55585e"/>')
    add(f'<circle cx="{X:.1f}" cy="{Y:.1f}" r="{j["discDiameter"] / 2 * S:.1f}" fill="#fff"/>')
for b in loc['buildings']:
    pts = [(p['x'], p['z']) for p in b['footprint']]
    if b.get('source') == 'approximate':
        polygon(pts, '#fdba74', '#9a3412', 'stroke-width="1.5"')
        polygon(pts, 'url(#hatch)')
    elif b.get('source') == 'reference':
        polygon(pts, '#93c5fd' if b.get('detail') != 'low' else '#bfdbfe', '#1e40af', 'stroke-width="0.8"')
    else:
        polygon(pts, '#6b6f78' if b.get('use') == 'shop' else ('#9a9ea6' if b.get('detail') != 'low' else '#c3c6cc'), '#3f4249', 'stroke-width="0.8"')
for t in loc.get('trees', []):
    X, Y = px(t['x'], t['z'])
    add(f'<circle cx="{X:.1f}" cy="{Y:.1f}" r="{2 * S:.1f}" fill="#3f7d3a" opacity=".8"/>')
for f in loc.get('furniture', []):
    X, Y = px(f['position']['x'], f['position']['z'])
    add(f'<rect x="{X - 4:.1f}" y="{Y - 4:.1f}" width="8" height="8" fill="#b91c1c"/>')
for c in loc['crossings']:
    road = next(r for r in loc['roads'] if r['id'] == c['roadId'])
    line = along_line(road)
    x, z, ux, uz, s = min(line, key=lambda p: abs(p[4] - c['along']))
    X, Y = px(x, z)
    add(f'<circle cx="{X:.1f}" cy="{Y:.1f}" r="6" fill="none" stroke="#facc15" stroke-width="3"/>')
for blk in loc['blocks']:
    X, Y = px(blk['position']['x'], blk['position']['z'])
    add(f'<rect x="{X - 3:.1f}" y="{Y - 3:.1f}" width="6" height="6" fill="#111"/>')
sp = loc['spawn']['position']
X, Y = px(sp['x'], sp['z'])
add(f'<circle cx="{X:.1f}" cy="{Y:.1f}" r="5" fill="#2563eb"/>')
legend = [('#6b6f78', 'mapped: OSM building (shop)'), ('#9a9ea6', 'mapped: OSM building'), ('#c3c6cc', 'mapped: OSM, background (low detail)'),
          ('#93c5fd', 'reference-estimated: Microsoft ML outline'), ('#bfdbfe', 'reference-estimated, background'),
          ('#fdba74', 'representative: approximate building'), ('#b7d6a2', 'representative: garden'), ('#a8a8a8', 'mapped: footway / service road'),
          ('#efede7', 'derived: pavement to shop fronts'), ('#b91c1c', 'mapped: bus stop'), ('#facc15', 'mapped: signal crossing'),
          ('#7c7f86', 'mapped: other streets (surface only)'), ('#2563eb', 'learner start')]
for i, (colour, label) in enumerate(legend):
    x, y = 10 + (i % 3) * 340, H + 18 + (i // 3) * 22
    add(f'<rect x="{x}" y="{y - 11}" width="14" height="14" fill="{colour}" stroke="#333" stroke-width=".5"/>')
    add(f'<text x="{x + 20}" y="{y}" font-size="13" fill="#111">{label}</text>')
add(f'<text x="{W - 10:.0f}" y="{H + 112:.0f}" font-size="11" text-anchor="end" fill="#333">Map data © OpenStreetMap contributors (ODbL); building outlines © Overture Maps Foundation, Microsoft (ODbL). Area-inspired, not an official test route. North up; grid none.</text>')
add('</svg>')
(ROOT / 'docs/brentwood/location-review.svg').write_text('\n'.join(out))
print('wrote docs/brentwood/location-review.svg')
