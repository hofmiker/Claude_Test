# Claude_Test — Repo-Übersicht

## Projekte
| Ordner | Projekt | URL |
|---|---|---|
| `hello/` | Hello — Partikel-Typografie | `.../hello/` |
| `solar-orbit/` | Solar Orbit — 3D-Sonnensystem | `.../solar-orbit/` |
| `dhl-city/` | DHL City Drive — 3D-Fahrspiel | `.../dhl-city/` |
| `3d-character-test/` | 3D Character Test — Low-Poly-Charakter-Studie | `.../3d-character-test/` |
| `spice-wars/` | Spice Wars — 2D Sci-Fi Strategie (Dune-2-Stil) | `.../spice-wars/` |
| `dark-city/` | Dark City — 2D Nacht-Jump'n'Run | `.../dark-city/` |
| `neon-rain-game/` | The Neon Rain — Noir-Detektiv-Adventure | `.../neon-rain-game/` |
| `toy-story/` | Spielzeug-Abenteuer — 3D-Lauf-/Hüpfspiel im Puppenhaus | `.../toy-story/` |
| `flower-vase/` | Explosion-Szenen — Blumenvase & Spaceshuttle, per Tabs wechselbar | `.../flower-vase/` |
| `snake/` | Snake — Nokia-Klassiker | `.../snake/` |
| `gta/` | Vice Grid — 3D-Top-Down-Fahrspiel im GTA-Stil | `.../gta/` |
| `cape-character/` | Cape Character — 2D-IK-Charakter mit Umhang & Kapuze | `.../cape-character/` |
| `rooftop-wanderer/` | Rooftop Wanderer — Atmosphären-Adventure | `.../rooftop-wanderer/` |
| `flappy/` | Flappy Klon — Flappy-Bird-artiges Arcade-Spiel | `.../flappy/` |
| `arkanoid/` | Arkanoid Klon — Breakout-artiges Arcade-Spiel | `.../arkanoid/` |
| `toy-box-rescue/` | Toy Box Rescue — 2D-Fangspiel im Kinderzimmer | `.../toy-box-rescue/` |
| `starship-launch/` | Starship Launch — 3D-Raketenstart & Mondlandung mit EVA-Gameplay | `.../starship-launch/` |
| `archive/` | Veraltete Versionen | nicht verlinkt |

**Base-URL:** https://hofmiker.github.io/Claude_Test/
**Landing Page:** https://hofmiker.github.io/Claude_Test/

## Deployment
GitHub Pages aus Branch `main`. Jede HTML-Datei in einem Unterordner
heißt `index.html` → saubere URLs ohne Dateiendung. `.github/workflows/deploy.yml`
deployed automatisch bei jedem Push auf `main` — kein manuelles Pages-Setting,
kein PR nötig.

Die Root-`index.html` enthält zwei Arten von Auto-Datumsplatzhaltern, die der
Deploy-Workflow bei jedem Lauf frisch einsetzt (niemals von Hand mit einem
Datum überschreiben, sonst geht die Automatik beim nächsten Edit kaputt):
`{{DEPLOY_DATE}}` (ganz oben, Zeitpunkt des letzten tatsächlichen Live-Gangs)
und `{{UPDATED:<projekt>}}` (pro Kachel, Datum des letzten Commits auf
`<projekt>/`). Dafür checkt der Workflow mit `fetch-depth: 0` aus, damit
`git log` die volle Historie sieht.

## Neues Projekt hinzufügen
1. Direkt auf `main` committen (kein Feature-Branch/PR erforderlich)
2. `<projekt>/index.html` anlegen (komplettes, selbstständiges Spiel/Projekt)
3. `<projekt>/CLAUDE.md` anlegen (Live-URL, Features, Steuerung, Tech-Stack —
   siehe bestehende Projekte als Vorlage)
