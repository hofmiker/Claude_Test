import * as THREE from '../vendor/three.module.min.js';
import { box, cyl, picture, houseplant, lampFloor, lampPendant, lampWallSpot, chair, createToilet, createSinkPedestal } from '../build/primitives.js';
import { addObstacle } from '../build/collision.js';
import { backZ, frontZ, leftX, rightX, CORR_X_MIN, CORR_X_MAX, WALL_H, TOILET_X_MAX } from '../data/house-plan.js';

// Wohnzimmer + Küche + Toilette + Flur/Hauseingang: reine Möbel-Platzierung.
// Die strukturellen Wände/Türen/Fenster kommen aus build/house-builder.js.
export function placeGroundFloor(world) {
    // ================= Wohnzimmer =================
    const seatColor = 0xd45d5d, backColor = 0xc24b4b;
    const lSofaLong = new THREE.Group();
    lSofaLong.add(box(1.9, 0.42, 0.85, seatColor, 0, 0.21, 0));
    lSofaLong.add(box(1.9, 0.4, 0.15, backColor, 0, 0.5, -0.36));
    lSofaLong.add(box(0.18, 0.5, 0.85, backColor, -0.95, 0.34, 0));
    lSofaLong.add(box(0.18, 0.5, 0.85, backColor, 0.95, 0.34, 0));
    lSofaLong.position.set(-4.55, 0, -2.7);
    lSofaLong.rotation.y = Math.PI / 2;
    world.add(lSofaLong);
    addObstacle(0, -4.55, -2.7, 0.85, 1.9, 0.42);

    const lSofaShort = new THREE.Group();
    lSofaShort.add(box(1.3, 0.42, 0.85, seatColor, 0, 0.21, 0));
    lSofaShort.add(box(1.3, 0.4, 0.15, backColor, 0, 0.5, -0.36));
    lSofaShort.add(box(0.18, 0.5, 0.85, backColor, -0.56, 0.34, 0));
    lSofaShort.add(box(0.18, 0.5, 0.85, backColor, 0.56, 0.34, 0));
    lSofaShort.position.set(-3.9, 0, -3.57);
    world.add(lSofaShort);
    addObstacle(0, -3.9, -3.57, 1.3, 0.85, 0.42);

    const coffeeTable = new THREE.Group();
    coffeeTable.add(box(1.0, 0.04, 0.55, 0x8a5a3a, 0, 0.42, 0));
    [[-0.44, -0.23], [0.44, -0.23], [-0.44, 0.23], [0.44, 0.23]].forEach(([lx, lz]) => coffeeTable.add(cyl(0.02, 0.02, 0.4, 0x6b4429, lx, 0.2, lz, { seg: 8 })));
    coffeeTable.position.set(-3.6, 0, -2.6);
    world.add(coffeeTable);
    addObstacle(0, -3.6, -2.6, 1.05, 0.6, 0.44);

    const livingRug = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.4), new THREE.MeshStandardMaterial({ color: 0x7a4a3a, roughness: 1 }));
    livingRug.rotation.x = -Math.PI / 2;
    livingRug.position.set(-3.6, 0.004, -2.6);
    livingRug.receiveShadow = true;
    world.add(livingRug);

    const tvConsole = new THREE.Group();
    tvConsole.add(box(0.4, 0.45, 1.2, 0x8a5a3a, 0, 0.225, 0));
    tvConsole.add(box(0.42, 0.04, 1.22, 0xffffff, 0, 0.45, 0));
    tvConsole.position.set(-1.55, 0, -2.5);
    world.add(tvConsole);
    addObstacle(0, -1.55, -2.5, 0.4, 1.2, 0.47);
    world.add(box(0.04, 0.58, 1.0, 0x111111, -1.32, 0.79, -2.5, { cast: false }));
    world.add(box(0.05, 0.06, 1.02, 0x2b2b2b, -1.3, 0.48, -2.5, { cast: false }));

    // Zone B: bookshelf + reading nook.
    const bookshelf = new THREE.Group();
    bookshelf.add(box(0.3, 1.6, 1.2, 0xd98f4a, 0, 0.8, 0));
    [0.34, 0.66, 0.98, 1.3].forEach((y) => bookshelf.add(box(0.32, 0.03, 1.22, 0x8a5a2a, 0, y, 0, { cast: false })));
    const bookColors = [0xd6413f, 0x4aa8e0, 0xffd166, 0x6fcf67, 0xb570ff, 0xff8a5b];
    for (let shelf = 0; shelf < 3; shelf++) {
        const shelfY = 0.5 + shelf * 0.32;
        for (let i = 0; i < 6; i++) {
            bookshelf.add(box(0.03, 0.16, 0.14, bookColors[(shelf * 6 + i) % bookColors.length], 0.1, shelfY, -0.5 + i * 0.16, { cast: false }));
        }
    }
    bookshelf.position.set(-4.85, 0, -1.0);
    world.add(bookshelf);
    addObstacle(0, -4.85, -1.0, 0.3, 1.2);

    const readingChair = new THREE.Group();
    readingChair.add(box(0.55, 0.4, 0.55, 0x5b8fd9, 0, 0.2, 0));
    readingChair.add(box(0.55, 0.5, 0.12, 0x4a72b0, 0, 0.55, -0.28));
    readingChair.add(box(0.12, 0.35, 0.55, 0x4a72b0, -0.28, 0.38, 0));
    readingChair.add(box(0.12, 0.35, 0.55, 0x4a72b0, 0.28, 0.38, 0));
    [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].forEach(([lx, lz]) => readingChair.add(cyl(0.02, 0.02, 0.2, 0x3a3a3a, lx, 0.1, lz, { seg: 8 })));
    readingChair.position.set(-4.5, 0, 0.3);
    readingChair.rotation.y = -Math.PI / 2;
    world.add(readingChair);
    addObstacle(0, -4.5, 0.3, 0.65, 0.65, 0.4);
    world.add(lampFloor(-4.9, 0, 0.75));
    addObstacle(0, -4.9, 0.75, 0.28, 0.28);

    // Zone C: 6-seat dining table.
    const diningTable = new THREE.Group();
    diningTable.add(box(0.85, 0.04, 1.5, 0x9c6b3f, 0, 0.75, 0));
    [[-0.36, -0.68], [0.36, -0.68], [-0.36, 0.68], [0.36, 0.68]].forEach(([lx, lz]) => diningTable.add(cyl(0.022, 0.022, 0.73, 0x7a5230, lx, 0.365, lz, { seg: 8 })));
    diningTable.position.set(-3.15, 0, 2.6);
    world.add(diningTable);
    addObstacle(0, -3.15, 2.6, 0.9, 1.55, 0.77);
    [[-3.15, 1.85, 0], [-3.15, 3.35, Math.PI], [-3.815, 2.2, Math.PI / 2], [-3.815, 3.0, Math.PI / 2], [-2.485, 2.2, -Math.PI / 2], [-2.485, 3.0, -Math.PI / 2]].forEach(([cx, cz, rot]) => {
        world.add(chair(cx, cz, rot));
        addObstacle(0, cx, cz, 0.42, 0.42, 0.44);
    });

    world.add(houseplant(-4.35, 0, 3.55, 1.15));
    addObstacle(0, -4.35, 3.55, 0.35, 0.35);
    world.add(picture(0.42, 0.55, leftX + 0.01, 1.55, -3.3, Math.PI / 2, 0x5a3d22, 0x7fa8c9));
    world.add(picture(0.36, 0.36, leftX + 0.01, 1.5, 1.6, Math.PI / 2, 0x5a3d22, 0xe8b04a));
    world.add(lampPendant(-3.4, WALL_H, -0.5));

    // ================= Küche =================
    function kitchenCounter(x, z, w, d, rotY) {
        const g = new THREE.Group();
        g.add(box(w, 0.85, d, 0xdedad2, 0, 0.425, 0));
        g.add(box(w + 0.03, 0.04, d + 0.03, 0xffffff, 0, 0.87, 0));
        g.position.set(x, 0, z);
        g.rotation.y = rotY;
        world.add(g);
        addObstacle(0, x, z, rotY ? d : w, rotY ? w : d, 0.87);
    }
    kitchenCounter(1.95, backZ + 0.35, 1.2, 0.62, 0);
    kitchenCounter(rightX - 0.35, -2.6, 0.62, 1.6, Math.PI / 2);

    const stove = new THREE.Group();
    stove.add(box(0.62, 0.85, 0.62, 0x2b2b2b, 0, 0.425, 0));
    stove.add(box(0.58, 0.02, 0.58, 0x181818, 0, 0.87, 0));
    [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]].forEach(([bx, bz]) => stove.add(cyl(0.08, 0.08, 0.01, 0x3a3a3a, bx, 0.885, bz, { seg: 16 })));
    [-0.2, -0.07, 0.07, 0.2].forEach((kx) => {
        stove.add(cyl(0.024, 0.024, 0.02, 0xd6d6d6, kx, 0.58, 0.315, { seg: 12, rotX: Math.PI / 2, metalness: 0.5, roughness: 0.3 }));
        stove.add(cyl(0.006, 0.006, 0.022, 0xffffff, kx, 0.58, 0.317, { seg: 8, rotX: Math.PI / 2, cast: false }));
    });
    stove.position.set(2.85, 0, backZ + 0.35);
    world.add(stove);
    addObstacle(0, 2.85, backZ + 0.35, 0.65, 0.65, 0.87);

    function createRangeHood(color = 0xd6d6d6) {
        const g = new THREE.Group();
        g.add(box(0.5, 0.02, 0.42, 0x2b2b2b, 0, -0.02, 0, { cast: false }));
        g.add(box(0.6, 0.04, 0.5, color, 0, 0.02, 0, { metalness: 0.4, roughness: 0.3 }));
        g.add(box(0.4, 0.3, 0.32, color, 0, 0.19, 0, { metalness: 0.4, roughness: 0.3 }));
        g.add(box(0.18, 0.56, 0.16, color, 0, 0.62, 0, { metalness: 0.3, roughness: 0.35 }));
        return g;
    }
    const rangeHood = createRangeHood();
    rangeHood.position.set(2.85, 1.7, backZ + 0.35);
    world.add(rangeHood);

    const sinkUnit = new THREE.Group();
    sinkUnit.add(box(0.55, 0.06, 0.42, 0xcfd6d8, 0, 0.86, 0));
    sinkUnit.add(box(0.44, 0.1, 0.32, 0xffffff, 0, 0.83, 0));
    sinkUnit.add(cyl(0.008, 0.008, 0.16, 0xb8bcbe, -0.16, 0.95, -0.1, { seg: 8, metalness: 0.6, roughness: 0.3 }));
    sinkUnit.position.set(rightX - 0.35, 0, -0.6);
    sinkUnit.rotation.y = Math.PI / 2;
    world.add(sinkUnit);
    addObstacle(0, rightX - 0.35, -0.6, 0.62, 0.55, 0.87);

    const fridge = new THREE.Group();
    fridge.add(box(0.65, 1.75, 0.65, 0xf3f3f3, 0, 0.875, 0));
    fridge.add(box(0.02, 1.6, 0.02, 0xcccccc, -0.33, 1.0, 0.34, { cast: false }));
    fridge.position.set(4.3, 0, backZ + 0.35);
    world.add(fridge);
    addObstacle(0, 4.3, backZ + 0.35, 0.68, 0.68);

    const upperCabinets = box(1.4, 0.7, 0.32, 0xdedad2, 1.95, 1.75, backZ + 0.16);
    world.add(upperCabinets);
    world.add(picture(0.34, 0.34, rightX - 0.01, 1.6, 1.2, -Math.PI / 2, 0xd98f4a, 0xffd166));
    world.add(lampPendant(3.4, WALL_H, -1.8));
    world.add(lampWallSpot(rightX, 2.0, -0.6, 'x', -1));

    // ================= Toilette =================
    const wcGroup = createToilet();
    wcGroup.position.set(2.85, 0, 2.05);
    wcGroup.rotation.y = Math.PI;
    world.add(wcGroup);
    addObstacle(0, 2.85, 2.0, 0.3, 0.45, 0.28);
    const wcSink = createSinkPedestal();
    wcSink.position.set(1.6, 0, 0.75);
    world.add(wcSink);
    addObstacle(0, 1.6, 0.75, 0.3, 0.25, 0.6);
    world.add(lampWallSpot(TOILET_X_MAX, 2.0, 1.3, 'x', -1));
    world.add(picture(0.3, 0.3, TOILET_X_MAX - 0.01, 1.5, 1.6, -Math.PI / 2, 0xdfeef2, 0x8fc7d8));

    // ================= Hauseingang (Flur) =================
    world.add(houseplant(-0.9, 0, -3.82, 0.7));
    addObstacle(0, -0.9, -3.82, 0.18, 0.18);
    const bench = box(0.9, 0.42, 0.32, 0x7a5230, 0, 0.21, 3.6);
    world.add(bench);
    addObstacle(0, 0, 3.6, 0.9, 0.32, 0.42);
    world.add(lampPendant(0, WALL_H, -3.8));
    world.add(lampPendant(0.7, WALL_H, -2.5));
    world.add(lampPendant(0, WALL_H, 2.8));
    world.add(lampWallSpot(CORR_X_MIN, 2.0, -2.5, 'x', 1));
    world.add(lampWallSpot(CORR_X_MAX, 2.0, 1.5, 'x', -1));
    world.add(picture(0.3, 0.4, CORR_X_MIN + 0.01, 1.6, 2.0, Math.PI / 2, 0x8a5a3a, 0xffe6a8));

    return { livingRug };
}
