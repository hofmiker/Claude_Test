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
großes, real proportioniertes zweistöckiges Einfamilienhaus laufen.
1 Welteinheit = 1 Meter; Raum/Möbel sind in echten Maßen gebaut, sodass
sie dramatisch über der winzigen Figur aufragen.

**Erdgeschoss** (klassischer Grundriss, Fenster ringsum): Hauseingang/
Flur mit Haustür, Wohnzimmer (Sofa, Couchtisch, Esstisch, Konsolen-
tisch, Stehlampe, Bilder, Zimmerpflanze), Küche (Herd, Spüle,
Kühlschrank, Ober-/Unterschränke), Toilette. Fußbodenleisten,
Holzdielenboden als prozedurale Canvas-Textur (kein externes Asset).

**Treppe**: sichtbare Stufen über einer durchgehenden Rampe (für die
Kollision), sodass die Höhe beim Rauf-/Runterlaufen stufenlos
mitwächst statt zu springen.

**Dachgeschoss** (Dachschrägen ab Kniestockhöhe, jedes Zimmer mit
Dachfenster): Elternschlafzimmer mit Kleiderschrank, Kinderzimmer 1
(große Schwester, Schreibtisch), Kinderzimmer 2 (Junge — Bett, Regal,
Spielzeugkiste, anstoßbare Bälle, Schaukelpferd, Teddy, Bauklötze,
Rennautos + Rennbahn), Bad (Badewanne, Toilette, Waschbecken).

**Außenansicht**: Durch die Fenster sind ringsum niedrig-poly Häuser
und Bäume sichtbar (nicht begehbar — man kann das Haus nicht verlassen).

**Katze**: läuft mit einfacher Wander-KI zwischen zufälligen Punkten im
Erdgeschoss umher.

Türen (Zwischentüren + Haustür + Bad/Zimmertüren) haben Rahmen,
Scharniere und Klinke und pivotieren um eine echte Scharnierachse.

## Steuerung & Kamera
Mechanik an `dhl-city/character.html` angelehnt:
- Panzer-Lenkung: W/↑ vorwärts, S/↓ rückwärts, A/D bzw. ←/→ drehen
- Touch (ohne virtuelle Buttons): Wischen = laufen/drehen (wie im
  Original), kurzes Tippen = hüpfen
- Leertaste hüpft — Sprung als Zustandsautomat (Ausholen → Luft → Landung),
  behält dabei Vor-/Rückwärtsschwung (Sprung nach vorne/hinten möglich)
- Sanfte Beschleunigung/Bremsung statt sofortiger Geschwindigkeit
- Beine als Hüfte+Knie-Gelenkkette, mit denselben Lauf-/Sprung-Formeln
  wie im Original animiert (kein Bodenplatten-Sockel mehr unter der Figur)
- Feste Verfolgungskamera hinter dem Charakter (kein Maus-Orbit), zieht
  beim Stehen näher heran; zusätzlich Wandkollisions-Raycast, damit die
  Kamera nie durch Wände/Möbel clippt (Ergänzung ggü. dem Original, da
  dhl-city eine offene Außenwelt ohne Wände ist)

## Tech-Stack
- Three.js (lokal unter `vendor/`), Vanilla JS, kein Build-Schritt
