// Gebäudeplan als reine Daten — keine Three.js-Aufrufe. build/house-builder.js
// liest diese Datei und baut daraus die Szene; floorplan.js liest NUR diese
// Datei und rendert daraus den SVG-Grundriss. 1 Welteinheit = 1 Meter.

export const X_MIN = -5, X_MAX = 5, Z_MIN = -4, Z_MAX = 4;
export const WALL_H = 2.6;          // Erdgeschoss-Wandhöhe
export const FLOOR2_Y = 2.7;        // Höhe des Dachgeschoss-Bodens
export const KNEE_H = 1.3;          // Kniestockhöhe im OG, bevor die Dachschräge beginnt
export const RIDGE_H = 3.0;         // Firsthöhe über FLOOR2_Y, bei z=0
export const UPPER_H = FLOOR2_Y + KNEE_H;
export const CORR_X_MIN = -1.3, CORR_X_MAX = 1.3;

// Die Treppe sitzt nahe dem hinteren (Haustür-)Ende des Gangs, sodass der
// restliche Flur im OG ein durchgehendes Stück ist, von der Treppe aus in
// einer Richtung erreichbar — keine Notwendigkeit, über die Treppenöffnung
// zurückzuqueren, um ein Zimmer zu erreichen.
export const STAIR_Z_START = -3.5, STAIR_Z_END = -1.3;
// Die Treppe ist fest an der Westwand des Gangs, schmaler als der (nun viel
// breitere) Gang selbst, sodass ein Durchgang auf der Ostseite bleibt und der
// Gang passierbar bleibt, ohne auf die Rampe gezwungen zu werden.
export const STAIR_X_MIN = CORR_X_MIN + 0.1, STAIR_X_MAX = STAIR_X_MIN + 1.3;

// Toilette-Maße relativ zur Ostwand des Gangs, damit der Raum seine eigenen
// Proportionen behält (1.85m breit, Tür 0.35m von der Gangwand, 0.7m breit)
// unabhängig von der Gangbreite.
export const TOILET_X_MAX = CORR_X_MAX + 1.85, TOILET_DOOR_HINGE = CORR_X_MAX + 0.35;

export const BOUNDS = { minX: X_MIN, maxX: X_MAX, minZ: Z_MIN, maxZ: Z_MAX };

export const leftX = X_MIN - 0.075, rightX = X_MAX + 0.075;
export const backZ = Z_MIN - 0.075, frontZ = Z_MAX + 0.075;
export const spanX = rightX - leftX, spanZ = frontZ - backZ;

export const WALL_LIGHT = 0xf2ebe0, WALL_KITCHEN = 0xeef2ea, WALL_KID2 = 0xdff0f7, WALL_KID1 = 0xf7e6ef, WALL_PARENT = 0xece4d8;

// ---------- Räume (treibt sowohl die Bodenflächen als auch die Grundriss-Rects) ----------
export const ROOMS_GROUND = [
    { id: 'wohnzimmer', label: 'Wohnzimmer', xMin: X_MIN, xMax: CORR_X_MIN, zMin: Z_MIN, zMax: Z_MAX, material: 'plank', hue: 0xc79a63, seed: 7 },
    { id: 'flur', label: 'Flur', xMin: CORR_X_MIN, xMax: CORR_X_MAX, zMin: Z_MIN, zMax: Z_MAX, material: 'plank', hue: 0xb98a55, seed: 3 },
    { id: 'kueche', label: 'Küche', xMin: CORR_X_MAX, xMax: X_MAX, zMin: Z_MIN, zMax: 0.3, material: 'tile', hue: 0xe9e6dc, hue2: 0xd8d3c4 },
    { id: 'toilette', label: 'Toilette', xMin: CORR_X_MAX, xMax: TOILET_X_MAX, zMin: 0.3, zMax: 2.3, material: 'tile', hue: 0xdfeef2, hue2: 0xc9dfe6 },
    { id: 'kueche-rest', label: '', xMin: TOILET_X_MAX, xMax: X_MAX, zMin: 0.3, zMax: Z_MAX, material: 'plank', hue: 0xc79a63, seed: 11 },
    { id: 'kueche-rest2', label: '', xMin: CORR_X_MAX, xMax: TOILET_X_MAX, zMin: 2.3, zMax: Z_MAX, material: 'plank', hue: 0xc79a63, seed: 13 },
];

