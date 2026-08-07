# Starship Launch — 3D-Raketenstart & Mondlandung mit EVA-Gameplay

## Live-URL
https://hofmiker.github.io/Claude_Test/starship-launch/

## Konzept
Kinowertige Low-Poly-3D-Animation eines SpaceX-Starship-Starts von einer
Cape-Canaveral-artigen Startrampe (grünes Land, Meer im Hintergrund) bis zur
Mondlandung, die nahtlos in ein frei begehbares Mondoberflächen-Gameplay
übergeht. Kein UI-Text während der Kinosequenz außer dem Countdown — alles
läuft über Kamera, Timing und Partikel/Licht.

**Ablauf:** Cockpit-Innenraum-Intro — Kamera von hinten/über die Schulter auf
einen stehenden Astronauten (volles Charakter-Rig, nicht nur Hände), der sich
zu einem Bedienpult mit Bildschirmen, Knopfreihe und Hebel vorbeugt und
Einstellungen prüft (Arm reicht wiederholt zum Pult, am Ende Hebelzug); davor/
darüber ein Sichtfenster mit Sternenhimmel-Textur, Kamera fährt währenddessen
langsam näher heran → Schnitt nach außen → Countdown (große, zentriert im
Bild stehende, kursive Monospace-Ziffern mit orangem Glow) → Zündung mit
riesigen, teils feurig-gelben Wolkenbergen → spürbar zügiger, gleichmäßig
beschleunigender Aufstieg (kein langes zähes Anfangsstück mehr) durch zwei
dichte, deutlich sichtbar durchstoßene Wolkendecks (darüber eine dritte,
dünnere Hochnebel-Schicht) → Booster-Abtrennung mit Zeitpolster vor dem
Schnitt, danach fliegt die Oberstufe mit unvermindertem Schub weiter — die
Steigrate bleibt bis zum Schnitt sichtbar positiv, die Kurve ist dort noch
nicht am Maximum. Kein Überblenden zu Schwarz mehr am Ende: die Kamera hört
in den letzten Sekunden auf, dem Schiff zu folgen, und hält stattdessen auf
einem fest platzierten, immer zur Kamera ausgerichteten Mond-Sprite (der
Übergang der Kameraposition dorthin ist selbst schon so gewählt, dass er
exakt an der Position endet, an der die anschließende Mondphase ihre eigene
Kamera beginnt — kein Kamera-Sprung beim Schnitt) — das Schiff fliegt
dadurch sichtbar oben aus dem Bild, der Mond bleibt mittig als Ziel stehen,
und der Schnitt zur Mondphase passiert direkt im selben Bildmoment (kein
Wartefenster, kein Schwarzbild) → Landeanflug mit sichtbarem Bremstriebwerk
(dezenter oranger Screen-Glow, deutlich schwächer als beim Start) und
seitlichen RCS-Steuerdüsen, die kurze, additiv geblendete Flammenstöße statt
Rauch ausstoßen — zufällig, aber nie zweimal hintereinander an derselben
Düse, wirkt also wie abwechselndes Feuern → Touchdown auf einer Landebasis →
Rampe fährt aus, Kamera schneidet auf die sich öffnende Luke → Astronaut
(weißer Anzug, schwarzes Visier) klettert raus und läuft die Rampe runter →
Kamera schwenkt hinter ihn → Übergabe an freie Steuerung.

Ein "Überspringen"-Button (unten rechts, von Anfang an sichtbar) springt
direkt zur freien Astronauten-Steuerung, ohne die komplette Kinosequenz
(inkl. Cockpit-Intro) abzuwarten.

