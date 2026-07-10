/* Spielzeug-Abenteuer
 * Eine 10 cm kleine Spielfigur läuft durch ein normal großes Haus
 * (Wohnzimmer -> Kinderzimmer) voller Spielzeug. 1 Welteinheit = 1 Meter.
 * Steuerung: W/S bzw. Pfeil hoch/runter = vor/zurück, A/D bzw. Pfeil links/
 * rechts = drehen, Leertaste = hüpfen.
 */

(() => {
    const canvas = document.getElementById('game');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xbfe3ff);
    scene.fog = new THREE.Fog(0xbfe3ff, 18, 40);

    const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.02, 100);

    // ---------- Lighting ----------
    scene.add(new THREE.HemisphereLight(0xfff3d6, 0x40342a, 0.75));

    const sun = new THREE.DirectionalLight(0xfff0d0, 1.1);
    sun.position.set(3, 5, 2.5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -6;
    sun.shadow.camera.right = 6;
    sun.shadow.camera.top = 5;
    sun.shadow.camera.bottom = -5;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 16;
    sun.shadow.bias = -0.0012;
    scene.add(sun);

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

    function ball3(r, color, x, y, z, opts = {}) {
        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(r, opts.seg ?? 24, (opts.seg ?? 24) - 6),
            new THREE.MeshStandardMaterial({ color, roughness: opts.roughness ?? 0.35, metalness: opts.metalness ?? 0.05 })
        );
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    // Procedural wood-plank floor texture (Holzdielenboden) — no external assets.
    function createPlankTexture(baseHex, seed) {
        const w = 512, h = 512;
        const cnv = document.createElement('canvas');
        cnv.width = w; cnv.height = h;
        const ctx = cnv.getContext('2d');
        const base = new THREE.Color(baseHex);
        let s = seed;
        const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return (s / 0x7fffffff); };

        const plankPx = 44;
        for (let x = 0; x < w; x += plankPx) {
            const shade = 0.85 + rnd() * 0.3;
            const c = base.clone().multiplyScalar(shade);
            ctx.fillStyle = `rgb(${c.r * 255 | 0},${c.g * 255 | 0},${c.b * 255 | 0})`;
            ctx.fillRect(x, 0, plankPx - 1, h);

            // subtle grain streaks
            ctx.fillStyle = 'rgba(40,20,8,0.06)';
            for (let i = 0; i < 10; i++) {
                const gy = rnd() * h;
                ctx.fillRect(x + 2, gy, plankPx - 5, 1 + rnd() * 2);
            }

            // staggered end-seams
            let y = rnd() * h * 0.6;
            while (y < h) {
                ctx.fillStyle = 'rgba(35,18,8,0.45)';
                ctx.fillRect(x, y, plankPx - 1, 2);
                y += h * 0.35 + rnd() * h * 0.35;
            }

            // long seam between planks
            ctx.fillStyle = 'rgba(30,15,6,0.5)';
            ctx.fillRect(x + plankPx - 2, 0, 2, h);
        }

        const tex = new THREE.CanvasTexture(cnv);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }

    function picture(w, h, x, y, z, rotY, frameColor, canvasColor) {
        const g = new THREE.Group();
        g.add(box(w, h, 0.02, frameColor, 0, 0, 0));
        g.add(box(w - 0.05, h - 0.05, 0.01, canvasColor, 0, 0, 0.012));
        g.position.set(x, y, z);
        g.rotation.y = rotY;
        return g;
    }

    function houseplant(x, y, z, scale = 1) {
        const g = new THREE.Group();
        g.add(cyl(0.09 * scale, 0.11 * scale, 0.22 * scale, 0xb5652f, 0, 0.11 * scale, 0));
        g.add(cyl(0.012 * scale, 0.016 * scale, 0.55 * scale, 0x3e6b2e, 0, 0.22 * scale + 0.27 * scale, 0, { seg: 6 }));
        const leafColors = [0x2f7d32, 0x3d8f3a, 0x2a6b28];
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const leaf = ball3(0.12 * scale, leafColors[i % leafColors.length], Math.cos(a) * 0.10 * scale, 0.22 * scale + 0.5 * scale + Math.sin(i) * 0.05 * scale, Math.sin(a) * 0.10 * scale, { seg: 8 });
            leaf.scale.set(1, 1.4, 1);
            g.add(leaf);
        }
        g.position.set(x, y, z);
        return g;
    }

    function lampFloor(x, y, z) {
        const g = new THREE.Group();
        g.add(cyl(0.12, 0.14, 0.02, 0x333333, 0, 0.01, 0));
        g.add(cyl(0.012, 0.016, 1.3, 0x4a4a4a, 0, 0.66, 0, { seg: 8 }));
        g.add(cyl(0.16, 0.11, 0.22, 0xffe6a8, 0, 1.42, 0, { roughness: 0.5 }));
        g.position.set(x, y, z);
        return g;
    }

    function lampTable(x, y, z) {
        const g = new THREE.Group();
        g.add(cyl(0.01, 0.012, 0.14, 0xcccccc, 0, 0.07, 0, { seg: 8 }));
        g.add(cyl(0.09, 0.06, 0.13, 0xfff3d0, 0, 0.205, 0, { roughness: 0.5 }));
        g.position.set(x, y, z);
        return g;
    }

    // Door assembly: static frame (jambs + header) mounted in the wall opening,
    // plus a leaf that pivots around a vertical hinge line, with hinge plates
    // (static, on the frame) and a lever handle (on the leaf, opposite the hinge).
    function buildDoor(opts) {
        const {
            x, hingeZ, hingeSign, width = 0.80, height = 2.0, openAngle = 0,
            wallDepth = 0.15, frameColor = 0x8a5a3a, doorColor = 0xd8c39a,
        } = opts;
        const farZ = hingeZ + hingeSign * width;

        // Frame (Zarge): two jambs + header, does not rotate with the leaf
        const jambDepth = wallDepth + 0.05;
        world.add(box(jambDepth, height + 0.08, 0.05, frameColor, x, height / 2 + 0.02, hingeZ));
        world.add(box(jambDepth, height + 0.08, 0.05, frameColor, x, height / 2 + 0.02, farZ));
        world.add(box(jambDepth, 0.06, Math.abs(farZ - hingeZ) + 0.1, frameColor, x, height + 0.06, (hingeZ + farZ) / 2));

        // Hinges (Scharniere): static plates on the frame at the hinge line
        [0.18, 0.5, 0.82].forEach((f) => {
            world.add(box(0.05, 0.05, 0.014, 0x8c8c8c, x, f * height, hingeZ, { metalness: 0.6, roughness: 0.35 }));
        });

        // Leaf, pivoting around the hinge line at (x, hingeZ)
        const pivot = new THREE.Group();
        pivot.position.set(x, 0, hingeZ);
        pivot.rotation.y = openAngle;
        const leaf = box(0.045, height - 0.06, width, doorColor, 0, height / 2, hingeSign * width / 2);
        pivot.add(leaf);
        // Lever handle (Klinke) on the face, near the edge opposite the hinge
        const handleZ = hingeSign * (width - 0.11);
        pivot.add(box(0.014, 0.05, 0.008, 0xd8c23a, 0.03, height / 2, handleZ, { metalness: 0.7, roughness: 0.3 }));
        pivot.add(cyl(0.006, 0.006, 0.05, 0xd8c23a, 0.055, height / 2, handleZ, { seg: 8, rotZ: Math.PI / 2, roughness: 0.3, metalness: 0.7 }));
        world.add(pivot);

        return pivot;
    }

    // ---------- Obstacles (AABB collision list) ----------
    const obstacles = []; // { minX, maxX, minZ, maxZ }
    function addObstacle(cx, cz, w, d) {
        obstacles.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
    }

    const world = new THREE.Group();
    scene.add(world);

    // ---------- House layout (meters). Wohnzimmer + Kinderzimmer, shared depth. ----------
    const Z_MIN = -2.9, Z_MAX = 2.9;
    const LIVING_X_MIN = -4.6, LIVING_X_MAX = -0.15;
    const KID_X_MIN = 0.15, KID_X_MAX = 5.15;
    const WALL_H = 2.6;
    const DOOR_GAP = 0.43;
    const BOUNDS = { minX: LIVING_X_MIN, maxX: KID_X_MAX, minZ: Z_MIN, maxZ: Z_MAX };

    const WALL_COLOR = 0xf2ebe0;
    const WALL_COLOR_KID = 0xfbe9d3;

    // Floors: Holzdielenboden (wood plank flooring), procedural texture
    const TILE_M = 1.4; // real-world meters represented by one texture tile
    const livingPlankTex = createPlankTexture(0xc79a63, 7);
    livingPlankTex.repeat.set((LIVING_X_MAX - LIVING_X_MIN) / TILE_M, (Z_MAX - Z_MIN) / TILE_M);
    const livingFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(LIVING_X_MAX - LIVING_X_MIN, Z_MAX - Z_MIN),
        new THREE.MeshStandardMaterial({ map: livingPlankTex, roughness: 0.8 })
    );
    livingFloor.rotation.x = -Math.PI / 2;
    livingFloor.position.set((LIVING_X_MIN + LIVING_X_MAX) / 2, 0, 0);
    livingFloor.receiveShadow = true;
    world.add(livingFloor);

    const kidPlankTex = createPlankTexture(0xdcb37e, 23);
    kidPlankTex.repeat.set((KID_X_MAX - KID_X_MIN) / TILE_M, (Z_MAX - Z_MIN) / TILE_M);
    const kidFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(KID_X_MAX - KID_X_MIN, Z_MAX - Z_MIN),
        new THREE.MeshStandardMaterial({ map: kidPlankTex, roughness: 0.8 })
    );
    kidFloor.rotation.x = -Math.PI / 2;
    kidFloor.position.set((KID_X_MIN + KID_X_MAX) / 2, 0, 0);
    kidFloor.receiveShadow = true;
    world.add(kidFloor);

    // Rugs (Teppiche)
    const livingRug = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.7), new THREE.MeshStandardMaterial({ color: 0x7a4a3a, roughness: 1 }));
    livingRug.rotation.x = -Math.PI / 2;
    livingRug.position.set(-3.4, 0.004, -1.15);
    livingRug.receiveShadow = true;
    world.add(livingRug);

    const kidRug = new THREE.Mesh(new THREE.CircleGeometry(0.95, 40), new THREE.MeshStandardMaterial({ color: 0x6fb3d8, roughness: 1 }));
    kidRug.rotation.x = -Math.PI / 2;
    kidRug.position.set(2.6, 0.004, 0.6);
    kidRug.receiveShadow = true;
    world.add(kidRug);

    // Walls
    function wall(w, h, d, color, x, y, z) {
        const m = box(w, h, d, color, x, y, z, { cast: false });
        world.add(m);
        return m;
    }
    const leftX = LIVING_X_MIN - 0.075, rightX = KID_X_MAX + 0.075;
    const backZ = Z_MIN - 0.075, frontZ = Z_MAX + 0.075;
    const spanZ = frontZ - backZ, spanX = rightX - leftX;

    wall(0.15, WALL_H, spanZ, WALL_COLOR, leftX, WALL_H / 2, 0);                       // outer left (Wohnzimmer)
    wall(0.15, WALL_H, spanZ, WALL_COLOR_KID, rightX, WALL_H / 2, 0);                   // outer right (Kinderzimmer)
    wall(spanX, WALL_H, 0.15, WALL_COLOR, (leftX + rightX) / 2, WALL_H / 2, backZ);     // back wall
    wall(spanX, WALL_H, 0.15, WALL_COLOR, (leftX + rightX) / 2, WALL_H / 2, frontZ);    // front wall
    addObstacle(leftX, 0, 0.15, spanZ);
    addObstacle(rightX, 0, 0.15, spanZ);
    addObstacle((leftX + rightX) / 2, backZ, spanX, 0.15);
    addObstacle((leftX + rightX) / 2, frontZ, spanX, 0.15);

    // Fußbodenleisten (baseboards) along every interior wall face
    const BASE_H = 0.09, BASE_T = 0.02, BASE_COLOR = 0xf5f0e6;
    function baseboardZRun(x, zFrom, zTo) {
        world.add(box(BASE_T, BASE_H, zTo - zFrom, BASE_COLOR, x, BASE_H / 2, (zFrom + zTo) / 2, { cast: false }));
    }
    function baseboardXRun(z, xFrom, xTo) {
        world.add(box(xTo - xFrom, BASE_H, BASE_T, BASE_COLOR, (xFrom + xTo) / 2, BASE_H / 2, z, { cast: false }));
    }
    baseboardZRun(leftX + 0.085, backZ + 0.08, frontZ - 0.08);
    baseboardZRun(rightX - 0.085, backZ + 0.08, frontZ - 0.08);
    baseboardXRun(backZ + 0.085, leftX + 0.08, rightX - 0.08);
    baseboardXRun(frontZ - 0.085, leftX + 0.08, rightX - 0.08);

    // Dividing wall with doorway gap
    const seg1Len = (-DOOR_GAP) - backZ;
    const seg1Z = (backZ + -DOOR_GAP) / 2;
    const seg2Len = frontZ - DOOR_GAP;
    const seg2Z = (DOOR_GAP + frontZ) / 2;
    wall(0.3, WALL_H, seg1Len, 0xead9c2, 0, WALL_H / 2, seg1Z);
    wall(0.3, WALL_H, seg2Len, 0xead9c2, 0, WALL_H / 2, seg2Z);
    addObstacle(0, seg1Z, 0.3, seg1Len);
    addObstacle(0, seg2Z, 0.3, seg2Len);
    baseboardZRun(-0.16, backZ + 0.08, -DOOR_GAP);
    baseboardZRun(-0.16, DOOR_GAP, frontZ - 0.08);
    baseboardZRun(0.16, backZ + 0.08, -DOOR_GAP);
    baseboardZRun(0.16, DOOR_GAP, frontZ - 0.08);

    // Interior door: frame + hinged leaf, swung open into the Kinderzimmer
    buildDoor({ x: 0, hingeZ: -DOOR_GAP, hingeSign: 1, width: DOOR_GAP * 2 - 0.06, openAngle: Math.PI / 2, wallDepth: 0.3 });

    // Front door (Haustür), closed, mounted proud of the living-room outer wall's inner face
    buildDoor({ x: leftX + 0.11, hingeZ: 1.1, hingeSign: 1, width: 0.8, openAngle: 0, wallDepth: 0.05, frameColor: 0x6b4429, doorColor: 0x5a3a24 });

    // Windows (Fenster)
    function makeWindow(x, y, z, w, h, wallAxis) {
        const g = new THREE.Group();
        g.add(box(wallAxis === 'x' ? 0.04 : w, h, wallAxis === 'x' ? w : 0.04, 0xdff2ff, 0, 0, 0, { metalness: 0.3, roughness: 0.1, cast: false }));
        g.add(box(wallAxis === 'x' ? 0.02 : w + 0.05, 0.03, wallAxis === 'x' ? w + 0.05 : 0.02, 0xffffff, 0, h / 2 - 0.015, 0, { cast: false }));
        g.add(box(wallAxis === 'x' ? 0.02 : 0.03, h, wallAxis === 'x' ? 0.03 : 0.02, 0xffffff, 0, 0, wallAxis === 'x' ? 0 : 0, { cast: false }));
        g.position.set(x, y, z);
        world.add(g);
    }
    makeWindow(leftX - 0.01, 1.55, 0.8, 1.15, 1.35, 'x');
    makeWindow(rightX + 0.01, 1.55, 0.7, 1.0, 1.25, 'x');

    // ---------- Wohnzimmer furniture ----------
    // Sofa against the back wall
    const couch = new THREE.Group();
    couch.add(box(1.9, 0.42, 0.85, 0xd45d5d, 0, 0.21, 0));
    couch.add(box(1.9, 0.4, 0.15, 0xc24b4b, 0, 0.5, -0.36));
    couch.add(box(0.18, 0.5, 0.85, 0xc24b4b, -0.95, 0.34, 0));
    couch.add(box(0.18, 0.5, 0.85, 0xc24b4b, 0.95, 0.34, 0));
    couch.position.set(-3.4, 0, -2.45);
    world.add(couch);
    addObstacle(-3.4, -2.45, 2.1, 0.9);

    // Coffee table
    const coffeeTable = new THREE.Group();
    coffeeTable.add(box(1.0, 0.04, 0.55, 0x8a5a3a, 0, 0.42, 0));
    [[-0.44, -0.23], [0.44, -0.23], [-0.44, 0.23], [0.44, 0.23]].forEach(([lx, lz]) => {
        coffeeTable.add(cyl(0.02, 0.02, 0.4, 0x6b4429, lx, 0.2, lz, { seg: 8 }));
    });
    coffeeTable.position.set(-3.4, 0, -1.15);
    world.add(coffeeTable);
    addObstacle(-3.4, -1.15, 1.05, 0.6);

    // Dining table + 2 chairs
    function chair(x, z, rotY) {
        const g = new THREE.Group();
        g.add(box(0.42, 0.04, 0.42, 0x7a5230, 0, 0.42, 0));
        g.add(box(0.42, 0.42, 0.04, 0x7a5230, 0, 0.63, -0.19));
        [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].forEach(([lx, lz]) => {
            g.add(cyl(0.017, 0.017, 0.42, 0x5a3d22, lx, 0.21, lz, { seg: 8 }));
        });
        g.position.set(x, 0, z);
        g.rotation.y = rotY;
        world.add(g);
        addObstacle(x, z, 0.42, 0.42);
    }
    const diningTable = new THREE.Group();
    diningTable.add(box(1.1, 0.04, 0.72, 0x9c6b3f, 0, 0.75, 0));
    [[-0.5, -0.31], [0.5, -0.31], [-0.5, 0.31], [0.5, 0.31]].forEach(([lx, lz]) => {
        diningTable.add(cyl(0.022, 0.022, 0.73, 0x7a5230, lx, 0.365, lz, { seg: 8 }));
    });
    diningTable.position.set(-1.15, 0, 1.9);
    world.add(diningTable);
    addObstacle(-1.15, 1.9, 1.15, 0.75);
    chair(-1.15, 2.65, Math.PI);
    chair(-1.15, 1.15, 0);

    // Console table with table lamp, near the front door wall
    const console1 = new THREE.Group();
    console1.add(box(0.85, 0.035, 0.3, 0x8a5a3a, 0, 0.75, 0));
    [[-0.38, -0.11], [0.38, -0.11], [-0.38, 0.11], [0.38, 0.11]].forEach(([lx, lz]) => {
        console1.add(cyl(0.018, 0.018, 0.73, 0x6b4429, lx, 0.365, lz, { seg: 8 }));
    });
    console1.position.set(leftX + 0.2, 0, -0.6);
    world.add(console1);
    addObstacle(leftX + 0.2, -0.6, 0.4, 0.35);
    world.add(lampTable(leftX + 0.2, 0.77, -0.6));

    world.add(lampFloor(-0.6, 0, -2.55));
    addObstacle(-0.6, -2.55, 0.28, 0.28);

    world.add(houseplant(-4.35, 0, 2.55, 1.15));
    addObstacle(-4.35, 2.55, 0.35, 0.35);

    world.add(picture(0.42, 0.55, leftX + 0.01, 1.55, -1.55, Math.PI / 2, 0x5a3d22, 0x7fa8c9));
    world.add(picture(0.36, 0.36, -0.15 - 0.01, 1.5, -0.9, -Math.PI / 2, 0x5a3d22, 0xe8b04a));

    // ---------- Kinderzimmer furniture ----------
    const bed = new THREE.Group();
    bed.add(box(1.35, 0.32, 0.7, 0xffffff, 0, 0.16, 0));
    bed.add(box(1.4, 0.5, 0.07, 0x6fb3d8, 0, 0.41, -0.345));
    bed.add(box(0.55, 0.09, 0.4, 0xffd6e0, 0.3, 0.37, -0.12));
    world.add(bed);
    bed.position.set(4.35, 0, -2.35);
    addObstacle(4.35, -2.35, 1.4, 0.75);
    world.add(lampTable(4.35 - 0.85, 0.5, -2.35));
    world.add(box(0.32, 0.5, 0.32, 0x9c6b3f, 4.35 - 0.85, 0.25, -2.35));
    addObstacle(4.35 - 0.85, -2.35, 0.34, 0.34);

    const shelf = new THREE.Group();
    shelf.add(box(0.32, 1.3, 0.9, 0xd98f4a, 0, 0.65, 0));
    shelf.add(box(0.34, 0.05, 0.85, 0x8a5a2a, 0, 0.42, 0));
    shelf.add(box(0.34, 0.05, 0.85, 0x8a5a2a, 0, 0.92, 0));
    shelf.add(box(0.02, 0.24, 0.2, 0xff8a5b, 0.18, 1.1, -0.3));
    shelf.add(box(0.02, 0.2, 0.18, 0x6fcf97, 0.18, 1.06, 0.05));
    shelf.add(cyl(0.1, 0.1, 0.2, 0xffd166, 0.18, 1.08, 0.32, { rotZ: Math.PI / 2 }));
    shelf.position.set(rightX - 0.18, 0, -1.0);
    world.add(shelf);
    addObstacle(rightX - 0.18, -1.0, 0.36, 0.95);

    const toyChest = new THREE.Group();
    toyChest.add(box(0.62, 0.38, 0.4, 0x5b8fd9, 0, 0.19, 0));
    toyChest.add(box(0.65, 0.06, 0.43, 0x3e6bb0, 0, 0.41, 0));
    toyChest.position.set(4.6, 0, 2.4);
    world.add(toyChest);
    addObstacle(4.6, 2.4, 0.7, 0.46);

    world.add(houseplant(0.55, 0, 2.55, 0.85));
    addObstacle(0.55, 2.55, 0.28, 0.28);

    world.add(picture(0.4, 0.4, rightX - 0.01, 1.5, 1.9, -Math.PI / 2, 0xd98f4a, 0xffd166));
    world.add(picture(0.3, 0.3, 0.16, 1.4, -1.9, Math.PI / 2, 0xd98f4a, 0x6fcf97));

    // ---------- Toys: rocking horse ----------
    function createRockingHorse() {
        const g = new THREE.Group();
        const wood = 0xd9a24a;
        const woodDark = 0xb5792e;
        const mane = 0x5b3a29;

        const rockerGeo = new THREE.TorusGeometry(0.26, 0.02, 8, 32, Math.PI * 0.62);
        const rockerMat = new THREE.MeshStandardMaterial({ color: woodDark, roughness: 0.6 });
        const rockerL = new THREE.Mesh(rockerGeo, rockerMat);
        rockerL.rotation.set(Math.PI / 2, 0, Math.PI * 1.19);
        rockerL.position.set(0, 0.035, -0.12);
        rockerL.castShadow = true;
        const rockerR = rockerL.clone();
        rockerR.position.set(0, 0.035, 0.12);
        g.add(rockerL, rockerR);

        [[-0.16, -0.12], [0.14, -0.12], [-0.16, 0.12], [0.14, 0.12]].forEach(([lx, lz]) => {
            g.add(cyl(0.014, 0.014, 0.16, wood, lx, 0.12, lz, { seg: 8 }));
        });

        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.22, 6, 12), new THREE.MeshStandardMaterial({ color: wood, roughness: 0.55 }));
        body.rotation.z = Math.PI / 2;
        body.position.set(-0.03, 0.21, 0);
        body.castShadow = true;
        g.add(body);

        const neck = cyl(0.046, 0.058, 0.145, wood, -0.16, 0.305, 0, { rotZ: 0.55, seg: 10 });
        g.add(neck);
        const head = box(0.08, 0.093, 0.075, wood, -0.25, 0.41, 0);
        g.add(head);
        const snout = box(0.064, 0.046, 0.058, wood, -0.305, 0.39, 0);
        g.add(snout);
        g.add(box(0.023, 0.04, 0.014, 0x2b2b2b, -0.226, 0.435, 0.032));
        g.add(box(0.023, 0.04, 0.014, 0x2b2b2b, -0.226, 0.435, -0.032));
        g.add(box(0.02, 0.046, 0.017, wood, -0.226, 0.47, 0.023, { rotY: -0.3 }));
        g.add(box(0.02, 0.046, 0.017, wood, -0.226, 0.47, -0.023, { rotY: 0.3 }));
        for (let i = 0; i < 5; i++) {
            g.add(box(0.017, 0.04, 0.029, mane, -0.217 + i * 0.029, 0.435 - i * 0.006, 0));
        }
        g.add(cyl(0.006, 0.026, 0.1, mane, 0.081, 0.245, 0, { rotZ: -0.5, seg: 8 }));
        g.add(box(0.1, 0.023, 0.115, 0xc0392b, -0.03, 0.284, 0));
        g.add(cyl(0.006, 0.006, 0.08, woodDark, -0.18, 0.37, 0, { seg: 6 }));

        g.rotation.y = -0.5;
        return g;
    }

    const rockingHorse = createRockingHorse();
    rockingHorse.position.set(2.6, 0, -1.55);
    world.add(rockingHorse);
    addObstacle(2.6, -1.55, 0.55, 0.5);

    // ---------- Toys: balls ----------
    const BALL_COLORS = [0xff5e5e, 0x5b9dff, 0xffd166, 0x6fcf67, 0xb570ff];
    const balls = [];
    const ballSpots = [
        [1.6, 0.9], [2.0, 1.7], [3.4, 1.0], [1.5, -0.6], [3.9, 0.2]
    ];
    ballSpots.forEach(([x, z], i) => {
        const r = 0.075 + (i % 2) * 0.015;
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
        const b = box(0.09, 0.09, 0.09, blockColors[i], 0, 0.045 + i * 0.093, 0, { rotY: i * 0.35 });
        blocksGroup.add(b);
    }
    blocksGroup.position.set(1.0, 0, 1.9);
    world.add(blocksGroup);
    addObstacle(1.0, 1.9, 0.17, 0.17);

    // ---------- Teddy bear ----------
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
    teddy.position.set(2.7, 0, 2.15);
    teddy.rotation.y = 0.4;
    world.add(teddy);
    addObstacle(2.7, 2.15, 0.2, 0.2);

    // ---------- Player: small toy figure / game piece (10 cm tall) ----------
    const player = new THREE.Group();
    const skin = 0xffcf9e;
    const tunic = 0x3f6fd1;
    const trim = 0xffd166;

    // Legs: hip + knee joint chain (like dhl-city/character.html) so the walk
    // cycle bends naturally at the knee instead of swinging a stiff single leg.
    const HIP_Y = 0.036, THIGH_LEN = 0.020, SHIN_LEN = 0.016;
    function legChain(x) {
        const hip = new THREE.Group();
        hip.position.set(x, HIP_Y, 0);
        player.add(hip);
        hip.add(cyl(0.0075, 0.008, THIGH_LEN, 0x274a8f, 0, -THIGH_LEN / 2, 0, { seg: 10 }));
        const knee = new THREE.Group();
        knee.position.set(0, -THIGH_LEN, 0);
        hip.add(knee);
        knee.add(cyl(0.006, 0.0075, SHIN_LEN, 0x274a8f, 0, -SHIN_LEN / 2, 0, { seg: 10 }));
        return { hip, knee };
    }
    const legL = legChain(-0.010);
    const legR = legChain(0.010);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.030, 4, 10), new THREE.MeshStandardMaterial({ color: tunic, roughness: 0.6 }));
    torso.position.set(0, 0.053, 0);
    torso.castShadow = true;
    player.add(torso);

    player.add(box(0.040, 0.006, 0.019, trim, 0, 0.040, 0));

    const armL = cyl(0.005, 0.006, 0.027, tunic, -0.023, 0.052, 0, { seg: 8 });
    const armR = cyl(0.005, 0.006, 0.027, tunic, 0.023, 0.052, 0, { seg: 8 });
    player.add(armL, armR);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.016, 20, 16), new THREE.MeshStandardMaterial({ color: skin, roughness: 0.6 }));
    head.position.set(0, 0.082, 0);
    head.castShadow = true;
    player.add(head);

    player.add(box(0.021, 0.010, 0.019, 0xd6413f, 0, 0.095, -0.002, { rotY: 0.05 })); // little beret
    player.add(ball3(0.002, 0x222222, -0.006, 0.083, 0.014, { seg: 8 }));
    player.add(ball3(0.002, 0x222222, 0.006, 0.083, 0.014, { seg: 8 }));

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
        x: -3, z: 1.9, y: 0, vy: 0,
        yaw: Math.PI,
        grounded: true,
        moveSpeed: 0,
        walkPhase: 0,
        jumpState: JUMP_STATE.NONE,
        jumpTimer: 0,
        jumpBuffered: false,
    };

    const PLAYER_RADIUS = 0.035;
    const SPEED_MAX = 1.5;
    const ACCEL_RATE = 4.5;
    const DECEL_RATE = 6.0;
    const TURN_RATE = 2.2;
    const GRAVITY = -14;
    const JUMP_VEL = 2.1;

    function lerp(a, b, t) { return a + (b - a) * t; }

    // ---------- Input ----------
    const keys = new Set();
    window.addEventListener('keydown', (e) => {
        keys.add(e.code);
        if (e.code === 'Space') { state.jumpBuffered = true; e.preventDefault(); }
    });
    window.addEventListener('keyup', (e) => keys.delete(e.code));

    // Touch: swipe (modeled on dhl-city/character.html's swipe-to-move) instead
    // of on-screen buttons — drag to move/turn, a quick tap jumps.
    const touch = { forward: false, back: false, left: false, right: false };
    const TOUCH_THRESHOLD = 18;
    let touchOrigin = null, touchMoved = false, touchStartTime = 0;
    function resetTouch() {
        touch.forward = touch.back = touch.left = touch.right = false;
    }
    canvas.addEventListener('touchstart', (e) => {
        const t = e.touches[0];
        touchOrigin = { x: t.clientX, y: t.clientY };
        touchMoved = false;
        touchStartTime = performance.now();
        resetTouch();
    }, { passive: true });
    canvas.addEventListener('touchmove', (e) => {
        if (!touchOrigin) return;
        const t = e.touches[0];
        const dx = t.clientX - touchOrigin.x, dy = t.clientY - touchOrigin.y;
        if (Math.abs(dx) > TOUCH_THRESHOLD || Math.abs(dy) > TOUCH_THRESHOLD) touchMoved = true;
        touch.forward = dy < -TOUCH_THRESHOLD;
        touch.back = dy > TOUCH_THRESHOLD;
        touch.left = dx < -TOUCH_THRESHOLD;
        touch.right = dx > TOUCH_THRESHOLD;
        e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchend', () => {
        if (!touchMoved && performance.now() - touchStartTime < 300) state.jumpBuffered = true;
        resetTouch();
        touchOrigin = null;
    }, { passive: true });
    canvas.addEventListener('touchcancel', () => { resetTouch(); touchOrigin = null; }, { passive: true });

    // ---------- Camera rig (fixed auto-follow chase camera, toy's-eye style) ----------
    const CAM_DIST_MOVE = 0.62;
    const CAM_DIST_IDLE = 0.42;
    const CAM_HEIGHT = 0.30;
    const CAM_LOOK_HEIGHT = 0.075;
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
    const excludedFromCamera = new Set([livingFloor, kidFloor, livingRug, kidRug, bodyTilt, ...balls.map(b => b.mesh)]);
    const cameraBlockers = world.children.filter(child => !excludedFromCamera.has(child));

    const clock = new THREE.Clock();

    function update(dt) {
        dt = Math.min(dt, 0.05);

        // Tank steering: A/D (or ←/→ / touch-swipe sideways) turn in place,
        // W/S (or ↑/↓ / touch-swipe up/down) move along facing direction
        if (keys.has('KeyA') || keys.has('ArrowLeft') || touch.left) state.yaw += TURN_RATE * dt;
        if (keys.has('KeyD') || keys.has('ArrowRight') || touch.right) state.yaw -= TURN_RATE * dt;

        const fwdX = Math.sin(state.yaw), fwdZ = Math.cos(state.yaw);
        const wantForward = keys.has('KeyW') || keys.has('ArrowUp') || touch.forward;
        const wantBack = keys.has('KeyS') || keys.has('ArrowDown') || touch.back;
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
            if (state.vy < -0.4 && state.jumpState === JUMP_STATE.AIR) {
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

        const moving = state.moveSpeed > 0.02;

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
                const kick = 0.8 + state.moveSpeed * 0.5;
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
        rockingHorse.rotation.z = Math.sin(clock.elapsedTime * 1.3) * 0.06;

        // Apply player transform
        bodyTilt.position.set(state.x, state.y, state.z);
        bodyTilt.rotation.y = state.yaw;

        // Pose per jump-state (windup crouch / air tuck / land squat / walk-idle).
        // Hip/knee formulas follow dhl-city/character.html's leg animation.
        const TORSO_Y = 0.053;
        if (state.jumpState === JUMP_STATE.WINDUP) {
            const t = Math.min(state.jumpTimer / WINDUP_DUR, 1);
            const sq = Math.sin(t * Math.PI * 0.5);
            legL.hip.rotation.x = lerp(legL.hip.rotation.x, 0.52 * sq, 0.32);
            legR.hip.rotation.x = lerp(legR.hip.rotation.x, 0.52 * sq, 0.32);
            legL.knee.rotation.x = lerp(legL.knee.rotation.x, 0.78 * sq, 0.32);
            legR.knee.rotation.x = lerp(legR.knee.rotation.x, 0.78 * sq, 0.32);
            armL.rotation.x = lerp(armL.rotation.x, -0.6 * sq, 0.3);
            armR.rotation.x = lerp(armR.rotation.x, -0.6 * sq, 0.3);
            torso.position.y = lerp(torso.position.y, TORSO_Y - 0.011 * sq, 0.4);
            torso.rotation.x = lerp(torso.rotation.x, -0.25 * sq, 0.3);
        } else if (state.jumpState === JUMP_STATE.AIR) {
            legL.hip.rotation.x = lerp(legL.hip.rotation.x, -0.70, 0.17);
            legR.hip.rotation.x = lerp(legR.hip.rotation.x, -0.70, 0.17);
            legL.knee.rotation.x = lerp(legL.knee.rotation.x, 1.45, 0.17);
            legR.knee.rotation.x = lerp(legR.knee.rotation.x, 1.45, 0.17);
            armL.rotation.x = lerp(armL.rotation.x, -0.9, 0.2);
            armR.rotation.x = lerp(armR.rotation.x, -0.9, 0.2);
            torso.position.y = lerp(torso.position.y, TORSO_Y + 0.005, 0.2);
            torso.rotation.x = lerp(torso.rotation.x, 0.08, 0.15);
        } else if (state.jumpState === JUMP_STATE.LAND) {
            const t = Math.min(state.jumpTimer / LAND_DUR, 1);
            const sq = 1 - t;
            legL.hip.rotation.x = lerp(legL.hip.rotation.x, 0.72 * sq, 0.32);
            legR.hip.rotation.x = lerp(legR.hip.rotation.x, 0.72 * sq, 0.32);
            legL.knee.rotation.x = lerp(legL.knee.rotation.x, 1.10 * sq, 0.32);
            legR.knee.rotation.x = lerp(legR.knee.rotation.x, 1.10 * sq, 0.32);
            armL.rotation.x = lerp(armL.rotation.x, -0.5 * sq, 0.3);
            armR.rotation.x = lerp(armR.rotation.x, -0.5 * sq, 0.3);
            torso.position.y = lerp(torso.position.y, TORSO_Y - 0.015 * sq, 0.4);
            torso.rotation.x = lerp(torso.rotation.x, 0, 0.3);
        } else {
            const s = moving ? Math.sin(state.walkPhase) : 0;
            const lLeg = s * 0.68, rLeg = -s * 0.68;
            legL.hip.rotation.x = lerp(legL.hip.rotation.x, lLeg * 0.88, 0.3);
            legR.hip.rotation.x = lerp(legR.hip.rotation.x, rLeg * 0.88, 0.3);
            legL.knee.rotation.x = lerp(legL.knee.rotation.x, Math.max(0, lLeg) * 1.0 + Math.max(0, -lLeg) * 0.7, 0.3);
            legR.knee.rotation.x = lerp(legR.knee.rotation.x, Math.max(0, rLeg) * 1.0 + Math.max(0, -rLeg) * 0.7, 0.3);
            const swing = s * 0.55;
            armL.rotation.x = lerp(armL.rotation.x, -swing, 0.3);
            armR.rotation.x = lerp(armR.rotation.x, swing, 0.3);
            torso.position.y = lerp(torso.position.y, TORSO_Y + (moving ? Math.abs(s) * 0.002 : 0), 0.3);
            torso.rotation.x = lerp(torso.rotation.x, 0, 0.3);
        }

        // Camera: fixed auto-follow chase camera behind the character's facing
        // direction (no mouse orbit), pulling in closer when idle, with a
        // wall-avoidance raycast so it never clips through the house.
        camDist = lerp(camDist, moving ? CAM_DIST_MOVE : CAM_DIST_IDLE, Math.min(1, dt * 2.5));

        camPivot.set(state.x, state.y + 0.055, state.z);
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
        camRay.near = 0.02;
        const hits = camRay.intersectObjects(cameraBlockers, true);
        let allowedDist = desiredDist;
        if (hits.length) allowedDist = Math.max(0.15, hits[0].distance - 0.06);
        if (allowedDist < desiredDist) {
            camDesired.copy(camPivot).addScaledVector(camRayDir, allowedDist);
        }
        camera.position.lerp(camDesired, Math.min(1, dt * 6));

        camTarget.lerp(new THREE.Vector3(state.x, state.y + CAM_LOOK_HEIGHT, state.z), Math.min(1, dt * 8));
        camera.lookAt(camTarget);
    }

    function onResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onResize);
    onResize();

    function loop() {
        requestAnimationFrame(loop);
        update(clock.getDelta());
        renderer.render(scene, camera);
    }
    clock.start();
    loop();

    const hint = document.getElementById('hint');
    document.getElementById('hint-toggle').addEventListener('click', () => {
        hint.style.display = hint.style.display === 'none' ? 'block' : 'none';
    });
})();
