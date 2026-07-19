import * as THREE from './vendor/three.module.min.js';
import { DISTRICT, ACTION, MISSION, DIALOGS, POLICE } from './mission.js';

/* ------------------------------------------------------------------ *
 * Vice Grid — a GTA1-inspired top-down city driver in simple 3D.
 * Single-file arcade game: procedural city, drivable car with arcade
 * physics, on-foot mode, traffic, pedestrians, wanted/police system,
 * cash pickups, minimap and HUD. Camera stays world-fixed (no yaw),
 * matching the original top-down GTA look while using real 3D depth.
 * ------------------------------------------------------------------ */

// ---------- Config ----------------------------------------------------
const GRID_COUNT = 7;          // blocks per side
const BLOCK_SIZE = 34;         // block footprint (sidewalk area)
const ROAD_WIDTH = 11;         // gap between blocks
const CELL = BLOCK_SIZE + ROAD_WIDTH;
const CITY_SIZE = GRID_COUNT * CELL;
const CITY_HALF = CITY_SIZE / 2;
const SIDEWALK_MARGIN = 3.2;
const LANE_OFFSET = ROAD_WIDTH * 0.27;

const COLORS = {
  ground: 0x2b2d31,
  road: 0x35373b,
  roadLine: 0xd8c246,
  sidewalk: 0x8d8f92,
  park: 0x3f7d43,
  trunk: 0x5b3a22,
  leaves: 0x2f6b34,
};

const BUILDING_PALETTE = [
  0xb5533c, 0x7a8ba6, 0xc9a24b, 0x8a7ca8, 0x5f9ea0,
  0xa9666b, 0x6b8f71, 0xba8a55, 0x94736b, 0x77869c,
];

const CAR_PALETTE = [0xd64545, 0x3a6bd6, 0xe0c23a, 0x3ab08a, 0xb35fd6, 0xe08a2e, 0x8f8f8f];
const POLICE_COLOR = 0x1c3fbf;

// ---------- Renderer / Scene / Camera ---------------------------------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(DISTRICT.fogColor);
scene.fog = new THREE.Fog(DISTRICT.fogColor, DISTRICT.fogNear, DISTRICT.fogFar);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.5, 900);
// top-down GTA1-style chase cam, separate profile for car vs on-foot
const CAM_HEIGHT = 38;
const CAM_BACK = 9;
const CAM_HEIGHT_FOOT = 22;
const CAM_BACK_FOOT = 6;
// low behind-the-subject 3rd-person alternative
const CAM3_HEIGHT_CAR = 7.2;
const CAM3_BACK_CAR = 12.5;
const CAM3_HEIGHT_FOOT = 3.8;
const CAM3_BACK_FOOT = 6.8;
const camTarget = new THREE.Vector3();
const camPos = new THREE.Vector3(0, CAM_HEIGHT, CAM_BACK);
let camHeading = 0;
camera.position.copy(camPos);

let cameraMode = localStorage.getItem('viceGridCameraMode') || 'top';

// ---------- Lighting ----------------------------------------------------
const isNight = DISTRICT.timeOfDay === 'night';
scene.add(new THREE.HemisphereLight(isNight ? 0x3d5389 : 0xbfd4ff, isNight ? 0x11141c : 0x2b2116, isNight ? 0.85 : 0.65));
const sun = new THREE.DirectionalLight(isNight ? 0x7d97d6 : 0xfff2d6, isNight ? 0.8 : 1.15);
sun.position.set(-60, 110, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -140;
sun.shadow.camera.right = 140;
sun.shadow.camera.top = 140;
sun.shadow.camera.bottom = -140;
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 300;
sun.shadow.bias = -0.0015;
scene.add(sun);
const sunTarget = new THREE.Object3D();
scene.add(sunTarget);
sun.target = sunTarget;

// ---------- Helpers -----------------------------------------------------
function flatMat(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0.02, flatShading: true });
}
// self-lit material for lamps/headlights/beacons so they read as glowing at
// night even without a real light source nearby
function glowMat(color, emissiveIntensity = 1.4) {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity, roughness: 0.6, flatShading: true });
}
function rand(min, max) { return min + Math.random() * (max - min); }
function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// ---------- Crash feedback: sound / screen shake / debris -----------------
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}
window.addEventListener('keydown', ensureAudio, { once: true });
window.addEventListener('touchstart', ensureAudio, { once: true });

function playCrashSound(volume) {
  if (!audioCtx) return;
  const ctx = audioCtx;
  const now = ctx.currentTime;
  const bufferSize = Math.floor(ctx.sampleRate * 0.35);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2400, now);
  filter.frequency.exponentialRampToValueAtTime(250, now + 0.3);
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(volume * 0.9, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  noise.connect(filter).connect(noiseGain).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + 0.36);

  const thump = ctx.createOscillator();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(130, now);
  thump.frequency.exponentialRampToValueAtTime(35, now + 0.2);
  const thumpGain = ctx.createGain();
  thumpGain.gain.setValueAtTime(volume * 0.8, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  thump.connect(thumpGain).connect(ctx.destination);
  thump.start(now);
  thump.stop(now + 0.3);
}

const debris = [];
function spawnDebris(pos, count) {
  for (let i = 0; i < count; i++) {
    const size = rand(0.15, 0.42);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size, size, size),
      flatMat(pick([0x8a8a8a, 0x555555, 0xffcf5c, 0xcc3b2e]))
    );
    mesh.position.set(pos.x, 0.5, pos.z);
    mesh.castShadow = true;
    scene.add(mesh);
    const angle = rand(0, Math.PI * 2);
    const speed = rand(3, 9);
    debris.push({
      mesh,
      vel: new THREE.Vector3(Math.cos(angle) * speed, rand(4, 8), Math.sin(angle) * speed),
      life: rand(0.5, 0.9),
      age: 0,
    });
  }
}
function updateDebris(dt) {
  for (let i = debris.length - 1; i >= 0; i--) {
    const d = debris[i];
    d.age += dt;
    d.vel.y -= 18 * dt;
    d.mesh.position.addScaledVector(d.vel, dt);
    d.mesh.rotation.x += dt * 10;
    d.mesh.rotation.y += dt * 7;
    if (d.mesh.position.y < 0.12) {
      d.mesh.position.y = 0.12;
      d.vel.y *= -0.3;
      d.vel.x *= 0.7;
      d.vel.z *= 0.7;
    }
    const t = d.age / d.life;
    d.mesh.scale.setScalar(Math.max(0.001, 1 - t));
    if (d.age >= d.life) {
      scene.remove(d.mesh);
      debris.splice(i, 1);
    }
  }
}

const sparks = [];
function spawnSparkBurst(pos, count) {
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(rand(0.05, 0.1), 4, 3),
      new THREE.MeshBasicMaterial({ color: pick([0xfff2b0, 0xffcf5c, 0xffffff]) })
    );
    mesh.position.set(pos.x, pos.y ?? 0.5, pos.z);
    scene.add(mesh);
    const angle = rand(0, Math.PI * 2);
    const speed = rand(5, 13);
    sparks.push({
      mesh,
      vel: new THREE.Vector3(Math.cos(angle) * speed, rand(2, 7), Math.sin(angle) * speed),
      life: rand(0.15, 0.3),
      age: 0,
    });
  }
}
function updateSparks(dt) {
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.age += dt;
    s.vel.y -= 14 * dt;
    s.mesh.position.addScaledVector(s.vel, dt);
    const t = s.age / s.life;
    s.mesh.scale.setScalar(Math.max(0.001, 1 - t));
    if (s.age >= s.life) {
      scene.remove(s.mesh);
      sparks.splice(i, 1);
    }
  }
}

let shakeTime = 0;
let shakeMag = 0;
function addShake(intensity) {
  shakeTime = Math.max(shakeTime, 0.15 + intensity * 0.35);
  shakeMag = Math.max(shakeMag, 0.6 + intensity * 2.2);
}

function triggerCrash(pos, impactSpeed, involvesPlayer) {
  const intensity = clamp(impactSpeed / 25, 0.15, 1);
  spawnDebris(pos, Math.round(4 + intensity * 6));
  spawnSparkBurst(pos, Math.round(5 + intensity * 9));
  const focus = player.inCar ? player.inCar.pos : player.pos;
  const distToPlayer = pos.distanceTo(focus);
  const distFactor = clamp(1 - distToPlayer / 50, 0, 1);
  const vol = involvesPlayer ? intensity : intensity * distFactor * 0.5;
  if (vol > 0.02) playCrashSound(vol);
  if (involvesPlayer) addShake(intensity);
}

// each accident makes a car permanently 10% slower and adds a visible dent
// pushes vertices near localPoint inward (toward the panel's own center),
// so the chassis itself crumples instead of bolting extra geometry on top
function dentBodyMesh(bodyMesh, localPoint, strength, radius) {
  const geo = bodyMesh.geometry;
  const posAttr = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < posAttr.count; i++) {
    v.fromBufferAttribute(posAttr, i);
    const dist = v.distanceTo(localPoint);
    if (dist < radius) {
      const falloff = 1 - dist / radius;
      const inward = v.clone().normalize().multiplyScalar(-1);
      v.addScaledVector(inward, strength * falloff * falloff);
      posAttr.setXYZ(i, v.x, v.y, v.z);
    }
  }
  posAttr.needsUpdate = true;
  geo.computeBoundingSphere();
}

// worldDirX/Z: normalized world-space direction from the car's center toward
// whatever it hit, used to figure out which side of the chassis crumples
function applyCarDamage(car, worldDirX = Math.sin(car.heading), worldDirZ = Math.cos(car.heading)) {
  car.damageCount += 1;
  // gentle, floored speed penalty -- a wreck should still be drivable
  car.maxSpeed = car.baseMaxSpeed * Math.max(0.6, Math.pow(0.97, car.damageCount));

  const bodyMesh = car.mesh.userData.bodyMesh;
  const dims = car.mesh.userData.bodyHalfExtents;
  if (bodyMesh && dims) {
    const axes = obbAxes(car.heading);
    const localZ = worldDirX * axes.fx + worldDirZ * axes.fz;
    const localX = worldDirX * axes.rx + worldDirZ * axes.rz;
    const mag = Math.hypot(localX, localZ) || 1;
    const nx = localX / mag, nz = localZ / mag;
    const impactPoint = new THREE.Vector3(
      nx * dims.x * 0.95,
      rand(-dims.y * 0.5, dims.y * 0.6),
      nz * dims.z * 0.95
    );
    // deeper and wider with each subsequent hit -- a heavily-crashed car
    // should read as progressively more wrecked, not just "a bit scuffed"
    const strength = Math.min(0.16 + car.damageCount * 0.05, 0.55);
    const radius = Math.min(dims.x, dims.z) * (0.55 + Math.min(car.damageCount, 6) * 0.06);
    dentBodyMesh(bodyMesh, impactPoint, strength, radius);

    const dirtFactor = clamp(car.damageCount / 8, 0, 0.7);
    bodyMesh.material.color.copy(new THREE.Color(car.bodyColorHex)).lerp(new THREE.Color(0x171310), dirtFactor);
  }
}

// ---------- City generation ---------------------------------------------
const buildingColliders = []; // {minX,maxX,minZ,maxZ}
const roadLines = { x: [], z: [] }; // coordinate of every through-street centerline
const sidewalkCells = []; // block centers that are NOT parks (walkable + car free)
const parkCells = [];
const cityRoot = new THREE.Group();
scene.add(cityRoot);

function blockCenter(i, j) {
  return {
    x: -CITY_HALF + CELL * i + BLOCK_SIZE / 2 + ROAD_WIDTH / 2,
    z: -CITY_HALF + CELL * j + BLOCK_SIZE / 2 + ROAD_WIDTH / 2,
  };
}

