import xml.etree.ElementTree as ET,math,glob,sys,collections,json
D=sys.argv[1]
C=(51.6095,0.2984)
def dist(a,b):
    kx=111320*math.cos(math.radians(C[0]));return math.hypot((a[1]-b[1])*kx,(a[0]-b[0])*111320)
nodes={};ntags={};ways={}
for f in glob.glob(D+'/t_*.osm'):
    r=ET.parse(f).getroot()
    for n in r.iter('node'):
        nodes[n.get('id')]=(float(n.get('lat')),float(n.get('lon')))
        t={x.get('k'):x.get('v') for x in n.findall('tag')}
        if t: ntags[n.get('id')]=t
    for w in r.iter('way'):
        t={x.get('k'):x.get('v') for x in w.findall('tag')}
        if 'highway' in t: ways[w.get('id')]=(t,[x.get('ref') for x in w.findall('nd')],w.get('timestamp'))
print('nodes',len(nodes),'highway ways',len(ways))
print('existing mini-roundabouts from C: %.0f m'%dist(C,(51.6213112,0.3055506)))
DRIVE={'primary','secondary','tertiary','residential','unclassified','primary_link','secondary_link','tertiary_link'}
node_ways=collections.defaultdict(set)
for wid,(t,nds,_) in ways.items():
    if t['highway'] in DRIVE:
        for n in nds: node_ways[n].add(wid)
out=collections.defaultdict(list)
for nid,t in ntags.items():
    if nid not in nodes: continue
    d=dist(C,nodes[nid])
    if d>2000: continue
    names=sorted({ways[w][0].get('name','?') for w in node_ways.get(nid,())})
    h=t.get('highway')
    if h=='crossing': out['crossing:'+(t.get('crossing_ref') or t.get('crossing','?'))].append((round(d),nid,names,nodes[nid]))
    elif h in('give_way','stop','mini_roundabout','traffic_signals'): out[h].append((round(d),nid,names,nodes[nid]))
for k,v in sorted(out.items()):
    v.sort();print(k,len(v))
    for x in v[:12]: print('   ',x)
# junctions: nodes shared by >=2 named drivable ways with different names
J=[]
for nid,ws in node_ways.items():
    names={ways[w][0].get('name') for w in ws}
    if len(names)>=2 and nid in nodes and dist(C,nodes[nid])<=2000:
        J.append((round(dist(C,nodes[nid])),nid,sorted(n or '?' for n in names),[ways[w][0]['highway'] for w in ws]))
J.sort();print('named junctions',len(J))
for x in J[:40]: print('   ',x)
