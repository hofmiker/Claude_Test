import * as THREE from '../vendor/three.module.min.js';

export function box(w, h, d, color, x, y, z, opts = {}) {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            new THREE.MeshStandardMaterial({ color, roughness: opts.roughness ?? 0.8, metalness: opts.metalness ?? 0.05, side: opts.side, transparent: opts.transparent, opacity: opts.opacity ?? 1 })
        );
        mesh.position.set(x, y, z);
        if (opts.rotY) mesh.rotation.y = opts.rotY;
        if (opts.rotX) mesh.rotation.x = opts.rotX;
        if (opts.rotZ) mesh.rotation.z = opts.rotZ;
        mesh.castShadow = opts.cast !== false;
        mesh.receiveShadow = opts.receive !== false;
        return mesh;
    }

export function cyl(rTop, rBot, h, color, x, y, z, opts = {}) {
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

export function ball3(r, color, x, y, z, opts = {}) {
        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(r, opts.seg ?? 24, (opts.seg ?? 24) - 6),
            new THREE.MeshStandardMaterial({ color, roughness: opts.roughness ?? 0.35, metalness: opts.metalness ?? 0.05 })
        );
        mesh.position.set(x, y, z);
        mesh.castShadow = opts.cast !== false;
        mesh.receiveShadow = true;
        return mesh;
    }

export function createPlankTexture(baseHex, seed) {
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

export function createTileTexture(hex1, hex2) {
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

export function createCloudTexture(skyHex, cloudHex) {
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

export function picture(w, h, x, y, z, rotY, frameColor, canvasColor) {
        const g = new THREE.Group();
        g.add(box(w, h, 0.02, frameColor, 0, 0, 0));
        g.add(box(w - 0.05, h - 0.05, 0.01, canvasColor, 0, 0, 0.012));
        g.position.set(x, y, z);
        g.rotation.y = rotY;
        return g;
    }

export function houseplant(x, y, z, scale = 1) {
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

export function lampFloor(x, y, z) {
        const g = new THREE.Group();
        g.add(cyl(0.12, 0.14, 0.02, 0x333333, 0, 0.01, 0));
        g.add(cyl(0.012, 0.016, 1.3, 0x4a4a4a, 0, 0.66, 0, { seg: 8 }));
        g.add(cyl(0.16, 0.11, 0.22, 0xffe6a8, 0, 1.42, 0, { roughness: 0.5 }));
        g.position.set(x, y, z);
        return g;
    }

export function lampTable(x, y, z) {
        const g = new THREE.Group();
        g.add(cyl(0.01, 0.012, 0.14, 0xcccccc, 0, 0.07, 0, { seg: 8 }));
        g.add(cyl(0.09, 0.06, 0.13, 0xfff3d0, 0, 0.205, 0, { roughness: 0.5 }));
        g.position.set(x, y, z);
        return g;
    }

    // Ceiling-mounted pendant lamp: cord/rod down to a shade, with a real
    // (non-shadow-casting) point light near the shade so the fixture actually
    // illuminates the room. `y` is the ceiling attachment height; the cord
    // hangs down from there.
export function lampPendant(x, y, z, opts = {}) {
        const drop = opts.drop ?? 0.5, shadeR = opts.shadeR ?? 0.14, shadeH = opts.shadeH ?? 0.16;
        const g = new THREE.Group();
        g.add(cyl(0.006, 0.006, drop, opts.cordColor ?? 0x2b2b2b, 0, -drop / 2, 0, { seg: 6, cast: false }));
        g.add(cyl(shadeR, shadeR * 0.55, shadeH, opts.shadeColor ?? 0xf2e6c9, 0, -drop - shadeH / 2, 0, { roughness: 0.5, cast: false }));
        const light = new THREE.PointLight(opts.lightColor ?? 0xfff0d0, opts.intensity ?? 0.6, opts.range ?? 5, 2);
        light.castShadow = false;
        light.position.set(0, -drop - shadeH * 0.85, 0);
        g.add(light);
        g.position.set(x, y, z);
        return g;
    }

    // Wall-mounted spotlight/sconce. Follows makeWindow's axis convention:
    // wallAxis='x' mounts on an x=const wall (thin dimension along x, e.g. the
    // west/east exterior walls), light shines along X in the `sign` direction;
    // wallAxis='z' mounts on a z=const wall (front/back or corridor partition
    // walls), light shines along Z in the `sign` direction.
export function lampWallSpot(x, y, z, wallAxis, sign, opts = {}) {
        const g = new THREE.Group();
        g.add(box(wallAxis === 'x' ? 0.03 : 0.09, 0.09, wallAxis === 'x' ? 0.09 : 0.03, opts.housingColor ?? 0x8c8c8c, 0, 0, 0, { metalness: 0.4, roughness: 0.4, cast: false }));
        const shade = cyl(0.02, 0.06, 0.12, opts.shadeColor ?? 0xfff3d0, 0, 0, 0, { roughness: 0.4, seg: 14, cast: false });
        shade.rotation.z = wallAxis === 'x' ? sign * Math.PI / 2 : 0;
        shade.rotation.x = wallAxis === 'z' ? sign * Math.PI / 2 : 0;
        // Offset large enough that the shade clears even the thickest wall
        // (0.15m ext walls, half=0.075) plus its own half-length (0.06) —
        // otherwise part of the shade sits embedded in the wall instead of
        // reading as mounted on its surface.
        shade.position.set(wallAxis === 'x' ? sign * 0.15 : 0, 0, wallAxis === 'z' ? sign * 0.15 : 0);
        g.add(shade);
        const light = new THREE.SpotLight(opts.lightColor ?? 0xfff0d0, opts.intensity ?? 0.7, opts.range ?? 4, opts.angle ?? Math.PI / 5, 0.4, 1.5);
        light.castShadow = false;
        const target = new THREE.Object3D();
        target.position.set(wallAxis === 'x' ? sign * 1.5 : 0, -0.3, wallAxis === 'z' ? sign * 1.5 : 0);
        g.add(light);
        g.add(target);
        light.target = target;
        g.position.set(x, y, z);
        return g;
    }

export function chair(x, z, rotY, color) {
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

export function createToilet() {
        const g = new THREE.Group();
        const wc = 0xf5f4f0;
        g.add(box(0.24, 0.42, 0.28, wc, 0, 0.21, -0.16));
        g.add(box(0.2, 0.1, 0.06, wc, 0, 0.44, -0.02));
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.26, 16), new THREE.MeshStandardMaterial({ color: wc, roughness: 0.3 })).translateY(0.13).translateZ(0.02));
        g.children[g.children.length - 1].castShadow = true;
        g.add(cyl(0.13, 0.15, 0.03, 0xffffff, 0, 0.265, 0.02, { seg: 20 }));
        return g;
    }

export function createSinkPedestal() {
        const g = new THREE.Group();
        const wc = 0xf5f4f0;
        g.add(cyl(0.02, 0.03, 0.55, wc, 0, 0.275, 0, { seg: 10 }));
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.09, 16), new THREE.MeshStandardMaterial({ color: wc, roughness: 0.3 })).translateY(0.58));
        g.children[g.children.length - 1].castShadow = true;
        g.add(cyl(0.008, 0.008, 0.09, 0xcccccc, 0, 0.66, -0.1, { seg: 8, metalness: 0.7, roughness: 0.3 }));
        return g;
    }