function buildGround() {
  const groundSize = CITY_SIZE + ROAD_WIDTH * 6;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(groundSize, groundSize),
    flatMat(COLORS.road)
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  cityRoot.add(ground);

  // road centerline stripes (both axes), thin yellow strips
  for (let k = 0; k <= GRID_COUNT; k++) {
    const coord = -CITY_HALF + CELL * k;
    roadLines.x.push(coord);
    roadLines.z.push(coord);
    const stripeH = new THREE.Mesh(
      new THREE.PlaneGeometry(CITY_SIZE + ROAD_WIDTH, 0.35),
      flatMat(COLORS.roadLine)
    );
    stripeH.rotation.x = -Math.PI / 2;
    stripeH.position.set(0, 0.02, coord);
    cityRoot.add(stripeH);

    const stripeV = new THREE.Mesh(
      new THREE.PlaneGeometry(0.35, CITY_SIZE + ROAD_WIDTH),
      flatMat(COLORS.roadLine)
    );
    stripeV.rotation.x = -Math.PI / 2;
    stripeV.position.set(coord, 0.02, 0);
    cityRoot.add(stripeV);
  }
}

function addTree(x, z) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 2.2, 6), flatMat(COLORS.trunk));
  trunk.position.set(x, 1.1, z);
  trunk.castShadow = true;
  const leaves = new THREE.Mesh(new THREE.DodecahedronGeometry(1.9, 0), flatMat(COLORS.leaves));
  leaves.position.set(x, 3.1, z);
  leaves.castShadow = true;
  cityRoot.add(trunk, leaves);
}

function buildBlock(i, j) {
  const { x, z } = blockCenter(i, j);
  const isPark = Math.random() < 0.22;
  const isPlaza = i === Math.floor(GRID_COUNT / 2) && j === Math.floor(GRID_COUNT / 2);

  const sidewalk = new THREE.Mesh(
    new THREE.PlaneGeometry(BLOCK_SIZE, BLOCK_SIZE),
    flatMat(isPark ? COLORS.park : COLORS.sidewalk)
  );
  sidewalk.rotation.x = -Math.PI / 2;
  sidewalk.position.set(x, 0.01, z);
  sidewalk.receiveShadow = true;
  cityRoot.add(sidewalk);

  if (isPark) {
    parkCells.push({ x, z, half: BLOCK_SIZE / 2 - 1 });
    const treeCount = 5 + ((Math.random() * 5) | 0);
    for (let t = 0; t < treeCount; t++) {
      addTree(x + rand(-BLOCK_SIZE / 2 + 3, BLOCK_SIZE / 2 - 3), z + rand(-BLOCK_SIZE / 2 + 3, BLOCK_SIZE / 2 - 3));
    }
    return;
  }

  if (isPlaza) {
    // keep the very center block open as the spawn plaza
    sidewalkCells.push({ x, z, half: BLOCK_SIZE / 2 - SIDEWALK_MARGIN });
    return;
  }

  const footprint = BLOCK_SIZE - SIDEWALK_MARGIN * 2;
  const height = rand(6, 34) * (Math.random() < 0.18 ? 1.9 : 1);
  const w = footprint * rand(0.72, 1);
  const d = footprint * rand(0.72, 1);
  const color = pick(BUILDING_PALETTE);

  const building = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), flatMat(color));
  building.position.set(x, height / 2, z);
  building.castShadow = true;
  building.receiveShadow = true;
  cityRoot.add(building);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, 0.6, d * 1.02), flatMat(0x1c1c1c));
  roof.position.set(x, height + 0.3, z);
  cityRoot.add(roof);

  buildingColliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  sidewalkCells.push({ x, z, half: footprint / 2 });
}

function createStreetLampMesh() {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 5.6, 6), flatMat(0x2b2b2b));
  pole.position.y = 2.8;
  pole.castShadow = true;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.09, 0.09), flatMat(0x2b2b2b));
  arm.position.set(0.45, 5.5, 0);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), glowMat(0xffdf9b, 1.8));
  bulb.position.set(0.85, 5.32, 0);
  group.add(pole, arm, bulb);
  return group;
}

// sparse subset of intersections so lamp count (and its real point lights)
// stays cheap - dense enough to break up the dark, not one on every corner
function addStreetLamps() {
  if (!isNight) return;
  const stride = 2;
  for (let i = 0; i < roadLines.x.length; i += stride) {
    for (let j = 0; j < roadLines.z.length; j += stride) {
      const x = roadLines.x[i] + ROAD_WIDTH * 0.32;
      const z = roadLines.z[j] + ROAD_WIDTH * 0.32;
      const lamp = createStreetLampMesh();
      lamp.position.set(x, 0, z);
      cityRoot.add(lamp);
      const light = new THREE.PointLight(0xffdf9b, 26, 19, 2);
      light.position.set(x + 0.85, 5.3, z);
      cityRoot.add(light);
    }
  }
}

function buildCity() {
  buildGround();
  for (let i = 0; i < GRID_COUNT; i++) {
    for (let j = 0; j < GRID_COUNT; j++) buildBlock(i, j);
  }
  addStreetLamps();
}
buildCity();

function collideWithBuildings(pos, radius) {
  for (const b of buildingColliders) {
    const cx = clamp(pos.x, b.minX, b.maxX);
    const cz = clamp(pos.z, b.minZ, b.maxZ);
    const dx = pos.x - cx, dz = pos.z - cz;
    const distSq = dx * dx + dz * dz;
    if (distSq < radius * radius) {
      const dist = Math.sqrt(distSq) || 0.001;
      const push = radius - dist;
      pos.x += (dx / dist) * push;
      pos.z += (dz / dist) * push;
      return true;
    }
  }
  const bound = CITY_HALF + ROAD_WIDTH * 1.5;
  pos.x = clamp(pos.x, -bound, bound);
  pos.z = clamp(pos.z, -bound, bound);
  return false;
}

// unlike collideWithBuildings (tuned for agents grazing a building edge from
// outside), this pushes a point out to the NEAREST edge even if it landed
// deep inside the footprint -- needed for random spawn points, since a
// building can occupy most of its block's "sidewalk" cell
function pushClearOfBuildings(pos, clearance) {
  for (const b of buildingColliders) {
    const minX = b.minX - clearance, maxX = b.maxX + clearance;
    const minZ = b.minZ - clearance, maxZ = b.maxZ + clearance;
    if (pos.x <= minX || pos.x >= maxX || pos.z <= minZ || pos.z >= maxZ) continue;
    const distLeft = pos.x - minX;
    const distRight = maxX - pos.x;
    const distTop = pos.z - minZ;
    const distBottom = maxZ - pos.z;
    const minDist = Math.min(distLeft, distRight, distTop, distBottom);
    if (minDist === distLeft) pos.x = minX;
    else if (minDist === distRight) pos.x = maxX;
    else if (minDist === distTop) pos.z = minZ;
    else pos.z = maxZ;
    return true;
  }
  return false;
}

// ---------- Vehicle factory ---------------------------------------------
// Per-type footprint/handling specs. halfW/halfL drive the OBB collision
// shape (so cars only "hit" when they actually touch); wheelR/frontZ/rearZ
// drive mesh construction.
const VEHICLE_SPECS = {
  car: { halfW: 1.075, halfL: 2.15, wheelR: 0.42, maxSpeedMul: 1.0, accelMul: 1.0, mass: 1 },
  bus: { halfW: 1.25, halfL: 4.6, wheelR: 0.5, maxSpeedMul: 0.6, accelMul: 0.45, mass: 2.4 },
  truck: { halfW: 1.2, halfL: 3.7, wheelR: 0.48, maxSpeedMul: 0.68, accelMul: 0.5, mass: 1.9 },
};

function addAxle(group, frontWheels, side, x, y, z, wheelR, isFront) {
  const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, 0.35, 10);
  const wheelMat = flatMat(0x161616);
  if (isFront) {
    const yaw = new THREE.Group();
    yaw.position.set(x * side, y, z);
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.castShadow = true;
    yaw.add(wheel);
    group.add(yaw);
    frontWheels.push(yaw);
  } else {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x * side, y, z);
    wheel.castShadow = true;
    group.add(wheel);
  }
}

function createCarMesh(color, isPolice, type) {
  const spec = VEHICLE_SPECS[type];
  const group = new THREE.Group();
  const frontWheels = [];

  if (type === 'bus') {
    const w = spec.halfW * 2, l = spec.halfL * 2;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, 1.7, l, 3, 3, 10), flatMat(color));
    body.position.y = 1.05;
    body.castShadow = true;
    group.add(body);
    group.userData.bodyMesh = body;
    group.userData.bodyHalfExtents = { x: w / 2, y: 0.85, z: l / 2 };
    const windowBand = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.6, l * 0.88), flatMat(0x1d2a33));
    windowBand.position.set(0, 1.75, 0);
    windowBand.castShadow = true;
    group.add(windowBand);
    const frontZ = spec.halfL - 0.7, rearZ = -spec.halfL + 0.7;
    for (const side of [-1, 1]) {
      addAxle(group, frontWheels, side, w / 2 - 0.05, spec.wheelR, frontZ, spec.wheelR, true);
      addAxle(group, frontWheels, side, w / 2 - 0.05, spec.wheelR, 0, spec.wheelR, false);
      addAxle(group, frontWheels, side, w / 2 - 0.05, spec.wheelR, rearZ, spec.wheelR, false);
    }
    const headlight = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 0.22, 0.08), glowMat(0xfff2b0));
    headlight.position.set(0, 0.55, spec.halfL + 0.02);
    group.add(headlight);
    const taillight = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 0.22, 0.08), glowMat(0xaa2020, 0.8));
    taillight.position.set(0, 0.55, -spec.halfL - 0.02);
    group.add(taillight);
  } else if (type === 'truck') {
    const w = spec.halfW * 2;
    const cabLen = 2.1, cargoLen = spec.halfL * 2 - cabLen - 0.25;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 1.3, cabLen, 3, 3, 3), flatMat(color));
    cab.position.set(0, 1.0, spec.halfL - cabLen / 2);
    cab.castShadow = true;
    group.add(cab);
    group.userData.bodyMesh = cab;
    group.userData.bodyHalfExtents = { x: (w * 0.92) / 2, y: 0.65, z: cabLen / 2 };
    const cargo = new THREE.Mesh(new THREE.BoxGeometry(w, 1.9, cargoLen), flatMat(0xd8d8d8));
    cargo.position.set(0, 1.15, spec.halfL - cabLen - 0.25 - cargoLen / 2);
    cargo.castShadow = true;
    group.add(cargo);
    const frontZ = spec.halfL - 0.6, rearZ = -spec.halfL + 0.9;
    for (const side of [-1, 1]) {
      addAxle(group, frontWheels, side, w / 2 - 0.02, spec.wheelR, frontZ, spec.wheelR, true);
      addAxle(group, frontWheels, side, w / 2 - 0.02, spec.wheelR, rearZ, spec.wheelR, false);
    }
    const headlight = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.2, 0.08), glowMat(0xfff2b0));
    headlight.position.set(0, 0.5, spec.halfL + 0.02);
    group.add(headlight);
    const taillight = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.2, 0.08), glowMat(0xaa2020, 0.8));
    taillight.position.set(0, 0.65, -spec.halfL - 0.02);
    group.add(taillight);
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(spec.halfW * 2, 0.75, spec.halfL * 2, 3, 3, 6), flatMat(color));
    body.position.y = 0.62;
    body.castShadow = true;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.62, 2.1), flatMat(isPolice ? 0xdedede : 0x1d1d1d));
    cabin.position.set(0, 1.16, -0.2);
    cabin.castShadow = true;
    group.add(body, cabin);
    group.userData.bodyMesh = body;
    group.userData.bodyHalfExtents = { x: spec.halfW, y: 0.375, z: spec.halfL };
    for (const side of [-1, 1]) {
      addAxle(group, frontWheels, side, 1.05, spec.wheelR, -1.35, spec.wheelR, false);
      addAxle(group, frontWheels, side, 1.05, spec.wheelR, 1.35, spec.wheelR, true);
    }
    const headlight = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.2, 0.08), glowMat(0xfff2b0));
    headlight.position.set(0, 0.65, 2.16);
    group.add(headlight);
    const taillight = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.2, 0.08), glowMat(0xaa2020, 0.8));
    taillight.position.set(0, 0.65, -2.16);
    group.add(taillight);

    if (isPolice) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.22, 0.5), flatMat(0x222222));
      bar.position.set(0, 1.55, -0.2);
      group.add(bar);
      const redLight = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.42), glowMat(0xff2020, 0.5));
      redLight.position.set(-0.35, 1.62, -0.2);
      const blueLight = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.42), glowMat(0x2050ff, 0.5));
      blueLight.position.set(0.35, 1.62, -0.2);
      group.add(redLight, blueLight);
      group.userData.lights = [redLight, blueLight];
      // real flashing point light so the beacon actually lights up the
      // street at night, not just the beacon mesh itself
      const beaconLight = new THREE.PointLight(0xff2020, 22, 16, 2);
      beaconLight.position.set(0, 1.6, -0.2);
      group.add(beaconLight);
      group.userData.beaconLight = beaconLight;
    }
  }

  group.userData.frontWheels = frontWheels;
  return group;
}

