# Chroma Ladder — Farbkombinations-Tool

## Live-URL
https://hofmiker.github.io/Claude_Test/chroma-ladder/

## Dateien
- `index.html` — komplettes Tool (Farb-Engine, UI, Export in einer Datei, keine Abhängigkeiten)

## Beschreibung
Palettenbauer in vier Auswahlschritten plus Ergebnisseite. Jeder Schritt
schaltet den nächsten frei, und die Kachelgröße nimmt pro Schritt ab — sie
bildet das Flächengewicht ab, das die Farbe später im Interface bekommt
(60 / 30 / 10).

| Sektion | ID | Inhalt | Kachelhöhe |
|---|---|---|---|
| 1 | `#step-base` | Grundfarbe — 5 Töne im 72°-Abstand über den ganzen Farbkreis | 150 px |
| 2 | `#step-second` | Zweite Farbe — 5 Kandidaten nach klassischer Harmonielehre | 88 px |
| 3 | `#step-accents` | 5 Zusatzfarben, direkt abgeleitet (keine Auswahl) | 52 px |
| ◐ | `#step-modes` | Light-/Dark-Tokenset mit Mini-UI und WCAG-Kontrastprüfung | — |
| ✓ | `#step-site` | Die Palette als komplette Beispiel-Website (Light/Dark umschaltbar), Gewichtungsbalken, Export | — |

Die beiden Ergebnis-Sektionen stehen bewusst **hinter** den drei Auswahl-
schritten und direkt **vor bzw. mit** dem Beispiel — Light/Dark und die
Kontrastwerte sind der Beleg, den man unmittelbar vor der Website sehen will.
`#step-modes` wird trotzdem schon freigeschaltet, sobald nur die Grundfarbe
steht.

## UI-Grundsätze (nicht versehentlich zurückdrehen)
Fünf Dinge sind bewusst so gebaut und waren ausdrücklicher Änderungswunsch:

1. **Erklärungen sind versteckt.** Kein Fließtext in der Oberfläche — jede
   Begründung steckt in einem `<details class="info">` mit „?"-Chip als
   `summary`. Sichtbar bleiben nur Überschrift und Kacheln. Neue Erklärungen
   gehören in einen bestehenden oder neuen Info-Block, nicht in die Sektion.
2. **Die gewählten Farben stehen nebeneinander.** `#strip-outer` ist eine
   `position:sticky`-Leiste mit sieben Slots (Grundfarbe, Zweite Farbe,
   Brücke, Neutral, Erfolg, Warnung, Kritisch). Ungefüllte Slots bleiben als
   gestrichelte Platzhalter sichtbar, damit der Fortschritt lesbar ist; Klick
   auf einen gefüllten Slot kopiert den Hex-Wert. Weil die Leiste klebt,
   haben alle `section` ein `scroll-margin-top`.
3. **Der Farbkreis läuft immer mit.** `#wheel` sitzt links in derselben
   sticky Leiste und wird bei jeder Zustandsänderung neu gezeichnet
   (`drawWheel()`): hohle Ringe für die aktuell zur Wahl stehenden
   Kandidaten, gefüllte Marker „1"/„2" für die beiden gewählten Farben,
   kleine Punkte innen für Brückenton und die gedeckten Töne. Der
   Neutralton wird bewusst ausgelassen, er läge auf der Grundfarbe.
   `drawWheel(col)` mit Argument zeichnet zusätzlich einen Vorschau-Ring —
   das hängt an `mouseenter`/`mouseleave` jeder Kachel, damit die
   Markierung beim Überfahren mitwandert. Der Kreis darf nicht wieder in
   einen Info-Block zurückwandern.
4. **Nur eine Aktionsfarbe.** In der Beispiel-Website tritt ausschließlich
   die Grundfarbe gefüllt auf; die zweite Farbe erscheint nur als Outline
   (`.btn.s` / `.mini-btn2.s` haben `background:transparent` und
   `border-color:var(--pv-secondary)`). Zwei gleich laut gefüllte Farben
   nebeneinander nehmen sich gegenseitig die Signalwirkung.
5. **Der Gewichtungsbalken zeigt exakt die gewählten Farben.** `renderWeight()`
   nimmt `state.primary`, `state.secondary` und `state.accents` direkt —
   **nicht** die über `roleColor()` modusangepassten Token. Genau das war
   vorher der Fehler: die Balkenfarben sahen anders aus als die Kacheln.
   Der 60-%-Block ist der getönte Neutralton, nicht ein separater
   Hintergrundton.

