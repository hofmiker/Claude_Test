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

// Schwebende, rotierende Sammel-Münzen + HUD-Counter. Reine Deko/Bonus-
// Mechanik, kein Einfluss auf Bewegung/Kollision — reagiert nur auf die
// Position der Spielfigur.
export function placeCoins(world) {
    const coins = COIN_SPOTS.map((spot, i) => {
        const g = new THREE.Group();
        const coinMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(COIN_RADIUS, COIN_RADIUS, 0.012, 22),
            new THREE.MeshStandardMaterial({ color: 0xffd166, metalness: 0.75, roughness: 0.25, emissive: 0x5a3d05, emissiveIntensity: 0.15 })
        );
        // Cylinder-Achse steht standardmäßig entlang Y (Deckel horizontal) —
        // um 90° gekippt zeigen die flachen Seiten nach vorn/hinten, wie eine
        // aufrecht stehende Münze; die Gruppe rotiert um Y für den Spin-Effekt.
        coinMesh.rotation.x = Math.PI / 2;
        coinMesh.castShadow = true;
        g.add(coinMesh);
        const rim = new THREE.Mesh(
            new THREE.TorusGeometry(COIN_RADIUS, 0.006, 8, 22),
            new THREE.MeshStandardMaterial({ color: 0xffe6a8, metalness: 0.8, roughness: 0.2 })
        );
        g.add(rim);
        const baseY = spot.floor * FLOOR2_Y + 0.22;
        g.position.set(spot.x, baseY, spot.z);
        world.add(g);
        return { group: g, x: spot.x, z: spot.z, floor: spot.floor, baseY, collected: false, bobSeed: i * 1.7 };
    });

    let collected = 0;
    const counterEl = document.getElementById('coin-count');

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
                collected++;
                if (counterEl) counterEl.textContent = String(collected);
                playCoin();
            }
        }
    }

    return { coins, update };
}