class Car {
  constructor({ color = pick(CAR_PALETTE), isPolice = false, isPlayer = false, type = 'car' } = {}) {
    this.type = type;
    this.mesh = createCarMesh(color, isPolice, type);
    this.isPolice = isPolice;
    this.isPlayer = isPlayer;
    this.pos = new THREE.Vector3();
    this.heading = 0;
    this.speed = 0;
    this.steer = 0;
    this.occupied = isPlayer;
    const spec = VEHICLE_SPECS[type];
    this.halfWidth = spec.halfW;
    this.halfLength = spec.halfL;
    this.radius = spec.halfL;
    this.mass = spec.mass;
    this.shove = new THREE.Vector3();
    this.wheelBase = 2.6;
    this.crashCooldown = 0;
    this.wheelSteer = 0;
    this.damageCount = 0;
    this.bodyColorHex = color;
    const baseMax = isPolice ? 27 : (isPlayer ? 30 : 15);
    const baseAccel = isPolice ? 16 : (isPlayer ? 20 : 8);
    this.baseMaxSpeed = baseMax * spec.maxSpeedMul;
    this.maxSpeed = this.baseMaxSpeed;
    this.accel = baseAccel * spec.accelMul;
    scene.add(this.mesh);
  }

  place(x, z, heading = 0) {
    this.pos.set(x, 0, z);
    this.heading = heading;
    this.syncMesh();
  }

  syncMesh() {
    this.mesh.position.set(this.pos.x, 0, this.pos.z);
    this.mesh.rotation.y = this.heading;
  }

  physicsStep(dt, input) {
    const { throttle, steer, handbrake } = input;
    if (throttle > 0) this.speed += this.accel * dt;
    else if (throttle < 0) this.speed -= this.accel * 0.8 * dt;
    else this.speed -= Math.sign(this.speed) * this.accel * 0.5 * dt;

    if (handbrake) this.speed *= Math.max(0, 1 - dt * 4.5);

    const drag = 1 - dt * 0.35;
    this.speed *= drag;
    this.speed = clamp(this.speed, -this.maxSpeed * 0.45, this.maxSpeed);
    if (Math.abs(this.speed) < 0.04) this.speed = 0;

    // DHL City Drive-style steering: no turning while stationary, turn rate
    // scales with current speed, direction flips in reverse.
    let steerTgt = 0;
    if (Math.abs(this.speed) > 0.15) {
      const speedFactor = clamp(Math.abs(this.speed) / this.maxSpeed, 0.25, 1);
      const sdir = this.speed >= 0 ? 1 : -1;
      const turnRate = steer * 2.1 * speedFactor * sdir;
      this.heading += turnRate * dt * (handbrake ? 1.6 : 1);
      steerTgt = steer * 0.5;
    }
    this.wheelSteer = lerp(this.wheelSteer, steerTgt, Math.min(1, dt * 8));
    if (this.mesh.userData.frontWheels) {
      for (const w of this.mesh.userData.frontWheels) w.rotation.y = this.wheelSteer;
    }

    const dir = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    this.pos.addScaledVector(dir, this.speed * dt);
    // decaying knockback offset from collisions, lets cars slide/get shoved
    // sideways even though their own drive motion is heading-locked
    this.pos.addScaledVector(this.shove, dt);
    this.shove.multiplyScalar(Math.max(0, 1 - dt * 3.2));
    const preImpactSpeed = this.speed;
    const hitWall = collideWithBuildings(this.pos, this.radius);
    if (hitWall && Math.abs(preImpactSpeed) > 4) {
      if (this.crashCooldown <= 0) {
        triggerCrash(this.pos, Math.abs(preImpactSpeed), this === player.inCar);
        const impactSign = Math.sign(preImpactSpeed) || 1;
        applyCarDamage(this, dir.x * impactSign, dir.z * impactSign);
        this.crashCooldown = 0.35;
      }
      this.speed *= 0.12;
    }
    this.syncMesh();
  }
}

// oriented-box axes for a car at the given heading (forward = local +Z, matches
// the sin/cos heading convention used everywhere else)
function obbAxes(heading) {
  return {
    fx: Math.sin(heading), fz: Math.cos(heading),
    rx: Math.cos(heading), rz: -Math.sin(heading),
  };
}
function obbProjection(axes, halfW, halfL, axisX, axisZ) {
  const fDot = axes.fx * axisX + axes.fz * axisZ;
  const rDot = axes.rx * axisX + axes.rz * axisZ;
  return halfL * Math.abs(fDot) + halfW * Math.abs(rDot);
}

// proper oriented-rectangle (SAT) collision so vehicles only collide once
// their bodies actually touch, instead of an oversized circular radius
function resolveCarCollision(a, b) {
  const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
  const broad = a.halfLength + b.halfLength;
  if (dx * dx + dz * dz > broad * broad) return;

  const axesA = obbAxes(a.heading);
  const axesB = obbAxes(b.heading);
  const testAxes = [
    [axesA.fx, axesA.fz], [axesA.rx, axesA.rz],
    [axesB.fx, axesB.fz], [axesB.rx, axesB.rz],
  ];

  let minOverlap = Infinity, minAx = 0, minAz = 0;
  for (const [ax, az] of testAxes) {
    const centerDist = Math.abs(dx * ax + dz * az);
    const projA = obbProjection(axesA, a.halfWidth, a.halfLength, ax, az);
    const projB = obbProjection(axesB, b.halfWidth, b.halfLength, ax, az);
    const overlap = projA + projB - centerDist;
    if (overlap <= 0) return; // separating axis found -> boxes don't touch
    if (overlap < minOverlap) { minOverlap = overlap; minAx = ax; minAz = az; }
  }

  let nx = minAx, nz = minAz;
  if (dx * nx + dz * nz < 0) { nx = -nx; nz = -nz; }
  // push apart along the normal only, so cars slide/separate instead of
  // grinding along whichever axis they happen to be driving
  a.pos.x -= nx * minOverlap * 0.5;
  a.pos.z -= nz * minOverlap * 0.5;
  b.pos.x += nx * minOverlap * 0.5;
  b.pos.z += nz * minOverlap * 0.5;

  // world-space velocities from each car's own heading-locked scalar speed
  const vax = Math.sin(a.heading) * a.speed, vaz = Math.cos(a.heading) * a.speed;
  const vbx = Math.sin(b.heading) * b.speed, vbz = Math.cos(b.heading) * b.speed;
  const impactSpeed = Math.abs(a.speed) + Math.abs(b.speed);
  const relVelN = (vax - vbx) * nx + (vaz - vbz) * nz;

  if (relVelN > 0) {
    // mass-weighted impulse along the normal only (tangential motion is left
    // untouched, which is what lets the cars slide past each other)
    const restitution = 0.3;
    const invMassSum = 1 / a.mass + 1 / b.mass;
    const impulse = ((1 + restitution) * relVelN) / invMassSum;
    const ix = impulse * nx, iz = impulse * nz;
    a.shove.x -= ix / a.mass;
    a.shove.z -= iz / a.mass;
    b.shove.x += ix / b.mass;
    b.shove.z += iz / b.mass;

    // a broadside hit barely slows the struck car's own forward drive (it
    // gets shoved sideways instead); a head-on hit bleeds real speed off
    const aAlign = Math.abs(Math.sin(a.heading) * nx + Math.cos(a.heading) * nz);
    const bAlign = Math.abs(Math.sin(b.heading) * nx + Math.cos(b.heading) * nz);
    a.speed *= 1 - 0.55 * aAlign;
    b.speed *= 1 - 0.55 * bAlign;
  }
  a.syncMesh();
  b.syncMesh();

  if (impactSpeed > 3 && a.crashCooldown <= 0 && b.crashCooldown <= 0) {
    const mid = new THREE.Vector3((a.pos.x + b.pos.x) / 2, 0.4, (a.pos.z + b.pos.z) / 2);
    const involvesPlayer = a === player.inCar || b === player.inCar;
    triggerCrash(mid, impactSpeed, involvesPlayer);
    applyCarDamage(a, nx, nz);
    applyCarDamage(b, -nx, -nz);
    a.crashCooldown = 0.35;
    b.crashCooldown = 0.35;
  }
}

function updateCarCollisions(dt) {
  const cars = [playerCar, ...trafficCars, ...policeCars, ...chaseCops];
  if (player.inCar && !cars.includes(player.inCar)) cars.push(player.inCar);
  for (const car of cars) car.crashCooldown = Math.max(0, car.crashCooldown - dt);
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      resolveCarCollision(cars[i], cars[j]);
    }
  }
}

// ---------- Pedestrian factory -------------------------------------------
function createPedMesh() {
  const group = new THREE.Group();
  const shirtColor = pick([0xd6553f, 0x3f7dd6, 0xd6c53f, 0x8a52c9, 0xe0e0e0, 0x3fae7a]);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.7, 3, 6), flatMat(shirtColor));
  body.position.y = 0.85;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), flatMat(0xe8b98a));
  head.position.y = 1.55;
  head.castShadow = true;
  group.add(body, head);
  return group;
}

class Pedestrian {
  constructor(cell) {
    this.cell = cell;
    this.mesh = createPedMesh();
    this.pos = new THREE.Vector3(cell.x + rand(-cell.half, cell.half), 0, cell.z + rand(-cell.half, cell.half));
    pushClearOfBuildings(this.pos, 1.2);
    this.target = this.pos.clone();
    this.speed = rand(1.4, 2.6);
    this.alive = true;
    this.pickNewTarget();
    scene.add(this.mesh);
    this.syncMesh();
  }
  pickNewTarget() {
    this.target.set(
      this.cell.x + rand(-this.cell.half, this.cell.half),
      0,
      this.cell.z + rand(-this.cell.half, this.cell.half)
    );
    pushClearOfBuildings(this.target, 1.2);
    this.waitTimer = rand(0.5, 2.5);
  }
  syncMesh() {
    this.mesh.position.set(this.pos.x, 0, this.pos.z);
  }
  update(dt) {
    if (!this.alive) return;
    const toTarget = new THREE.Vector3().subVectors(this.target, this.pos);
    const dist = toTarget.length();
    if (dist < 0.4) {
      if (this.waitTimer > 0) { this.waitTimer -= dt; return; }
      this.pickNewTarget();
      return;
    }
    toTarget.normalize();
    this.pos.addScaledVector(toTarget, this.speed * dt);
    this.mesh.rotation.y = Math.atan2(toTarget.x, toTarget.z);
    this.syncMesh();
  }
  kill() {
    this.alive = false;
    this.mesh.rotation.z = Math.PI / 2;
    this.mesh.position.y = 0.25;
  }
}

