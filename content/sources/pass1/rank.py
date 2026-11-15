"""Merges the pass 1 batch outputs into RANKED.md (run: python3 -I content/sources/pass1/rank.py)."""
import json,glob,os
here=os.path.dirname(os.path.abspath(__file__))
done=[];todo=[]
for f in sorted(glob.glob(f'{here}/out/batch-*.json')):
    d=[x for x in json.load(open(f)) if x.get('score') is not None]
    names={x['name'] for x in d};done+=d
    todo+=[x['name'] for x in json.load(open(f.replace('/out/','/in/'))) if x['name'] not in names]
done.sort(key=lambda x:(-x['score'],-(x.get('tests') or 0)))
L=['# Pass 1: ranked so far','',f'{len(done)} of 350 centres searched; {len(todo)} still to do. Score per EVIDENCE_PLAN section 5.','',
 '| # | Centre | Score | First-hand | Route lists | Template | Moved / address note |','|---|---|---|---|---|---|---|']
for i,x in enumerate(done,1):
    c=x.get('counts',{});fh=sum(c.get(k,0) for k in ('instructor-page','video','learner'))
    L.append(f"| {i} | {x['name']} | {x['score']} | {fh} | {c.get('route-list',0)} | {c.get('template',0)} | {(x.get('moved') or '').replace('|','/')[:90]} |")
L+=['','## Still to search','',', '.join(todo)]
open(f'{here}/RANKED.md','w').write('\n'.join(L)+'\n')
print(len(done),len(todo))
