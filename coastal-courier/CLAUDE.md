# The Coastal Courier — 3D-Fluchtfahrt im Vice-Grid-UI-Stil

## Live-URL
https://hofmiker.github.io/Claude_Test/coastal-courier/

## Herkunft & Abgrenzung zu gta/
Es gibt bereits eine kompaktere Fassung derselben Story als Level 2 ("Coastal
Courier") *innerhalb* von `gta/` (Vice Grid) — bewusst auf dessen Auto/Lauf/
Dialog-Engine verdichtet, ohne Boot/Limousine/Brücken-Fußlauf (siehe
`gta/mission.js`, Kommentar bei `DISTRICT_COASTAL`). Dieses Projekt hier ist
die **volle** Fassung des ursprünglichen Story-Prompts mit allen vier
Transportmitteln (Cabrio, Motorboot, zu Fuß, Limousine-Cutscene) — als
eigenständiges Projekt, nicht als Ersatz für die gta-Version. UI/HUD-Sprache
(Font, Dialog-Chat, Minimap, Joystick-Layout) ist bewusst an `gta/` angelehnt,
die Engine selbst ist komplett neu und eigenständig (eine lineare Fluchtroute
statt eines offenen Stadtgrids).

## Dateien
- `index.html` — Shell/UI (identisches CSS-Grundgerüst wie `gta/`, plus neue
  HUD-Elemente: Uhr, Ausdauer-Balken, Handy-Toast)
- `main.js` — komplette Engine: Szene/Welt-Bau, Physik für alle vier
  Transportmittel, Verfolgungs-KI, Dialogsystem, HUD, Minimap, Kamera
- `mission.js` — reiner Content: alle vier Dialoge (Dante-Anruf, Viktor,
  Mechaniker, Elaine), Phasen-/Uhrzeit-Tabelle, Zielobjekte
- `vendor/three.module.min.js`, `vendor/fonts/bebas-neue-400.woff2` — aus
  `gta/vendor/` kopiert (identische Version, kein erneutes Vendoring nötig)

## Story & Ablauf
Marcus bringt ein Kunstwerk-Paket von einer Villa in Malibu zum Hafen,
flüchtet per Motorboot unter die Golden Gate Bridge, läuft zu Fuß über die
Brücke, wird per Limousine nach Sausalito gefahren und trifft Elaine zum
(verspäteten) Date am Pier — 4 Dialogszenen, 5 Wegpunkte, Zeit-Druck-HUD von
13:30 bis 16:00 Uhr (1 Realsekunde = 1 Spielminute, `CLOCK_TICK_PER_SEC` in
`mission.js`). Die Welt ist **eine lineare Route** (Villa → Küstenstraße →
Hafen → Kanal → Golden Gate Bridge → Nordstraße → Pier) statt eines freien
Stadtgrids wie in `gta/` — die Geschichte ist eine einzige Fluchtroute, kein
offener Spielplatz.

## Transportmittel & Physik
- **Cabrio** (Villa → Küstenstraße → Hafen): leichtes Arcade-Handling,
  `TUNE.cabrio` in `main.js`.
- **Motorboot** (Hafen → Kanal → Brücke): trägeres Beschleunigen, spürbarer
  Slip zwischen Heading und tatsächlicher Geschwindigkeitsrichtung
  (`player.slipVX/slipVZ`, per Grip-Faktor an die Heading-Richtung
  angenähert statt sie 1:1 zu übernehmen) — fühlt sich bewusst weniger
  direkt lenkbar an als das Cabrio.
- **Zu Fuß** (Golden-Gate-Brücke): Sprint/Ausdauer-System (`player.
  sprintStamina`, Shift-Taste bzw. mobiler "Sprint"-Button, nur während der
  Brücken-Phase aktiv/sichtbar), Polizei-Fußstreife verfolgt mit Seek-KI.
- **Limousine**: reine Cutscene (`limoStep()`), Spieler hat keine Kontrolle,
  Kamera fährt seitlich mit, Handy-Toast von Elaine erscheint automatisch.

Alle vier Modi nutzen dasselbe Panzer-Lenkung-Eingabemodell (Steuerknüppel/
WASD: Lenken + Gas in einem) wie `gta/`, aus `computeInput()` — dieselbe
Konvention wie beim Vice-Grid-Original, nur auf vier statt zwei Fortbewegungs-
arten angewendet.

## Verfolgung — bewusst kein Game Over
Polizeiautos (Küstenstraße), -boote (Kanal) und Fußstreife (Brücke) verfolgen
per einfacher Seek-KI mit gedeckelter Geschwindigkeit. Wird der Spieler
erwischt (`maybeCatch()`), gibt es **keinen Restart**, sondern einen kurzen
"Knapp entkommen!"-Rückschlag (`closeCall()`: Spieler wird ein Stück
zurückgeschoben, +4 Minuten auf der Spieluhr, kurzer roter Screen-Flash,
3s Immunität danach) — passend zum thematischen Schluss der Geschichte ("es
geht nicht um perfekt, sondern um echt"), und vermeidet frustrierende
Sackgassen in einem storygetriebenen Ein-Level-Spiel ohne Speicherstände.

## Kamera
Zwei Modi wie in `gta/` (Taste `C` bzw. Einstellungs-Menü): `top`
(Standard-Draufsicht) und `chase` (Third-Person). Die Draufsicht ist beim
Laufen spürbar flacher/näher als beim Fahren (`updateCamera()`,
`onFoot`-Zweig) — bei identischer Fahrzeug-Kamera-Distanz wäre die
Spielfigur (viel kleiner als Auto/Boot) kaum zu erkennen, und ein zu
steiler (nahezu senkrechter) Blickwinkel lässt den breiten Sichtkegel
zusätzlich weit hinter die Kamera reichen — dort verfolgende Cops wurden im
Riesenformat direkt am unteren Bildrand sichtbar statt normal in der Ferne.
Während der Limousinen-Cutscene übernimmt eine eigene seitliche
Tracking-Kamera; während Dialogen ein näherer Zweier-Blick auf Spieler-
Position (analog zur Dialog-Kamera in `gta/`).

## Atmosphäre
Himmel/Fog/Sonnenlicht faden progressiv von hellem Tageslicht (Villa/Hafen/
Kanal) zu warmem Sonnenuntergang (`updateAtmosphere()`, linear über
Golden-Gate-Fußlauf → Limousine → Pier) — kein Tag/Nacht-Umschalter wie in
`gta/`, sondern ein kontinuierlicher Verlauf passend zum "Golden Hour"-Finale
am Pier.

## Steuerung
Pfeiltasten/WASD fahren/laufen, `Shift` Sprint (nur zu Fuß auf der Brücke),
`F` Dialog weiterklicken, `C` Kamera umschalten. Touch: analoger
360°-Joystick unten links (identisches Pattern wie `gta/`), "Sprint"-Button
unten rechts (nur während der Brücken-Phase sichtbar/aktiv), "F"-Button für
Dialoge.

## Tech-Stack
Three.js (lokal vendored, ES-Modul, kein CDN), Vanilla JS, kein Build-Schritt.
