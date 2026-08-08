# Vice Grid — 3D-Top-Down-Fahrspiel im GTA-Stil

## Live-URL
https://hofmiker.github.io/Claude_Test/gta/

## Dateien
- `index.html` — Shell/UI
- `main.js` — Fahrphysik, Kamera, Rendering, Input, HUD
- `mission.js` — Missions-/Dialogsystem. Figuren: Marco (Spieler), Vincent
  (Auftraggeber, nur per Anruf), Sofia (Werkstatt-Kontakt) und Jack (Kurier)
  — bewusst europäisch/US-klingende Namen statt der ursprünglichen
  Marek/Dragan/Lena/Vess.
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
  `dialog-active` (in `index.html`), die `#hud` und `#mobileControls`
  komplett unsichtbar hält (Opacity 0, keine Pointer-Events). Sobald die
  Titelkarte weg ist, startet `dismissSplash()` die Mission sofort
  (`startMission()`, keine künstliche Verzögerung) — der Dialog blendet
  also im selben Moment ein, in dem die Titel-Typo ausblendet.
- **Jeder Dialog pausiert das Spiel:** nicht mehr nur ein Intro-Einmal-
  Effekt — `startDialog()` setzt `dialog-active` bei JEDEM Dialog im
  Spielverlauf (nicht nur dem ersten), `advanceDialogLine()` entfernt es
  wieder, wenn die letzte Zeile bestätigt wurde. `animate()` überspringt
  währenddessen die komplette Simulation (Spieler-/Autobewegung, Verkehr,
  Polizei, Kollisionen, HUD-Zahlen) — Tasten/Joystick haben während eines
  Dialogs also keinerlei Effekt, nur `renderer.render()` und die Kamera
  laufen weiter, damit der Übergang nicht wie ein eingefrorenes Bild wirkt.
  `updateCamera()` erzwingt währenddessen unabhängig vom eingestellten
  `cameraMode` eine nähere Third-Person-Einstellung (0.72× der normalen
  Third-Person-Distanz) fürs Gespräch; da nur die tatsächlich gerenderte
  Kameraposition verändert wird (nicht die `cameraMode`-Variable selbst),
  schwenkt die Kamera nach Dialogende von selbst zurück zur zuvor aktiven
  Einstellung — standardmäßig Draufsicht (`cameraMode` fällt ohne
  gespeicherte Präferenz in `localStorage` immer auf `'top'` zurück).
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
- **Responsive obere HUD-Reihe:** Ziel-Text/-Distanz, Tacho, Geld,
  Fahndungs-Banner und die Minimap-Größe selbst nutzen `clamp()` statt
  fixer `px`-Werte (z. B. `#objectiveText`: `clamp(14px, 4.4vw, 19px)`,
  Minimap-Durchmesser über `--minimap-size: clamp(96px, 26vw, 130px)` als
  CSS-Custom-Property in `:root`). Auf schmalen Phones (320–390px) skaliert
  die ganze obere Reihe spürbar enger, auf Tablets/Desktop bleibt sie exakt
  bei den bisherigen (Max-)Werten — kein Wert unterschreitet die
  `clamp()`-Untergrenze, also bleibt alles lesbar statt nur proportional
  gegen den schmaleren Screen zu schrumpfen. `#speedWrap`s `right`-Position
  ist an `--minimap-size` gekoppelt (`calc(var(--minimap-size) + 26px)`),
  damit Tacho und Minimap bei jeder Bildschirmbreite densselben Abstand
  behalten, statt sich zu überlappen oder auseinanderzudriften.
- **Notifications:** Fahndungs-Banner hat jetzt einen Hintergrund-Chip statt
  nur Text mit Schatten (deutlich lesbarer über der Szene); die Sub-Toast-
  Meldung (`#subMsg`, z. B. "Eingestiegen") ist größer, hat eine eigene
  Kapsel-Optik und einen expliziten "OK"-Button zum sofortigen Wegklicken,
  statt nur auf das automatische Timeout (2.6s) zu warten.
