import sys
# Setzt Kartendaten (JSON) in die Vorlage ein und erzeugt eine eigenständige HTML-Seite.
DATA=sys.argv[1] if len(sys.argv)>1 else 'ergebnisse/karte.json'
OUT=sys.argv[2] if len(sys.argv)>2 else 'ergebnisse/karte.html'
d=open(DATA,encoding='utf-8').read().replace('</','<\\/')
t=open('web/template.html',encoding='utf-8').read().replace('__DATA__',d)
open(OUT,'w',encoding='utf-8').write(t)
print('gespeichert:',OUT)
