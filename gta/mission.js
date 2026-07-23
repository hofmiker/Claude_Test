// mission.js — Story-, Wegpunkt- und Dialog-Config für "Vice Grid: Der Kessel"
// Reines Datenmodul, keine Three.js-Abhängigkeit. In main.js importieren:
//   import { MISSION, POLICE, DISTRICT } from "./mission.js";
//
// WICHTIG — KOORDINATEN:
//   Alle "pos"-Werte sind [x, z] in Weltkoordinaten (Boden-Ebene, y kommt aus deinem Terrain).
//   Die Zahlen unten sind PLATZHALTER. Setz sie auf echte Punkte deiner Karte
//   (z.B. per Klick eine Koordinate loggen und hier eintragen).
//   triggerRadius ist der Radius in Weltmetern, ab dem die Zone auslöst.

export const DISTRICT = {
  name: "Der Kessel",
  timeOfDay: "night",        // Nacht, Regen, Neon-Noir
  weather: "rain",
  fogColor: "#0a0e14",
  fogNear: 20,
  fogFar: 140,
  ambientLoop: "sfx/rain_city_loop.ogg", // optional
};

// Kleine Helfer-Konstanten, damit main.js Zonen-Labels konsistent halten kann
export const ACTION = {
  TALK: "Reden",
  TAKE: "Nehmen",
  ENTER: "Einsteigen",
  DELIVER: "Übergeben",
};

// Die Mission ist eine geordnete Liste von Schritten (State Machine).
// main.js hält einen Index "currentStep". Ist die Bedingung eines Schritts
// erfüllt (Zone erreicht / Item genommen), wird advance() aufgerufen.
export const MISSION = {
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

    // 1 — FIND_CONTACT: zu Lenas Werkstatt fahren, dann reden
    {
      id: "FIND_CONTACT",
      objective: "Fahre zu Lenas Werkstatt",
      waypoint: {
        pos: [-40, 55],          // PLATZHALTER: Südblocks / Werkstatt-Ecke
        label: "Lenas Werkstatt",
        color: "#ffcc00",
      },
      triggerRadius: 6,
      action: ACTION.TALK,        // Kontext-Button "F" zeigt "Reden"
      dialog: "talk_lena",        // startet beim Betreten + F
    },

    // 2 — GO_TO_TARGET: zum Wohnblock am Kanal
    {
      id: "GO_TO_TARGET",
      objective: "Fahre zum Wohnblock am Kanal",
      waypoint: {
        pos: [70, 90],           // PLATZHALTER: Süden, nahe Kanal
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
        pos: [72, 92],           // PLATZHALTER: exakte Koffer-Position
        label: "Koffer",
        action: ACTION.TAKE,
      },
      triggerRadius: 3,
      dialog: "grab_scene",       // kurze Schrei-Zeile + Alarm
      onComplete: "startPolice",  // main.js aktiviert POLICE + "GESUCHT"-Anzeige
    },

    // 4 — ESCAPE: zur Parkgarage unter der Hochstraße, Polizei jagt
    {
      id: "ESCAPE",
      objective: "Häng die Polizei ab und erreiche die Parkgarage",
      waypoint: {
        pos: [-85, -70],         // PLATZHALTER: Norden, unter Hochstraße
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
    subtitle: "+$300 — Willkommen zurück, Marek.",
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
export const DIALOGS = {
  call_dragan: {
    speaker: "Anruf",
    lines: [
      { speaker: "Dragan", text: "Marek. Ein Kurier namens Vess ist mit einem Koffer abgehauen." },
      { speaker: "Dragan", text: "Find ihn. Hol den Koffer. Keine Zeugen." },
      { speaker: "Marek", text: "Und mein Schnitt?" },
      { speaker: "Dragan", text: "Deine Schulden schrumpfen. Fahr los." },
    ],
  },

  talk_lena: {
    speaker: "Lena",
    lines: [
      { speaker: "Lena", text: "Marek Sokol. Dachte, du fährst nicht mehr für Dragan." },
      { speaker: "Marek", text: "Wo ist Vess?" },
      { speaker: "Lena", text: "Alter Wohnblock am Kanal. Was ist im Koffer?" },
      { speaker: "Marek", text: "Nichts, das dich was angeht." },
      { speaker: "Lena", text: "Dann viel Glück. Du wirst es brauchen." },
    ],
  },

  grab_scene: {
    speaker: "",
    lines: [
      { speaker: "Marek", text: "Da ist er." },
      { speaker: "Vess", text: "Nicht der Koffer — du weißt nicht, was du da tust!" },
      { speaker: "", text: "Alarm. Blaulicht springt an." },
    ],
  },

  deliver_twist: {
    speaker: "Dragan",
    lines: [
      { speaker: "Dragan", text: "Sauber gefahren." },
      { speaker: "", text: "Er öffnet den Koffer. Kein Geld." },
      { speaker: "Dragan", text: "Namen. Eine Liste. Informanten." },
      { speaker: "Marek", text: "Vess wollte aussteigen." },
      { speaker: "Dragan", text: "Jetzt kann er das nicht mehr. Das war deine Bewerbung, Marek." },
    ],
  },
};

// Polizei / Fahndung — binär statt Sterne.
export const POLICE = {
  // Startet, wenn Schritt GRAB_ITEM abgeschlossen ist (onComplete: "startPolice").
  startAtStep: "GRAB_ITEM",

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
