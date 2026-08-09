# Vice Grid — 3D-Top-Down-Fahrspiel im GTA-Stil

## Live-URL
https://hofmiker.github.io/Claude_Test/gta/

## Dateien
- `index.html` — Shell/UI
- `main.js` — Fahrphysik, Kamera, Rendering, Input, HUD
- `mission.js` — Missions-/Dialogsystem, jetzt mit drei Leveln (siehe
  "Level-System" unten). Level 1 "Der Kessel": Marco (Spieler), Vincent
  (Auftraggeber, nur per Anruf), Sofia (Werkstatt-Kontakt) und Jack (Kurier)
  — bewusst europäisch/US-klingende Namen statt der ursprünglichen
  Marek/Dragan/Lena/Vess. Level 2 "Coastal Courier": Marcus (Spieler),
  Dante (Auftraggeber), Viktor (Villa-Kontakt), Mechaniker (Hafen) und
  Elaine (finaler Dialog an der Pier). Level 3 "Golden Gate Run": dieselben
  fünf Figuren/Namen wie Level 2 (bewusste Nutzerentscheidung, siehe
  "Level 3" unten) in der "Director's Cut"-Fassung derselben Geschichte —
  jetzt mit Boot, Fußlauf über die Brücke und einer automatisch fahrenden
  Limo statt der auf Level 2 zusammengestrichenen Fassung.
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
  mit drei Chips, alle drei spielbar (`data-level`-Attribut = Schlüssel in
  `mission.js`s `LEVEL_DATA`: `der_kessel`/`coastal_courier`/
  `golden_gate_run`) — die frühere `.locked`-Sperre für Chip 3 ("3 · ???",
  gestrichelter Platzhalter-Rahmen) ist mit Level 3s Fertigstellung entfernt
  worden; main.js' `.ts-level.locked`-Handling (stumpfes `e.stopPropagation()`)
  bleibt im Code für ein mögliches zukünftiges viertes Level erhalten. Der
  aktuell aktive Chip bekommt zusätzlich `.current` (hellerer Rand/Glow).
  Klick auf den JEWEILS AKTIVEN Chip startet wie gehabt sofort die Mission;
  Klick auf einen ANDEREN spielbaren Chip schreibt dessen `data-level` nach
  `localStorage['viceGridLevel']` und lädt die Seite neu — siehe
  "Level-System" unten für den Grund, warum ein Neuladen nötig ist.

## Level-System
Zwei komplette Level mit derselben ENGINE, aber bewusst unterschiedlicher
Stadt und Atmosphäre: "Der Kessel" (Marco, dichte Noir-Nacht-Downtown) und
"The Coastal Courier" (Marcus, helle, aufgelockerte Sonnentag-Villenstadt,
Malibu → Sausalito). Nutzerauftrag dazu, in zwei Schritten: zuerst *"Grafik
und Interaktion sollen unverändert sein, nur das Level und Story neu
einweben"*, dann die Korrektur *"Das soll eine ganz andere Stadt und
Atmosphäre sein [...] nicht etwas aus Level 1 nachbauen"* — die erste
Fassung hatte Level 2 einfach in Level 1s fertige Rasterstadt gesetzt und
nur 3 Landmarks ausgetauscht, was sich wie dieselbe Stadt mit ein paar
neuen Häusern anfühlte. Die Auflösung: dieselbe Grid-/Kollisions-/Traffic-
Engine (`buildBlock()`/`buildGround()` unverändert in ihrer Struktur), aber
mit `CITY_STYLE` (siehe unten) komplett anders parametrisiert befüllt —
"Interaktion unverändert" heißt hier "gleicher Code, andere Werte", nicht
"gleiche Stadt wiederverwendet". Level 2 bringt außerdem bewusst KEINE
neuen Fahrzeugtypen (kein Boot/Limousine aus der ursprünglichen Idee),
keine Cutscene-Kameras und kein Ausdauersystem mit, sondern läuft komplett
über die schon vorhandene Fahr-/Lauf-/Dialog-/Fahndungs-Mechanik.
- **Datenmodell (`mission.js`):** zwei vollständige Bundles
  (`DISTRICT_KESSEL`/`MISSION_KESSEL`/`DIALOGS_KESSEL`/`CITY_STYLE_KESSEL`
  und die `_COASTAL`-Pendants) liegen nebeneinander in `LEVEL_DATA`, keyed
  per Level-`id`. Ganz am Ende der Datei wird EINMALIG beim Modul-Laden
  `localStorage.getItem('viceGridLevel')` gelesen und das passende Bundle
  unter den ursprünglichen Namen `DISTRICT`/`MISSION`/`DIALOGS` (plus neu
  `PLAYER_NAME`/`CITY_STYLE`) exportiert — `main.js` importiert weiterhin
  nur diese fünf schlichten Namen und enthält selbst keinerlei Level-
  Auswahl-Logik im Spielcode, nur der Klick-Handler für die Titel-Chips
  (siehe UI oben) schreibt in `localStorage`. Ein Level-Wechsel braucht
  deshalb ein `location.reload()` (Stadt/Mission werden synchron beim
  Modul-Laden gebaut, mitten im laufenden Spiel lässt sich das nicht
  umschalten).