4. Eintrag in der Projekte-Tabelle oben in dieser Datei ergänzen
5. **Kachel in der Root-`index.html` ergänzen — Pflichtschritt, jedes Projekt
   braucht eine Kachel.** Jede Kachel ist ein `<a>` innerhalb von
   `.projects` mit exakt dieser Struktur (Klassen `thumb`/`label`/`name`/`desc`/
   `tags`/`tag`/`updated` sind bereits per CSS gestylt, nichts weiter nötig):
   ```html
   <a href="<projekt>/" data-tags="games 3d" target="_blank" rel="noopener">
       <img class="thumb" src="screenshots/<projekt>.gif" alt="">
       <span class="label">
           <span class="tags"><span class="tag">Games</span><span class="tag">3D</span></span>
           <span class="name">Projektname</span>
           <span class="desc">Kurzbeschreibung</span>
           <span class="updated">Aktualisiert: {{UPDATED:<projekt>}}</span>
           <span class="commits">Commits: {{COMMITS:<projekt>}}</span>
       </span>
       <span class="link-badge" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7"/><path d="M8 7h9v9"/></svg></span>
   </a>
   ```
   Die Kachel-Reihenfolge in `.projects` ist **nicht** die Reihenfolge in
   der Tabelle oben, sondern nach Wichtigkeit absteigend sortiert (Proxy:
   Anzahl Commits auf dem Projekt, bei Gleichstand Codezeilen). **Wichtig:**
   dafür `git log --follow -- <projekt>/index.html` verwenden, nicht
   `git log -- <projekt>/`! Mehrere Projekte wurden im Lauf der Zeit
   umbenannt/restrukturiert (`dhl` → `dhl-city`, `sonnensystem` →
   `solar-orbit`, …) — ohne `--follow` zählt `git log` nur Commits nach der
   Umbenennung und unterschlägt die gesamte Historie davor (bei `dhl-city`
   z. B. 43 vs. nur 4 Commits). Codezeilen als Tiebreaker:
   `find <projekt> -type f \( -iname '*.html' -o -iname '*.js' -o -iname
   '*.css' \) ! -path '*/vendor/*' -exec cat {} \; | wc -l`. Neue Kachel an
   der passenden Stelle einsortieren, nicht einfach ans Ende anhängen.

   `{{UPDATED:<projekt>}}` und `{{COMMITS:<projekt>}}` **nie von Hand
   ausrechnen** — beide werden von `.github/workflows/deploy.yml` bei
   jedem Deploy automatisch befüllt (ebenfalls über `--follow` auf
   `<projekt>/index.html`, aus demselben Grund). Genau diese
   Platzhalter-Strings beim Anlegen einer neuen Kachel verwenden.

   `data-tags` ist eine mit Leerzeichen getrennte Liste aus den vier
   Filter-Kategorien oben auf der Seite: `games` (hat Spielmechanik/Ziel,
   nicht nur eine Visualisierung/Studie), `crypto` (Bitcoin/Kurs-Bezug),
   `2d` und `3d` (Rendering-Dimensionalität — bei reinen Dashboards ohne
   2D/3D-Szene wie `btc/` weglassen). Mehrfachvergabe ist normal (z. B. ein
   3D-Fahrspiel ist `games 3d`). Für jeden vergebenen Tag-Wert einen
   `<span class="tag">` mit der passenden Anzeige-Beschriftung (`Games`,
   `Crypto`, `2D`, `3D`) ergänzen — die Filter-Chips oben auf der Seite matchen
   automatisch gegen `data-tags`, dafür ist nichts weiter in JS anzupassen.
6. **Bevorzugt ein kurzes GIF für die Kachel erzeugen** (wie bei `hello/`):
   Startscreen wenn möglich überspringen (Klick/Taste simulieren) und ein
   paar Sekunden echtes Gameplay als `screenshots/<projekt>.gif` aufnehmen.
   Nur wenn das Projekt selbst von **live externen Daten** abhängt, die auch
   mit lokal vendorten Libraries nicht aus der Sandbox heraus geladen werden
   können (z. B. `bitcoin-3d` braucht Binance/CoinGecko-Kurse), bleibt nur ein
   statisches Bild unter `screenshots/<projekt>.png` — siehe Abschnitt
   "Sandbox-Netzwerk-Policy & Thumbnails" unten für das genaue Vorgehen.
   Ohne Thumbnail bleibt die Kachel schwarz.
   **Hinweis:** `create_or_update_file` über die GitHub-MCP-Tools kann keine
   echten Binärdateien schreiben (der Content wird nochmal als Text durch
   base64 geschickt, das Ergebnis ist ein korruptes Bild). Für Kacheln, die
   per MCP-Tool statt lokalem `git push` erzeugt werden, stattdessen ein
   `.svg`-Thumbnail von Hand bauen (reiner Text, kein Encoding-Problem) und
   in der `index.html` auf `screenshots/<projekt>.svg` verlinken — das ist
   aber nur ein Notbehelf für den MCP-Fall, siehe unten für die bessere
   Lösung, wenn lokaler `git`-Zugriff besteht.
7. Push auf `main` → Pages deployed automatisch, i. d. R. live in 1–2 Minuten

Kachel und Screenshot sind kein optionaler Politur-Schritt, sondern Teil der
Definition of Done für "neues Projekt hinzufügen" — ein Projekt ohne Kachel
in der Landing Page gilt als unvollständig.

