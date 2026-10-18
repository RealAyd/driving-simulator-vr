"""Building outlines for the Brentwood scene from Overture Maps (buildings theme), for the gaps in OpenStreetMap.

Input:  Overture Maps release 2026-09-23.1, theme=buildings/type=building (public GeoParquet on S3,
        s3://overturemaps-us-west-2/release/2026-09-23.1/), read for bbox 0.296,51.617,0.312,51.626.
Output: content/sources/overture-buildings-brentwood-2026-09-23.1.json

Only outlines whose sources are entirely "Microsoft ML Buildings" are kept (machine-detected footprints with a
machine-estimated height). Outlines from OpenStreetMap are already in the OSM extract. Licence: ODbL 1.0
(Overture buildings theme; Microsoft ML Buildings are ODbL). Attribution: © OpenStreetMap contributors,
Overture Maps Foundation, Microsoft.

Needs pyarrow and shapely (pip install pyarrow shapely). Run: python3 -I tools/brentwood/overture_extract.py
"""
import json, pathlib
import pyarrow.fs as fs, pyarrow.parquet as pq
from shapely import wkb

ROOT = pathlib.Path(__file__).resolve().parents[2]
RELEASE = '2026-09-23.1'
BASE = f'overturemaps-us-west-2/release/{RELEASE}/theme=buildings/type=building'
X0, X1, Y0, Y1 = 0.296, 0.312, 51.617, 51.626
s3 = fs.S3FileSystem(anonymous=True, region='us-west-2')

def groups(path):
    md = pq.ParquetFile(s3.open_input_file(path)).metadata
    ix = {md.schema.column(i).path: i for i in range(md.num_columns)}
    out = []
    for g in range(md.num_row_groups):
        st = lambda n: md.row_group(g).column(ix[n]).statistics
        if st('bbox.xmin').min <= X1 and st('bbox.xmax').max >= X0 and st('bbox.ymin').min <= Y1 and st('bbox.ymax').max >= Y0:
            out.append(g)
    return out

from concurrent.futures import ThreadPoolExecutor
files = [i.path for i in s3.get_file_info(fs.FileSelector(BASE))]
with ThreadPoolExecutor(32) as ex:
    hits = [(p, g) for p, g in zip(files, ex.map(groups, files)) if g]
features = []
for path, gs in hits:
    for r in pq.ParquetFile(s3.open_input_file(path)).read_row_groups(gs).to_pylist():
        b = r['bbox']
        if not (b['xmin'] <= X1 and b['xmax'] >= X0 and b['ymin'] <= Y1 and b['ymax'] >= Y0):
            continue
        datasets = sorted({s['dataset'] for s in (r['sources'] or [])})
        if datasets != ['Microsoft ML Buildings']:
            continue
        geom = wkb.loads(r['geometry'])
        polys = [geom] if geom.geom_type == 'Polygon' else list(geom.geoms)
        for poly in polys:
            features.append({'id': r['id'], 'height': None if r['height'] is None else round(r['height'], 2),
                             'numFloors': r['num_floors'],
                             'licence': sorted({s['license'] for s in r['sources']}),
                             'version': sorted({s['version'] for s in r['sources'] if s.get('version')}),
                             'outline': [[round(x, 7), round(y, 7)] for x, y in poly.exterior.coords]})
out = {'source': f'Overture Maps Foundation, release {RELEASE}, theme=buildings/type=building, bbox {X0},{Y0},{X1},{Y1}; '
                 'only outlines whose sources are all "Microsoft ML Buildings"',
       'licence': 'ODbL 1.0. © OpenStreetMap contributors, Overture Maps Foundation, Microsoft (ML Buildings).',
       'downloaded': '2026-10-18', 'features': features}
(ROOT / f'content/sources/overture-buildings-brentwood-{RELEASE}.json').write_text(json.dumps(out, separators=(',', ':')))
print(len(features), 'Microsoft ML building outlines')