## Mondoberfläche & Gameplay
- **Gelände:** Eine einzelne, großflächige vertex-verschobene Ebene
  (durchgängig, keine separate flache "Horizont-Schürze" mehr — die hätte
  tiefe Krater optisch abgedeckt, siehe Tech-Notizen) mit ~50 zufällig
  verteilten Kratern (echte Mulden, keine Decals), ~9 sanften, breiten
  Hügeln (gleiche Kuppelform wie Krater, nur nach oben und mit viel
  größerem Radius im Verhältnis zur Höhe, damit sie als sanftes Gelände statt
  als Hindernis wirken) und 60 kletterbaren Felsen (glatte Erhebung in
  derselben Höhenfunktion, nur invertiert und deutlich steiler — man
  läuft/hüpft einfach drauf, keine harte Kollision).
- **Landebasis:** Plattform mit Antennenschüssel und rot blinkendem Leuchtfeuer,
  von 10 kleinen Lämpchen umringt.
- **Straßennetz:** von der Landebasis zu einem Platz an der Raumstation
  (Asphalt-Material, mehrere terrainfolgende Segmente), von dort weiter
  verzweigt zum Funkmast und zum Solarpark — ein kleines Netz statt nur
  einer einzelnen Strecke. Auf der Straße (inkl. Platz) fahren beide
  Fahrzeuge 40 % schneller (höhere Höchstgeschwindigkeit, nicht nur mehr
  Beschleunigung).
- **Solarpark:** 7×7-Raster schräg aufgestellter Solarpanele (~5 m hoch) in
  größerer Entfernung von der Basis.
- **Funkmast:** höher als die Rakete (~164 Einheiten, Rakete ~143), 4 über
  Treppen erreichbare Plattformen, jede auf einer anderen Seite des Mastes
  versetzt (kein Stockwerk sitzt direkt über dem vorherigen — sonst wäre die
  Höhenfunktion an der gleichen (x,z)-Position mehrdeutig), aber nur so weit
  versetzt wie technisch nötig, damit sie zwischen den vier Eckstützen
  eingebettet wirken statt wie separate, weit herausragende Balkone. Oberste
  Plattform trägt mehrere Antennen und eine große Satellitenschüssel; wird
  später Teil der Mission. Treppen/Plattformen sind nur zu Fuß begehbar —
  Rover und Rig werden durch eine Kollisionsscheibe um den Mastfuß herum
  abgehalten, können also nicht auf den Turm auffahren.
- **Mondrover-Deko + fahrbares Fahrzeug:** derselbe Rover dient als Deko UND
  als fahrbares Gefährt (siehe unten).
- **Raumstation:** 6 verbundene Module (teils mit Kuppeln) direkt auf dem
  Boden stehend (keine Stelzen), über Verbindungsröhren verbunden. Nur die
  Module selbst sind kollidierbar (kann nicht durchlaufen/durchfahren
  werden) — die Verbindungsröhren sitzen deutlich höher (etwa auf
  Modul-Mittenhöhe) und sind bewusst NICHT kollidierbar, da sowohl
  Astronaut als auch Rover locker darunter hindurchpassen. Auch die
  Antennenschüssel und das Leuchtfeuer der Landebasis sowie der Rover
  (jetzt mit realistischerem Kollisionsradius passend zu Rädern/Chassis)
  sind kollidierbar. Die Kollisionsauflösung (`resolveSlide`) entfernt
  beim Kontakt nur die Bewegungskomponente, die tatsächlich ins
  Objekt hineinzeigt — die tangentiale Komponente bleibt erhalten, man
  gleitet also an Modulen vorbei statt bei jeder Berührung hart stehen zu
  bleiben (nur ein wirklich frontaler Aufprall bremst komplett ab).
- **Erde:** ein hoch am Himmel stehendes, immer zur Kamera ausgerichtetes
  Sprite (radialer Blauverlauf auf Canvas-Textur) statt einer 3D-Kugel auf
  Bodenhöhe — dadurch wirkt sie eindeutig als entfernter, unerreichbarer
  Himmelskörper statt als Objekt, das scheinbar auf dem Mondboden liegt.
- **10 lila leuchtende Kristalle**, über die Karte verstreut, einsammelbar
  durch Annähern (zu Fuß oder mit dem Rover), HUD-Zähler oben links.