const pedestrians = [];
function spawnPedestrians() {
  const cells = sidewalkCells.length ? sidewalkCells : parkCells;
  const total = Math.min(26, cells.length * 2);
  for (let i = 0; i < total; i++) {
    pedestrians.push(new Pedestrian(pick(cells)));
  }
}
spawnPedestrians();

// ---------- Traffic -------------------------------------------------------
const trafficCars = [];
function pickVehicleType() {
  const r = Math.random();
  if (r < 0.12) return 'bus';
  if (r < 0.24) return 'truck';
  return 'car';
}

function spawnTraffic() {
  const count = 14;
  for (let i = 0; i < count; i++) {
    const type = pickVehicleType();
    const car = new Car({ color: pick(CAR_PALETTE), type });
    const horizontal = Math.random() < 0.5;
    const lineCoord = pick(horizontal ? roadLines.z : roadLines.x);
    const dir = Math.random() < 0.5 ? 1 : -1;
    const travelCoord = rand(-CITY_HALF, CITY_HALF);
    if (horizontal) {
      car.place(travelCoord, lineCoord + LANE_OFFSET * dir, dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    } else {
      car.place(lineCoord + LANE_OFFSET * dir, travelCoord, dir > 0 ? 0 : Math.PI);
    }
    car.horizontal = horizontal;
    car.dir = dir;
    car.lineCoord = lineCoord;
    car.speed = car.maxSpeed * rand(0.5, 0.85);
    trafficCars.push(car);
  }
}
spawnTraffic();

// straight-line lane driving shared by ambient traffic and patrolling police
function stepLaneCar(car, dt) {
  const dir = new THREE.Vector3(Math.sin(car.heading), 0, Math.cos(car.heading));
  car.pos.addScaledVector(dir, car.speed * dt);
  if (car.horizontal) {
    if (car.pos.x > CITY_HALF + ROAD_WIDTH) car.pos.x = -CITY_HALF - ROAD_WIDTH;
    if (car.pos.x < -CITY_HALF - ROAD_WIDTH) car.pos.x = CITY_HALF + ROAD_WIDTH;
  } else {
    if (car.pos.z > CITY_HALF + ROAD_WIDTH) car.pos.z = -CITY_HALF - ROAD_WIDTH;
    if (car.pos.z < -CITY_HALF - ROAD_WIDTH) car.pos.z = CITY_HALF + ROAD_WIDTH;
  }
  car.syncMesh();
}

function updateTraffic(dt) {
  for (const car of trafficCars) stepLaneCar(car, dt);
}

// ---------- Player character (on-foot, ported from dhl-city/character.html) -
const CHAR_BASE_Y = 0.10;
const CHAR_GRAVITY = -22;
const CHAR_JUMP_VEL = 8.2;
const CHAR_WINDUP_DUR = 0.17;
const CHAR_LAND_DUR = 0.28;
const CHAR_SPEED_MAX = 5.94;
const CHAR_ACCEL_RATE = 14.0;
const CHAR_DECEL_RATE = 18.0;
const CHAR_TURN_RATE = 2.6;

function charCyl(rT, rB, h, color, segs = 6) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rT, rB, h, segs), flatMat(color));
  m.castShadow = true;
  return m;
}
function charIco(r, color) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), flatMat(color));
  m.castShadow = true;
  return m;
}
function charBone(parent, px, py, pz, rT, rB, h, color) {
  const j = new THREE.Group();
  j.position.set(px, py, pz);
  parent.add(j);
  const b = charCyl(rT, rB, h, color);
  b.position.y = -h / 2;
  j.add(b);
  return j;
}

function createPlayerMesh(palette) {
  const PC = { skin: 0xF0BC94, shirt: 0x1E88E5, pants: 0x37474F, shoes: 0x1A1A1A, hair: 0x3E2723, ...palette };
  const charRoot = new THREE.Group();

  const torso = new THREE.Group();
  torso.position.y = 1.26;
  charRoot.add(torso);
  torso.add(charCyl(0.21, 0.26, 0.62, PC.shirt));

  const neckJoint = charBone(torso, 0, 0.40, 0, 0.080, 0.088, 0.13, PC.skin);
  const headJoint = new THREE.Group();
  headJoint.position.y = 0.19;
  neckJoint.add(headJoint);

  const skull = charIco(0.16, PC.skin);
  skull.scale.set(0.97, 1.17, 0.97);
  headJoint.add(skull);

  const jaw = charIco(0.11, PC.skin);
  jaw.scale.set(0.85, 0.50, 0.80);
  jaw.position.set(0, -0.09, 0.02);
  headJoint.add(jaw);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.028, 5, 4), flatMat(PC.skin));
  nose.position.set(0, 0.0, 0.155);
  headJoint.add(nose);

  function makeEar(side) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.038, 5, 4), flatMat(PC.skin));
    e.scale.set(0.45, 0.75, 0.30);
    e.position.set(side * 0.162, 0.01, -0.02);
    return e;
  }
  headJoint.add(makeEar(-1));
  headJoint.add(makeEar(1));

  const hTop = charIco(0.162, PC.hair);
  hTop.scale.set(0.92, 0.36, 0.96); hTop.position.set(0, 0.140, -0.010); headJoint.add(hTop);
  const hBack = charIco(0.150, PC.hair);
  hBack.scale.set(0.96, 0.82, 0.62); hBack.position.set(0, 0.022, -0.108); headJoint.add(hBack);
  const hNeck = charIco(0.096, PC.hair);
  hNeck.scale.set(0.84, 0.58, 0.70); hNeck.position.set(0, -0.068, -0.098); headJoint.add(hNeck);
  const hSideL = charIco(0.100, PC.hair);
  hSideL.scale.set(0.54, 0.72, 0.76); hSideL.position.set(-0.124, 0.042, -0.054); headJoint.add(hSideL);
  const hSideR = hSideL.clone(); hSideR.position.x = 0.124; headJoint.add(hSideR);

  function makeEye(side) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.024, 5, 4), flatMat(0x1A0F08));
    e.scale.set(1.2, 0.9, 0.6); e.position.set(side * 0.067, 0.030, 0.148); return e;
  }
  function makeBrow(side) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.013, 0.012), flatMat(0x2C1810));
    b.position.set(side * 0.067, 0.066, 0.148); b.rotation.z = side * 0.18; return b;
  }
  headJoint.add(makeEye(-1)); headJoint.add(makeEye(1));
  headJoint.add(makeBrow(-1)); headJoint.add(makeBrow(1));
  const mouthM = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.016, 0.012), flatMat(0x7A2E1E));
  mouthM.position.set(0, -0.056, 0.148); headJoint.add(mouthM);

  function makeHand(elbowJoint) {
    const g = new THREE.Group(); g.position.y = -0.27; elbowJoint.add(g);
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.068, 6, 5), flatMat(PC.skin));
    m.scale.set(1.0, 0.62, 0.92); m.castShadow = true; g.add(m);
  }
  function makeShoulderCap(shoulderJoint) {
    const cap = charIco(0.085, PC.shirt);
    cap.scale.set(1.05, 0.90, 1.05); shoulderJoint.add(cap);
  }

  const lShoulder = charBone(torso, -0.24, 0.22, 0, 0.071, 0.062, 0.30, PC.shirt);
  makeShoulderCap(lShoulder);
  const lElbow = charBone(lShoulder, 0, -0.30, 0, 0.062, 0.052, 0.27, PC.skin);
  makeHand(lElbow);

  const rShoulder = charBone(torso, 0.24, 0.22, 0, 0.071, 0.062, 0.30, PC.shirt);
  makeShoulderCap(rShoulder);
  const rElbow = charBone(rShoulder, 0, -0.30, 0, 0.062, 0.052, 0.27, PC.skin);
  makeHand(rElbow);

  const hipsGrp = new THREE.Group();
  hipsGrp.position.y = -0.34;
  torso.add(hipsGrp);
  hipsGrp.add(charCyl(0.23, 0.21, 0.19, PC.pants));

  const lHip = charBone(hipsGrp, -0.13, -0.095, 0, 0.10, 0.088, 0.38, PC.pants);
  const lKnee = charBone(lHip, 0, -0.38, 0, 0.088, 0.075, 0.35, PC.pants);
  const lAnkle = charBone(lKnee, 0, -0.35, 0, 0.075, 0.065, 0.12, PC.pants);
  const lFootG = new THREE.Group(); lFootG.position.y = -0.12; lAnkle.add(lFootG);
  const lFootM = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.075, 0.22), flatMat(PC.shoes));
  lFootM.position.set(0, -0.038, 0.07); lFootM.castShadow = true; lFootG.add(lFootM);

  const rHip = charBone(hipsGrp, 0.13, -0.095, 0, 0.10, 0.088, 0.38, PC.pants);
  const rKnee = charBone(rHip, 0, -0.38, 0, 0.088, 0.075, 0.35, PC.pants);
  const rAnkle = charBone(rKnee, 0, -0.35, 0, 0.075, 0.065, 0.12, PC.pants);
  const rFootG = new THREE.Group(); rFootG.position.y = -0.12; rAnkle.add(rFootG);
  const rFootM = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.075, 0.22), flatMat(PC.shoes));
  rFootM.position.set(0, -0.038, 0.07); rFootM.castShadow = true; rFootG.add(rFootM);

  charRoot.userData = { torso, headJoint, lShoulder, rShoulder, lElbow, rElbow, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle };
  return charRoot;
}