export const ROOMS_UPPER = [
    { id: 'eltern', label: 'Elternschlafzimmer', xMin: X_MIN, xMax: CORR_X_MIN, zMin: Z_MIN, zMax: 1.0, material: 'plank', hue: 0xcdb290, seed: 19 },
    { id: 'kinderzimmer1', label: 'Kinderzimmer 1', xMin: X_MIN, xMax: CORR_X_MIN, zMin: 1.0, zMax: Z_MAX, material: 'plank', hue: 0xdcb37e, seed: 23 },
    { id: 'bad', label: 'Bad', xMin: CORR_X_MAX, xMax: X_MAX, zMin: Z_MIN, zMax: -0.5, material: 'tile', hue: 0xe6f2f5, hue2: 0xd2e6ea },
    { id: 'kinderzimmer2', label: 'Kinderzimmer 2', xMin: CORR_X_MAX, xMax: X_MAX, zMin: -0.5, zMax: Z_MAX, material: 'plank', hue: 0xdcb37e, seed: 29 },
    // Durchgang neben der (schmaleren) Treppe: eigene Bodenfläche, damit der
    // Streifen neben dem Treppenschacht nicht über einer Leere schwebt.
    { id: 'og-durchgang', label: '', xMin: STAIR_X_MAX, xMax: CORR_X_MAX, zMin: STAIR_Z_START, zMax: STAIR_Z_END, material: 'plank', hue: 0xb98a55, seed: 31 },
];
// Treppenabsatz: ein durchgehendes Stück vom oberen Treppenende bis zur
// Frontwand (der Treppenschacht darunter hat keine OG-Bodenfläche). Bleibt
// ein Literal in house-builder.js — kein Raum/keine Wand im ROOMS-Sinn.
export const LANDING = { xMin: CORR_X_MIN, xMax: CORR_X_MAX, zMin: STAIR_Z_END, zMax: Z_MAX, color: 0xb98a55 };

// Deckenplatten unter dem OG-Boden (schließt die Lücke Erdgeschoss/OG optisch,
// außer über dem offenen Treppenschacht).
export const CEILING_SLABS = [
    [X_MIN, CORR_X_MIN, Z_MIN, Z_MAX],                     // Wohnzimmer
    [CORR_X_MIN, CORR_X_MAX, Z_MIN, STAIR_Z_START],        // Flur-Vorraum vor der Treppe
    [CORR_X_MIN, STAIR_X_MIN, STAIR_Z_START, STAIR_Z_END], // schmaler Streifen wandseitig neben der Treppe
    [STAIR_X_MAX, CORR_X_MAX, STAIR_Z_START, STAIR_Z_END], // Durchgang neben der Treppe
    [CORR_X_MIN, CORR_X_MAX, STAIR_Z_END, Z_MAX],          // unter dem Treppenabsatz
    [CORR_X_MAX, X_MAX, Z_MIN, Z_MAX],                     // Küche
];

// ---------- Außen-/Strukturwände Erdgeschoss ----------
// Jeder Eintrag: axis = Achse, entlang der die Wand läuft ('z' = Wand bei
// festem x, läuft entlang z; 'x' = Wand bei festem z, läuft entlang x).
// `windows`: ein Array pro Wand — der Builder schneidet daraus das Loch UND
// zeichnet daraus das Glas (keine doppelte Koordinatenpflege mehr).
// `glassOffset`: exakter Versatz der Scheibe von `at` (Wanddicke-abhängig,
// je nach Seite nach innen oder außen versetzt wie im Original).
export const EXT_WALLS_GROUND = [
    {
        axis: 'z', at: leftX, from: backZ, to: frontZ, thickness: 0.15, color: WALL_LIGHT, glassOffset: -0.01,
        windows: [{ c: -2.3, w: 1.1, h: 1.3, y: 1.55 }, { c: 0.3, w: 1.1, h: 1.3, y: 1.55 }, { c: 2.6, w: 1.1, h: 1.3, y: 1.55 }],
    },
    {
        axis: 'z', at: rightX, from: backZ, to: frontZ, thickness: 0.15, color: WALL_KITCHEN, glassOffset: 0.01,
        windows: [{ c: -3.1, w: 0.9, h: 1.1, y: 1.55 }, { c: 3.0, w: 0.9, h: 1.1, y: 1.55 }],
    },
    // Rückwand: als zwei Läufe (nicht als Fenster-Loch!), damit die Kollision
    // pro Lauf nur seine eigene Spanne abdeckt — der Türbereich bleibt so eine
    // echte begehbare Lücke statt einer einzigen Obstacle-Box ohne x-Lücke.
    { axis: 'x', at: backZ, from: leftX, to: -0.35, thickness: 0.15, color: WALL_LIGHT, glassOffset: 0.01, windows: [] },
    {
        axis: 'x', at: backZ, from: 0.35, to: rightX, thickness: 0.15, color: WALL_LIGHT, glassOffset: 0.01,
        windows: [{ c: 2.7, w: 1.1, h: 1.1, y: 1.55 }],
    },
    {
        axis: 'x', at: frontZ, from: leftX, to: rightX, thickness: 0.15, color: WALL_LIGHT, glassOffset: 0.01,
        windows: [{ c: -2.7, w: 1.1, h: 1.3, y: 1.55 }, { c: -0.05, w: 0.7, h: 0.9, y: 1.9 }],
    },
];
// Sturz-Stück über der Haustür — schließt das Loch bis zur Decke, rein
// visuell, kein eigenes Obstacle nötig (der Türbereich muss bei jeder Höhe
// kollisionsfrei bleiben, siehe EXT_WALLS_GROUND-Kommentar oben).
export const DOOR_LINTEL_GROUND = { x: 0, z: backZ, width: 0.7, thickness: 0.15, yFrom: 2.1, yTo: WALL_H, color: WALL_LIGHT };

