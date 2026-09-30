import json, sys, os
# Schreibt die Kandidatentabelle einer Stadt als CSV (Excel-tauglich: UTF-8 mit BOM, Semikolon, Dezimalkomma).
# Aufruf: python scripts/csv_export.py karten/<stadt>.json [ergebnisse/baulücken_<stadt>.csv]
SRC=sys.argv[1]
cid=os.path.splitext(os.path.basename(SRC))[0]
OUT=sys.argv[2] if len(sys.argv)>2 else f'ergebnisse/baulücken_{cid}.csv'
d=json.load(open(SRC,encoding='utf-8'))
dez=lambda x: str(x).replace('.',',')
rows=['ID;Typ;Adresse;Gemarkung;Flur;Flurstück;Kennzeichen;Fläche m²;Breite m;Länge m;Straßenfront m;Gebäude an Grenze;Eignung;Breitengrad;Längengrad']
for c in d['c']:
    rows.append(';'.join(map(str,[c['id'],c['typ'],c['adr'],c['gem'],'' if c['flur'] is None else c['flur'],c['nr'],c['fl'],
        c['a'],dez(c['b']),dez(c['l']),dez(c['fr']),c['n'],dez(f"{c['s']:.1f}"),c['lat'],c['lon']])))
open(OUT,'w',encoding='utf-8-sig',newline='').write('\r\n'.join(rows)+'\r\n')
print('gespeichert:',OUT,len(rows)-1,'Zeilen')