function animateCharacter(p, dt, input) {
  const j = p.mesh.userData;
  const moving = (input.up || input.down) && p.jumpState === 'none';
  if (moving) p.animT += dt * 9.5;
  const s = Math.sin(p.animT);
  const eff = moving ? 1 : 0;
  const lLeg = s * 0.68, rLeg = -s * 0.68;

  const anyInput = input.up || input.down || input.left || input.right;
  if (anyInput) p.idleTimer = 0; else p.idleTimer += dt;
  const doScratch = p.idleTimer >= 5.0 && p.jumpState === 'none' && !moving;
  if (doScratch) {
    p.scratchPhase += dt * 2.0;
    const cyc = p.scratchPhase % (Math.PI * 2);
    const reach = Math.sin(cyc * 0.5) * Math.max(0, Math.sin(cyc * 0.5));
    const wiggle = reach > 0.55 ? Math.sin(p.scratchPhase * 7) * 0.09 : 0;
    j.rShoulder.rotation.x = lerp(j.rShoulder.rotation.x, -1.85 * reach, 0.14);
    j.rShoulder.rotation.z = lerp(j.rShoulder.rotation.z, -0.80 * reach, 0.14);
    j.rElbow.rotation.x = lerp(j.rElbow.rotation.x, -1.60 * reach + wiggle, 0.14);
    j.headJoint.rotation.z = lerp(j.headJoint.rotation.z, wiggle * 0.18, 0.12);
  } else {
    p.scratchPhase = 0;
  }

  const headYawTgt = input.left ? 0.38 : (input.right ? -0.38 : 0);
  j.headJoint.rotation.y = lerp(j.headJoint.rotation.y, headYawTgt, 0.06);

  if (p.jumpState === 'windup') {
    const t = Math.min(p.jumpTimer / CHAR_WINDUP_DUR, 1.0);
    const sq = Math.sin(t * Math.PI * 0.5);
    j.lHip.rotation.x = lerp(j.lHip.rotation.x, 0.52 * sq, 0.32);
    j.rHip.rotation.x = lerp(j.rHip.rotation.x, 0.52 * sq, 0.32);
    j.lKnee.rotation.x = lerp(j.lKnee.rotation.x, 0.78 * sq, 0.32);
    j.rKnee.rotation.x = lerp(j.rKnee.rotation.x, 0.78 * sq, 0.32);
    j.lAnkle.rotation.x = lerp(j.lAnkle.rotation.x, 0.20 * sq, 0.32);
    j.rAnkle.rotation.x = lerp(j.rAnkle.rotation.x, 0.20 * sq, 0.32);
    j.lShoulder.rotation.x = lerp(j.lShoulder.rotation.x, 0.32 * sq, 0.25);
    j.rShoulder.rotation.x = lerp(j.rShoulder.rotation.x, 0.32 * sq, 0.25);
    j.lElbow.rotation.x = lerp(j.lElbow.rotation.x, -0.55, 0.22);
    j.rElbow.rotation.x = lerp(j.rElbow.rotation.x, -0.55, 0.22);
    j.lShoulder.rotation.z = lerp(j.lShoulder.rotation.z, -0.10, 0.08);
    j.rShoulder.rotation.z = lerp(j.rShoulder.rotation.z, 0.10, 0.08);
    j.torso.position.y = lerp(j.torso.position.y, 1.26 - 0.14 * sq, 0.32);
    j.torso.rotation.x = lerp(j.torso.rotation.x, -0.20 * sq, 0.25);
    j.torso.rotation.y = 0;
    j.headJoint.rotation.x = lerp(j.headJoint.rotation.x, 0.10 * sq, 0.20);
  } else if (p.jumpState === 'air') {
    j.lHip.rotation.x = lerp(j.lHip.rotation.x, -0.70, 0.17);
    j.rHip.rotation.x = lerp(j.rHip.rotation.x, -0.70, 0.17);
    j.lKnee.rotation.x = lerp(j.lKnee.rotation.x, 1.45, 0.17);
    j.rKnee.rotation.x = lerp(j.rKnee.rotation.x, 1.45, 0.17);
    j.lAnkle.rotation.x = lerp(j.lAnkle.rotation.x, -0.45, 0.17);
    j.rAnkle.rotation.x = lerp(j.rAnkle.rotation.x, -0.45, 0.17);
    j.lShoulder.rotation.x = lerp(j.lShoulder.rotation.x, -0.52, 0.14);
    j.rShoulder.rotation.x = lerp(j.rShoulder.rotation.x, -0.52, 0.14);
    j.lShoulder.rotation.z = lerp(j.lShoulder.rotation.z, -0.48, 0.10);
    j.rShoulder.rotation.z = lerp(j.rShoulder.rotation.z, 0.48, 0.10);
    j.lElbow.rotation.x = lerp(j.lElbow.rotation.x, -0.95, 0.15);
    j.rElbow.rotation.x = lerp(j.rElbow.rotation.x, -0.95, 0.15);
    j.torso.position.y = lerp(j.torso.position.y, 1.26, 0.15);
    j.torso.rotation.x = lerp(j.torso.rotation.x, 0.0, 0.10);
    j.torso.rotation.y = 0;
    j.headJoint.rotation.x = lerp(j.headJoint.rotation.x, 0.32, 0.14);
  } else if (p.jumpState === 'land') {
    const t = Math.min(p.jumpTimer / CHAR_LAND_DUR, 1.0);
    const sq = 1.0 - t;
    j.lHip.rotation.x = lerp(j.lHip.rotation.x, 0.72 * sq, 0.32);
    j.rHip.rotation.x = lerp(j.rHip.rotation.x, 0.72 * sq, 0.32);
    j.lKnee.rotation.x = lerp(j.lKnee.rotation.x, 1.10 * sq, 0.32);
    j.rKnee.rotation.x = lerp(j.rKnee.rotation.x, 1.10 * sq, 0.32);
    j.lAnkle.rotation.x = lerp(j.lAnkle.rotation.x, 0.22 * sq, 0.32);
    j.rAnkle.rotation.x = lerp(j.rAnkle.rotation.x, 0.22 * sq, 0.32);
    j.lShoulder.rotation.x = lerp(j.lShoulder.rotation.x, 0.22 * sq, 0.25);
    j.rShoulder.rotation.x = lerp(j.rShoulder.rotation.x, 0.22 * sq, 0.25);
    j.lShoulder.rotation.z = lerp(j.lShoulder.rotation.z, -0.09, 0.08);
    j.rShoulder.rotation.z = lerp(j.rShoulder.rotation.z, 0.09, 0.08);
    j.lElbow.rotation.x = lerp(j.lElbow.rotation.x, -0.55 * sq - 0.12, 0.25);
    j.rElbow.rotation.x = lerp(j.rElbow.rotation.x, -0.55 * sq - 0.12, 0.25);
    j.torso.position.y = lerp(j.torso.position.y, 1.26 - 0.22 * sq, 0.32);
    j.torso.rotation.x = lerp(j.torso.rotation.x, 0.0, 0.10);
    j.torso.rotation.y = 0;
    j.headJoint.rotation.x = lerp(j.headJoint.rotation.x, 0.0, 0.15);
  } else {
    if (!doScratch) {
      j.rShoulder.rotation.x = lerp(j.rShoulder.rotation.x, -rLeg * 0.68 * eff, 0.30);
      j.rShoulder.rotation.z = lerp(j.rShoulder.rotation.z, 0.09, 0.08);
      j.rElbow.rotation.x = lerp(j.rElbow.rotation.x, moving ? -1.22 : -0.12, 0.20);
    }
    const t = 0.30;
    j.lHip.rotation.x = lerp(j.lHip.rotation.x, lLeg * 0.88 * eff, t);
    j.rHip.rotation.x = lerp(j.rHip.rotation.x, rLeg * 0.88 * eff, t);
    const lKT = (Math.max(0, lLeg) * 1.00 + Math.max(0, -lLeg) * 0.70) * eff;
    const rKT = (Math.max(0, rLeg) * 1.00 + Math.max(0, -rLeg) * 0.70) * eff;
    j.lKnee.rotation.x = lerp(j.lKnee.rotation.x, lKT, t);
    j.rKnee.rotation.x = lerp(j.rKnee.rotation.x, rKT, t);
    j.lAnkle.rotation.x = lerp(j.lAnkle.rotation.x, -lLeg * 0.38 * eff, t);
    j.rAnkle.rotation.x = lerp(j.rAnkle.rotation.x, -rLeg * 0.38 * eff, t);
    j.lShoulder.rotation.x = lerp(j.lShoulder.rotation.x, -lLeg * 0.68 * eff, t);
    j.lShoulder.rotation.z = lerp(j.lShoulder.rotation.z, -0.09, 0.08);
    j.lElbow.rotation.x = lerp(j.lElbow.rotation.x, moving ? -1.22 : -0.12, 0.20);
    j.torso.rotation.y = lerp(j.torso.rotation.y, s * 0.13 * eff, 0.18);
    j.torso.rotation.x = lerp(j.torso.rotation.x, moving ? -0.10 : 0.0, 0.07);
    j.torso.rotation.z = lerp(j.torso.rotation.z, Math.cos(p.animT) * 0.042 * eff, 0.20);
    j.torso.position.y = lerp(j.torso.position.y, 1.26 + (moving ? Math.abs(s) * 0.14 : 0), 0.28);
    j.headJoint.rotation.x = lerp(j.headJoint.rotation.x, moving ? Math.abs(s) * (-0.07) : 0, 0.18);
    if (!doScratch) j.headJoint.rotation.z = lerp(j.headJoint.rotation.z, 0, 0.10);
  }
}

const player = {
  mesh: createPlayerMesh(),
  pos: new THREE.Vector3(0, 0, 6),
  heading: 0,
  speed: 0,
  moveSpeed: 0,
  inCar: null,
  health: 100,
  money: 0,
  animT: 0,
  idleTimer: 0,
  scratchPhase: 0,
  jumpState: 'none',
  jumpTimer: 0,
  velY: 0,
  onGround: true,
  jumpBuf: false,
};
scene.add(player.mesh);
player.mesh.position.copy(player.pos);

// spawn the player's own car in the plaza
const playerCar = new Car({ color: 0xe0e0e0, isPlayer: true });
playerCar.place(4, 2, Math.PI);
player.inCar = playerCar;
playerCar.occupied = true;
player.mesh.visible = false;

// real forward-facing headlight beam, only on the player's own car (kept to
// one instance for performance; other cars just glow via their headlight mesh)
if (isNight) {
  const headSpot = new THREE.SpotLight(0xfff2b0, 35, 32, Math.PI / 7, 0.55, 1.3);
  headSpot.position.set(0, 0.65, 2.2);
  const headSpotTarget = new THREE.Object3D();
  headSpotTarget.position.set(0, 0, 12);
  playerCar.mesh.add(headSpot, headSpotTarget);
  headSpot.target = headSpotTarget;
}

// ---------- Ambient police: pure background flavor, patrol forever --------
// (the actual manhunt is a separate system below, driven by mission.js/POLICE)
const POLICE_PATROL_COUNT = 5;
const policeCars = [];

