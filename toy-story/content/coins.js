import * as THREE from '../vendor/three.module.min.js';
import { FLOOR2_Y } from '../data/house-plan.js';
import { playCoin } from '../gameplay/audio.js';

// 10 Münzen über beide Etagen verteilt. Die meisten liegen an offenen Stellen
// abseits von Möbeln; drei (`climb`) schweben auf der Oberseite eines
// erklimmbaren Möbelstücks (siehe topY-Werte der jeweiligen addObstacle-
// Aufrufe in den content/*.js-Dateien) — die Münze wird erst eingesammelt,
// wenn die Spielfigur tatsächlich dort oben steht (Höhenprüfung in update()).
const COIN_SPOTS = [
    { x: -4.5, z: 0.3, floor: 0, climb: 0.4 },    // Wohnzimmer, auf dem Lesesessel
    { x: 3.2, z: -1.3, floor: 0 },   // Küche
    { x: 0, z: -3.0, floor: 0 },     // Flur/Hauseingang
    { x: -2.0, z: -1.0, floor: 0 },  // Wohnzimmer, Leseecke
    { x: 2.3, z: 1.6, floor: 0 },    // Toilette
    { x: -4.3, z: -1.7, floor: 1 },  // Elternschlafzimmer
    { x: -2.6, z: 1.5, floor: 1, climb: 0.57 },   // Kinderzimmer 1, auf dem Schreibtisch
    { x: 2.0, z: -1.2, floor: 1 },   // Bad
    { x: 2.05, z: 3.5, floor: 1, climb: 0.41 },   // Kinderzimmer 2, auf der Spielzeugkiste
    { x: 0, z: 2.0, floor: 1 },      // Treppenabsatz/Landing
];
const COIN_RADIUS = 0.05;
const PICKUP_DIST = 0.16;
// Toleranz für die Höhenprüfung beim Einsammeln — reicht für das normale
// Auf-und-Ab beim Laufen, verhindert aber, dass eine "climb"-Münze vom Boden
// aus erreichbar ist (dafür muss man tatsächlich auf dem Möbelstück stehen).
const PICKUP_HEIGHT_TOL = 0.14;
// Münzscheibe bleibt rund (hohe Segmentzahl); nur der Rand wirkt facettiert
// (niedrige Segmentzahl beim schmaleren Rim-Ring).
const COIN_SEGMENTS = 24;
const RIM_SEGMENTS = 7;

// Kleine Funken-Explosion beim Einsammeln: ein paar helle Splitter fliegen
// nach außen/oben weg, fallen unter Schwerkraft und schrumpfen dann weg.
// Geometrie UND Material sind geteilte Singletons (nicht pro Funke neu
// erzeugt) — ein neues Material pro Einsammel-Event zwingt den Browser,
// beim nächsten Frame ein zusätzliches Shader-Programm zu kompilieren, was
// auf manchen Geräten spürbar (bis zu ~1s) ruckelt.
const sparkGeo = new THREE.TetrahedronGeometry(0.014);
const sparkMat = new THREE.MeshStandardMaterial({ color: 0xffe27a, emissive: 0xffcf4d, emissiveIntensity: 1.4, roughness: 0.3, metalness: 0.4 });
function spawnSparks(world, x, y, z) {
    const sparks = [];
    const n = 14;
    for (let i = 0; i < n; i++) {
        const mesh = new THREE.Mesh(sparkGeo, sparkMat);
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
        // Facettierter Rand statt rundem Torus: ein schmalerer, niedrig-
        // segmentierter Ring direkt hinter der runden Münzscheibe — die
        // Scheibe selbst bleibt rund, nur die Kante wirkt eckig.
        const rim = new THREE.Mesh(
            new THREE.CylinderGeometry(COIN_RADIUS * 1.1, COIN_RADIUS * 1.1, 0.006, RIM_SEGMENTS),
            new THREE.MeshStandardMaterial({ color: 0xffe6a8, metalness: 0.8, roughness: 0.15, emissive: 0xd9930a, emissiveIntensity: 0.4 })
        );
        rim.rotation.x = Math.PI / 2;
        g.add(rim);
        // Dezentes Leuchten: kleines, kurz reichweitiges warmes Licht. Bleibt
        // beim Einsammeln immer im Szenengraph UND sichtbar (nur intensity
        // geht auf 0) — ein Licht komplett zu entfernen/verstecken ändert die
        // Anzahl aktiver Lichter, was Three.js zwingt, die Shader ALLER
        // Materialien in der Szene neu zu kompilieren (der Freeze-Bug).
        const glow = new THREE.PointLight(0xffd98a, 0.3, 0.55, 2);
        glow.castShadow = false;
        g.add(glow);
        const climbY = spot.climb ?? 0;
        const baseY = spot.floor * FLOOR2_Y + (spot.climb != null ? spot.climb + 0.1 : 0.22);
        g.position.set(spot.x, baseY, spot.z);
        world.add(g);
        return { group: g, mesh: coinMesh, rim, glow, x: spot.x, z: spot.z, floor: spot.floor, baseY, climbY, collected: false, bobSeed: i * 1.7 };
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
            if (Math.abs(playerState.y - coin.climbY) > PICKUP_HEIGHT_TOL) continue;
            const dx = playerState.x - coin.x, dz = playerState.z - coin.z;
            if (Math.hypot(dx, dz) < PICKUP_DIST) {
                coin.collected = true;
                // group.visible bleibt true, damit das Punktlicht im
                // Szenengraph gezählt bleibt (siehe Kommentar oben) — nur die
                // sichtbare Münze wird ausgeblendet und das Licht gedimmt.
                coin.mesh.visible = false;
                coin.rim.visible = false;
                coin.glow.intensity = 0;
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
                for (const s of expired) world.remove(s.mesh);
                activeSparks = activeSparks.filter((s) => s.age < s.life);
            }
        }
    }

    return { coins, update };
}
