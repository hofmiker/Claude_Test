import * as THREE from '../vendor/three.module.min.js';

// Außenszenerie: durch die Fenster sichtbar, nicht begehbar. Bewusst nicht an
// data/house-plan.js gebunden — zufällig platziert, kein Grundriss-Bezug.
export function placeExterior(exterior) {
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
    const yard = new THREE.Mesh(new THREE.CircleGeometry(30, 32), new THREE.MeshStandardMaterial({ color: 0x5a8f4f, roughness: 1 }));
    yard.rotation.x = -Math.PI / 2;
    yard.position.y = -0.02;
    exterior.add(yard);
}