export function createBathtub(len, wid) {
        const g = new THREE.Group();
        const c = 0xf7f6f2;
        g.add(box(len, 0.5, wid, c, 0, 0.25, 0));
        g.add(box(len - 0.08, 0.4, wid - 0.08, 0xe4f2f8, 0, 0.29, 0));
        g.add(cyl(0.01, 0.01, 0.12, 0xcccccc, -len / 2 + 0.1, 0.56, 0, { seg: 8, metalness: 0.7, roughness: 0.3 }));
        return g;
    }

export function createWardrobe(w, h, d, color) {
        const g = new THREE.Group();
        g.add(box(w, h, d, color, 0, h / 2, 0));
        g.add(box(0.01, h - 0.1, 0.01, 0x2a2a2a, -0.02, h / 2, d / 2 + 0.005));
        g.add(box(0.01, h - 0.1, 0.01, 0x2a2a2a, 0.02, h / 2, d / 2 + 0.005));
        g.add(ball3(0.012, 0xd8c23a, -0.05, h / 2, d / 2 + 0.01, { seg: 8, metalness: 0.6 }));
        g.add(ball3(0.012, 0xd8c23a, 0.05, h / 2, d / 2 + 0.01, { seg: 8, metalness: 0.6 }));
        return g;
    }

export function createDesk(color) {
        const g = new THREE.Group();
        g.add(box(0.75, 0.035, 0.5, color, 0, 0.55, 0));
        [[-0.34, -0.21], [0.34, -0.21], [-0.34, 0.21], [0.34, 0.21]].forEach(([lx, lz]) => {
            g.add(cyl(0.017, 0.017, 0.55, 0x5a3d22, lx, 0.275, lz, { seg: 8 }));
        });
        return g;
    }

export function createCarToy(bodyColor) {
        const g = new THREE.Group();
        g.add(box(0.11, 0.035, 0.05, bodyColor, 0, 0.038, 0));
        g.add(box(0.06, 0.03, 0.048, bodyColor, 0.005, 0.062, 0));
        g.add(box(0.045, 0.022, 0.044, 0xbfe8ff, 0.005, 0.062, 0));
        [[-0.035, -0.026], [0.035, -0.026], [-0.035, 0.026], [0.035, 0.026]].forEach(([wx, wz]) => {
            g.add(cyl(0.016, 0.016, 0.012, 0x222222, wx, 0.018, wz, { seg: 12, rotX: Math.PI / 2 }));
        });
        return g;
    }
