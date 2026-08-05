# Starship Launch — 3D-Raketenstart & Mondlandung mit EVA-Gameplay

## Live-URL
https://hofmiker.github.io/Claude_Test/starship-launch/

## Konzept
Kinowertige Low-Poly-3D-Animation eines SpaceX-Starship-Starts von einer
Cape-Canaveral-artigen Startrampe (grünes Land, Meer im Hintergrund) bis zur
Mondlandung, die nahtlos in ein frei begehbares Mondoberflächen-Gameplay
übergeht. Kein UI-Text während der Kinosequenz außer dem Countdown — alles
läuft über Kamera, Timing und Partikel/Licht.

**Ablauf:** Countdown → Zündung mit riesigen, teils feurig-gelben
Wolkenbergen → langsam-dann-exponentiell beschleunigender Aufstieg,
Kamera bewegt sich parallel nach oben durch mehrere sich weiter verteilende,
dünner werdende Wolkenschichten → Booster-Abtrennung hoch oben (fällt/
trudelt zur Erde) → Himmel dunkelt ab, Sterne erscheinen → Schnitt zum
Mond → Landeanflug mit sichtbarem Bremstriebwerk und seitlichen
RCS-Steuerdüsen → Touchdown auf einer Landebasis → Rampe fährt aus,
Kamera schneidet auf die sich öffnende Luke → Astronaut (weißer Anzug,
schwarzes Visier) klettert raus und läuft die Rampe runter → Kamera
schwenkt hinter ihn → Übergabe an freie Steuerung.

Ein "Überspringen"-Button (unten rechts, von Anfang an sichtbar) springt
direkt zur freien Astronauten-Steuerung, ohne die komplette Kinosequenz
abzuwarten.

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
- **Verbindungsstraße:** führt von der Landebasis zu einem Platz an der
  Raumstation (Asphalt-Material, mehrere terrainfolgende Segmente).
- **Solarpark:** 7×7-Raster schräg aufgestellter Solarpanele (~5 m hoch) in
  größerer Entfernung von der Basis.
- **Funkmast:** höher als die Rakete (~164 Einheiten, Rakete ~143), 4 über
  Treppen erreichbare Plattformen, jede auf einer anderen Seite des Mastes
  versetzt (kein Stockwerk sitzt direkt über dem vorherigen — sonst wäre die
  Höhenfunktion an der gleichen (x,z)-Position mehrdeutig). Oberste Plattform
  trägt mehrere Antennen und eine große Satellitenschüssel; wird später Teil
  der Mission.
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
- **Erde:** am Horizont sichtbar, tief genug positioniert, dass die flache
  Mondoberfläche ihre untere Hälfte im Tiefenpuffer abschneidet — wirkt wie
  ein "Erdaufgang" am Horizont statt einer voll sichtbaren Kugel am Himmel.
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
  dreht/neigt nur die Kamera, unabhängig von Lauf-/Fahrtrichtung — bewegt
  sich der Charakter, bleibt die Blickrichtung erhalten (kein Reset). Die
  frühere GTA-artige Top-Down-Kamera wurde entfernt (zu nah, kein Mehrwert).
- Kollision: kann keine Raumstationsmodule, den geparkten Rover oder den
  großen Rig durchlaufen (Kreis-Pushout-Kollision); Felsen sind dagegen
  kletterbar

## Fahrbarer Mondrover
- In Reichweite (~4 Einheiten) Sprung-Taste drücken → Astronaut steigt ein
  (weiche, ~0.4s geblendete Übergangsanimation statt hartem Schnitt, sitzt
  danach sichtbar mit angewinkelten Beinen im Fahrersitz)
- Steuerung: gleiches Eingabeschema wie zu Fuß (Vorwärts/Rückwärts =
  Gas/Bremse, Links/Rechts = Lenkung, stärker bei höherem Tempo — wie bei
  `dhl-city/index.html` adaptiert), sichtbar einschlagende Vorderräder
