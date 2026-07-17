# Explosion-Szenen — 3D-Explosionen mit Zeit-Regler

## Live-URL
https://hofmiker.github.io/Claude_Test/flower-vase/

Mehrere Szenen, per Tab-Leiste oben umschaltbar (erweiterbar für
weitere Szenen):
- **🌸 Blumenvase** (`index.html`) — Vase + Blumenstrauß explodiert
- **🚀 Spaceshuttle** (`shuttle.html`) — Shuttle explodiert mit Feuer & Rauch

## Aktuelle Version: v2.1 (17.07.2026)
Versionsnummer im `#deploy-time` div (oben rechts), gilt für beide
Szenen gemeinsam. Beim nächsten Commit auf v2.2 hochzählen.

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
Prozedural aus Primitiven gebautes Shuttle im Spielzeug-Look (glänzige
`MeshPhysicalMaterial` mit Clearcoat, orangene Zierstreifen, domförmiges
Cockpitfenster) — Fuselage (2-teilig), Nase, Delta-Flügel via
`ExtrudeGeometry` mit Bevel, Seitenleitwerk, 3 Triebwerke. Steht auf
einem Boden/Halo-Ring wie bei der Vase, vor Sternenfeld + fernem
Planeten für die Raum-Ambience.

Jedes Bauteil (Nase, Rumpfhälften, Flügel, Leitwerk, Triebwerke) ist
ein eigenes `addFragment`-Fragment (wie die Blüten-Fragmente bei der
Vase) und fliegt beim Explodieren als **großes, erkennbares Teil**
auseinander — nicht alles zerfällt in Kleinteile. Angehängte
Detailteile (Cockpit, Flügelvorderkante, Triebwerksdüse) übernehmen
per `attachedExplosion()` die (leicht variierte) Flugbahn ihres
Trägerteils, damit sie sichtbar zusammenbleiben. Zusätzlich sorgt ein
reduziertes `InstancedMesh` aus ~380 kleinen Metall-Shards für
ergänzendes Schrapnell. Dazu zwei `THREE.Points`-Partikelsysteme für
Feuer (additiv, kurzer heller Blitz, klingt schnell ab) und Rauch
(alpha-blended, wächst langsam, verblasst über die zweite Hälfte des
Reglers).

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
