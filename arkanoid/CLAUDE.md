# Arkanoid Klon — Breakout-artiges Arcade-Spiel

## Live-URL
https://hofmiker.github.io/Claude_Test/arkanoid/

## Dateien
- `index.html` — komplettes Spiel (Canvas/Vanilla-JS, keine externen Assets)

## Features
- 6 Reihen × 8 Steine in Regenbogenfarben, Ball mit Kanten- und Steinkollision
- Schläger-Steuerung per Maus oder Pfeiltasten, Aufprallwinkel abhängig von Trefferposition auf dem Schläger
- 3 Leben, Ball klebt nach Verlust am Schläger bis zum erneuten Start
- Punktezähler, Highscore in `localStorage`, Sieg-Screen bei restlosem Abräumen aller Steine

## Steuerung
Maus bewegen, Finger ziehen oder ←/→ zum Steuern des Schlägers, Leertaste/Klick/Tippen zum Starten bzw. Ball loslassen. Canvas skaliert responsiv (`max-width`/`max-height` + `touch-action: none`) für mobile Bildschirme.

## Tech-Stack
- Reines Canvas 2D + Vanilla JS, kein Build-Schritt, keine Abhängigkeiten
