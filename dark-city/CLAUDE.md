# Dark City — 2D Nacht-Jump'n'Run

## Live-URL
https://hofmiker.github.io/Claude_Test/dark-city/

## Dateien
- `index.html` — komplettes Spiel (Canvas/Vanilla-JS, keine externen Assets)

## Features
- Seitwärts-Scroller über die Dächer einer dunklen Stadt bei Nacht (Mond, Sterne, Parallax-Skyline mit flackernden Fenstern)
- Sprungphysik mit Coyote-Time, Jump-Buffering und variabler Sprunghöhe
- Gegner: patrouillierende Schatten-Kriecher (Stomp tötet sie) und fliegende Fledermäuse
- Bewegliche Plattformen, Stacheln, ~40 leuchtende Sammel-Orbs, 4 Checkpoints, 3 Leben
- Durchgehende Straßenebene fängt jeden Sturz sicher ab (keine tödlichen Abgründe)
- Ziel: leuchtendes Signal am Ende der Stadt erreichen
- Start-/Pause-/Game-Over-/Win-Screens, HUD, WebAudio-Soundeffekte, Touch-Steuerung für Mobile

## Steuerung
Pfeiltasten/WASD zum Laufen, Leertaste/Pfeil hoch/W zum Springen, P/Escape für Pause.

## Tech-Stack
- Reines Canvas 2D + Vanilla JS, kein Build-Schritt, keine Abhängigkeiten
