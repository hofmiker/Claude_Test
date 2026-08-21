// mission.js — Story-, Wegpunkt- und Dialog-Config für Vice Grid.
// Reines Datenmodul, keine Three.js-Abhängigkeit. In main.js importieren:
//   import { MISSION, POLICE, DISTRICT, PLAYER_NAME, CITY_STYLE } from "./mission.js";
//
// WICHTIG — KOORDINATEN:
//   Alle "pos"-Werte sind [x, z] in Weltkoordinaten (Boden-Ebene, y kommt aus deinem Terrain).
//   Keine Platzhalter — jeder Wegpunkt zeigt exakt auf eines der handgebauten
//   Wahrzeichen in main.js, damit "Sofias Werkstatt"/"Villa Malibu"/etc.
//   auch wirklich wie die beschriebene Location aussehen statt auf einem
//   zufälligen Standardgebäude zu landen. Level 1 nutzt main.js'
//   LANDMARK_POS (Positionen aus dem Grid via blockCenter()); Level 2 hat
//   sein eigenes COASTAL_POS mit fest gewählten, grid-unabhängigen
//   Koordinaten (siehe buildCoastalTown() in main.js). Ändert sich die
//   jeweilige Geometrie, müssen diese Zahlen neu berechnet werden.
//   triggerRadius ist der Radius in Weltmetern, ab dem die Zone auslöst.
//
// MEHRERE LEVEL:
//   Jedes Level ist ein eigenständiges { district, mission, dialogs,
//   playerName, cityStyle }-Bundle in LEVEL_DATA unten. Welches Level
//   main.js tatsächlich lädt, wird EINMALIG beim Modul-Laden aus
//   localStorage gelesen (siehe ganz unten) - main.js selbst importiert
//   weiterhin nur die schlichten Namen DISTRICT/MISSION/DIALOGS/
//   PLAYER_NAME/CITY_STYLE, ganz ohne Level-Auswahl-Logik im Spielcode.
//   CITY_STYLE bestimmt, wie main.js' buildBlock()/buildGround() dieselbe
//   Grid-Engine mit komplett anderen Werten (Palette, Gebäudehöhen,
//   Park-Anteil, Boden-/Straßenfarben) befüllen - dieselbe Interaktion,
//   aber eine spürbar andere Stadt und Atmosphäre pro Level. Landmarks
//   (main.js: LANDMARK_CELLS/buildLandmarks) existieren dagegen IMMER alle
//   gleichzeitig in der Stadt, unabhängig vom gewählten Level - nur welche
//   Wegpunkte ein Level tatsächlich ansteuert, unterscheidet sich.

export const ACTION = {
  TALK: "Reden",
  TAKE: "Nehmen",
  ENTER: "Einsteigen",
  DELIVER: "Übergeben",
  DOCK: "Anlegen", // Level 3: mooring the boat
};

// ============================================================================
// LEVEL 1 — "Der Kessel" (Noir-Heist, Nacht/Regen)
// ============================================================================

const DISTRICT_KESSEL = {
  name: "Der Kessel",
  timeOfDay: "night",        // Nacht, Regen, Neon-Noir
  weather: "rain",
  fogColor: "#0a0e14",
  fogNear: 20,
  fogFar: 140,
  ambientLoop: "sfx/rain_city_loop.ogg", // optional
};

// Steuert, wie main.js' buildBlock()/buildGround() die Stadt tatsächlich
// aussehen lassen - dieselbe Grid-/Straßen-/Kollisions-Engine für jedes
// Level (siehe "Level-System" in CLAUDE.md), aber mit komplett anderen
// Werten: dichte, bunte Häuserzeilen bei Nacht für "Der Kessel" gegen
// niedrige, helle Villen-Zeilen mit viel mehr Grünflächen für "Coastal
// Courier" - das allein macht schon einen Großteil des "andere Stadt,
// andere Atmosphäre"-Unterschieds aus, ganz ohne die Straßen-/Kollisions-
// Interaktion selbst anzufassen.
const CITY_STYLE_KESSEL = {
  buildingPalette: [
    0xb5533c, 0x7a8ba6, 0xc9a24b, 0x8a7ca8, 0x5f9ea0,
    0xa9666b, 0x6b8f71, 0xba8a55, 0x94736b, 0x77869c,
  ],
  heightMin: 6, heightMax: 34,
  tallChance: 0.18, tallMul: 1.9,   // Anteil/Faktor für vereinzelte Hochhäuser
  parkChance: 0.22,
  colors: {
    ground: 0x2b2d31, road: 0x35373b, roadLine: 0xd8c246,
    sidewalk: 0x8d8f92, park: 0x3f7d43, trunk: 0x5b3a22, leaves: 0x2f6b34,
  },
};

