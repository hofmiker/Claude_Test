# Explosion-Szenen — 3D-Explosionen mit Zeit-Regler

## Live-URL
https://hofmiker.github.io/Claude_Test/flower-vase/

Mehrere Szenen, per Tab-Leiste oben umschaltbar (erweiterbar für
weitere Szenen):
- **🌸 Blumenvase** (`index.html`) — Vase + Blumenstrauß explodiert
- **🚀 Spaceshuttle** (`shuttle.html`) — Shuttle explodiert mit Feuer & Rauch

## Aktuelle Version: v2.0 (17.07.2026)
Versionsnummer im `#deploy-time` div (oben rechts), gilt für beide
Szenen gemeinsam. Beim nächsten Commit auf v2.1 hochzählen.

## Konzept
Jede Szene zeigt ein 3D-Objekt, dessen Bestandteile bei einem Regler-
wert von 0–100 % explodieren. Der Regler oben in `#panel` (nach dem
Vorbild des Speed-Sliders in `solar-orbit/`) erlaubt freies Vor- und
Zurückscrollen: 0 % = intaktes Objekt, 100 % = vollständig zerstört/
zerstreut. Jede Fragmentposition wird deterministisch aus dem
aktuellen Zeitwert berechnet (`position = basePos + dir × dist ×
easeOutBlast(t)`, kein Physik-Zustand, keine Integration) — dadurch
ist jede Zwischenposition beim Scrubben in beide Richtungen exakt
reproduzierbar. Die Beschleunigungskurve `easeOutBlast` (`1-(1-t)⁴`)
sorgt für einen sehr schnellen Start, der danach rasch abbremst.

### Blumenvase (`index.html`)
Lathe-Geometrie-Vase mit 5 prozedural erzeugten Blumen (Stängel,
Blätter, Blütenblätter, Pollen). Die Vase selbst zerspringt in ~1000
Scherben (`InstancedMesh`, Tetraeder-Shards mit Vertex-Colors für
Glasur/Keramik-Look), samplet von der Lathe-Profilkurve. Ein
Crossfade lässt die glatte Vasenoberfläche in die Scherbenwolke
übergehen.

### Spaceshuttle (`shuttle.html`)
Prozedural aus Primitiven gebautes Shuttle (Fuselage, Nase, Delta-
Flügel via `ExtrudeGeometry`, Seitenleitwerk, 3 Triebwerke), schwebend
im All (Sternenfeld + ferner Planet). Explodiert in ~1100 Metall-
Trümmerteilen (`InstancedMesh`, Box-Shards), plus zwei separate
`THREE.Points`-Partikelsysteme für Feuer (additiv, kurzer heller
Blitz, klingt schnell ab) und Rauch (alpha-blended, wächst langsam,
verblasst über die zweite Hälfte des Reglers). Die Debris-Richtung
strahlt radial vom Shuttle-Zentrum aus (kein Oberflächen-Sampling wie
bei der Vase, da das Shuttle aus mehreren Primitiven statt einer
einzelnen Lathe-Fläche besteht).

## Steuerung (beide Szenen identisch)
- Regler unten: Zeit vor-/zurückscrubben
- ▶/⏸-Button: automatisches Vor-und-Zurück-Abspielen (Ping-Pong)
- ⟲-Button: zurück auf 0 %
- Maus/Touch auf der Szene: Kamera drehen & zoomen (OrbitControls)
- Tab-Leiste oben: zwischen Szenen wechseln
- i-Button oben links: Titel/Beschreibung ein-/ausblenden

## Tech-Stack
- Three.js 0.160.0, lokal vendort unter `vendor/three/` (kein CDN,
  funktioniert offline) — von beiden Szenen gemeinsam genutzt
- OrbitControls für Kamera
- Vanilla JS, kein Build-Schritt

## Neue Szene hinzufügen
1. Neue `<szene>.html` in diesem Ordner anlegen (Shell aus
   `index.html` oder `shuttle.html` kopieren: Tab-Leiste, Info-Button,
   Deploy-Time, Panel/Slider-UI, `easeOutBlast`-Helper)
2. Tab in **allen** vorhandenen Szenen-Dateien ergänzen
   (`#sceneTabs`), `active`-Klasse jeweils auf die eigene Seite setzen
3. In diesem CLAUDE.md unter "Live-URL" und mit eigenem Abschnitt
   dokumentieren

## Dateien
- `index.html` — Blumenvase-Szene
- `shuttle.html` — Spaceshuttle-Szene
- `vendor/three/build/three.module.js`
- `vendor/three/examples/jsm/controls/OrbitControls.js`
