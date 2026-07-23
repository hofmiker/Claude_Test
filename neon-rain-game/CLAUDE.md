# The Neon Rain — Noir-Detektiv-Adventure

## Live-URL
https://hofmiker.github.io/Claude_Test/neon-rain-game/

## Dateien
- `index.html` — komplettes Spiel (Canvas/Vanilla-JS, keine externen Assets)

## Features
- Scrollende Regennacht-Straße mit Kamera, die dem Spieler folgt, Parallax-Skyline und Neon-Reklame ("The Blue Cat")
- Punkt-und-Klick-Erkundung: Kiosk, Zeitungsstand, Diner, Telefonzelle, Lagerhaus am Dock, Streuner-Katze
- Fallakte/Journal-System mit Zielen, die sich erst nach vorherigen Hinweisen freischalten
- Inventar mit gesammelten Hinweisen (Streichholzheft, Foto), die neue Dialogoptionen freischalten
- Titelbildschirm und verzweigtes Ende (zwei mögliche Auflösungen des Falls)
- Blitz/Donner, prozedural erzeugter Regen-Ambient-Sound plus ruhige Jazz-Töne via Web Audio API
- Hover-Highlighting auf interaktiven Objekten, Fußspuren/Pfützen-Splash-Partikel

## Steuerung
Klick zum Gehen, Klick auf Objekte/NPCs zum Untersuchen bzw. Reden. Taste `J` oder Journal-Button öffnet die Fallakte. Lautsprecher-Button unten links schaltet den Sound stumm.

## Tech-Stack
- Reines Canvas 2D + Vanilla JS, kein Build-Schritt, keine Abhängigkeiten, keine externen Assets (Sound wird per Web Audio API synthetisiert)
