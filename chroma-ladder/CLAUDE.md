# Chroma Ladder — Farbkombinations-Tool

## Live-URL
https://hofmiker.github.io/Claude_Test/chroma-ladder/

## Dateien
- `index.html` — komplettes Tool (Farb-Engine, UI, Export in einer Datei, keine Abhängigkeiten)

## Beschreibung
Vierstufiger Palettenbauer. Jeder Schritt schaltet den nächsten frei, und die
Kachelgröße nimmt pro Schritt ab — sie bildet das Flächengewicht ab, das die
Farbe später im Interface bekommt (60 / 30 / 10).

| Schritt | Inhalt | Kachelhöhe |
|---|---|---|
| 01 | Primärfarbe — 5 Töne im 72°-Abstand über den ganzen Farbkreis | 168 px |
| 02 | Dieselbe Farbe als Light- und Dark-Mode-Tokenset, mit UI-Vorschau, Tonwertreihe und WCAG-Kontrastprüfung | — |
| 03 | Zweite Primärfarbe — 5 Kandidaten nach klassischer Harmonielehre | 104 px |
| 04 | 5 Zusatzfarben, direkt abgeleitet (keine Auswahl) + Gewichtungsbalken + Export | 62 px |

## Farb-Engine
Alles rechnet in **OKLCH** (Ottosson), nicht in HSL — nur dort entspricht
gleiches `L` auch gleicher wahrgenommener Helligkeit. Kern in `index.html`:

- `oklchToLinear(L,C,H)` / `hexToOklch(hex)` — Hin- und Rückweg zu sRGB
- `fit(L,C,H)` — Binärsuche, die die Buntheit so weit zurücknimmt, bis der Ton
  in sRGB darstellbar ist; Farbton und Helligkeit bleiben erhalten
- `mkVivid(L,C,H)` — wie `fit`, darf die Helligkeit aber um bis zu ±0.12
  verschieben, wenn der Farbton die Zielsättigung sonst nicht erreicht.
  **Wichtig:** ohne das hat jede Reihe tote Kacheln — reines Cyan liegt in
  sRGB bei L 0.90, auf L 0.62 gezwungen wird es zwangsläufig blass, während
  Blau dort noch volle Sättigung hat.
- `contrast(a,b)` / `onColor(bg)` — WCAG-2.1-Kontrast, Schriftfarbe auf einer
  Fläche wird nicht geraten, sondern gemessen

## Ableitungsregeln
**Schritt 1** — `h0 + i·72°`, also der größtmögliche gleichmäßige Abstand für
fünf Farben auf dem Kreis. `warmLift(h)` hebt L dort an, wo sRGB ohnehin heller
kann (Gelb/Grün), damit alle fünf gleich kräftig wirken.

**Schritt 3** — `HARMONIES`: Komplementär +180°, Split-Komplementär +150°,
Triade +120°, Analog +32°, Quadrat +90°. Dazu zwei Regeln, die unabhängig vom
Schema greifen: (a) die zweite Farbe bekommt über `H.dl` immer eine andere
Helligkeit als die erste — gleiches L bei beiden lässt sie um dieselbe
Aufmerksamkeit konkurrieren; (b) `H.cf` nimmt die Sättigung zurück, wo der
Farbtonabstand schon groß ist (Komplementär 0.80), und hebt sie an, wo er klein
ist (Analog 1.12). Die Eigenhelligkeit der Primärfarbe wird vorher
herausgerechnet (`base = p.l - 0.11·warmLift(p.h)`), damit der Versatz nicht
davon abhängt, ob man mit Gelb oder mit Blau gestartet ist.

**Schritt 4** — `accentSet(p, s)`: Brückenton auf dem Mittelpunkt des
*kürzeren* Bogens zwischen beiden Primärfarben (`midHue`), getönter Neutralton
(Primär-Hue bei C 0.024), und drei Statusfarben. Die starten bei ihren
kulturellen Ankern (Grün 148°, Gelb 85°, Rot 28°) und werden über `harmonize()`
um **maximal 14°** zur nächsten Palettenfarbe gezogen — weiter nicht, sonst ist
Rot nicht mehr als Warnung lesbar. L und C werden dagegen voll an die Palette
angeglichen.

**Rollen-Tokens** — `roleColor(base, dark)` erzeugt aus einer Basisfarbe die
Modus-Variante: Light `L ≤ 0.555`, Dark `L 0.745` bei ~86 % der Buntheit. Der
Farbton bleibt in beiden Modi exakt gleich. Dark-Mode-Farben werden aufgehellt
*und* entsättigt, weil satte Farben auf dunklem Grund flimmern.

## Bedienung
- Klick auf eine Kachel oder Tasten <kbd>1</kbd>–<kbd>5</kbd>
- „Eigener Startton": Hex-Feld, springt direkt zu Schritt 2
- „Neu würfeln" zieht einen neuen Startwinkel für Schritt 1
- Der Theme-Schalter oben rechts betrifft nur das Tool selbst, nicht die
  gebaute Palette (die zeigt immer beide Modi nebeneinander)

## Export & Permalink
Drei Tabs: CSS-Variablen (`:root` + `[data-theme="dark"]` +
`prefers-color-scheme`-Block), Design Tokens als JSON, Hex-Liste. Der Zustand
liegt im URL-Hash (`#p=L,C,H&h=<schema>&s=<seed>`) — „Link zur Palette
kopieren" gibt eine URL, die exakt dieselbe Palette wiederherstellt.

## Tech-Stack
Vanilla HTML/CSS/JS, eine Datei, keine Libraries, kein Build. Schriftart
`Inter` aus `../vendor/fonts/`.
