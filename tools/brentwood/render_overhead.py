"""Draws docs/brentwood/overhead-draft.svg from docs/brentwood/layout-draft.json.

Uses CSS variables (--road, --ink, ...) so the SVG can be themed by the page
that embeds it. Run: python3 tools/brentwood/render_overhead.py
"""
import json, math, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
layout = json.loads((ROOT / 'docs/brentwood/layout-draft.json').read_text())

S = 4.2                      # pixels per metre
X0, X1, Y0, Y1 = -100, 130, -100, 95
W, H = (X1 - X0) * S, (Y1 - Y0) * S
px = lambda x, y: ((x - X0) * S, (Y1 - y) * S)
out = []
add = out.append

def poly(points, cls):
    pts = ' '.join('%.1f,%.1f' % px(*p) for p in points)
    add(f'<polygon class="{cls}" points="{pts}"/>')

def text(x, y, s, cls='label', anchor='middle'):
    X, Y = px(x, y)
    add(f'<text class="{cls}" x="{X:.1f}" y="{Y:.1f}" text-anchor="{anchor}">{s}</text>')

def unit(a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    d = math.hypot(dx, dy)
    return dx / d, dy / d, d

def arrow(x, y, ux, uy, cls='arrow', size=2.2):
    """Small arrowhead at (x, y) pointing along (ux, uy)."""
    lx, ly = -uy, ux
    tip = (x + ux * size, y + uy * size)
    b1 = (x - ux * size + lx * size * .8, y - uy * size + ly * size * .8)
    b2 = (x - ux * size - lx * size * .8, y - uy * size - ly * size * .8)
    poly([tip, b1, b2], cls)

add(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {H:.0f}" role="img" '
    'aria-label="Draft overhead layout of the Brentwood paired mini-roundabouts">')
add('<rect class="ground" x="0" y="0" width="100%" height="100%"/>')

# Buildings, parking and other areas first.
for f in layout['features']:
    if 'polygon' in f:
        poly(f['polygon'], 'buildings' if f['kind'] == 'buildings' else 'parking')

# Road surfaces: pavement edge, carriageway, then markings.
roads = layout['roads']
for cls, extra in (('pavement', 4), ('carriageway', 0)):
    for r in roads:
        (ax, ay), (bx, by) = r['from'], r['to']
        A, B = px(ax, ay), px(bx, by)
        add(f'<line class="{cls}" x1="{A[0]:.1f}" y1="{A[1]:.1f}" x2="{B[0]:.1f}" y2="{B[1]:.1f}" '
            f'stroke-width="{(r["width"] + extra) * S:.1f}"/>')
    for rb in layout['roundabouts']:
        X, Y = px(rb['x'], rb['y'])
        add(f'<circle class="{cls}" cx="{X:.1f}" cy="{Y:.1f}" r="{(rb['junctionRadius'] + extra / 2) * S:.1f}"/>')

for r in roads:
    (ax, ay), (bx, by) = r['from'], r['to']
    ux, uy, d = unit((ax, ay), (bx, by))
    # Centre line, kept clear of the roundabouts.
    sx, sy = ax + ux * 7, ay + uy * 7
    ex, ey = bx - ux * (7 if r['id'] == 'link' else 0), by - uy * (7 if r['id'] == 'link' else 0)
    A, B = px(sx, sy), px(ex, ey)
    add(f'<line class="centre" x1="{A[0]:.1f}" y1="{A[1]:.1f}" x2="{B[0]:.1f}" y2="{B[1]:.1f}"/>')
    # UK traffic keeps left: the lane to the left of a direction of travel.
    for direction in (1, -1):
        dx, dy = ux * direction, uy * direction
        left = (-dy, dx)
        off = r['width'] / 4
        for k in (0.35, 0.7):
            cx, cy = ax + ux * d * k + left[0] * off, ay + uy * d * k + left[1] * off
            X, Y = px(cx, cy)
            arrow(cx, cy, dx, dy)

# Mini-roundabout domes and clockwise circulation.
for rb in layout['roundabouts']:
    X, Y = px(rb['x'], rb['y'])
    add(f'<circle class="dome" cx="{X:.1f}" cy="{Y:.1f}" r="{rb["domeDiameter"] / 2 * S:.1f}"/>')
    for a in range(0, 360, 90):
        t = math.radians(a)
        rx, ry = rb['x'] + 4.2 * math.cos(t), rb['y'] + 4.2 * math.sin(t)
        # Clockwise seen from above: tangent (sin, -cos) in x-east/y-north.
        arrow(rx, ry, math.sin(t), -math.cos(t), 'circulate', 1.6)

# Proposed learner route.
pts = ' '.join('%.1f,%.1f' % px(*p) for p in layout['proposedRoute']['path'])
add(f'<polyline class="route" points="{pts}"/>')
end = layout['proposedRoute']['path'][-1]
prev = layout['proposedRoute']['path'][-2]
ux, uy, _ = unit(prev, end)
arrow(end[0], end[1], ux, uy, 'route-head', 3.2)

# Street View points (measured).
for p in layout['streetViewPoints']:
    X, Y = px(p['x'], p['y'])
    h = math.radians(p['headingDeg'])
    tx, ty = px(p['x'] + 7 * math.sin(h), p['y'] + 7 * math.cos(h))
    add(f'<line class="sv-ray" x1="{X:.1f}" y1="{Y:.1f}" x2="{tx:.1f}" y2="{ty:.1f}"/>')
    add(f'<circle class="sv" cx="{X:.1f}" cy="{Y:.1f}" r="5"/>')
    text(p['x'] - 2, p['y'] + 4, p['id'].split('-')[0], 'sv-label', 'end')

# Point features.
symbols = {'landmark': 'landmark', 'crossing': 'crossing', 'island': 'island'}
for f in layout['features']:
    if f.get('x') is None or 'polygon' in f:
        continue
    X, Y = px(f['x'], f['y'])
    cls = symbols.get(f['kind'], 'landmark')
    add(f'<rect class="{cls}" x="{X - 6:.1f}" y="{Y - 6:.1f}" width="12" height="12" rx="3" transform="rotate(45 {X:.1f} {Y:.1f})"/>')
for f in layout['features']:
    if f['kind'] == 'trees':
        for x, y in f['points']:
            X, Y = px(x, y)
            add(f'<circle class="tree" cx="{X:.1f}" cy="{Y:.1f}" r="{4 * S:.1f}"/>')

# Labels.
labels = [
    (-62, -24, 'High Street (A1023)'), (14, -70, 'Ingrave Rd (A128)'), (-12, 66, 'Ongar Rd (A128)'),
    (92, 52, 'Shenfield Rd (A1023)'), (-9, -2, 'rb1'), (8, 13, 'rb2'),
    (26, -24, 'Clock tower'), (47, 15, 'Obelisk'), (38, -1.5, 'Parking'), (-28, 4, 'Shops'),
    (-6, -26, 'Horse trough'), (-20, -21.5, 'Signal crossing'), (30, -36, 'Wilson Corner block')
]
for x, y, s in labels:
    text(x, y, s, 'label')

# Scale bar and north arrow.
sx, sy = px(X0 + 6, Y0 + 6)
add(f'<line class="scale" x1="{sx:.1f}" y1="{sy:.1f}" x2="{sx + 20 * S:.1f}" y2="{sy:.1f}"/>')
add(f'<text class="small" x="{sx + 10 * S:.1f}" y="{sy - 6:.1f}" text-anchor="middle">20 m</text>')
nx, ny = px(X1 - 8, Y1 - 14)
add(f'<path class="north" d="M {nx:.1f} {ny - 18:.1f} L {nx - 7:.1f} {ny + 4:.1f} L {nx:.1f} {ny - 2:.1f} L {nx + 7:.1f} {ny + 4:.1f} Z"/>')
add(f'<text class="small" x="{nx:.1f}" y="{ny + 18:.1f}" text-anchor="middle">N</text>')
add('</svg>')
(ROOT / 'docs/brentwood/overhead-draft.svg').write_text('\n'.join(out))
print('wrote', len(out), 'elements')
