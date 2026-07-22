import * as THREE from '../vendor/three.module.min.js';
import { box, cyl, ball3, createTileTexture, createCloudTexture, lampTable, lampPendant, lampWallSpot, picture, createCarToy } from '../build/primitives.js';
import { addObstacle, resolveObstacles, obstaclesByFloor } from '../build/collision.js';
import { X_MAX, rightX, FLOOR2_Y, BOUNDS, upperCeilingY } from '../data/house-plan.js';
import { PLAYER_RADIUS } from '../gameplay/player-constants.js';

// Kinderzimmer 2 (Junge, Spielsachen + Rennautos): Möbel-Platzierung PLUS
// Laufzeit-Verhalten (Ball-Kick-Physik, Schaukelpferd-Sway), da beides eng an
// die Objekte dieses Raums gebunden ist — deshalb hier ein update(), nicht
// nur eine reine Platzierungsfunktion wie in den anderen content/*.js.
export function placeKinderzimmer2(world) {
    const cowboyBlanketTex = createTileTexture(0xc0392b, 0xf0d9a8);
    cowboyBlanketTex.repeat.set(3, 2);
    const boyBed = new THREE.Group();
    boyBed.add(box(1.0, 0.3, 1.9, 0xffffff, 0, 0.15, 0));
    boyBed.add(box(1.05, 0.5, 0.08, 0x8a5a2a, 0, 0.42, -0.91));
    boyBed.add(box(1.05, 0.42, 0.08, 0x8a5a2a, 0, 0.38, 0.91));
    [[-0.48, -0.91], [0.48, -0.91], [-0.48, 0.91], [0.48, 0.91]].forEach(([px, pz]) => {
        const isHead = pz < 0;
        boyBed.add(cyl(0.025, 0.025, isHead ? 0.62 : 0.5, 0x8a5a2a, px, (isHead ? 0.62 : 0.5) / 2 + 0.15, pz, { seg: 10 }));
        boyBed.add(ball3(0.035, 0x6b4429, px, (isHead ? 0.62 : 0.5) + 0.15, pz, { seg: 10 }));
    });
    const blanket = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshStandardMaterial({ map: cowboyBlanketTex, roughness: 0.9 }));
    blanket.rotation.x = -Math.PI / 2;
    blanket.position.set(0, 0.351, -0.55);
    boyBed.add(blanket);
    boyBed.position.set(4.3, FLOOR2_Y, 3.0);
    world.add(boyBed);
    addObstacle(1, 4.3, 3.0, 1.1, 1.95);
    world.add(lampTable(4.3 + 0.75, FLOOR2_Y + 0.5, 3.0));
    world.add(box(0.3, 0.5, 0.3, 0x9c6b3f, 4.3 + 0.75, FLOOR2_Y + 0.25, 3.0));
    addObstacle(1, 4.3 + 0.75, 3.0, 0.32, 0.32);

    const cloudMural = new THREE.Mesh(
        new THREE.PlaneGeometry(2.6, 1.1),
        new THREE.MeshStandardMaterial({ map: createCloudTexture(0x8fc7ea, 0xffffff), roughness: 0.9 })
    );
    cloudMural.rotation.y = -Math.PI / 2;
    cloudMural.position.set(X_MAX - 0.02, FLOOR2_Y + 0.62, 1.6);
    world.add(cloudMural);

    function createWristwatchClock() {
        const g = new THREE.Group();
        g.add(cyl(0.09, 0.09, 0.018, 0xd9a24a, 0, 0, 0, { seg: 24, metalness: 0.5, roughness: 0.4 }));
        g.add(cyl(0.075, 0.075, 0.006, 0xfaf6ec, 0, 0.011, 0, { seg: 24 }));
        [0, 1, 2, 3].forEach((i) => {
            const a = (i / 4) * Math.PI * 2;
            g.add(box(0.008, 0.004, 0.014, 0x2b2b2b, Math.sin(a) * 0.058, 0.015, Math.cos(a) * 0.058, { rotY: a, cast: false }));
        });
        g.add(box(0.006, 0.005, 0.04, 0x2b2b2b, 0, 0.016, -0.018, { rotY: 0.3, cast: false }));
        g.add(box(0.005, 0.005, 0.03, 0x2b2b2b, 0.012, 0.017, 0.014, { rotY: -1.0, cast: false }));
        [-1, 1].forEach((s) => g.add(box(0.06, 0.11, 0.02, 0x3f6fd1, 0, s * 0.135, 0)));
        return g;
    }
    const wristClock = createWristwatchClock();
    wristClock.rotation.y = -Math.PI / 2;
    wristClock.position.set(X_MAX - 0.03, FLOOR2_Y + 1.55, 3.1);
    world.add(wristClock);

    const corkboard = new THREE.Group();
    corkboard.add(box(0.5, 0.36, 0.02, 0x7a5230, 0, 0, 0, { cast: false }));
    corkboard.add(box(0.44, 0.3, 0.006, 0xc79a63, 0, 0, 0.013, { cast: false, roughness: 0.95 }));
    [[-0.12, 0.06, 0xffffff], [0.1, 0.08, 0xffe6a8], [-0.05, -0.07, 0xbfe0ff], [0.13, -0.05, 0xffd6ea]].forEach(([nx, ny, c]) => {
        corkboard.add(box(0.12, 0.09, 0.004, c, nx, ny, 0.018, { cast: false }));
    });
    corkboard.rotation.y = -Math.PI / 2;
    corkboard.position.set(X_MAX - 0.03, FLOOR2_Y + 1.0, 0.7);
    world.add(corkboard);

    const rope = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.014, 8, 24), new THREE.MeshStandardMaterial({ color: 0xc9a85c, roughness: 0.85 }));
    rope.rotation.y = -Math.PI / 2;
    rope.position.set(X_MAX - 0.03, FLOOR2_Y + 0.55, 2.3);
    world.add(rope);
    const rope2 = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 8, 24), new THREE.MeshStandardMaterial({ color: 0xc9a85c, roughness: 0.85 }));
    rope2.rotation.set(0.3, -Math.PI / 2, 0.2);
    rope2.position.set(X_MAX - 0.045, FLOOR2_Y + 0.5, 2.34);
    world.add(rope2);

    const boyShelf = new THREE.Group();
    boyShelf.add(box(0.32, 1.3, 0.9, 0xd98f4a, 0, 0.65, 0));
    boyShelf.add(box(0.34, 0.05, 0.85, 0x8a5a2a, 0, 0.42, 0));
    boyShelf.add(box(0.34, 0.05, 0.85, 0x8a5a2a, 0, 0.92, 0));
    boyShelf.add(box(0.02, 0.24, 0.2, 0xff8a5b, 0.18, 1.1, -0.3));
    boyShelf.add(box(0.02, 0.2, 0.18, 0x6fcf97, 0.18, 1.06, 0.05));
    boyShelf.add(cyl(0.1, 0.1, 0.2, 0xffd166, 0.18, 1.08, 0.32, { rotZ: Math.PI / 2 }));
    boyShelf.position.set(rightX - 0.18, FLOOR2_Y, 0.4);
    world.add(boyShelf);
    addObstacle(1, rightX - 0.18, 0.4, 0.36, 0.95);

    const boyChest = new THREE.Group();
    boyChest.add(box(0.62, 0.38, 0.4, 0x5b8fd9, 0, 0.19, 0));
    boyChest.add(box(0.65, 0.06, 0.43, 0x3e6bb0, 0, 0.41, 0));
    boyChest.position.set(2.05, FLOOR2_Y, 3.5);
    world.add(boyChest);
    addObstacle(1, 2.05, 3.5, 0.7, 0.46);

    const kidRug = new THREE.Mesh(new THREE.CircleGeometry(0.95, 40), new THREE.MeshStandardMaterial({ color: 0x6fb3d8, roughness: 1 }));
    kidRug.rotation.x = -Math.PI / 2;
    kidRug.position.set(2.55, FLOOR2_Y + 0.004, 0.3);
    world.add(kidRug);
    world.add(picture(0.4, 0.4, rightX - 0.01, FLOOR2_Y + 1.5, 1.6, -Math.PI / 2, 0xd98f4a, 0xffd166));

    function createRockingHorse() {
        const g = new THREE.Group();
        const wood = 0xd9a24a, woodDark = 0xb5792e, mane = 0x5b3a29;
        const rockerGeo = new THREE.TorusGeometry(0.26, 0.02, 8, 32, Math.PI * 0.62);
        const rockerMat = new THREE.MeshStandardMaterial({ color: woodDark, roughness: 0.6 });
        const rockerL = new THREE.Mesh(rockerGeo, rockerMat);
        rockerL.rotation.set(Math.PI / 2, 0, Math.PI * 1.19);
        rockerL.position.set(0, 0.035, -0.12);
        rockerL.castShadow = true;
        const rockerR = rockerL.clone();
        rockerR.position.set(0, 0.035, 0.12);
        g.add(rockerL, rockerR);
        [[-0.16, -0.12], [0.14, -0.12], [-0.16, 0.12], [0.14, 0.12]].forEach(([lx, lz]) => g.add(cyl(0.014, 0.014, 0.16, wood, lx, 0.12, lz, { seg: 8 })));
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.22, 6, 12), new THREE.MeshStandardMaterial({ color: wood, roughness: 0.55 }));
        body.rotation.z = Math.PI / 2;
        body.position.set(-0.03, 0.21, 0);
        body.castShadow = true;
        g.add(body);
        g.add(cyl(0.046, 0.058, 0.145, wood, -0.16, 0.305, 0, { rotZ: 0.55, seg: 10 }));
        g.add(box(0.08, 0.093, 0.075, wood, -0.25, 0.41, 0));
        g.add(box(0.064, 0.046, 0.058, wood, -0.305, 0.39, 0));
        g.add(box(0.023, 0.04, 0.014, 0x2b2b2b, -0.226, 0.435, 0.032));
        g.add(box(0.023, 0.04, 0.014, 0x2b2b2b, -0.226, 0.435, -0.032));
        g.add(box(0.02, 0.046, 0.017, wood, -0.226, 0.47, 0.023, { rotY: -0.3 }));
        g.add(box(0.02, 0.046, 0.017, wood, -0.226, 0.47, -0.023, { rotY: 0.3 }));
        for (let i = 0; i < 5; i++) g.add(box(0.017, 0.04, 0.029, mane, -0.217 + i * 0.029, 0.435 - i * 0.006, 0));
        g.add(cyl(0.006, 0.026, 0.1, mane, 0.081, 0.245, 0, { rotZ: -0.5, seg: 8 }));
        g.add(box(0.1, 0.023, 0.115, 0xc0392b, -0.03, 0.284, 0));
        g.add(cyl(0.006, 0.006, 0.08, woodDark, -0.18, 0.37, 0, { seg: 6 }));
        g.rotation.y = -0.5;
        return g;
    }
    const rockingHorse = createRockingHorse();
    rockingHorse.position.set(2.4, FLOOR2_Y, 0.15);
    world.add(rockingHorse);
    addObstacle(1, 2.4, 0.15, 0.55, 0.5);

    const BALL_COLORS = [0xff5e5e, 0x5b9dff, 0xffd166, 0x6fcf67, 0xb570ff];
    const balls = [];
    [[1.6, 1.6], [2.0, 2.3], [3.4, 2.7], [3.9, 1.2]].forEach(([x, z], i) => {
        const r = 0.075 + (i % 2) * 0.015;
        const g = new THREE.Group();
        g.add(ball3(r, BALL_COLORS[i % BALL_COLORS.length], 0, 0, 0));
        const band = new THREE.Mesh(new THREE.TorusGeometry(r * 0.98, r * 0.12, 8, 20), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }));
        band.rotation.x = Math.PI / 2 + (i * 0.6);
        band.castShadow = true;
        g.add(band);
        g.position.set(x, FLOOR2_Y + r, z);
        world.add(g);
        balls.push({ mesh: g, radius: r, vx: 0, vz: 0 });
    });

    const blockColors = [0xff5e5e, 0xffd166, 0x5b9dff];
    const blocksGroup = new THREE.Group();
    for (let i = 0; i < 3; i++) blocksGroup.add(box(0.09, 0.09, 0.09, blockColors[i], 0, 0.045 + i * 0.093, 0, { rotY: i * 0.35 }));
    blocksGroup.position.set(1.7, FLOOR2_Y, 3.6);
    world.add(blocksGroup);
    addObstacle(1, 1.7, 3.6, 0.17, 0.17);

    function createTeddy() {
        const g = new THREE.Group();
        const fur = 0x9a6b3f;
        g.add(ball3(0.08, fur, 0, 0.085, 0));
        g.add(ball3(0.051, fur, 0, 0.165, 0));
        g.add(ball3(0.017, 0x6b4429, -0.026, 0.17, 0.042));
        g.add(ball3(0.017, 0x6b4429, 0.026, 0.17, 0.042));
        g.add(ball3(0.043, fur, -0.08, 0.085, 0));
        g.add(ball3(0.043, fur, 0.08, 0.085, 0));
        g.add(ball3(0.034, fur, -0.043, 0.023, 0));
        g.add(ball3(0.034, fur, 0.043, 0.023, 0));
        return g;
    }
    const teddy = createTeddy();
    teddy.position.set(3.0, FLOOR2_Y, 0.2);
    teddy.rotation.y = 0.4;
    world.add(teddy);
    addObstacle(1, 3.0, 0.2, 0.2, 0.2);

    [[0xd6413f, 1.6, 3.0, 0.1], [0x4aa8e0, 2.0, 3.3, -0.4], [0xffd166, 2.4, 3.05, 0.6]].forEach(([c, x, z, rot]) => {
        const car = createCarToy(c);
        car.position.set(x, FLOOR2_Y, z);
        car.rotation.y = rot;
        world.add(car);
        addObstacle(1, x, z, 0.13, 0.07);
    });
    const track = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 8, 40), new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 }));
    track.rotation.x = Math.PI / 2;
    track.position.set(2.2, FLOOR2_Y + 0.005, 2.2);
    track.receiveShadow = true;
    world.add(track);

    const beanbag = ball3(0.22, 0x9c6bd9, 3.6, FLOOR2_Y + 0.121, 1.2, { seg: 16 });
    beanbag.scale.set(1, 0.55, 1);
    world.add(beanbag);
    addObstacle(1, 3.6, 1.2, 0.44, 0.44);

    function createTeepee() {
        const g = new THREE.Group();
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.8, 12, 1, true), new THREE.MeshStandardMaterial({ color: 0xe8d9b5, roughness: 0.9, side: THREE.DoubleSide }));
        cone.position.y = 0.4;
        cone.castShadow = true;
        g.add(cone);
        [[-0.15, 0xc0392b], [0.15, 0x4a72b0]].forEach(([dz, c]) => {
            g.add(box(0.02, 0.5, 0.16, c, 0.38, 0.3, dz, { rotY: 0.3, cast: false }));
        });
        [0, 1, 2].forEach((i) => {
            const a = (i / 3) * Math.PI * 2;
            g.add(cyl(0.008, 0.01, 0.22, 0x6b4429, Math.cos(a) * 0.02, 0.9, Math.sin(a) * 0.02, { seg: 6, rotX: 0.15 * Math.cos(a), rotZ: 0.15 * Math.sin(a) }));
        });
        return g;
    }
    const teepee = createTeepee();
    teepee.position.set(1.75, FLOOR2_Y, 2.6);
    world.add(teepee);
    addObstacle(1, 1.75, 2.6, 0.5, 0.5);

    const growthChart = new THREE.Group();
    growthChart.add(box(0.14, 1.2, 0.015, 0xf0d9a8, 0, 0, 0, { cast: false }));
    [0.2, 0.4, 0.6, 0.8, 1.0].forEach((h) => growthChart.add(box(0.06, 0.012, 0.02, 0x6b4429, -0.02, h - 0.6, 0.01, { cast: false })));
    growthChart.rotation.y = -Math.PI / 2;
    growthChart.position.set(rightX - 0.02, FLOOR2_Y + 0.7, -0.2);
    world.add(growthChart);

    const abcColors = [0xff5e5e, 0xffd166, 0x5b9dff, 0x6fcf67];
    abcColors.forEach((c, i) => boyShelf.add(box(0.05, 0.05, 0.05, c, -0.12 + i * 0.06, 0.965, -0.15, { cast: false })));

    const extraToyFigure = new THREE.Group();
    extraToyFigure.add(cyl(0.02, 0.024, 0.08, 0x5b8fd9, 0, 0.04, 0, { seg: 10 }));
    extraToyFigure.add(ball3(0.02, 0xffcf9e, 0, 0.1, 0, { seg: 10 }));
    extraToyFigure.add(cyl(0.028, 0.028, 0.006, 0x6b4429, 0, 0.115, 0, { seg: 10 }));
    extraToyFigure.add(cyl(0.016, 0.02, 0.025, 0x8a5a2a, 0, 0.13, 0, { seg: 10 }));
    extraToyFigure.position.set(2.05, FLOOR2_Y + 0.44, 3.3);
    world.add(extraToyFigure);

    world.add(lampPendant(3.2, upperCeilingY(1.5), 1.5));
    world.add(lampWallSpot(rightX, FLOOR2_Y + 1.0, 3.5, 'x', -1));

    function update(dt, playerState, elapsedTime) {
        rockingHorse.rotation.z = Math.sin(elapsedTime * 1.3) * 0.06;

        for (const b of balls) {
            const dx = b.mesh.position.x - playerState.x;
            const dz = b.mesh.position.z - playerState.z;
            const dist = Math.hypot(dx, dz);
            const minDist = b.radius + PLAYER_RADIUS;
            if (playerState.floor === 1 && dist < minDist && dist > 0.0001) {
                const push = (minDist - dist);
                const nx = dx / dist, nz = dz / dist;
                b.mesh.position.x += nx * push;
                b.mesh.position.z += nz * push;
                const kick = 0.8 + playerState.moveSpeed * 0.5;
                b.vx += nx * kick * dt * 20;
                b.vz += nz * kick * dt * 20;
            }
        }
        for (const b of balls) {
            b.vx *= 0.94;
            b.vz *= 0.94;
            let bx = b.mesh.position.x + b.vx * dt;
            let bz = b.mesh.position.z + b.vz * dt;
            bx = Math.max(BOUNDS.minX + b.radius, Math.min(BOUNDS.maxX - b.radius, bx));
            bz = Math.max(BOUNDS.minZ + b.radius, Math.min(BOUNDS.maxZ - b.radius, bz));
            [bx, bz] = resolveObstacles(bx, bz, b.radius, obstaclesByFloor[1]);
            b.mesh.position.x = bx;
            b.mesh.position.z = bz;
            const speed = Math.hypot(b.vx, b.vz);
            if (speed > 0.001) {
                const axis = new THREE.Vector3(-b.vz, 0, b.vx).normalize();
                b.mesh.rotateOnWorldAxis(axis, speed * dt / b.radius);
            }
        }
    }

    return { kidRug, balls, update };
}
