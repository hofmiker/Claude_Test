// ============================================================================
// The Coastal Courier — Story-, Phasen- und Zeit-Daten
// Getrennt von main.js (Engine/Rendering/Physik), wie in gta/ (Vice Grid):
// main.js importiert diese Konstanten und enthält selbst keinen Story-Text.
// ============================================================================

export const PLAYER_NAME = "Marcus";

// Sprecherfarben fürs Dialog-Chat-UI (dchat-Bubbles in main.js), ein Farbton
// pro benannter Figur, Marcus (Spieler) sitzt rechts in Pink wie in Vice Grid.
export const SPEAKER_STYLE = {
  Marcus:     { color: "#ff2e88", side: "me" },
  Dante:      { color: "#6ea8ff" },
  Viktor:     { color: "#ffb347" },
  Mechaniker: { color: "#7CFC7A" },
  Elaine:     { color: "#ffd54a" },
};

// Phasen-Reihenfolge — main.js' Zustandsmaschine läuft diese Liste linear
// durch. Jede Phase weiß, welches Transportmittel aktiv ist, wo die Kamera-
// Ziel-Zone liegt und welche Spielzeit (In-Game-Uhr) als Basis gilt, sobald
// die Phase beginnt (main.js addiert die seit Phasenbeginn vergangene
// Realzeit * CLOCK_TICK_PER_SEC drauf — siehe main.js `updateClock()`).
export const PHASES = {
  CALL_DANTE:    { id: "CALL_DANTE",    clockBase: "13:30", vehicle: "cabrio" },
  DRIVE_VILLA:   { id: "DRIVE_VILLA",   clockBase: "13:34", vehicle: "cabrio" },
  DIALOG_VIKTOR: { id: "DIALOG_VIKTOR", clockBase: "14:00", vehicle: "cabrio" },
  DRIVE_HARBOR:  { id: "DRIVE_HARBOR",  clockBase: "14:15", vehicle: "cabrio" },
  DIALOG_MECH:   { id: "DIALOG_MECH",   clockBase: "14:45", vehicle: "cabrio" },
  BOAT_CHASE:    { id: "BOAT_CHASE",    clockBase: "14:50", vehicle: "boat" },
  DOCK_BRIDGE:   { id: "DOCK_BRIDGE",   clockBase: "15:14", vehicle: "boat" },
  FOOT_BRIDGE:   { id: "FOOT_BRIDGE",   clockBase: "15:15", vehicle: "foot" },
  LIMO_CUTSCENE: { id: "LIMO_CUTSCENE", clockBase: "15:40", vehicle: "limo" },
  PIER_ARRIVE:   { id: "PIER_ARRIVE",   clockBase: "15:58", vehicle: "foot" },
  DIALOG_ELAINE: { id: "DIALOG_ELAINE", clockBase: "15:58", vehicle: "foot" },
  WIN:           { id: "WIN",           clockBase: "16:00", vehicle: "foot" },
};

// 1 Real-Sekunde = 1 Spielminute -- schnell genug, um die Zeit-Druck-Prämisse
// spürbar zu machen, langsam genug, dass eine ~30s-Fahrt sich nicht wie eine
// einzige Uhr-Explosion anfühlt.
export const CLOCK_TICK_PER_SEC = 1;

// Erwartete Ankunftszeit bei Elaine laut Verabredung — für den "X zu spät"-
// Text im finalen Dialog/Sieg-Screen.
export const DATE_TIME = "17:00";

