# Projekt: Baulückenfinder (Ordner `lueckenfinder/`)

**Live-URL:** https://hofmiker.github.io/Claude_Test/lueckenfinder/

## Überblick
- Seitentitel „Baulückenfinder“. `index.html` ist die Seite selbst (keine Vorlage/kein Build-Schritt
  mehr); sie lädt die gewählte Stadt per `fetch` aus `karten/<id>.json`, die Stadtauswahl aus
  `karten/staedte.json`. Städte: Herne, Bochum, Gelsenkirchen, Dortmund; `#dortmund` im URL fliegt
  direkt in eine Stadt. Datengröße roh/gzip: Herne 3,9/1,4 MB, Gelsenkirchen 6,0/2,2 MB,
  Bochum 8,7/3,2 MB, Dortmund 13,9/5,0 MB (GitHub Pages liefert gzip-komprimiert aus).
- Start: Deutschland-Übersicht (Umriss + Nachbarländer aus `karten/deutschland.json`), Städte mit
  Daten als schwarze, „atmende“ Markierungen mit Namen und Flächenzahl. Markierungen näher als 56 px
  verschmelzen („4 Städte“); Antippen zoomt auf die Gruppe, eine einzelne Stadt öffnet sie (Kamerafahrt,
  Daten laden währenddessen). Nachbarstädte bleiben als graue Fläche mit Namen antippbar. Knöpfe:
  +/−, ALL (ganze Stadt bzw. Deutschland), DE (Deutschland). Seitenleiste in der Übersicht:
  Summen über alle Städte und Städteliste mit Typ-Balken.
- Welt-Koordinaten: halbe Meter in UTM 32N relativ zu `deutschland.json`→`o`; `prepare()` verschiebt
  jede Stadt beim Laden über ihren Ursprung dorthin (nur erster Punkt je delta-kodiertem Polygon).
- Gesten: Maus ziehen/Mausrad. Touch: **zwei Finger** verschieben + zoomen (Pinch um den Mittelpunkt).
  Auf dem Handy scrollt ein Finger die Seite (`touch-action: pan-y`), bei seitlichem Wischen erscheint
  der Hinweis „Karte mit zwei Fingern bewegen“; auf Tablets (Desktop-Layout) verschiebt auch ein Finger.
  Antippen einer Fläche (Karte oder Liste) zoomt stufenlos hinein.
- Headergrafik `img/header.webp`: vom Projektinhaber gelieferte isometrische Straßenillustration,
  aus einem Screenshot freigestellt (Hintergrund transparent). Vermutlich Stock-Grafik – Lizenz für
  die öffentliche Nutzung beim Projektinhaber klären.
- Gestaltung: sonst reines Schwarz-Weiß; Farbe tragen nur die drei Flächentypen (Baulücke
  orange-rot, Garagengrundstück violett, Freifläche/Garten ocker) – auf der Karte, in Liste,
  Kennzahlen, Flächentyp-Dropdown und im Haupt-Button der Detailansicht („In Google Maps öffnen“).
  Schrift durchgehend IBM Plex Sans Condensed. Standard hell, Mondsymbol oben rechts schaltet auf
  dunkel (per localStorage `lf-theme` gemerkt).
- Seitenleiste: Titel + Design-Schalter, Stadt-Dropdown, Kurztext, drei Kennzahl-Kacheln (klickbar
  als Schnellfilter), „Filter“-Knopf mit Trichter-Icon klappt Flächentyp (eigenes Dropdown mit
  Farbfeldern), Mindestbreite und Mindest-Eignung auf. Darunter Details und Liste.
  Handy: dieser Kopfteil steht über der Karte, Details und Liste darunter.
- Bedienung Karte: Mausrad oder Pinch zum Zoomen, Ziehen zum Verschieben, Klick auf eine Fläche oder
  einen Listeneintrag öffnet die Details.
- Hintergrund umschaltbar „Karte / Satellit“ (localStorage `lf-bg`). Bilder live vom WMS NW DOP
  (`https://www.wms.nrw.de/geobasis/wms_nw_dop`, Layer `nw_dop_rgb`), direkt in EPSG:25832, kein
  Leaflet nötig: zuerst ein winziges Bild der ganzen Stadt (200 px, zusätzlich per Down-/Upsampling
  weichgezeichnet) als Vorschau, dann pro zur Ruhe gekommener Ansicht ein scharfes Bild, das über
  450 ms einblendet (das vorige bleibt darunter). Nur für geöffnete Städte (NRW-Dienst). Der WMS-Host
  ist in der Sandbox gesperrt, getestet wurde mit einem lokalen Ersatzbild.
