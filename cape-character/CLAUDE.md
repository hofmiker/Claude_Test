# Cape Character — 2D IK-Charakter mit Umhang

## Live-URL
https://hofmiker.github.io/Claude_Test/cape-character/

## Dateien
- `index.html` — komplettes Projekt (Canvas/Vanilla-JS, keine externen Assets)

## Features
- Zwei-Knochen-IK für Bein (Hüfte → Knie → Fußgelenk) und Arm (Schulter → Ellenbogen → Handgelenk)
- Alle Gelenke als deutlich sichtbare Pivot-Marker gezeichnet, nicht nur als Striche
- Prozeduraler Lauf-Zyklus (Schrittlänge/Fußhebung an die Geschwindigkeit gekoppelt, an zurückgelegte Strecke statt reine Zeit gebunden)
- Sprungphysik mit Beine-Einziehen in der Luft und Lande-Squash
- Umhang als Verlet-Cloth-Simulation (3 Stränge, Struktur- und laterale Constraints, geclampte Schrittweite gegen numerisches Aufschwingen), reagiert auf Schwerkraft und Bewegungs-"Wind"
- Kapuze am Kopf befestigt, offen zum Gesicht hin
- Spiegelt sauber bei Richtungswechsel links/rechts

## Steuerung
Pfeiltasten/A+D zum Laufen, Leertaste/W/Pfeil-hoch zum Springen. Touch-Buttons für Mobile.

## Tech-Stack
- Reines Canvas 2D + Vanilla JS, kein Build-Schritt, keine Abhängigkeiten