// Die Mission ist eine geordnete Liste von Schritten (State Machine).
// main.js hält einen Index "currentStep". Ist die Bedingung eines Schritts
// erfüllt (Zone erreicht / Item genommen), wird advance() aufgerufen.
const MISSION_KESSEL = {
  id: "der_kessel_01",
  title: "Der Kessel",
  reward: 300,

  steps: [
    // 0 — INTRO: Handy-Dialog, danach erster Wegpunkt
    {
      id: "INTRO",
      objective: "Nimm den Anruf an",
      // Kein Weltziel — Dialog startet automatisch beim Missionsstart.
      dialog: "call_dragan",
      autoStart: true,
      onComplete: "activateWaypoint", // main.js setzt Wegpunkt des nächsten Schritts
    },

    // 1 — FIND_CONTACT: zu Sofias Werkstatt fahren, dann reden
    {
      id: "FIND_CONTACT",
      objective: "Fahre zu Sofias Werkstatt",
      waypoint: {
        pos: [-45, 32],          // 4m vor dem Rolltor der Werkstatt (LANDMARK_POS.workshop)
        label: "Sofias Werkstatt",
        color: "#ffcc00",
      },
      triggerRadius: 6,
      action: ACTION.TALK,        // Kontext-Button "F" zeigt "Reden"
      dialog: "talk_sofia",       // startet beim Betreten + F
    },

    // 2 — GO_TO_TARGET: zum Wohnblock am Kanal
    {
      id: "GO_TO_TARGET",
      objective: "Fahre zum Wohnblock am Kanal",
      waypoint: {
        pos: [90, 161],          // Einstieg auf den Steg, direkt am Kanal (LANDMARK_POS.waterfront)
        label: "Wohnblock",
        color: "#ffcc00",
      },
      triggerRadius: 8,
      action: ACTION.ENTER,       // aussteigen / Zone betreten
    },

    // 3 — GRAB_ITEM: Koffer nehmen -> Alarm -> Polizei startet
    {
      id: "GRAB_ITEM",
      objective: "Hol den Koffer",
      // Gleiche Zone wie oben; hier zählt das Aufsammeln.
      pickup: {
        pos: [90, 178],          // äußeres Ende des Stegs, über dem Wasser
        label: "Koffer",
        action: ACTION.TAKE,
      },
      triggerRadius: 3,
      dialog: "grab_scene",       // kurze Schrei-Zeile + Alarm
      onComplete: "startPolice",  // main.js aktiviert POLICE + "GESUCHT"-Anzeige
    },

    // 4 — ESCAPE: zur Parkgarage, Polizei jagt
    {
      id: "ESCAPE",
      objective: "Häng die Polizei ab und erreiche die Parkgarage",
      waypoint: {
        pos: [-90, -108],        // 5m vor der Einfahrt der Parkgarage (LANDMARK_POS.garage)
        label: "Parkgarage",
        color: "#ff3b30",         // rot: heißes Ziel während Verfolgung
      },
      triggerRadius: 9,
      action: ACTION.DELIVER,
      // Ziel darf erst zählen, wenn Verfolgung nicht "verloren" endet.
      // Bust (Kollision/Umzingelung) -> FAIL, siehe POLICE.
    },

    // 5 — DELIVER: Twist-Dialog, Belohnung, Win
    {
      id: "DELIVER",
      objective: "Übergib den Koffer",
      dialog: "deliver_twist",
      onComplete: "win",
    },
  ],

  // Endzustände
  win: {
    title: "Auftrag erfüllt",
    subtitle: "+$300 — Willkommen zurück, Marco.",
    restartLabel: "Neue Nacht",
  },
  fail: {
    title: "Geschnappt",
    subtitle: "Der Kessel behält, was er fängt.",
    restartLabel: "Nochmal",
  },
};

