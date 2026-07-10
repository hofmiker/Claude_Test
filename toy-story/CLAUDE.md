# Spielzeug-Abenteuer — 3D-Lauf-/Hüpfspiel

## Live-URL
https://hofmiker.github.io/Claude_Test/toy-story/

## Dateien
- `index.html` — Startbildschirm + Canvas
- `game.js` — Spiellogik (Three.js)
- `style.css` — Layout/HUD
- `vendor/three.min.js` — lokal vendorte Three.js-Version (kein CDN nötig)

## Konzept
Als 10 cm kleine Spielfigur (Spielfigur-/Pawn-Optik) durch ein normal
großes, real proportioniertes Haus (Wohnzimmer → Kinderzimmer) laufen.
1 Welteinheit = 1 Meter; Raum/Möbel sind in echten Maßen gebaut (2,6 m
Deckenhöhe, 0,9 m Türen, Sofa/Tisch/Stühle in Normalgröße), sodass sie
dramatisch über der winzigen Figur aufragen. Im Wohnzimmer: Sofa,
Couchtisch, Esstisch mit 2 Stühlen, Konsolentisch mit Tischlampe,
Stehlampe, Fenster, Bilder, Zimmerpflanze, Haustür. Im Kinderzimmer:
Bett mit Nachttischlampe, Regal, Spielzeugkiste, Fenster, Bilder,
Zimmerpflanze sowie anstoßbare Bälle, ein Schaukelpferd, ein Teddy und
Bauklötze. Eine offene Zwischentür (mit Rahmen, Scharnieren, Klinke)
markiert den Durchgang, eine geschlossene Haustür sitzt in der
Wohnzimmer-Außenwand. Fußbodenleisten an allen Innenwänden, Holzdielen-
boden als prozedurale Canvas-Textur (kein externes Asset).

## Steuerung & Kamera
Mechanik an `dhl-city/character.html` angelehnt:
- Panzer-Lenkung: W/↑ vorwärts, S/↓ rückwärts, A/D bzw. ←/→ drehen
- Touch (ohne virtuelle Buttons): Wischen = laufen/drehen (wie im
  Original), kurzes Tippen = hüpfen
- Leertaste hüpft — Sprung als Zustandsautomat (Ausholen → Luft → Landung)
- Sanfte Beschleunigung/Bremsung statt sofortiger Geschwindigkeit
- Beine als Hüfte+Knie-Gelenkkette, mit denselben Lauf-/Sprung-Formeln
  wie im Original animiert (kein Bodenplatten-Sockel mehr unter der Figur)
- Feste Verfolgungskamera hinter dem Charakter (kein Maus-Orbit), zieht
  beim Stehen näher heran; zusätzlich Wandkollisions-Raycast, damit die
  Kamera nie durch Wände/Möbel clippt (Ergänzung ggü. dem Original, da
  dhl-city eine offene Außenwelt ohne Wände ist)

## Tech-Stack
- Three.js (lokal unter `vendor/`), Vanilla JS, kein Build-Schritt