function spawnPolicePatrol() {
  for (let i = 0; i < POLICE_PATROL_COUNT; i++) {
    const car = new Car({ isPolice: true });
    const horizontal = Math.random() < 0.5;
    const lineCoord = pick(horizontal ? roadLines.z : roadLines.x);
    const dir = Math.random() < 0.5 ? 1 : -1;
    const travelCoord = rand(-CITY_HALF, CITY_HALF);
    if (horizontal) {
      car.place(travelCoord, lineCoord + LANE_OFFSET * dir, dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    } else {
      car.place(lineCoord + LANE_OFFSET * dir, travelCoord, dir > 0 ? 0 : Math.PI);
    }
    car.horizontal = horizontal;
    car.dir = dir;
    car.lineCoord = lineCoord;
    car.speed = car.maxSpeed * rand(0.5, 0.8);
    policeCars.push(car);
  }
}
spawnPolicePatrol();

function updatePolice(dt) {
  for (const car of policeCars) stepLaneCar(car, dt);
}

// ---------- Manhunt: dedicated chase units driven by mission.js POLICE -----
const chaseCops = [];
const policeState = { active: false, safeTimer: 0, lastRampTime: 0 };

function spawnChaseCop() {
  if (chaseCops.length >= POLICE.units.max) return;
  const focus = player.inCar ? player.inCar.pos : player.pos;
  const angle = rand(0, Math.PI * 2);
  const dist = rand(POLICE.ai.sightRadius * 0.7, POLICE.ai.sightRadius * 1.2);
  const px = clamp(focus.x + Math.sin(angle) * dist, -CITY_HALF, CITY_HALF);
  const pz = clamp(focus.z + Math.cos(angle) * dist, -CITY_HALF, CITY_HALF);
  const car = new Car({ isPolice: true });
  car.place(px, pz, angle);
  car.siren = Math.random() * Math.PI * 2;
  chaseCops.push(car);
  scene.add(car.mesh);
}

function startPolice() {
  policeState.active = true;
  policeState.safeTimer = 0;
  policeState.lastRampTime = elapsed;
  for (let i = 0; i < POLICE.units.initial; i++) spawnChaseCop();
}

function stopPolice() {
  policeState.active = false;
  for (const car of chaseCops) scene.remove(car.mesh);
  chaseCops.length = 0;
}

function updatePoliceChase(dt) {
  if (!policeState.active) return;
  const focus = player.inCar ? player.inCar.pos : player.pos;
  const playerMax = (player.inCar ? player.inCar.maxSpeed : playerCar.maxSpeed) || playerCar.baseMaxSpeed;

  if (elapsed - policeState.lastRampTime >= POLICE.units.rampEverySeconds && chaseCops.length < POLICE.units.max) {
    spawnChaseCop();
    policeState.lastRampTime = elapsed;
  }

  let anyInSight = false;
  for (const car of chaseCops) {
    const toPlayer = new THREE.Vector3().subVectors(focus, car.pos);
    const dist = toPlayer.length();
    if (dist < POLICE.ai.sightRadius) anyInSight = true;

    car.maxSpeed = playerMax * POLICE.ai.speed;
    const desiredHeading = Math.atan2(toPlayer.x, toPlayer.z);
    const diff = wrapAngle(desiredHeading - car.heading);
    const steer = clamp(diff * 1.4, -1, 1);
    const throttle = dist > 6 ? 1 : 0.15;
    car.physicsStep(dt, { throttle, steer, handbrake: false });

    car.siren += dt * 6;
    if (car.mesh.userData.lights) {
      const on = Math.sin(car.siren) > 0;
      car.mesh.userData.lights[0].material.emissiveIntensity = on ? 2.4 : 0.15;
      car.mesh.userData.lights[1].material.emissiveIntensity = !on ? 2.4 : 0.15;
      const beacon = car.mesh.userData.beaconLight;
      if (beacon) {
        beacon.color.set(on ? 0xff2020 : 0x2050ff);
        beacon.intensity = 24;
      }
    }

    if (POLICE.bust.onCollision && dist < 3.2 && !missionState.gameOver) {
      failMission();
      return;
    }
  }

  if (anyInSight) {
    policeState.safeTimer = 0;
  } else {
    policeState.safeTimer += dt;
    if (policeState.safeTimer >= POLICE.escape.outOfSightSeconds) stopPolice();
  }
}

// ---------- Cash pickups --------------------------------------------------
const pickups = [];
function createPickupMesh() {
  const group = new THREE.Group();
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.18, 12), flatMat(0xffd23f));
  coin.rotation.x = Math.PI / 2;
  coin.castShadow = true;
  group.add(coin);
  return group;
}
function spawnPickup() {
  const cells = sidewalkCells.length ? sidewalkCells : parkCells;
  const cell = pick(cells);
  const mesh = createPickupMesh();
  const pos = new THREE.Vector3(cell.x + rand(-cell.half, cell.half), 0.9, cell.z + rand(-cell.half, cell.half));
  // clearance must exceed the largest vehicle's own collision radius (buses
  // are ~4.6), otherwise the coin sits in the dead zone no car can enter
  pushClearOfBuildings(pos, 5);
  mesh.position.copy(pos);
  scene.add(mesh);
  pickups.push({ mesh, pos, value: 50 + ((Math.random() * 4) | 0) * 25 });
}
for (let i = 0; i < 12; i++) spawnPickup();

function updatePickups(dt, t) {
  const focus = player.inCar ? player.inCar.pos : player.pos;
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    p.mesh.rotation.y = t * 2;
    p.mesh.position.y = 0.9 + Math.sin(t * 3 + i) * 0.15;
    const dx = p.pos.x - focus.x, dz = p.pos.z - focus.z;
    if (dx * dx + dz * dz < 9) {
      scene.remove(p.mesh);
      pickups.splice(i, 1);
      player.money += p.value;
      spawnPickup();
    }
  }
}

// ---------- Story mission (driven entirely by mission.js) ------------------
function createBeaconMesh(color) {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.14, 8, 20), flatMat(color));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.1;
  ring.userData.baseY = 0.1;
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 6, 8, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
  );
  beam.position.y = 3;
  group.add(ring, beam);
  group.userData.ring = ring;
  return group;
}

function createBriefcaseMesh(color) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.32), flatMat(0x2a2018));
  body.position.y = 0.42;
  body.userData.baseY = 0.42;
  body.castShadow = true;
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.035, 6, 12, Math.PI),
    flatMat(0x1a1410)
  );
  handle.rotation.z = Math.PI;
  handle.position.set(0, 0.78, 0);
  const glow = new THREE.PointLight(color, 1.1, 6);
  glow.position.y = 0.6;
  group.add(body, handle, glow);
  group.userData.ring = body;
  return group;
}

// mission.js gives world points as plain [x,z] placeholders; the city layout
// is regenerated (random buildings) on every load, so we resolve each point
// at activation time by nudging it clear of whatever building ended up there
function resolveWorldPoint([x, z]) {
  const v = new THREE.Vector3(x, 0, z);
  pushClearOfBuildings(v, 4);
  const bound = CITY_HALF + ROAD_WIDTH * 1.2;
  v.x = clamp(v.x, -bound, bound);
  v.z = clamp(v.z, -bound, bound);
  return v;
}

const missionState = {
  stepIndex: -1,
  step: null,
  targetPos: null,
  targetLabel: null,
  targetAction: null,
  triggerRadius: 0,
  markerMesh: null,
  autoTriggered: false,
  inRange: false,
  distance: 0,
  inDialog: false,
  dialogLines: null,
  dialogLineIndex: 0,
  dialogOnDone: null,
  gameOver: false,
};

// people the story mentions are actually standing where the story happens -
// keyed by step id since mission.js's own shape stays untouched
const NPC_BY_STEP = {
  FIND_CONTACT: { palette: { shirt: 0xb0405f, pants: 0x2b2116, hair: 0x241a14 }, offset: [1.7, -0.4] },
  GRAB_ITEM: { palette: { shirt: 0x3a3a3a, pants: 0x1c1c1c, hair: 0x100c0a }, offset: [-1.3, -0.9] },
};

function clearMissionMarker() {
  if (missionState.markerMesh) {
    scene.remove(missionState.markerMesh);
    missionState.markerMesh = null;
  }
  if (missionState.npcMesh) {
    scene.remove(missionState.npcMesh);
    missionState.npcMesh = null;
  }
}

function activateStep(index) {
  if (index >= MISSION.steps.length) return;
  clearMissionMarker();
  const step = MISSION.steps[index];
  missionState.stepIndex = index;
  missionState.step = step;
  missionState.autoTriggered = false;
  missionState.inRange = false;

  const wp = step.waypoint || step.pickup;
  if (wp) {
    const pos = resolveWorldPoint(wp.pos);
    missionState.targetPos = pos;
    missionState.targetLabel = wp.label;
    missionState.triggerRadius = step.triggerRadius || 6;
    missionState.targetAction = step.pickup ? step.pickup.action : step.action;
    const colorHex = new THREE.Color(step.waypoint ? step.waypoint.color : '#ffcc00').getHex();
    const mesh = step.pickup ? createBriefcaseMesh(colorHex) : createBeaconMesh(colorHex);
    mesh.position.copy(pos);
    scene.add(mesh);
    missionState.markerMesh = mesh;

    const npcCfg = NPC_BY_STEP[step.id];
    if (npcCfg) {
      const npc = createPlayerMesh(npcCfg.palette);
      const [ox, oz] = npcCfg.offset;
      npc.position.set(pos.x + ox, 0, pos.z + oz);
      npc.rotation.y = Math.atan2(-ox, -oz);
      scene.add(npc);
      missionState.npcMesh = npc;
    }
  } else {
    missionState.targetPos = null;
    missionState.targetLabel = null;
    missionState.targetAction = step.action || null;
    missionState.triggerRadius = 0;
  }

  // steps with no world target (nothing to walk/drive up to) resolve as soon
  // as they become active: play their dialog immediately, or just chain on
  if (!step.waypoint && !step.pickup) {
    if (step.dialog) startDialog(step.dialog, () => runStepOnComplete(step));
    else runStepOnComplete(step);
  }
}

function advanceStep() {
  activateStep(missionState.stepIndex + 1);
}

function runStepOnComplete(step) {
  const oc = step.onComplete;
  if (oc === 'startPolice') {
    advanceStep();
    startPolice();
  } else if (oc === 'win') {
    winMission();
  } else {
    // "activateWaypoint", or no onComplete at all -> just move on
    advanceStep();
  }
}

// F / context button: only fires when the active step actually has an
// in-range action; falls back to the normal vehicle enter/exit otherwise
function triggerContextAction() {
  const step = missionState.step;
  if (!step || missionState.gameOver || !missionState.inRange || !missionState.targetAction) return false;

  if (step.pickup) {
    clearMissionMarker();
    missionState.targetPos = null;
  }
  if (step.dialog) startDialog(step.dialog, () => runStepOnComplete(step));
  else runStepOnComplete(step);
  return true;
}

function startDialog(key, onDone) {
  const lines = DIALOGS[key]?.lines;
  if (!lines || !lines.length) { if (onDone) onDone(); return; }
  missionState.inDialog = true;
  missionState.dialogLines = lines;
  missionState.dialogLineIndex = 0;
  missionState.dialogOnDone = onDone;
  showDialogLine();
}

function advanceDialogLine() {
  missionState.dialogLineIndex++;
  if (missionState.dialogLineIndex >= missionState.dialogLines.length) {
    dialogBox.classList.remove('show');
    missionState.inDialog = false;
    const onDone = missionState.dialogOnDone;
    missionState.dialogOnDone = null;
    if (onDone) onDone();
    return;
  }
  showDialogLine();
}

function updateMission(dt) {
  if (missionState.markerMesh) {
    missionState.markerMesh.rotation.y += dt * 2;
    const ring = missionState.markerMesh.userData.ring;
    ring.position.y = ring.userData.baseY + Math.sin(elapsed * 3) * 0.05;
  }
  if (missionState.gameOver || missionState.inDialog || !missionState.targetPos) {
    missionState.inRange = false;
    return;
  }
  const step = missionState.step;
  const focus = player.inCar ? player.inCar.pos : player.pos;
  const dx = missionState.targetPos.x - focus.x, dz = missionState.targetPos.z - focus.z;
  const distSq = dx * dx + dz * dz;
  missionState.distance = Math.sqrt(distSq);
  missionState.inRange = distSq < missionState.triggerRadius * missionState.triggerRadius;

  // reaching any mission target auto-resolves the step - no button press
  // needed. Pickups get a little spark burst as pickup confirmation.
  if (missionState.inRange && !missionState.autoTriggered) {
    missionState.autoTriggered = true;
    if (step.pickup) {
      spawnSparkBurst(missionState.targetPos, 16);
      clearMissionMarker();
      missionState.targetPos = null;
    }
    if (step.dialog) startDialog(step.dialog, () => runStepOnComplete(step));
    else runStepOnComplete(step);
  }
}

function startMission() {
  activateStep(0);
}

// ---------- Input -----------------------------------------------------
// F / context button: dialog "Weiter" first, then an in-range mission
// action, and only otherwise the plain vehicle enter/exit
function handleActionButton() {
  if (missionState.inDialog) { advanceDialogLine(); return; }
  if (missionState.gameOver) return;
  if (missionState.inRange && missionState.targetAction && triggerContextAction()) return;
  tryToggleVehicle();
}

const keys = new Set();
window.addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code === 'KeyF') handleActionButton();
  if (e.code === 'Space' && !player.inCar) player.jumpBuf = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));

const mobileState = { left: false, right: false, gas: false, brake: false };
function bindHold(id, key) {
  const el = document.getElementById(id);
  if (!el) return;
  const set = (v) => (mobileState[key] = v);
  el.addEventListener('touchstart', (e) => { e.preventDefault(); set(true); }, { passive: false });
  el.addEventListener('touchend', (e) => { e.preventDefault(); set(false); }, { passive: false });
  el.addEventListener('mousedown', () => set(true));
  el.addEventListener('mouseup', () => set(false));
}
bindHold('btnLeft', 'left');
bindHold('btnRight', 'right');
bindHold('btnGas', 'gas');
bindHold('btnBrake', 'brake');
const btnActionEl = document.getElementById('btnAction');
btnActionEl?.addEventListener('touchstart', (e) => { e.preventDefault(); handleActionButton(); });
btnActionEl?.addEventListener('click', handleActionButton);
function triggerJump() { if (!player.inCar) player.jumpBuf = true; }
document.getElementById('btnJump')?.addEventListener('touchstart', (e) => { e.preventDefault(); triggerJump(); });
document.getElementById('btnJump')?.addEventListener('click', triggerJump);

