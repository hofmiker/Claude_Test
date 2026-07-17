# Flower Vase — 3D-Blumenvase-Explosion

## Live-URL
https://hofmiker.github.io/Claude_Test/flower-vase/

## Aktuelle Version: v1.3 (17.07.2026)
Versionsnummer im `#deploy-time` div (oben rechts). Beim nächsten
Commit auf v1.4 hochzählen.

## Konzept
Eine 3D-Blumenvase (Lathe-Geometrie) mit 5 prozedural erzeugten Blumen
(Stängel, Blätter, Blütenblätter, Pollen). Ein Zeit-Regler unten (nach
dem Vorbild des Speed-Sliders in `solar-orbit/`) erlaubt freies
Vor- und Zurückscrollen durch einen Explosionsverlauf: 0 % = intakte
Vase, 100 % = Inhalt vollständig zersplittert. Jede Fragmentposition
wird deterministisch aus dem aktuellen Zeitwert berechnet (kein
Physik-Zustand, keine Integration) — dadurch ist jede Zwischenposition
beim Scrubben in beide Richtungen exakt reproduzierbar.

## Steuerung
- Regler unten: Zeit vor-/zurückscrubben
- ▶/⏸-Button: automatisches Vor-und-Zurück-Abspielen (Ping-Pong)
- ⟲-Button: zurück auf 0 %
- Maus/Touch auf der Szene: Kamera drehen & zoomen (OrbitControls)

## Tech-Stack
- Three.js 0.160.0, lokal vendort unter `vendor/three/` (kein CDN,
  funktioniert offline)
- OrbitControls für Kamera
- Vanilla JS, kein Build-Schritt

## Dateien
- `index.html` — komplette, selbstständige Szene
- `vendor/three/build/three.module.js`
- `vendor/three/examples/jsm/controls/OrbitControls.js`