- **24 kleine, immer aufhebbare Steine** (separat von den 60 großen
  Deko-/Kletter-Felsen, die zu groß zum Tragen sind) — Aktion-Taste in
  Reichweite hebt den nächsten auf, erneutes Drücken lässt ihn fallen; wird
  sichtbar vor dem Astronauten hergetragen.

## Steuerung (Astronaut zu Fuß)
- Tastatur: Pfeiltasten/WASD zum Laufen/Drehen, Leertaste zum Springen
  (Ausholen → Luft → Landung als Zustandsautomat, Impuls beim Absprung
  festgehalten)
- Mondgravitation: gilt durchgehend, nicht nur während eines Boosts — die
  Fallbeschleunigung liegt insgesamt bei der Hälfte des ursprünglichen
  Erdwerts, thematisch passend für eine Mondoberfläche. Jeder Sprung (auch
  ohne Boost) geht dadurch spürbar höher und dauert länger als mit
  Erdschwerkraft.
- Rucksack-Boost: erneutes Drücken der Sprung-Taste in der Luft löst einen
  Rückstoß aus (Flamme, Sound, Partikel), verkettbar durch mehrfaches
  Drücken — steigert sowohl Höhe als auch Geschwindigkeit, sodass wiederholtes
  Drücken während des Aufstiegs stetiges Steigen ermöglicht. Kamera zoomt
  während des Boosts zusätzlich deutlich weiter heraus als beim normalen
  Laufen, damit der Höhengewinn sichtbar bleibt.
- Touch: virtueller 360°-Joystick unten links (analog, Pointer-Events mit
  `setPointerCapture`) + runder Sprung-Button unten rechts — Steuerschema
  1:1 von `toy-story/gameplay/player.js` übernommen, nur das Aussehen des
  Charakters geändert (Raumanzug statt Spielfigur)
- Aktion-Button (zweiter runder Button über dem Sprung-Button, Diamant-Icon)
  zum Aufheben/Fallenlassen kleiner Steine
- Kamera: feste Third-Person-Verfolgungskamera hinter dem Charakter, zoomt
  bei Bewegung etwas weiter raus; auf Mobile/Touch-Geräten zusätzlich
  automatisch deutlich weiter herausgezoomt. Auf Mobile/Tablet zusätzlich
  Drag-to-Look: Ziehen auf dem Spielbildschirm (nicht auf Joystick/Buttons)
  dreht/neigt die Kamera, unabhängig von Lauf-/Fahrtrichtung; der Kopf des
  Astronauten dreht sich sichtbar mit. Vertikale Achse ist "natürlich"
  invertiert (nach oben ziehen senkt den Blick), wie bei den meisten
  mobilen Kamerasteuerungen. Sobald man sich per Joystick/Tasten wieder in
  eine Richtung bewegt (zu Fuß oder in einem Fahrzeug), zentriert sich die
  Kamera automatisch wieder hinter die Bewegungsrichtung, statt beim
  zuletzt gezogenen Blickwinkel hängen zu bleiben. Die frühere GTA-artige
  Top-Down-Kamera wurde entfernt (zu nah, kein Mehrwert).
- Kollision: kann keine Raumstationsmodule, den geparkten Rover oder den
  großen Rig durchlaufen (Kreis-Pushout-Kollision); Felsen sind dagegen
  kletterbar
- Lauf-Animation: etwas langsamerer Zyklus als ursprünglich, dafür mehr
  Knie-Federung/Bounce (Oberkörper hebt/senkt sich stärker, Knie geben mehr
  nach) — die Schrittweite/Bewegungsfreiheit selbst blieb unverändert.
  Sobald ein aufhebbarer kleiner Stein in unmittelbarer Reichweite ist,
  streckt der Astronaut beide Arme danach aus und dreht Kopf/Oberkörper in
  seine Richtung (nur innerhalb der Aufhebe-Reichweite, verschwindet sofort
  wieder außerhalb).

