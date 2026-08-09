# Vice Grid — 3D-Top-Down-Fahrspiel im GTA-Stil

## Live-URL
https://hofmiker.github.io/Claude_Test/gta/

## Dateien
- `index.html` — Shell/UI
- `main.js` — Fahrphysik, Kamera, Rendering, Input, HUD
- `mission.js` — Missions-/Dialogsystem, jetzt mit zwei Leveln (siehe
  "Level-System" unten). Level 1 "Der Kessel": Marco (Spieler), Vincent
  (Auftraggeber, nur per Anruf), Sofia (Werkstatt-Kontakt) und Jack (Kurier)
  — bewusst europäisch/US-klingende Namen statt der ursprünglichen
  Marek/Dragan/Lena/Vess. Level 2 "Coastal Courier": Marcus (Spieler),
  Dante (Auftraggeber), Viktor (Villa-Kontakt), Mechaniker (Hafen) und
  Elaine (finaler Dialog an der Pier).
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
  26px), Minimap rückt dadurch enger an die obere rechte Ecke (`top: 40px`
  statt `44px`) — der Abstand wurde nötig, weil beide sich bei den
  ursprünglichen Werten auf schmalen Screens berührten.
- **Minimap passt sich der Bildschirm-HÖHE an, nicht nur der Breite:**
  `--minimap-size`s `clamp()` skaliert nur über `vw` — auf einem
  Landschafts-Handy (breit, aber kurz, und durch die Browser-eigene
  Adressleiste/Tableiste zusätzlich in der Höhe beschnitten) blieb die
  Minimap dadurch bei voller, breiten-getriebener Größe und rutschte in die
  unten rechts fixierten Sprung-/Aktion-Buttons hinein (per Screenshot vom
  Nutzer bestätigt: iPhone Querformat). `fitMinimapToViewport()` in
  `main.js` (aufgerufen in `onResize()`, also bei jedem Resize/
  Orientierungswechsel) misst den tatsächlichen `getBoundingClientRect().top`
  von `#btnJump` und setzt `--minimap-size` per Inline-Style so, dass die
  Minimap garantiert vor dem Button endet — keine geratene
  Landscape-Breakpoint-Zahl, sondern derselbe "tatsächlich gerenderte
  Position nachmessen"-Ansatz wie beim `wantedBanner` unten. Auf
  Nicht-Touch-Geräten (`#btnJump` hat dort `display:none`) wird der
  Inline-Override wieder entfernt, damit der normale `clamp()` ungehindert
  greift.
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
- **Auto-Ausstieg für Gespräche von Angesicht zu Angesicht:** trifft
  `startDialog()` auf einen Dialog mit echtem NPC-Gegenüber
  (`missionState.npcMesh` gesetzt, z. B. `talk_sofia`/`grab_scene`) während
  der Spieler noch im Auto sitzt, steigt die Figur zuerst aus (ruft intern
  `tryToggleVehicle()`, exakt dieselbe Tür-Position wie der manuelle
  Ausstieg) und dreht sich zur NPC-Position (`Math.atan2(dx, dz)`, dieselbe
  Heading-Konvention wie überall sonst im Code). Vorher blieb die Figur im
  Auto sitzen, obwohl direkt daneben ein Gesprächspartner stand. Das
  verlassene Auto wird in `missionState.dialogExitedCar` gemerkt und in
  `advanceDialogLine()` beim Gesprächsende automatisch wieder bestiegen
  (nur falls es niemand in der Zwischenzeit belegt hat) — Telefonate ohne
  sichtbares Gegenüber (`call_dragan`, `deliver_twist`) lösen das nicht aus,
  da dort kein `npcMesh` existiert. Die Kamera bekommt für genau diesen Fall
  einen eigenen, ganz am Anfang von `updateCamera()` geprüften Zweig: statt
  der sonstigen Blickrichtungs-Verfolgung schwenkt sie seitlich auf den
  Mittelpunkt zwischen Spieler und NPC (senkrecht zur Verbindungslinie
  beider, `sideX/sideZ` als 90°-gedrehter Richtungsvektor) und hält beide
  Figuren zusammen im Bild — ein klassisches Zweier-Bild statt der
  Ich-Perspektive-artigen Verfolgungskamera. Höhe/Abstand orientieren sich
  bewusst an der bereits vorhandenen Fuß-Gesprächskamera
  (`CAM3_HEIGHT_FOOT * 0.72`) statt an einem neuen, niedrigeren Wert – bei
  einem direkt daneben geparkten Auto reichte eine flachere Kamera nicht,
  um darüber hinwegzusehen. Sobald `missionState.inDialog` wieder `false`
  wird, greift dieser Zweig nicht mehr und der bestehende Lerp bringt die
  Kamera von selbst zurück zur zuvor aktiven Einstellung (Top-Down per
  Default) — exakt dasselbe Übergangsmuster wie bei der bereits
  bestehenden Telefonat-Nahkamera.
