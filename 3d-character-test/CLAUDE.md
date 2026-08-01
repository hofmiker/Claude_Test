# 3D Character Test — Low-Poly Charakter-Studie

## Live-URL
https://hofmiker.github.io/Claude_Test/3d-character-test/

## Beschreibung
Freistehende 3D-Low-Poly-Charakterfigur zum Testen von Rig, Laufzyklus,
Sprung-Zustandsmaschine (Windup/Air/Land) und Idle-Animation (Kratz-Geste
nach 5s Inaktivität). Ursprünglich als Vorstudie für den Spielcharakter aus
`dhl-city/` entstanden, jetzt als eigenständiges Projekt herausgelöst.

## Steuerung
- Pfeiltasten / WASD: Bewegen
- Space bzw. On-Screen-Button ⬆: Springen
- On-Screen-D-Pad + Jump-Button für Touch-Geräte

## Features
- Gegliedertes Skelett (Torso, Kopf mit Gesichtszügen, Arme, Beine) aus
  primitiven Three.js-Geometrien (Cylinder, Icosahedron, Box)
- Lauf-, Idle- und Sprunganimation über eine Zustandsmaschine
- Kollidierbare Kisten-Stapel, Bäume/Büsche als Deko, Kamera folgt hinter
  dem Charakter und zoomt im Idle näher heran

## Tech-Stack
- Three.js via CDN
- Touch + Keyboard Controls
