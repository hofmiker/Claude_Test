# Vice Grid — 3D-Top-Down-Fahrspiel im GTA-Stil

## Live-URL
https://hofmiker.github.io/Claude_Test/gta/

## Dateien
- `index.html` — Shell/UI
- `main.js` — Fahrphysik, Kamera, Rendering, Input, HUD
- `mission.js` — Missions-/Dialogsystem
- `vendor/three.module.min.js` — Three.js, lokal vendored (ES-Modul)

## Steuerung
Pfeiltasten/WASD fahren, `C` wechselt Kameramodus. Touch-Controls
(Gas/Lenkung) für Mobile vorhanden.

## Tech-Stack
- Three.js, lokal vendored unter `vendor/` (ES-Modul, kein CDN)
- Vanilla JS, kein Build-Schritt