// ---------- Gang-Trennwände (mit Türlücken) ----------
export const CORRIDOR_WALLS_GROUND = [
    { x: CORR_X_MIN, from: backZ, to: -1.1, color: WALL_LIGHT },
    { x: CORR_X_MIN, from: 0.1, to: frontZ, color: WALL_LIGHT },
    { x: CORR_X_MAX, from: backZ, to: -1.1, color: WALL_KITCHEN },
    { x: CORR_X_MAX, from: 0.1, to: frontZ, color: WALL_KITCHEN },
];
// Breite, türlose Durchgänge (nur Zargen, kein Flügel) zwischen Gang und
// Wohnzimmer/Küche. Die Treppenrampe belegt z[STAIR_Z_START, STAIR_Z_END],
// beide Öffnungen liegen sicher dahinter, etwa in der Gangmitte.
export const ARCHES_GROUND = [
    { x: CORR_X_MIN, from: -1.1, to: 0.1, color: WALL_LIGHT },
    { x: CORR_X_MAX, from: -1.1, to: 0.1, color: WALL_KITCHEN },
];

// Toilette: vollständig umschlossen bis auf eine Tür (Südseite, zur Küche/
// zum Essbereich hin) — jede Wandlücke exakt auf die Türzarge zugeschnitten.
export const TOILET_WALLS_GROUND = [
    { axis: 'z', at: TOILET_X_MAX, from: 0.3, to: 2.3, thickness: 0.1 },                              // Ostwand
    { axis: 'x', at: 2.3, from: CORR_X_MAX, to: TOILET_X_MAX, thickness: 0.1 },                        // Nordwand, durchgehend
    { axis: 'x', at: 0.3, from: CORR_X_MAX, to: TOILET_DOOR_HINGE, thickness: 0.1 },                   // Südwand, westlich der Tür
    { axis: 'x', at: 0.3, from: TOILET_DOOR_HINGE + 0.7, to: TOILET_X_MAX, thickness: 0.1 },           // Südwand, östlich der Tür
];

export const DOORS_GROUND = [
    { axis: 'x', z: backZ, hinge: -0.35, hingeSign: 1, width: 0.7, height: 2.0, openAngle: 0, wallDepth: 0.15, frameColor: 0x6b4429, doorColor: 0x5a3a24, baseY: 0 },
    { axis: 'x', z: 0.3, hinge: TOILET_DOOR_HINGE, hingeSign: 1, width: 0.7, height: 2.0, openAngle: 0, wallDepth: 0.1, frameColor: 0x8a5a3a, doorColor: 0xdfeef2, baseY: 0 },
];

// ---------- Treppe ----------
export const STAIRS = { steps: 16, treadColor: 0x9c6b3f, railColor: 0x6b4429 };

// ---------- Obergeschoss-Struktur ----------
// Giebelwände: Pentagon-Profil (Shape+ExtrudeGeometry), eigener Typ, kein
// Box-Wand-Derivat. windows: wie oben — ein Eintrag deckt Loch UND Glas ab.
export const GABLES_UPPER = [
    { x: leftX - 0.075, color: WALL_PARENT, windows: [{ c: -2.3, w: 0.9, h: 1.0, y: FLOOR2_Y + 0.75 }, { c: 2.3, w: 0.9, h: 1.0, y: FLOOR2_Y + 0.75 }] },
    { x: rightX - 0.075, color: WALL_KID2, windows: [{ c: -2.9, w: 0.8, h: 0.9, y: FLOOR2_Y + 0.75 }, { c: 2.3, w: 0.8, h: 0.9, y: FLOOR2_Y + 0.75 }] },
];
// Kniestockwände an der Traufe (z = ±4), volle Länge, eine feste Höhe.
export const KNEE_WALLS_UPPER = [
    { z: backZ, color: WALL_PARENT },
    { z: frontZ, color: WALL_KID1 },
];

