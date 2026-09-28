import json, glob, os, sys
# Schreibt karten/staedte.json (Auswahlliste der Stadt-Dropdown) aus allen karten/<id>.json.
# Aufruf aus dem Projektordner: python scripts/build.py
DIR=sys.argv[1] if len(sys.argv)>1 else 'karten'
out=[]
for f in sorted(glob.glob(os.path.join(DIR,'*.json'))):
    cid=os.path.splitext(os.path.basename(f))[0]
    if cid=='staedte': continue
    d=json.load(open(f,encoding='utf-8'))
    out.append({'id':cid,'name':d.get('name') or cid.capitalize(),'n':len(d['c'])})
json.dump(out,open(os.path.join(DIR,'staedte.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
print('gespeichert:',os.path.join(DIR,'staedte.json'),out)
