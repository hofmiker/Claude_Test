/* Spielzeug-Abenteuer
 * Eine 10 cm kleine Spielfigur läuft durch ein zweistöckiges Einfamilienhaus
 * (Erdgeschoss: Wohnzimmer, Küche, Toilette, Hauseingang; Dachgeschoss mit
 * Dachschrägen: Elternschlafzimmer, 2 Kinderzimmer, Bad). 1 Welteinheit = 1 Meter.
 * Steuerung: W/S bzw. Pfeil hoch/runter = vor/zurück, A/D bzw. Pfeil links/
 * rechts = drehen, Leertaste = hüpfen (auch mit Vor-/Rückwärtsschwung).
 *
 * Entry point: verdrahtet den Gebäudeplan (build/house-builder.js, liest
 * data/house-plan.js), die Zimmer-Möblierung (content/*.js) und die
 * Gameplay-Logik (gameplay/*.js) miteinander und treibt die rAF-Loop.
 */
import * as THREE from './vendor/three.module.min.js';
import { buildHouse } from './build/house-builder.js';
import { placeGroundFloor } from './content/ground-floor.js';
import { placeElternschlafzimmer } from './content/elternschlafzimmer.js';
import { placeKinderzimmer1 } from './content/kinderzimmer1.js';
import { placeBad } from './content/bad.js';
import { placeKinderzimmer2 } from './content/kinderzimmer2.js';
import { placeExterior } from './content/exterior.js';
import { createCat } from './gameplay/cat.js';
import { createPlayer } from './gameplay/player.js';
import { createCameraRig } from './gameplay/camera.js';

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

const world = new THREE.Group();
scene.add(world);
const exterior = new THREE.Group();
scene.add(exterior);

// ---------- Gebäude + Möblierung ----------
const { groundFloors, upperFloors } = buildHouse(world);
const { livingRug } = placeGroundFloor(world);
placeElternschlafzimmer(world);
const { sisterRug } = placeKinderzimmer1(world);
const { badRug } = placeBad(world);
const { kidRug, balls, update: updateKz2 } = placeKinderzimmer2(world);
placeExterior(exterior);

// ---------- Gameplay ----------
const cat = createCat(world);
const player = createPlayer(world);

// Kamera-Blocker: alle world.children außer Böden/Teppichen/Spielfigur/Katze/
// Bällen (Raycast soll an Wänden/Möbeln stoppen, nicht an flachen Bodenflächen).
const excludedFromCamera = new Set([...groundFloors, ...upperFloors, livingRug, kidRug, sisterRug, badRug, player.bodyTilt, cat.group, ...balls.map((b) => b.mesh)]);
const cameraBlockers = world.children.filter((c) => !excludedFromCamera.has(c));
const cameraRig = createCameraRig(camera, cameraBlockers);

const clock = new THREE.Clock();

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);
onResize();

function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    player.update(dt);
    updateKz2(dt, player.state, clock.elapsedTime);
    cat.update(dt, clock.elapsedTime);
    cameraRig.update(dt, player.state);
    renderer.render(scene, camera);
}
clock.start();
loop();

const hint = document.getElementById('hint');
document.getElementById('hint-toggle').addEventListener('click', () => {
    hint.style.display = hint.style.display === 'none' ? 'block' : 'none';
});
