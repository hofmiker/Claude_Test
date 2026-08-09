// mission.js — Story-, Wegpunkt- und Dialog-Config für Vice Grid.
// Reines Datenmodul, keine Three.js-Abhängigkeit. In main.js importieren:
//   import { MISSION, POLICE, DISTRICT, PLAYER_NAME } from "./mission.js";
//
// WICHTIG — KOORDINATEN:
//   Alle "pos"-Werte sind [x, z] in Weltkoordinaten (Boden-Ebene, y kommt aus deinem Terrain).
//   Keine Platzhalter — jeder Wegpunkt zeigt exakt auf eines der handgebauten
//   Wahrzeichen in main.js (LANDMARK_POS), damit "Sofias Werkstatt"/"Villa
//   Malibu"/etc. auch wirklich wie die beschriebene Location aussehen statt
//   auf einem zufälligen Standardgebäude zu landen. Ändert sich main.js'
//   LANDMARK_CELLS/blockCenter()-Geometrie, müssen diese Zahlen neu
//   berechnet werden.
//   triggerRadius ist der Radius in Weltmetern, ab dem die Zone auslöst.
//
// MEHRERE LEVEL:
//   Jedes Level ist ein eigenständiges { district, mission, dialogs,
//   playerName }-Bundle in LEVELS unten. Welches Level main.js tatsächlich
//   lädt, wird EINMALIG beim Modul-Laden aus localStorage gelesen (siehe
//   ganz unten) - main.js selbst importiert weiterhin nur die schlichten
//   Namen DISTRICT/MISSION/DIALOGS/PLAYER_NAME, ganz ohne Level-Auswahl-
//   Logik im Spielcode. Landmarks (main.js: LANDMARK_CELLS/buildLandmarks)
//   existieren dagegen IMMER alle gleichzeitig in der Stadt, unabhängig vom
//   gewählten Level - nur welche Wegpunkte ein Level tatsächlich ansteuert,
//   unterscheidet sich.

export const ACTION = {
  TALK: "Reden",
  TAKE: "Nehmen",
  ENTER: "Einsteigen",
  DELIVER: "Übergeben",
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
// Gleiche Engine, gleiche Interaktion (Fahren/Laufen/Dialog/Fahndung) wie
// Level 1 - nur Story, Dialoge und Wegpunkte sind neu eingewoben. Bewusst
// KEINE neuen Fahrzeugtypen (Boot/Limousine), keine Cutscene-Kameras, kein
// Ausdauersystem - der ursprüngliche Prompt beschrieb das, aber die Vorgabe
// war "Grafik und Interaktion unverändert". Die Schrittfolge ist deshalb
// identisch zu Level 1 aufgebaut: Anruf -> Ziel anfahren + reden -> Ziel
// anfahren + reden (löst Fahndung aus) -> Fluchtpunkt erreichen -> finaler
// Dialog (Sieg). `timeOfDay: "day"` nutzt main.js' bereits vorhandenen
// Tag-Beleuchtungspfad (siehe `isNight`-Verzweigungen) - keine neue Grafik,
// nur ein bereits unterstützter Konfigurationswert.
const DISTRICT_COASTAL = {
  name: "The Coastal Courier",
  timeOfDay: "day",
  weather: "clear",
  fogColor: "#e8b573",        // warmes Sonnenuntergangs-Orange statt Nacht-Navy
  fogNear: 30,
  fogFar: 170,
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
        pos: [90, -103],          // 4m vor der Glasfront (LANDMARK_POS.villa)
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
        pos: [-135, 78],          // 4m vor dem Lagerhaus-Tor (LANDMARK_POS.harbor)
        label: "Der Hafen",
        color: "#ffcc00",
      },
      triggerRadius: 7,
      action: ACTION.DELIVER,
      dialog: "talk_mechanic",    // startet beim Betreten + F
      onComplete: "startPolice",  // main.js aktiviert POLICE + "GESUCHT"-Anzeige
    },

    // 3 — L2_ESCAPE: Polizei abhängen, Abholpunkt erreichen (gleiche Garage
    // wie Level 1 - andere Story, gleicher "sicherer Rückzugsort"-Beat)
    {
      id: "L2_ESCAPE",
      objective: "Häng die Polizei ab und erreiche den Abholpunkt",
      waypoint: {
        pos: [-90, -108],         // LANDMARK_POS.garage, wie in Level 1
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
        pos: [142, -46],          // Einstieg auf den Steg (LANDMARK_POS.pier2)
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
// Level-Auswahl
// ============================================================================

// Reihenfolge/Metadaten für die Level-Auswahl-Chips im Titelbildschirm
// (main.js/index.html) - main.js braucht davon nur `id`, um den gewählten
// Chip in main.js' Klick-Handler in localStorage zu schreiben.
export const LEVELS = [
  { id: "der_kessel", title: "Der Kessel", locked: false },
  { id: "coastal_courier", title: "Coastal Courier", locked: false },
];

const LEVEL_DATA = {
  der_kessel: { district: DISTRICT_KESSEL, mission: MISSION_KESSEL, dialogs: DIALOGS_KESSEL, playerName: "Marco" },
  coastal_courier: { district: DISTRICT_COASTAL, mission: MISSION_COASTAL, dialogs: DIALOGS_COASTAL, playerName: "Marcus" },
};

const activeLevelId = (typeof localStorage !== "undefined" && localStorage.getItem("viceGridLevel")) || "der_kessel";
const ACTIVE = LEVEL_DATA[activeLevelId] || LEVEL_DATA.der_kessel;

export const DISTRICT = ACTIVE.district;
export const MISSION = ACTIVE.mission;
export const DIALOGS = ACTIVE.dialogs;
export const PLAYER_NAME = ACTIVE.playerName;

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