// Dialoge — je Eintrag eine Sequenz von Zeilen {speaker, text}.
// Kurze Zeilen für Mobile. Ton: knapp, kalt, Noir.
const DIALOGS_KESSEL = {
  call_dragan: {
    speaker: "Anruf",
    lines: [
      { speaker: "Vincent", text: "Marco. Ein Kurier namens Jack ist mit einem Koffer abgehauen." },
      { speaker: "Vincent", text: "Find ihn. Hol den Koffer. Keine Zeugen." },
      { speaker: "Marco", text: "Und mein Schnitt?" },
      { speaker: "Vincent", text: "Deine Schulden schrumpfen. Fahr los." },
    ],
  },

  talk_sofia: {
    speaker: "Sofia",
    lines: [
      { speaker: "Sofia", text: "Marco Reyes. Dachte, du fährst nicht mehr für Vincent." },
      { speaker: "Marco", text: "Wo ist Jack?" },
      { speaker: "Sofia", text: "Alter Wohnblock am Kanal. Was ist im Koffer?" },
      { speaker: "Marco", text: "Nichts, das dich was angeht." },
      { speaker: "Sofia", text: "Dann viel Glück. Du wirst es brauchen." },
    ],
  },

  grab_scene: {
    speaker: "",
    lines: [
      { speaker: "Marco", text: "Da ist er." },
      { speaker: "Jack", text: "Nicht der Koffer — du weißt nicht, was du da tust!" },
      { speaker: "", text: "Alarm. Blaulicht springt an." },
    ],
  },

  deliver_twist: {
    speaker: "Vincent",
    lines: [
      { speaker: "Vincent", text: "Sauber gefahren." },
      { speaker: "", text: "Er öffnet den Koffer. Kein Geld." },
      { speaker: "Vincent", text: "Namen. Eine Liste. Informanten." },
      { speaker: "Marco", text: "Jack wollte aussteigen." },
      { speaker: "Vincent", text: "Jetzt kann er das nicht mehr. Das war deine Bewerbung, Marco." },
    ],
  },
};

// ============================================================================
// LEVEL 2 — "The Coastal Courier" (Sonniger Tag/Sunset, Malibu -> Sausalito)
// Gleiche ENGINE, gleiche INTERAKTION (Fahren/Laufen/Dialog/Fahndung,
// dieselbe buildBlock()/Kollisions-/Traffic-/Minimap-Logik) wie Level 1 -
// bewusst KEINE neuen Fahrzeugtypen (Boot/Limousine), keine Cutscene-
// Kameras, kein Ausdauersystem, wie im ursprünglichen Story-Prompt
// beschrieben. Aber: "visuell sehr ähnlich" hieß NICHT "dieselbe Stadt
// wiederverwendet" - eine erste Fassung hat Level 2 einfach in Level 1s
// fertige Rasterstadt gesetzt und nur 3 Gebäude ausgetauscht, was sich wie
// dieselbe Stadt mit ein paar neuen Häusern anfühlte statt wie ein
// eigener Ort. CITY_STYLE_COASTAL unten (heller, niedriger, viel grüner)
// sorgt jetzt dafür, dass main.js dieselbe Grid-Engine mit komplett
// anderen Werten befüllt - andere Stadt, andere Atmosphäre, ohne die
// Interaktion selbst zu ändern. Die Schrittfolge ist trotzdem identisch zu
// Level 1 aufgebaut: Anruf -> Ziel anfahren + reden -> Ziel anfahren +
// reden (löst Fahndung aus) -> Fluchtpunkt erreichen -> finaler Dialog
// (Sieg). `timeOfDay: "day"` nutzt main.js' bereits vorhandenen Tag-
// Beleuchtungspfad (siehe `isNight`-Verzweigungen) - keine neue Grafik,
// nur ein bereits unterstützter Konfigurationswert.
const DISTRICT_COASTAL = {
  name: "The Coastal Courier",
  timeOfDay: "day",
  weather: "clear",
  fogColor: "#e8b573",        // warmes Sonnenuntergangs-Orange statt Nacht-Navy
  fogNear: 30,
  // höher als Level 1s 140 - die Golden Gate Bridge steht als Horizont-
  // Landmark bei z=168 (main.js: buildGoldenGateBridge()), bei 170 wäre sie
  // fast komplett im Nebel verschwunden.
  fogFar: 220,
};

// Helle, niedrige Villen-Palette statt Level 1s dunkler, bunter Downtown-
// Palette; viel mehr Parkzellen (0.45 statt 0.22) für einen aufgelockerten,
// grünen Vorort-Eindruck statt dichter Blockbebauung; kaum Hochhäuser
// (tallChance nur 0.04, und selbst die "hohen" Ausreißer bleiben niedrig).
const CITY_STYLE_COASTAL = {
  buildingPalette: [
    0xede8dc, 0xe0d8c0, 0xd8cba8, 0xc9bfa0, 0xe8dfc8, 0xdcd0b0, 0xd0c6a0, 0xe5dcc0,
  ],
  heightMin: 4, heightMax: 9,
  tallChance: 0.04, tallMul: 1.4,
  parkChance: 0.45,
  colors: {
    ground: 0xd9c9a0, road: 0xc7b98f, roadLine: 0xffffff,
    sidewalk: 0xe6ddc4, park: 0x8fae5c, trunk: 0x6b4a2a, leaves: 0x4a8f3d,
  },
};

