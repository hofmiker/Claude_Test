# Spielzeug-Abenteuer — 3D-Lauf-/Hüpfspiel

## Live-URL
https://hofmiker.github.io/Claude_Test/toy-story/

## Dateien
Aufgeteilt in Gebäudeplan (reine Daten) vs. Gameplay (Logik) — siehe
Kommentar am Kopf jeder Datei für Details. Kein Build-Schritt: ES-Module,
`<script type="module">`.

- `index.html` — Startbildschirm + Canvas, lädt `main.js`
- `main.js` — Entry Point: Renderer/Szene/Kamera/Licht, verdrahtet Gebäude +
  Zimmer + Gameplay, rAF-Loop, Resize, Hint-Button
- `style.css` — Layout/HUD
- `vendor/three.module.min.js` — lokal vendorte Three.js ES-Modul-Version
- `data/house-plan.js` — Gebäudeplan als reine Daten (Layout-Konstanten,
  Räume/Wände/Türen/Fenster/Giebel/Treppe je Etage) — **einzige Quelle der
  Wahrheit** für die Gebäudestruktur, auch für `floorplan.js`
- `build/primitives.js` — generische Mesh-/Möbel-Fabriken, keine world-Abhängigkeit
- `build/collision.js` — AABB-Kollisionsliste (Singleton-Modul)
- `build/house-builder.js` — liest `data/house-plan.js`, baut daraus die
  komplette Gebäudestruktur (Wände/Böden/Türen/Fenster/Treppe/Dach)
- `content/*.js` — Möblierung je Zimmer (ground-floor, elternschlafzimmer,
  kinderzimmer1, bad, kinderzimmer2, exterior)
- `gameplay/player.js` — Spielfigur-Modell + State + Input + Bewegung/Sprung/
  Kollision + Animation
- `gameplay/camera.js` — Verfolgungskamera + Wandkollisions-Raycast
- `gameplay/cat.js` — Katzen-Modell + Wander-KI
- `floorplan.html` / `floorplan.js` — Dev-Tool: SVG-Grundriss, generiert NUR
  aus `data/house-plan.js` (nicht vom Spiel verlinkt, nur zur Ansicht,
  kein Round-Trip-Import zurück in die Daten)

**Neues Level/Storyline andocken**: Layout-Konstanten und Raum-/Wand-Arrays
in `data/house-plan.js` erweitern (z. B. `ROOMS_OBERGESCHOSS2`), einen
`build/house-builder.js`-Aufruf für die neue Etage ergänzen, neue
`content/*.js`-Dateien für die Zimmer. Die Gameplay-Dateien
(`gameplay/*.js`) sind etagen-agnostisch und brauchen dafür keine Änderung.

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
- Three.js (lokal unter `vendor/`, ES-Modul-Build), natives ES-Module
  (`<script type="module">`), Vanilla JS, kein Build-Schritt
