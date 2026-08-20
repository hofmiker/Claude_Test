# Phase Dancer Lab — Browser-Sound-Lab zur Klangmanipulation

## Live-URL
https://hofmiker.github.io/Claude_Test/phase-dancer/

## Dateien
- `index.html` — komplettes Sound-Lab (Audio-Engine, UI, Visualizer in einer Datei)

## Beschreibung
Prototyp-Begleitstück zum Konzept "PHASE DANCER" (audiovisuelle Live-Performance
zum Thema Klangmanipulation). Ein 4-Takt-Loop in A-Moll (i–VI–III–VII) wird
komplett aus Oszillatoren und Rauschen synthetisiert — keine Samples, kein
bestehender Song. Fünf Live-Regler entsprechen den Manipulationstechniken aus
dem Konzept, zusätzlich lässt sich jedes der fünf Instrumente einzeln stummschalten.

## Instrumente (Kick/Hat/Bass/Stab/Lead)
Je ein Kanal-Button unter dem Visualizer schaltet die Stimme live stumm/frei,
ohne den Sequencer-Takt zu unterbrechen (Mute wirkt pro Schritt in `scheduleStep`).

## Manipulationsregler
| Regler | Technik | Wirkung |
|---|---|---|
| Pitch (Drehknopf) | Pitch-Shifting | Transponiert alle Stimmen ±12 Halbtöne |
| Tempo (Scheibenregler) | Time-Stretching | 108–152 BPM, ändert das Scheduler-Timing |
| Grain Chaos (Drehknopf) | Granularsynthese | Retriggert Schritte stochastisch in 3–5 Fragmente |
| Feedback (Drehknopf) | Feedback & Resampling | Sendeanteil in eine rückgekoppelte Delay-Line |
| Freeze (Kippschalter) | Spektral-Freeze | Kappt Delay-Zeit kurz, treibt Feedback nahe an Selbstoszillation |

Alle Regler sind per Ziehen (vertikal), Mausrad (Feinjustierung) oder
Tastatur (fokussieren + Pfeiltasten/PageUp-Down/Home-End) bedienbar.

## Tech-Stack
- Web Audio API (Oszillatoren, BiquadFilter, DynamicsCompressor, DelayNode-Feedback-Loop, AnalyserNode)
- Canvas 2D für den Frequenz-Visualizer
- Vanilla JS (kein Framework), Google Fonts (Bebas Neue, IBM Plex Mono, Inter)

## Thumbnail
`screenshots/phase-dancer.gif` — Screen-Capture einer laufenden Session
(Play gestartet, Regler live verstellt), aufgenommen per Playwright/Chromium.