- **`CITY_STYLE`:** `main.js`s `COLORS`/`BUILDING_PALETTE`-Konstanten
  lesen jetzt direkt aus `CITY_STYLE.colors`/`.buildingPalette` statt
  eigene Werte zu hardcoden, und `buildBlock()`s Zufallslogik nutzt
  `CITY_STYLE.parkChance`/`.heightMin`/`.heightMax`/`.tallChance`/
  `.tallMul` statt der alten festen Zahlen (`0.22`, `rand(6,34)`, `0.18`,
  `1.9`). `CITY_STYLE_KESSEL` übernimmt exakt die ursprünglichen Werte
  (keine Änderung für Level 1); `CITY_STYLE_COASTAL` ist bewusst
  gegensätzlich: helle Cremetöne statt bunter Downtown-Palette, niedrige
  Gebäude (4–9 statt 6–34 Einheiten, kaum "Hochhaus"-Ausreißer) statt
  dichter Blockbebauung, doppelt so hohe Park-Wahrscheinlichkeit (0.45
  statt 0.22) für einen aufgelockerten grünen Vorort-Eindruck, plus helle
  sandfarbene Boden-/Straßentöne mit weißen (statt gelben) Fahrbahn-
  markierungen. Die Grid-Größe/Blockmaße/Straßenbreite selbst
  (`GRID_COUNT`/`BLOCK_SIZE`/`ROAD_WIDTH`) bleiben für beide Level gleich,
  da `WORLD_BOUND`, Minimap-Reichweite, Kamera-Tuning und die
  Landmark-Zellkoordinaten alle darauf aufbauen — die Änderung würde weit
  über eine reine Stil-Anpassung hinausgehen.
- **`PLAYER_NAME`:** `pushDialogRow()`s "ist das der Spieler?"-Check
  (rechts, Pink, `isMe`) prüfte früher hart gegen `'Marco'` — mit zwei
  Leveln und unterschiedlichen Spielernamen (Marco/Marcus) ist das jetzt
  `line.speaker === PLAYER_NAME`, importiert aus `mission.js`. Gleiches
  Verhalten, nur parametrisiert statt hartkodiert.
- **`SPEAKER_STYLE`/`NPC_BY_STEP`:** beide Level teilen sich je EIN
  gemeinsames Objekt in `main.js` — da beide Level komplett unterschiedliche
  Sprecher-Namen bzw. Schritt-IDs verwenden (`L2_VILLA` statt
  `FIND_CONTACT` usw.), gibt es keine Namenskollisionen, ein Umschalten pro
  Level war nicht nötig.
