/* Spielzeug-Abenteuer
 * Kleine Spielfigur läuft durch ein Haus (Flur -> Kinderzimmer) voller Spielzeug.
 * Steuerung: WASD/Pfeiltasten = laufen, Leertaste = hüpfen, Maus ziehen = Kamera drehen.
 */

(() => {
    const canvas = document.getElementById('game');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xbfe3ff);
    scene.fog = new THREE.Fog(0xbfe3ff, 14, 30);

    const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 100);

    // ---------- Lighting ----------
    scene.add(new THREE.HemisphereLight(0xfff3d6, 0x40342a, 0.75));

    const sun = new THREE.DirectionalLight(0xfff0d0, 1.1);
    sun.position.set(6, 9, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -14;
    sun.shadow.camera.right = 14;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -12;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 30;
    sun.shadow.bias = -0.0015;
    scene.add(sun);

    const lamp = new THREE.PointLight(0xffd8a0, 0.6, 10, 2);
    lamp.position.set(6, 3.3, 2.5);
    scene.add(lamp);

    // ---------- Helpers ----------
    function box(w, h, d, color, x, y, z, opts = {}) {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            new THREE.MeshStandardMaterial({ color, roughness: opts.roughness ?? 0.8, metalness: opts.metalness ?? 0.05 })
        );
        mesh.position.set(x, y, z);
        if (opts.rotY) mesh.rotation.y = opts.rotY;
        mesh.castShadow = opts.cast !== false;
        mesh.receiveShadow = opts.receive !== false;
        return mesh;
    }

    function cyl(rTop, rBot, h, color, x, y, z, opts = {}) {
        const mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(rTop, rBot, h, opts.seg ?? 16),
            new THREE.MeshStandardMaterial({ color, roughness: opts.roughness ?? 0.75 })
        );
        mesh.position.set(x, y, z);
        if (opts.rotZ) mesh.rotation.z = opts.rotZ;
        if (opts.rotX) mesh.rotation.x = opts.rotX;
        mesh.castShadow = opts.cast !== false;
        mesh.receiveShadow = opts.receive !== false;
        return mesh;
    }

    function ball3(r, color, x, y, z) {
        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(r, 24, 18),
            new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.05 })
        );
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    // ---------- Obstacles (AABB collision list) ----------
    const obstacles = []; // { minX, maxX, minZ, maxZ }
    function addObstacle(cx, cz, w, d) {
        obstacles.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
    }

    const world = new THREE.Group();
    scene.add(world);

    // House bounds: hallway x[-6,0] + kinderzimmer x[0,10], both z[-5,5]
    const BOUNDS = { minX: -5.65, maxX: 9.65, minZ: -4.65, maxZ: 4.65 };
    const WALL_H = 4.2;

    // Floors
    const hallFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 10),
        new THREE.MeshStandardMaterial({ color: 0xcdb48a, roughness: 0.9 })
    );
    hallFloor.rotation.x = -Math.PI / 2;
    hallFloor.position.set(-3, 0, 0);
    hallFloor.receiveShadow = true;
    world.add(hallFloor);

    const kidFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 10),
        new THREE.MeshStandardMaterial({ color: 0xe8d3a0, roughness: 0.9 })
    );
    kidFloor.rotation.x = -Math.PI / 2;
    kidFloor.position.set(5, 0, 0);
    kidFloor.receiveShadow = true;
    world.add(kidFloor);

    // Rugs
    const hallRug = new THREE.Mesh(new THREE.CircleGeometry(1.8, 32), new THREE.MeshStandardMaterial({ color: 0x7a4a3a, roughness: 1 }));
    hallRug.rotation.x = -Math.PI / 2;
    hallRug.position.set(-3, 0.01, 1.2);
    hallRug.receiveShadow = true;
    world.add(hallRug);

    const kidRug = new THREE.Mesh(new THREE.CircleGeometry(2.6, 40), new THREE.MeshStandardMaterial({ color: 0x6fb3d8, roughness: 1 }));
    kidRug.rotation.x = -Math.PI / 2;
    kidRug.position.set(6, 0.01, 0.5);
    kidRug.receiveShadow = true;
    world.add(kidRug);

    // Walls
    function wall(w, h, d, color, x, y, z) {
        const m = box(w, h, d, color, x, y, z, { cast: false });
        world.add(m);
        return m;
    }
    // Outer walls
    wall(0.3, WALL_H, 10.3, 0xf4ede1, -6.15, WALL_H / 2, 0);          // hallway left
    wall(16.3, WALL_H, 0.3, 0xf4ede1, 2, WALL_H / 2, -5.15);          // back wall (both rooms)
    wall(16.3, WALL_H, 0.3, 0xf4ede1, 2, WALL_H / 2, 5.15);           // front wall
    wall(0.3, WALL_H, 10.3, 0xffe8ce, 10.15, WALL_H / 2, 0);          // kinderzimmer right
    addObstacle(-6.15, 0, 0.3, 10.3);
    addObstacle(2, -5.15, 16.3, 0.3);
    addObstacle(2, 5.15, 16.3, 0.3);
    addObstacle(10.15, 0, 0.3, 10.3);

    // Dividing wall with doorway gap at z[-1.3, 1.3]
    wall(0.3, WALL_H, 3.65, 0xead9c2, 0, WALL_H / 2, -4.325);
    wall(0.3, WALL_H, 3.65, 0xead9c2, 0, WALL_H / 2, 4.325);
    addObstacle(0, -4.325, 0.3, 3.65);
    addObstacle(0, 4.325, 0.3, 3.65);
    // door frame trim
    world.add(box(0.35, 0.25, 3, 0x8a5a3a, 0, WALL_H - 0.9, 0, { cast: false }));

    // Windows (visual only, cut with a lighter panel)
    world.add(box(0.05, 1.6, 1.8, 0x9fd4ff, -6.1, 2.1, -1.5, { metalness: 0.3, roughness: 0.1, cast: false }));
    world.add(box(0.05, 1.6, 1.8, 0x9fd4ff, 10.1, 2.1, 1.8, { metalness: 0.3, roughness: 0.1, cast: false }));
    world.add(box(0.15, 1.8, 2.0, 0xffffff, -6.05, 2.1, -1.5, { cast: false }));
    world.add(box(0.15, 1.8, 2.0, 0xffffff, 10.05, 2.1, 1.8, { cast: false }));

    // ---------- Hallway furniture ----------
    const couch = new THREE.Group();
    couch.add(box(2.2, 0.55, 0.9, 0xd45d5d, 0, 0.3, 0));
    couch.add(box(2.2, 0.5, 0.2, 0xc24b4b, 0, 0.75, -0.35));
    couch.add(box(0.22, 0.6, 0.9, 0xc24b4b, -1.1, 0.45, 0));
    couch.add(box(0.22, 0.6, 0.9, 0xc24b4b, 1.1, 0.45, 0));
    couch.position.set(-4.9, 0, -3.5);
    world.add(couch);
    addObstacle(-4.9, -3.5, 2.3, 1.1);

    const table = new THREE.Group();
    table.add(cyl(0.55, 0.55, 0.08, 0x8a5a3a, 0, 0.5, 0));
    table.add(cyl(0.06, 0.06, 0.5, 0x6b4429, 0, 0.25, 0));
    table.position.set(-4.4, 0, -1.1);
    world.add(table);
    addObstacle(-4.4, -1.1, 1.1, 1.1);

    const lampPole = new THREE.Group();
    lampPole.add(cyl(0.04, 0.06, 1.6, 0x4a4a4a, 0, 0.8, 0));
    lampPole.add(cyl(0.28, 0.2, 0.35, 0xffe6a8, 0, 1.7, 0));
    lampPole.position.set(-1.0, 0, -4.0);
    world.add(lampPole);
    addObstacle(-1.0, -4.0, 0.5, 0.5);

    // ---------- Kinderzimmer furniture ----------
    const bed = new THREE.Group();
    bed.add(box(1.6, 0.45, 2.6, 0xffffff, 0, 0.3, 0));
    bed.add(box(1.7, 0.5, 0.15, 0x6fb3d8, 0, 0.55, -1.28));
    bed.add(box(0.7, 0.15, 0.5, 0xffd6e0, 0.35, 0.6, -0.9));
    bed.position.set(8.6, 0, -3.4);
    world.add(bed);
    addObstacle(8.6, -3.4, 1.7, 2.7);

    const shelf = new THREE.Group();
    shelf.add(box(1.8, 1.6, 0.35, 0xd98f4a, 0, 0.8, 0));
    shelf.add(box(1.7, 0.06, 0.3, 0x8a5a2a, 0, 0.5, 0));
    shelf.add(box(1.7, 0.06, 0.3, 0x8a5a2a, 0, 1.1, 0));
    shelf.add(box(0.35, 0.35, 0.28, 0xff8a5b, -0.6, 1.35, 0.02));
    shelf.add(box(0.3, 0.3, 0.28, 0x6fcf97, 0.1, 1.32, 0.02));
    shelf.add(cyl(0.15, 0.15, 0.3, 0xffd166, 0.6, 1.3, 0.02));
    shelf.position.set(3.6, 0, -4.6);
    world.add(shelf);
    addObstacle(3.6, -4.6, 1.9, 0.5);

    const toyChest = new THREE.Group();
    toyChest.add(box(1.1, 0.6, 0.6, 0x5b8fd9, 0, 0.3, 0));
    toyChest.add(box(1.15, 0.1, 0.65, 0x3e6bb0, 0, 0.65, 0));
    toyChest.position.set(9.0, 0, 3.7);
    world.add(toyChest);
    addObstacle(9.0, 3.7, 1.2, 0.7);

    // Curtain
    world.add(cyl(0.04, 0.04, 2.1, 0xff8a8a, 10.08, 3.0, 1.8, { rotZ: Math.PI / 2, cast: false }));

    // ---------- Toys: rocking horse ----------
    function createRockingHorse() {
        const g = new THREE.Group();
        const wood = 0xd9a24a;
        const woodDark = 0xb5792e;
        const mane = 0x5b3a29;

        // Rockers (curved base) using partial torus arcs laid flat
        const rockerGeo = new THREE.TorusGeometry(0.9, 0.07, 8, 32, Math.PI * 0.62);
        const rockerMat = new THREE.MeshStandardMaterial({ color: woodDark, roughness: 0.6 });
        const rockerL = new THREE.Mesh(rockerGeo, rockerMat);
        rockerL.rotation.set(Math.PI / 2, 0, Math.PI * 1.19);
        rockerL.position.set(0, 0.12, -0.42);
        rockerL.castShadow = true;
        const rockerR = rockerL.clone();
        rockerR.position.set(0, 0.12, 0.42);
        g.add(rockerL, rockerR);

        // Legs connecting body to rockers
        [[-0.55, -0.42], [0.5, -0.42], [-0.55, 0.42], [0.5, 0.42]].forEach(([lx, lz]) => {
            g.add(cyl(0.05, 0.05, 0.55, wood, lx, 0.42, lz, { seg: 8 }));
        });

        // Body
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.33, 0.75, 6, 12), new THREE.MeshStandardMaterial({ color: wood, roughness: 0.55 }));
        body.rotation.z = Math.PI / 2;
        body.position.set(-0.1, 0.72, 0);
        body.castShadow = true;
        g.add(body);

        // Neck + head
        const neck = cyl(0.16, 0.2, 0.5, wood, -0.55, 1.05, 0, { rotZ: 0.55, seg: 10 });
        g.add(neck);
        const head = box(0.28, 0.32, 0.26, wood, -0.86, 1.42, 0, { rotY: 0 });
        g.add(head);
        const snout = box(0.22, 0.16, 0.2, wood, -1.05, 1.34, 0);
        g.add(snout);
        g.add(box(0.08, 0.14, 0.05, 0x2b2b2b, -0.78, 1.5, 0.11));
        g.add(box(0.08, 0.14, 0.05, 0x2b2b2b, -0.78, 1.5, -0.11));
        // ears
        g.add(box(0.07, 0.16, 0.06, wood, -0.78, 1.62, 0.08, { rotY: -0.3 }));
        g.add(box(0.07, 0.16, 0.06, wood, -0.78, 1.62, -0.08, { rotY: 0.3 }));
        // mane
        for (let i = 0; i < 5; i++) {
            g.add(box(0.06, 0.14, 0.1, mane, -0.75 + i * 0.1, 1.5 - i * 0.02, 0));
        }
        // tail
        g.add(cyl(0.02, 0.09, 0.35, mane, 0.28, 0.85, 0, { rotZ: -0.5, seg: 8 }));
        // saddle
        g.add(box(0.35, 0.08, 0.4, 0xc0392b, -0.1, 0.98, 0));
        // handle pole near head
        g.add(cyl(0.02, 0.02, 0.28, woodDark, -0.62, 1.28, 0, { rotX: 0, seg: 6 }));

        g.rotation.y = -0.5;
        return g;
    }

    const rockingHorse = createRockingHorse();
    rockingHorse.position.set(6.6, 0, -1.0);
    world.add(rockingHorse);
    addObstacle(6.6, -1.0, 1.9, 1.6);

    // ---------- Toys: balls ----------
    const BALL_COLORS = [0xff5e5e, 0x5b9dff, 0xffd166, 0x6fcf67, 0xb570ff];
    const balls = [];
    const ballSpots = [
        [4.5, 1.5], [5.6, 2.6], [7.4, 1.0], [3.4, -1.5], [8.4, -0.2]
    ];
    ballSpots.forEach(([x, z], i) => {
        const r = 0.26 + (i % 2) * 0.05;
        const g = new THREE.Group();
        const sphere = ball3(r, BALL_COLORS[i % BALL_COLORS.length], 0, 0, 0);
        g.add(sphere);
        const band = new THREE.Mesh(new THREE.TorusGeometry(r * 0.98, r * 0.12, 8, 20), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }));
        band.rotation.x = Math.PI / 2 + (i * 0.6);
        band.castShadow = true;
        g.add(band);
        g.position.set(x, r, z);
        world.add(g);
        balls.push({ mesh: g, radius: r, vx: 0, vz: 0 });
    });

    // ---------- Toy blocks stack ----------
    const blockColors = [0xff5e5e, 0xffd166, 0x5b9dff];
    const blocksGroup = new THREE.Group();
    for (let i = 0; i < 3; i++) {
        const b = box(0.32, 0.32, 0.32, blockColors[i], 0, 0.16 + i * 0.33, 0, { rotY: i * 0.35 });
        blocksGroup.add(b);
    }
    blocksGroup.position.set(2.4, 0, 3.2);
    world.add(blocksGroup);
    addObstacle(2.4, 3.2, 0.6, 0.6);

    // ---------- Teddy bear ----------
    function createTeddy() {
        const g = new THREE.Group();
        const fur = 0x9a6b3f;
        g.add(ball3(0.28, fur, 0, 0.3, 0));
        g.add(ball3(0.18, fur, 0, 0.58, 0));
        g.add(ball3(0.06, 0x6b4429, -0.09, 0.6, 0.15));
        g.add(ball3(0.06, 0x6b4429, 0.09, 0.6, 0.15));
        g.add(ball3(0.15, fur, -0.28, 0.3, 0));
        g.add(ball3(0.15, fur, 0.28, 0.3, 0));
        g.add(ball3(0.12, fur, -0.15, 0.08, 0));
        g.add(ball3(0.12, fur, 0.15, 0.08, 0));
        return g;
    }
    const teddy = createTeddy();
    teddy.position.set(5.0, 0, 3.6);
    teddy.rotation.y = 0.4;
    world.add(teddy);
    addObstacle(5.0, 3.6, 0.6, 0.6);

    // ---------- Player (small toy figure / game piece) ----------
    const player = new THREE.Group();
    const skin = 0xffcf9e;
    const tunic = 0x3f6fd1;
    const trim = 0xffd166;

    const base = cyl(0.32, 0.34, 0.06, 0x2b2b2b, 0, 0.03, 0, { seg: 24 });
    player.add(base);

    const legL = cyl(0.07, 0.08, 0.32, 0x274a8f, -0.11, 0.22, 0, { seg: 10 });
    const legR = cyl(0.07, 0.08, 0.32, 0x274a8f, 0.11, 0.22, 0, { seg: 10 });
    player.add(legL, legR);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.32, 4, 10), new THREE.MeshStandardMaterial({ color: tunic, roughness: 0.6 }));
    torso.position.set(0, 0.56, 0);
    torso.castShadow = true;
    player.add(torso);

    player.add(box(0.42, 0.06, 0.2, trim, 0, 0.42, 0));

    const armL = cyl(0.055, 0.06, 0.28, tunic, -0.24, 0.55, 0, { seg: 8 });
    const armR = cyl(0.055, 0.06, 0.28, tunic, 0.24, 0.55, 0, { seg: 8 });
    player.add(armL, armR);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 16), new THREE.MeshStandardMaterial({ color: skin, roughness: 0.6 }));
    head.position.set(0, 0.86, 0);
    head.castShadow = true;
    player.add(head);

    player.add(box(0.19, 0.08, 0.19, 0x3a2a1a, 0, 0.96, -0.01)); // hair cap
    player.add(box(0.22, 0.1, 0.2, 0xd6413f, 0, 1.0, -0.02, { rotY: 0.05 })); // little beret
    player.add(ball3(0.02, 0x222222, -0.06, 0.87, 0.15));
    player.add(ball3(0.02, 0x222222, 0.06, 0.87, 0.15));

    const bodyTilt = new THREE.Group();
    bodyTilt.add(player);
    world.add(bodyTilt);

    // ---------- Player state ----------
    // Control + camera mechanics modeled after dhl-city/character.html:
    // tank steering (turn + forward/back), fixed auto-follow chase camera,
    // accel/decel movement, and a windup/air/land jump state machine.
    const JUMP_STATE = { NONE: 0, WINDUP: 1, AIR: 2, LAND: 3 };
    const WINDUP_DUR = 0.15;
    const LAND_DUR = 0.25;

    const state = {
        x: -3, z: 3, y: 0, vy: 0,
        yaw: Math.PI,
        grounded: true,
        moveSpeed: 0,
        walkPhase: 0,
        jumpState: JUMP_STATE.NONE,
        jumpTimer: 0,
        jumpBuffered: false,
    };

    const PLAYER_RADIUS = 0.35;
    const SPEED_MAX = 3.6;
    const ACCEL_RATE = 8.5;
    const DECEL_RATE = 11;
    const TURN_RATE = 2.0;
    const GRAVITY = -20;
    const JUMP_VEL = 7.4;

    function lerp(a, b, t) { return a + (b - a) * t; }

    // ---------- Input ----------
    const keys = new Set();
    window.addEventListener('keydown', (e) => {
        keys.add(e.code);
        if (e.code === 'Space') { state.jumpBuffered = true; e.preventDefault(); }
    });
    window.addEventListener('keyup', (e) => keys.delete(e.code));

    // ---------- Camera rig (fixed auto-follow chase camera, toy's-eye style) ----------
    const CAM_DIST_MOVE = 3.8;
    const CAM_DIST_IDLE = 2.5;
    const CAM_HEIGHT = 1.4;
    const CAM_LOOK_HEIGHT = 0.65;
    let camDist = CAM_DIST_IDLE;

    const camTarget = new THREE.Vector3();
    const camDesired = new THREE.Vector3();
    const camRay = new THREE.Raycaster();
    const camRayDir = new THREE.Vector3();
    const camPivot = new THREE.Vector3();

    // ---------- Collision resolution ----------
    function resolveObstacles(x, z, radius) {
        for (const o of obstacles) {
            const cx = Math.max(o.minX, Math.min(x, o.maxX));
            const cz = Math.max(o.minZ, Math.min(z, o.maxZ));
            const dx = x - cx, dz = z - cz;
            const distSq = dx * dx + dz * dz;
            if (distSq < radius * radius) {
                const dist = Math.sqrt(distSq) || 0.0001;
                const push = radius - dist;
                x += (dx / dist) * push;
                z += (dz / dist) * push;
            }
        }
        return [x, z];
    }

    // ---------- Update ----------
    // Objects the camera should not clip through (excludes floors/rugs/player/loose balls)
    const excludedFromCamera = new Set([hallFloor, kidFloor, hallRug, kidRug, bodyTilt, ...balls.map(b => b.mesh)]);
    const cameraBlockers = world.children.filter(child => !excludedFromCamera.has(child));

    const clock = new THREE.Clock();

    function update(dt) {
        dt = Math.min(dt, 0.05);

        // Tank steering: A/D (or ←/→) turn in place, W/S (or ↑/↓) move along facing direction
        if (keys.has('KeyA') || keys.has('ArrowLeft')) state.yaw += TURN_RATE * dt;
        if (keys.has('KeyD') || keys.has('ArrowRight')) state.yaw -= TURN_RATE * dt;

        const fwdX = Math.sin(state.yaw), fwdZ = Math.cos(state.yaw);
        const wantForward = keys.has('KeyW') || keys.has('ArrowUp');
        const wantBack = keys.has('KeyS') || keys.has('ArrowDown');
        const wantMove = (wantForward || wantBack) && state.jumpState !== JUMP_STATE.WINDUP;

        if (wantMove) state.moveSpeed = Math.min(state.moveSpeed + ACCEL_RATE * dt, SPEED_MAX);
        else state.moveSpeed = Math.max(state.moveSpeed - DECEL_RATE * dt, 0);

        if (wantForward) { state.x += fwdX * state.moveSpeed * dt; state.z += fwdZ * state.moveSpeed * dt; }
        if (wantBack) { state.x -= fwdX * state.moveSpeed * dt; state.z -= fwdZ * state.moveSpeed * dt; }
        if (wantMove) state.walkPhase += dt * state.moveSpeed * 3.2;

        // Clamp to house bounds
        state.x = Math.max(BOUNDS.minX + PLAYER_RADIUS, Math.min(BOUNDS.maxX - PLAYER_RADIUS, state.x));
        state.z = Math.max(BOUNDS.minZ + PLAYER_RADIUS, Math.min(BOUNDS.maxZ - PLAYER_RADIUS, state.z));

        [state.x, state.z] = resolveObstacles(state.x, state.z, PLAYER_RADIUS);

        // Jump state machine: buffered input -> windup (crouch) -> air (tuck) -> land (squat)
        if (state.jumpBuffered && state.grounded && state.jumpState !== JUMP_STATE.WINDUP && state.jumpState !== JUMP_STATE.AIR) {
            state.jumpState = JUMP_STATE.WINDUP;
            state.jumpTimer = 0;
            state.jumpBuffered = false;
        }
        if (state.jumpState === JUMP_STATE.WINDUP) {
            state.jumpTimer += dt;
            if (state.jumpTimer >= WINDUP_DUR) {
                state.vy = JUMP_VEL;
                state.grounded = false;
                state.jumpState = JUMP_STATE.AIR;
                state.jumpTimer = 0;
            }
        }
        if (state.jumpState === JUMP_STATE.LAND) {
            state.jumpTimer += dt;
            if (state.jumpTimer >= LAND_DUR) state.jumpState = JUMP_STATE.NONE;
        }

        state.vy += GRAVITY * dt;
        state.y += state.vy * dt;
        if (state.y <= 0) {
            if (state.vy < -1.5 && state.jumpState === JUMP_STATE.AIR) {
                state.jumpState = JUMP_STATE.LAND;
                state.jumpTimer = 0;
            } else if (state.jumpState === JUMP_STATE.AIR) {
                state.jumpState = JUMP_STATE.NONE;
            }
            state.y = 0;
            state.vy = 0;
            state.grounded = true;
        } else {
            state.grounded = false;
        }

        const moving = state.moveSpeed > 0.05;

        // Ball interactions
        for (const b of balls) {
            const dx = b.mesh.position.x - state.x;
            const dz = b.mesh.position.z - state.z;
            const dist = Math.hypot(dx, dz);
            const minDist = b.radius + PLAYER_RADIUS;
            if (dist < minDist && dist > 0.0001) {
                const push = (minDist - dist);
                const nx = dx / dist, nz = dz / dist;
                b.mesh.position.x += nx * push;
                b.mesh.position.z += nz * push;
                const kick = 3.2 + state.moveSpeed * 0.6;
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
            [bx, bz] = resolveObstacles(bx, bz, b.radius);
            b.mesh.position.x = bx;
            b.mesh.position.z = bz;
            const speed = Math.hypot(b.vx, b.vz);
            if (speed > 0.001) {
                const axis = new THREE.Vector3(-b.vz, 0, b.vx).normalize();
                b.mesh.rotateOnWorldAxis(axis, speed * dt / b.radius);
            }
        }

        // Rocking horse idle sway
        rockingHorse.rotation.z = Math.sin(clock.elapsedTime * 1.3) * 0.06 - 0.0;

        // Apply player transform
        bodyTilt.position.set(state.x, state.y, state.z);
        bodyTilt.rotation.y = state.yaw;

        // Pose per jump-state (windup crouch / air tuck / land squat / walk-idle)
        const TORSO_Y = 0.56;
        if (state.jumpState === JUMP_STATE.WINDUP) {
            const t = Math.min(state.jumpTimer / WINDUP_DUR, 1);
            const sq = Math.sin(t * Math.PI * 0.5);
            legL.rotation.x = lerp(legL.rotation.x, 0.5 * sq, 0.4);
            legR.rotation.x = lerp(legR.rotation.x, 0.5 * sq, 0.4);
            armL.rotation.x = lerp(armL.rotation.x, -0.6 * sq, 0.3);
            armR.rotation.x = lerp(armR.rotation.x, -0.6 * sq, 0.3);
            torso.position.y = lerp(torso.position.y, TORSO_Y - 0.12 * sq, 0.4);
            torso.rotation.x = lerp(torso.rotation.x, -0.25 * sq, 0.3);
        } else if (state.jumpState === JUMP_STATE.AIR) {
            legL.rotation.x = lerp(legL.rotation.x, 0.9, 0.2);
            legR.rotation.x = lerp(legR.rotation.x, 0.9, 0.2);
            armL.rotation.x = lerp(armL.rotation.x, -0.9, 0.2);
            armR.rotation.x = lerp(armR.rotation.x, -0.9, 0.2);
            torso.position.y = lerp(torso.position.y, TORSO_Y + 0.05, 0.2);
            torso.rotation.x = lerp(torso.rotation.x, 0.08, 0.15);
        } else if (state.jumpState === JUMP_STATE.LAND) {
            const t = Math.min(state.jumpTimer / LAND_DUR, 1);
            const sq = 1 - t;
            legL.rotation.x = lerp(legL.rotation.x, 0.55 * sq, 0.4);
            legR.rotation.x = lerp(legR.rotation.x, 0.55 * sq, 0.4);
            armL.rotation.x = lerp(armL.rotation.x, -0.5 * sq, 0.3);
            armR.rotation.x = lerp(armR.rotation.x, -0.5 * sq, 0.3);
            torso.position.y = lerp(torso.position.y, TORSO_Y - 0.16 * sq, 0.4);
            torso.rotation.x = lerp(torso.rotation.x, 0, 0.3);
        } else {
            const swing = moving ? Math.sin(state.walkPhase) * 0.55 : 0;
            legL.rotation.x = lerp(legL.rotation.x, swing, 0.3);
            legR.rotation.x = lerp(legR.rotation.x, -swing, 0.3);
            armL.rotation.x = lerp(armL.rotation.x, -swing, 0.3);
            armR.rotation.x = lerp(armR.rotation.x, swing, 0.3);
            torso.position.y = lerp(torso.position.y, TORSO_Y + (moving ? Math.abs(Math.sin(state.walkPhase)) * 0.02 : 0), 0.3);
            torso.rotation.x = lerp(torso.rotation.x, 0, 0.3);
        }

        // Camera: fixed auto-follow chase camera behind the character's facing
        // direction (no mouse orbit), pulling in closer when idle, with a
        // wall-avoidance raycast so it never clips through the house.
        camDist = lerp(camDist, moving ? CAM_DIST_MOVE : CAM_DIST_IDLE, Math.min(1, dt * 2.5));

        camPivot.set(state.x, state.y + 0.55, state.z);
        camDesired.set(
            state.x - fwdX * camDist,
            state.y + CAM_HEIGHT,
            state.z - fwdZ * camDist
        );
        camRayDir.subVectors(camDesired, camPivot);
        const desiredDist = camRayDir.length();
        camRayDir.normalize();
        camRay.set(camPivot, camRayDir);
        camRay.far = desiredDist;
        camRay.near = 0.05;
        const hits = camRay.intersectObjects(cameraBlockers, true);
        let allowedDist = desiredDist;
        if (hits.length) allowedDist = Math.max(0.6, hits[0].distance - 0.2);
        if (allowedDist < desiredDist) {
            camDesired.copy(camPivot).addScaledVector(camRayDir, allowedDist);
        }
        camera.position.lerp(camDesired, Math.min(1, dt * 6));

        camTarget.lerp(new THREE.Vector3(state.x, state.y + CAM_LOOK_HEIGHT, state.z), Math.min(1, dt * 8));
        camera.lookAt(camTarget);

        lamp.position.set(6, 3.3, 2.5);
    }

    function onResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onResize);
    onResize();

    let running = false;
    function loop() {
        requestAnimationFrame(loop);
        if (!running) return;
        update(clock.getDelta());
        renderer.render(scene, camera);
    }
    clock.start();
    loop();

    // ---------- Start screen ----------
    const startScreen = document.getElementById('start-screen');
    document.getElementById('start-btn').addEventListener('click', () => {
        startScreen.classList.add('hidden');
        running = true;
        clock.getDelta();
    });

    const hint = document.getElementById('hint');
    document.getElementById('hint-toggle').addEventListener('click', () => {
        hint.style.display = hint.style.display === 'none' ? 'block' : 'none';
    });

    // Render one static frame behind the start screen
    renderer.render(scene, camera);
    camera.position.set(-2, 3.2, 6);
    camera.lookAt(0, 1, 0);
    renderer.render(scene, camera);
})();
