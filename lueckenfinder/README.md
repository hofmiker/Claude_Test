# Lückenfinder – Startpaket

Findet unbebaute Wohnbaugrundstücke (Baulücken) im amtlichen Kataster und zeigt sie auf einer Karte.

## Inhalt

| Ordner / Datei | Was es ist |
|---|---|
| `CLAUDE.md` | Projektgedächtnis: Ziel, Entscheidungen, Datenquellen. Claude Code liest diese Datei automatisch. |
| `scripts/analyse.py` | Sucht die Kandidaten aus den Katasterdaten heraus. |
| `scripts/export.py` | Bereitet Karte und Kandidaten für die Webseite auf. |
| `scripts/build.py` | Baut daraus eine fertige HTML-Karte. |
| `web/template.html` | Vorlage der Kartenseite. |
| `index.html` | Fertige Karte für Herne (live: https://hofmiker.github.io/Claude_Test/lueckenfinder/). |
| `ergebnisse/` | Kandidatentabelle für Herne (CSV). |
| `daten/` | Hier kommen die heruntergeladenen Katasterdateien hin (leer). |

## Weitermachen mit Claude Code

1. ZIP entpacken, zum Beispiel nach `Dokumente/lueckenfinder`.
2. Claude Code starten und diesen Ordner als Projekt öffnen
   (in der Claude-App den Ordner auswählen oder im Terminal `cd lueckenfinder` und dann `claude`).
3. Als erste Nachricht zum Beispiel:

   > Lies CLAUDE.md. Richte eine Python-Umgebung ein, lade die Katasterdaten für Herne
   > nach `daten/` und führe die Pipeline einmal komplett aus, um zu prüfen, dass alles läuft.

Gute nächste Aufträge:
- „Baue die Karte auf Leaflet um, mit Luftbild von Geobasis NRW als Hintergrund.“
- „Füge pro Fläche einen Prüfstatus und Notizen hinzu, die gespeichert werden.“
- „Werte zusätzlich Bochum, Gelsenkirchen und Dortmund aus.“
- „Mach daraus eine Website, die ich online stellen kann.“

## Pipeline von Hand ausführen

Voraussetzung: Python 3.10 oder neuer.

```bash
pip install geopandas pyogrio shapely pyproj

# 1. Katasterdatei herunterladen (z. B. Herne) und nach daten/ entpacken:
#    https://www.opengeodata.nrw.de/produkte/geobasis/lk/akt/gru_vereinfacht_gpkg/

# 2. Kandidaten finden
python scripts/analyse.py daten/gru_vereinf_05916000_Herne_EPSG25832.gpkg ergebnisse/kandidaten.gpkg

# 3. Kartendaten erzeugen (letztes Argument = Kürzel für die IDs)
python scripts/export.py daten/gru_vereinf_05916000_Herne_EPSG25832.gpkg ergebnisse/kandidaten.gpkg ergebnisse/karte.json HE

# 4. HTML-Karte bauen (überschreibt die Live-Seite index.html)
python scripts/build.py ergebnisse/karte.json index.html
```

Laufzeit für Herne: etwa ein bis zwei Minuten.

## Daten und Lizenz

Geobasisdaten: © Geobasis NRW, Datenlizenz Deutschland – Zero – Version 2.0.
Die Datensätze enthalten keine Eigentümer. Die Ergebnisse sind automatisch ermittelte
Potenzialflächen und müssen vor einer Ansprache am Luftbild und vor Ort geprüft werden.
