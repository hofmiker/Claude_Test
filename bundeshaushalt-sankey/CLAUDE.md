# Projekt: Bundesfinanzen 2026 (Ordner `bundeshaushalt-sankey/`)

**Live-URL:** https://hofmiker.github.io/Claude_Test/bundeshaushalt-sankey/

Kontext für die Weiterarbeit an diesem Projekt in Claude Code.

## Worum es geht

Statische Website (Vanilla JS, ES-Module, kein Build), die den Bundeshaushalt 2026 und die Sondervermögen als interaktive, animierte Sankey-Diagramme zeigt. Entstanden aus einem Chat, in dem die Diagramme schrittweise entwickelt wurden. Sprache der Oberfläche und Texte: Deutsch.

## Harte Regeln

- **Zahlen nur in `data/*.csv`.** Nie Werte im JS hart codieren. Die Website liest alles zur Laufzeit.
- **Jede Datenzeile braucht eine `quelle_id`**, die in `quellen.csv` existiert. Abgeleitete Werte (Restposten, Summen mehrerer Zeilen) in `anmerkung` erklären.
- **Zeitraum immer sichtbar halten:** Haushaltsjahr, Zeitraum und Wertart (Soll/Plan) kommen aus `meta.csv` und stehen oben; je Diagramm steht ein Kennzeichen „Plan <Jahr>“ neben der Überschrift, der ausführliche Stand hinter dem Info-Knopf.
- Nach Datenänderungen `python3 scripts/check_data.py` ausführen, es muss "Alles konsistent" melden.
- Keine negativen Werte in Sankey-Flüssen. Negative Korrekturen (z. B. Globalposten, steuerliche Maßnahmen) werden mit einem benachbarten Posten verrechnet und in `anmerkung` dokumentiert.

## Fachliche Entscheidungen (bitte beibehalten)

- Kernhaushalt nach **Aufgabenbereichen** (BMF-Funktionenplan, Sollbericht Tabelle 3), nicht nach Einzelplänen. Daher weicht z. B. Verteidigung (93,5) vom Einzelplan 14 (82,7) ab.
- Steuern links **brutto** (Bundesanteil vor Abzügen). Die Abzugsbeträge an EU und Länder (73,0 Mrd.) erscheinen rechts als eigene Kategorie "EU & Länder". So gehen beide Seiten auf (~597,6 Mrd.).
- **Schuldentilgung** ist nicht enthalten: Der Bund refinanziert fällige Anleihen, im Haushalt stehen nur Zinsen.
- Sondervermögen **getrennt** vom Kernhaushalt. Die 10 Mrd. SVIK→KTF werden nur einmal gezählt: als Fluss "Kredite (über SVIK)" direkt zum KTF, Typ `transfer`, rosa. Das SVIK zeigt daher 48,1 statt 58,1.
- KTF-Summe 34,83 Mrd. laut Bundestagsbeschluss; das BMF nennt im Sollbericht 37,4 Mrd. Programmausgaben. Offen, welche Zahl man nimmt.
- Kernhaushalt und Sondervermögen haben **unterschiedliche Maßstäbe** (k = 0,8 bzw. 1,55 px je Mrd.), sonst wären die SV-Kacheln zu klein.

## Interaktion (vom Nutzer so gewünscht)

- Start: nur Ebene 1 und 2. Tipp auf eine Kachel fächert die nächste Ebene auf, zweiter Tipp klappt zu. Es ist je Diagramm immer nur **ein** Ast aufgefächert: Tipp auf eine andere Kachel klappt alle übrigen Äste ein. Tipp neben das Diagramm (irgendwo außerhalb von Kacheln/Bändern, Links, Knöpfen, Infotexten, Tabellen) setzt beide Diagramme auf den Ausgangszustand zurück. Kein separater Zurück-Knopf.
- Auffächern in zwei Phasen: Äste fahren erst geschlossen (aneinanderliegend) aus, dann fächern sie auf. Zuklappen umgekehrt.
- Vertikale Abstände: Kacheln 12 px, Detailäste 6 px (Kernhaushalt); SV-Herkunft 48, Töpfe 32, Verwendung 8. Horizontal haben alle Ebenen eines Diagramms den gleichen Abstand (`columns()` in `charts.js`).
- Zusatztexte (Bedienhinweis, Stand, Hinweise, Datenabruf) stecken hinter runden Info-Knöpfen (ⓘ) neben den Überschriften. Die Info-Box über dem Diagramm zeigt standardmäßig die Gesamtsumme, nach einem Tipp Name, Wert, Anteil und Beschreibung.
- Kacheln ohne abgerundete Ecken.
- Alles animiert (Auffächern und Hervorheben), `prefers-reduced-motion` wird respektiert.
- Mobil (< 640 px) wird im Kernhaushalt nur die Detailspalte der offenen Seite eingeblendet.
- Typografie: Google Fonts **Source Serif 4** (600, Überschriften und große Zahlen) und **IBM Plex Sans** (400/600, Text und Diagramm), selbst gehostet in `fonts/` (kein Abruf bei Google, DSGVO). Kleine Labels in Versalien mit Sperrung, Zahlen tabellarisch.
- Mobile first: muss auf ~380 px Breite gut lesbar sein.

## Technik

- `js/engine.js`: Elemente mit stabiler `id` und numerischen Props `p`, Interpolation per requestAnimationFrame. Neue Elemente starten in ihrer `en`-Geometrie (eingeklappt am Elternknoten), entfernte fahren dorthin zurück. Elemente mit `mid`-Geometrie (Detailäste) laufen zweiphasig en → mid → p; alles andere ist nach 60 % der Dauer fertig.
- `js/charts.js`: `buildKern` und `buildSV` liefern `{ els, H }` für eine gegebene Breite `W`. Layout-Konstanten stehen dort.
- Klick-Handling per Event-Delegation über `data-id`. Präfixe: Kernhaushalt `Lt/Rt` Kachel, `Lb/Rb` Band, `Ld/Rd` Detail; Sondervermögen `S` Herkunft, `F` Fluss, `P` Topf, `U` Verwendung.
- Lokaler Test: `python3 -m http.server 8000`.

## Mögliche nächste Schritte

- Ist-Werte 2026 ergänzen, sobald der Haushaltsabschluss vorliegt (z. B. Umschalter Soll/Ist, Spalte `wertart` in den CSVs).
- Mehrere Jahre vergleichen (Jahresauswahl, Daten je Jahr in Unterordnern `data/2026/`).
- Kernhaushalt und Sondervermögen optional in einem Gesamtbild zeigen.
- Teilen-Funktion: aufgeklappten Zustand in der URL speichern.