## Sandbox-Netzwerk-Policy & Thumbnails
Die Ausführungsumgebung für diese Sessions blockiert per Netzwerk-Policy
praktisch alle externen CDN-Hosts (`cdnjs.cloudflare.com`, `unpkg.com`,
`cdn.jsdelivr.net`, ...) sowie externe APIs (Binance, CoinGecko,
mempool.space). `curl` gegen diese Hosts liefert `403`/Tunnel-Fehler. Das war
lange der Grund, warum mehrere Projekte (`solar-orbit`, `dhl-city`,
`bitcoin-3d`, `3d-character-test`, `flower-vase`/`gta` vor ihrer Korrektur)
nur statische Fallback-Bilder statt echter Gameplay-GIFs hatten — im
Headless-Browser (Playwright) bleibt die Seite ohne die CDN-Datei leer/kaputt.
Gelöst wird das so, in absteigender Präferenz:

1. **Bibliothek lokal vendoren, App unverändert lassen.** Für Three.js-
   Projekte: die passende Version aus einem bereits vendorten Projekt
   kopieren (`toy-story/vendor/three.module.min.js` = r160 minified ES-Modul;
   `flower-vase/vendor/three/` = r160 unminified + `OrbitControls.js`) und im
   eigenen `<projekt>/vendor/` ablegen. CDN-`<script src="https://...">`
   durch `<script type="module">` + `import * as THREE from './vendor/...'`
   ersetzen (bzw. bei Importmap-Projekten wie `solar-orbit` einfach die
   Importmap-URLs auf `./vendor/...` umbiegen). Wichtig: Wenn das Skript
   dadurch zu `type="module"` wird, landen Top-Level-Funktionen nicht mehr
   automatisch im globalen Scope — jede Funktion, die per inline `onclick=`
   aus dem HTML aufgerufen wird (z. B. `tryAgain()` in `dhl-city`), zusätzlich
   explizit an `window` hängen (`window.tryAgain = tryAgain;`).
   Für andere CDN-Libraries (z. B. Chart.js in `btc/`) reicht oft
   `npm pack <paket>@<version>` — der npm-Registry-Host ist (anders als die
   CDN-Hosts) in dieser Sandbox erreichbar — und die `dist/`-Datei aus dem
   Tarball ins `vendor/`-Verzeichnis kopieren. Das repariert nebenbei auch
   die Auslieferung selbst: eine tote CDN wäre sonst auch für echte Besucher
   ein Risiko.
2. **Nur wenn das Projekt zusätzlich echte Live-Daten braucht** (eigene
   `fetch()`-Aufrufe gegen externe APIs, nicht nur eine Rendering-Library):
   Für die Aufnahme selbst die betroffenen Endpunkte in Playwright per
   `page.route(url_pattern, ...)` abfangen und mit plausiblen, aber frei
   erfundenen JSON-Daten beantworten (`route.fulfill(...)`). So rendert die
   *echte* App-UI mit echtem Code, nur die Zahlen sind synthetisch — das ist
   der Ansatz für `btc/` (Dashboard mit gemockten Kursen/Mempool-Daten).
   Am Quellcode ändert sich dadurch nichts; im echten Deployment holt die
   Seite ganz normal Live-Daten, dort gibt es echtes Internet.
3. **Nur wenn beides nicht geht** (z. B. `bitcoin-3d`, wo ein einzelner
   generischer Candle gewünscht war statt eines echten Chart-Screenshots):
   ein separates, freistehendes Rendering bauen (eigene Mini-HTML mit
   derselben vendorten Library), das nicht von Live-Daten abhängt, und davon
   den Screenshot machen. Das Ergebnis ist explizit kein Screenshot der
   echten App — das im jeweiligen Projekt-`CLAUDE.md` unter einem
   "Thumbnail"-Abschnitt vermerken.
4. **Letzter Notbehelf** (kein lokaler `git`-Zugriff, nur GitHub-MCP-Tools):
   Hand-gebautes `.svg`-Thumbnail, siehe Schritt 6 oben.

Capture-Rezept (Playwright, lokal): `python3 -m http.server` im Repo-Root,
Chromium unter `/opt/pw-browsers/chromium` starten (kein `playwright
install` nötig, ist vorinstalliert), Startbildschirm per simuliertem
Tastendruck/Klick überspringen, Bewegung/Interaktion per
`keyboard.down()`/`keyboard.up()` simulieren, alle ~50–100 ms einen
Screenshot in einen Frame-Ordner schreiben, danach mit Pillow
(`Image.save(..., save_all=True, append_images=..., duration=..., loop=0)`)
zum GIF zusammensetzen. Bei 3D-Szenen ist ein einzelner Screenshot oft
150–700 ms teuer — Schleifen anhand von Wanduhrzeit statt fester Frame-Zahl
laufen lassen, nicht anhand einer angenommenen Framerate.

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
