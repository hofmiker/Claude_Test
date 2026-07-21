# Flappy Klon — Flappy-Bird-artiges Arcade-Spiel

## Live-URL
https://hofmiker.github.io/Claude_Test/flappy/

## Dateien
- `index.html` — komplettes Spiel (Canvas/Vanilla-JS, keine externen Assets)

## Features
- Vogel mit Schwerkraft- und Sprungphysik, Rotation je nach Fallgeschwindigkeit
- Zufällig generierte Röhren mit fester Lücke, Geschwindigkeit konstant
- Kollisionsabfrage gegen Röhren und Bildschirmränder
- Punktezähler pro passierter Röhre, Highscore in `localStorage`
- Start-, Spiel- und Game-Over-Zustand über ein halbtransparentes Overlay

## Steuerung
Leertaste oder Mausklick/Touch = Flügelschlag. Nach Game Over erneut klicken/Leertaste drücken zum Neustart.

## Tech-Stack
- Reines Canvas 2D + Vanilla JS, kein Build-Schritt, keine Abhängigkeiten
