# Vice Grid — 3D-Top-Down-Fahrspiel im GTA-Stil

## Live-URL
https://hofmiker.github.io/Claude_Test/gta/

## Dateien
- `index.html` — Shell/UI
- `main.js` — Fahrphysik, Kamera, Rendering, Input, HUD
- `mission.js` — Missions-/Dialogsystem
- `vendor/three.module.min.js` — Three.js, lokal vendored (ES-Modul)
- `vendor/fonts/bebas-neue-400.woff2` — Bebas Neue, lokal vendored via
  `npm pack @fontsource/bebas-neue` (npm-Registry ist in der Sandbox
  erreichbar, Google-Fonts-CDN nicht) — Display-Font `'ViceDisplay'` für
  Titel/HUD-Zahlen/Buttons, siehe Abschnitt "UI" unten.

## Steuerung
Pfeiltasten/WASD fahren, `C` wechselt Kameramodus. Touch: analoger
360°-Joystick unten links (Vorwärts/Rückwärts + Lenken in einem, an
`starship-launch`/`toy-story` angelehnt) statt einzelner Gas/Brems-/Lenk-
Tasten — steuert sowohl das Auto als auch die Spielfigur zu Fuß (dasselbe
Panzer-Lenkung-Eingabemodell wie Tastatur). Sprung-Button (Gold) und
Kontext-Aktion-Button (Cyan, zeigt "Reden"/"Nehmen"/"Einsteigen"/
"Übergeben" o.ä.) unten rechts.

## UI
- **Font:** `'ViceDisplay'` (Bebas Neue, condensed/uppercase) für Titel,
  Geschwindigkeit/Geld-HUD, Fahndungs-Banner, Dialog-Sprecher, End-Screen
  und alle Buttons — Fallback-Kette `Impact, 'Arial Narrow', sans-serif`.
  Fließtext (Dialogzeilen, Ziel-Beschreibung, Toast-Text) bleibt bei der
  normalen Systemschrift für Lesbarkeit.
- **Titel-Intro:** `#loading` zeigt beim Start eine animierte Neon-Titelkarte
  (`#titleSplash`: "VICE" in Pink, "GRID" in Cyan, leicht skewed wie ein
  Neon-Schild, darunter "Der Kessel" in Gold) als **transluzentes** Overlay
  direkt über der schon laufenden Szene (kein deckendes Schwarz mehr) —
  läuft nach spätestens 2.4s automatisch aus, jeder Tastendruck/Tap
  überspringt sie sofort (`main.js`: `dismissSplash()`, per `once`-Listener
  auf `pointerdown`/`keydown`).
- **Startsequenz / HUD-Reveal:** `body` startet mit der Klasse
  `intro-active` (in `index.html`), die `#hud` und `#mobileControls`
  komplett unsichtbar hält (Opacity 0, keine Pointer-Events) — Titelkarte
  und danach der Intro-Anruf (`call_dragan`) laufen also vor leerem HUD ab,
  keine Tacho-/Geld-/Minimap-/Steuerungs-Elemente lenken ab. Sobald die
  Titelkarte weg ist, startet `dismissSplash()` die Mission sofort
  (`startMission()`, keine künstliche Verzögerung mehr) — der Dialog blendet
  also im selben Moment ein, in dem die Titel-Typo ausblendet. Erst wenn
  dieser allererste Dialog zu Ende ist (`advanceDialogLine()` erreicht das
  Ende), entfernt `main.js` die `intro-active`-Klasse wieder und HUD +
  Touch-Steuerung blenden ein — spätere Dialoge im Spielverlauf lassen HUD/
  Steuerung unangetastet, das Ausblenden ist nur ein Intro-Einmal-Effekt.
