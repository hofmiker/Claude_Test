# Rooftop Wanderer — Atmosphären-Adventure

## Live-URL
https://hofmiker.github.io/Claude_Test/rooftop-wanderer/

## Dateien
- `index.html` — komplettes Spiel (Canvas/Vanilla-JS, keine externen Assets)

## Über das Projekt
Kombiniert den IK-gerigten Umhang-Charakter aus `cape-character/` mit der
Nacht-Skyline-Ästhetik aus `dark-city/` (Mond, Sterne, Parallax-Häuser mit
flackernden Fenstern). Bewusst als ruhiges Adventure statt klassisches
Jump'n'Run inszeniert: kein Score, keine Leben, keine Gegner — nur eine
stille Wanderung über die Dächer einer schlafenden Stadt zu einem fernen
Licht am Ende der Skyline.

Die gesamte Szene spielt ausschließlich auf Dächern — kein Bodenlevel, keine
Häuser zum Hochklettern von unten. Der Charakter läuft über eine Reihe
großer, realistischer Flachdächer und springt selbst von Haus zu Haus über
die Lücken dazwischen; niedrige Dachmauern (Parapets) säumen jede Kante,
sodass man nicht versehentlich hinunterfällt, sondern aktiv abspringen muss.
Ein missglückter Sprung in eine echte Lücke wird abgefangen: der Charakter
landet sanft zurück am letzten sicheren Stand statt endlos zu fallen.

## Level-Aufbau (10 Dachabschnitte, ~5 Min. Spielzeit)
Jeder Abschnitt hat ein eigenes Möbelstück/Motiv und eine eigene
Texteinblendung beim ersten Betreten:
1. Start-Terrasse — Tisch & Stühle
2. Wäscheleine im Wind
3. Kistenlager
4. Klimaanlagen
5. Gewächshaus
6. Vogelhaus
7. Zweites Dachausstiegs-Häuschen
8. kleiner Absatz
9. Wasserturm — zu hoch zum Springen, muss erklettert werden (Kante greifen
   & hochziehen)
10. Finale Dachterrasse mit dem Ziel-Licht

## Features
- Vollständiges IK-Skelett (Zwei-Knochen-IK für Beine/Arme), Verlet-Umhang,
  Kapuze — siehe `cape-character/CLAUDE.md` für die Mechanik-Details
- Laufen, Springen, Ducken, Kanten greifen & hochziehen (mehrphasige
  Klettersequenz) — dieselbe Physik wie in `cape-character/`
- Jedes Dach ist über tippbare Requisiten (Tisch & Stühle, Wäscheleine,
  Kisten, Klimaanlagen, Gewächshaus, Vogelhaus, Dachausstiegs-Häuschen)
  individuell gestaltet. Antippen/Anklicken lässt den Charakter einen
  kurzen reflektierenden Satz zu sich selbst sagen — reine Stimmungs-
  Mechanik ohne Spielwirkung.
- Nächtliche Skyline: Mond mit Glow, funkelnde Sterne, zwei Parallax-Ebenen
  mit warm flackernden Fensterlichtern, Bodennebel
- "Laterne entzünden"-Button lässt den Charakter selbst warm aufleuchten
  (reine Stimmungs-Mechanik, keine Spielwirkung)
- Einblendender Stimmungstext zu Beginn (verblasst nach Bewegung/Zeit),
  eine kurze Texteinblendung beim ersten Betreten der meisten Dächer, und
  eine leise Schluss-Einblendung, sobald das Licht auf der finalen
  Dachterrasse erreicht wird — kein "Score"-Screen, kein Game-Over

## Steuerung
Pfeiltasten/A D — laufen · Leertaste/W/Pfeil hoch — springen bzw. an Kanten
hochziehen · Pfeil runter/S — ducken. Touch-Controls für Mobile vorhanden.

## Tech-Stack
- Reines Canvas 2D + Vanilla JS, kein Build-Schritt, keine Abhängigkeiten