// ---------- Settings: camera mode + buttons-visible, tucked into a gear menu
let buttonsVisible = localStorage.getItem('viceGridButtonsVisible') !== 'false';
const buttonsToggleBtn = document.getElementById('btnButtonsToggle');
function applyButtonsVisible() {
  document.body.classList.toggle('buttons-hidden', !buttonsVisible);
  if (buttonsToggleBtn) buttonsToggleBtn.textContent = buttonsVisible ? '👆 Tasten aus' : '🕹️ Tasten ein';
}
function toggleButtonsVisible() {
  buttonsVisible = !buttonsVisible;
  localStorage.setItem('viceGridButtonsVisible', String(buttonsVisible));
  applyButtonsVisible();
}
buttonsToggleBtn?.addEventListener('click', toggleButtonsVisible);
applyButtonsVisible();

const cameraToggleBtn = document.getElementById('btnCameraToggle');
function applyCameraMode() {
  if (cameraToggleBtn) cameraToggleBtn.textContent = cameraMode === 'top' ? '🎥 Kamera: Oben' : '🎥 Kamera: 3rd Person';
}
function toggleCameraMode() {
  cameraMode = cameraMode === 'top' ? 'third' : 'top';
  localStorage.setItem('viceGridCameraMode', cameraMode);
  applyCameraMode();
}
cameraToggleBtn?.addEventListener('click', toggleCameraMode);
window.addEventListener('keydown', (e) => { if (e.code === 'KeyC') toggleCameraMode(); });
applyCameraMode();

const settingsBtn = document.getElementById('btnSettings');
const settingsMenu = document.getElementById('settingsMenu');
settingsBtn?.addEventListener('click', () => settingsMenu.classList.toggle('show'));
document.addEventListener('click', (e) => {
  if (!settingsMenu.classList.contains('show')) return;
  if (e.target.closest('#settingsMenu, #btnSettings')) return;
  settingsMenu.classList.remove('show');
});

// drag steering is analog (proportional to swipe distance) rather than a
// hard boolean flip at a tiny deadzone - a boolean flip meant any stray
// finger drift instantly demanded full-lock steering, which felt far too
// twitchy compared to tapping a discrete on-screen button
const dragState = { up: false, down: false, steerAxis: 0 };
let dragOrigin = null;
const DRAG_DEADZONE = 14;
const DRAG_STEER_RANGE = 110;
const appEl = document.getElementById('app');
appEl.addEventListener('touchstart', (e) => {
  if (e.target.closest('.mbtn, #btnSettings, #settingsMenu, #dialogBox, #endOverlay')) return;
  const t = e.touches[0];
  dragOrigin = { x: t.clientX, y: t.clientY };
}, { passive: true });
appEl.addEventListener('touchmove', (e) => {
  if (!dragOrigin) return;
  const t = e.touches[0];
  const dx = t.clientX - dragOrigin.x, dy = t.clientY - dragOrigin.y;
  dragState.up = dy < -DRAG_DEADZONE;
  dragState.down = dy > DRAG_DEADZONE;
  let steerAxis = 0;
  if (Math.abs(dx) > DRAG_DEADZONE) {
    const past = dx - Math.sign(dx) * DRAG_DEADZONE;
    steerAxis = clamp(-past / DRAG_STEER_RANGE, -1, 1);
  }
  dragState.steerAxis = steerAxis;
  e.preventDefault();
}, { passive: false });
appEl.addEventListener('touchend', () => {
  dragOrigin = null;
  dragState.up = dragState.down = false;
  dragState.steerAxis = 0;
});

function readInput() {
  const up = keys.has('KeyW') || keys.has('ArrowUp') || mobileState.gas || dragState.up;
  const down = keys.has('KeyS') || keys.has('ArrowDown') || mobileState.brake || dragState.down;
  const leftKey = keys.has('KeyA') || keys.has('ArrowLeft') || mobileState.left;
  const rightKey = keys.has('KeyD') || keys.has('ArrowRight') || mobileState.right;
  const keySteer = (leftKey ? 1 : 0) - (rightKey ? 1 : 0);
  const steer = keySteer !== 0 ? keySteer : dragState.steerAxis;
  const handbrake = keys.has('Space');
  return {
    throttle: up ? 1 : (down ? -1 : 0),
    steer,
    handbrake,
    up, down, left: steer > 0.08, right: steer < -0.08,
  };
}

function tryToggleVehicle() {
  if (missionState.gameOver) return;
  if (player.inCar) {
    // exit
    const car = player.inCar;
    car.occupied = false;
    const exitDir = new THREE.Vector3(Math.cos(car.heading), 0, -Math.sin(car.heading));
    player.pos.copy(car.pos).addScaledVector(exitDir, 2.6);
    player.heading = car.heading;
    player.mesh.visible = true;
    player.inCar = null;
    if (car !== playerCar && car.horizontal !== undefined) trafficCars.push(car);
    showSub('Zu Fuß unterwegs');
  } else {
    // find nearest free car within range
    let nearest = null, nearestDist = 6.5;
    for (const car of [...trafficCars]) {
      const d = car.pos.distanceTo(player.pos);
      if (d < nearestDist) { nearest = car; nearestDist = d; }
    }
    if (playerCar.pos.distanceTo(player.pos) < nearestDist && !playerCar.occupied) {
      nearest = playerCar;
    }
    if (nearest) {
      if (nearest !== playerCar) {
        const idx = trafficCars.indexOf(nearest);
        if (idx >= 0) trafficCars.splice(idx, 1);
      }
      nearest.occupied = true;
      player.inCar = nearest;
      player.mesh.visible = false;
      showSub('Eingestiegen');
    }
  }
}

// ---------- Mission win / fail / restart -----------------------------------
function winMission() {
  if (missionState.gameOver) return;
  missionState.gameOver = true;
  stopPolice();
  clearMissionMarker();
  player.money += MISSION.reward;
  showEndOverlay(MISSION.win.title, MISSION.win.subtitle, MISSION.win.restartLabel, true);
}

function failMission() {
  if (missionState.gameOver) return;
  missionState.gameOver = true;
  stopPolice();
  showEndOverlay(MISSION.fail.title, MISSION.fail.subtitle, MISSION.fail.restartLabel, false);
}

function respawnAtStart() {
  if (player.inCar) player.inCar.occupied = false;
  player.health = 100;
  player.mesh.visible = false;
  player.pos.set(4, 0, 2);
  player.heading = Math.PI;
  player.moveSpeed = 0;
  player.velY = 0;
  player.onGround = true;
  player.jumpState = 'none';
  player.jumpBuf = false;
  playerCar.place(4, 2, Math.PI);
  playerCar.occupied = true;
  player.inCar = playerCar;
}

function restartMission() {
  endOverlay.classList.remove('show');
  missionState.gameOver = false;
  missionState.inDialog = false;
  dialogBox.classList.remove('show');
  clearMissionMarker();
  stopPolice();
  respawnAtStart();
  startMission();
}

// ---------- HUD -----------------------------------------------------------
const moneyEl = document.getElementById('moneyDisplay');
const speedEl = document.getElementById('speed');
const gearEl = document.getElementById('gear');
const subMsg = document.getElementById('subMsg');
const controlsHint = document.getElementById('controlsHint');
const objectiveTextEl = document.getElementById('objectiveText');
const objectiveDistanceEl = document.getElementById('objectiveDistance');
const wantedBanner = document.getElementById('wantedBanner');
const dialogBox = document.getElementById('dialogBox');
const dialogSpeakerEl = document.getElementById('dialogSpeaker');
const dialogTextEl = document.getElementById('dialogText');
const dialogNextBtn = document.getElementById('dialogNextBtn');
const endOverlay = document.getElementById('endOverlay');
const endTitleEl = document.getElementById('endTitle');
const endSubtitleEl = document.getElementById('endSubtitle');
const endRestartBtn = document.getElementById('endRestartBtn');

let subTimer = 0;
function showSub(text) {
  subMsg.textContent = text;
  subMsg.classList.add('show');
  subTimer = 2.2;
}

function showDialogLine() {
  const line = missionState.dialogLines[missionState.dialogLineIndex];
  dialogSpeakerEl.textContent = line.speaker || '';
  dialogTextEl.textContent = line.text;
  dialogBox.classList.add('show');
}
dialogNextBtn.addEventListener('click', advanceDialogLine);

function showEndOverlay(title, subtitle, restartLabel, isWin) {
  endTitleEl.textContent = title;
  endSubtitleEl.textContent = subtitle;
  endRestartBtn.textContent = restartLabel;
  endOverlay.classList.toggle('win', isWin);
  endOverlay.classList.toggle('fail', !isWin);
  endOverlay.classList.add('show');
}
endRestartBtn.addEventListener('click', restartMission);

function updateHud(dt) {
  moneyEl.textContent = '$' + player.money;

  const activeSpeed = player.inCar ? player.inCar.speed : player.speed;
  speedEl.textContent = Math.round(Math.abs(activeSpeed) * 9);
  gearEl.textContent = player.inCar ? (activeSpeed < -0.1 ? 'R' : 'D') : 'ZU FUSS';

  if (subTimer > 0) {
    subTimer -= dt;
    if (subTimer <= 0) subMsg.classList.remove('show');
  }

  const step = missionState.step;
  objectiveTextEl.textContent = step ? (step.objective || '') : '';
  objectiveDistanceEl.textContent = (step && missionState.targetPos)
    ? `${Math.round(missionState.distance)} m — ${missionState.targetLabel || ''}`
    : '';

  wantedBanner.classList.toggle('show', policeState.active);
  if (policeState.active) wantedBanner.textContent = POLICE.hud.wantedLabel;

  if (btnActionEl) {
    btnActionEl.textContent = (missionState.inRange && missionState.targetAction)
      ? missionState.targetAction
      : 'F';
  }

  controlsHint.style.opacity = (missionState.inDialog || elapsed > 9) ? '0' : '1';
}

// ---------- Minimap ---------------------------------------------------
const minimapCanvas = document.getElementById('minimap');
const mmCtx = minimapCanvas.getContext('2d');
function resizeMinimap() {
  const size = 168 * (window.devicePixelRatio || 1);
  minimapCanvas.width = size;
  minimapCanvas.height = size;
}
resizeMinimap();

