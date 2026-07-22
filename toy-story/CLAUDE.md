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
  kinderzimmer1, bad, kinderzimmer2, exterior) + `coins.js` (10 Sammel-Münzen)
- `gameplay/player.js` — Spielfigur-Modell + State + Input + Bewegung/Sprung/
  Kollision + Animation
- `gameplay/camera.js` — Verfolgungskamera + Wandkollisions-Raycast
- `gameplay/cat.js` — Katzen-Modell + Wander-KI (beide Etagen, nimmt die Treppe)
- `gameplay/audio.js` — prozedural erzeugte Soundeffekte (Web Audio API,
  keine externen Assets): Schritte, Absprung, Landung
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
Kollision), sodass die Höhe beim Rauf-/Runterlaufen stufenlos mitwächst
statt zu springen. Der Einstieg vom Erdgeschoss aus erfordert allerdings
einen Sprung (wie eine echte erste Stufenkante) — einfaches Reinlaufen
wird an der Fußpunkt-Kante blockiert; einmal auf der Rampe oder beim
Runterlaufen von oben gilt das nicht.

**Sammel-Münzen**: 10 schwebende, rotierende Münzen über beide Etagen
verteilt (siehe `content/coins.js`), HUD-Counter oben links. Reine
Bonus-Mechanik ohne Einfluss auf Bewegung/Kollision.

**Dachgeschoss** (Dachschrägen ab Kniestockhöhe, jedes Zimmer mit
Dachfenster): Elternschlafzimmer mit Kleiderschrank, Kinderzimmer 1
(große Schwester, Schreibtisch), Kinderzimmer 2 (Junge — Bett, Regal,
Spielzeugkiste, anstoßbare Bälle, Schaukelpferd, Teddy, Bauklötze,
Rennautos + Rennbahn), Bad (Badewanne, Toilette, Waschbecken).

**Außenansicht**: Durch die Fenster sind ringsum niedrig-poly Häuser
und Bäume sichtbar (nicht begehbar — man kann das Haus nicht verlassen).

**Katze**: läuft mit einfacher Wander-KI zwischen zufälligen Punkten im
ganzen Haus umher — bei einem Ziel auf der anderen Etage nimmt sie
selbstständig die Treppe (gleiche Rampen-Logik wie die Spielfigur). Gibt
ein Ziel nach einigen Sekunden ohne Fortschritt auf (Stuck-Erkennung),
statt für immer gegen ein unerreichbares Möbelstück zu laufen.

Türen (Zwischentüren + Haustür + Bad/Zimmertüren) haben Rahmen,
Scharniere und Klinke und pivotieren um eine echte Scharnierachse.

## Steuerung & Kamera
Mechanik an `dhl-city/character.html` angelehnt, Touch-Steuerung an
`cape-character/index.html` angelehnt:
- Panzer-Lenkung: W/↑ vorwärts, S/↓ rückwärts, A/D bzw. ←/→ drehen
- Touch: virtueller 360°-Joystick unten links (ein Kreis-Pad, der Knüppel
  folgt Finger/Maus in jede Richtung — analoge Beträge statt nur 4 diskreter
  Tasten) + runder Sprung-Button unten rechts, eigenes DOM-Element mit
  eigenem touchstart/touchend-Listener. Dadurch sind Vorwärts-Halten +
  Sprung-Tippen gleichzeitig möglich — bei einer Wischgeste auf nur einem
  Touchpunkt geht das nicht
- Leertaste/Sprung-Button hüpft — Sprung als Zustandsautomat (Ausholen →
  Luft → Landung), Ausholen mit deutlich sichtbarem Kauern (Knie-/
  Hüftbeugung + Rumpf-Senkung) vor dem Absprung
- Impulserhaltung beim Sprung: Tempo/Richtung werden im Moment des
  Absprungs (nicht erst beim Abheben) festgehalten und tragen durch die
  ganze Flugbahn — ein Sprung geht auch dann sichtbar nach vorne, wenn
  Vorwärts nicht die ganze Flugzeit über gehalten wird. Prallt beim Treffen
  eines Objekts während des Flugs seitlich ab (Geschwindigkeitskomponente
  in die Wand wird herausgerechnet), statt jeden Frame erneut stumpf
  dagegenzulaufen
- Absichtlich langsamer/länger hängender Sprungbogen als real (~1s Flugzeit,
  ~0.5m Höhe) statt eines schnellen, kurzen Hüpfers — dadurch lässt sich
  gezielt auf die Oberseite der meisten Möbelstücke springen (Sofas, Sessel,
  Tische, Betten, Nachttische, Bänke, Kommoden, Badewannenrand, Waschbecken,
  Toiletten, Bauklötze, Sitzsack); zu hohe/unpassende Objekte (Schrank,
  Kühlschrank, Regal, Pflanzen, Schaukelpferd, Teddy, Zelt) bleiben normale
  Wände
- Sanfte Beschleunigung/Bremsung statt sofortiger Geschwindigkeit
  (SPEED_MAX 0.9, entspricht +20% ggü. dem ursprünglichen Tempo)
- Beine als Hüfte+Knie-Gelenkkette, mit denselben Lauf-/Sprung-Formeln
  wie im Original animiert, Gangtempo (WALK_ANIM_RATE) +40% ggü. dem
  ursprünglichen Wert (kein Bodenplatten-Sockel mehr unter der Figur)
- Soundeffekte (prozedural, `gameplay/audio.js`): Schritt bei jedem
  Fußkontakt im Laufzyklus, Ton beim Absprung, Thump bei der Landung,
  Chime beim Münze-Einsammeln
- Feste Verfolgungskamera hinter dem Charakter (kein Maus-Orbit), zieht
  beim Stehen näher heran; zusätzlich Wandkollisions-Raycast, damit die
  Kamera nie durch Wände/Möbel clippt (Ergänzung ggü. dem Original, da
  dhl-city eine offene Außenwelt ohne Wände ist)

## Tech-Stack
- Three.js (lokal unter `vendor/`, ES-Modul-Build), natives ES-Module
  (`<script type="module">`), Vanilla JS, kein Build-Schritt
