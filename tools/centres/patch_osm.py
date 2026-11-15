#!/usr/bin/env python3
"""Applies a centre's map fixes to an OSM file, so a rebuilt scene comes out the same as the one shipped.

    python3 -I tools/centres/patch_osm.py <in.osm> <osm-patches.json> <out.osm>

The fixes are kept with the centre (content/packs/<slug>/osm-patches.json), each with the reason, as a list of:

    {"op":"drop-tag","type":"way","id":123,"k":"building","why":"..."}
    {"op":"set-tag","type":"way","id":123,"k":"name","v":"Green Lane","why":"..."}
    {"op":"move-node","id":456,"lat":51.1,"lon":-0.2,"why":"..."}
    {"op":"move-tags","from":456,"to":789,"keys":["highway","crossing"],"why":"..."}  (node to node: a signal moved)

Fixes are local to our copy: the map itself is not edited. A fix whose way or node is missing stops with an error,
so a change on the map is noticed.
"""
import json, sys
import xml.etree.ElementTree as E

if len(sys.argv) != 4:
    sys.exit(__doc__)
src, patch_file, out = sys.argv[1:]
tree = E.parse(src)
root = tree.getroot()
index = {(el.tag, el.get('id')): el for el in root if el.tag in ('node', 'way', 'relation')}

for p in json.load(open(patch_file)):
    if not p.get('why'):
        sys.exit(f'Patch without a reason: {p}')
    if p['op'] == 'move-tags':
        a, b = index.get(('node', str(p['from']))), index.get(('node', str(p['to'])))
        if a is None or b is None:
            sys.exit(f'node {p["from"]} or {p["to"]} not in {src}: the map has changed, check this fix: {p["why"]}')
        for t in [t for t in a.findall('tag') if t.get('k') in p['keys']]:
            a.remove(t); b.append(t)
        print(f'move-tags node {p["from"]} -> {p["to"]}: {p["why"]}')
        continue
    kind = 'node' if p['op'] == 'move-node' else p.get('type', 'way')
    el = index.get((kind, str(p['id'])))
    if el is None:
        sys.exit(f'{kind} {p["id"]} not in {src}: the map has changed, check this fix: {p["why"]}')
    if p['op'] == 'drop-tag':
        for t in el.findall('tag'):
            if t.get('k') == p['k']:
                el.remove(t)
    elif p['op'] == 'set-tag':
        t = next((t for t in el.findall('tag') if t.get('k') == p['k']), None)
        if t is None:
            t = E.SubElement(el, 'tag', {'k': p['k']})
        t.set('v', str(p['v']))
    elif p['op'] == 'move-node':
        el.set('lat', f'{p["lat"]:.7f}'); el.set('lon', f'{p["lon"]:.7f}')
    else:
        sys.exit(f'Unknown op {p["op"]}')
    print(f'{p["op"]} {kind} {p["id"]}: {p["why"]}')

tree.write(out, encoding='utf-8', xml_declaration=True)
