import json, glob, os, sys
import numpy as np
from shapely.geometry import Polygon, MultiPolygon
# Schreibt karten/staedte.json (Stadt-Dropdown + Übersichtskarte) aus allen karten/<id>.json.
# Pro Stadt: Name, Anzahl je Flächentyp, Ursprung 'o' (UTM-Meter), Ausdehnung 'w'/'h' (Meter)
# und ein vereinfachter Stadtumriss 'g' (halbe Meter relativ zu 'o', delta-kodiert wie die Kartendaten).
# Aufruf aus dem Projektordner: python scripts/build.py
DIR=sys.argv[1] if len(sys.argv)>1 else 'karten'
SKIP={'staedte','deutschland'}
def dec(a):
    xy=np.cumsum(np.array(a).reshape(-1,2),axis=0)
    return xy
def enc(p):
    cs=np.round(np.array(p.exterior.coords)[:-1]).astype(int)
    return np.vstack([cs[:1],np.diff(cs,axis=0)]).ravel().tolist()
out=[]
for f in sorted(glob.glob(os.path.join(DIR,'*.json'))):
    cid=os.path.splitext(os.path.basename(f))[0]
    if cid in SKIP: continue
    d=json.load(open(f,encoding='utf-8'))
    g=MultiPolygon([Polygon(dec(a)) for a in d['city']]).buffer(0).simplify(60)   # 30 m
    polys=[g] if isinstance(g,Polygon) else list(g.geoms)
    t={k:sum(1 for c in d['c'] if c['typ']==v) for k,v in [('bl','Baulücke'),('gar','Garagengrundstück'),('free','Freifläche / Garten')]}
    out.append({'id':cid,'name':d.get('name') or cid.capitalize(),'n':len(d['c']),'t':t,
                'o':d['o'],'w':d['w'],'h':d['h'],'g':[enc(p) for p in polys if p.area>1e4]})
json.dump(out,open(os.path.join(DIR,'staedte.json'),'w',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))
print('gespeichert:',os.path.join(DIR,'staedte.json'),[(x['id'],x['n'],sum(len(a) for a in x['g'])//2) for x in out])