## Fahrbarer Mondrover
- In Reichweite (~4 Einheiten) Sprung-Taste drücken → Astronaut steigt ein
  (weiche, ~0.4s geblendete Übergangsanimation statt hartem Schnitt, sitzt
  danach sichtbar mit angewinkelten Beinen im Fahrersitz)
- Steuerung: gleiches Eingabeschema wie zu Fuß (Vorwärts/Rückwärts =
  Gas/Bremse, Links/Rechts = Lenkung, stärker bei höherem Tempo — wie bei
  `dhl-city/index.html` adaptiert, auch beim Rückwärtsfahren dieselbe
  Links/Rechts-Zuordnung wie vorwärts, kein realistischer Lenkungs-Flip),
  sichtbar einschlagende Vorderräder
- Kamera: höher und weiter hinter dem Fahrzeug als beim Laufen
- Erneutes Drücken der Sprung-Taste steigt wieder aus
- Kollision mit Raumstation/geparktem Fahrzeug wie beim Laufen, zusätzlich
  bremst ein Zusammenstoß das Tempo deutlich ab (Rempler-Gefühl)
- Staubwolken hinter den Rädern bei Fahrt, kleinere beim Laufen unter den
  Füßen — beides wiederverwendete Partikel-Puffs aus der Landesequenz
- Fährt ein Fahrzeug (Rover oder Rig) über einen kleinen aufhebbaren Stein,
  zerplatzt dieser in ein paar graue Splitter-Puffs mit Krachgeräusch und
  ist danach dauerhaft weg (wie ein eingesammelter Kristall)

## Großer 12-Rad-Rig (zweites Fahrzeug)
Steht neben dem Rover, deutlich größer — raumschiffartiger Rumpf auf Rädern
statt einem klassischen Rover-Chassis.
- 12 Räder (6 links, 6 rechts, doppelt so dick und weiter auseinander als
  ursprünglich), nur das vorderste Radpaar dreht sich sichtbar zum Lenken
- Visuelle Lenkung knickt zusätzlich den ganzen vorderen Fahrzeugteil in der
  Mitte ab (wie ein Gelenkbus/Sattelschlepper) statt nur die Vorderräder zu
  drehen — rein optisches Gelenk, Bewegung/Kollision bleiben ein starrer
  Körper. Beim Rückwärtsfahren knickt die Front zur jeweils anderen Seite
  als vorwärts (wie bei einem echten Anhängergelenk), obwohl die
  Lenkrichtung selbst (links bleibt links) nicht umgedreht wird.