## Beispiel-Website (Schritt ✓)
`renderSite()` baut eine vollständige fiktive Produktseite („Aurora") in einem
Browser-Rahmen: Navigation, Hero mit Kennzahlen-Panel und Balkendiagramm, drei
Feature-Karten, CTA-Band, Footer. Gefüllt ist nur die Grundfarbe (Nav-CTA,
Hero-CTA, CTA-Band, der hervorgehobene Balken); Diagramm-Serien und
Feature-Icons tragen die gedeckten Töne, die zweite Farbe nur die Outline. Gestylt ausschließlich über die `--pv-*`
-Variablen, die `applyTokens(el, dark)` auf den Container legt — dieselbe
Funktion versorgt auch die beiden Mini-Vorschauen in Schritt 2. Der
Light/Dark-Schalter über dem Rahmen setzt `state.siteMode` und rendert neu;
er ist unabhängig vom Theme-Schalter des Werkzeugs selbst.

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

**Schritt 3** — `accentSet(p, s)`: Brückenton auf dem Mittelpunkt des
*kürzeren* Bogens zwischen beiden gewählten Farben (`midHue`), getönter
Neutralton (Grundfarbton bei C 0.024), und drei **gedeckte Illustrationstöne**.
Die drei füllen gleichmäßig (25 / 50 / 75 %) die *größere* der beiden Lücken im
Farbkreis — dort, wo Grundfarbe, zweite Farbe und Brückenton nichts belegen.
Ihre Buntheit liegt bei `avgC * 0.46`, gedeckelt auf 0.088, und sie sind in drei
Helligkeitsstufen gestaffelt (L 0.775 / 0.615 / 0.455).

Das war ausdrücklich gewünscht und ersetzt eine frühere Version mit
Status-/Alarmfarben (Erfolg/Warnung/Kritisch an kulturellen Ankern bei 148° /
85° / 28°). Nicht versehentlich dorthin zurückbauen: die Töne sollen für
Illustrationen, Diagramm-Serien und ruhige Flächen taugen, nicht für
Warnmeldungen.

Wichtig dabei: die drei laufen in `buildTokens()` durch `toneColor()`, **nicht**
durch `roleColor()`. `roleColor()` normiert jede Farbe auf eine feste
Modus-Helligkeit (0.555 hell / 0.745 dunkel) — damit wären hell/mittel/tief
im Interface nicht mehr unterscheidbar. `toneColor()` hebt im Dark Mode nur an
(`0.42 + l * 0.45`) und erhält die Reihenfolge.

**Rollen-Tokens** — `roleColor(base, dark)` erzeugt aus einer Basisfarbe die
Modus-Variante: Light `L ≤ 0.555`, Dark `L 0.745` bei ~86 % der Buntheit. Der
Farbton bleibt in beiden Modi exakt gleich. Dark-Mode-Farben werden aufgehellt
*und* entsättigt, weil satte Farben auf dunklem Grund flimmern.

## Bedienung
- Klick auf eine Kachel oder Tasten <kbd>1</kbd>–<kbd>5</kbd>
- Hex-Feld + „Eigene": eigener Startton, springt direkt zu Schritt 2
- „Neu würfeln" zieht einen neuen Startwinkel für Schritt 1
- Klick auf einen Slot der Palette-Leiste kopiert dessen Hex-Wert
- Der Theme-Schalter oben rechts betrifft nur das Werkzeug selbst, nicht die
  gebaute Palette

## Export & Permalink
Drei Tabs: CSS-Variablen (`:root` + `[data-theme="dark"]` +
`prefers-color-scheme`-Block), Design Tokens als JSON, Hex-Liste. Die
Variablennamen sind `--primary`, `--secondary`, `--accent-bridge`,
`--accent-neutral` und `--tone-light` / `--tone-mid` / `--tone-deep`. Der Zustand
liegt im URL-Hash (`#p=L,C,H&h=<schema>&s=<seed>`) — „Link zur Palette
kopieren" gibt eine URL, die exakt dieselbe Palette wiederherstellt.

## Tech-Stack
Vanilla HTML/CSS/JS, eine Datei, keine Libraries, kein Build. Schriftart
`Inter` aus `../vendor/fonts/`.
