# Bundesfinanzen 2026 als Geldfluss

Interaktive Sankey-Diagramme zum Bundeshaushalt 2026 (Kernhaushalt) und zu den Sondervermögen (Bundeswehr, Infrastruktur/SVIK, Klimafonds/KTF).

**Zeitraum der Daten:** Haushaltsjahr 2026 (01.01. bis 31.12.2026), **Soll-Werte** (Planung laut Haushaltsgesetz und Wirtschaftsplänen), keine Ist-Werte.

## Starten

Die Seite lädt die CSV-Dateien per `fetch`, deshalb braucht sie einen Webserver (Doppelklick auf `index.html` reicht nicht):

```bash
cd bundeshaushalt-sankey
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

Kein Build-Schritt, keine Abhängigkeiten. Jeder statische Hoster (GitHub Pages, Netlify, eigener Server) funktioniert.

## Aufbau

```
index.html            Seite
css/style.css         Gestaltung inkl. Dark Mode
js/data.js            lädt und prüft die CSVs, baut die Datenstruktur
js/charts.js          berechnet das Layout beider Diagramme
js/engine.js          animiert zwischen zwei Layout-Zuständen
js/main.js            Interaktion, Infoboxen, Datentabellen
data/*.csv            alle Zahlen und Quellen (einzige Datenquelle)
scripts/check_data.py prüft die CSVs auf Konsistenz
```

## Daten aktualisieren

Alle Zahlen stehen ausschließlich in `data/`. Format: Semikolon als Trenner, UTF-8, Werte in **Mio. Euro** als ganze Zahl. Die Dateien lassen sich direkt in Excel oder LibreOffice öffnen.

| Datei | Inhalt |
|---|---|
| `meta.csv` | Haushaltsjahr, Zeitraum, Wertart, Stand, Hinweistexte |
| `quellen.csv` | Quellen mit ID, Titel, Herausgeber, URL, Stand |
| `kernhaushalt_kategorien.csv` | Hauptkategorien (Ebene 1) je Seite, Farbe, Reihenfolge |
| `kernhaushalt_einnahmen.csv` | Einnahmen-Posten (Ebene 2) |
| `kernhaushalt_ausgaben.csv` | Ausgaben-Posten (Ebene 2), inkl. Abzüge an EU und Länder |
| `sondervermoegen_toepfe.csv` | die Sondervermögen (Ebene 2) |
| `sondervermoegen_herkunft.csv` | Herkunftsgruppen (Ebene 1) |
| `sondervermoegen_zufluesse.csv` | Flüsse Herkunft → Topf, Typ `kredit`, `transfer` oder `eigen` |
| `sondervermoegen_verwendung.csv` | Verwendung je Topf (Ebene 3) |

Jede Datenzeile verweist per `quelle_id` auf `quellen.csv`, dazu `fundstelle` und `anmerkung` (z. B. wenn ein Wert als Rest berechnet wurde).

Nach jeder Änderung:

```bash
python3 scripts/check_data.py
```

Das Skript prüft, ob Einnahmen und Ausgaben je Topf aufgehen, ob alle Quellen und Kategorien existieren und ob Werte negativ sind. Die Website zeigt Abweichungen zusätzlich als Hinweis oben an.

Für ein neues Haushaltsjahr: Werte ersetzen, `meta.csv` (Jahr, Zeitraum, Stand) und `quellen.csv` anpassen.

## Farben

In den Kategorien-Dateien: `tax` Steuern, `debt` Kredite/Zinsen, `soc` Soziales, `tr` Transfer/Abzüge, `oth` Sonstiges, `bw`/`sv`/`kt` die drei Sondervermögen. Definiert in `js/charts.js` (`COL`).
