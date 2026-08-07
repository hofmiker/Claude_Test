# Vice Grid — 3D-Top-Down-Fahrspiel im GTA-Stil

## Live-URL
https://hofmiker.github.io/Claude_Test/gta/

## Dateien
- `index.html` — Shell/UI
- `main.js` — Fahrphysik, Kamera, Rendering, Input, HUD
- `mission.js` — Missions-/Dialogsystem
- `vendor/three.module.min.js` — Three.js, lokal vendored (ES-Modul)
- `vendor/fonts/bebas-neue-400.woff2` — Bebas Neue, lokal vendored via
  `npm pack @fontsource/bebas-neue` (npm-Registry ist in der Sandbox
  erreichbar, Google-Fonts-CDN nicht) — Display-Font `'ViceDisplay'` für
  Titel/HUD-Zahlen/Buttons, siehe Abschnitt "UI" unten.

## Steuerung
Pfeiltasten/WASD fahren, `C` wechselt Kameramodus. Touch: analoger
360°-Joystick unten links (Vorwärts/Rückwärts + Lenken in einem, an
`starship-launch`/`toy-story` angelehnt) statt einzelner Gas/Brems-/Lenk-
Tasten — steuert sowohl das Auto als auch die Spielfigur zu Fuß (dasselbe
Panzer-Lenkung-Eingabemodell wie Tastatur). Sprung-Button (Gold) und
Kontext-Aktion-Button (Cyan, zeigt "Reden"/"Nehmen"/"Einsteigen"/
"Übergeben" o.ä.) unten rechts.

## UI
- **Font:** `'ViceDisplay'` (Bebas Neue, condensed/uppercase) für Titel,
  Geschwindigkeit/Geld-HUD, Fahndungs-Banner, Dialog-Sprecher, End-Screen
  und alle Buttons — Fallback-Kette `Impact, 'Arial Narrow', sans-serif`.
  Fließtext (Dialogzeilen, Ziel-Beschreibung, Toast-Text) bleibt bei der
  normalen Systemschrift für Lesbarkeit.
- **Titel-Intro:** `#loading` zeigt beim Start ~2.4s lang eine animierte
  Neon-Titelkarte (`#titleSplash`: "VICE" in Pink, "GRID" in Cyan, leicht
  skewed wie ein Neon-Schild, darunter "Der Kessel" in Gold) statt der
  alten reinen Ladebalken-Textzeile, bevor sie ausblendet — Timing in
  `main.js` (`setTimeout(..., 2400)` vor dem Opacity-Fade).
- **Analoger Joystick:** ersetzt die vorherigen vier Einzel-Buttons
  (Links/Rechts/Gas/Bremse) sowie das vollflächige Wisch-Steuern —
  1:1 dasselbe Pointer-Events-Pattern (`setPointerCapture`,
  `touchMove.forward/back/left/right`) wie in `starship-launch`. Die
  frühere "Tasten aus"-Einstellung wurde entfernt, da sie nur die jetzt
  nicht mehr existierenden vier Buttons betraf.
- **Buttons:** Sprung-/Aktion-Button bilden ein visuelles Paar (gleiche
  Randstärke/Glow-Sprache wie `starship-launch`, nur Akzentfarbe
  unterscheidet sie); der Aktion-Button ist eine Pille statt eines
  Kreises, damit längere Kontext-Labels wie "Übergeben" nicht mehr
  abgeschnitten werden.
- **Notifications:** Fahndungs-Banner hat jetzt einen Hintergrund-Chip statt
  nur Text mit Schatten (deutlich lesbarer über der Szene); die Sub-Toast-
  Meldung (`#subMsg`, z. B. "Eingestiegen") ist größer, hat eine eigene
  Kapsel-Optik und einen expliziten "OK"-Button zum sofortigen Wegklicken,
  statt nur auf das automatische Timeout (2.6s) zu warten.

## Tech-Stack
- Three.js, lokal vendored unter `vendor/` (ES-Modul, kein CDN)
- Vanilla JS, kein Build-Schritt