- **Level-Auswahl:** unter dem Titel-Untertitel sitzt eine `.ts-levels`-Reihe
  mit drei Chips: "1 · Der Kessel" und "2 · Coastal Courier" sind spielbar
  (`data-level`-Attribut = Schlüssel in `mission.js`s `LEVEL_DATA`), "3 · ???"
  bleibt sichtbar gesperrt (gestrichelter Rahmen, gedämpfte Farbe) als
  Platzhalter für ein zukünftiges drittes Level. Tippen auf den gesperrten
  Chip ruft `e.stopPropagation()` auf, damit es sich wirklich wie "gesperrt,
  passiert nichts" anfühlt statt die Intro zu überspringen. Der aktuell
  aktive Chip bekommt zusätzlich `.current` (hellerer Rand/Glow). Klick auf
  den JEWEILS AKTIVEN Chip startet wie gehabt sofort die Mission; Klick auf
  den ANDEREN spielbaren Chip schreibt dessen `data-level` nach
  `localStorage['viceGridLevel']` und lädt die Seite neu — siehe
  "Level-System" unten für den Grund, warum ein Neuladen nötig ist.

## Level-System
Zwei komplette Level mit derselben ENGINE (Fahr-/Lauf-/Kollisions-/
Traffic-/Dialog-/Fahndungs-Code, 1:1 identisch), aber zwei komplett
eigenständigen, von Grund auf verschiedenen Welten: "Der Kessel" (Marco,
dichte Noir-Nacht-Rasterstadt) und "The Coastal Courier" (Marcus, helle
Küstenstadt mit Strand, Palmen, Sonnenschirmen, Strandpromenade, Cafés und
der Golden Gate Bridge am Horizont). Das brauchte zwei Anläufe:
1. Erste Fassung: Level 2 einfach in Level 1s fertige Rasterstadt gesetzt,
   nur 3 Landmarks ausgetauscht — fühlte sich wie dieselbe Stadt mit ein
   paar neuen Häusern an.
2. Zweite Fassung: dieselbe Grid-Engine, aber mit anderer Farbpalette/
   Gebäudehöhe/Park-Dichte befüllt (`CITY_STYLE`) — spürbar anderes Bild,
   aber laut Feedback immer noch zu sehr "dasselbe Grid, andere Farben"
   statt einer wirklich eigenen, von Hand entworfenen Stadt.
3. Diese Fassung: Level 2 nutzt das Grid (`buildBlock()`/`GRID_COUNT`-Loop)
   überhaupt nicht mehr. `buildCoastalTown()` in `main.js` platziert jedes
   Gebäude, jeden Baum, jeden Sonnenschirm an einer fest gewählten
   Koordinate (kein `Math.random()` für Layout-Entscheidungen) — eine
   handentworfene, jedes Mal identische Stadt statt eines parametrisierten
   Zufallsgitters. Nur die darunterliegende Physik/Kollision/KI ist
   identisch mit Level 1.
