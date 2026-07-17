# Claude_Test — Repo-Übersicht

## Projekte
| Ordner | Projekt | URL |
|---|---|---|
| `hello/` | Hello — Partikel-Typografie | `.../hello/` |
| `solar-orbit/` | Solar Orbit — 3D-Sonnensystem | `.../solar-orbit/` |
| `dhl-city/` | DHL City Drive — 3D-Fahrspiel | `.../dhl-city/` |
| `bitcoin-3d/` | Bitcoin 3D — Candlestick-Chart | `.../bitcoin-3d/` |
| `spice-wars/` | Spice Wars — 2D Sci-Fi Strategie (Dune-2-Stil) | `.../spice-wars/` |
| `dark-city/` | Dark City — 2D Nacht-Jump'n'Run | `.../dark-city/` |
| `neon-rain-game/` | The Neon Rain — Noir-Detektiv-Adventure | `.../neon-rain-game/` |
| `toy-story/` | Spielzeug-Abenteuer — 3D-Lauf-/Hüpfspiel im Puppenhaus | `.../toy-story/` |
| `flower-vase/` | Flower Vase — 3D-Blumenvase-Explosion mit Zeit-Regler | `.../flower-vase/` |
| `snake/` | Snake — Nokia-Klassiker | `.../snake/` |
| `btc/` | Bitcoin On-Chain Dashboard — Live-Kurs & Netzwerk-Metriken | `.../btc/` |
| `gta/` | Vice Grid — 3D-Top-Down-Fahrspiel im GTA-Stil | `.../gta/` |
| `archive/` | Veraltete Versionen | nicht verlinkt |

**Base-URL:** https://hofmiker.github.io/Claude_Test/
**Landing Page:** https://hofmiker.github.io/Claude_Test/

## Deployment
GitHub Pages aus Branch `main`. Jede HTML-Datei in einem Unterordner
heißt `index.html` → saubere URLs ohne Dateiendung. `.github/workflows/deploy.yml`
deployed automatisch bei jedem Push auf `main` — kein manuelles Pages-Setting,
kein PR nötig.

## Neues Projekt hinzufügen
1. Direkt auf `main` committen (kein Feature-Branch/PR erforderlich)
2. `<projekt>/index.html` anlegen (komplettes, selbstständiges Spiel/Projekt)
3. `<projekt>/CLAUDE.md` anlegen (Live-URL, Features, Steuerung, Tech-Stack —
   siehe bestehende Projekte als Vorlage)
4. Eintrag in der Projekte-Tabelle oben in dieser Datei ergänzen
5. **Kachel in der Root-`index.html` ergänzen — Pflichtschritt, jedes Projekt
   braucht eine Kachel.** Jede Kachel ist ein `<a>` innerhalb von
   `.projects` mit exakt dieser Struktur (Klassen `thumb`/`label`/`name`/`desc`
   sind bereits per CSS gestylt, nichts weiter nötig):
   ```html
   <a href="<projekt>/">
       <img class="thumb" src="screenshots/<projekt>.png" alt="">
       <span class="label">
           <span class="name">Projektname</span>
           <span class="desc">Kurzbeschreibung</span>
       </span>
   </a>
   ```
6. Screenshot bzw. GIF für die Kachel erzeugen und unter
   `screenshots/<projekt>.png` (oder `.gif`) ablegen — Startscreen wenn
   möglich überspringen (Klick/Taste simulieren), damit echtes Gameplay zu
   sehen ist. Ohne dieses Bild bleibt die Kachel schwarz.
7. Push auf `main` → Pages deployed automatisch, i. d. R. live in 1–2 Minuten

Kachel und Screenshot sind kein optionaler Politur-Schritt, sondern Teil der
Definition of Done für "neues Projekt hinzufügen" — ein Projekt ohne Kachel
in der Landing Page gilt als unvollständig.

## Branch-Namenskonvention
Neue Sessions bekommen automatisch einen Branch mit Zufallsnamen
(`claude/<beschreibung>-<code>`). Sobald im Laufe der Session klar wird,
zu welchem Projektordner (siehe Tabelle oben) die Änderungen gehören,
den Branch vor dem finalen Push umbenennen zu:

`<projekt>/<kurzbeschreibung>` — z. B. `solar-orbit/add-moon-texture`

Betrifft die Session kein einzelnes Projekt (repo-weite Aufräum-/Meta-Arbeit),
stattdessen `chore/<kurzbeschreibung>` verwenden.

## Entwicklung
Für projektspezifischen Kontext → CLAUDE.md im jeweiligen Unterordner lesen.