- **Dialog als Chat-Thread:** `#dialogBox` (unabhängig von `#hud`, siehe
  oben) ist ein echter Nachrichtenverlauf statt einer einzelnen Box, die
  ihren Text überschreibt — jede Zeile ist eine eigene `.dchat-row` mit
  Sprechblase, per JS erzeugt (`pushDialogRow()` in `main.js`), neueste
  unten. Marco (Spieler) sitzt rechts in Pink; jede andere benannte Figur
  hat ihre eigene feste Farbe (`SPEAKER_STYLE`-Map: Vincent Blau, Sofia
  Lila, Jack Orange, unbekannte Sprecher Grau als Fallback) und sitzt
  links; namenlose Regie-/Erzählzeilen (`speaker: ""`) sind zentriert und
  ohne Blasenhintergrund. Bubble-Hintergründe sind bewusst nahezu deckend
  (0.95 Alpha, nach mehreren Runden "immer noch zu transparent"-Feedback
  deutlich höher als die ursprünglichen 0.10–0.34, dann 0.75–0.85) — jede
  Blase ist ein dunkel getönter, farbiger Kartenhintergrund statt eines
  durchsichtigen Farbstichs, damit der Text auch über einer belebten
  3D-Szene klar lesbar bleibt. Nur die letzten
  `DIALOG_HISTORY_MAX` (3) Zeilen bleiben sichtbar; die zwei davor
  sichtbaren dimmen sanft (0.78 / 0.58 Opacity, bewusst hoch gehalten,
  damit die Historie lesbar bleibt statt auszubleichen). `#dialogBox` ist
  bewusst per `bottom` statt `top` positioniert und jede `.dchat-row`
  animiert ihre Höhe von `grid-template-rows: 0fr` auf `1fr` beim
  Einblenden (der Standard-Trick, um auf Inhaltshöhe zu animieren) — dank
  des Bottom-Ankers schiebt das Wachsen der neuen Zeile alle darüber
  liegenden sichtbar nach oben, statt die Box nur nach unten wachsen zu
  lassen. Eine Zeile, die über das Limit hinaus verdrängt wird, bekommt
  beim Entfernen dieselbe Transition rückwärts (`grid-template-rows`
  zurück auf `0`, Opacity auf 0) statt sofort aus dem DOM zu verschwinden —
  sonst gab es ein sichtbares "springt runter, animiert dann wieder hoch"
  beim Erreichen der Zeilen-Obergrenze. Die Box bleibt mit
  `calc(100vw - 64px)` und `max-width:78%` je Blase bewusst vom
  Bildschirmrand entfernt. Der "Weiter"-Text-Button ist einem kleinen
  runden Pfeil-Button (`#dialogNextBtn`, reine CSS-Form) gewichen, der als
  eigene Zeile immer unter der neuesten Nachricht sitzt.
- **Tippen zum Weiterblättern:** die ganze Box, nicht nur der 32px-Pfeil,
  ist der Tap-Ziel-Bereich (`#dialogBox` hatte `pointer-events: none` mit
  nur `#dialogNextRow.show` als Ausnahme — ein Tippen auf eine Sprechblase
  fiel also wortlos durch zur Canvas darunter und tat nichts). Ein einzelner
  `pointerdown`-Listener auf `dialogBox` selbst ruft jetzt `advanceDialogLine()`
  auf, der alte separate Klick-Listener auf `#dialogNextBtn` wurde entfernt
  (sonst hätte ein Tap auf den Pfeil doppelt ausgelöst — einmal per eigenem
  Klick, einmal durchs Hochblubbern zur Box). Der Pfeil bleibt als optischer
  Hinweis stehen, ist aber nicht mehr der einzige funktionierende Bereich —
  wiederholtes Daneben-Tippen las sich vorher wie "der Pfeil geht nur ganz
  am Ende" bzw. "der Chat läuft von allein durch", war aber ein zu kleines
  Tap-Ziel plus tote Fläche drumherum.
- **Spielfigur-Farbe:** trägt ein einheitliches Outfit (Hemd/Hose/Schuhe
  alle in Pink, `PLAYER_PALETTE` in `main.js`) statt drei verschiedener
  Farbtöne — dadurch sofort von Passanten (`createPedMesh`, zufällige
  Hemdfarbe) und benannten Missions-NPCs (`NPC_BY_STEP`) unterscheidbar.
  Jeder benannte NPC trägt jetzt die Akzentfarbe seines eigenen
  `SPEAKER_STYLE`-Bordertons als Hemdfarbe (Sofia Lila `0xa05ae6`, Jack
  Orange `0xffaa28`) — dieselbe Person hat dadurch überall (Chat-Blase,
  Minimap-Tint, Charaktermodell) dieselbe Farbe statt einer beliebigen
  eigenen Palette. Weiblich markierte Charaktere (`palette.female: true`,
  aktuell Sofia) bekommen in `createPlayerMesh()` zwei zusätzliche
  Silhouetten-Merkmale statt nur einer Farbänderung — ein langer Pferdeschwanz
  (schmaler Kegel, der vom Hinterkopf den Rücken runterhängt) und einen
  ausgestellten Rock anstelle der geraden Hüft-/Hosen-Form (gleicher
  Taillen-Ansatzpunkt wie beim männlichen Zylinder, aber breiter werdend
  nach unten statt gerade) — beide zusammen lesen sich auf dieser
  Low-Poly-Auflösung eindeutig als weiblich, eine reine Farb- oder
  Proportionsänderung allein wäre zu subtil gewesen.