// Innentrennwände im OG, folgen in Stufen (Z-Läufe) bzw. flach (X-Läufe) der
// Dachschräge über upperCeilingY() — siehe Funktion unten. Die Treppe sitzt
// an einem Ende des Gangs (z < STAIR_Z_END); jede Zimmertür-Lücke liegt
// deshalb vollständig bei z > STAIR_Z_END, immer auf dem flachen Absatz.
export const UPPER_PARTITIONS_Z = [
    // Westwand: Türen zu Eltern (hinten) und Kinderzimmer 1 (vorne)
    { x: CORR_X_MIN, from: backZ, to: -1.1, color: WALL_PARENT },
    { x: CORR_X_MIN, from: -0.4, to: 1.0, color: WALL_PARENT },
    { x: CORR_X_MIN, from: 1.0, to: 1.6, color: WALL_KID1 },
    { x: CORR_X_MIN, from: 2.4, to: frontZ, color: WALL_KID1 },
    // Ostwand: Türen zu Bad (hinten) und Kinderzimmer 2 (vorne)
    { x: CORR_X_MAX, from: backZ, to: -1.2, color: WALL_KID2 },
    { x: CORR_X_MAX, from: -0.6, to: 1.6, color: WALL_KID2 },
    { x: CORR_X_MAX, from: 2.3, to: frontZ, color: WALL_KID2 },
];
export const UPPER_PARTITIONS_X = [
    { z: 1.0, from: X_MIN, to: CORR_X_MIN, color: WALL_PARENT },   // Eltern <-> Kinderzimmer 1
    { z: -0.5, from: CORR_X_MAX, to: X_MAX, color: WALL_KID2 },    // Bad <-> Kinderzimmer 2
];

export const DOORS_UPPER = [
    { axis: 'z', x: CORR_X_MIN, hinge: -1.1, hingeSign: 1, width: 0.7, height: KNEE_H + 0.6, openAngle: -Math.PI / 2, wallDepth: 0.1, doorColor: 0xdccdb8, baseY: FLOOR2_Y },
    { axis: 'z', x: CORR_X_MIN, hinge: 1.6, hingeSign: 1, width: 0.8, height: KNEE_H + 0.6, openAngle: -Math.PI / 2, wallDepth: 0.1, doorColor: 0xf3d7e6, baseY: FLOOR2_Y },
    { axis: 'z', x: CORR_X_MAX, hinge: -1.2, hingeSign: 1, width: 0.6, height: KNEE_H + 0.6, openAngle: -Math.PI / 2, wallDepth: 0.1, doorColor: 0xdcecef, baseY: FLOOR2_Y },
    { axis: 'z', x: CORR_X_MAX, hinge: 1.6, hingeSign: 1, width: 0.7, height: KNEE_H + 0.6, openAngle: -Math.PI / 2, wallDepth: 0.1, doorColor: 0xbfe0ea, baseY: FLOOR2_Y },
];

export const SKYLIGHTS = [
    { x: -2.7, z: -2.2, zSign: -1 },   // Elternschlafzimmer
    { x: -2.7, z: 2.2, zSign: 1 },     // Kinderzimmer 1
    { x: 2.5, z: -2.8, zSign: -1 },    // Bad
    { x: 2.7, z: 2.2, zSign: 1 },      // Kinderzimmer 2
];

// Deckenhöhe unter der Dachschräge bei gegebenem z (KNEE_H an der Traufe,
// steigt zu RIDGE_H am First bei z=0). Sowohl für OG-Pendelleuchten als auch
// — entscheidend — für die Innentrennwände: eine Wand, die nur bis KNEE_H
// reicht, lässt abseits der Traufe eine bis zu meterhohe Lücke zur echten
// Dachschräge offen ("die Wand hört einfach auf").
export function upperCeilingY(z) {
    const t = Math.abs(z) / 4;
    return FLOOR2_Y + RIDGE_H - t * (RIDGE_H - KNEE_H);
}

export function inStairwell(x, z) {
    return x > STAIR_X_MIN && x < STAIR_X_MAX && z > STAIR_Z_START && z < STAIR_Z_END;
}
