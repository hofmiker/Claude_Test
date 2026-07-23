// Liest data/house-plan.js und baut daraus Wände/Böden/Türen/Fenster/Giebel/
// Treppe/Dach/Sockelleisten. Enthält die "Wie baut man's"-Logik; die
// Koordinaten/Maße selbst kommen aus der Datendatei.
import * as THREE from '../vendor/three.module.min.js';
import { box, cyl, createPlankTexture, createTileTexture, lampPendant, lampWallSpot, picture } from './primitives.js';
import { addObstacle } from './collision.js';
import * as P from '../data/house-plan.js';

export function buildHouse(world) {
    function wall(w, h, d, color, x, y, z, opts) {
        world.add(box(w, h, d, color, x, y, z, opts));
    }

    // ---------- Sockelleisten ----------
    const BASE_H = 0.09, BASE_COLOR = 0xf5f0e6;
    function baseboardZ(x, zFrom, zTo, floorY = 0) { if (zTo > zFrom) world.add(box(0.02, BASE_H, zTo - zFrom, BASE_COLOR, x, floorY + BASE_H / 2, (zFrom + zTo) / 2, { cast: false })); }
    function baseboardX(z, xFrom, xTo, floorY = 0) { if (xTo > xFrom) world.add(box(xTo - xFrom, BASE_H, 0.02, BASE_COLOR, (xFrom + xTo) / 2, floorY + BASE_H / 2, z, { cast: false })); }

    // ---------- Böden ----------
    function plankFloor(xMin, xMax, zMin, zMax, y, hue, seed) {
        const tex = createPlankTexture(hue, seed);
        tex.repeat.set((xMax - xMin) / 1.4, (zMax - zMin) / 1.4);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(xMax - xMin, zMax - zMin), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
        m.rotation.x = -Math.PI / 2;
        m.position.set((xMin + xMax) / 2, y, (zMin + zMax) / 2);
        m.receiveShadow = true;
        world.add(m);
        return m;
    }
    function tileFloor(xMin, xMax, zMin, zMax, y, hue1, hue2) {
        const tex = createTileTexture(hue1, hue2);
        tex.repeat.set((xMax - xMin) / 0.9, (zMax - zMin) / 0.9);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(xMax - xMin, zMax - zMin), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }));
        m.rotation.x = -Math.PI / 2;
        m.position.set((xMin + xMax) / 2, y, (zMin + zMax) / 2);
        m.receiveShadow = true;
        world.add(m);
        return m;
    }
    function buildRoomFloor(room, y) {
        return room.material === 'tile'
            ? tileFloor(room.xMin, room.xMax, room.zMin, room.zMax, y, room.hue, room.hue2)
            : plankFloor(room.xMin, room.xMax, room.zMin, room.zMax, y, room.hue, room.seed);
    }

    const groundFloors = P.ROOMS_GROUND.map((r) => buildRoomFloor(r, 0));
    const upperFloors = P.ROOMS_UPPER.map((r) => buildRoomFloor(r, P.FLOOR2_Y));

    // Treppenabsatz: ein durchgehendes Stück vom oberen Treppenende bis zur
    // Frontwand (der Treppenschacht darunter hat keine eigene Bodenfläche).
    const landingMat = new THREE.MeshStandardMaterial({ color: P.LANDING.color, roughness: 0.8 });
    const landingMesh = new THREE.Mesh(new THREE.PlaneGeometry(P.LANDING.xMax - P.LANDING.xMin, P.LANDING.zMax - P.LANDING.zMin), landingMat);
    landingMesh.rotation.x = -Math.PI / 2;
    landingMesh.position.set(0, P.FLOOR2_Y, (P.LANDING.zMin + P.LANDING.zMax) / 2);
    landingMesh.receiveShadow = true;
    world.add(landingMesh);

    // Decke des Erdgeschosses / Unterseite der OG-Bodenplatte (schließt die
    // Lücke optisch, außer über dem offenen Treppenschacht).
    const SLAB_TOP = P.FLOOR2_Y - 0.02, SLAB_H = SLAB_TOP - P.WALL_H;
    P.CEILING_SLABS.forEach(([x0, x1, z0, z1]) => {
        world.add(box(x1 - x0, SLAB_H, z1 - z0, 0xece6da, (x0 + x1) / 2, P.WALL_H + SLAB_H / 2, (z0 + z1) / 2, { cast: false }));
    });

    // ---------- Türen/Fenster/Zargen ----------
    function buildDoor(opts) {
        const {
            axis = 'z', x, z, hinge, hingeSign, width = 0.80, height = 2.0,
            openAngle = 0, wallDepth = 0.15, frameColor = 0x8a5a3a, doorColor = 0xd8c39a, baseY = 0,
        } = opts;
        const jambDepth = wallDepth + 0.05;
        const farC = hinge + hingeSign * width;
        const put = (w, h, d, color, along, fixedCoord) =>
            axis === 'z'
                ? world.add(box(w, h, d, color, x, fixedCoord, along))
                : world.add(box(d, h, w, color, along, fixedCoord, z));

        put(jambDepth, height + 0.08, 0.05, frameColor, hinge, baseY + height / 2 + 0.02);
        put(jambDepth, height + 0.08, 0.05, frameColor, farC, baseY + height / 2 + 0.02);
        put(jambDepth, 0.06, Math.abs(farC - hinge) + 0.1, frameColor, (hinge + farC) / 2, baseY + height + 0.06);

        [0.18, 0.5, 0.82].forEach((f) => {
            axis === 'z'
                ? world.add(box(0.05, 0.05, 0.014, 0x8c8c8c, x, baseY + f * height, hinge, { metalness: 0.6, roughness: 0.35 }))
                : world.add(box(0.014, 0.05, 0.05, 0x8c8c8c, hinge, baseY + f * height, z, { metalness: 0.6, roughness: 0.35 }));
        });

        const pivot = new THREE.Group();
        if (axis === 'z') pivot.position.set(x, baseY, hinge); else pivot.position.set(hinge, baseY, z);
        pivot.rotation.y = axis === 'z' ? openAngle : openAngle + Math.PI / 2;
        const leaf = box(0.045, height - 0.06, width, doorColor, 0, height / 2, hingeSign * width / 2);
        pivot.add(leaf);
        const handleZ = hingeSign * (width - 0.11);
        pivot.add(box(0.014, 0.05, 0.008, 0xd8c23a, 0.03, height / 2, handleZ, { metalness: 0.7, roughness: 0.3 }));
        pivot.add(cyl(0.006, 0.006, 0.05, 0xd8c23a, 0.055, height / 2, handleZ, { seg: 8, rotZ: Math.PI / 2, roughness: 0.3, metalness: 0.7 }));
        world.add(pivot);
        return pivot;
    }

    function archTrim(x, zFrom, zTo, color = 0x8a5a3a) {
        const jambDepth = 0.15, jambW = 0.05, h = P.WALL_H;
        [zFrom, zTo].forEach((z) => world.add(box(jambDepth, h + 0.08, jambW, color, x, h / 2 + 0.02, z)));
        world.add(box(jambDepth, 0.06, (zTo - zFrom) + 0.1, color, x, h + 0.06, (zFrom + zTo) / 2));
    }

    function makeWindow(x, y, z, w, h, wallAxis) {
        const g = new THREE.Group();
        g.add(box(wallAxis === 'x' ? 0.04 : w, h, wallAxis === 'x' ? w : 0.04, 0xdff2ff, 0, 0, 0, { metalness: 0.1, roughness: 0.05, side: THREE.DoubleSide, transparent: true, opacity: 0.35, cast: false }));
        g.add(box(wallAxis === 'x' ? 0.02 : w + 0.05, 0.03, wallAxis === 'x' ? w + 0.05 : 0.02, 0xffffff, 0, h / 2 - 0.015, 0, { cast: false }));
        g.add(box(wallAxis === 'x' ? 0.02 : 0.03, h, wallAxis === 'x' ? 0.03 : 0.02, 0xffffff, 0, 0, 0, { cast: false }));
        g.position.set(x, y, z);
        world.add(g);
    }

    // ---------- Wandläufe (schneidet Fensterlöcher + zeichnet das Glas) ----------
    function wallRunAxis(axis, fixed, thickness, yBase, height, color, from, to, windows = []) {
        const put = (spanFrom, spanLen, spanCenter, yLo, yLen, yCenter) => {
            if (spanLen <= 0.001 || yLen <= 0.001) return;
            axis === 'z'
                ? wall(thickness, yLen, spanLen, color, fixed, yCenter, spanCenter)
                : wall(spanLen, yLen, thickness, color, spanCenter, yCenter, fixed);
        };
        const ops = windows.map((w) => ({
            from: w.c - w.w / 2, to: w.c + w.w / 2, sill: w.y - w.h / 2, lintel: w.y + w.h / 2,
        })).sort((a, b) => a.from - b.from);
        let cur = from;
        ops.forEach((op) => {
            put(cur, op.from - cur, (cur + op.from) / 2, yBase, height, yBase + height / 2);
            const len = op.to - op.from, c = (op.from + op.to) / 2;
            put(op.from, len, c, yBase, op.sill - yBase, yBase + (op.sill - yBase) / 2);
            put(op.from, len, c, op.lintel, yBase + height - op.lintel, op.lintel + (yBase + height - op.lintel) / 2);
            cur = op.to;
        });
        put(cur, to - cur, (cur + to) / 2, yBase, height, yBase + height / 2);
    }

    function buildExtWall(w) {
        if (w.to - w.from <= 0.001) return;
        wallRunAxis(w.axis, w.at, w.thickness, 0, P.WALL_H, w.color, w.from, w.to, w.windows);
        w.axis === 'z'
            ? addObstacle(0, w.at, (w.from + w.to) / 2, w.thickness, w.to - w.from)
            : addObstacle(0, (w.from + w.to) / 2, w.at, w.to - w.from, w.thickness);
        const wallAxis = w.axis === 'z' ? 'x' : 'z';
        w.windows.forEach((win) => {
            w.axis === 'z'
                ? makeWindow(w.at + w.glassOffset, win.y, win.c, win.w, win.h, wallAxis)
                : makeWindow(win.c, win.y, w.at + w.glassOffset, win.w, win.h, wallAxis);
        });
    }
    P.EXT_WALLS_GROUND.forEach(buildExtWall);

    // Sturz-Stück über der Haustür — schließt das Loch bis zur Decke, rein
    // visuell (der Türbereich muss bei jeder Höhe kollisionsfrei bleiben).
    const L = P.DOOR_LINTEL_GROUND;
    wall(L.width, L.yTo - L.yFrom, L.thickness, L.color, L.x, L.yFrom + (L.yTo - L.yFrom) / 2, L.z);

    // ---------- Gang-Trennwände + Durchgänge ----------
    function corridorWallRun(x, zFrom, zTo, color) {
        if (zTo - zFrom <= 0.001) return;
        wall(0.1, P.WALL_H, zTo - zFrom, color, x, P.WALL_H / 2, (zFrom + zTo) / 2);
        addObstacle(0, x, (zFrom + zTo) / 2, 0.1, zTo - zFrom);
        baseboardZ(x + 0.06, zFrom, zTo);
        baseboardZ(x - 0.06, zFrom, zTo);
    }
    P.CORRIDOR_WALLS_GROUND.forEach((w) => corridorWallRun(w.x, w.from, w.to, w.color));
    P.ARCHES_GROUND.forEach((a) => archTrim(a.x, a.from, a.to, a.color));

    // ---------- Toilette (vollständig umschlossen bis auf eine Tür) ----------
    P.TOILET_WALLS_GROUND.forEach((w) => {
        if (w.axis === 'z') {
            wall(w.thickness, P.WALL_H, w.to - w.from, P.WALL_LIGHT, w.at, P.WALL_H / 2, (w.from + w.to) / 2);
            addObstacle(0, w.at, (w.from + w.to) / 2, w.thickness, w.to - w.from);
            baseboardZ(w.at - 0.06, w.from, w.to);
        } else {
            wall(w.to - w.from, P.WALL_H, w.thickness, P.WALL_LIGHT, (w.from + w.to) / 2, P.WALL_H / 2, w.at);
            addObstacle(0, (w.from + w.to) / 2, w.at, w.to - w.from, w.thickness);
            baseboardX(w.at + 0.06, w.from, w.to);
        }
    });

    // ---------- Türen Erdgeschoss ----------
    P.DOORS_GROUND.forEach((d) => buildDoor(d));

    // ---------- Sockelleisten (Außenwände Erdgeschoss) ----------
    baseboardZ(P.leftX + 0.085, P.backZ + 0.08, P.frontZ - 0.08);
    baseboardZ(P.rightX - 0.085, P.backZ + 0.08, P.frontZ - 0.08);
    baseboardX(P.backZ + 0.085, P.leftX + 0.08, P.rightX - 0.08);
    baseboardX(P.frontZ - 0.085, P.leftX + 0.08, P.rightX - 0.08);

    // ---------- Treppe (sichtbare Stufen über einer Rampe für die Kollision) ----------
    const { steps, treadColor, railColor } = P.STAIRS;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const z = P.STAIR_Z_START + t * (P.STAIR_Z_END - P.STAIR_Z_START);
        const y = t * P.FLOOR2_Y - 0.025;
        world.add(box((P.STAIR_X_MAX - P.STAIR_X_MIN) - 0.06, 0.04, (P.STAIR_Z_END - P.STAIR_Z_START) / steps + 0.02, treadColor, (P.STAIR_X_MIN + P.STAIR_X_MAX) / 2, y, z, { cast: false }));
    }
    const stairMidZ = (P.STAIR_Z_START + P.STAIR_Z_END) / 2;
    world.add(box(0.06, P.FLOOR2_Y + 0.1, P.STAIR_Z_END - P.STAIR_Z_START, railColor, P.STAIR_X_MIN + 0.03, P.FLOOR2_Y / 2, stairMidZ, { cast: false }));
    world.add(box(0.06, P.FLOOR2_Y + 0.1, P.STAIR_Z_END - P.STAIR_Z_START, railColor, P.STAIR_X_MAX - 0.03, P.FLOOR2_Y / 2, stairMidZ, { cast: false }));
    addObstacle(0, P.STAIR_X_MIN + 0.03, stairMidZ, 0.06, P.STAIR_Z_END - P.STAIR_Z_START);
    addObstacle(0, P.STAIR_X_MAX - 0.03, stairMidZ, 0.06, P.STAIR_Z_END - P.STAIR_Z_START);
    addObstacle(1, P.STAIR_X_MIN + 0.03, stairMidZ, 0.06, P.STAIR_Z_END - P.STAIR_Z_START);
    addObstacle(1, P.STAIR_X_MAX - 0.03, stairMidZ, 0.06, P.STAIR_Z_END - P.STAIR_Z_START);

    // ---------- Obergeschoss-Struktur ----------
    P.KNEE_WALLS_UPPER.forEach((k) => {
        wall(P.spanX, P.KNEE_H, 0.15, k.color, (P.leftX + P.rightX) / 2, P.FLOOR2_Y + P.KNEE_H / 2, k.z);
        addObstacle(1, (P.leftX + P.rightX) / 2, k.z, P.spanX, 0.15);
    });

    function gableEndWall(g) {
        const shape = new THREE.Shape();
        shape.moveTo(P.backZ, 0);
        shape.lineTo(P.frontZ, 0);
        shape.lineTo(P.frontZ, P.KNEE_H);
        shape.lineTo(0, P.RIDGE_H);
        shape.lineTo(P.backZ, P.KNEE_H);
        shape.closePath();
        g.windows.forEach((w) => {
            const z0 = w.c - w.w / 2, z1 = w.c + w.w / 2;
            const y0 = w.y - w.h / 2 - P.FLOOR2_Y, y1 = w.y + w.h / 2 - P.FLOOR2_Y;
            const hole = new THREE.Path();
            hole.moveTo(z0, y0);
            hole.lineTo(z1, y0);
            hole.lineTo(z1, y1);
            hole.lineTo(z0, y1);
            hole.closePath();
            shape.holes.push(hole);
        });
        const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.15, bevelEnabled: false });
        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: g.color, roughness: 0.85 }));
        mesh.rotation.y = Math.PI / 2;
        mesh.position.set(g.x, P.FLOOR2_Y, 0);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        world.add(mesh);
        g.windows.forEach((w) => makeWindow(g.x, w.y, w.c, w.w, w.h, 'x'));
    }
    P.GABLES_UPPER.forEach(gableEndWall);
    addObstacle(1, P.leftX, 0, 0.15, P.spanZ);
    addObstacle(1, P.rightX, 0, 0.15, P.spanZ);

    function upperPartitionZ(x, zFrom, zTo, color) {
        if (zTo - zFrom <= 0.001) return;
        const STEP = 0.4;
        const n = Math.max(1, Math.ceil((zTo - zFrom) / STEP));
        const segLen = (zTo - zFrom) / n;
        for (let i = 0; i < n; i++) {
            const segFrom = zFrom + i * segLen, segTo = segFrom + segLen;
            const midZ = (segFrom + segTo) / 2;
            const h = P.upperCeilingY(midZ) - P.FLOOR2_Y;
            wall(0.1, h, segLen + 0.01, color, x, P.FLOOR2_Y + h / 2, midZ);
        }
        addObstacle(1, x, (zFrom + zTo) / 2, 0.1, zTo - zFrom);
        baseboardZ(x + 0.06, zFrom, zTo, P.FLOOR2_Y);
        baseboardZ(x - 0.06, zFrom, zTo, P.FLOOR2_Y);
    }
    function upperPartitionX(z, xFrom, xTo, color) {
        if (xTo - xFrom <= 0.001) return;
        const h = P.upperCeilingY(z) - P.FLOOR2_Y;
        wall(xTo - xFrom, h, 0.1, color, (xFrom + xTo) / 2, P.FLOOR2_Y + h / 2, z);
        addObstacle(1, (xFrom + xTo) / 2, z, xTo - xFrom, 0.1);
        baseboardX(z + 0.06, xFrom, xTo, P.FLOOR2_Y);
        baseboardX(z - 0.06, xFrom, xTo, P.FLOOR2_Y);
    }
    P.UPPER_PARTITIONS_Z.forEach((w) => upperPartitionZ(w.x, w.from, w.to, w.color));
    P.UPPER_PARTITIONS_X.forEach((w) => upperPartitionX(w.z, w.from, w.to, w.color));
    P.DOORS_UPPER.forEach((d) => buildDoor(d));

    // ---------- Dachschrägen + Dachhülle ----------
    function slopedCeiling(zSign, color) {
        const run = Math.hypot(4, P.RIDGE_H - P.KNEE_H);
        const geo = new THREE.PlaneGeometry(P.spanX, run);
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geo, mat);
        const angle = Math.atan2(P.RIDGE_H - P.KNEE_H, 4);
        mesh.rotation.x = zSign * (Math.PI / 2 + angle);
        mesh.position.set(0, P.FLOOR2_Y + (P.KNEE_H + P.RIDGE_H) / 2, zSign * 2);
        mesh.receiveShadow = true;
        mesh.castShadow = false;
        world.add(mesh);
        return mesh;
    }
    slopedCeiling(-1, 0xf4efe6);
    slopedCeiling(1, 0xf4efe6);

    function roofShell(zSign) {
        const run = Math.hypot(4.4, P.RIDGE_H - P.KNEE_H + 0.15);
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(P.spanX + 0.6, run), new THREE.MeshStandardMaterial({ color: 0x7a3d33, roughness: 0.8, side: THREE.DoubleSide }));
        const angle = Math.atan2(P.RIDGE_H - P.KNEE_H + 0.15, 4.4);
        mesh.rotation.x = zSign * (Math.PI / 2 + angle);
        mesh.position.set(0, P.FLOOR2_Y + (P.KNEE_H + P.RIDGE_H) / 2 + 0.05, zSign * 2);
        mesh.castShadow = true;
        world.add(mesh);
    }
    roofShell(-1);
    roofShell(1);

    function addSkylight(xCenter, zCenter, zSign) {
        const angle = Math.atan2(P.RIDGE_H - P.KNEE_H, 4);
        const t = Math.abs(zCenter) / 4;
        const y = P.FLOOR2_Y + P.RIDGE_H - t * (P.RIDGE_H - P.KNEE_H);
        const g = new THREE.Group();
        g.add(box(0.55, 0.03, 0.4, 0xdff2ff, 0, 0, 0, { metalness: 0.3, roughness: 0.1, cast: false }));
        g.add(box(0.6, 0.015, 0.06, 0xffffff, 0, 0.01, -0.19, { cast: false }));
        g.add(box(0.6, 0.015, 0.06, 0xffffff, 0, 0.01, 0.19, { cast: false }));
        g.position.set(xCenter, y - 0.01, zCenter);
        g.rotation.x = zSign * (Math.PI / 2 + angle);
        world.add(g);
    }
    P.SKYLIGHTS.forEach((s) => addSkylight(s.x, s.z, s.zSign));

    // ---------- Sockelleisten (Außenwände Obergeschoss) ----------
    baseboardZ(P.leftX + 0.085, P.backZ + 0.08, P.frontZ - 0.08, P.FLOOR2_Y);
    baseboardZ(P.rightX - 0.085, P.backZ + 0.08, P.frontZ - 0.08, P.FLOOR2_Y);
    baseboardX(P.backZ + 0.085, P.leftX + 0.08, P.rightX - 0.08, P.FLOOR2_Y);
    baseboardX(P.frontZ - 0.085, P.leftX + 0.08, P.rightX - 0.08, P.FLOOR2_Y);

    // ---------- Beleuchtung Treppenabsatz (gehört keinem einzelnen Zimmer) ----------
    world.add(lampPendant(0, P.upperCeilingY(2.0), 2.0));
    world.add(lampWallSpot(P.CORR_X_MAX, P.FLOOR2_Y + 1.0, 3.0, 'x', -1));
    world.add(picture(0.3, 0.35, P.CORR_X_MAX - 0.01, P.FLOOR2_Y + 1.3, 3.2, -Math.PI / 2, 0x8a5a3a, 0xf0d9a8));

    return { groundFloors, upperFloors, landingMesh };
}