const MISSION_COASTAL = {
  id: "coastal_courier_01",
  title: "The Coastal Courier",
  reward: 350,

  steps: [
    // 0 — L2_INTRO: Anruf von Dante
    {
      id: "L2_INTRO",
      objective: "Nimm den Anruf an",
      dialog: "call_dante",
      autoStart: true,
      onComplete: "activateWaypoint",
    },

    // 1 — L2_VILLA: zur Villa in Malibu fahren, Viktor trifft, Paket übernehmen
    {
      id: "L2_VILLA",
      objective: "Fahre zur Villa in Malibu",
      waypoint: {
        pos: [-70, -123],         // 4m vor der Glasfront (COASTAL_POS.villa)
        label: "Villa Malibu",
        color: "#ffcc00",
      },
      triggerRadius: 6,
      action: ACTION.TALK,
      dialog: "talk_viktor",
    },

    // 2 — L2_HARBOR: zum Hafen fahren, Mechaniker trifft -> Polizei startet
    {
      id: "L2_HARBOR",
      objective: "Bring das Paket zum Hafen",
      waypoint: {
        pos: [-145, 78],          // 4m vor dem Lagerhaus-Tor (COASTAL_POS.harbor)
        label: "Der Hafen",
        color: "#ffcc00",
      },
      triggerRadius: 7,
      action: ACTION.DELIVER,
      dialog: "talk_mechanic",    // startet beim Betreten + F
      onComplete: "startPolice",  // main.js aktiviert POLICE + "GESUCHT"-Anzeige
    },

    // 3 — L2_ESCAPE: Polizei abhängen, Abholpunkt erreichen (eigene
    // Parkgarage der Küstenstadt, gleiches "sicherer Rückzugsort"-Prinzip
    // wie Level 1s Garage, aber eigene Koordinate in der eigenen Stadt)
    {
      id: "L2_ESCAPE",
      objective: "Häng die Polizei ab und erreiche den Abholpunkt",
      waypoint: {
        pos: [10, -68],           // 5m vor der Einfahrt (COASTAL_POS.garage)
        label: "Abholpunkt",
        color: "#ff3b30",
      },
      triggerRadius: 9,
      action: ACTION.ENTER,
    },

    // 4 — L2_PIER: Sausalito Pier, finaler Dialog mit Elaine, Sieg
    {
      id: "L2_PIER",
      objective: "Erreiche die Pier in Sausalito",
      waypoint: {
        pos: [110, 88],           // Einstieg auf den Steg (COASTAL_POS.pierBase)
        label: "Sausalito Pier",
        color: "#ffcc00",
      },
      triggerRadius: 6,
      action: ACTION.TALK,
      dialog: "elaine_pier",
      onComplete: "win",
    },
  ],

  win: {
    title: "Zweite Chance",
    subtitle: "+$350 — Nächste Woche. Pünktlich, versprochen.",
    restartLabel: "Nochmal",
  },
  fail: {
    title: "Geschnappt",
    subtitle: "Manche Dinge lassen sich nicht outfahren.",
    restartLabel: "Nochmal",
  },
};

const DIALOGS_COASTAL = {
  call_dante: {
    speaker: "Anruf",
    lines: [
      { speaker: "Dante", text: "Marcus. Ein Job in Malibu. Eine Villa, ein Typ namens Viktor." },
      { speaker: "Dante", text: "Bring das Paket zum Hafen. 45 Minuten, sauber." },
      { speaker: "Marcus", text: "Bin doch immer sauber, D." },
      { speaker: "Dante", text: "Und Marcus — das ist dein letzter Job für mich." },
    ],
  },

  talk_viktor: {
    speaker: "Viktor",
    lines: [
      { speaker: "Viktor", text: "Du bist Marcus?" },
      { speaker: "Marcus", text: "Der bin ich. Was hast du für mich?" },
      { speaker: "Viktor", text: "Kunstwerke. Sehr heiß. Die Polizei wurde schon gerufen." },
      { speaker: "Marcus", text: "Keine Panik. Ich bin weg." },
    ],
  },

  talk_mechanic: {
    speaker: "Mechaniker",
    lines: [
      { speaker: "Mechaniker", text: "Polizei kommt näher. Gib mir das Paket, ich mach den Rest." },
      { speaker: "Marcus", text: "Wie schnell können die hier sein?" },
      { speaker: "Mechaniker", text: "Zu schnell. Lauf." },
      { speaker: "", text: "Sirenen. Blaulicht springt an." },
    ],
  },

  elaine_pier: {
    speaker: "Elaine",
    lines: [
      { speaker: "Elaine", text: "Marcus? Du bist eine Stunde zu spät." },
      { speaker: "Marcus", text: "Ich weiß. Es tut mir leid." },
      { speaker: "Elaine", text: "Du siehst aus, als kämst du gerade von einem Raub." },
      { speaker: "Marcus", text: "...Ich bin einfach kein guter Mensch. Aber ich will's besser machen. Mit dir." },
      { speaker: "Elaine", text: "Das ist das erste Ehrliche, was du mir heute sagst." },
      { speaker: "Elaine", text: "Nächste Woche. Ein echtes Date. Pünktlich." },
      { speaker: "Marcus", text: "Pünktlich. Versprochen." },
    ],
  },
};