- **Minimap:** Spieler-Pfeil ist größer, Pink statt Rot und mit weißem
  Outline und wird **nach** `mmCtx.restore()` in Schirm-Koordinaten
  gezeichnet (`cx,cy`) statt davor in den lokalen Karten-Koordinaten — die
  Karte selbst rotiert schon per `mmCtx.rotate(heading - Math.PI)`
  ("heading-up") — stand der Pfeil INNERHALB dieses rotierten Blocks,
  drehte er sich MIT der Karte statt fix nach oben zu zeigen (drehte sich
  beim Lenken sichtbar mit statt in Fahrtrichtung zu bleiben). Streifen-
  polizei (`policeCars`) und Fahndungs-Autos (`chaseCops`) sind jetzt
  deutlich größer (5.5 / 6.4 statt 3.6 / 4.2 Radius) und mit weißem Outline
  wie der Spieler-Pfeil, statt als kleine, kaum sichtbare Punkte;
  `chaseCops` blinken weiterhin durchgehend Rot/Blau im Takt
  (`Math.sin(elapsed*10)`) wie ein echtes Blaulicht. Das eigene, geparkte
  Auto (`playerCar`, wenn `!occupied`) bekommt jetzt ebenfalls einen
  Pink-Marker — vorher komplett unsichtbar auf der Karte, da es (anders als
  Fahrzeuge, die man kommandiert und wieder verlässt) nie in `trafficCars`
  landet. Das aktuelle Missionsziel sendet zusätzlich zwei auseinanderlaufende,
  ausblassende Ring-Pulse aus (`hexToRgba()` + zwei phasenversetzte
  `Math.arc`-Kreise in `drawMinimap()`) statt nur der vorherigen leichten
  Grow/Shrink-Pulsierung des vollen Punkts — liest sich deutlich mehr als
  "hier ist etwas" (Radar-Ping-Optik) als eine reine Größenänderung. Der
  Zielpunkt selbst wird schon seit der vorigen Runde an den Kartenrand
  geklemmt statt zu verschwinden, wenn er außerhalb der sichtbaren
  90-Einheiten-Reichweite liegt (`edge = w/2 - 16`, Punkt gleitet am Rand
  entlang in Zielrichtung) — das deckt die "Richtungsanzeige, wenn der Punkt
  von der Karte verschwindet"-Anforderung bereits ab, ohne zusätzlichen Code.
- **Vollbild:** `⛶ Vollbild`-Button im Einstellungs-Menü (Zahnrad) schaltet
  per Fullscreen API auf `document.documentElement` um (Pattern aus
  `starship-launch` übernommen), inkl. `webkit`-präfixtem Fallback und
  Toast-Meldung (`showSub()`) statt stillem Nichtstun, falls beide Versuche
  scheitern. iOS Safari bietet die Fullscreen-API für normale Elemente aber
  in vielen Versionen gar nicht erst an (kein Bug, echte Plattform-Lücke) —
  in dem Fall wird der Button NICHT einfach versteckt, sondern zu einem
  Hinweis auf den tatsächlich funktionierenden iOS-Weg umfunktioniert:
  "Zum Home-Bildschirm hinzufügen" (`apple-mobile-web-app-capable` +
  `apple-mobile-web-app-status-bar-style` Meta-Tags, `viewport-fit=cover`
  für die Notch) startet als eigenständige App komplett ohne Safari-Chrome.
  Läuft die Seite bereits als solche Home-Bildschirm-App (`display-mode:
  standalone` bzw. `navigator.standalone`), verschwindet der Button ganz,
  da dann schon echtes Vollbild aktiv ist.
- **Build-Stempel:** Einstellungs-Menü zeigt unten `Build {{DEPLOY_DATE}} ·
  {{DEPLOY_SHA}}` — beide Platzhalter werden vom selben Deploy-Workflow
  (`.github/workflows/deploy.yml`) befüllt, der schon `{{DEPLOY_DATE}}` /
  `{{UPDATED:...}}` / `{{COMMITS:...}}` in der Root-`index.html` ersetzt
  (dort um eine generische Schleife über `*/index.html` erweitert, die bei
  jedem Projekt, das diese Platzhalter benutzt, automatisch mitläuft — kein
  Hardcodieren eines Datums im Quelltext nötig). Gedacht, um bei einem
  gemeldeten "sieht noch alt aus" sofort zu sehen, ob im Browser wirklich
  der neueste Deploy geladen ist oder nur ein gecachter/alter Tab-Stand.

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
