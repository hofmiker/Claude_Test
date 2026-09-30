#!/usr/bin/env python3
"""Prüft die CSV-Tabellen in data/ auf Konsistenz.

Aufruf im Projektordner:  python3 scripts/check_data.py
Beendet sich mit Code 1, wenn ein Fehler gefunden wurde.
"""
import csv
import sys
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"
TOL = 100  # Mio. Euro Toleranz für Rundungsdifferenzen
errors, notes = [], []


def read(name):
    with open(DATA / name, encoding="utf-8-sig", newline="") as fh:
        return list(csv.DictReader(fh, delimiter=";"))


def mio(row, key="wert_mio_eur", where=""):
    try:
        v = float(str(row[key]).replace(",", "."))
    except ValueError:
        errors.append(f"{where}: '{row[key]}' ist keine Zahl")
        return 0.0
    if v < 0:
        errors.append(f"{where}: negativer Wert {v} (Sankey kann keine negativen Flüsse zeigen)")
    return v


quellen = {q["quelle_id"] for q in read("quellen.csv")}
kat = read("kernhaushalt_kategorien.csv")
ein, aus = read("kernhaushalt_einnahmen.csv"), read("kernhaushalt_ausgaben.csv")
toepfe = {t["topf_id"] for t in read("sondervermoegen_toepfe.csv")}
herkunft = {h["gruppe"] for h in read("sondervermoegen_herkunft.csv")}
zu, verw = read("sondervermoegen_zufluesse.csv"), read("sondervermoegen_verwendung.csv")

for name, rows in [("kernhaushalt_einnahmen", ein), ("kernhaushalt_ausgaben", aus),
                   ("sondervermoegen_zufluesse", zu), ("sondervermoegen_verwendung", verw)]:
    for i, r in enumerate(rows, 2):
        if r.get("quelle_id") not in quellen:
            errors.append(f"{name}.csv Zeile {i}: Quelle '{r.get('quelle_id')}' fehlt in quellen.csv")

for seite, rows, fname in [("einnahmen", ein, "kernhaushalt_einnahmen"), ("ausgaben", aus, "kernhaushalt_ausgaben")]:
    known = {k["kategorie"] for k in kat if k["seite"] == seite}
    for i, r in enumerate(rows, 2):
        if r["kategorie"] not in known:
            errors.append(f"{fname}.csv Zeile {i}: Kategorie '{r['kategorie']}' fehlt in kernhaushalt_kategorien.csv")

sum_ein = sum(mio(r, where="Einnahmen") for r in ein)
sum_aus = sum(mio(r, where="Ausgaben") for r in aus)
notes.append(f"Kernhaushalt: Einnahmen {sum_ein:,.0f} / Ausgaben inkl. EU & Länder {sum_aus:,.0f} Mio. €")
if abs(sum_ein - sum_aus) > TOL:
    errors.append(f"Kernhaushalt unausgeglichen: Differenz {sum_ein - sum_aus:,.0f} Mio. €")

for i, r in enumerate(zu, 2):
    if r["ziel_topf"] not in toepfe:
        errors.append(f"sondervermoegen_zufluesse.csv Zeile {i}: Topf '{r['ziel_topf']}' unbekannt")
    if r["herkunft_gruppe"] not in herkunft:
        errors.append(f"sondervermoegen_zufluesse.csv Zeile {i}: Gruppe '{r['herkunft_gruppe']}' unbekannt")
    if r["typ"] not in {"kredit", "transfer", "eigen"}:
        errors.append(f"sondervermoegen_zufluesse.csv Zeile {i}: Typ muss kredit, transfer oder eigen sein")
for t in sorted(toepfe):
    a = sum(mio(r, where=t) for r in zu if r["ziel_topf"] == t)
    b = sum(mio(r, where=t) for r in verw if r["topf_id"] == t)
    notes.append(f"{t}: Zuflüsse {a:,.0f} / Verwendung {b:,.0f} Mio. €")
    if abs(a - b) > TOL:
        errors.append(f"{t}: Zuflüsse und Verwendung weichen um {a - b:,.0f} Mio. € ab")

print("\n".join(notes))
if errors:
    print("\nFEHLER:\n- " + "\n- ".join(errors))
    sys.exit(1)
print("\nAlles konsistent.")
