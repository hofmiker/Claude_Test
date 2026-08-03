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
- **📦 Lagerhaus** — kompakte geschlossene Halle (84×84, Lampen-Raster alle
  28 Einheiten), ausschließlich Kisten als Hindernisse: drei Kisten-
  Pyramiden (`addCratePyramid()`, Ziggurat-Versatz, Basis 5×5/5×5/3×3) aus
  den großen Würfel-Kisten, plus ein paar einzelne Stapel nah am Spawn

Beide Level teilen sich Charakter, Physik und Steuerung; nur Deko/Layout,
Beleuchtung, Hintergrundfarbe/Nebel und `worldBounds` (Lagerhaus ist von
Wänden begrenzt, Wald nicht) unterscheiden sich. Siehe `buildForestLevel()`
und `buildWarehouseLevel()`.

## Steuerung
- Pfeiltasten / WASD: Bewegen
- Space bzw. On-Screen-Jump-Button: Springen, bzw. am Kisten-Rand hängend:
  hochziehen
- Am Kisten-Rand hängend: ←/→ hangelt seitlich an derselben Kante entlang,
  ↓ lässt los (mit kurzer Abklingzeit, damit man nicht sofort wieder in
  dieselbe Kante fällt und erneut einhängt)
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
  übernommen, von 2D-Seitenansicht auf 3D/Top-Down übertragen): Jede Kiste
  ist ein echter Würfel mit `CRATE_H = 3.2` (alle Kanten gleich lang) und
  damit deutlich höher als der Charakter (~2.1 Einheiten) — ein einfacher
  Schritt reicht nie, es braucht immer einen echten Sprung, um überhaupt
  in Greif-Reichweite der Oberkante zu kommen (`AUTO_STEP_MAX_TOPY = 0.35`
  liegt absichtlich unter jeder möglichen Kisten-Höhe). Kisten sind keine
  begehbaren Rampen, sondern echte Wände (`resolveWallCollisions()`).
  Springt man in der Luft nah an eine solche Kante (`tryGrabLedge()`,
  Flächen-Normale auf die nächstliegende Würfelseite eingerastet statt
  freiem Vektor zur Mitte — robust auch nahe Ecken), hängt sich der
  Charakter ein (`JS.HANG`). Die Hang-Pose ist aus der tatsächlichen
  Schulter/Ellbogen-Geometrie kalibriert (`HAND_DROP`/`HAND_REACH_OUT`,
  per `getWorldPosition()` an der Hand gemessen), damit die Hand exakt auf
  Kantenhöhe an der Wand landet — nicht darüber schwebend oder durch die
  Wand geclippt. Während des Hängens bewegen ←/→ den Charakter seitlich
  an derselben Fläche entlang (`shimmyOffset`, geklemmt auf die
  Kantenbreite abzüglich Körperbreite), ↓ lässt mit kurzer Abklingzeit
  (`grabCooldown`) los, damit man nicht sofort wieder in dieselbe Kante
  fällt. Erneuter Sprung-Tastendruck zieht von der aktuellen (ggf.
  verschobenen) Position hoch (`JS.CLIMB`, geskriptete Mantle-Animation).
  Bei Kisten-Stapeln mit identischem Footprint zählt nur die **oberste**
  Lage als Kollisions-/Greifpunkt (tiefere Lagen sind rein visuelle
  Füllung, siehe `addCrate(..., registerCollision)`), da eine direkt
  darübergestapelte Kiste jede tiefere Seitenkante verdeckt. Genau darauf
  baut `addCratePyramid()` auf: jede Pyramidenstufe ist ein `n`×`n`-Raster
  aus Würfeln, die nächste Stufe (`n-2`) sitzt exakt auf dem inneren Feld
  der vorigen — nur der dadurch freibleibende äußerste Ring pro Stufe wird
  als Kollisions-/Greifpunkt registriert, der Rest ist verdeckt.

  **Weiterhangeln** bleibt beim Bewegen strikt parallel zur Fläche
  (`shimmyOffset` entlang der Tangente, `hangTargetX/Z` bleibt die
  Flächen-Mitte als Anker) und geht am Ende einer Kante nahtlos weiter
  (`tryContinueLedge()`): zuerst wird eine Nachbarkiste mit gleicher
  Normalen probiert (dieselbe Wand geht weiter), sonst dreht sich der
  Charakter um 90° auf die angrenzende Fläche derselben Kiste (Ecke) —
  jeweils nur um den tatsächlichen Rest-Weg dieses Frames versetzt, nicht
  wieder bis zum Limit, sonst würde bei gehaltener Taste jeden Frame erneut
  gedreht. Die Hände greifen beim Hangeln abwechselnd (`shimmyPhase`,
  animiert in `animateCharacter()`s HANG-Zweig) statt sich synchron zu
  bewegen; im Stand geht die Pose zurück auf die kalibrierte, symmetrische
  Greif-Haltung.
- Kamera folgt hinter dem Charakter und zoomt im Idle näher heran

## Tech-Stack
- Three.js r160, lokal vendored unter `vendor/three.module.min.js` (ES-Modul,
  vorher r128 per CDN — CDN-Hosts sind per Netzwerk-Policy in der Sandbox
  blockiert, lokales Vendoring war nötig für ein echtes GIF)
- Touch (virtueller Joystick + Jump-Button) + Keyboard Controls