- Motorengeräusch (prozedural, Tonhöhe/Lautstärke an Geschwindigkeit
  gekoppelt) startet beim Einsteigen, stoppt beim Aussteigen
- Kamera: höher und weiter hinter dem Fahrzeug als beim Laufen
- Erneutes Drücken der Sprung-Taste steigt wieder aus
- Kollision mit Raumstation/geparktem Fahrzeug wie beim Laufen, zusätzlich
  bremst ein Zusammenstoß das Tempo deutlich ab (Rempler-Gefühl)
- Staubwolken hinter den Rädern bei Fahrt, kleinere beim Laufen unter den
  Füßen — beides wiederverwendete Partikel-Puffs aus der Landesequenz

## Großer 12-Rad-Rig (zweites Fahrzeug)
Steht neben dem Rover, deutlich größer — raumschiffartiger Rumpf auf Rädern
statt einem klassischen Rover-Chassis.
- 12 Räder (6 links, 6 rechts), nur das vorderste Radpaar lenkt sichtbar
- Kanzel mit schräger, halbtransparenter Glaskuppel; seitliche Leiter zum
  Einstieg (rein optisch — der Einstieg selbst ist wie beim Rover eine
  weiche Übergangsanimation, hier aber bewusst sehr kurz, damit er "sehr
  schnell klappt")
- Astronaut steht beim Fahren aufrecht in der Kanzel statt zu sitzen
  (eigene Steh-Pose statt der Rover-Sitzpose)
- Eigene, unabhängige Fahrphysik: schwerer/träger als der Rover (langsamere
  Beschleunigung, geringere Höchstgeschwindigkeit, größerer
  Kollisionsradius passend zum großen Rumpf)
- Rover und Rig kollidieren auch untereinander (können sich nicht
  gegenseitig durchfahren) und sind über eine eigene Minimap-Markierung
  (grün) sichtbar
- Ist man in Reichweite von beiden Fahrzeugen gleichzeitig, steigt man ins
  jeweils näher gelegene ein

## UI
- Alle Buttons/Icons sind reine CSS-/SVG-Formen, keine Unicode-Textzeichen
  als Icons (Pfeile, Symbole etc.) — nur echte Text-Labels (z. B. der
  "Überspringen"-Button-Text) sind Text.
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
- Kamera-Button (oben links, unter dem Vollbild-Button): wechselt zwischen
  der normalen Third-Person-Kamera und einer steileren Top-Down-Ansicht
  (Icon wechselt zwischen Dreieck und Kreis-mit-Punkt).
- Die Seite lässt sich nicht per Pinch/Doppeltipp/Strg+Mausrad zoomen
  (Viewport-Meta + `touch-action:none` + Desktop-Handler) — das war zuvor
  möglich und führte zu einem leicht verrutschten Bild. Das Canvas ist
  zusätzlich fest auf den sichtbaren Viewport gepinnt (`position:fixed`,
  `visualViewport`-bewusstes Resize) statt im normalen Dokumentfluss zu
  hängen, was das Verrutschen behoben hat.

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
- Das drehzahlabhängige Rover-Triebwerksgeräusch wie zuvor.
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

## Cutscene-Render (Remotion)
`remotion-cutscene/` ist ein separates Render-Tool (eigenes `package.json`,
Node/Remotion, kein Bestandteil des ausgelieferten Spiels) — kein neues
Projekt im Sinne der Repo-Konvention, daher keine Kachel/Tabelleneintrag.
Es portiert den Kino-Sequenz-Code aus `index.html` (Countdown bis
Mondlandung, ohne Rampe/Luke/Astronaut-Ausstieg und ohne alles, was nur
für das freie Gameplay existiert — Raumstation, Solarpark, Kommunikationsmast,
Rover/Rig, Kristalle) fast unverändert in eine Remotion-Komposition und
rendert sie zu `remotion-cutscene/out/starship-cutscene.mp4`. Details/
Render-Befehl siehe `remotion-cutscene/README.md`.

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
