/* Spielzeug-Abenteuer
 * Eine 10 cm kleine Spielfigur läuft durch ein zweistöckiges Einfamilienhaus
 * (Erdgeschoss: Wohnzimmer, Küche, Toilette, Hauseingang; Dachgeschoss mit
 * Dachschrägen: Elternschlafzimmer, 2 Kinderzimmer, Bad). 1 Welteinheit = 1 Meter.
 * Steuerung: W/S bzw. Pfeil hoch/runter = vor/zurück, A/D bzw. Pfeil links/
 * rechts = drehen, Leertaste = hüpfen (auch mit Vor-/Rückwärtsschwung).
 */

(() => {
    const canvas = document.getElementById('game');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8fc7ea);
    scene.fog = new THREE.Fog(0x8fc7ea, 20, 55);

    const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.02, 100);

    // ---------- Lighting ----------
    scene.add(new THREE.HemisphereLight(0xfff3d6, 0x40342a, 0.8));

    const sun = new THREE.DirectionalLight(0xfff0d0, 1.1);
    sun.position.set(4, 7, 3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536);
    sun.shadow.camera.left = -7;
    sun.shadow.camera.right = 7;
    sun.shadow.camera.top = 6;
    sun.shadow.camera.bottom = -6;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 20;
    sun.shadow.bias = -0.0012;
    scene.add(sun);

    const upperFill = new THREE.PointLight(0xfff6df, 0.5, 14, 2);
    upperFill.position.set(0, 4.8, 0);
    scene.add(upperFill);

    // ---------- Helpers ----------
    function box(w, h, d, color, x, y, z, opts = {}) {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            new THREE.MeshStandardMaterial({ color, roughness: opts.roughness ?? 0.8, metalness: opts.metalness ?? 0.05, side: opts.side })
        );
        mesh.position.set(x, y, z);
        if (opts.rotY) mesh.rotation.y = opts.rotY;
        if (opts.rotX) mesh.rotation.x = opts.rotX;
        if (opts.rotZ) mesh.rotation.z = opts.rotZ;
        mesh.castShadow = opts.cast !== false;
        mesh.receiveShadow = opts.receive !== false;
        return mesh;
    }

    function cyl(rTop, rBot, h, color, x, y, z, opts = {}) {
        const mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(rTop, rBot, h, opts.seg ?? 16),
            new THREE.MeshStandardMaterial({ color, roughness: opts.roughness ?? 0.75, metalness: opts.metalness ?? 0 })
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
        mesh.castShadow = opts.cast !== false;
        mesh.receiveShadow = true;
        return mesh;
    }

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
            ctx.fillStyle = 'rgba(40,20,8,0.06)';
            for (let i = 0; i < 10; i++) {
                const gy = rnd() * h;
                ctx.fillRect(x + 2, gy, plankPx - 5, 1 + rnd() * 2);
            }
            let y = rnd() * h * 0.6;
            while (y < h) {
                ctx.fillStyle = 'rgba(35,18,8,0.45)';
                ctx.fillRect(x, y, plankPx - 1, 2);
                y += h * 0.35 + rnd() * h * 0.35;
            }
            ctx.fillStyle = 'rgba(30,15,6,0.5)';
            ctx.fillRect(x + plankPx - 2, 0, 2, h);
        }
        const tex = new THREE.CanvasTexture(cnv);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }

    function createTileTexture(hex1, hex2) {
        const n = 8;
        const cnv = document.createElement('canvas');
        cnv.width = cnv.height = n * 32;
        const ctx = cnv.getContext('2d');
        const c1 = new THREE.Color(hex1), c2 = new THREE.Color(hex2);
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
            const c = (i + j) % 2 === 0 ? c1 : c2;
            ctx.fillStyle = `rgb(${c.r * 255 | 0},${c.g * 255 | 0},${c.b * 255 | 0})`;
            ctx.fillRect(i * 32, j * 32, 32, 32);
        }
        const tex = new THREE.CanvasTexture(cnv);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }

    function createCloudTexture(skyHex, cloudHex) {
        const w = 512, h = 512;
        const cnv = document.createElement('canvas');
        cnv.width = w; cnv.height = h;
        const ctx = cnv.getContext('2d');
        ctx.fillStyle = `#${new THREE.Color(skyHex).getHexString()}`;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = `#${new THREE.Color(cloudHex).getHexString()}`;
        function cloud(cx, cy, s) {
            [[-0.9, 0, 0.55], [-0.3, -0.35, 0.65], [0.35, -0.3, 0.6], [0.9, 0.05, 0.5], [0.1, 0.15, 0.7]].forEach(([dx, dy, r]) => {
                ctx.beginPath();
                ctx.arc(cx + dx * s, cy + dy * s, r * s, 0, Math.PI * 2);
                ctx.fill();
            });
        }
        [[90, 110, 55], [340, 90, 48], [210, 240, 65], [430, 270, 42], [70, 390, 50], [300, 430, 60], [460, 140, 38]].forEach(([x, y, s]) => cloud(x, y, s));
        const tex = new THREE.CanvasTexture(cnv);
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
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

    function chair(x, z, rotY, color) {
        const c = color ?? 0x7a5230;
        const g = new THREE.Group();
        g.add(box(0.42, 0.04, 0.42, c, 0, 0.42, 0));
        g.add(box(0.42, 0.42, 0.04, c, 0, 0.63, -0.19));
        [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].forEach(([lx, lz]) => {
            g.add(cyl(0.017, 0.017, 0.42, 0x5a3d22, lx, 0.21, lz, { seg: 8 }));
        });
        g.position.set(x, 0, z);
        g.rotation.y = rotY;
        return g;
    }

    function createToilet() {
        const g = new THREE.Group();
        const wc = 0xf5f4f0;
        g.add(box(0.24, 0.42, 0.28, wc, 0, 0.21, -0.16));
        g.add(box(0.2, 0.1, 0.06, wc, 0, 0.44, -0.02));
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.26, 16), new THREE.MeshStandardMaterial({ color: wc, roughness: 0.3 })).translateY(0.13).translateZ(0.02));
        g.children[g.children.length - 1].castShadow = true;
        g.add(cyl(0.13, 0.15, 0.03, 0xffffff, 0, 0.265, 0.02, { seg: 20 }));
        return g;
    }

    function createSinkPedestal() {
        const g = new THREE.Group();
        const wc = 0xf5f4f0;
        g.add(cyl(0.02, 0.03, 0.55, wc, 0, 0.275, 0, { seg: 10 }));
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.09, 16), new THREE.MeshStandardMaterial({ color: wc, roughness: 0.3 })).translateY(0.58));
        g.children[g.children.length - 1].castShadow = true;
        g.add(cyl(0.008, 0.008, 0.09, 0xcccccc, 0, 0.66, -0.1, { seg: 8, metalness: 0.7, roughness: 0.3 }));
        return g;
    }

    function createBathtub(len, wid) {
        const g = new THREE.Group();
        const c = 0xf7f6f2;
        g.add(box(len, 0.5, wid, c, 0, 0.25, 0));
        g.add(box(len - 0.08, 0.4, wid - 0.08, 0xe4f2f8, 0, 0.29, 0));
        g.add(cyl(0.01, 0.01, 0.12, 0xcccccc, -len / 2 + 0.1, 0.56, 0, { seg: 8, metalness: 0.7, roughness: 0.3 }));
        return g;
    }

    function createWardrobe(w, h, d, color) {
        const g = new THREE.Group();
        g.add(box(w, h, d, color, 0, h / 2, 0));
        g.add(box(0.01, h - 0.1, 0.01, 0x2a2a2a, -0.02, h / 2, d / 2 + 0.005));
        g.add(box(0.01, h - 0.1, 0.01, 0x2a2a2a, 0.02, h / 2, d / 2 + 0.005));
        g.add(ball3(0.012, 0xd8c23a, -0.05, h / 2, d / 2 + 0.01, { seg: 8, metalness: 0.6 }));
        g.add(ball3(0.012, 0xd8c23a, 0.05, h / 2, d / 2 + 0.01, { seg: 8, metalness: 0.6 }));
        return g;
    }

    function createDesk(color) {
        const g = new THREE.Group();
        g.add(box(0.75, 0.035, 0.5, color, 0, 0.55, 0));
        [[-0.34, -0.21], [0.34, -0.21], [-0.34, 0.21], [0.34, 0.21]].forEach(([lx, lz]) => {
            g.add(cyl(0.017, 0.017, 0.55, 0x5a3d22, lx, 0.275, lz, { seg: 8 }));
        });
        return g;
    }

    function createCarToy(bodyColor) {
        const g = new THREE.Group();
        g.add(box(0.11, 0.035, 0.05, bodyColor, 0, 0.038, 0));
        g.add(box(0.06, 0.03, 0.048, bodyColor, 0.005, 0.062, 0));
        g.add(box(0.045, 0.022, 0.044, 0xbfe8ff, 0.005, 0.062, 0));
        [[-0.035, -0.026], [0.035, -0.026], [-0.035, 0.026], [0.035, 0.026]].forEach(([wx, wz]) => {
            g.add(cyl(0.016, 0.016, 0.012, 0x222222, wx, 0.018, wz, { seg: 12, rotX: Math.PI / 2 }));
        });
        return g;
    }

    // Door assembly: static frame (jambs + header), hinge plates, and a lever
    // handle on the leaf, which pivots around a real hinge line. `axis` selects
    // which wall the door sits in: 'z' = wall running along Z (door width runs
    // along Z, plane faces X), 'x' = wall running along X (mirrored).
    function buildDoor(opts) {
        const {
            axis = 'z', x, z, hinge, hingeSign, width = 0.80, height = 2.0,
            openAngle = 0, wallDepth = 0.15, frameColor = 0x8a5a3a, doorColor = 0xd8c39a,
        } = opts;
        const jambDepth = wallDepth + 0.05;
        const farC = hinge + hingeSign * width;
        const put = (w, h, d, color, along, fixedCoord) =>
            axis === 'z'
                ? world.add(box(w, h, d, color, x, fixedCoord, along))
                : world.add(box(d, h, w, color, along, fixedCoord, z));

        put(jambDepth, height + 0.08, 0.05, frameColor, hinge, height / 2 + 0.02);
        put(jambDepth, height + 0.08, 0.05, frameColor, farC, height / 2 + 0.02);
        put(jambDepth, 0.06, Math.abs(farC - hinge) + 0.1, frameColor, (hinge + farC) / 2, height + 0.06);

        [0.18, 0.5, 0.82].forEach((f) => {
            axis === 'z'
                ? world.add(box(0.05, 0.05, 0.014, 0x8c8c8c, x, f * height, hinge, { metalness: 0.6, roughness: 0.35 }))
                : world.add(box(0.014, 0.05, 0.05, 0x8c8c8c, hinge, f * height, z, { metalness: 0.6, roughness: 0.35 }));
        });

        const pivot = new THREE.Group();
        if (axis === 'z') pivot.position.set(x, 0, hinge); else pivot.position.set(hinge, 0, z);
        pivot.rotation.y = axis === 'z' ? openAngle : openAngle + Math.PI / 2;
        const leaf = box(0.045, height - 0.06, width, doorColor, 0, height / 2, hingeSign * width / 2);
        pivot.add(leaf);
        const handleZ = hingeSign * (width - 0.11);
        pivot.add(box(0.014, 0.05, 0.008, 0xd8c23a, 0.03, height / 2, handleZ, { metalness: 0.7, roughness: 0.3 }));
        pivot.add(cyl(0.006, 0.006, 0.05, 0xd8c23a, 0.055, height / 2, handleZ, { seg: 8, rotZ: Math.PI / 2, roughness: 0.3, metalness: 0.7 }));
        world.add(pivot);
        return pivot;
    }

    function makeWindow(x, y, z, w, h, wallAxis) {
        const g = new THREE.Group();
        g.add(box(wallAxis === 'x' ? 0.04 : w, h, wallAxis === 'x' ? w : 0.04, 0xdff2ff, 0, 0, 0, { metalness: 0.3, roughness: 0.1, cast: false }));
        g.add(box(wallAxis === 'x' ? 0.02 : w + 0.05, 0.03, wallAxis === 'x' ? w + 0.05 : 0.02, 0xffffff, 0, h / 2 - 0.015, 0, { cast: false }));
        g.add(box(wallAxis === 'x' ? 0.02 : 0.03, h, wallAxis === 'x' ? 0.03 : 0.02, 0xffffff, 0, 0, 0, { cast: false }));
        g.position.set(x, y, z);
        world.add(g);
    }

    // ---------- Obstacles (AABB collision list, per floor) ----------
    const obstaclesByFloor = [[], []];
    function addObstacle(floor, cx, cz, w, d) {
        obstaclesByFloor[floor].push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
    }
    function resolveObstacles(x, z, radius, list) {
        for (const o of list) {
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

    const world = new THREE.Group();
    scene.add(world);
    const exterior = new THREE.Group();
    scene.add(exterior);

    // ================= House layout (meters) =================
    const X_MIN = -5, X_MAX = 5, Z_MIN = -4, Z_MAX = 4;
    const WALL_H = 2.6;          // ground floor wall height
    const FLOOR2_Y = 2.7;        // upper floor level
    const KNEE_H = 1.3;          // upper floor wall height before the roof slope starts
    const RIDGE_H = 3.0;         // roof ridge height above FLOOR2_Y, at z=0
    const CORR_X_MIN = -0.65, CORR_X_MAX = 0.65;
    // The staircase sits near the back (front-door) end of the corridor, so the
    // entire rest of the upstairs hallway is one continuous piece reachable in
    // a single direction from the top of the stairs — no need to cross back
    // over the stairwell opening to reach any bedroom.
    const STAIR_Z_START = -3.5, STAIR_Z_END = -1.3;
    const BOUNDS = { minX: X_MIN, maxX: X_MAX, minZ: Z_MIN, maxZ: Z_MAX };

    const leftX = X_MIN - 0.075, rightX = X_MAX + 0.075;
    const backZ = Z_MIN - 0.075, frontZ = Z_MAX + 0.075;
    const spanX = rightX - leftX, spanZ = frontZ - backZ;

    function wall(w, h, d, color, x, y, z, opts) {
        world.add(box(w, h, d, color, x, y, z, opts));
    }

    // ---------- Floors ----------
    const WALL_LIGHT = 0xf2ebe0, WALL_KITCHEN = 0xeef2ea, WALL_KID2 = 0xdff0f7, WALL_KID1 = 0xf7e6ef, WALL_PARENT = 0xece4d8;

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

    const groundFloors = [];
    groundFloors.push(plankFloor(X_MIN, CORR_X_MIN, Z_MIN, Z_MAX, 0, 0xc79a63, 7));           // Wohnzimmer
    groundFloors.push(plankFloor(CORR_X_MIN, CORR_X_MAX, Z_MIN, Z_MAX, 0, 0xb98a55, 3)); // Flur
    groundFloors.push(tileFloor(CORR_X_MAX, X_MAX, Z_MIN, 0.3, 0, 0xe9e6dc, 0xd8d3c4));         // Küche
    groundFloors.push(tileFloor(CORR_X_MAX, 2.5, 0.3, 2.3, 0, 0xdfeef2, 0xc9dfe6));             // Toilette
    groundFloors.push(plankFloor(2.5, X_MAX, 0.3, Z_MAX, 0, 0xc79a63, 11));              // offener Rest
    groundFloors.push(plankFloor(CORR_X_MAX, 2.5, 2.3, Z_MAX, 0, 0xc79a63, 13));

    const upperFloors = [];
    upperFloors.push(plankFloor(X_MIN, CORR_X_MIN, Z_MIN, 1.0, FLOOR2_Y, 0xcdb290, 19));         // Elternschlafzimmer
    upperFloors.push(plankFloor(X_MIN, CORR_X_MIN, 1.0, Z_MAX, FLOOR2_Y, 0xdcb37e, 23));         // Kinderzimmer 1
    upperFloors.push(tileFloor(CORR_X_MAX, X_MAX, Z_MIN, -0.5, FLOOR2_Y, 0xe6f2f5, 0xd2e6ea));    // Bad
    upperFloors.push(plankFloor(CORR_X_MAX, X_MAX, -0.5, Z_MAX, FLOOR2_Y, 0xdcb37e, 29));         // Kinderzimmer 2
    // Landing floor: one continuous piece from the top of the stairs to the
    // front wall (the stairwell shaft below has no upper-floor slab at all).
    const landingMat = new THREE.MeshStandardMaterial({ color: 0xb98a55, roughness: 0.8 });
    const landingMesh = new THREE.Mesh(new THREE.PlaneGeometry(CORR_X_MAX - CORR_X_MIN, Z_MAX - STAIR_Z_END), landingMat);
    landingMesh.rotation.x = -Math.PI / 2;
    landingMesh.position.set(0, FLOOR2_Y, (STAIR_Z_END + Z_MAX) / 2);
    landingMesh.receiveShadow = true;
    world.add(landingMesh);
    // Ceiling of the ground floor / underside of the upper floor slab (closes the gap visually, minus the stairwell)
    [[X_MIN, CORR_X_MIN, Z_MIN, Z_MAX], [CORR_X_MIN, CORR_X_MAX, STAIR_Z_END, Z_MAX], [CORR_X_MAX, X_MAX, Z_MIN, Z_MAX]].forEach(([x0, x1, z0, z1]) => {
        world.add(box(x1 - x0, 0.1, z1 - z0, 0xece6da, (x0 + x1) / 2, WALL_H + 0.05, (z0 + z1) / 2, { cast: false }));
    });

    // ---------- Ground floor exterior + structural walls ----------
    function extWallRunX(z, xFrom, xTo, color) {
        if (xTo - xFrom <= 0.001) return;
        wall(xTo - xFrom, WALL_H, 0.15, color, (xFrom + xTo) / 2, WALL_H / 2, z);
        addObstacle(0, (xFrom + xTo) / 2, z, xTo - xFrom, 0.15);
    }
    wall(0.15, WALL_H, spanZ, WALL_LIGHT, leftX, WALL_H / 2, 0);
    wall(0.15, WALL_H, spanZ, WALL_KITCHEN, rightX, WALL_H / 2, 0);
    // Back wall has a real gap for the front door (hinge -0.35..0.35) instead of
    // a solid wall with a purely decorative door drawn on top of it.
    extWallRunX(backZ, leftX, -0.35, WALL_LIGHT);
    extWallRunX(backZ, 0.35, rightX, WALL_LIGHT);
    wall(spanX, WALL_H, 0.15, WALL_LIGHT, (leftX + rightX) / 2, WALL_H / 2, frontZ);
    addObstacle(0, leftX, 0, 0.15, spanZ);
    addObstacle(0, rightX, 0, 0.15, spanZ);
    addObstacle(0, (leftX + rightX) / 2, frontZ, spanX, 0.15);

    // Corridor partition walls (x = CORR_X_MIN and x = CORR_X_MAX), each with door gaps
    function corridorWallRun(x, zFrom, zTo, color) {
        if (zTo - zFrom <= 0.001) return;
        wall(0.1, WALL_H, zTo - zFrom, color, x, WALL_H / 2, (zFrom + zTo) / 2);
        addObstacle(0, x, (zFrom + zTo) / 2, 0.1, zTo - zFrom);
    }
    // Living room + kitchen openings (wide, doorless). The stair ramp occupies
    // z[STAIR_Z_START, STAIR_Z_END] = z[-3.5, -1.3], so both openings sit safely
    // past its end, near the middle of the corridor.
    corridorWallRun(CORR_X_MIN, backZ, -1.1, WALL_LIGHT);
    corridorWallRun(CORR_X_MIN, 0.1, frontZ, WALL_LIGHT);
    corridorWallRun(CORR_X_MAX, backZ, -1.1, WALL_KITCHEN);
    corridorWallRun(CORR_X_MAX, 0.1, frontZ, WALL_KITCHEN);

    // Toilette room walls: fully enclosed on all four sides except one door on
    // the south side (opening into the kitchen/dining area), with each wall's
    // gap sized to exactly match the door frame — no unintended hole, no overlap.
    wall(0.1, WALL_H, 2.0, WALL_LIGHT, 2.5, WALL_H / 2, 1.3); // east wall (x=2.5)
    addObstacle(0, 2.5, 1.3, 0.1, 2.0);
    wall(2.5 - CORR_X_MAX, WALL_H, 0.1, WALL_LIGHT, (CORR_X_MAX + 2.5) / 2, WALL_H / 2, 2.3); // north wall, fully solid
    addObstacle(0, (CORR_X_MAX + 2.5) / 2, 2.3, 2.5 - CORR_X_MAX, 0.1);
    wall(1.0 - CORR_X_MAX, WALL_H, 0.1, WALL_LIGHT, (CORR_X_MAX + 1.0) / 2, WALL_H / 2, 0.3); // south wall, west of door
    addObstacle(0, (CORR_X_MAX + 1.0) / 2, 0.3, 1.0 - CORR_X_MAX, 0.1);
    wall(2.5 - 1.7, WALL_H, 0.1, WALL_LIGHT, (1.7 + 2.5) / 2, WALL_H / 2, 0.3); // south wall, east of door
    addObstacle(0, (1.7 + 2.5) / 2, 0.3, 2.5 - 1.7, 0.1);
    buildDoor({ axis: 'x', z: 0.3, hinge: 1.0, hingeSign: 1, width: 0.7, height: 2.0, openAngle: 0, wallDepth: 0.1, frameColor: 0x8a5a3a, doorColor: 0xdfeef2 });

    // ---------- Ground floor doors ----------
    buildDoor({ axis: 'x', z: backZ, hinge: -0.35, hingeSign: 1, width: 0.7, height: 2.0, openAngle: 0, wallDepth: 0.15, frameColor: 0x6b4429, doorColor: 0x5a3a24 });

    // ---------- Baseboards (ground floor) ----------
    const BASE_H = 0.09, BASE_COLOR = 0xf5f0e6;
    function baseboardZ(x, zFrom, zTo) { if (zTo > zFrom) world.add(box(0.02, BASE_H, zTo - zFrom, BASE_COLOR, x, BASE_H / 2, (zFrom + zTo) / 2, { cast: false })); }
    function baseboardX(z, xFrom, xTo) { if (xTo > xFrom) world.add(box(xTo - xFrom, BASE_H, 0.02, BASE_COLOR, (xFrom + xTo) / 2, BASE_H / 2, z, { cast: false })); }
    baseboardZ(leftX + 0.085, backZ + 0.08, frontZ - 0.08);
    baseboardZ(rightX - 0.085, backZ + 0.08, frontZ - 0.08);
    baseboardX(backZ + 0.085, leftX + 0.08, rightX - 0.08);
    baseboardX(frontZ - 0.085, leftX + 0.08, rightX - 0.08);

    // ---------- Windows all around (ground floor) ----------
    makeWindow(leftX - 0.01, 1.55, -2.3, 1.1, 1.3, 'x');
    makeWindow(leftX - 0.01, 1.55, 0.3, 1.1, 1.3, 'x');
    makeWindow(leftX - 0.01, 1.55, 2.6, 1.1, 1.3, 'x');
    makeWindow(rightX + 0.01, 1.55, -3.1, 0.9, 1.1, 'x');
    makeWindow(rightX + 0.01, 1.55, 3.0, 0.9, 1.1, 'x');
    makeWindow(-2.7, 1.55, frontZ + 0.01, 1.1, 1.3, 'z');
    makeWindow(2.7, 1.55, backZ + 0.01, 1.1, 1.1, 'z');
    makeWindow(-0.05, 1.9, frontZ + 0.01, 0.7, 0.9, 'z');

    // ================= Wohnzimmer (reuse the earlier furniture set) =================
    const couch = new THREE.Group();
    couch.add(box(1.9, 0.42, 0.85, 0xd45d5d, 0, 0.21, 0));
    couch.add(box(1.9, 0.4, 0.15, 0xc24b4b, 0, 0.5, -0.36));
    couch.add(box(0.18, 0.5, 0.85, 0xc24b4b, -0.95, 0.34, 0));
    couch.add(box(0.18, 0.5, 0.85, 0xc24b4b, 0.95, 0.34, 0));
    couch.position.set(-3.4, 0, -2.9);
    world.add(couch);
    addObstacle(0, -3.4, -2.9, 2.1, 0.9);

    const coffeeTable = new THREE.Group();
    coffeeTable.add(box(1.0, 0.04, 0.55, 0x8a5a3a, 0, 0.42, 0));
    [[-0.44, -0.23], [0.44, -0.23], [-0.44, 0.23], [0.44, 0.23]].forEach(([lx, lz]) => coffeeTable.add(cyl(0.02, 0.02, 0.4, 0x6b4429, lx, 0.2, lz, { seg: 8 })));
    coffeeTable.position.set(-3.4, 0, -1.6);
    world.add(coffeeTable);
    addObstacle(0, -3.4, -1.6, 1.05, 0.6);

    const livingRug = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.7), new THREE.MeshStandardMaterial({ color: 0x7a4a3a, roughness: 1 }));
    livingRug.rotation.x = -Math.PI / 2;
    livingRug.position.set(-3.4, 0.004, -1.6);
    livingRug.receiveShadow = true;
    world.add(livingRug);

    const diningTable = new THREE.Group();
    diningTable.add(box(1.1, 0.04, 0.72, 0x9c6b3f, 0, 0.75, 0));
    [[-0.5, -0.31], [0.5, -0.31], [-0.5, 0.31], [0.5, 0.31]].forEach(([lx, lz]) => diningTable.add(cyl(0.022, 0.022, 0.73, 0x7a5230, lx, 0.365, lz, { seg: 8 })));
    diningTable.position.set(-1.3, 0, 2.6);
    world.add(diningTable);
    addObstacle(0, -1.3, 2.6, 1.15, 0.75);
    world.add(chair(-1.3, 3.35, Math.PI));
    world.add(chair(-1.3, 1.85, 0));
    addObstacle(0, -1.3, 3.35, 0.42, 0.42);
    addObstacle(0, -1.3, 1.85, 0.42, 0.42);

    const console1 = new THREE.Group();
    console1.add(box(0.85, 0.035, 0.3, 0x8a5a3a, 0, 0.75, 0));
    [[-0.38, -0.11], [0.38, -0.11], [-0.38, 0.11], [0.38, 0.11]].forEach(([lx, lz]) => console1.add(cyl(0.018, 0.018, 0.73, 0x6b4429, lx, 0.365, lz, { seg: 8 })));
    console1.position.set(leftX + 0.2, 0, 1.5);
    world.add(console1);
    addObstacle(0, leftX + 0.2, 1.5, 0.4, 0.35);
    world.add(lampTable(leftX + 0.2, 0.77, 1.5));

    world.add(lampFloor(-1.4, 0, -3.5));
    addObstacle(0, -1.4, -3.5, 0.28, 0.28);
    world.add(houseplant(-4.35, 0, 3.55, 1.15));
    addObstacle(0, -4.35, 3.55, 0.35, 0.35);
    world.add(picture(0.42, 0.55, leftX + 0.01, 1.55, -1.0, Math.PI / 2, 0x5a3d22, 0x7fa8c9));
    world.add(picture(0.36, 0.36, leftX + 0.01, 1.5, 1.6, Math.PI / 2, 0x5a3d22, 0xe8b04a));

    // ================= Küche =================
    function kitchenCounter(x, z, w, d, rotY) {
        const g = new THREE.Group();
        g.add(box(w, 0.85, d, 0xdedad2, 0, 0.425, 0));
        g.add(box(w + 0.03, 0.04, d + 0.03, 0xffffff, 0, 0.87, 0));
        g.position.set(x, 0, z);
        g.rotation.y = rotY;
        world.add(g);
        addObstacle(0, x, z, rotY ? d : w, rotY ? w : d);
    }
    kitchenCounter(1.4, backZ + 0.35, 1.4, 0.62, 0);
    kitchenCounter(rightX - 0.35, -2.6, 0.62, 1.6, Math.PI / 2);

    const stove = new THREE.Group();
    stove.add(box(0.62, 0.85, 0.62, 0x2b2b2b, 0, 0.425, 0));
    stove.add(box(0.58, 0.02, 0.58, 0x181818, 0, 0.87, 0));
    [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]].forEach(([bx, bz]) => stove.add(cyl(0.08, 0.08, 0.01, 0x3a3a3a, bx, 0.885, bz, { seg: 16 })));
    stove.position.set(2.4, 0, backZ + 0.35);
    world.add(stove);
    addObstacle(0, 2.4, backZ + 0.35, 0.65, 0.65);

    function createRangeHood(color = 0xd6d6d6) {
        const g = new THREE.Group();
        g.add(box(0.5, 0.02, 0.42, 0x2b2b2b, 0, -0.02, 0, { cast: false }));                     // dark vent grille, underside
        g.add(box(0.6, 0.04, 0.5, color, 0, 0.02, 0, { metalness: 0.4, roughness: 0.3 }));       // bottom flange
        g.add(box(0.4, 0.3, 0.32, color, 0, 0.19, -0.06, { metalness: 0.4, roughness: 0.3 }));   // tapered body
        g.add(box(0.18, 0.56, 0.16, color, 0, 0.62, -0.1, { metalness: 0.3, roughness: 0.35 })); // duct up to the ceiling
        return g;
    }
    const rangeHood = createRangeHood();
    rangeHood.position.set(2.4, 1.7, backZ + 0.32); // directly above the stove
    world.add(rangeHood);

    const sinkUnit = new THREE.Group();
    sinkUnit.add(box(0.55, 0.06, 0.42, 0xcfd6d8, 0, 0.86, 0));
    sinkUnit.add(box(0.44, 0.1, 0.32, 0xffffff, 0, 0.83, 0));
    sinkUnit.add(cyl(0.008, 0.008, 0.16, 0xb8bcbe, -0.16, 0.95, -0.1, { seg: 8, metalness: 0.6, roughness: 0.3 }));
    sinkUnit.position.set(rightX - 0.35, 0, -0.6);
    sinkUnit.rotation.y = Math.PI / 2;
    world.add(sinkUnit);
    addObstacle(0, rightX - 0.35, -0.6, 0.62, 0.55);

    const fridge = new THREE.Group();
    fridge.add(box(0.65, 1.75, 0.65, 0xf3f3f3, 0, 0.875, 0));
    fridge.add(box(0.02, 1.6, 0.02, 0xcccccc, -0.33, 1.0, 0.34, { cast: false }));
    fridge.position.set(3.9, 0, backZ + 0.35);
    world.add(fridge);
    addObstacle(0, 3.9, backZ + 0.35, 0.68, 0.68);

    const upperCabinets = box(1.6, 0.7, 0.32, 0xdedad2, 1.3, 1.75, backZ + 0.16);
    world.add(upperCabinets);
    world.add(picture(0.34, 0.34, rightX - 0.01, 1.6, 1.2, -Math.PI / 2, 0xd98f4a, 0xffd166));

    // ================= Toilette =================
    const wcGroup = createToilet();
    wcGroup.position.set(2.2, 0, 2.05);
    wcGroup.rotation.y = Math.PI;
    world.add(wcGroup);
    addObstacle(0, 2.2, 2.0, 0.3, 0.45);
    const wcSink = createSinkPedestal();
    wcSink.position.set(0.95, 0, 0.75);
    world.add(wcSink);
    addObstacle(0, 0.95, 0.75, 0.3, 0.25);

    // ================= Hauseingang (Flur) =================
    world.add(houseplant(0.3, 0, -3.6, 0.8));
    addObstacle(0, 0.3, -3.6, 0.25, 0.25);
    const bench = box(0.9, 0.42, 0.32, 0x7a5230, 0, 0.21, 3.6);
    world.add(bench);
    addObstacle(0, 0, 3.6, 0.9, 0.32);

    // ---------- Stairs (Treppe): visual treads over a smooth ramp for collision ----------
    const STAIR_STEPS = 16;
    for (let i = 0; i <= STAIR_STEPS; i++) {
        const t = i / STAIR_STEPS;
        const z = STAIR_Z_START + t * (STAIR_Z_END - STAIR_Z_START);
        const y = t * FLOOR2_Y;
        world.add(box((CORR_X_MAX - CORR_X_MIN) - 0.06, 0.04, (STAIR_Z_END - STAIR_Z_START) / STAIR_STEPS + 0.02, 0x9c6b3f, 0, y, z, { cast: false }));
    }
    world.add(box(0.06, FLOOR2_Y + 0.1, STAIR_Z_END - STAIR_Z_START, 0x6b4429, CORR_X_MIN + 0.03, FLOOR2_Y / 2, (STAIR_Z_START + STAIR_Z_END) / 2, { cast: false }));
    world.add(box(0.06, FLOOR2_Y + 0.1, STAIR_Z_END - STAIR_Z_START, 0x6b4429, CORR_X_MAX - 0.03, FLOOR2_Y / 2, (STAIR_Z_START + STAIR_Z_END) / 2, { cast: false }));

    // ================= Upper floor structure =================
    const UPPER_H = FLOOR2_Y + KNEE_H;
    function upperWall(w, d, color, x, z) { wall(w, KNEE_H, d, color, x, FLOOR2_Y + KNEE_H / 2, z); }

    // Exterior knee walls (eaves, z = ±4) and gable ends (x = ±5, built as full triangular walls)
    upperWall(spanX, 0.15, WALL_PARENT, (leftX + rightX) / 2, backZ);
    upperWall(spanX, 0.15, WALL_KID1, (leftX + rightX) / 2, frontZ);
    addObstacle(1, (leftX + rightX) / 2, backZ, spanX, 0.15);
    addObstacle(1, (leftX + rightX) / 2, frontZ, spanX, 0.15);

    function gableEndWall(x, color) {
        const shape = new THREE.Shape();
        shape.moveTo(backZ, 0);
        shape.lineTo(frontZ, 0);
        shape.lineTo(frontZ, KNEE_H);
        shape.lineTo(0, RIDGE_H);
        shape.lineTo(backZ, KNEE_H);
        shape.closePath();
        const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.15, bevelEnabled: false });
        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
        mesh.rotation.y = Math.PI / 2;
        // The 0.15-deep extrusion runs from local Z=0 to Z=0.15 (one-sided, not
        // centered), so after the rotation it must be positioned starting AT x
        // (not x+half-depth) to end up centered on x like every other wall here —
        // otherwise it sits flush with its own collision box on one side only,
        // leaving a same-size gap with no wall mesh in it on the other side.
        mesh.position.set(x, FLOOR2_Y, 0);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        world.add(mesh);
    }
    gableEndWall(leftX - 0.075, WALL_PARENT);
    gableEndWall(rightX - 0.075, WALL_KID2);
    addObstacle(1, leftX, 0, 0.15, spanZ);
    addObstacle(1, rightX, 0, 0.15, spanZ);

    // Interior partition walls upstairs (knee-wall height only, roof slope covers the rest)
    function upperPartitionZ(x, zFrom, zTo, color) {
        if (zTo - zFrom <= 0.001) return;
        upperWall(0.1, zTo - zFrom, color, x, (zFrom + zTo) / 2);
        addObstacle(1, x, (zFrom + zTo) / 2, 0.1, zTo - zFrom);
    }
    function upperPartitionX(z, xFrom, xTo, color) {
        if (xTo - xFrom <= 0.001) return;
        wall(xTo - xFrom, KNEE_H, 0.1, color, (xFrom + xTo) / 2, FLOOR2_Y + KNEE_H / 2, z);
        addObstacle(1, (xFrom + xTo) / 2, z, xTo - xFrom, 0.1);
    }
    // The stairs sit at one end of the corridor (z < STAIR_Z_END = -1.3); the
    // upper landing is a single continuous piece from there to the front wall.
    // Every bedroom door gap therefore must lie entirely within z > STAIR_Z_END,
    // so the doorway always sits on flat landing, never on the sloped ramp.
    // West corridor wall: doors to Eltern (back room) and Kinderzimmer 1 (front room)
    upperPartitionZ(CORR_X_MIN, backZ, -1.1, WALL_PARENT);
    upperPartitionZ(CORR_X_MIN, -0.4, 1.0, WALL_PARENT);
    upperPartitionZ(CORR_X_MIN, 1.0, 1.6, WALL_KID1);
    upperPartitionZ(CORR_X_MIN, 2.4, frontZ, WALL_KID1);
    // East corridor wall: doors to Bad (back room) and Kinderzimmer 2 (front room)
    upperPartitionZ(CORR_X_MAX, backZ, -1.2, WALL_KID2);
    upperPartitionZ(CORR_X_MAX, -0.6, 1.6, WALL_KID2);
    upperPartitionZ(CORR_X_MAX, 2.3, frontZ, WALL_KID2);
    // Eltern <-> Kinderzimmer1 divider, Bad <-> Kinderzimmer2 divider
    upperPartitionX(1.0, X_MIN, CORR_X_MIN, WALL_PARENT);
    upperPartitionX(-0.5, CORR_X_MAX, X_MAX, WALL_KID2);

    buildDoor({ axis: 'z', x: CORR_X_MIN, hinge: -1.1, hingeSign: 1, width: 0.7, height: KNEE_H + 0.6, openAngle: -Math.PI / 2, wallDepth: 0.1, doorColor: 0xdccdb8 });
    buildDoor({ axis: 'z', x: CORR_X_MIN, hinge: 1.6, hingeSign: 1, width: 0.8, height: KNEE_H + 0.6, openAngle: -Math.PI / 2, wallDepth: 0.1, doorColor: 0xf3d7e6 });
    buildDoor({ axis: 'z', x: CORR_X_MAX, hinge: -1.2, hingeSign: 1, width: 0.6, height: KNEE_H + 0.6, openAngle: -Math.PI / 2, wallDepth: 0.1, doorColor: 0xdcecef });
    buildDoor({ axis: 'z', x: CORR_X_MAX, hinge: 1.6, hingeSign: 1, width: 0.7, height: KNEE_H + 0.6, openAngle: -Math.PI / 2, wallDepth: 0.1, doorColor: 0xbfe0ea });

    // ---------- Sloped ceilings (Dachschrägen) + gable roof shell ----------
    function slopedCeiling(zSign, color) {
        const run = Math.hypot(4, RIDGE_H - KNEE_H);
        const geo = new THREE.PlaneGeometry(spanX, run);
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geo, mat);
        const angle = Math.atan2(RIDGE_H - KNEE_H, 4);
        mesh.rotation.x = zSign * (Math.PI / 2 + angle);
        mesh.position.set(0, FLOOR2_Y + (KNEE_H + RIDGE_H) / 2, zSign * 2);
        mesh.receiveShadow = true;
        mesh.castShadow = false;
        world.add(mesh);
        return mesh;
    }
    slopedCeiling(-1, 0xf4efe6);
    slopedCeiling(1, 0xf4efe6);

    // Exterior roof shell (simple gable, seen only glancingly through windows/skylights)
    function roofShell(zSign) {
        const run = Math.hypot(4.4, RIDGE_H - KNEE_H + 0.15);
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(spanX + 0.6, run), new THREE.MeshStandardMaterial({ color: 0x7a3d33, roughness: 0.8, side: THREE.DoubleSide }));
        const angle = Math.atan2(RIDGE_H - KNEE_H + 0.15, 4.4);
        mesh.rotation.x = zSign * (Math.PI / 2 + angle);
        mesh.position.set(0, FLOOR2_Y + (KNEE_H + RIDGE_H) / 2 + 0.05, zSign * 2);
        mesh.castShadow = true;
        world.add(mesh);
    }
    roofShell(-1);
    roofShell(1);

    function addSkylight(xCenter, zCenter, zSign) {
        const angle = Math.atan2(RIDGE_H - KNEE_H, 4);
        const t = Math.abs(zCenter) / 4; // 0 at the ridge, 1 at the eave along the slope
        const y = FLOOR2_Y + RIDGE_H - t * (RIDGE_H - KNEE_H);
        const g = new THREE.Group();
        g.add(box(0.55, 0.03, 0.4, 0xdff2ff, 0, 0, 0, { metalness: 0.3, roughness: 0.1, cast: false }));
        g.add(box(0.6, 0.015, 0.06, 0xffffff, 0, 0.01, -0.19, { cast: false }));
        g.add(box(0.6, 0.015, 0.06, 0xffffff, 0, 0.01, 0.19, { cast: false }));
        g.position.set(xCenter, y - 0.01, zCenter);
        g.rotation.x = zSign * (Math.PI / 2 + angle);
        world.add(g);
    }
    addSkylight(-2.7, -2.2, -1);   // Elternschlafzimmer
    addSkylight(-2.7, 2.2, 1);     // Kinderzimmer 1
    addSkylight(2.5, -2.8, -1);    // Bad
    addSkylight(2.7, 2.2, 1);      // Kinderzimmer 2

    // ---------- Baseboards + windows (upper floor) ----------
    baseboardZ(leftX + 0.085, backZ + 0.08, frontZ - 0.08);
    baseboardZ(rightX - 0.085, backZ + 0.08, frontZ - 0.08);
    baseboardX(backZ + 0.085, leftX + 0.08, rightX - 0.08);
    baseboardX(frontZ - 0.085, leftX + 0.08, rightX - 0.08);

    makeWindow(leftX - 0.01, FLOOR2_Y + 0.75, -2.3, 0.9, 1.0, 'x');
    makeWindow(leftX - 0.01, FLOOR2_Y + 0.75, 2.3, 0.9, 1.0, 'x');
    makeWindow(rightX + 0.01, FLOOR2_Y + 0.75, -2.9, 0.8, 0.9, 'x');
    makeWindow(rightX + 0.01, FLOOR2_Y + 0.75, 2.3, 0.8, 0.9, 'x');

    // ================= Elternschlafzimmer =================
    const parentBed = new THREE.Group();
    parentBed.add(box(1.6, 0.34, 2.0, 0xffffff, 0, 0.17, 0));
    parentBed.add(box(1.65, 0.55, 0.08, 0x6b7fae, 0, 0.44, -0.96));
    parentBed.add(box(1.5, 0.1, 0.5, 0xdfe4f2, -0.35, 0.4, -0.55));
    parentBed.add(box(1.5, 0.1, 0.5, 0xdfe4f2, 0.35, 0.4, -0.55));
    parentBed.position.set(-3.4, FLOOR2_Y, backZ + 1.35);
    world.add(parentBed);
    addObstacle(1, -3.4, backZ + 1.35, 1.7, 2.05);
    world.add(lampTable(-3.4 - 1.0, FLOOR2_Y + 0.5, backZ + 1.35));
    world.add(box(0.32, 0.5, 0.32, 0x9c6b3f, -3.4 - 1.0, FLOOR2_Y + 0.25, backZ + 1.35));
    addObstacle(1, -3.4 - 1.0, backZ + 1.35, 0.34, 0.34);
    world.add(createWardrobe(1.3, 1.9, 0.6, 0x7a5230));
    world.children[world.children.length - 1].position.set(leftX + 0.35, FLOOR2_Y, -0.6);
    addObstacle(1, leftX + 0.35, -0.6, 1.35, 0.65);
    world.add(houseplant(-1.0, FLOOR2_Y, -3.6, 0.8));
    addObstacle(1, -1.0, backZ + 0.4, 0.25, 0.25);

    // ================= Kinderzimmer 1 (große Schwester) =================
    const sisterBed = new THREE.Group();
    sisterBed.add(box(1.0, 0.3, 1.9, 0xffffff, 0, 0.15, 0));
    sisterBed.add(box(1.05, 0.5, 0.08, 0xe07fae, 0, 0.4, -0.91));
    sisterBed.add(box(0.9, 0.09, 0.45, 0xffd6ea, 0, 0.35, -0.55));
    sisterBed.position.set(-4.0, FLOOR2_Y, 2.0);
    world.add(sisterBed);
    addObstacle(1, -4.0, 2.0, 1.1, 1.95);
    const sisterDesk = createDesk(0xe8b6cf);
    sisterDesk.position.set(-1.1, FLOOR2_Y, 1.5);
    world.add(sisterDesk);
    addObstacle(1, -1.1, 1.5, 0.8, 0.55);
    const sisterChair = chair(-1.1, 1.85, Math.PI, 0xd6a0bf);
    sisterChair.position.y = FLOOR2_Y;
    world.add(sisterChair);
    addObstacle(1, -1.1, 1.85, 0.42, 0.42);
    const sisterRug = new THREE.Mesh(new THREE.CircleGeometry(0.75, 32), new THREE.MeshStandardMaterial({ color: 0xf0a8c8, roughness: 1 }));
    sisterRug.rotation.x = -Math.PI / 2;
    sisterRug.position.set(-2.6, FLOOR2_Y + 0.004, 2.6);
    world.add(sisterRug);
    world.add(picture(0.32, 0.32, leftX + 0.01, FLOOR2_Y + 1.5, 1.2, Math.PI / 2, 0xe8b6cf, 0xffe27a));

    // ================= Bad (upstairs) =================
    const tub = createBathtub(1.5, 0.7);
    tub.position.set(2.0, FLOOR2_Y, backZ + 0.5);
    world.add(tub);
    addObstacle(1, 2.0, backZ + 0.5, 1.55, 0.75);
    const badWc = createToilet();
    badWc.position.set(4.4, FLOOR2_Y, -1.9);
    badWc.rotation.y = -Math.PI / 2;
    world.add(badWc);
    addObstacle(1, 4.4, -1.9, 0.45, 0.3);
    const badSink = createSinkPedestal();
    badSink.position.set(3.4, FLOOR2_Y, -3.6);
    world.add(badSink);
    addObstacle(1, 3.4, -3.6, 0.3, 0.25);
    const badRug = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45), new THREE.MeshStandardMaterial({ color: 0x8fc7d8, roughness: 1 }));
    badRug.rotation.x = -Math.PI / 2;
    badRug.position.set(1.3, FLOOR2_Y + 0.004, -2.7);
    world.add(badRug);

    // ================= Kinderzimmer 2 (Junge, Spielsachen + Rennautos) =================
    // Styled after a classic wooden-frontier kids' room: cloud wallpaper mural,
    // a cowboy-style bed with post finials and a checkered blanket, a wristwatch
    // wall clock, a corkboard, and a coiled rope — generic shapes/motifs only,
    // no specific licensed character likenesses.
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

    // Cloud-wallpaper mural on the gable end wall
    const cloudMural = new THREE.Mesh(
        new THREE.PlaneGeometry(2.6, 1.1),
        new THREE.MeshStandardMaterial({ map: createCloudTexture(0x8fc7ea, 0xffffff), roughness: 0.9 })
    );
    cloudMural.rotation.y = -Math.PI / 2;
    cloudMural.position.set(X_MAX - 0.02, FLOOR2_Y + 0.62, 1.6);
    world.add(cloudMural);

    // Wristwatch-style wall clock
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

    // Corkboard with a few pinned notes/drawings
    const corkboard = new THREE.Group();
    corkboard.add(box(0.5, 0.36, 0.02, 0x7a5230, 0, 0, 0, { cast: false }));
    corkboard.add(box(0.44, 0.3, 0.006, 0xc79a63, 0, 0, 0.013, { cast: false, roughness: 0.95 }));
    [[-0.12, 0.06, 0xffffff], [0.1, 0.08, 0xffe6a8], [-0.05, -0.07, 0xbfe0ff], [0.13, -0.05, 0xffd6ea]].forEach(([nx, ny, c]) => {
        corkboard.add(box(0.12, 0.09, 0.004, c, nx, ny, 0.018, { cast: false }));
    });
    corkboard.rotation.y = -Math.PI / 2;
    corkboard.position.set(X_MAX - 0.03, FLOOR2_Y + 1.0, 0.7);
    world.add(corkboard);

    // Coiled rope decoration, hung on the wall
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
    boyChest.position.set(1.4, FLOOR2_Y, 3.5);
    world.add(boyChest);
    addObstacle(1, 1.4, 3.5, 0.7, 0.46);

    const kidRug = new THREE.Mesh(new THREE.CircleGeometry(0.95, 40), new THREE.MeshStandardMaterial({ color: 0x6fb3d8, roughness: 1 }));
    kidRug.rotation.x = -Math.PI / 2;
    kidRug.position.set(2.4, FLOOR2_Y + 0.004, 0.3);
    world.add(kidRug);
    world.add(picture(0.4, 0.4, rightX - 0.01, FLOOR2_Y + 1.5, 1.6, -Math.PI / 2, 0xd98f4a, 0xffd166));

    // Rocking horse
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
    blocksGroup.position.set(1.0, FLOOR2_Y, 3.6);
    world.add(blocksGroup);
    addObstacle(1, 1.0, 3.6, 0.17, 0.17);

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

    // Rennautos (race cars)
    [[0xd6413f, 1.6, 3.0, 0.1], [0x4aa8e0, 2.0, 3.3, -0.4], [0xffd166, 2.4, 3.05, 0.6]].forEach(([c, x, z, rot]) => {
        const car = createCarToy(c);
        car.position.set(x, FLOOR2_Y, z);
        car.rotation.y = rot;
        world.add(car);
        addObstacle(1, x, z, 0.13, 0.07);
    });
    // Simple race track loop (flattened torus) on the floor
    const track = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 8, 40), new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 }));
    track.rotation.x = Math.PI / 2;
    track.position.set(2.0, FLOOR2_Y + 0.005, 2.2);
    track.receiveShadow = true;
    world.add(track);

    // ================= Exterior scenery (visible through windows, not reachable) =================
    function exteriorHouse(x, z, hue) {
        const g = new THREE.Group();
        const h = 1.6 + Math.random() * 0.8;
        g.add(new THREE.Mesh(new THREE.BoxGeometry(1.6, h, 1.4), new THREE.MeshStandardMaterial({ color: hue, roughness: 0.9 })));
        g.children[0].position.y = h / 2;
        const roof = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.9, 4), new THREE.MeshStandardMaterial({ color: 0x6b3b30, roughness: 0.9 }));
        roof.rotation.y = Math.PI / 4;
        roof.position.y = h + 0.45;
        g.add(roof);
        g.position.set(x, 0, z);
        g.rotation.y = Math.random() * Math.PI * 2;
        g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
        exterior.add(g);
    }
    function exteriorTree(x, z) {
        const g = new THREE.Group();
        const th = 1.0 + Math.random() * 0.6;
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, th, 6), new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.9 })));
        g.children[0].position.y = th / 2;
        const foliage = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7 + Math.random() * 0.3, 0), new THREE.MeshStandardMaterial({ color: 0x3a7d3a, roughness: 0.9 }));
        foliage.position.y = th + 0.5;
        g.add(foliage);
        g.position.set(x, 0, z);
        g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
        exterior.add(g);
    }
    const houseHues = [0xd8b98a, 0xc98a72, 0xb8c9a8, 0xd6c4a0];
    for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + 0.2;
        const r = 11 + (i % 3) * 2.2;
        exteriorHouse(Math.cos(a) * r, Math.sin(a) * r, houseHues[i % houseHues.length]);
    }
    for (let i = 0; i < 16; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 8.5 + Math.random() * 7;
        exteriorTree(Math.cos(a) * r, Math.sin(a) * r);
    }
    // ground plane under the exterior scenery
    const yard = new THREE.Mesh(new THREE.CircleGeometry(30, 32), new THREE.MeshStandardMaterial({ color: 0x5a8f4f, roughness: 1 }));
    yard.rotation.x = -Math.PI / 2;
    yard.position.y = -0.02;
    exterior.add(yard);

    // ================= Cat (wandering NPC, ground floor) =================
    function createCat() {
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
        return { group: g, tail, legs: [legFront.l, legFront.r, legBack.l, legBack.r] };
    }
    const cat = createCat();
    world.add(cat.group);
    const catState = { x: -2.5, z: 0.5, yaw: 0, speed: 0, targetX: -2.5, targetZ: 0.5, waitTimer: 1, walkPhase: 0 };
    function pickCatTarget() {
        const spots = [[-3.4, -2.9], [-1.5, -0.2], [-3.8, 3.2], [0.0, 3.6], [1.5, -3.0], [3.5, -2.0], [-2.2, 1.8], [0.2, -1.5]];
        const s = spots[Math.floor(Math.random() * spots.length)];
        catState.targetX = s[0]; catState.targetZ = s[1];
    }
    pickCatTarget();

    // ---------- Player: small toy figure / game piece (10 cm tall) ----------
    const player = new THREE.Group();
    const skin = 0xffcf9e;
    const tunic = 0x3f6fd1;
    const trim = 0xffd166;

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

    const beretColor = 0xd6413f;
    const beretCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.0135, 16, 10, 0, Math.PI * 2, 0, Math.PI / 1.8),
        new THREE.MeshStandardMaterial({ color: beretColor, roughness: 0.6 })
    );
    beretCap.position.set(0, 0.092, 0);
    beretCap.castShadow = true;
    player.add(beretCap);
    player.add(cyl(0.0145, 0.0145, 0.004, beretColor, 0, 0.085, 0, { seg: 16 }));
    player.add(ball3(0.002, 0x222222, -0.006, 0.083, 0.014, { seg: 8 }));
    player.add(ball3(0.002, 0x222222, 0.006, 0.083, 0.014, { seg: 8 }));

    const bodyTilt = new THREE.Group();
    bodyTilt.add(player);
    world.add(bodyTilt);

    // ---------- Player state ----------
    const JUMP_STATE = { NONE: 0, WINDUP: 1, AIR: 2, LAND: 3 };
    const WINDUP_DUR = 0.15;
    const LAND_DUR = 0.25;

    const state = {
        x: -0.0, z: 3.0, y: 0, vy: 0,
        yaw: Math.PI,
        grounded: true,
        moveSpeed: 0,
        walkPhase: 0,
        jumpState: JUMP_STATE.NONE,
        jumpTimer: 0,
        jumpBuffered: false,
        floor: 0,
        baseY: 0,
        wasInStair: false,
    };

    const PLAYER_RADIUS = 0.035;
    const SPEED_MAX = 0.75;
    const ACCEL_RATE = 2.25;
    const DECEL_RATE = 3.0;
    const TURN_RATE = 1.1;
    const GRAVITY = -14;
    const JUMP_VEL = 2.57;
    const WALK_ANIM_RATE = 11;

    function lerp(a, b, t) { return a + (b - a) * t; }

    function inStairwell(x, z) {
        return x > CORR_X_MIN && x < CORR_X_MAX && z > STAIR_Z_START && z < STAIR_Z_END;
    }

    // ---------- Input ----------
    const keys = new Set();
    window.addEventListener('keydown', (e) => {
        keys.add(e.code);
        if (e.code === 'Space') { state.jumpBuffered = true; e.preventDefault(); }
    });
    window.addEventListener('keyup', (e) => keys.delete(e.code));

    const touch = { forward: false, back: false, left: false, right: false };
    const TOUCH_THRESHOLD = 18;
    let touchOrigin = null, touchMoved = false, touchStartTime = 0;
    function resetTouch() { touch.forward = touch.back = touch.left = touch.right = false; }
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

    // ---------- Camera rig ----------
    const CAM_DIST_MOVE = 0.85;
    const CAM_DIST_IDLE = 0.60;
    const CAM_HEIGHT = 0.24;
    const CAM_LOOK_HEIGHT = 0.08;
    let camDist = CAM_DIST_IDLE;

    const camTarget = new THREE.Vector3();
    const camDesired = new THREE.Vector3();
    const camRay = new THREE.Raycaster();
    const camRayDir = new THREE.Vector3();
    const camPivot = new THREE.Vector3();

    // ---------- Update ----------
    const excludedFromCamera = new Set([...groundFloors, ...upperFloors, livingRug, kidRug, sisterRug, badRug, bodyTilt, cat.group, ...balls.map(b => b.mesh)]);
    const cameraBlockers = world.children.filter((c) => !excludedFromCamera.has(c));

    const clock = new THREE.Clock();

    function updateCat(dt) {
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
        cat.group.position.set(catState.x, 0, catState.z);
        cat.group.rotation.y = catState.yaw;
        const sw = catState.speed > 0.02 ? Math.sin(catState.walkPhase) * 0.5 : 0;
        cat.legs[0].rotation.x = sw; cat.legs[3].rotation.x = sw;
        cat.legs[1].rotation.x = -sw; cat.legs[2].rotation.x = -sw;
        cat.tail.rotation.y = Math.sin(clock.elapsedTime * 1.6) * 0.3;
    }

    function update(dt) {
        dt = Math.min(dt, 0.05);

        if (keys.has('KeyA') || keys.has('ArrowLeft') || touch.left) state.yaw += TURN_RATE * dt;
        if (keys.has('KeyD') || keys.has('ArrowRight') || touch.right) state.yaw -= TURN_RATE * dt;

        const fwdX = Math.sin(state.yaw), fwdZ = Math.cos(state.yaw);
        const wantForward = keys.has('KeyW') || keys.has('ArrowUp') || touch.forward;
        const wantBack = keys.has('KeyS') || keys.has('ArrowDown') || touch.back;
        const wantMove = wantForward || wantBack;

        if (wantMove) state.moveSpeed = Math.min(state.moveSpeed + ACCEL_RATE * dt, SPEED_MAX);
        else state.moveSpeed = Math.max(state.moveSpeed - DECEL_RATE * dt, 0);

        if (wantForward) { state.x += fwdX * state.moveSpeed * dt; state.z += fwdZ * state.moveSpeed * dt; }
        if (wantBack) { state.x -= fwdX * state.moveSpeed * dt; state.z -= fwdZ * state.moveSpeed * dt; }
        if (wantMove) state.walkPhase += dt * WALK_ANIM_RATE;

        state.x = Math.max(BOUNDS.minX + PLAYER_RADIUS, Math.min(BOUNDS.maxX - PLAYER_RADIUS, state.x));
        state.z = Math.max(BOUNDS.minZ + PLAYER_RADIUS, Math.min(BOUNDS.maxZ - PLAYER_RADIUS, state.z));

        // Stairs: baseY ramps smoothly while on the stairwell footprint. `floor`
        // (used to pick the right obstacle set) only flips once you actually
        // reach the far end and step off, so passing through doesn't teleport
        // you onto the other floor's height.
        const nowInStair = inStairwell(state.x, state.z);
        if (nowInStair) {
            const t = (state.z - STAIR_Z_START) / (STAIR_Z_END - STAIR_Z_START);
            state.baseY = t * FLOOR2_Y;
        } else {
            if (state.wasInStair) state.floor = state.z >= STAIR_Z_END ? 1 : 0;
            state.baseY = state.floor * FLOOR2_Y;
        }
        state.wasInStair = nowInStair;

        [state.x, state.z] = resolveObstacles(state.x, state.z, PLAYER_RADIUS, obstaclesByFloor[state.floor]);

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

        // Ball interactions (Kinderzimmer 2, upper floor)
        for (const b of balls) {
            const dx = b.mesh.position.x - state.x;
            const dz = b.mesh.position.z - state.z;
            const dist = Math.hypot(dx, dz);
            const minDist = b.radius + PLAYER_RADIUS;
            if (state.floor === 1 && dist < minDist && dist > 0.0001) {
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
            [bx, bz] = resolveObstacles(bx, bz, b.radius, obstaclesByFloor[1]);
            b.mesh.position.x = bx;
            b.mesh.position.z = bz;
            const speed = Math.hypot(b.vx, b.vz);
            if (speed > 0.001) {
                const axis = new THREE.Vector3(-b.vz, 0, b.vx).normalize();
                b.mesh.rotateOnWorldAxis(axis, speed * dt / b.radius);
            }
        }

        rockingHorse.rotation.z = Math.sin(clock.elapsedTime * 1.3) * 0.06;
        updateCat(dt);

        bodyTilt.position.set(state.x, state.baseY + state.y, state.z);
        bodyTilt.rotation.y = state.yaw;

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
            legL.hip.rotation.x = lerp(legL.hip.rotation.x, lLeg * 0.88, 0.35);
            legR.hip.rotation.x = lerp(legR.hip.rotation.x, rLeg * 0.88, 0.35);
            legL.knee.rotation.x = lerp(legL.knee.rotation.x, Math.max(0, lLeg) * 1.0 + Math.max(0, -lLeg) * 0.7, 0.35);
            legR.knee.rotation.x = lerp(legR.knee.rotation.x, Math.max(0, rLeg) * 1.0 + Math.max(0, -rLeg) * 0.7, 0.35);
            const swing = s * 0.55;
            armL.rotation.x = lerp(armL.rotation.x, -swing, 0.3);
            armR.rotation.x = lerp(armR.rotation.x, swing, 0.3);
            torso.position.y = lerp(torso.position.y, TORSO_Y + (moving ? Math.abs(s) * 0.002 : 0), 0.3);
            torso.rotation.x = lerp(torso.rotation.x, 0, 0.3);
        }

        camDist = lerp(camDist, moving ? CAM_DIST_MOVE : CAM_DIST_IDLE, Math.min(1, dt * 2.5));

        camPivot.set(state.x, state.baseY + state.y + 0.055, state.z);
        camDesired.set(
            state.x - fwdX * camDist,
            state.baseY + state.y + CAM_HEIGHT,
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
        if (allowedDist < desiredDist) camDesired.copy(camPivot).addScaledVector(camRayDir, allowedDist);
        camera.position.lerp(camDesired, Math.min(1, dt * 6));

        camTarget.lerp(new THREE.Vector3(state.x, state.baseY + state.y + CAM_LOOK_HEIGHT, state.z), Math.min(1, dt * 8));
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