- **Schrittfolge identisch zu Level 1:** Anruf (`L2_INTRO`) → Ziel anfahren
  + reden (`L2_VILLA`, Viktor übergibt das Paket) → Ziel anfahren + reden,
  löst Fahndung aus (`L2_HARBOR`, Mechaniker warnt vor der Polizei,
  `onComplete: "startPolice"`) → Fluchtpunkt erreichen (`L2_ESCAPE`,
  **dieselbe** Parkgarage-Koordinate wie Level 1 — ein Rückzugsort passt
  thematisch zu beiden Geschichten, kein Grund für ein weiteres Wahrzeichen)
  → finaler Dialog + Sieg (`L2_PIER`, Elaine an der Sausalito-Pier). Das
  ursprüngliche Boot/Brücken/Limousinen-Konzept aus dem Story-Prompt wurde
  bewusst auf diese Schrittform verdichtet statt neue Interaktionsarten zu
  bauen.
- **Tageslicht statt Nacht:** `DISTRICT_COASTAL.timeOfDay: "day"` nutzt
  main.js' bereits vorhandene Tag/Nacht-Verzweigung (`isNight`-Fälle bei
  Hemisphere-Light-Farben, `addStreetLamps()` überspringt sich selbst bei
  Tag) — keine neue Grafik-Funktionalität, nur ein schon unterstützter
  Konfigurationswert, der die beiden Level trotzdem klar unterscheidbar
  macht (warmes Orange-Fog `#e8b573` statt Nacht-Navy).

## Level 3 — "Golden Gate Run" (komplett andere Stadtplan-Engine)
Nutzerauftrag: ein drittes Level, das die bisherigen Stadtplanregeln komplett
verwirft und eine neue Stadt baut, die der Story gerecht wird — nicht nur
neue `CITY_STYLE`-Werte wie beim Sprung von Level 1 zu Level 2. Story/Figuren
(Marcus, Dante, Viktor, Mechaniker, Elaine) sind bewusst identisch zu
Level 2 — explizite Nutzerentscheidung nach Rückfrage, nicht versehentliche
Dopplung: Level 3 ist die "Director's Cut"-Fassung derselben Geschichte mit
den Beats, die Level 2 aus Scope-Gründen ausgespart hat (Boot, Fußlauf über
die Brücke, automatische Limo-Fahrt). Der Story-Prompt dafür stammte
ursprünglich aus einem älteren, nie umgesetzten Konzept für Level 2 selbst.

- **Eigener Stadtaufbau-Algorithmus, keine Grid-Wiederverwendung:**
  Level 1/2 teilen sich EIN prozedurales NxN-Blockraster (`buildBlock()`/
  `buildGround()`, nur `CITY_STYLE`-Werte unterscheiden sich — siehe
  "Level-System" oben). Level 3 aktiviert stattdessen `buildCoastalRoute()`
  (main.js), ausgewählt über `CITY_STYLE.layout === "route"`: eine lineare
  Route durch handplatzierte Zonen (Villa → kurvige Küstenstraße → Hafen →
  offene Bucht → Brücke → Limo-Straße → Pier) statt eines Blockrasters.
  `ROUTE3` (main.js) hält alle Wegpunkt-Koordinaten der Route als einfache
  `[x,z]`-Paare, `addRoadSegment()` zeichnet die kurvige PCH/Limo-Straße als
  Kette gerader, gegeneinander verdrehter Asphalt-/Linien-Segmente (kein
  echtes Spline-Meshing). Eine einzelne große Bodenebene (auf `WORLD_BOUND`
  zugeschnitten, nicht auf die Routen-Punkte selbst — sonst fährt man am
  Rand ins Nichts) ersetzt `buildGround()`s Grid-Bodenplatte samt
  Kreuzstreifen-Muster, das auf einer organischen Küstenstraße falsch
  ausgesehen hätte. Die drei Level-1/2-Landmark-Baufunktionen
  `buildVilla()`/`buildHarbor()`/`buildPier2()` werden UNVERÄNDERT
  wiederverwendet (sie nehmen ohnehin beliebige `{x,z}`, nichts Grid-
  Spezifisches), nur an den neuen Routen-Koordinaten statt einer reservierten
  Grid-Zelle platziert.