- **Analoger Joystick:** ersetzt die vorherigen vier Einzel-Buttons
  (Links/Rechts/Gas/Bremse) sowie das vollflächige Wisch-Steuern —
  dasselbe Pointer-Events-Pattern (`setPointerCapture`,
  `touchMove.forward/back/left/right`) wie in `starship-launch`, mit zwei
  Härtungen gegenüber dem starship-Original: (1) `pointermove`/`pointerup`/
  `pointercancel` hängen am `window`, nicht am `#joystick`-Element selbst —
  ein echter Finger verlässt bei voller Auslenkung leicht die kleine
  92px-Kreisfläche, und `pointerleave` feuert auf manchen mobilen Browsern
  nach der physischen Position statt nach dem Capture-Ziel, was den Knüppel
  mitten in der Bewegung auf Mitte zurückschnappen ließ ("Joystick bewegt
  sich nicht"); `pointerleave` wird deshalb gar nicht mehr als Reset-Trigger
  benutzt. (2) Die Auslenkung wird pro Achse unabhängig geclampt (Quadrat
  statt Kreis) statt den kombinierten Vektor auf `JOY_RADIUS` zu
  normalisieren — ein Kreis-Clamp kappt Lenkung UND Gas bei diagonaler
  Auslenkung gemeinsam auf ~70%, was sich beim Fahren wie eine deutlich
  schwächere Lenkung anfühlte. Die frühere "Tasten aus"-Einstellung wurde
  entfernt, da sie nur die jetzt nicht mehr existierenden vier Buttons
  betraf.
- **Buttons:** Sprung-/Aktion-Button haben identische Maße (beide 64px+
  breite, 56px hohe Pille, `min-width`/`height`/`border-radius` geteilt) —
  nur Akzentfarbe und Icon-vs-Text-Inhalt unterscheiden sie; eine reine
  Kreisform hätte längere Kontext-Labels wie "Übergeben" abgeschnitten.
- **Geld-/Minimap-Ecke:** Geld-Anzeige ist deutlich kleiner (15px statt
  26px), Minimap rückt dadurch enger an die obere rechte Ecke (`top: 30px`
  statt `44px`).
- **Notifications:** Fahndungs-Banner hat jetzt einen Hintergrund-Chip statt
  nur Text mit Schatten (deutlich lesbarer über der Szene); die Sub-Toast-
  Meldung (`#subMsg`, z. B. "Eingestiegen") ist größer, hat eine eigene
  Kapsel-Optik und einen expliziten "OK"-Button zum sofortigen Wegklicken,
  statt nur auf das automatische Timeout (2.6s) zu warten.
- **Dialog als Chat-Thread:** `#dialogBox` (unabhängig von `#hud`, siehe
  oben) ist ein echter Nachrichtenverlauf statt einer einzelnen Box, die
  ihren Text überschreibt — jede Zeile ist eine eigene `.dchat-row` mit
  Sprechblase, per JS erzeugt (`pushDialogRow()` in `main.js`), neueste
  unten. Marek (Spieler) sitzt rechts in Pink; jede andere benannte Figur
  hat ihre eigene feste Farbe (`SPEAKER_STYLE`-Map: Dragan Blau, Lena Lila,
  Vess Orange, unbekannte Sprecher Grau als Fallback) und sitzt links;
  namenlose Regie-/Erzählzeilen (`speaker: ""`) sind zentriert und ohne
  Blasenhintergrund. Nur die letzten `DIALOG_HISTORY_MAX` (3) Zeilen bleiben
  sichtbar, ältere werden entfernt; die zwei davor sichtbaren Zeilen dimmen
  stufenweise (0.5 / 0.25 Opacity), sodass neue Nachrichten die alten optisch
  nach oben verdrängen/ausfaden statt alle gleich hell nebeneinander stehen
  zu lassen. Die Box bleibt mit `calc(100vw - 64px)` und `max-width:78%` je
  Blase bewusst vom Bildschirmrand entfernt. Der "Weiter"-Text-Button ist
  einem kleinen runden Pfeil-Button (`#dialogNextBtn`, reine CSS-Form)
  gewichen, der als eigene Zeile immer unter der neuesten Nachricht sitzt.
- **Spielfigur-Farbe:** trägt ein einheitliches Outfit (Hemd/Hose/Schuhe
  alle in Pink, `PLAYER_PALETTE` in `main.js`) statt drei verschiedener
  Farbtöne — dadurch sofort von Passanten (`createPedMesh`, zufällige
  Hemdfarbe) und benannten Missions-NPCs (`NPC_BY_STEP`, jeweils eigene
  Palette) unterscheidbar, die weiterhin ihre eigenen, unveränderten
  Farbschemata behalten.
- **Minimap:** Spieler-Pfeil ist größer, Pink statt Rot und mit weißem
  Outline (zeigt dank "heading-up"-Rotation der ganzen Karte immer nach
  oben = Fahrtrichtung). Streifenpolizei (`policeCars`) zeigt klar Blau
  (`#3b7bff`) statt des vorherigen blassen Grau-Blau; aktive Fahndungs-Autos
  (`chaseCops`) blinken durchgehend Rot/Blau im Takt (`Math.sin(elapsed*10)`)
  wie ein echtes Blaulicht, statt einfarbig Blau zu stehen.

## Fahrphysik & Polizei
- **Gebäude-Kollision:** ein Treffer bremst nicht mehr pauschal auf 12%
  Restgeschwindigkeit ab — `collideWithBuildings()` gibt optional die
  Wand-Normale zurück, `physicsStep()` berechnet daraus den Auftreffwinkel:
  ein Streifschuss (flacher Winkel) behält fast die volle Geschwindigkeit
  und bekommt stattdessen einen seitlichen `shove`-Impuls (rutscht an der
  Wand entlang), ein Frontalcrash bremst weiterhin hart ab — exakt das
  Alignment-Prinzip, das die Auto-gegen-Auto-Kollision schon vorher nutzte.
- **Rammen eskaliert zur Fahndung:** Rammt man außerhalb einer aktiven
  Fahndung ein Streifenpolizei-Auto (`policeCars`, nicht bereits Teil von
  `chaseCops`) hart genug (`impactSpeed > 9`), startet `startPolice()` genau
  wie das skriptete Alarm-Ereignis in der Mission — Polizei lässt sich also
  auch außerhalb des Missionsscripts freies Spiel provozieren.
- **Polizei zu Fuß:** Verlässt der Spieler während einer Fahndung sein Auto,
  parken alle `chaseCops` ihr Fahrzeug (unsichtbar geschaltet, nimmt nicht
  mehr an Auto-Kollisionen teil) und laufen stattdessen zu Fuß hinterher
  (eigenes `officer`-Objekt pro Cop, `createPlayerMesh(OFFICER_PALETTE)` in
  Marineblau, animiert über dieselbe `animateCharacter()`-Funktion wie der
  Spieler). Steigt der Spieler wieder in ein Auto, kehren die Cops
  automatisch in ihr Fahrzeug zurück. Die Einkesselungs-/Kollisions-Buste
  (`POLICE.bust`) greifen unverändert in beiden Modi.

## Tech-Stack
- Three.js, lokal vendored unter `vendor/` (ES-Modul, kein CDN)
- Vanilla JS, kein Build-Schritt
