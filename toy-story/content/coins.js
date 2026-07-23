import * as THREE from '../vendor/three.module.min.js';
import { FLOOR2_Y } from '../data/house-plan.js';
import { playCoin } from '../gameplay/audio.js';

// 10 Münzen über beide Etagen verteilt, an offenen Stellen abseits von Möbeln.
const COIN_SPOTS = [
    { x: -4.0, z: 0.0, floor: 0 },   // Wohnzimmer
    { x: 3.2, z: -1.3, floor: 0 },   // Küche
    { x: 0, z: -3.0, floor: 0 },     // Flur/Hauseingang
    { x: -2.0, z: -1.0, floor: 0 },  // Wohnzimmer, Leseecke
    { x: 2.3, z: 1.6, floor: 0 },    // Toilette
    { x: -4.3, z: -1.7, floor: 1 },  // Elternschlafzimmer
    { x: -3.0, z: 3.5, floor: 1 },   // Kinderzimmer 1
    { x: 2.0, z: -1.2, floor: 1 },   // Bad
    { x: 3.5, z: 0.8, floor: 1 },    // Kinderzimmer 2
    { x: 0, z: 2.0, floor: 1 },      // Treppenabsatz/Landing
];
const COIN_RADIUS = 0.05;
const PICKUP_DIST = 0.16;
const COIN_SEGMENTS = 6; // facettiert (Sechseck-Prisma) statt runder Kanten

// Kleine Funken-Explosion beim Einsammeln: ein paar helle Splitter fliegen
// nach außen/oben weg, fallen unter Schwerkraft und schrumpfen dann weg.
const sparkGeo = new THREE.TetrahedronGeometry(0.014);
function spawnSparks(world, x, y, z) {
    const sparks = [];
    const n = 14;
    for (let i = 0; i < n; i++) {
        const mesh = new THREE.Mesh(
            sparkGeo,
            new THREE.MeshStandardMaterial({ color: 0xffe27a, emissive: 0xffcf4d, emissiveIntensity: 1.4, roughness: 0.3, metalness: 0.4 })
        );
        mesh.position.set(x, y, z);
        world.add(mesh);
        const angle = (i / n) * Math.PI * 2 + Math.random() * 0.4;
        const speed = 0.5 + Math.random() * 0.6;
        sparks.push({
            mesh,
            vx: Math.cos(angle) * speed,
            vz: Math.sin(angle) * speed,
            vy: 0.5 + Math.random() * 0.6,
            age: 0,
            life: 0.4 + Math.random() * 0.25,
        });
    }
    return sparks;
}

// Schwebende, rotierende, leicht leuchtende Sammel-Münzen + HUD-Counter +
// Funkenspray beim Einsammeln. Reine Deko/Bonus-Mechanik, kein Einfluss auf
// Bewegung/Kollision — reagiert nur auf die Position der Spielfigur.
export function placeCoins(world) {
    const coins = COIN_SPOTS.map((spot, i) => {
        const g = new THREE.Group();
        const coinMat = new THREE.MeshStandardMaterial({
            color: 0xffd166, metalness: 0.7, roughness: 0.2,
            emissive: 0xd9930a, emissiveIntensity: 0.55,
        });
        const coinMesh = new THREE.Mesh(new THREE.CylinderGeometry(COIN_RADIUS, COIN_RADIUS, 0.012, COIN_SEGMENTS), coinMat);
        // Cylinder-Achse steht standardmäßig entlang Y (Deckel horizontal) —
        // um 90° gekippt zeigen die flachen Seiten nach vorn/hinten, wie eine
        // aufrecht stehende Münze; die Gruppe rotiert um Y für den Spin-Effekt.
        coinMesh.rotation.x = Math.PI / 2;
        coinMesh.castShadow = true;
        g.add(coinMesh);
        // Facettierter Rand statt rundem Torus: ein etwas breiterer, dünnerer
        // Sechseck-Prisma-„Ring" direkt hinter der Münze.
        const rim = new THREE.Mesh(
            new THREE.CylinderGeometry(COIN_RADIUS * 1.18, COIN_RADIUS * 1.18, 0.006, COIN_SEGMENTS),
            new THREE.MeshStandardMaterial({ color: 0xffe6a8, metalness: 0.8, roughness: 0.15, emissive: 0xd9930a, emissiveIntensity: 0.4 })
        );
        rim.rotation.x = Math.PI / 2;
        g.add(rim);
        // Dezentes Leuchten: kleines, kurz reichweitiges warmes Licht.
        const glow = new THREE.PointLight(0xffd98a, 0.3, 0.55, 2);
        glow.castShadow = false;
        g.add(glow);
        const baseY = spot.floor * FLOOR2_Y + 0.22;
        g.position.set(spot.x, baseY, spot.z);
        world.add(g);
        return { group: g, glow, x: spot.x, z: spot.z, floor: spot.floor, baseY, collected: false, bobSeed: i * 1.7 };
    });

    let collected = 0;
    const counterEl = document.getElementById('coin-count');
    let activeSparks = [];
    const SPARK_GRAVITY = -2.2;

    function update(dt, elapsedTime, playerState) {
        for (const coin of coins) {
            if (coin.collected) continue;
            coin.group.rotation.y += dt * 2.2;
            coin.group.position.y = coin.baseY + Math.sin(elapsedTime * 1.6 + coin.bobSeed) * 0.05;
            if (playerState.floor !== coin.floor) continue;
            const dx = playerState.x - coin.x, dz = playerState.z - coin.z;
            if (Math.hypot(dx, dz) < PICKUP_DIST) {
                coin.collected = true;
                coin.group.visible = false;
                coin.glow.visible = false;
                collected++;
                if (counterEl) counterEl.textContent = String(collected);
                playCoin();
                activeSparks.push(...spawnSparks(world, coin.group.position.x, coin.group.position.y, coin.group.position.z));
            }
        }

        if (activeSparks.length) {
            for (const s of activeSparks) {
                s.age += dt;
                s.vy += SPARK_GRAVITY * dt;
                s.mesh.position.x += s.vx * dt;
                s.mesh.position.y += s.vy * dt;
                s.mesh.position.z += s.vz * dt;
                s.mesh.rotation.x += dt * 6;
                s.mesh.rotation.y += dt * 5;
                const t = Math.max(0, 1 - s.age / s.life);
                s.mesh.scale.setScalar(t);
            }
            const expired = activeSparks.filter((s) => s.age >= s.life);
            if (expired.length) {
                for (const s of expired) { world.remove(s.mesh); s.mesh.material.dispose(); }
                activeSparks = activeSparks.filter((s) => s.age < s.life);
            }
        }
    }

    return { coins, update };
}