- **Bucht + Brücke:** `waterColliders` bekommt zwei Rechtecke mit einer
  Lücke dazwischen genau an der Stelle, wo `buildBridge()`s begehbares Deck
  sitzt — sonst würde die eigene Wasser-Kollision der Bucht den Fußweg über
  die Brücke blockieren, da dieses Spiel keine echte Höhen-/Ebenen-Trennung
  kennt (die Brücke "schwebt" nicht wirklich über dem Wasser, sie ist ein
  flaches, begehbares Deck wie jeder andere Steg im Spiel — das Boot "fährt
  darunter durch" ist rein narrativ, nicht geometrisch). Zwei Türme (Boxen +
  Zylinder-Pfeiler + Querbalken, International-Orange-Farbton) plus ein paar
  vertikale Hänger-Boxen als Kabel-Stellvertreter, keine echte
  Hängebrücken-Katenoide.
- **Boot (`VEHICLE_SPECS.boat`, neuer Mesh-Zweig in `createCarMesh()`):**
  spielergesteuert (manuelle Verfolgungsjagd über die Bucht, wie im
  Story-Prompt gefordert). Eigene Kollision `collideBoat()` — das Gegenteil
  von `collideWithBuildings()`: Land (Gebäude, Brückentürme) ist das
  Hindernis, die Bucht selbst ist frei befahrbar (`waterColliders` wird für
  das Boot komplett ignoriert), stattdessen an `BAY_BOUNDS` geklemmt. Land-
  Fahrzeuge/Fußgänger nutzen weiterhin ganz normal `collideWithBuildings()`
  und werden von genau denselben `waterColliders` blockiert — dieselben
  Objekte, zwei gegensätzliche Kollisionsregeln je nach Fortbewegungsart.
- **Limo (`VEHICLE_SPECS.limo`):** fällt mesh-seitig durch denselben
  generischen "PKW"-Zweig wie `type: "car"` (nur andere `halfW/halfL` aus
  `VEHICLE_SPECS`, cremeweiß eingefärbt) — fährt aber NICHT manuell, sondern
  automatisch (`missionState.autoDrive`, `updateAutoDrive()` in main.js):
  sucht sich per einfachem Steer-zum-Wegpunkt-Verhalten (dieselbe Formel wie
  die Verfolgungspolizei-KI, nur gegen eine feste Punktliste statt gegen den
  Spieler) selbst den Weg zum nächsten `autoDrivePath`-Punkt, während
  `updatePlayer()` echten Tasten-/Touch-Input für dieses Fahrzeug ignoriert.
  Die Mission selbst merkt vom Autopiloten nichts — der normale
  Wegpunkt-/`triggerRadius`-Mechanismus (`updateMission()`) erkennt die
  Ankunft ganz normal per Distanz und schaltet weiter, sobald die Limo nah
  genug herangefahren ist.
- **Fahrzeugwechsel als Story-Beat, nicht als Spieleraktion:**
  `step.vehicleAfter` (neues, optionales Feld in `mission.js`s Schritten,
  ausgewertet in `runStepOnComplete()`) setzt den Spieler beim Abschluss
  eines Schritts automatisch in ein frisches Fahrzeug (`boardVehicle()`) —
  am Hafen ins Boot, am Brückenende in die Limo (dort zusätzlich mit
  `autoDrivePath`, was automatisch `stopPolice()` auslöst — sobald Marcus in
  der Limo sitzt, ist die Verfolgung laut Story vorbei). `step.
  exitVehicleOnComplete` (`forceExitVehicle()`) erzwingt umgekehrt den
  Ausstieg — an der Anlegestelle (Boot → zu Fuß für den Brückenlauf) und am
  Limo-Ziel (Limo → zu Fuß zur Pier). Beides ist bewusst vom normalen
  `tryToggleVehicle()` (manuelles Ein-/Aussteigen per F) getrennt gehalten,
  um dessen bestehendes Verhalten für Level 1/2 nicht anzufassen.
