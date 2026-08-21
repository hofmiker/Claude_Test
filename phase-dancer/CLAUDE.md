# Phase Dancer Lab — Browser-Sound-Lab zur Klangmanipulation

## Live-URL
https://hofmiker.github.io/Claude_Test/phase-dancer/

## Dateien
- `index.html` — komplettes Sound-Lab (Audio-Engine, UI, Visualizer in einer Datei)

## Beschreibung
Prototyp-Begleitstück zum Konzept "PHASE DANCER" (audiovisuelle Live-Performance
zum Thema Klangmanipulation). Fünf 4-Takt-Loops (Klangkörper) werden komplett
aus Oszillatoren und Rauschen synthetisiert — keine Samples, kein bestehender
Song. Fünf Live-Regler entsprechen den Manipulationstechniken aus dem Konzept,
zusätzlich lässt sich jedes der fünf Instrumente einzeln stummschalten.

## Tracks (Klangkörper wählen)
Alle fünf teilen dieselbe i–VI–III–VII-Akkordform (`baseProgression` in
`buildProgression()` transponiert), unterscheiden sich in Tonart und Tempo:

| Track | Tonart | BPM | Hook |
|---|---|---|---|
| Phase One | A-Moll | 136 | — |
| Glass Veil | H-Moll | 132 | ✓ |
| Neon Oath | G-Moll | 128 | ✓ |
| Midnight Arc | D-Moll | 138 | ✓ |
| Static Bloom | E-Moll | 126 | ✓ |

Klick auf eine Track-Kachel wechselt Progression und BPM-Fader-Position live
(`selectTrack()`), ohne den Sequencer-Takt zu unterbrechen. Die vier neuen
Tracks („Hook“ = ✓) fügen zusätzlich `hookChop()` ein: ein kurzer,
bandpassgefilterter Sägezahn-Stab mit Pitch-Scoop, angelehnt an den
Klavier-Stab-Antrieb und Vocal-Chop-Hook aus Culture Beats "Mister Vain" —
eigene Harmonik/Melodie, kein Sample, kein Cover. Der Hook läuft über den
"Lead"-Kanalschalter mit.

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