// ============================================================================
// LEVEL 3 — "Golden Gate Run" (Sonnenuntergang, Malibu -> Golden Gate -> Sausalito)
// Anders als Level 1/2 (jeweils eigene, aber in main.js über LEVEL_ID
// ausgewählte Stadt-Baufunktion) verwirft dieses Level nicht nur das Grid,
// sondern auch Level 2s Strand-Layout: main.js' buildCoastalRoute()
// (ausgewählt über LEVEL_ID === "golden_gate_run" in buildCity()) baut eine
// lineare Route durch handplatzierte Zonen - Villa, Küstenstraße, Hafen,
// eine offene Bucht für eine Boots-Verfolgung, eine Golden-Gate-Brücke zu
// Fuß, eine automatisch fahrende Limo, Pier - statt eines NxN-Blockrasters
// oder eines einzelnen Stadt-Footprints. Landmark-GEBÄUDE (buildVilla/
// buildHarbor) sind trotzdem wiederverwendet, nur an neuen Koordinaten; der
// Pier hat eine eigene, NICHT geteilte Funktion (buildSausalitoPier) - siehe
// main.js' "Level 3 world" Abschnitt für die volle Begründung.
//
// Story/Dialoge/Figuren (Marcus/Dante/Viktor/Mechaniker/Elaine) sind
// bewusst identisch zu Level 2 ("Coastal Courier") - das war eine explizite
// Nutzerentscheidung (nicht neu erfunden), Level 3 ist die "Director's Cut"-
// Fassung derselben Geschichte mit den Beats, die Level 2 aus Scope-Gründen
// aussparte (Boot, Fußlauf über die Brücke, Limo).
const DISTRICT_GOLDENGATE = {
  name: "Golden Gate Run",
  timeOfDay: "day",            // main.js' Tag-Beleuchtungspfad, wie Level 2
  weather: "clear",
  // klarer Taghimmel statt Sonnenuntergangs-Orange - Nutzerfeedback: das
  // Orange sah wie ein Sandsturm aus statt nach Golden Hour. scene.background
  // in main.js übernimmt diesen Wert 1:1 als Himmelsfarbe (kein separates
  // Sky-Objekt), also bestimmt allein dieser Hex-Code den ganzen Himmel.
  fogColor: "#7ec8f0",
  fogNear: 35,
  fogFar: 230,
  // Level 3 startet nicht in der Grid-Plaza (die es hier nicht gibt),
  // sondern auf der Küstenstraße kurz nördlich der Villa, mit Blick nach
  // Süden (Math.PI, dieselbe "geradeaus = -z"-Konvention wie jeder andere
  // Spawn im Spiel) - main.js liest das optional (DISTRICT.spawn?.pos),
  // Level 1/2 bleiben beim alten (4,2).
  spawn: { pos: [40, 172], heading: Math.PI },
};

// main.js' buildBlock()/buildGround() werden für dieses Level gar nicht
// aufgerufen (buildCity() wählt anhand von LEVEL_ID, siehe mission.js'
// LEVEL_ID-Export weiter unten) - die meisten Felder hier dienen nur als
// sicherer Fallback, falls irgendein geteilter Codepfad sie trotzdem liest
// (z. B. addTree() für die Villa-Palmen: COLORS.trunk/leaves).
const CITY_STYLE_GOLDENGATE = {
  buildingPalette: [0xd8b98a, 0xc9a56a, 0xe0c9a0],
  heightMin: 4, heightMax: 9, tallChance: 0.02, tallMul: 1.2, parkChance: 0.3,
  colors: {
    ground: 0xd8b98a, road: 0x5a534a, roadLine: 0xffffff,
    sidewalk: 0xe6d9b8, park: 0x7fae5c, trunk: 0x6b4a2a, leaves: 0x4a8f3d,
    water: 0x2f6f86, bridge: 0xc1440e, // "International Orange"
  },
};