- **Fußlauf über die Brücke braucht KEINE neue Verfolgungs-Logik:** der
  Schritt `L3_BRIDGE` ist einfach ein normaler, weit entfernter Wegpunkt
  während eine aktive Fahndung läuft — main.js' bereits vorhandene "Polizei
  zu Fuß"-Logik (siehe "Fahrphysik & Polizei" oben, unverändert seit Level
  1/2) übernimmt automatisch, sobald der Spieler ohne Auto unterwegs ist.
- **Bust-Ausnahme für das Boot:** `updatePoliceChase()`s beide Bust-Prüfungen
  (Einzelkollision UND Umzingelung) sind jetzt explizit deaktiviert, solange
  `player.inCar?.type === "boat"` — ein landgebundenes Streifenauto kann ein
  Boot auf offenem Wasser nie wirklich berühren, aber die Distanzmessung
  läuft VOR dem eigentlichen Kollisions-Clamp dieses Frames, sodass ein am
  Ufer feststeckender Cop nahe am Boot sonst fälschlich einen Bust auslösen
  konnte, obwohl er das Wasser gar nicht betreten kann.
- **HUD-Uhr (`MISSION.clock`, `#missionClock`):** rein atmosphärisch — tickt
  echte Spielzeit gegen ein konfiguriertes Zeitfenster (13:30–16:00 Uhr laut
  Story-Prompt), hat aber KEINEN eigenen Fail-Zustand. Die einzige
  Niederlage bleibt "von der Polizei geschnappt", wie in jedem Level; ein
  echtes Countdown-Fail-System war für den Prompt-Umfang nicht vorgesehen
  und hätte einen komplett neuen Fail-Pfad gebraucht. Nur sichtbar, wenn
  `MISSION.clock` gesetzt ist (Level 1/2 zeigen nichts).
- **Handy-Benachrichtigung:** `step.notify` (optionales Feld, ausgewertet in
  `activateStep()`) zeigt beim Aktivieren eines Schritts den bestehenden
  Toast (`showSub()`) — genutzt für "3 verpasste Anrufe — Elaine" beim Start
  der Limo-Fahrt, statt eines neuen Benachrichtigungssystems.
- **Bewusst NICHT gebaut** (Scope-Kürzungen gegenüber dem vollen
  Story-Prompt, analog zu Level 2s eigenen Kürzungen):
  - Keine echten Polizeiboote — Streifen-Cops bleiben landgebunden und
    verfolgen bis ans Ufer, wo sie stehen bleiben (matcht durch
    `spawnChaseCop()`s fehlende Wasser-Klärung optisch fast zufällig wie ein
    improvisiertes Polizeiboot, siehe Kommentar dort).
  - Kein Andock-Quicktime-Event — Anlegen läuft über denselben
    Distanz-Trigger wie jeder andere Wegpunkt.
  - Keine echte Ausdauer-/Puls-Anzeige beim Brückenlauf, kein Hubschrauber.
  - Keine Speicherstände, kein Voice-Acting, kein komponierter Soundtrack —
    Level 1/2 haben davon ebenfalls nichts (nur der bestehende Sound-Synth
    für Crashes/Sirenen).
  - **Ambient-Verkehr/Streifenpolizei sind für dieses Level komplett
    deaktiviert** (`spawnTraffic()`/`spawnPolicePatrol()` geben früh
    zurück, wenn `CITY_STYLE.layout === "route"`): ihre Fahrspur-KI
    (`stepLaneCar()`) fährt stur entlang `roadLines.x`/`roadLines.z`
    (den geraden Grid-Linien) und hätte auf der kurvigen Route entweder
    quer durch die Landschaft gefahren oder (leeres `roadLines`) mit
    `NaN`-Positionen abgestürzt. Die eigentliche Missions-Verfolgung
    (`chaseCops`) ist davon nicht betroffen — sie sucht den Spieler direkt
    und braucht `roadLines` nie.