- Fahrerkabine ist eine nach unten ausgebuchtete, verglaste Kanzel unter dem
  Rumpf statt einer Kuppel obenauf — der Astronaut sitzt darin sichtbar
  versenkt (Kopf/Oberkörper ragen über den Rand), mit einem kleinen
  Armaturenbrett samt Bedienelementen davor. Kurze Trittleiter seitlich zum
  Einstieg (rein optisch — der Einstieg selbst ist wie beim Rover eine
  weiche Übergangsanimation, hier aber bewusst sehr kurz, damit er "sehr
  schnell klappt")
- Astronaut sitzt beim Fahren wie im Rover (gleiche Sitz-Pose, angewinkelte
  Beine)
- Eigene, unabhängige Fahrphysik: schwerer/träger als der Rover (langsamere
  Beschleunigung bis zur Höchstgeschwindigkeit, die dafür deutlich höher
  liegt als beim Rover, größerer Kollisionsradius passend zum großen
  Rumpf); Kamera sitzt deutlich weiter hinten/höher als beim Rover, damit
  sich das Fahrgefühl trotz des riesigen Rumpfes und der hohen
  Endgeschwindigkeit nicht unkontrolliert eng anfühlt
- Rover und Rig kollidieren auch untereinander (können sich nicht
  gegenseitig durchfahren) und sind über eine eigene Minimap-Markierung
  (grün) sichtbar
- Ist man in Reichweite von beiden Fahrzeugen gleichzeitig, steigt man ins
  jeweils näher gelegene ein — Einstieg funktioniert von jeder Seite
  gleichermaßen (reine Abstandsprüfung zur Fahrzeugmitte)
- Greifarm: sobald man einsteigt, öffnet sich hinten rechts automatisch der
  seitliche Frachtdeckel und ein langer zweigliedriger Greifarm mit
  4-zackiger Klaue fährt aus — bleibt die ganze Fahrt über sichtbar
  ausgefahren, statt nur kurz für eine Aktion. Die Aktion-Taste löst darauf
  aufbauend nur noch die eigentliche Greif-/Loslass-Bewegung aus: der Arm
  reicht kurz weiter nach vorn zum nächsten Stein in Reichweite (oder zum
  Ablegen eines bereits gegriffenen) und kehrt danach in die ausgefahrene
  Ruhehaltung zurück, statt komplett einzufahren. Erst beim Aussteigen
  fahren Deckel und Arm wieder vollständig ein.

## Antippen von Objekten (Mobile/Tablet)
Kurzes Antippen (kaum Bewegung zwischen Pointer-Down/-Up, im Unterschied zum
Drag-to-Look) löst einen Raycast gegen die Szene aus. Trifft der Strahl ein
markiertes Objekt (Landebasis, Raumstation, Straße, Solarpark, Funkmast,
große Felsen, kleine aufhebbare Steine, Kristalle, Erde, Rover, großes Rig),
sagt der Astronaut einen kurzen, zum Objekt passenden Satz — als Sprechblase
oben mittig eingeblendet, blendet nach ein paar Sekunden von selbst wieder
aus. Rein atmosphärisch, ohne Spielmechanik-Effekt.

## UI
- Alle Buttons/Icons sind reine CSS-/SVG-Formen, keine Unicode-Textzeichen
  als Icons (Pfeile, Symbole etc.) — nur echte Text-Labels (z. B. der
  "Überspringen"-Button-Text) sind Text.
- Sprung- und Aktion-Button bilden bewusst ein einheitliches Paar: gleiche
  Größe, Randstärke und Opazitätsstufen, exakt auf derselben rechten Kante
  ausgerichtet und mit passendem Abstand übereinander gestapelt — nur die
  Akzentfarbe (Gelb/Blau) unterscheidet sie funktional.
- Kreisförmige Minimap oben rechts (an `dhl-city`s Minimap angelehnt):
  zeigt Landebasis, Raumstation, Rover und unsammelte Kristalle relativ
  zur eigenen Position/Blickrichtung.
- Kristall-Zähler oben links.
- Kontext-Hinweise ("Sprung-Taste zum Einsteigen" / "Aktion-Taste zum
  Aufheben") blenden nur ein, wenn wirklich etwas in Reichweite ist.
- Vollbild-Button (oben links, unter dem Kristall-Zähler): schaltet per
  Fullscreen API auf `document.documentElement` um (damit alle UI-Overlays
  im Vollbild sichtbar/bedienbar bleiben), Icon wechselt zwischen
  Ausklapp-/Einklapp-Ecken je nach Zustand. Blendet sich selbst aus, falls
  die Fullscreen API im Browser fehlt (z. B. iOS Safari).
- Die Seite lässt sich nicht per Pinch/Doppeltipp/Strg+Mausrad zoomen
  (Viewport-Meta + `touch-action:none` + Desktop-Handler) — das war zuvor
  möglich und führte zu einem leicht verrutschten Bild. Das Canvas ist
  zusätzlich fest auf den sichtbaren Viewport gepinnt (`position:fixed`,
  `visualViewport`-bewusstes Resize) statt im normalen Dokumentfluss zu
  hängen, was das Verrutschen behoben hat. Der Doppeltipp-Guard (blockiert
  den zweiten `touchend` eines schnellen Doppeltipps) gilt für Joystick,
  Sprung- und Aktion-Button gleichermaßen — alle drei hängen ausschließlich
  an Pointer-Events, nicht an `touchend`/`click`, lassen sich also gefahrlos
  mitschützen (nur `#skipBtn`/`#fullscreenBtn` sind ausgenommen, weil die
  wirklich auf synthetische `click`-Events angewiesen sind). Zusätzliche
  Absicherung in `resize()`: weicht `visualViewport.scale` erkennbar von 1
  ab, wird automatisch `resetZoom()` ausgelöst — falls doch einmal ein
  Zoom-Trigger durchrutscht, korrigiert sich das Spiel selbst statt den
  Spieler ohne Weg zurück dazustehen zu lassen.

## Sound
Rein prozedural über die Web Audio API (kein externes Audio-Asset), alle
Quellen über einen gemeinsamen Master-Gain + Kompressor geroutet (Schutz
vor Clipping, seit mehrere Dauerklänge gleichzeitig laufen können):
- Schritte, Landung, Kristall-Chime, Rakentenboost-Sound (Rucksack) wie
  zuvor. Der Sprung-Sound wurde bewusst "unarcadiger" gemacht (leiser,
  tieferer Einzelton + weiches Rauschen statt der ursprünglichen
  aufsteigenden Zweiton-Blip-Bleep-Kombination).
- Donnerndes Raketen-Rumble während Zündung/Aufstieg (zwei tiefe,
  LFO-modulierte Sägezahn-Oszillatoren + ein Zündungs-Rauschstoß) — vorher
  gab es dort nur ein Kamera-Shake ohne jeden Ton.
- Leises, unaufdringliches atmosphärisches Drone/Pad (drei leicht
  verstimmte Sinus-Layer), startet einmalig beim Gameplay-Einstieg und
  läuft durchgehend weiter (zu Fuß wie im Fahrzeug).
- Kein Motorengeräusch mehr in Rover/Rig — stattdessen nur ein leises,
  unregelmäßiges Knistern (kurze Rauschstöße, Rate steigt etwas mit dem
  Tempo), egal welches der beiden Fahrzeuge gerade gefahren wird.
Der `AudioContext` wird lazy beim ersten Tastendruck/Touch erzeugt
(Autoplay-Policy).

## Tech-Stack
- Three.js r160, lokal vendored unter `vendor/three.module.min.js`
  (identische Datei wie `toy-story/vendor/`) — ursprünglich per CDN
  (`unpkg.com`) eingebunden, für echte GIF-Aufnahme in der
  Netzwerk-Policy-Sandbox lokal vendored.
- Reines `<script type="module">`, kein Build-Schritt, keine weiteren
  Abhängigkeiten.
- Partikel-System (`spawnPuff`/`updatePuffs`) wird für Start-/Landerauch,
  Triebwerksschweif, RCS-Düsen UND die Staubwolken beim Laufen/Fahren
  wiederverwendet.
- Mondoberflächen-Höhenfunktion (`getMoonSurfaceY`) kombiniert additiv
  Krater-Mulden und Felsen-Erhebungen; wird sowohl für die
  Vertex-Verschiebung der sichtbaren Geometrie als auch für Lauf-/
  Fahrphysik und die Kollisionsauflösung (`resolvePush`) genutzt.
- Das Gras der Startrampen-Landefläche ist keine flache Einheitsfarbe mehr,
  sondern eine gekachelte Canvas-Rauschtextur mit mehreren Grüntönen
  (`buildGrassTexture()`) — eine einzelne `MeshStandardMaterial`-Farbe wirkte
  als komplett gleichmäßiger Rasen sichtbar künstlich.

## Tech-Notiz: Cockpit-Intro
Der Spielstart zeigt vor dem Außen-Countdown einen kurzen Innenraum-Shot: ein
volles Astronauten-Rig (`buildAstronaut()`, dieselbe Funktion wie für den
Gameplay-Charakter, aber eine eigene zweite Instanz `cockpitAstro`) steht vor
einem Bedienpult (zwei Bildschirme, Knopfreihe, Hebel) unter einem
Sichtfenster; die Kamera bleibt hinter/über der Schulter des Astronauten und
fährt langsam näher heran. Statt separater schwebender Hand-Meshes wird die
"Knöpfe prüfen"-Animation direkt über `rShoulder`/`rElbow`-Rotationen des
Rigs getrieben (gleiches Muster wie die Reach-Pose beim Steinaufheben im
Gameplay), der Hebelzug am Ende entsprechend über `lShoulder`/`lElbow`. Die
komplette Szene (`cockpitIntro`-Gruppe inkl. Astronaut/Konsole/Fenster) steht
weit unterhalb des restlichen Spiels (`COCKPIT_Y = -3000`), damit sie
garantiert nie versehentlich von einer anderen Kamera aus sichtbar wird —
kein Sichtbarkeits-Toggle nötig. Die Zeitachse bekommt dafür eine
zusätzliche Konstante `T_COCKPIT_INTRO` (Dauer der Intro-Phase): die
Spieluhr läuft ab `missionStart` unverändert als `rawT`, aber erst sobald
`rawT >= T_COCKPIT_INTRO` beginnt die eigentliche Außen-Zeitachse
(`t = rawT - T_COCKPIT_INTRO`) — dadurch mussten Countdown/Zündung/Aufstieg/
Trennung/Mondschnitt-Konstanten selbst nicht angefasst werden, sie
verschieben sich einfach komplett nach hinten. Der "Überspringen"-Button
umgeht `missionStart`/`t` ohnehin komplett und ist von alldem nicht
betroffen.

## Tech-Notiz: Launch-Kamera ohne Schwarzblende
Der Schnitt von der Außenkamera zur Mondphase (`T_BLACK`) läuft ohne
Überblenden zu Schwarz — das Schiff fliegt stattdessen sichtbar oben aus dem
Bild, während die Kamera in den letzten Sekunden davor von "Schiff verfolgen"
auf "fest auf dem Mond-Sprite halten" umschaltet. Damit der Schnitt selbst
keinen sichtbaren Kamera-Sprung erzeugt, blendet `updateCameraLaunch` die
Kameraposition (nicht nur den Blickpunkt) im selben Zeitfenster zusätzlich
auf exakt die X/Z-Koordinaten, mit denen `updateCameraMoon` startet (150,200);
beim Szenenwechsel wird `camState.y` außerdem auf `HOLD_CAM_Y` gesetzt statt
auf einen eigens für die alte Schwarzblende berechneten Wert. `T_MOON_IN`
entspricht jetzt exakt `T_BLACK` (die Mondszene wird im selben Frame wie der
Schnitt sichtbar, kein Wartefenster mehr), und `overlayOpacity()` hat keinen
eigenen Fade-Block für diesen Übergang mehr — nur die allererste Einblendung
aus Schwarz zu Beginn der ganzen Kinosequenz bleibt bestehen.

## Tech-Notiz: Krater-Rendering
Ursprünglich gab es zusätzlich zur detaillierten, krater-verschobenen
Ebene eine große flache Kreisscheibe ("Skirt") knapp darunter, um dem
Mond einen gekrümmten Horizont vorzutäuschen. Da einzelne Krater bis zu
28 Einheiten tief sein können, lag diese Scheibe streckenweise ÜBER dem
tatsächlichen Kraterboden und schnitt ihn im Tiefenpuffer sichtbar ab —
Krater wirkten dadurch wie zugedeckt. Behoben durch eine einzige,
durchgängige, ausreichend große Ebene (reicht über die Nebel-Fernweite
hinaus, sodass ihr Rand nie sichtbar wird) statt zwei sich überlappenden
Schichten unterschiedlicher Höhe.