const MISSION_GOLDENGATE = {
  id: "golden_gate_run_01",
  title: "Golden Gate Run",
  reward: 500,
  // rein atmosphärisch (HUD-Uhr in main.js' updateHud()) - tickt echte
  // Spielzeit gegen dieses Fenster, hat aber KEINEN eigenen Fail-Zustand;
  // "erwischt werden" bleibt die einzige Niederlage, wie in jedem Level.
  clock: { startMinutes: 13 * 60 + 30, endMinutes: 16 * 60, realSecondsForFullRun: 600 },

  steps: [
    // 0 — L3_INTRO: Anruf von Dante
    {
      id: "L3_INTRO",
      objective: "Nimm den Anruf an",
      dialog: "call_dante",
      autoStart: true,
      onComplete: "activateWaypoint",
    },

    // 1 — L3_VILLA: zur Villa in Malibu fahren, Viktor trifft, Kunstwerke übernehmen
    {
      id: "L3_VILLA",
      objective: "Fahre zur Villa in Malibu",
      waypoint: { pos: [0, 127], label: "Villa Malibu", color: "#ffcc00" },
      triggerRadius: 7,
      action: ACTION.TALK,
      dialog: "talk_viktor",
    },

    // 2 — L3_HARBOR: zum Hafen fahren, Mechaniker trifft -> Polizei startet,
    // danach direkt ins Boot (vehicleAfter, main.js' boardVehicle())
    {
      id: "L3_HARBOR",
      objective: "Bring die Kunstwerke zum Hafen",
      waypoint: { pos: [40, -27], label: "Der Hafen", color: "#ffcc00" },
      triggerRadius: 7,
      action: ACTION.DELIVER,
      dialog: "talk_mechanic",
      onComplete: "startPolice",
      vehicleAfter: { type: "boat", pos: [35, -34], heading: Math.PI },
    },

    // 3 — L3_BAY: Boot durch die Bucht zur Anlegestelle an der Brücke, dann
    // zwingend aussteigen (exitVehicleOnComplete) - der Fußlauf danach
    // braucht den Spieler zu Fuß.
    {
      id: "L3_BAY",
      objective: "Fahre das Boot unter die Brücke",
      waypoint: { pos: [-45, -78], label: "Anlegestelle", color: "#ff3b30" },
      triggerRadius: 7,
      action: ACTION.DOCK,
      exitVehicleOnComplete: true,
    },

    // 4 — L3_BRIDGE: zu Fuß über die Golden Gate Bridge, verfolgt von
    // Fußpolizei (main.js' bereits vorhandene "Polizei zu Fuß"-Logik greift
    // hier automatisch, keine neue Chase-Mechanik nötig). Wegpunkt liegt am
    // Fuß der Ost-Rampe (main.js: ROUTE3.bridgeEast[0]=20 + BRIDGE_RAMP_RUN=25),
    // nicht mehr am Turm selbst - Spieler ist beim Auslösen schon wieder auf
    // Bodenhöhe. Am Ende wartet die Limo (vehicleAfter mit autoDrivePath ->
    // main.js' updateAutoDrive()).
    {
      id: "L3_BRIDGE",
      objective: "Häng die Polizei ab — lauf über die Brücke",
      waypoint: { pos: [40, -78], label: "Brückenende", color: "#ff3b30" },
      triggerRadius: 8,
      action: ACTION.ENTER,
      vehicleAfter: {
        type: "limo",
        pos: [50, -82],
        heading: Math.PI,
        autoDrivePath: [[30, -125], [0, -148], [0, -150]],
      },
    },

    // 5 — L3_LIMO: automatische Fahrt nach Sausalito (main.js fährt, Spieler
    // sitzt nur - siehe updateAutoDrive()); löst wie jeder andere Wegpunkt
    // per Distanz aus, sobald die Limo dort ankommt.
    {
      id: "L3_LIMO",
      objective: "Unterwegs nach Sausalito …",
      waypoint: { pos: [0, -150], label: "Sausalito", color: "#ffcc00" },
      triggerRadius: 9,
      action: ACTION.ENTER,
      exitVehicleOnComplete: true,
      notify: "📱 3 verpasste Anrufe — Elaine",
    },

    // 6 — L3_PIER: finaler Dialog mit Elaine, Sieg
    {
      id: "L3_PIER",
      objective: "Erreiche die Pier in Sausalito",
      waypoint: { pos: [0, -160], label: "Sausalito Pier", color: "#ffcc00" },
      triggerRadius: 7,
      action: ACTION.TALK,
      dialog: "elaine_pier",
      onComplete: "win",
    },
  ],

  win: {
    title: "Pünktlich genug",
    subtitle: "+$500 — Nächste Woche. Ein echtes Date.",
    restartLabel: "Nochmal",
  },
  fail: {
    title: "Geschnappt",
    subtitle: "Manche Dinge lassen sich nicht outfahren.",
    restartLabel: "Nochmal",
  },
};

