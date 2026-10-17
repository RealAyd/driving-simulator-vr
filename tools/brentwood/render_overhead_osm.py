"""Draws docs/brentwood/overhead-osm.svg from docs/brentwood/layout-osm.json.

Road widths are not in the data; they are drawn as lanes x 3.3 m (one-way)
or lanes x 3.3 m in total (two-way, 2 lanes if untagged), an assumption.
Run: python3 tools/brentwood/render_overhead_osm.py
"""
import json, math, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
osm = json.loads((ROOT / 'docs/brentwood/layout-osm.json').read_text())
draft = json.loads((ROOT / 'docs/brentwood/layout-draft.json').read_text())

S = 4.2
X0, X1, Y0, Y1 = -105, 125, -95, 100
W, H = (X1 - X0) * S, (Y1 - Y0) * S
px = lambda x, y: ((x - X0) * S, (Y1 - y) * S)
pts = lambda P: ' '.join('%.1f,%.1f' % px(*p) for p in P)
out = []
add = out.append

def text(x, y, s, cls='label', anchor='middle'):
    X, Y = px(x, y)
    add(f'<text class="{cls}" x="{X:.1f}" y="{Y:.1f}" text-anchor="{anchor}">{s}</text>')

def arrowhead(x, y, ux, uy, cls, size):
    lx, ly = -uy, ux
    P = [(x + ux * size, y + uy * size),
         (x - ux * size + lx * size * .8, y - uy * size + ly * size * .8),
         (x - ux * size - lx * size * .8, y - uy * size - ly * size * .8)]
    add(f'<polygon class="{cls}" points="{pts(P)}"/>')

def width(r):
    lanes = r['lanes'] or (1 if r['oneway'] else 2)
    return lanes * 3.3

add(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {H:.0f}" role="img" '
    'aria-label="Overhead of the Brentwood paired mini-roundabouts from OpenStreetMap data">')
add('<rect class="ground" x="0" y="0" width="100%" height="100%"/>')
for a in osm['areas']:
    add(f'<polygon class="{"parking" if a["kind"] == "parking" else "green"}" points="{pts(a["polygon"])}"/>')
for b in osm['buildings']:
    add(f'<polygon class="buildings" points="{pts(b["polygon"])}"/>')
roads = [r for r in osm['roads'] if r['highway'] != 'residential' or r['name']]
for cls, extra in (('pavement', 3.5), ('carriageway', 0)):
    for r in roads:
        add(f'<polyline class="{cls}" points="{pts(r["points"])}" stroke-width="{(width(r) + extra) * S:.1f}"/>')
# One-way direction arrows along each way (traffic keeps left on two-way roads).
for r in roads:
    P = r['points']
    for i in range(len(P) - 1):
        (ax, ay), (bx, by) = P[i], P[i + 1]
        d = math.hypot(bx - ax, by - ay)
        if d < 6:
            continue
        ux, uy = (bx - ax) / d, (by - ay) / d
        mx, my = (ax + bx) / 2, (ay + by) / 2
        if r['oneway']:
            arrowhead(mx, my, ux, uy, 'arrow', 1.8)
        else:
            for sgn in (1, -1):
                lx, ly = -uy * sgn, ux * sgn
                arrowhead(mx + lx * 1.6, my + ly * 1.6, ux * sgn, uy * sgn, 'arrow', 1.5)
for f in osm['features']:
    X, Y = px(f['x'], f['y'])
    k = f['kind']
    if k == 'mini-roundabout':
        add(f'<circle class="dome" cx="{X:.1f}" cy="{Y:.1f}" r="{1.5 * S:.1f}"/>')
        for a in range(0, 360, 90):
            t = math.radians(a)
            arrowhead(f['x'] + 3.6 * math.cos(t), f['y'] + 3.6 * math.sin(t), math.sin(t), -math.cos(t), 'circulate', 1.3)
    elif k.startswith('crossing'):
        add(f'<rect class="{"crossing-signal" if "signals" in k else "crossing"}" x="{X - 5:.1f}" y="{Y - 5:.1f}" width="10" height="10" rx="2" transform="rotate(45 {X:.1f} {Y:.1f})"/>')
    elif k == 'bus-stop':
        add(f'<rect class="bus" x="{X - 6:.1f}" y="{Y - 6:.1f}" width="12" height="12" rx="3"/>')
    elif k == 'memorial':
        add(f'<rect class="landmark" x="{X - 6:.1f}" y="{Y - 6:.1f}" width="12" height="12" rx="2" transform="rotate(45 {X:.1f} {Y:.1f})"/>')
    elif k == 'tree':
        add(f'<circle class="tree" cx="{X:.1f}" cy="{Y:.1f}" r="{3 * S:.1f}"/>')

route = [[-29.53, -18.95], [-10.79, -9.86], [3.4, -6.4], [5.51, 1.28], [9.0, 5.9], [14.0, 11.0], [23.4, 16.5], [38.6, 25.7], [59.2, 35.2], [78, 47.3]]
add(f'<polyline class="route" points="{pts(route)}"/>')
ux, uy = 18.8 / math.hypot(18.8, 12.1), 12.1 / math.hypot(18.8, 12.1)
arrowhead(78, 47.3, ux, uy, 'route-head', 3)
for p in draft['streetViewPoints']:
    X, Y = px(p['x'], p['y'])
    h = math.radians(p['headingDeg'])
    tx, ty = px(p['x'] + 7 * math.sin(h), p['y'] + 7 * math.cos(h))
    add(f'<line class="sv-ray" x1="{X:.1f}" y1="{Y:.1f}" x2="{tx:.1f}" y2="{ty:.1f}"/>')
    add(f'<circle class="sv" cx="{X:.1f}" cy="{Y:.1f}" r="5"/>')
    text(p['x'] - 1.5, p['y'] - 5, p['id'].split('-')[0], 'sv-label', 'end')

for x, y, s in [(-70, -30, 'High Street'), (52, -78, 'Ingrave Rd'), (-16, 72, 'Ongar Rd'), (95, 70, 'Shenfield Rd'),
                (-5, -4, 'rb1'), (24, 6, 'rb2'), (-6, 5, "Wilson's Corner"), (38.6, 2, 'Obelisk'), (36, -60, 'Wilsons Corner bus stop')]:
    text(x, y, s)
sx, sy = px(X0 + 6, Y0 + 6)
add(f'<line class="scale" x1="{sx:.1f}" y1="{sy:.1f}" x2="{sx + 20 * S:.1f}" y2="{sy:.1f}"/>')
add(f'<text class="small" x="{sx + 10 * S:.1f}" y="{sy - 6:.1f}" text-anchor="middle">20 m</text>')
nx, ny = px(X1 - 8, Y1 - 14)
add(f'<path class="north" d="M {nx:.1f} {ny - 18:.1f} L {nx - 7:.1f} {ny + 4:.1f} L {nx:.1f} {ny - 2:.1f} L {nx + 7:.1f} {ny + 4:.1f} Z"/>')
add(f'<text class="small" x="{nx:.1f}" y="{ny + 18:.1f}" text-anchor="middle">N</text>')
X, Y = px(X1 - 2, Y0 + 3)
add(f'<text class="small" x="{X:.1f}" y="{Y:.1f}" text-anchor="end">Map data © OpenStreetMap contributors (ODbL)</text>')
add('</svg>')
(ROOT / 'docs/brentwood/overhead-osm.svg').write_text('\n'.join(out))
print('wrote', len(out), 'elements')
