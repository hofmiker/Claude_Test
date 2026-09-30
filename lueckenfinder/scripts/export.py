import geopandas as gpd, json, numpy as np
from shapely.geometry import MultiPolygon, Polygon
import sys
F=sys.argv[1]  # Pfad zur ALKIS-GeoPackage-Datei
KAND=sys.argv[2] if len(sys.argv)>2 else 'ergebnisse/kandidaten.gpkg'
OUT=sys.argv[3] if len(sys.argv)>3 else 'ergebnisse/karte.json'
PREFIX=sys.argv[4] if len(sys.argv)>4 else 'HE'
NAME=sys.argv[5] if len(sys.argv)>5 else None  # Anzeigename der Stadt, z. B. 'Herne'
c=gpd.read_file(KAND)
b=gpd.read_file(F,layer='GebauedeBauwerk')
b=b[b.gebnutzbez=='Gebäude']
p=gpd.read_file(F,layer='Flurstueck')[['tntxt','geometry']]
roads=p[p.tntxt.fillna('').str.match(r'^(Straßenverkehr|Weg|Platz)')]
green=p[p.tntxt.fillna('').str.match(r'^(Wald|Gehölz|Sport|Friedhof|Landwirtschaft)')]
v=gpd.read_file(F,layer='VerwaltungsEinheit')
print(v.columns.tolist(), len(v))
minx,miny,maxx,maxy=p.total_bounds
ox,oy=int(minx),int(miny)
def enc(geom,tol):
    g=geom.simplify(tol,preserve_topology=True)
    polys=[g] if isinstance(g,Polygon) else list(getattr(g,'geoms',[]))
    out=[]
    for pg in polys:
        if not isinstance(pg,Polygon) or pg.is_empty: continue
        cs=np.round((np.array(pg.exterior.coords)[:-1]-[ox,oy])*2).astype(int)  # half-metre units
        if len(cs)<3: continue
        d=np.vstack([cs[:1],np.diff(cs,axis=0)]).ravel().tolist()
        out.append(d)
    return out
def encall(gs,tol):
    r=[]
    for g in gs: r+=enc(g,tol)
    return r
# near-candidate parcels
near=gpd.sjoin(p[['geometry']], gpd.GeoDataFrame(geometry=c.geometry.buffer(45),crs=c.crs), predicate='intersects')
nearp=p.loc[near.index.unique()]
city=v.dissolve().geometry.iloc[0]
data={'name':NAME,'o':[ox,oy],'w':int(maxx-minx),'h':int(maxy-miny),
 'bld':encall(b.geometry,0.4),
 'road':encall(roads.geometry,0.8),
 'green':encall(green.geometry,1.5),
 'parc':encall(nearp.geometry,0.3),
 'city':enc(city,3)}
cw=c.to_crs(4326)
cands=[]
for i,(r,rw) in enumerate(zip(c.itertuples(),cw.itertuples())):
    ct=rw.geometry.representative_point()
    cands.append({'id':f'{PREFIX}-{i+1:03d}','adr':r.lagebeztxt or '—','fl':r.flstkennz,'gem':r.gemarkung,'flur':int(r.flur) if r.flur else None,
      'nr':(str(r.flstnrzae)+('/'+str(r.flstnrnen) if r.flstnrnen else '')),'a':round(r.flaeche),'b':round(r.breite,1),'l':round(r.laenge,1),
      'fr':round(r.front,1),'n':int(r.nachbarn),'gar':round(r.gar),'typ':r.typ,'s':float(r.score),
      'lat':round(ct.y,6),'lon':round(ct.x,6),'g':enc(r.geometry,0)})
data['c']=cands
s=json.dumps(data,separators=(',',':'),ensure_ascii=False)
open(OUT,'w',encoding='utf-8').write(s)
print(len(s)/1e6,'MB', {k:len(v) for k,v in data.items() if isinstance(v,list)})
