import geopandas as gpd, pandas as pd, numpy as np, re, json
from shapely.geometry import Polygon
import sys
F=sys.argv[1]  # Pfad zur ALKIS-GeoPackage-Datei
OUT=sys.argv[2] if len(sys.argv)>2 else 'ergebnisse/kandidaten.gpkg'
p=gpd.read_file(F,layer='Flurstueck')[['flstkennz','gemarkung','flur','flstnrzae','flstnrnen','flaeche','lagebeztxt','tntxt','geometry']]
b=gpd.read_file(F,layer='GebauedeBauwerk')[['gebnutzbez','funktion','anzahlgs','geometry']]

def share(t):
    if not isinstance(t,str): return 0,{}
    parts=t.split(';'); d={}
    for i in range(0,len(parts)-1,2):
        try: d[parts[i]]=d.get(parts[i],0)+float(parts[i+1])
        except: pass
    tot=sum(d.values()) or 1
    return (d.get('Wohnbaufläche',0)+d.get('Fläche gemischter Nutzung',0))/tot, d
p['wshare']=p.tntxt.map(lambda t: share(t)[0])
roads=p[p.tntxt.fillna('').str.match(r'^(Straßenverkehr|Weg|Platz)')].copy()
c=p[(p.wshare>=0.9)&(p.flaeche.between(80,700))].copy()
print('Wohn-Flurstücke 80-700 m²:',len(c))

MAINEX={'Gebäude zum Parken','Carport','Gebäude zur Freizeitgestaltung','Gebäude für Erholungszwecke','Treibhaus, Gewächshaus','Überdachung','Durchfahrt im Gebäude','Auskragender Geschossteil','Arkade'}
bm=b[(b.gebnutzbez=='Gebäude')&(~b.funktion.isin(MAINEX))].copy()
bg=b[b.funktion.isin({'Gebäude zum Parken','Carport'})].copy()
bf=b[b.funktion.isin({'Gebäude zur Freizeitgestaltung','Gebäude für Erholungszwecke'})].copy()
c['cid']=range(len(c))
def cover(bld):
    ov=gpd.overlay(c[['cid','geometry']],bld[['geometry']],how='intersection',keep_geom_type=True)
    ov['a']=ov.area
    return ov.groupby('cid').a.sum()
c['main']=c.cid.map(cover(bm)).fillna(0)
c=c[c.main < 0.02*c.flaeche+1].copy()
print('ohne Hauptgebäude:',len(c))
c['gar']=c.cid.map(cover(bg)).fillna(0)
c['frei']=c.cid.map(cover(bf)).fillna(0)
# shape
def dims(g):
    r=g.minimum_rotated_rectangle
    xs=list(r.exterior.coords)
    l=[np.hypot(xs[i+1][0]-xs[i][0],xs[i+1][1]-xs[i][1]) for i in range(2)]
    return min(l),max(l),g.area/(r.area or 1)
d=c.geometry.map(dims)
c['breite']=[x[0] for x in d]; c['laenge']=[x[1] for x in d]; c['kompakt']=[x[2] for x in d]
c=c[(c.breite>=4.5)&(c.laenge>=10)&(c.kompakt>=0.6)].copy()
print('Form ok:',len(c))
# frontage to road
rb=roads.geometry.buffer(0.5).union_all()
c['front']=c.geometry.boundary.intersection(rb).length
c=c[c.front>=4.5].copy()
print('mit Straßenzugang:',len(c))
# neighbour buildings touching boundary (grenzständig)
sj=gpd.sjoin(bm[['geometry']].assign(bid=range(len(bm))), gpd.GeoDataFrame(c[['cid']],geometry=c.geometry.buffer(0.6),crs=c.crs), predicate='intersects')
c['nachbarn']=c.cid.map(sj.groupby('cid').bid.nunique()).fillna(0).astype(int)
c['hausnr']=c.lagebeztxt.fillna('').str.contains(r'\d')
def kind(r):
    if r.gar>0.1*r.flaeche: return 'Garagengrundstück'
    if r.nachbarn>=2: return 'Baulücke'
    return 'Freifläche / Garten'
c['typ']=c.apply(kind,axis=1)
sc=np.clip(c.front,0,15)/15*2 + np.minimum(c.nachbarn,2)*1.5 + c.hausnr*1 + ((c.breite>=5)&(c.breite<=14))*1 + c.flaeche.between(100,450)*1 - (c.frei>0)*0.5
c['score']=sc.round(1)
c=c.sort_values('score',ascending=False)
print(c.typ.value_counts()); print(c.score.describe())
c.to_file(OUT,driver='GPKG'); print('gespeichert:',OUT)