- **Levelstart:** `DISTRICT.spawn` (optional, main.js liest es per
  `DISTRICT.spawn?.pos ?? [4, 2]`) lässt ein Level einen eigenen Startpunkt
  setzen, statt hart auf die Grid-Plaza bei `(4, 2)` — Level 3 startet auf
  der Küstenstraße nördlich der Villa. Level 1/2 setzen das Feld nicht und
  verhalten sich dadurch exakt wie zuvor.

## Wahrzeichen (Missions-Locations)
Wegpunkte in `mission.js` waren ursprünglich reine `[x,z]`-Platzhalter, die
irgendwo auf einem zufällig generierten Standardgebäude landeten — "Sofias
Werkstatt" sah aus wie jedes andere Gebäude, der "Kanal" existierte
überhaupt nicht. Drei Rasterzellen sind jetzt fest für handgebaute
Wahrzeichen reserviert (`LANDMARK_CELLS` in `main.js`, per `i,j`-Schlüssel
aus `buildBlock()` ausgenommen) und werden nach dem normalen Grid-Aufbau
von `buildLandmarks()` bebaut; `mission.js`s Wegpunkt-Koordinaten zeigen
jetzt exakt auf `LANDMARK_POS.<name>` (siehe Kommentar dort) statt auf
geschätzte Platzhalterzahlen.
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

Drei weitere Wahrzeichen für Level 2 ("Coastal Courier") — existieren
IMMER in der Stadt, unabhängig vom aktiven Level (siehe "Level-System"
oben), sind nur reine Kulisse solange das jeweils andere Level läuft:
- **Villa Malibu** (`buildVilla`, Zelle `5,1`): niedriges, flaches
  Cremeweiß-Haus mit großer getönter Glasfront (`glowMat` für einen
  leichten Schimmer) und einem kleinen, kollisionslosen Pool davor (reine
  eingefärbte Plane, wie eine Straßenmarkierung — kein neues
  Kollisions-Feature). Palmen-Flair über zwei ganz normale `addTree()`-
  Aufrufe (dieselbe Park-Baum-Mesh wie überall sonst in der Stadt, keine
  neue Geometrie).
- **Der Hafen** (`buildHarbor`, Zelle `0,5`): rostrotes Lagerhaus (gleiche
  Bauweise wie `buildWorkshop`, andere Farbe/Größe) plus drei
  Schiffscontainer (eigene, kleinere Collider) und ein Kran (Pfosten +
  Arm, gleiche Technik wie `createStreetLampMesh`). Bewusst OHNE eigenes
  Kanal/Steg-Feature — der Missionsschritt hier braucht nur eine
  Annäherungs-Zone für den Mechaniker-Dialog, keine Steg-Navigation wie
  bei Level 1s Koffer-Übergabe.
- **Sausalito Pier** (`buildPier2`, Zelle `6,2`): kleine Art-Deco-Galerie
  plus ein komplett lokaler Pool+Steg (im Gegensatz zum Level-1-Kanal muss
  dieser nicht bis zum Stadtrand reichen, bleibt einfach innerhalb/neben
  der reservierten Zelle — braucht deshalb keine `WORLD_BOUND`-Anpassung).
  Gleiches Steg-Muster wie beim Level-1-Kanal (Deck + Geländer + Pfosten,
  `waterColliders` links/rechts/hinterm Stegende). Elaine (`NPC_BY_STEP.
  L2_PIER`, `female: true`) steht am äußeren Stegende, wie Jack in Level 1.

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