function drawMinimap() {
  const w = minimapCanvas.width, h = minimapCanvas.height;
  mmCtx.clearRect(0, 0, w, h);
  mmCtx.fillStyle = '#1c1e21';
  mmCtx.fillRect(0, 0, w, h);

  const range = 90; // world units visible radius
  const scale = (w / 2) / range;
  const cx = w / 2, cy = h / 2;
  const focus = player.inCar ? player.inCar.pos : player.pos;
  const heading = player.inCar ? player.inCar.heading : player.heading;

  mmCtx.save();
  mmCtx.beginPath();
  mmCtx.arc(cx, cy, w / 2, 0, Math.PI * 2);
  mmCtx.clip();

  // heading-up: rotate the whole world under the player so "forward" always points up
  mmCtx.translate(cx, cy);
  mmCtx.rotate(heading - Math.PI);

  mmCtx.fillStyle = '#3a3d41';
  for (const b of buildingColliders) {
    const x1 = (b.minX - focus.x) * scale;
    const y1 = (b.minZ - focus.z) * scale;
    const x2 = (b.maxX - focus.x) * scale;
    const y2 = (b.maxZ - focus.z) * scale;
    mmCtx.fillRect(x1, y1, x2 - x1, y2 - y1);
  }

  mmCtx.fillStyle = '#2f6b34';
  for (const p of parkCells) {
    const x = (p.x - focus.x) * scale;
    const y = (p.z - focus.z) * scale;
    const s = p.half * 2 * scale;
    mmCtx.fillRect(x - s / 2, y - s / 2, s, s);
  }

  mmCtx.fillStyle = '#ffd23f';
  for (const p of pickups) {
    const x = (p.pos.x - focus.x) * scale;
    const y = (p.pos.z - focus.z) * scale;
    mmCtx.beginPath();
    mmCtx.arc(x, y, 2.2, 0, Math.PI * 2);
    mmCtx.fill();
  }

  if (missionState.targetPos) {
    let x = (missionState.targetPos.x - focus.x) * scale;
    let y = (missionState.targetPos.z - focus.z) * scale;
    // clamp to the rim so far-away targets still show up as a radar blip
    const edge = w / 2 - 16;
    const d = Math.hypot(x, y);
    if (d > edge) {
      x = (x / d) * edge;
      y = (y / d) * edge;
    }
    // big, pulsing marker -- this is the one thing on the map you must not miss
    const pulse = 1 + Math.sin(elapsed * 4) * 0.18;
    const step = missionState.step;
    mmCtx.fillStyle = step?.waypoint ? step.waypoint.color : '#ffcc00';
    mmCtx.beginPath();
    mmCtx.arc(x, y, 14 * pulse, 0, Math.PI * 2);
    mmCtx.fill();
    mmCtx.strokeStyle = '#ffffff';
    mmCtx.lineWidth = 3;
    mmCtx.stroke();
  }

  mmCtx.fillStyle = '#c8ccd1';
  for (const car of trafficCars) {
    const x = (car.pos.x - focus.x) * scale;
    const y = (car.pos.z - focus.z) * scale;
    mmCtx.beginPath();
    mmCtx.arc(x, y, 2.4, 0, Math.PI * 2);
    mmCtx.fill();
  }

  mmCtx.fillStyle = '#7a8fae';
  for (const car of policeCars) {
    const x = (car.pos.x - focus.x) * scale;
    const y = (car.pos.z - focus.z) * scale;
    mmCtx.beginPath();
    mmCtx.arc(x, y, 3.2, 0, Math.PI * 2);
    mmCtx.fill();
  }

  mmCtx.fillStyle = '#2050ff';
  for (const car of chaseCops) {
    const x = (car.pos.x - focus.x) * scale;
    const y = (car.pos.z - focus.z) * scale;
    mmCtx.beginPath();
    mmCtx.arc(x, y, 3.6, 0, Math.PI * 2);
    mmCtx.fill();
  }

  // player marker always points straight up since the map rotates instead
  mmCtx.fillStyle = '#ff3b3b';
  mmCtx.beginPath();
  mmCtx.moveTo(0, -6);
  mmCtx.lineTo(4, 5);
  mmCtx.lineTo(-4, 5);
  mmCtx.closePath();
  mmCtx.fill();

  mmCtx.restore();
  mmCtx.strokeStyle = 'rgba(255,255,255,0.5)';
  mmCtx.lineWidth = 3;
  mmCtx.beginPath();
  mmCtx.arc(cx, cy, w / 2 - 2, 0, Math.PI * 2);
  mmCtx.stroke();
}

// ---------- Collision: vehicles vs pedestrians -----------------------------
function checkPedestrianHits() {
  const cars = new Set([playerCar, ...trafficCars, ...policeCars, ...chaseCops]);
  if (player.inCar) cars.add(player.inCar);
  for (const car of cars) {
    if (Math.abs(car.speed) < 4) continue;
    for (const ped of pedestrians) {
      if (!ped.alive) continue;
      const dx = ped.pos.x - car.pos.x, dz = ped.pos.z - car.pos.z;
      if (dx * dx + dz * dz < 1.6 * 1.6) ped.kill();
    }
  }
}

// ---------- Camera --------------------------------------------------------
function updateCamera(dt) {
  const inCar = !!player.inCar;
  const focus = inCar ? player.inCar.pos : player.pos;
  const targetHeading = inCar ? player.inCar.heading : player.heading;
  const activeSpeed = inCar ? player.inCar.speed : player.moveSpeed;
  const maxSpeedRef = inCar ? player.inCar.maxSpeed : CHAR_SPEED_MAX;
  const spdFac = clamp(Math.abs(activeSpeed) / Math.max(maxSpeedRef, 0.01), 0, 1);

  camTarget.lerp(new THREE.Vector3(focus.x, 0, focus.z), Math.min(1, dt * 4.5));
  camHeading += wrapAngle(targetHeading - camHeading) * Math.min(1, dt * 5);
  const forward = new THREE.Vector3(Math.sin(camHeading), 0, Math.cos(camHeading));

  let height, back, lookY;
  if (cameraMode === 'third') {
    height = (inCar ? CAM3_HEIGHT_CAR : CAM3_HEIGHT_FOOT) * (1 + spdFac * (inCar ? 0.85 : 0.5));
    back = (inCar ? CAM3_BACK_CAR : CAM3_BACK_FOOT) * (1 + spdFac * (inCar ? 0.85 : 0.5));
    lookY = inCar ? 1.1 : 1.3;
  } else {
    height = (inCar ? CAM_HEIGHT : CAM_HEIGHT_FOOT) * (1 + spdFac * (inCar ? 0.55 : 0.35));
    back = (inCar ? CAM_BACK : CAM_BACK_FOOT) * (1 + spdFac * (inCar ? 0.55 : 0.35));
    lookY = 0;
  }

  const desired = new THREE.Vector3(
    camTarget.x - forward.x * back,
    height,
    camTarget.z - forward.z * back
  );
  camPos.lerp(desired, Math.min(1, dt * 5));
  camera.position.copy(camPos);

  if (shakeTime > 0) {
    shakeTime -= dt;
    const s = shakeMag * clamp(shakeTime / 0.3, 0, 1);
    camera.position.x += (Math.random() - 0.5) * s;
    camera.position.y += (Math.random() - 0.5) * s * 0.5;
    camera.position.z += (Math.random() - 0.5) * s;
    if (shakeTime <= 0) shakeMag = 0;
  }

  camera.lookAt(camTarget.x, lookY, camTarget.z);
  sunTarget.position.copy(camTarget);
  sun.position.set(camTarget.x - 60, 110, camTarget.z + 40);
}

// ---------- Main loop -------------------------------------------------------
const clock = new THREE.Clock();
let elapsed = 0;

function updatePlayer(dt, input) {
  if (missionState.gameOver) return;
  if (player.inCar) {
    if (player.inCar.occupied) player.inCar.physicsStep(dt, input);
    return;
  }

  // tank controls, ported from dhl-city/character.html: left/right turn the
  // character, up/down move forward/backward along its current facing
  if (input.left) player.heading += CHAR_TURN_RATE * dt;
  if (input.right) player.heading -= CHAR_TURN_RATE * dt;

  const fwdX = Math.sin(player.heading), fwdZ = Math.cos(player.heading);
  const wantMove = input.up || input.down;
  if (wantMove) player.moveSpeed = Math.min(player.moveSpeed + CHAR_ACCEL_RATE * dt, CHAR_SPEED_MAX);
  else player.moveSpeed = Math.max(player.moveSpeed - CHAR_DECEL_RATE * dt, 0);

  if (input.up) { player.pos.x += fwdX * player.moveSpeed * dt; player.pos.z += fwdZ * player.moveSpeed * dt; }
  if (input.down) { player.pos.x -= fwdX * player.moveSpeed * dt; player.pos.z -= fwdZ * player.moveSpeed * dt; }
  collideWithBuildings(player.pos, 0.5);
  player.speed = player.moveSpeed;

  // jump state machine
  if (player.jumpBuf && player.onGround && player.jumpState !== 'windup' && player.jumpState !== 'air') {
    player.jumpState = 'windup';
    player.jumpTimer = 0;
    player.jumpBuf = false;
  }
  if (player.jumpState === 'windup') {
    player.jumpTimer += dt;
    if (player.jumpTimer >= CHAR_WINDUP_DUR) {
      player.velY = CHAR_JUMP_VEL;
      player.onGround = false;
      player.jumpState = 'air';
      player.jumpTimer = 0;
    }
  }
  if (player.jumpState === 'land') {
    player.jumpTimer += dt;
    if (player.jumpTimer >= CHAR_LAND_DUR) player.jumpState = 'none';
  }

  player.velY += CHAR_GRAVITY * dt;
  player.pos.y += player.velY * dt;
  if (player.pos.y <= 0) {
    if (player.velY < -1.5 && player.jumpState === 'air') {
      player.jumpState = 'land';
      player.jumpTimer = 0;
    } else if (player.jumpState === 'air') {
      player.jumpState = 'none';
    }
    player.pos.y = 0;
    player.velY = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }

  animateCharacter(player, dt, input);

  player.mesh.position.set(player.pos.x, player.pos.y + CHAR_BASE_Y, player.pos.z);
  player.mesh.rotation.y = player.heading;

  // run over by traffic/police while on foot
  for (const car of [...trafficCars, ...policeCars, ...chaseCops]) {
    if (Math.abs(car.speed) < 4) continue;
    const dx = car.pos.x - player.pos.x, dz = car.pos.z - player.pos.z;
    if (dx * dx + dz * dz < 2.0 * 2.0) {
      player.health -= 60 * dt * Math.abs(car.speed) / 10;
      if (player.health <= 0 && !missionState.gameOver) failMission();
    }
  }
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  const input = readInput();
  updatePlayer(dt, input);
  updateTraffic(dt);
  for (const ped of pedestrians) ped.update(dt);
  updatePolice(dt);
  updatePoliceChase(dt);
  updateCarCollisions(dt);
  updatePickups(dt, elapsed);
  updateMission(dt);
  updateDebris(dt);
  updateSparks(dt);
  checkPedestrianHits();
  updateHud(dt);
  updateCamera(dt);
  drawMinimap();

  renderer.render(scene, camera);
}

// ---------- Resize -----------------------------------------------------
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);
window.visualViewport?.addEventListener('resize', onResize);
onResize();

// ---------- Boot -----------------------------------------------------
const loadingEl = document.getElementById('loading');
requestAnimationFrame(() => {
  loadingEl.style.transition = 'opacity 0.6s ease';
  loadingEl.style.opacity = '0';
  setTimeout(() => loadingEl.remove(), 700);
});

// ---------- TEMP DEBUG: click/tap logs world [x,z] to console ----------
// Used to fine-tune the placeholder pos values in mission.js. Remove once done.
const DEBUG_LOG_COORDS = true;
if (DEBUG_LOG_COORDS) {
  const dbgRay = new THREE.Raycaster();
  const dbgPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const dbgHit = new THREE.Vector3();
  const dbgPointer = new THREE.Vector2();
  const logWorldPointAt = (clientX, clientY) => {
    dbgPointer.x = (clientX / window.innerWidth) * 2 - 1;
    dbgPointer.y = -(clientY / window.innerHeight) * 2 + 1;
    dbgRay.setFromCamera(dbgPointer, camera);
    if (dbgRay.ray.intersectPlane(dbgPlane, dbgHit)) {
      console.log(`[debug pos] [${dbgHit.x.toFixed(1)}, ${dbgHit.z.toFixed(1)}]`);
    }
  };
  canvas.addEventListener('pointerdown', (e) => logWorldPointAt(e.clientX, e.clientY));
}

startMission();
animate();
