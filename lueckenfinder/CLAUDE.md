# Projekt: Baulückenfinder (Ordner `lueckenfinder/`)

**Live-URL:** https://hofmiker.github.io/Claude_Test/lueckenfinder/

## Überblick
- Seitentitel „Baulückenfinder“. `index.html` ist die Seite selbst (keine Vorlage/kein Build-Schritt
  mehr); sie lädt die gewählte Stadt per `fetch` aus `karten/<id>.json`, die Stadtauswahl aus
  `karten/staedte.json`. Standard ist Herne; `#bochum` im URL wählt direkt eine Stadt.
  Daten: Herne 3,9 MB, Bochum 8,7 MB (GitHub Pages liefert gzip-komprimiert aus).
- Gestaltung: sonst reines Schwarz-Weiß; Farbe tragen nur die drei Flächentypen (Baulücke
  orange-rot, Garagengrundstück violett, Freifläche/Garten ocker) – auf der Karte, in Liste,
  Kennzahlen, Flächentyp-Dropdown und im Haupt-Button der Detailansicht („Luftbild öffnen“).
  Schrift durchgehend IBM Plex Sans Condensed. Standard hell, Mondsymbol oben rechts schaltet auf
  dunkel (per localStorage `lf-theme` gemerkt).
- Seitenleiste: Titel + Design-Schalter, Stadt-Dropdown, Kurztext, drei Kennzahl-Kacheln (klickbar
  als Schnellfilter), „Filter“-Knopf mit Trichter-Icon klappt Flächentyp (eigenes Dropdown mit
  Farbfeldern), Mindestbreite und Mindest-Eignung auf. Darunter Details und Liste.
  Handy: dieser Kopfteil steht über der Karte, Details und Liste darunter.
- Bedienung Karte: Mausrad oder Pinch zum Zoomen, Ziehen zum Verschieben, Klick auf eine Fläche oder
  einen Listeneintrag öffnet die Details.
- Hintergrund umschaltbar „Karte / Luftbild“ (localStorage `lf-bg`). Das Luftbild kommt live vom
  WMS NW DOP (`https://www.wms.nrw.de/geobasis/wms_nw_dop`, Layer `nw_dop_rgb`): pro zur Ruhe
  gekommener Ansicht ein GetMap direkt in EPSG:25832, kein Leaflet nötig. Der WMS-Host ist in der
  Sandbox gesperrt, getestet wurde mit einem lokalen Ersatzbild.
- Performance: Gebäude, Straßen, Grün und Flurstücke werden in ~500-m-Zellen gebündelt, gezeichnet
  werden nur sichtbare Zellen; in der Gesamtansicht keine Einzelgebäude. Ohne das hängt Bochum
  (142.000 Gebäude) beim Laden.
- Tech-Stack: Python (geopandas, shapely) für die Pipeline; Canvas 2D + Vanilla JS für die Karte.

## Worum es geht
Geschäftsidee: Baulücken in Großstädten finden und Normalverdienern zusammen mit einem
passenden, bezahlbaren Einfamilienhaus-Konzept anbieten. Ich (Projektinhaber) komme aus der
Vermarktung und vermittle. Die Planung übernehmen Architekten mit Baulückenerfahrung.

## Festgelegte Entscheidungen
- Einfamilienhäuser in Baulücken. **Keine Aufstockungen.**
- **Massivbau mit Beton**, um individuell auf die Grundstücksform einzugehen. Beton gezielt dort,
  wo er ohnehin nötig ist (Brandwände zu den Nachbarn, Hangsockel, Decken, Fertigteiltreppe).
- **Günstig bauen hat Vorrang:** standardisierter Haustyp, der nur in der Länge angepasst wird.
  Kein Keller, kein Aufzug, keine Tiefgarage.
- **Keine Zwischenebenen / kein Split-Level.** Prinzip „ein Geschoss, eine Funktion“, gleiche
  Geschosshöhen, gerade einläufige Treppe an einer Brandwand, Bäder und Küche übereinander.
- Mindestbreite etwa 4,5 m. Haustypen: „Lückenhaus 4,5“ und „Lückenhaus 6,0“; ab ca. 9 m zwei Häuser.
- **Ein Stellplatz gehört dazu** (in Stuttgart und ähnlichen Städten wichtig): offener Stellplatz,
  offene Einfahrt im EG oder im Hangsockel. Sonst extern per Baulast. Keine Autolifte/Parksysteme.
