// Dev-Tool: liest NUR data/house-plan.js (kein THREE, kein build/content/gameplay)
// und rendert daraus einen SVG-Grundriss. Nur Ansicht — keine Bearbeitung,
// kein Zurückschreiben in die Datendatei.
import * as P from './data/house-plan.js';

const PX = 60; // Pixel pro Meter
const svgNS = 'http://www.w3.org/2000/svg';
const svgX = (x) => (x - P.leftX) * PX;
const svgY = (z) => (z - P.backZ) * PX;
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

function el(tag, attrs) {
    const e = document.createElementNS(svgNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
}

function addRoom(svg, room) {
    svg.appendChild(el('rect', {
        x: svgX(room.xMin), y: svgY(room.zMin),
        width: (room.xMax - room.xMin) * PX, height: (room.zMax - room.zMin) * PX,
        fill: hex(room.hue ?? 0xe8e2d6), 'fill-opacity': 0.5, class: 'room',
    }));
    if (room.label) {
        svg.appendChild(el('text', {
            x: (svgX(room.xMin) + svgX(room.xMax)) / 2,
            y: (svgY(room.zMin) + svgY(room.zMax)) / 2,
            'text-anchor': 'middle', 'dominant-baseline': 'middle', class: 'room-label',
        })).textContent = room.label;
    }
}

// axis 'z' = Wand läuft entlang z bei festem x; axis 'x' = Wand läuft entlang x bei festem z.
function addWall(svg, w) {
    const strokeW = (w.thickness ?? 0.1) * PX;
    const [x1, y1, x2, y2] = w.axis === 'z'
        ? [svgX(w.at), svgY(w.from), svgX(w.at), svgY(w.to)]
        : [svgX(w.from), svgY(w.at), svgX(w.to), svgY(w.at)];
    svg.appendChild(el('line', { x1, y1, x2, y2, class: 'wall', 'stroke-width': strokeW }));
    (w.windows ?? []).forEach((win) => addWindowTick(svg, w.axis, w.at, win.c));
}

function addWindowTick(svg, axis, at, c) {
    const t = 8; // Tick-Halblänge in px, quer zur Wand
    if (axis === 'z') {
        svg.appendChild(el('line', { x1: svgX(at) - t, y1: svgY(c), x2: svgX(at) + t, y2: svgY(c), class: 'window' }));
    } else {
        svg.appendChild(el('line', { x1: svgX(c), y1: svgY(at) - t, x2: svgX(c), y2: svgY(at) + t, class: 'window' }));
    }
}

// Türsymbol: Blatt (90°-aufgeschwenkt, schematisch — Schwenkrichtung ist hier
// vereinfacht immer +x/+z, nicht die tatsächliche openAngle aus dem Spiel)
// + Viertelkreis-Schwenkbogen.
function addDoor(svg, d) {
    let hx, hz, farX, farZ, tipX, tipZ;
    if (d.axis === 'x') {
        hx = d.hinge; hz = d.z;
        farX = d.hinge + d.hingeSign * d.width; farZ = d.z;
        tipX = d.hinge; tipZ = d.z + d.width;
    } else {
        hx = d.x; hz = d.hinge;
        farX = d.x; farZ = d.hinge + d.hingeSign * d.width;
        tipX = d.x + d.width; tipZ = d.hinge;
    }
    const r = d.width * PX;
    svg.appendChild(el('line', { x1: svgX(hx), y1: svgY(hz), x2: svgX(tipX), y2: svgY(tipZ), class: 'door-leaf' }));
    svg.appendChild(el('path', {
        d: `M ${svgX(farX)} ${svgY(farZ)} A ${r} ${r} 0 0 1 ${svgX(tipX)} ${svgY(tipZ)}`,
        class: 'door-arc', fill: 'none',
    }));
}

function addStairs(svg) {
    svg.appendChild(el('rect', {
        x: svgX(P.STAIR_X_MIN), y: svgY(P.STAIR_Z_START),
        width: (P.STAIR_X_MAX - P.STAIR_X_MIN) * PX, height: (P.STAIR_Z_END - P.STAIR_Z_START) * PX,
        class: 'stairs',
    }));
    const n = 8;
    for (let i = 1; i < n; i++) {
        const z = P.STAIR_Z_START + (i / n) * (P.STAIR_Z_END - P.STAIR_Z_START);
        svg.appendChild(el('line', { x1: svgX(P.STAIR_X_MIN), y1: svgY(z), x2: svgX(P.STAIR_X_MAX), y2: svgY(z), class: 'stairs-hatch' }));
    }
}

function buildFloorSvg(title, rooms, walls, arches, doors, stairsFn) {
    const wrap = document.createElement('div');
    wrap.className = 'panel';
    const h2 = document.createElement('h2');
    h2.textContent = title;
    wrap.appendChild(h2);
    const svg = el('svg', { viewBox: `0 0 ${P.spanX * PX} ${P.spanZ * PX}`, width: P.spanX * PX, height: P.spanZ * PX });
    rooms.forEach((r) => addRoom(svg, r));
    if (stairsFn) stairsFn(svg);
    walls.forEach((w) => addWall(svg, w));
    arches.forEach((a) => svg.appendChild(el('line', { x1: svgX(a.x), y1: svgY(a.from), x2: svgX(a.x), y2: svgY(a.to), class: 'arch' })));
    doors.forEach((d) => addDoor(svg, d));
    wrap.appendChild(svg);
    return wrap;
}

const root = document.getElementById('floorplan-root');

// ---------- Erdgeschoss ----------
const groundWalls = [
    ...P.EXT_WALLS_GROUND,
    ...P.CORRIDOR_WALLS_GROUND.map((w) => ({ axis: 'z', at: w.x, from: w.from, to: w.to, thickness: 0.1, windows: [] })),
    ...P.TOILET_WALLS_GROUND,
];
root.appendChild(buildFloorSvg('Erdgeschoss', P.ROOMS_GROUND, groundWalls, P.ARCHES_GROUND, P.DOORS_GROUND, addStairs));

// ---------- Obergeschoss ----------
const upperWalls = [
    ...P.GABLES_UPPER.map((g) => ({ axis: 'z', at: g.x, from: P.backZ, to: P.frontZ, thickness: 0.15, windows: g.windows })),
    ...P.KNEE_WALLS_UPPER.map((k) => ({ axis: 'x', at: k.z, from: P.leftX, to: P.rightX, thickness: 0.15, windows: [] })),
    ...P.UPPER_PARTITIONS_Z.map((w) => ({ axis: 'z', at: w.x, from: w.from, to: w.to, thickness: 0.1, windows: [] })),
    ...P.UPPER_PARTITIONS_X.map((w) => ({ axis: 'x', at: w.z, from: w.from, to: w.to, thickness: 0.1, windows: [] })),
];
const upperRoomsWithLanding = [...P.ROOMS_UPPER, { ...P.LANDING, label: '', hue: P.LANDING.color }];
root.appendChild(buildFloorSvg('Dachgeschoss', upperRoomsWithLanding, upperWalls, [], P.DOORS_UPPER, (svg) => {
    // Treppenschacht auch im OG-Panel markieren (kein eigener Boden dort).
    addStairs(svg);
}));
