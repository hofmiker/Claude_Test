# Phase Dancer Lab — Browser-Sound-Lab zur Klangmanipulation

## Live-URL
https://hofmiker.github.io/Claude_Test/phase-dancer/

## Dateien
- `index.html` — komplettes Sound-Lab (Audio-Engine, UI, Visualizer in einer Datei)

## Beschreibung
Prototyp-Begleitstück zum Konzept "PHASE DANCER" (audiovisuelle Live-Performance
zum Thema Klangmanipulation). Fünf eigenständige Tracks — je eigenes Genre,
eigenes Tempo, eigene Harmonik und eigenes Rhythmusgerüst — werden komplett aus
Oszillatoren und Rauschen synthetisiert — keine Samples, kein bestehender Song,
keine Wiederholung derselben Akkordform/desselben Patterns über die Tracks
hinweg. Fünf Live-Regler entsprechen den Manipulationstechniken aus dem
Konzept, zusätzlich lässt sich jedes der fünf Instrumente einzeln stummschalten.

## Tracks
Jeder Track hat seine eigene `chords*`-Akkordliste (via `tri(rootSemi, quality)`
aus Halbton-Offsets zu A4 gebaut, siehe `noteHz()`) und eine eigene
`pattern*(pos, bar, t, chunk, g, grainRoll, stepDur)`-Funktion, die entscheidet,
was auf welchem der 16 Schritte pro Takt passiert. `trackDefs[i].pattern` wird
pro Schritt von `scheduleStep()` aufgerufen — der Sequencer-Takt/Lookahead ist
geteilt, die Musik pro Track komplett eigenständig.

| Track | Genre | Tonart | BPM | Charakter |
|---|---|---|---|---|
| Phase One | Eurodance | A-Moll (i–VI–III–VII) | 136 | Original-Track, unverändert |
| Vain Reflex | Eurodance/Hook | Fis-Moll (i–iv–VII–V) | 138 | Einzige bewusste Anlehnung an Culture Beats "Mister Vain": Stab auf jedem Beat + `hookChop()`-Vocal-Chop-Hook auf den Offbeats |
| Concrete Loop | Hip-Hop | D-Moll (i, iv, 2 Akkorde) | 92 | Boom-Bap-Kick/Snare, geswingte Hats, gleitender Sub-Bass (`subBass`), warmes Rhodes-Pad (`warmPad`) |
| Under Canopy | Jungle/Drum&Bass | E-Moll (1 Akkord, Drone) | 172 | Zerhackter Breakbeat (Kick+Snare), fast durchgehende Hats, growlender Reese-Bass (`reeseBass`), kaum Melodik |
| Deep Current | House | C-Moll (i–VI–iv–VII) | 124 | Four-on-the-floor-Kick, Off-Beat-Open-Hats + Clap auf 2/4, synkopierte Bassline, Filter-Swell-Organ-Stab (`organStab`) |

Klick auf eine Track-Kachel wechselt `trackIndex` und die BPM-Fader-Position
live (`selectTrack()`), ohne den Sequencer-Takt zu unterbrechen.

## Instrumente (Kick/Hat/Bass/Stab/Lead) — Kanal-Mapping über die Genres hinweg
Je ein Kanal-Button unter dem Visualizer schaltet die Stimme live stumm/frei,
ohne den Sequencer-Takt zu unterbrechen. Da die fünf Tracks unterschiedliche
Klangfarben nutzen, mappen die vier festen Instrumenten-Kanäle so:
- **Kick** — alle Kick-artigen Treffer (Four-on-the-floor, Boom-Bap, Breakbeat)
- **Hat** — alle "oberen" Percussion-Treffer: Hi-Hats **und** Snare/Clap/Break
  (`snare()`)
- **Bass** — alle Bass-Stimmen: `bass()`, `subBass()`, `reeseBass()`
- **Stab** — alle Pad/Akkord-Stimmen: `stab()`, `warmPad()`, `organStab()`
- **Lead** — alle melodischen Ornamente: `lead()`, `hookChop()` (nur Vain Reflex)

## Manipulationsregler
| Regler | Technik | Wirkung |
|---|---|---|
| Pitch (Drehknopf) | Pitch-Shifting | Transponiert alle Stimmen ±12 Halbtöne |
| Tempo (Scheibenregler) | Time-Stretching | 85–175 BPM (deckt Concrete Loop 92 bis Under Canopy 172 ab), ändert das Scheduler-Timing |
| Grain Chaos (Drehknopf) | Granularsynthese | Retriggert Schritte stochastisch in 3–5 Fragmente |
| Feedback (Drehknopf) | Feedback & Resampling | Sendeanteil in eine rückgekoppelte Delay-Line |
| Freeze (Kippschalter) | Spektral-Freeze | Kappt Delay-Zeit kurz, treibt Feedback nahe an Selbstoszillation |

Alle Regler sind per Ziehen (vertikal), Mausrad (Feinjustierung) oder
Tastatur (fokussieren + Pfeiltasten/PageUp-Down/Home-End) bedienbar.

## Bekannter Fix: Audio-Node-Leak
Jede ausgelöste Stimme (`kick`/`hat`/`bass`/`stab`/`lead`/`hookChop`) trennt ihre
eigenen Nodes jetzt explizit per `onended`, statt sich auf die
Browser-Garbage-Collection zu verlassen. Vorher blieb pro Note mindestens ein
`sendToDelay()`-Gain-Node dauerhaft an `delayNode` hängen — bei langem Abspielen
(insbesondere mit hohem Grain Chaos, das Schritte 3–5× retriggert) sammelten
sich so über Minuten hinweg tausende tote Knoten im Audiograph an, was auf
schwächerer Hardware zu Overload/Abstürzen führen konnte. `stab()` läuft außerdem
mit 3 statt 4 Detune-Layern (9 statt 12 Oszillatoren pro Stab), ohne hörbaren
Unterschied. Verifiziert per Playwright-Stresstest: 12 s Dauerbeschuss bei
Grain/Feedback auf Maximum plus permanentem Track-Wechsel erzeugte ~3570
Audio-Nodes bei ~96 % Disconnect-Quote (vorher praktisch 0 %).

## Tech-Stack
- Web Audio API (Oszillatoren, BiquadFilter, DynamicsCompressor, DelayNode-Feedback-Loop, AnalyserNode)
- Canvas 2D für den Frequenz-Visualizer
- Vanilla JS (kein Framework), Google Fonts (Bebas Neue, IBM Plex Mono, Inter)

## Thumbnail
`screenshots/phase-dancer.gif` — Screen-Capture einer laufenden Session
(Play gestartet, Regler live verstellt), aufgenommen per Playwright/Chromium.
