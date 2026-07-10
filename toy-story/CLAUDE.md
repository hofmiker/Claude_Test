# Spielzeug-Abenteuer — 3D-Lauf-/Hüpfspiel

## Live-URL
https://hofmiker.github.io/Claude_Test/toy-story/

## Dateien
- `index.html` — Startbildschirm + Canvas
- `game.js` — Spiellogik (Three.js)
- `style.css` — Layout/HUD
- `vendor/three.min.js` — lokal vendorte Three.js-Version (kein CDN nötig)

## Konzept
Als kleine Spielfigur (Spielfigur-/Pawn-Optik) durch ein Haus (Flur →
Kinderzimmer) laufen. Im Kinderzimmer liegen anstoßbare Bälle, ein
Schaukelpferd, ein Teddy und Bauklötze herum.

## Steuerung & Kamera
Mechanik an `dhl-city/character.html` angelehnt:
- Panzer-Lenkung: W/↑ vorwärts, S/↓ rückwärts, A/D bzw. ←/→ drehen
- Leertaste hüpft — Sprung als Zustandsautomat (Ausholen → Luft → Landung)
- Sanfte Beschleunigung/Bremsung statt sofortiger Geschwindigkeit
- Feste Verfolgungskamera hinter dem Charakter (kein Maus-Orbit), zieht
  beim Stehen näher heran; zusätzlich Wandkollisions-Raycast, damit die
  Kamera nie durch Wände/Möbel clippt (Ergänzung ggü. dem Original, da
  dhl-city eine offene Außenwelt ohne Wände ist)

## Tech-Stack
- Three.js (lokal unter `vendor/`), Vanilla JS, kein Build-Schritt