const DIALOGS_GOLDENGATE = {
  call_dante: {
    speaker: "Anruf",
    lines: [
      { speaker: "Dante", text: "Du bist bereit?" },
      { speaker: "Marcus", text: "Immer bereit, D. Was ist der Auftrag?" },
      { speaker: "Dante", text: "Abholen in Malibu. Villa. Ein Typ namens Viktor. Er hat was für dich." },
      { speaker: "Dante", text: "Bringst es zum Hafen. Leicht. Schnell. Keine Probleme." },
      { speaker: "Marcus", text: "Wie lange?" },
      { speaker: "Dante", text: "45 Minuten. Komplett." },
      { speaker: "Marcus", text: "Kein Problem. Ich bin hinterher frei, ja?" },
      { speaker: "Dante", text: "Ja. Das ist dein letzter Job für mich." },
      { speaker: "Marcus", text: "Perfekt. Ich bin in 20." },
      { speaker: "Dante", text: "Und Marcus … keine Fehler." },
      { speaker: "Marcus", text: "Verstanden, D. Immer sauber." },
    ],
  },

  talk_viktor: {
    speaker: "Viktor",
    lines: [
      { speaker: "Viktor", text: "Du bist Marcus?" },
      { speaker: "Marcus", text: "Der bin ich. Was hast du für mich?" },
      { speaker: "Viktor", text: "Kunstwerke. Sehr teuer. Sehr heiß geklaut." },
      { speaker: "Marcus", text: "Kunstzeug? Ich dachte, das ist—" },
      { speaker: "Viktor", text: "Nicht denken. Fahren. Die Polizei wurde schon gerufen." },
      { speaker: "Viktor", text: "Du hast vielleicht 30 Minuten, bevor sie hier sind." },
      { speaker: "Marcus", text: "Keine Panik. Ich hab das. Bin weg in 2 Minuten." },
      { speaker: "Viktor", text: "Das ist alles. Es ist wertvoll. Pass auf." },
      { speaker: "", text: "Sirenen in der Ferne — noch weit weg, aber näher werdend." },
    ],
  },

  talk_mechanic: {
    speaker: "Mechaniker",
    lines: [
      { speaker: "Mechaniker", text: "Polizei kommt. Du musst raus aufs Wasser." },
      { speaker: "Marcus", text: "Wie weit?" },
      { speaker: "Mechaniker", text: "Golden Gate Bridge. Dante hat da einen Kontakt." },
      { speaker: "Mechaniker", text: "Boot unter der Brücke parken, zu Fuß rüber, er holt dich mit der Limo ab." },
      { speaker: "Marcus", text: "Und wenn die Polizei verfolgt?" },
      { speaker: "Mechaniker", text: "Boot ist schneller. Aber bleib auf dem Wasser." },
      { speaker: "Marcus", text: "Danke, Mann." },
      { speaker: "Mechaniker", text: "Viel Glück." },
      { speaker: "", text: "Sirenen. Blaulicht springt an." },
    ],
  },

  elaine_pier: {
    speaker: "Elaine",
    lines: [
      { speaker: "Elaine", text: "Marcus?" },
      { speaker: "Marcus", text: "Hey … ja, hey." },
      { speaker: "Elaine", text: "Du bist gekommen. Du bist eine Stunde zu spät." },
      { speaker: "Marcus", text: "Ich weiß. Das tut mir leid — es gab Verkehr, und—" },
      { speaker: "Elaine", text: "Marcus. Du siehst aus, als würdest du gerade von einer Bank fliehen." },
      { speaker: "Marcus", text: "…Ich bin einfach verzögert. Das tut mir echt weh." },
      { speaker: "Elaine", text: "Ich mag dich. Deinen Charme, deinen Humor, wie du fährst." },
      { speaker: "Elaine", text: "Aber ich sehe etwas in dir, das nicht hier ist. Du bist woanders." },
      { speaker: "Marcus", text: "Das stimmt nicht. Ich bin hier. Jetzt. Mit dir." },
      { speaker: "Elaine", text: "Ist es? Dein Handy ist aus. Das sagt mir, du hast gerade etwas Falsches gemacht." },
      { speaker: "Marcus", text: "…Ich bin kein guter Mensch. Nicht jetzt. Vielleicht nie." },
      { speaker: "Marcus", text: "Aber wenn du mir eine Chance gibst, kann ich besser werden. Mit dir." },
      { speaker: "Elaine", text: "Das ist das erste Echte, was du mir heute sagst." },
      { speaker: "Elaine", text: "Also — eine zweite Chance? Ein echtes Date? Nächste Woche?" },
      { speaker: "Marcus", text: "Nächste Woche. Und ich schwöre — pünktlich. Früher sogar." },
      { speaker: "Elaine", text: "Wir werden sehen." },
    ],
  },
};

