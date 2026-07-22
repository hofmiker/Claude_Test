# Rooftop Wanderer — Atmosphären-Adventure

## Live-URL
https://hofmiker.github.io/Claude_Test/rooftop-wanderer/

## Dateien
- `index.html` — komplettes Spiel (Canvas/Vanilla-JS, keine externen Assets)

## Über das Projekt
Kombiniert den IK-gerigten Umhang-Charakter aus `cape-character/` mit der
Nacht-Skyline-Ästhetik aus `dark-city/` (Mond, Sterne, Parallax-Häuser mit
flackernden Fenstern, Bodennebel). Bewusst als ruhiges Adventure statt
klassisches Jump'n'Run inszeniert: kein Score, keine Leben, keine Gegner —
nur eine stille Wanderung über die Dächer einer schlafenden Stadt zu einem
fernen Licht am Ende der Skyline.

## Features
- Vollständiges IK-Skelett (Zwei-Knochen-IK für Beine/Arme), Verlet-Umhang,
  Kapuze — siehe `cape-character/CLAUDE.md` für die Mechanik-Details
- Laufen, Springen, Ducken, Kanten greifen & hochziehen (mehrphasige
  Klettersequenz) — dieselbe Physik wie in `cape-character/`
  (Treppe aus Dächern führt auf eine neue, höhere Stadt-Ebene, dafür scrollt
  die Kamera bei Bedarf auch vertikal)
- Nächtliche Skyline: Mond mit Glow, funkelnde Sterne, zwei Parallax-Ebenen
  mit warm flackernden Fensterlichtern, Bodennebel
- "Laterne entzünden"-Button lässt den Charakter selbst warm aufleuchten
  (reine Stimmungs-Mechanik, keine Spielwirkung)
- Einblendender Stimmungstext zu Beginn (verblasst nach Bewegung/Zeit) und
  eine leise Schluss-Einblendung, sobald das Licht am Ende der oberen
  Dachterrasse erreicht wird — kein "Score"-Screen, kein Game-Over

## Steuerung
Pfeiltasten/A D — laufen · Leertaste/W/Pfeil hoch — springen bzw. an Kanten
hochziehen · Pfeil runter/S — ducken. Touch-Controls für Mobile vorhanden.

## Tech-Stack
- Reines Canvas 2D + Vanilla JS, kein Build-Schritt, keine Abhängigkeiten
