# Flappy Klon — Flappy-Bird-artiges Arcade-Spiel

## Live-URL
https://hofmiker.github.io/Claude_Test/flappy/

## Dateien
- `index.html` — komplettes Spiel (Canvas/Vanilla-JS, keine externen Assets)

## Features
- Vogel mit Schwerkraft- und Sprungphysik, Rotation je nach Fallgeschwindigkeit
- Zufällig generierte Röhren mit fester Lücke, gedrosseltes Tempo für Einsteiger
- Röhren sind keine Todesfalle: der Vogel klemmt an Ober-/Unterkante fest und
  rutscht daran entlang, statt beim Berühren zu sterben. Nur Boden und Decke
  beenden das Spiel.
- Punktezähler pro passierter Röhre, Highscore in `localStorage`
- Start-, Spiel- und Game-Over-Zustand über ein halbtransparentes Overlay

## Steuerung
Leertaste oder Mausklick/Touch = Flügelschlag. Nach Game Over erneut klicken/Leertaste drücken zum Neustart.

## Tech-Stack
- Reines Canvas 2D + Vanilla JS, kein Build-Schritt, keine Abhängigkeiten