// ============================================================================
// Level-Auswahl
// ============================================================================

// Reihenfolge/Metadaten für die Level-Auswahl-Chips im Titelbildschirm
// (main.js/index.html) - main.js braucht davon nur `id`, um den gewählten
// Chip in main.js' Klick-Handler in localStorage zu schreiben.
export const LEVELS = [
  { id: "der_kessel", title: "Der Kessel", locked: false },
  { id: "coastal_courier", title: "Coastal Courier", locked: false },
  { id: "golden_gate_run", title: "Golden Gate Run", locked: false },
];

const LEVEL_DATA = {
  der_kessel: { district: DISTRICT_KESSEL, mission: MISSION_KESSEL, dialogs: DIALOGS_KESSEL, playerName: "Marco", cityStyle: CITY_STYLE_KESSEL },
  coastal_courier: { district: DISTRICT_COASTAL, mission: MISSION_COASTAL, dialogs: DIALOGS_COASTAL, playerName: "Marcus", cityStyle: CITY_STYLE_COASTAL },
  golden_gate_run: { district: DISTRICT_GOLDENGATE, mission: MISSION_GOLDENGATE, dialogs: DIALOGS_GOLDENGATE, playerName: "Marcus", cityStyle: CITY_STYLE_GOLDENGATE },
};

const activeLevelId = (typeof localStorage !== "undefined" && localStorage.getItem("viceGridLevel")) || "der_kessel";
const ACTIVE = LEVEL_DATA[activeLevelId] || LEVEL_DATA.der_kessel;

export const DISTRICT = ACTIVE.district;
export const MISSION = ACTIVE.mission;
export const DIALOGS = ACTIVE.dialogs;
export const PLAYER_NAME = ACTIVE.playerName;
export const CITY_STYLE = ACTIVE.cityStyle;
// which level is active - main.js uses this to pick between two entirely
// separate, hand-built world layouts (buildCity() branches on it) instead
// of reusing one procedural grid for both.
export const LEVEL_ID = activeLevelId;

// Polizei / Fahndung — binär statt Sterne. Level-unabhängig, gleiche
// Fahndungsmechanik für jede Story.
export const POLICE = {
  units: {
    initial: 1,          // Zahl der Cop-Autos beim Start
    max: 3,              // rampt hoch, solange du gesehen wirst
    rampEverySeconds: 12,// alle X s ein weiteres Auto (bis max), solange gejagt
  },

  ai: {
    speed: 0.9,          // relativ zur Spieler-Höchstgeschwindigkeit
    seek: true,          // einfaches Verfolgen Richtung Spieler
    sightRadius: 45,     // ab hier "sieht" ein Cop den Spieler
    lightEmission: "#3b7bff",
    siren: "sfx/siren_loop.ogg", // optional
  },

  // Entkommen: kein Zähler, nur an/aus.
  escape: {
    outOfSightSeconds: 6, // so lange außerhalb sightRadius aller Cops -> entkommen
    // Danach: "GESUCHT"-Anzeige aus, Cops brechen ab / despawnen langsam.
  },

  bust: {
    onCollision: true,    // Cop rammt / blockiert -> FAIL
    surroundSeconds: 3,   // optional: X s von Cops umzingelt & steht -> FAIL
  },

  hud: {
    // Ersetzt die alten Sterne komplett.
    wantedLabel: "GESUCHT",
    wantedColor: "#ff3b30",
    style: "pulse",       // sanftes Pulsieren, während aktiv; Ein-/Ausblenden bei Wechsel
  },
};
