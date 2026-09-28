import json, sys
import numpy as np
from shapely.geometry import Polygon, MultiPolygon, box
from shapely.ops import transform
from pyproj import Transformer
# Erzeugt karten/deutschland.json: Umriss Deutschlands + Nachbarländer für die Übersichtskarte.
# Quelle: Natural Earth 1:10m (gemeinfrei) als TopoJSON aus dem npm-Paket world-atlas@2:
#   npm pack world-atlas@2 && tar xzf world-atlas-*.tgz
#   python scripts/deutschland.py package/countries-10m.json
# Koordinaten: UTM 32N (EPSG:25832) wie die Katasterdaten. Welteinheit der Karte = halbe Meter
# relativ zum Ursprung 'o' (Meter). Die Städte-Dateien werden über ihren eigenen Ursprung dazu verschoben.
SRC=sys.argv[1] if len(sys.argv)>1 else 'package/countries-10m.json'
OUT=sys.argv[2] if len(sys.argv)>2 else 'karten/deutschland.json'
topo=json.load(open(SRC))
sc,tr=topo['transform']['scale'],topo['transform']['translate']
arcs=[]
for a in topo['arcs']:
    x=y=0; pts=[]
    for dx,dy in a:
        x+=dx; y+=dy; pts.append((x*sc[0]+tr[0], y*sc[1]+tr[1]))
    arcs.append(pts)
def ring(ids):
    out=[]
    for i in ids:
        pts=arcs[i] if i>=0 else arcs[~i][::-1]
        out+=pts if not out else pts[1:]
    return out
def geom(g):
    if g['type']=='Polygon': polys=[g['arcs']]
    elif g['type']=='MultiPolygon': polys=g['arcs']
    else: return None
    ok=lambda r: len(r)>=4   # Kleinstinseln haben nach der Quantisierung zu wenige Punkte
    return MultiPolygon([Polygon(ring(p[0]),[ring(h) for h in p[1:] if ok(ring(h))]) for p in polys if ok(ring(p[0]))]).buffer(0)
to_utm=Transformer.from_crs(4326,25832,always_xy=True).transform
countries={}
for g in topo['objects']['countries']['geometries']:
    gm=geom(g)
    if gm is not None: countries[g['properties']['name']]=gm
de=transform(to_utm,countries['Germany'])
minx,miny,maxx,maxy=de.bounds
ox,oy=int(minx//10000*10000),int(miny//10000*10000)
view=box(minx-250e3,miny-250e3,maxx+250e3,maxy+250e3)
def enc(g,tol):
    g=g.simplify(tol,preserve_topology=True)
    polys=[g] if isinstance(g,Polygon) else list(getattr(g,'geoms',[]))
    out=[]
    for p in polys:
        if not isinstance(p,Polygon) or p.is_empty or p.area<tol*tol*4: continue
        cs=np.round((np.array(p.exterior.coords)[:-1]-[ox,oy])*2/200).astype(int)*200  # 100-m-Raster, halbe Meter
        if len(cs)<3: continue
        out.append(np.vstack([cs[:1],np.diff(cs,axis=0)]).ravel().tolist())
    return out
near=[]
lonlat_view=box(0,43,22,60)
for name,g in countries.items():
    if name=='Germany' or not g.intersects(lonlat_view): continue
    u=transform(to_utm,g.intersection(lonlat_view)).intersection(view)
    if not u.is_empty: near+=enc(u,1500)
data={'o':[ox,oy],'bb':[round(minx),round(miny),round(maxx),round(maxy)],'de':enc(de,600),'nb':near}
s=json.dumps(data,separators=(',',':'))
open(OUT,'w').write(s)
print(OUT,len(s)//1024,'KB',{k:len(v) for k,v in data.items()})
