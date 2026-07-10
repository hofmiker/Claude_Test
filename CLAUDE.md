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
| `toy-story/` | Spielzeug-Abenteuer — 3D-Lauf-/Hüpfspiel | `.../toy-story/` |
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
5. Karte in der Root-`index.html` (Landing Page) ergänzen
6. Push auf `main` → Pages deployed automatisch, i. d. R. live in 1–2 Minuten

## Entwicklung
Für projektspezifischen Kontext → CLAUDE.md im jeweiligen Unterordner lesen.