- **`LEVEL_ID` (`mission.js`):** `buildCity()` in `main.js` verzweigt ganz
  am Anfang komplett: `der_kessel` baut wie bisher das Raster
  (`buildBlock()`-Schleife + `buildLandmarks()`); jedes andere Level ruft
  stattdessen `buildCoastalTown()` auf. Die beiden Welten existieren nie
  gleichzeitig — es gibt nur eine Stadt pro Seitenaufruf, je nachdem, was
  `localStorage.getItem('viceGridLevel')` beim Modul-Laden sagt (Default
  `der_kessel`). Ein Level-Wechsel braucht deshalb ein `location.reload()`.
- **`buildCoastalTown()` — die Küstenstadt von Grund auf:**
  - **Straßen:** `COASTAL_ROADS = { x: [-120,-20,80], z: [-130,-90,-10,70] }`
    — drei Nord-Süd- und vier Ost-West-Straßen an von Hand gewählten
    Koordinaten statt eines gleichmäßigen `GRID_COUNT`×`GRID_COUNT`-Rasters.
    `buildCoastalGround()` zeichnet dieselben Fahrbahnstreifen wie
    `buildGround()`, nur an diesen Koordinaten statt an einer Schleife über
    `-CITY_HALF + CELL*k`. Traffic-KI/Ampel-Logik bleiben unverändert (sie
    lesen nur `roadLines.x`/`.z`, ihnen ist egal, ob die Koordinaten aus
    einer Schleife oder einer Handliste stammen).
  - **Strand/Ozean:** `buildOceanAndBeach()` legt drei Flächen übereinander
    (Süden nach Norden): offener Ozean (`OCEAN_NEAR_Z`–`OCEAN_FAR_Z`, als
    `waterColliders` undurchdringlich wie eine Wand — siehe unten), Sand
    (Strand, begehbar, in `sidewalkCells` für Fußgänger-/NPC-Wanderziele),
    Strandpromenade (helles Pflaster, ebenfalls begehbar). Die Promenade
    endet bei `x=-60`, deckt also nicht den industriellen Hafen-Abschnitt
    weiter westlich ab.
  - **Der Steg/die finale Pier:** `buildBeachPier()` — eine ~58 Einheiten
    lange Holzbohlen-Konstruktion (Geländer + Pfosten alle paar Meter,
    gleiche Bauweise wie Level 1s Kanal-Steg), die von der Promenade
    hinaus in den offenen Ozean führt. Sie zerteilt den sonst
    durchgehenden `waterColliders`-Streifen in zwei Hälften links/rechts
    der Bohlen — exakt dasselbe "Deck hat keinen Collider, Wasser daneben
    schon"-Prinzip wie beim Level-1-Kanal, nur über eine viel größere
    Distanz. Elaine (`NPC_BY_STEP.L2_PIER`) steht nahe dem äußeren Ende.
  - **Palmen/Sonnenschirme:** `addPalm()` (neue, eigene Funktion — schräger
    schlanker Stamm + 6 kegelförmige Wedel im Kreis, andere Silhouette als
    der normale Park-Baum `addTree()`) und `addBeachUmbrella()` (Mast +
    Kegel-Dach) sitzen an acht bzw. sechs fest gewählten Sandkoordinaten.
  - **Cafés:** `buildCafe()` — kleines Gebäude mit rotem Dach, davor zwei
    Tische mit hellen Sonnenschirmen (`addBeachUmbrella()` wiederverwendet,
    andere Farbe/Größe), zwei Stück an der Promenade.
  - **Golden Gate Bridge:** `buildGoldenGateBridge()` — zwei "International
    Orange" Pylonen mit Querbalken, schräge Kabel-Silhouette (dünne
    gedrehte Boxen), eine Fahrbahnbox dazwischen. Sitzt bei `z=168`, klar
    jenseits des durchgehenden Ozean-Colliders (`OCEAN_FAR_Z=175`) — vom
    Spieler nie physisch erreichbar, rein als Horizont-Landmark gedacht,
    bekommt deshalb auch keinen eigenen Collider.
    `DISTRICT_COASTAL.fogFar` wurde dafür von 170 auf 220 angehoben, sonst
    wäre die Brücke fast komplett im Nebel verschwunden.
  - **Villa/Hafen/Garage:** dieselben `buildVilla()`/`buildHarbor()`/
    `buildParkingGarage()`-Funktionen wie zuvor (unverändert), jetzt aber
    an eigenen, handgewählten `COASTAL_POS`-Koordinaten statt an
    Grid-Zellen aus `blockCenter()` — Level 2 hat dadurch seine eigene,
    von Level 1 komplett unabhängige Parkgarage statt sich (wie in der
    Vorversion) eine Koordinate mit Level 1 zu teilen.
