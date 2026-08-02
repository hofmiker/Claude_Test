# Bitcoin On-Chain Dashboard — Live-Kurs & Netzwerk-Metriken

## Live-URL
https://hofmiker.github.io/Claude_Test/btc/

## Dateien
- `index.html` — komplettes Dashboard
- `vendor/chart.umd.js` — Chart.js 4.4.2 (unminified UMD-Build, lokal
  vendored statt CDN)
- `vendor/chartjs-adapter-date-fns.bundle.min.js` — Zeitachsen-Adapter
  (lokal vendored statt CDN)

## Datenquellen (live, echtes Internet nötig)
- CoinGecko (`/coins/bitcoin`) — Preis, Marktkapitalisierung, Volumen, ATH
- mempool.space (`/api/...`) — Blockhöhe, Fees, Mempool, Hashrate, Difficulty
- Binance (`/api/v3/klines`) — Kursverlauf-Chart
- Automatische Aktualisierung alle 60s, manueller "Aktualisieren"-Button

## Tech-Stack
- Chart.js 4.4.2 + chartjs-adapter-date-fns 3.0.0, lokal vendored unter
  `vendor/` (per `npm pack` geholt — die CDN-Hosts sind in der
  Sandbox-Umgebung per Netzwerk-Policy blockiert, die npm-Registry aber
  erreichbar)
- Vanilla JS, kein Build-Schritt

## Thumbnail
`screenshots/btc.png` ist ein echter Screenshot der App mit der echten
UI/Rendering-Logik, aber mit gemockten Kurs-/Netzwerkdaten: Sowohl die
CDN-Hosts als auch CoinGecko/mempool.space/Binance sind in der
Sandbox-Umgebung blockiert, daher wurden die drei APIs beim Screenshot
per Playwright-Routing (`page.route(...)`) mit plausiblen, frei erfundenen
JSON-Antworten beantwortet. Am produktiven Code ändert das nichts — im
echten Deployment lädt die Seite ganz normal Live-Daten.
