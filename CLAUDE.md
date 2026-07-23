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
| `flower-vase/` | Explosion-Szenen — Blumenvase & Spaceshuttle, per Tabs wechselbar | `.../flower-vase/` |
| `snake/` | Snake — Nokia-Klassiker | `.../snake/` |
| `btc/` | Bitcoin On-Chain Dashboard — Live-Kurs & Netzwerk-Metriken | `.../btc/` |
| `gta/` | Vice Grid — 3D-Top-Down-Fahrspiel im GTA-Stil | `.../gta/` |
| `cape-character/` | Cape Character — 2D-IK-Charakter mit Umhang & Kapuze | `.../cape-character/` |
| `rooftop-wanderer/` | Rooftop Wanderer — Atmosphären-Adventure | `.../rooftop-wanderer/` |
| `flappy/` | Flappy Klon — Flappy-Bird-artiges Arcade-Spiel | `.../flappy/` |
| `arkanoid/` | Arkanoid Klon — Breakout-artiges Arcade-Spiel | `.../arkanoid/` |
| `toy-box-rescue/` | Toy Box Rescue — 2D-Fangspiel im Kinderzimmer | `.../toy-box-rescue/` |
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
6. **Bevorzugt ein kurzes GIF für die Kachel erzeugen** (wie bei `hello/`):
   Startscreen wenn möglich überspringen (Klick/Taste simulieren) und ein
   paar Sekunden echtes Gameplay als `screenshots/<projekt>.gif` aufnehmen.
   Nur wenn das nicht geht (z. B. Projekt hängt von per Netzwerk-Policy
   geblockten CDNs/APIs ab, siehe `solar-orbit`/`dhl-city`/`bitcoin-3d`),
   stattdessen auf ein statisches Bild unter `screenshots/<projekt>.png`
   zurückfallen. Ohne dieses Bild bleibt die Kachel schwarz.
   **Hinweis:** `create_or_update_file` über die GitHub-MCP-Tools kann keine
   echten Binärdateien schreiben (der Content wird nochmal als Text durch
   base64 geschickt, das Ergebnis ist ein korruptes Bild). Für Kacheln, die
   per MCP-Tool statt lokalem `git push` erzeugt werden, stattdessen ein
   `.svg`-Thumbnail von Hand bauen (reiner Text, kein Encoding-Problem) und
   in der `index.html` auf `screenshots/<projekt>.svg` verlinken.
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
