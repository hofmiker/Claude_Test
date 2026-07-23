# Solar Orbit — 3D-Sonnensystem

## Live-URL
https://hofmiker.github.io/Claude_Test/solar-orbit/

## Aktuelle Version: v1.17 (08.07.2026)
Versionsnummer im `#deploy-time` div. Beim nächsten Commit auf v1.18 hochzählen.

## Tech-Stack
- Three.js 0.160.0 via CDN (importmap)
- OrbitControls für Kamera
- Web Audio API für Bell-Sounds (Tonhöhe nach Körpergröße)
- Canvas 2D Overlay für Labels, Glow-Pulse, Outline-Ring

## Features
- 9 Planeten (Merkur–Pluto) + Mond + Sonne mit realen Durchmessern
- Sonnenlicht (PointLight) → harte Schattenkante auf Planeten (MeshLambertMaterial)
- Kometentrails bei schnellen Planeten (Länge = Frame-Distanz)
- Tap-to-Focus: Kamera dolly in/out, Blickrichtung bleibt erhalten
- Tap-Feedback: Outline-Ring + expandierender Glow-Pulse + Bell-Akkord
- Slot-Machine Jahreszähler (nur veränderte Ziffer animiert, fällt von oben rein)
- Speed-Slider mit Multiplikator-Label direkt über dem Thumb
- Responsives Layout (Media Queries)

## Szenen-Werte
- `SUN_R = 10`, `EARTH_R = 0.22`
- Orbits: ORB_MIN=32 bis ORB_MAX=80 Szeneneinheiten
- `HOME_POS = (0, 58, 135)`
- Keplerskalierung mit K=0.42

## Deployment
Branch `claude/solar-system-design-Kal22` → merge zu `main`:
```bash
git checkout claude/solar-system-design-Kal22
git add solar-orbit/index.html && git commit -m "..."
git push -u origin claude/solar-system-design-Kal22
git checkout main && git merge --no-ff claude/solar-system-design-Kal22 -m "..."
git push -u origin main
```
