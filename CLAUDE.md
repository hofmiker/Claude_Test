# Claude_Test — Sonnensystem 3D

## Was ist das?
Interaktives 3D-Sonnensystem im Browser, gebaut mit Three.js (r0.160.0).
Live unter: **https://hofmiker.github.io/Claude_Test/sonnensystem-2.html**

## Tech-Stack
- Three.js 0.160.0 via CDN (importmap)
- OrbitControls für Kamera
- Web Audio API für Bell-Sounds
- Canvas 2D für Overlay-Effekte (Labels, Glow)
- GitHub Pages (Branch: `main`) für Deployment

## Deployment-Workflow
Entwicklung auf Branch `claude/solar-system-design-Kal22`, dann merge zu `main`:
```bash
git checkout claude/solar-system-design-Kal22
# Änderungen machen
git add sonnensystem-2.html && git commit -m "..."
git push -u origin claude/solar-system-design-Kal22
git checkout main && git merge --no-ff claude/solar-system-design-Kal22 -m "..."
git push -u origin main
```

## Aktuelle Version: v1.17 (08.07.2026)
Versionsnummer steht im `#deploy-time` div. Beim nächsten Commit auf v1.18 hochzählen.

## Hauptdatei
**`sonnensystem-2.html`** — alles in einer Datei (HTML + CSS + JS).

## Implementierte Features
- 9 Planeten (Merkur bis Pluto) + Mond + Sonne, alle mit realen Durchmessern
- Keplersches Skalierungsgesetz (K=0.42) für Orbitalabstände
- Sonnenlicht (PointLight) → harte Schattenkante (Terminator) auf Planeten
- Kometentrails bei schnellen Planeten (Länge = zurückgelegte Strecke pro Frame)
- Tap-to-Focus: Kamera zoomt auf Himmelskörper, Blickrichtung bleibt erhalten
- Tap-Feedback: Leuchtring + expandierender Glow-Pulse
- Web Audio Bell-Akkord beim Antippen (Tonhöhe nach Körpergröße: Sonne=tief, Pluto=hell)
- Slot-Machine Jahreszähler (nur veränderte Ziffer klappert rein)
- Speed-Slider mit Multiplikator-Label über dem Thumb
- Responsives Layout (Media Queries für Desktop)
- Deployment-Timestamp mit Versionsnummer oben mittig

## Szenen-Aufbau (Three.js)
- `SUN_R = 10` (Basiseinheit)
- `EARTH_R = 0.22` (Erdradius in Szene)
- Orbits: ORB_MIN=32 bis ORB_MAX=80 Szeneneinheiten
- `HOME_POS = (0, 58, 135)`, Kamera startet von oben-hinten
- Planeten: `MeshLambertMaterial` (empfängt Licht)
- Sonne: `MeshBasicMaterial` (selbstleuchtend)
- Trails: `THREE.Line` Objekte in World-Space

## Konventionen
- Alles in einer HTML-Datei, keine Build-Tools
- Keine externen Abhängigkeiten außer Three.js via CDN
- Kommentare nur wenn das WARUM nicht offensichtlich ist
- Versionsnummer im Format: `vX.Y | DD.MM.YYYY`
