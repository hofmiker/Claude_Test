import * as THREE from '../vendor/three.module.min.js';
import { box, cyl, ball3 } from '../build/primitives.js';
import { resolveObstacles, obstaclesByFloor } from '../build/collision.js';
import { BOUNDS } from '../data/house-plan.js';

// Katze: einfache Wander-KI zwischen zufälligen Punkten im Erdgeschoss.
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

    const catState = { x: -2.5, z: 0.5, yaw: 0, speed: 0, targetX: -2.5, targetZ: 0.5, waitTimer: 1, walkPhase: 0 };
    function pickCatTarget() {
        const spots = [[-3.4, -2.9], [-1.5, -0.2], [-3.8, 3.2], [0.0, 3.6], [1.5, -3.0], [3.5, -2.0], [-2.2, 1.8], [0.2, -1.5]];
        const s = spots[Math.floor(Math.random() * spots.length)];
        catState.targetX = s[0]; catState.targetZ = s[1];
    }
    pickCatTarget();

    function update(dt, elapsedTime) {
        const dx = catState.targetX - catState.x, dz = catState.targetZ - catState.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.15) {
            catState.waitTimer -= dt;
            catState.speed = Math.max(catState.speed - dt * 1.5, 0);
            if (catState.waitTimer <= 0) { pickCatTarget(); catState.waitTimer = 1.5 + Math.random() * 2; }
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
            [nx, nz] = resolveObstacles(nx, nz, 0.06, obstaclesByFloor[0]);
            catState.x = nx; catState.z = nz;
            catState.walkPhase += dt * catState.speed * 14;
        }
        g.position.set(catState.x, 0, catState.z);
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