- Flächen öffentlich nur als „Potenzialfläche“ bezeichnen, nie als „zu verkaufen“.
  Keine Eigentümerdaten veröffentlichen.
- Rechtlich zu prüfen: Maklererlaubnis (§ 34c GewO) für Grundstücksvermittlung; Architekten dürfen
  meist keine Vermittlungsprovision zahlen.

## Daten
- Quelle NRW: ALKIS Grundrissdaten vereinfacht (GeoPackage), je Kreis/kreisfreie Stadt:
  https://www.opengeodata.nrw.de/produkte/geobasis/lk/akt/gru_vereinfacht_gpkg/
- Lizenz: Datenlizenz Deutschland – Zero 2.0 (frei, auch kommerziell). Quelle trotzdem nennen.
- Koordinatensystem der Rohdaten: EPSG:25832 (UTM 32N, Meter).
- Rohdaten gehören in `daten/` und werden nicht ins Git-Repository eingecheckt (zu groß).

## Pipeline (scripts/)
1. `analyse.py <gpkg> [ausgabe.gpkg]` findet Kandidaten:
   Wohnbau-/Mischflächen ≥ 90 %, 80–700 m², Hauptgebäude-Anteil < 2 %, Breite ≥ 4,5 m und
   Länge ≥ 10 m (kleinstes umschließendes Rechteck), Kompaktheit ≥ 0,6, Straßenfront ≥ 4,5 m.
   Typen: Baulücke (≥ 2 Hauptgebäude an der Grenze), Garagengrundstück (Garagen > 10 % der Fläche),
   Freifläche / Garten. Eignung 0–8 Punkte.
2. `export.py <gpkg> <kandidaten.gpkg> karten/<id>.json <ID-Präfix> <Name>` erzeugt kompakte
   Kartendaten (Gebäude, Straßen, Grün, Flurstücke um Kandidaten; Koordinaten in halben Metern,
   delta-kodiert) samt Stadtname.
3. `build.py` schreibt `karten/staedte.json` (Stadt-Dropdown) aus allen `karten/*.json`.

Neue Stadt, z. B. Gelsenkirchen (aus diesem Ordner):
```bash
curl -O https://www.opengeodata.nrw.de/produkte/geobasis/lk/akt/gru_vereinfacht_gpkg/gru_vereinf_05513000_Gelsenkirchen_EPSG25832_GeoPackage.zip
unzip gru_vereinf_05513000_Gelsenkirchen_EPSG25832_GeoPackage.zip -d daten
python scripts/analyse.py daten/gru_vereinf_05513000_Gelsenkirchen_EPSG25832.gpkg ergebnisse/kandidaten_gelsenkirchen.gpkg
python scripts/export.py daten/gru_vereinf_05513000_Gelsenkirchen_EPSG25832.gpkg ergebnisse/kandidaten_gelsenkirchen.gpkg karten/gelsenkirchen.json GE Gelsenkirchen
python scripts/build.py
```
`www.opengeodata.nrw.de` ist in der Session-Umgebung freigeschaltet. Analyse Herne ca. 30 s, Bochum
wenige Minuten.

Ergebnisse (Stand Kataster 07/2026):
- Herne: 702 Kandidaten, davon 47 Baulücken, 204 Garagengrundstücke, 451 Freiflächen.
- Bochum: 1440 Kandidaten, davon 71 Baulücken, 235 Garagengrundstücke, 1134 Freiflächen.
Tabellen: `ergebnisse/baulücken_<stadt>.csv`.

## Bekannte Grenzen / nächste Schritte
- Viele „Freiflächen“ sind Seitengärten von Nachbarhäusern → manuelle Prüfung am Luftbild nötig.
- Prüfstatus je Fläche speichern (ungeprüft / vielversprechend / verworfen) und Notizen.
- Formular „Interesse melden“ mit echter Speicherung.
- Pipeline für alle NRW-Städte automatisieren, weitere Bundesländer mit Open-Data-ALKIS ergänzen.
- Sprache der Website und Kommunikation: Deutsch.