export const DIALOGS = {
  call_dante: {
    lines: [
      { speaker: "", text: "Marcus schaut aufs Handy — eine Nachricht von Elaine. Er grinst, tippt kurz zurück." },
      { speaker: "", text: "Das zweite Handy klingelt. DANTE." },
      { speaker: "Dante", text: "Du bist bereit?" },
      { speaker: "Marcus", text: "Immer bereit, D. Was ist der Auftrag?" },
      { speaker: "Dante", text: "Abholen in Malibu. Villa. Ein Typ namens Viktor. Er hat was für dich. Bringst es zum Hafen. Leicht. Schnell. Keine Probleme." },
      { speaker: "Marcus", text: "Wie lange?" },
      { speaker: "Dante", text: "45 Minuten. Komplett." },
      { speaker: "Marcus", text: "Kein Problem. Ich bin hinterher frei, ja?" },
      { speaker: "Dante", text: "Ja. Das ist dein letzter Job für mich. Nach heute? Du kannst dein Leben wieder machen." },
      { speaker: "Marcus", text: "Perfekt. Ich bin in 20." },
      { speaker: "Dante", text: "Und Marcus... keine Fehler. Verstanden?" },
      { speaker: "Marcus", text: "Verstanden, D. Immer sauber." },
      { speaker: "", text: "Handy aus. Radio lauter. Marcus fährt los — zu selbstsicher, zu jung, zu optimistisch." },
    ],
  },

  talk_viktor: {
    lines: [
      { speaker: "Viktor", text: "Du bist Marcus?" },
      { speaker: "Marcus", text: "Der bin ich. Was hast du für mich?" },
      { speaker: "Viktor", text: "Das hier. Kunstwerke. Sehr teuer. Sehr heiß geklaut. Du bringst das zu Dante, ja?" },
      { speaker: "Marcus", text: "Kunstzeug? Ich dachte, das ist—" },
      { speaker: "Viktor", text: "Nicht denken. Fahren. Polizei wurde angerufen. Jemand hat den Raub gemeldet. Du hast vielleicht 30 Minuten, bevor sie hier sind." },
      { speaker: "Marcus", text: "Keine Panik. Ich hab das. Ich bin weg in 2 Minuten." },
      { speaker: "Viktor", text: "Das ist alles. Es ist wertvoll. Pass auf." },
      { speaker: "Marcus", text: "Bin weg." },
      { speaker: "Viktor", text: "Fahr schnell!" },
      { speaker: "", text: "Polizeisirene in der Ferne — noch weit weg, aber näher werdend." },
    ],
  },

  talk_mechanic: {
    lines: [
      { speaker: "Mechaniker", text: "Polizei kommt. Du musst raus aufs Wasser." },
      { speaker: "Marcus", text: "Wie weit?" },
      { speaker: "Mechaniker", text: "Golden Gate Bridge. Dante hat einen Kontakt da. Du parkst das Boot unter der Brücke, rennst zu Fuß, und er pickt dich auf mit einer Limo." },
      { speaker: "Marcus", text: "Wie lange? Das Boot?" },
      { speaker: "Mechaniker", text: "25 Minuten bis Brücke. Zu Fuß? 5 Minuten. Dann weit weg." },
      { speaker: "Marcus", text: "Alles klar. Und wenn Police verfolgt?" },
      { speaker: "Mechaniker", text: "Boot ist schneller. Sie kommen nicht ran. Aber bleib auf dem Wasser." },
      { speaker: "Marcus", text: "Danke, Mann." },
      { speaker: "Mechaniker", text: "Viel Glück." },
      { speaker: "", text: "Sirenen. Blaulicht springt an. Marcus startet das Motorboot." },
    ],
  },

  dock_bridge: {
    lines: [
      { speaker: "", text: "Die Polizeischiffe fallen zurück — zu niedrig unter der Brücke. Marcus legt an." },
      { speaker: "Marcus", text: "15:15. Elaine wartet um 17:00. Also — laufen." },
    ],
  },

  phone_elaine: {
    lines: [
      { speaker: "Elaine", text: "Bist du noch unterwegs? 😕" },
    ],
  },

  limo_pickup: {
    lines: [
      { speaker: "", text: "Am Fuß der Brücke wartet eine weiße Art-Deco-Limousine. Der Fahrer sagt nichts, nickt nur." },
      { speaker: "Marcus", text: "Sausalito. So schnell es geht." },
      { speaker: "", text: "Der Fahrer nickt. Die Limo rollt nach Norden." },
    ],
  },

  elaine_pier: {
    lines: [
      { speaker: "Elaine", text: "Marcus?" },
      { speaker: "Marcus", text: "Hey... Ja, hey." },
      { speaker: "Elaine", text: "Du bist gekommen. Du bist eine Stunde zu spät." },
      { speaker: "Marcus", text: "Ich weiß, das tut mir leid – es gab... Verkehr, und—" },
      { speaker: "Elaine", text: "Marcus. Du siehst aus, als würdest du gerade von einer Bank fliehen." },
      { speaker: "Marcus", text: "...Ich bin einfach verzögert. Das tut mir echt weh." },
      { speaker: "Elaine", text: "Ich mag dich. Wirklich. Deinen Charme, deinen Humor, wie du fährst, deine Art, die Welt zu sehen... Aber ich sehe etwas in dir, das nicht hier ist. Du bist nicht wirklich bei mir. Du bist... woanders." },
      { speaker: "Marcus", text: "Das stimmt nicht. Ich bin hier. Jetzt. Mit dir. Das ist das Realste, was ich habe." },
      { speaker: "Elaine", text: "Ist es? Weil du eine Stunde zu spät kommst, nass, außer Atem, und dein Handy klingelt nicht mal – es ist aus. Das sagt mir, dass du gerade etwas gemacht hast, das... falsch ist." },
      { speaker: "", text: "Stille. Marcus kann nicht lügen. Er nimmt ihre Hand." },
      { speaker: "Marcus", text: "...Ich bin kein guter Mensch. Nicht jetzt. Vielleicht nie. Aber wenn du mir eine Chance gibst, kann ich vielleicht besser werden. Mit dir." },
      { speaker: "Elaine", text: "Das ist das erste echte, was du mir heute gesagt hast." },
      { speaker: "", text: "Stille. Wind. Wellen." },
      { speaker: "Elaine", text: "Also... haben wir eine zweite Chance? Ein echtes Date? Nächste Woche?" },
      { speaker: "Marcus", text: "Ja. Nächste Woche. Und ich schwöre dir – ich bin pünktlich. Früher sogar." },
      { speaker: "Elaine", text: "Wir sehen." },
      { speaker: "", text: "Sie halten sich bei den Händen. Blick aufs Meer, die Golden Gate Bridge am Horizont. Sonnenuntergang." },
    ],
  },
};

// Waypoint-/Ziel-Text pro Phase — main.js zeigt das oben links im HUD
// (#objectiveText), zusammen mit der Distanz zum aktiven Marker.
export const OBJECTIVES = {
  DRIVE_VILLA:  { text: "Fahre zur Villa in Malibu", marker: "villa",  color: "#ffcc00" },
  DRIVE_HARBOR: { text: "Bring das Paket zum Hafen", marker: "harbor", color: "#ffcc00" },
  BOAT_CHASE:   { text: "Fahre unter die Golden Gate Bridge", marker: "bridgeDock", color: "#ffcc00" },
  FOOT_BRIDGE:  { text: "Renn über die Brücke — Limo wartet am Nordende", marker: "bridgeEnd", color: "#ffcc00" },
  PIER_ARRIVE:  { text: "Erreiche die Pier in Sausalito", marker: "pier", color: "#ffcc00" },
};

export const WIN_SCREEN = {
  title: "Zweite Chance",
  subtitle: "Nächste Woche. Ein echtes Date. Pünktlich, versprochen.",
  restartLabel: "Nochmal",
};