- **`PLAYER_NAME`:** `pushDialogRow()`s "ist das der Spieler?"-Check
  (rechts, Pink, `isMe`) prüfte früher hart gegen `'Marco'` — mit zwei
  Leveln und unterschiedlichen Spielernamen (Marco/Marcus) ist das jetzt
  `line.speaker === PLAYER_NAME`, importiert aus `mission.js`.
- **`SPEAKER_STYLE`/`NPC_BY_STEP`:** beide Level teilen sich je EIN
  gemeinsames Objekt in `main.js` — da beide Level komplett unterschiedliche
  Sprecher-Namen bzw. Schritt-IDs verwenden (`L2_VILLA` statt
  `FIND_CONTACT` usw.), gibt es keine Namenskollisionen.
- **Schrittfolge identisch zu Level 1:** Anruf (`L2_INTRO`) → Ziel anfahren
  + reden (`L2_VILLA`, Viktor übergibt das Paket) → Ziel anfahren + reden,
  löst Fahndung aus (`L2_HARBOR`, Mechaniker warnt vor der Polizei,
  `onComplete: "startPolice"`) → Fluchtpunkt erreichen (`L2_ESCAPE`, eigene
  Parkgarage) → finaler Dialog + Sieg (`L2_PIER`, Elaine an der
  Sausalito-Pier). Das ursprüngliche Boot/Brücken-Lauf/Limousinen-Konzept
  aus dem Story-Prompt wurde bewusst auf diese Schrittform verdichtet statt
  neue Interaktionsarten (Wasserfahrzeug, Ausdauersystem, Cutscene-Kamera)
  zu bauen — "Interaktion unverändert" gilt weiterhin uneingeschränkt,
  auch wenn die WELT jetzt komplett eigenständig ist.
- **Tageslicht statt Nacht:** `DISTRICT_COASTAL.timeOfDay: "day"` nutzt
  main.js' bereits vorhandene Tag/Nacht-Verzweigung (`isNight`-Fälle bei
  Hemisphere-Light-Farben, `addStreetLamps()` überspringt sich selbst bei
  Tag) — keine neue Grafik-Funktionalität, nur ein schon unterstützter
  Konfigurationswert.
- **`CITY_STYLE`:** bleibt für Level 1 unverändert in Kraft
  (`buildBlock()`s Höhen-/Park-/Palettenwerte). Level 2 nutzt daraus nur
  noch `colors.ground`/`.road`/`.roadLine` für `buildCoastalGround()`s
  Basis-Ebene und Fahrbahnstreifen — `buildingPalette`/`heightMin`/
  `parkChance` etc. sind für den coastal Pfad ungenutzt, da er gar keine
  `buildBlock()`-Zufallsgebäude mehr hat.

