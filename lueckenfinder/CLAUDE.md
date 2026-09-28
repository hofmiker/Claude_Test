# Projekt: Lückenfinder

**Live-URL:** https://hofmiker.github.io/Claude_Test/lueckenfinder/

## Überblick
- `index.html`: eigenständige Karte für Herne. Gebäude, Straßen, Grün und Flurstücke aus dem
  Kataster, dazu 702 markierte Potenzialflächen. Daten sind eingebettet (ca. 3,9 MB), es gibt
  keine Kartenkacheln und keine Abhängigkeiten außer Google Fonts.
- Bedienung: Mausrad oder Pinch zum Zoomen, Ziehen zum Verschieben, Klick auf eine Fläche oder einen
  Listeneintrag öffnet die Details. Filter nach Typ, Mindestbreite und Eignung.
- Tech-Stack: Python (geopandas, shapely) für die Pipeline; Canvas 2D + Vanilla JS für die Karte.
- Neu bauen: `python scripts/build.py ergebnisse/karte.json index.html` (aus diesem Ordner heraus).

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
2. `export.py <gpkg> <kandidaten.gpkg> <karte.json> <ID-Präfix>` erzeugt kompakte Kartendaten
   (Gebäude, Straßen, Grün, Flurstücke um Kandidaten; Koordinaten in halben Metern, delta-kodiert).
3. `build.py <karte.json> <karte.html>` setzt die Daten in `web/template.html` ein.
   Die Live-Seite ist `index.html` in diesem Ordner.

Ergebnis Herne (Stand Kataster 07/2026): 702 Kandidaten, davon 47 Baulücken, 204 Garagengrundstücke,
451 Freiflächen.

## Bekannte Grenzen / nächste Schritte
- Viele „Freiflächen“ sind Seitengärten von Nachbarhäusern → manuelle Prüfung am Luftbild nötig.
- Die aktuelle Karte zeichnet nur Katasterdaten (keine Kacheln). Für die echte Website:
  Leaflet oder MapLibre mit Luftbild (z. B. WMS NW DOP) und Katasterkarte als Hintergrund.
- Prüfstatus je Fläche speichern (ungeprüft / vielversprechend / verworfen) und Notizen.
- Formular „Interesse melden“ mit echter Speicherung.
- Pipeline für alle NRW-Städte automatisieren, weitere Bundesländer mit Open-Data-ALKIS ergänzen.
- Sprache der Website und Kommunikation: Deutsch.
