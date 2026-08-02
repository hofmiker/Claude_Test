# 3D Character Test — Low-Poly Charakter-Studie

## Live-URL
https://hofmiker.github.io/Claude_Test/3d-character-test/

## Beschreibung
Freistehende 3D-Low-Poly-Charakterfigur zum Testen von Rig, Laufzyklus,
Sprung-Zustandsmaschine (Windup/Air/Land/Hang/Climb) und Idle-Animation
(Kratz-Geste nach 5s Inaktivität). Ursprünglich als Vorstudie für den
Spielcharakter aus `dhl-city/` entstanden, jetzt als eigenständiges Projekt
herausgelöst.

## Level-Auswahl
Beim Start wählt man eines von zwei Levels (jederzeit über den "🔁 Level"-
Button oben rechts wechselbar):
- **🌲 Wald** — offene Wiese mit Bäumen, Büschen und Kisten-Stapeln
- **📦 Lagerhaus** — große geschlossene Halle (150×150, Lampen-Raster alle
  30 Einheiten), ausschließlich Kisten als Hindernisse: sechs echte
  Kisten-Pyramiden (`addCratePyramid()`, Ziggurat-Versatz mit bis zu 5
  Stufen, größte mit Basis 9×9 = 165 Kisten), großzügig über die ganze
  Halle verteilt, plus ein paar einzelne Stapel nah am Spawn — über 400
  Kisten insgesamt, reichlich Gelegenheit für die Kletter-Mechanik

Beide Level teilen sich Charakter, Physik und Steuerung; nur Deko/Layout,
Beleuchtung, Hintergrundfarbe/Nebel und `worldBounds` (Lagerhaus ist von
Wänden begrenzt, Wald nicht) unterscheiden sich. Siehe `buildForestLevel()`
und `buildWarehouseLevel()`.

## Steuerung
- Pfeiltasten / WASD: Bewegen
- Space bzw. On-Screen-Jump-Button: Springen, bzw. am Kisten-Rand hängend:
  hochziehen
- Virtueller 360°-Joystick unten links (Touch + Maus) für analoges Bewegen —
  ported aus `toy-story/gameplay/player.js` (dieselbe Technik läuft auch im
  Astronauten-Level von `starship-launch-animation.html`): Knüppel folgt
  Finger/Maus frei im Kreis, liefert 0..1-Beträge statt reiner Tasten-
  Booleans, gemischt per `Math.max()` mit der Tastatur

## Features
- Gegliedertes Skelett (Torso, Kopf mit Gesichtszügen, Arme, Beine) aus
  primitiven Three.js-Geometrien (Cylinder, Icosahedron, Box)
- Lauf-, Idle-, Sprung-, Häng- und Klettersanimation über eine Zustandsmaschine
  (`JS.NONE/WINDUP/AIR/LAND/HANG/CLIMB`)
- **Kanten-Klettern** (Konzept aus `cape-character/`/`rooftop-wanderer/`
  übernommen, von 2D-Seitenansicht auf 3D/Top-Down übertragen): Kisten, die
  höher als eine kleine Automatik-Stufe sind (`AUTO_STEP_MAX_TOPY = 0.85`),
  sind keine begehbaren Rampen mehr, sondern echte Wände
  (`resolveWallCollisions()`). Springt man in der Luft nah an eine solche
  Kante (`tryGrabLedge()`, nächster Punkt auf der Kisten-AABB statt
  links/rechts wie im 2D-Original), hängt sich der Charakter ein
  (`JS.HANG`) und zieht sich auf erneuten Sprung-Tastendruck hoch
  (`JS.CLIMB`, geskriptete Mantle-Animation) — oder lässt mit Taste "runter"
  wieder los. Bei Kisten-Stapeln mit identischem Footprint zählt nur die
  **oberste** Lage als Kollisions-/Greifpunkt (tiefere Lagen sind rein
  visuelle Füllung, siehe `addCrate(..., registerCollision)`), da eine
  direkt darübergestapelte Kiste jede tiefere Seitenkante verdeckt. Genau
  darauf baut `addCratePyramid()` auf: jede Pyramidenstufe ist ein
  `n`×`n`-Raster, die nächste Stufe (`n-2`) sitzt exakt auf dem inneren
  Feld der vorigen — nur der dadurch freibleibende äußerste Ring pro Stufe
  wird als Kollisions-/Greifpunkt registriert, der Rest ist verdeckt.
- Kamera folgt hinter dem Charakter und zoomt im Idle näher heran

## Tech-Stack
- Three.js r160, lokal vendored unter `vendor/three.module.min.js` (ES-Modul,
  vorher r128 per CDN — CDN-Hosts sind per Netzwerk-Policy in der Sandbox
  blockiert, lokales Vendoring war nötig für ein echtes GIF)
- Touch (virtueller Joystick + Jump-Button) + Keyboard Controls
