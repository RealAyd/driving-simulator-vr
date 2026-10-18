import xml.etree.ElementTree as ET,math,glob,sys,heapq,collections
D=sys.argv[1]
C=(51.6095,0.2984)
kx=111320*math.cos(math.radians(C[0]))
dist=lambda a,b:math.hypot((a[1]-b[1])*kx,(a[0]-b[0])*111320)
nodes={};ways={}
for f in glob.glob(D+'/t_*.osm'):
    r=ET.parse(f).getroot()
    for n in r.iter('node'):nodes[n.get('id')]=(float(n.get('lat')),float(n.get('lon')))
    for w in r.iter('way'):
        t={x.get('k'):x.get('v') for x in w.findall('tag')}
        if 'highway' in t: ways[w.get('id')]=(t,[x.get('ref') for x in w.findall('nd')],w.get('timestamp'),w.get('version'))
DRIVE={'primary','secondary','tertiary','residential','unclassified','primary_link','secondary_link','tertiary_link','service'}
G=collections.defaultdict(list)
for wid,(t,nds,_,_) in ways.items():
    if t['highway'] not in DRIVE: continue
    ow=t.get('oneway')=='yes'
    for a,b in zip(nds,nds[1:]):
        if a in nodes and b in nodes:
            d=dist(nodes[a],nodes[b]);G[a].append((b,d))
            if not ow:G[b].append((a,d))
# start: nearest drivable node on Warley Hill to C
start=min((n for n in G if any(ways[w][0].get('name')=='Warley Hill' for w in ways if n in ways[w][1])),key=lambda n:dist(nodes[n],C)) if False else None
wh=[n for w,(t,nds,_,_) in ways.items() if t.get('name')=='Warley Hill' for n in nds if n in nodes]
start=min(wh,key=lambda n:dist(nodes[n],C))
print('start node',start,nodes[start],'%.0f m from estimate'%dist(nodes[start],C))
best={start:0};pq=[(0,start)]
while pq:
    d,n=heapq.heappop(pq)
    if d>best.get(n,1e18):continue
    for m,w in G[n]:
        if d+w<best.get(m,1e18):best[m]=d+w;heapq.heappush(pq,(d+w,m))
for name,nid in [('Woodman Rd / Warley Hill','21618407'),('Junction Rd / Warley Hill','21618391'),('Kings Road zebra','1691283192'),('Crescent Road uncontrolled crossing','12966702463'),('Queen St / Albert St','253025227'),('Queen St / Woodman Rd','253024872'),('Mini-roundabout rb1 (High St/Ingrave Rd)','7419454984')]:
    print(f"{name}: node {nid} {nodes[nid]} straight {dist(nodes[nid],C):.0f} m, by road {best.get(nid,float('nan')):.0f} m")
for nm in ['Woodman Road','Queen Street','Kings Road','Albert Street','Warley Hill','Crescent Road']:
    for w,(t,nds,ts,v) in ways.items():
        if t.get('name')==nm: print(nm,w,{k:t[k] for k in t if k not in('name',)},ts)