## Wahrzeichen (Missions-Locations, Level 1 "Der Kessel")
Wegpunkte in `mission.js` waren ursprünglich reine `[x,z]`-Platzhalter, die
irgendwo auf einem zufällig generierten Standardgebäude landeten — "Sofias
Werkstatt" sah aus wie jedes andere Gebäude, der "Kanal" existierte
überhaupt nicht. Drei Rasterzellen sind jetzt fest für handgebaute
Wahrzeichen reserviert (`LANDMARK_CELLS` in `main.js`, per `i,j`-Schlüssel
aus `buildBlock()` ausgenommen) und werden nach dem normalen Grid-Aufbau
von `buildLandmarks()` bebaut; `mission.js`s Wegpunkt-Koordinaten zeigen
jetzt exakt auf `LANDMARK_POS.<name>` (siehe Kommentar dort) statt auf
geschätzte Platzhalterzahlen. Level 2s eigene Landmarks (Villa/Hafen/Pier)
werden separat unter "Level-System" oben beschrieben, in
`buildCoastalTown()` statt in diesem Grid-Aufbau.
- **Sofias Werkstatt** (`buildWorkshop`, Zelle `2,4`): niedrige Industrie-
  halle mit dunklem Rolltor (samt ein paar Lamellen-Streifen), leuchtendem
  Schild darüber und einem geparkten Projekt-Auto davor (einfache Box-Form
  statt der vollen `createCarMesh()`-Fabrik — die hängt von `VEHICLE_SPECS`
  ab, einer `const`, die erst nach `buildCity()`s Aufruf im Datei-Fluss
  initialisiert wird, hätte also einen Temporal-Dead-Zone-Fehler ausgelöst).
- **Wohnblock am Kanal + Steg** (`buildWaterfront`, Zelle `5,6`): ein hohes
  Wohnhaus mit horizontalen Fensterband-Streifen (gleicher Trick wie die
  Bus-Fensterfront in `createCarMesh`), dahinter ein echter Kanal (eigenes
  `waterMat` mit niedrigerer Rauheit als die übrige Palette, damit es nass
  wirkt) und ein hölzerner Steg, der über das Wasser hinausragt (Geländer +
  Pfosten). Der Koffer (`GRAB_ITEM`-Pickup) liegt am äußeren Stegende.
  Kollision: `waterColliders` (eigenes Array, gleiche Push-out-Logik wie
  `buildingColliders`, aber separat gehalten, damit die Minimap sie blau
  statt grau einfärben kann) deckt das offene Wasser links und rechts des
  Stegs sowie den Streifen jenseits des Stegendes ab — nur der Steg selbst
  hat keinen Collider und ist so der einzige Weg hinaus aufs Wasser. Der
  Spieler-/Kollisions-Weltrand (`WORLD_BOUND` in `main.js`, ersetzt die
  alten verstreuten `CITY_HALF + ROAD_WIDTH * 1.2/1.5`-Werte in
  `collideWithBuildings()`/`resolveWorldPoint()`) musste dafür angehoben
  werden, exakt auf die Kante von `buildGround()`s Bodenebene — sonst hätte
  die alte, engere Grenze den Spieler schon vor dem Kanal aufgehalten.
- **Parkgarage** (`buildParkingGarage`, Zelle `1,1`): drei offene Ebenen
  (dünne Boden-/Deckenplatten übereinander) mit Eckpfeilern statt
  durchgehender Wände, damit sie sich von einem normalen Bürogebäude
  abhebt, plus ein leuchtendes "P"-Schild (zwei Boxen als Stamm + Kopf,
  keine echte Buchstaben-Geometrie) an der Straßenseite. Kollision bleibt
  ein einzelner Bounding-Box-Collider über den ganzen Grundriss, wie bei
  normalen Gebäuden — die offenen Ebenen sind rein optisch.
- **Minimap:** `waterColliders` werden nach den grauen `buildingColliders`
  zusätzlich in einem eigenen Blau (`#1f5a78`) gezeichnet, damit Wasser auf
  der Karte erkennbar anders aussieht als Gebäude.

Level 2s Villa/Hafen/Garage/Pier stehen dagegen NICHT im Grid — siehe
"Level-System" → `buildCoastalTown()` oben für ihre eigene, handplatzierte
Welt (`COASTAL_POS`-Koordinaten statt `blockCenter()`-Zellen).

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