- Performance: Gebäude, Straßen, Grün und Flurstücke werden in ~500-m-Zellen gebündelt, gezeichnet
  werden nur sichtbare Zellen; in der Gesamtansicht keine Einzelgebäude. Ohne das hängt Bochum
  (142.000 Gebäude) beim Laden; Dortmund (213.000) läuft so mit ~60 fps.
- Mikroanimationen (alle aus bei `prefers-reduced-motion`): Kamerafahrt beim Antippen eines
  Listeneintrags, bei +/−/ALL (zoomt weich, mehrfaches Tippen addiert sich); doppelter Ring-Puls in
  Typfarbe um die gewählte Fläche; Flächen blenden nach dem Laden einer Stadt ein, Kennzahlen zählen
  hoch; Liste erscheint gestaffelt bei Filter-/Stadtwechsel (nicht beim Schieberegler-Ziehen);
  Details, Filter-Panel und Dropdown gleiten/ploppen auf; Design-Symbol dreht sich beim Umschalten;
  „Kennzeichen kopieren“ zeichnet einen Haken; Knöpfe geben beim Drücken leicht nach.
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
3. `build.py` schreibt `karten/staedte.json` (Dropdown + Übersichtskarte: Anzahl je Typ, Ursprung,
   Ausdehnung, vereinfachter Stadtumriss) aus allen `karten/*.json`.
4. `csv_export.py karten/<id>.json` schreibt `ergebnisse/baulücken_<id>.csv` (Excel-tauglich).
5. `deutschland.py <countries-10m.json>` erzeugt `karten/deutschland.json` (einmalig; Quelle Natural
   Earth 1:10m, gemeinfrei, via `npm pack world-atlas@2`).

Neue Stadt (Beispiel Gelsenkirchen, so bereits erledigt; aus diesem Ordner):
```bash
curl -O https://www.opengeodata.nrw.de/produkte/geobasis/lk/akt/gru_vereinfacht_gpkg/gru_vereinf_05513000_Gelsenkirchen_EPSG25832_GeoPackage.zip
unzip gru_vereinf_05513000_Gelsenkirchen_EPSG25832_GeoPackage.zip -d daten
python scripts/analyse.py daten/gru_vereinf_05513000_Gelsenkirchen_EPSG25832.gpkg ergebnisse/kandidaten_gelsenkirchen.gpkg
python scripts/export.py daten/gru_vereinf_05513000_Gelsenkirchen_EPSG25832.gpkg ergebnisse/kandidaten_gelsenkirchen.gpkg karten/gelsenkirchen.json GE Gelsenkirchen
python scripts/build.py
python scripts/csv_export.py karten/gelsenkirchen.json
```
`www.opengeodata.nrw.de` ist in der Session-Umgebung freigeschaltet. Analyse Herne ca. 30 s, Dortmund
wenige Minuten.

Ergebnisse (Stand Kataster 07/2026):
- Herne: 702 Kandidaten, davon 47 Baulücken, 204 Garagengrundstücke, 451 Freiflächen.
- Bochum: 1440 Kandidaten, davon 71 Baulücken, 235 Garagengrundstücke, 1134 Freiflächen.
- Gelsenkirchen: 1473 Kandidaten, davon 97 Baulücken, 472 Garagengrundstücke, 904 Freiflächen.
- Dortmund: 2843 Kandidaten, davon 147 Baulücken, 406 Garagengrundstücke, 2290 Freiflächen.
Tabellen: `ergebnisse/baulücken_<stadt>.csv`.

## Bekannte Grenzen / nächste Schritte
- Viele „Freiflächen“ sind Seitengärten von Nachbarhäusern → manuelle Prüfung am Luftbild nötig.
- Prüfstatus je Fläche speichern (ungeprüft / vielversprechend / verworfen) und Notizen.
- Formular „Interesse melden“ mit echter Speicherung.
- Pipeline für alle NRW-Städte automatisieren, weitere Bundesländer mit Open-Data-ALKIS ergänzen.
- Sprache der Website und Kommunikation: Deutsch.
