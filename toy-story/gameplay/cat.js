import * as THREE from '../vendor/three.module.min.js';
import { box, cyl, ball3 } from '../build/primitives.js';
import { resolveObstacles, obstaclesByFloor } from '../build/collision.js';
import { BOUNDS, STAIR_X_MIN, STAIR_X_MAX, STAIR_Z_START, STAIR_Z_END, FLOOR2_Y } from '../data/house-plan.js';

function inStairwell(x, z) {
    return x > STAIR_X_MIN && x < STAIR_X_MAX && z > STAIR_Z_START && z < STAIR_Z_END;
}

// Katze: Wander-KI zwischen zufälligen Punkten im ganzen Haus — nimmt für
// Ziele auf der anderen Etage selbstständig die Treppe (gleiche Rampen-Logik
// wie die Spielfigur), statt aufs Erdgeschoss beschränkt zu bleiben.
export function createCat(world) {
    const g = new THREE.Group();
    const fur = 0xe8963c, dark = 0xb56b23;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.11, 4, 8), new THREE.MeshStandardMaterial({ color: fur, roughness: 0.7 }));
    body.rotation.z = Math.PI / 2;
    body.position.y = 0.075;
    body.castShadow = true;
    g.add(body);
    const head = ball3(0.048, fur, 0.1, 0.09, 0, { seg: 14 });
    g.add(head);
    g.add(box(0.024, 0.024, 0.006, dark, 0.13, 0.115, 0.032, { rotZ: -0.3 }));
    g.add(box(0.024, 0.024, 0.006, dark, 0.13, 0.115, -0.032, { rotZ: 0.3 }));
    g.add(ball3(0.006, 0x222222, 0.145, 0.09, 0.022, { seg: 6 }));
    g.add(ball3(0.006, 0x222222, 0.145, 0.09, -0.022, { seg: 6 }));
    const tail = new THREE.Group();
    tail.position.set(-0.11, 0.09, 0);
    tail.add(cyl(0.012, 0.017, 0.16, fur, 0, 0.08, 0, { seg: 8 }));
    tail.rotation.z = -0.6;
    g.add(tail);
    const legFront = { l: cyl(0.014, 0.014, 0.075, dark, 0.06, 0.0375, 0.03, { seg: 8 }), r: cyl(0.014, 0.014, 0.075, dark, 0.06, 0.0375, -0.03, { seg: 8 }) };
    const legBack = { l: cyl(0.015, 0.015, 0.075, dark, -0.06, 0.0375, 0.03, { seg: 8 }), r: cyl(0.015, 0.015, 0.075, dark, -0.06, 0.0375, -0.03, { seg: 8 }) };
    g.add(legFront.l, legFront.r, legBack.l, legBack.r);
    const legs = [legFront.l, legFront.r, legBack.l, legBack.r];

    world.add(g);

    const catState = {
        x: -2.5, z: 0.5, yaw: 0, speed: 0, walkPhase: 0, waitTimer: 1,
        targetX: -2.5, targetZ: 0.5,
        floor: 0, baseY: 0, wasInStair: false,
        path: [],
        stuckTimer: 0, lastDist: Infinity,
    };

    // Ziele über beide Etagen verteilt: {x,z,floor}. (0,3.6) lag früher exakt
    // auf der Flur-Bank (siehe ground-floor.js) — die Katze konnte den Punkt
    // nie erreichen und blieb für den Rest der Session dort stecken.
    const SPOTS = [
        { x: -3.4, z: -2.9, floor: 0 }, { x: -1.5, z: -0.2, floor: 0 }, { x: -3.8, z: 3.2, floor: 0 },
        { x: 0.0, z: 3.85, floor: 0 }, { x: 1.5, z: -3.0, floor: 0 }, { x: 3.5, z: -2.0, floor: 0 },
        { x: -2.2, z: 1.8, floor: 0 }, { x: 0.2, z: -1.5, floor: 0 },
        { x: -3.5, z: -0.5, floor: 1 }, { x: -2.0, z: 2.5, floor: 1 }, { x: 2.2, z: -2.0, floor: 1 },
        { x: 2.2, z: 1.6, floor: 1 }, { x: 0.7, z: 1.0, floor: 1 },
    ];
    const STAIR_X_MID = (STAIR_X_MIN + STAIR_X_MAX) / 2;

    function advancePath() {
        const next = catState.path[0];
        catState.targetX = next.x;
        catState.targetZ = next.z;
    }
    function pickCatTarget() {
        const s = SPOTS[Math.floor(Math.random() * SPOTS.length)];
        const path = [];
        if (s.floor !== catState.floor) {
            // Über die Treppe routen: erst zum eigenen Ende der Rampe laufen,
            // dann zum anderen Ende (durchquert dabei die Stufen), erst dann
            // zum eigentlichen Ziel — sonst würde die Katze einfach auf der
            // falschen Etagenhöhe zu den Zielkoordinaten laufen.
            const footZ = STAIR_Z_START + 0.2, topZ = STAIR_Z_END - 0.1;
            if (catState.floor === 0) {
                path.push({ x: STAIR_X_MID, z: footZ });
                path.push({ x: STAIR_X_MID, z: topZ });
            } else {
                path.push({ x: STAIR_X_MID, z: topZ });
                path.push({ x: STAIR_X_MID, z: footZ });
            }
        }
        path.push({ x: s.x, z: s.z });
        catState.path = path;
        advancePath();
    }
    pickCatTarget();

    function update(dt, elapsedTime) {
        const dx = catState.targetX - catState.x, dz = catState.targetZ - catState.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.15) {
            catState.stuckTimer = 0;
            catState.lastDist = Infinity;
            if (catState.path.length > 1) {
                catState.path.shift();
                advancePath();
            } else {
                catState.waitTimer -= dt;
                catState.speed = Math.max(catState.speed - dt * 1.5, 0);
                if (catState.waitTimer <= 0) { pickCatTarget(); catState.waitTimer = 1.5 + Math.random() * 2; }
            }
        } else {
            const targetYaw = Math.atan2(dx, dz);
            let diff = targetYaw - catState.yaw;
            diff = Math.atan2(Math.sin(diff), Math.cos(diff));
            catState.yaw += diff * Math.min(1, dt * 4);
            catState.speed = Math.min(catState.speed + dt * 0.5, 0.5);
            const fx = Math.sin(catState.yaw), fz = Math.cos(catState.yaw);
            let nx = catState.x + fx * catState.speed * dt;
            let nz = catState.z + fz * catState.speed * dt;
            nx = Math.max(BOUNDS.minX + 0.06, Math.min(BOUNDS.maxX - 0.06, nx));
            nz = Math.max(BOUNDS.minZ + 0.06, Math.min(BOUNDS.maxZ - 0.06, nz));
            [nx, nz] = resolveObstacles(nx, nz, 0, 0.06, obstaclesByFloor[catState.floor]);
            catState.x = nx; catState.z = nz;
            catState.walkPhase += dt * catState.speed * 14;
            // Safety net: if a target ever sits behind/inside an obstacle
            // (unreachable), don't let the cat push against it forever —
            // give up and pick a new target once it hasn't gotten closer for
            // a few seconds, same idea as the resolved (0,3.6)/bench case.
            if (dist < catState.lastDist - 0.01) {
                catState.lastDist = dist;
                catState.stuckTimer = 0;
            } else {
                catState.stuckTimer += dt;
                if (catState.stuckTimer > 3) {
                    pickCatTarget();
                    catState.stuckTimer = 0;
                    catState.lastDist = Infinity;
                }
            }
        }

        const nowInStair = inStairwell(catState.x, catState.z);
        if (nowInStair) {
            const t = (catState.z - STAIR_Z_START) / (STAIR_Z_END - STAIR_Z_START);
            catState.baseY = t * FLOOR2_Y;
        } else {
            if (catState.wasInStair) catState.floor = catState.z >= STAIR_Z_END ? 1 : 0;
            catState.baseY = catState.floor * FLOOR2_Y;
        }
        catState.wasInStair = nowInStair;

        g.position.set(catState.x, catState.baseY, catState.z);
        // Das Katzenmodell schaut lokal entlang +X (Kopf/Ohren/Vorderbeine alle
        // Richtung +x), aber catState.yaw folgt derselben fwd=(sin,cos)-
        // Konvention wie der Spieler (+Z bei yaw=0) — ohne den Offset lief die
        // Katze 90° seitlich zu ihrer tatsächlichen Laufrichtung.
        g.rotation.y = catState.yaw - Math.PI / 2;
        const sw = catState.speed > 0.02 ? Math.sin(catState.walkPhase) * 0.5 : 0;
        legs[0].rotation.x = sw; legs[3].rotation.x = sw;
        legs[1].rotation.x = -sw; legs[2].rotation.x = -sw;
        tail.rotation.y = Math.sin(elapsedTime * 1.6) * 0.3;
    }

    return { group: g, update };
}
