import * as THREE from './vendor/three.module.min.js';

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
scene.background = new THREE.Color(0x171a1d);
scene.fog = new THREE.Fog(0x171a1d, CITY_HALF * 0.9, CITY_HALF * 1.85);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.5, 900);
const CAM_HEIGHT = 38;
const CAM_BACK = 9; // distance behind the car; camera now rotates to stay behind it
const camTarget = new THREE.Vector3();
const camPos = new THREE.Vector3(0, CAM_HEIGHT, CAM_BACK);
let camHeading = 0;
camera.position.copy(camPos);

// ---------- Lighting ----------------------------------------------------
scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x2b2116, 0.65));
const sun = new THREE.DirectionalLight(0xfff2d6, 1.15);
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

let shakeTime = 0;
let shakeMag = 0;
function addShake(intensity) {
  shakeTime = Math.max(shakeTime, 0.15 + intensity * 0.35);
  shakeMag = Math.max(shakeMag, 0.6 + intensity * 2.2);
}

function triggerCrash(pos, impactSpeed, involvesPlayer) {
  const intensity = clamp(impactSpeed / 25, 0.15, 1);
  spawnDebris(pos, Math.round(4 + intensity * 6));
  const focus = player.inCar ? player.inCar.pos : player.pos;
  const distToPlayer = pos.distanceTo(focus);
  const distFactor = clamp(1 - distToPlayer / 50, 0, 1);
  const vol = involvesPlayer ? intensity : intensity * distFactor * 0.5;
  if (vol > 0.02) playCrashSound(vol);
  if (involvesPlayer) addShake(intensity);
}

// each accident makes a car permanently 10% slower and adds a visible dent
function applyCarDamage(car) {
  car.damageCount += 1;
  car.maxSpeed = car.baseMaxSpeed * Math.pow(0.9, car.damageCount);
  addDentToCar(car);
}
function addDentToCar(car) {
  const dents = car.mesh.userData.dents || (car.mesh.userData.dents = []);
  if (dents.length >= 8) return;
  const dent = new THREE.Mesh(
    new THREE.BoxGeometry(rand(0.22, 0.4), rand(0.14, 0.24), rand(0.22, 0.4)),
    flatMat(0x201d1b)
  );
  const side = pick([-1, 1]);
  dent.position.set(side * car.halfWidth * 0.85, rand(0.35, 0.85), pick([-1, 1]) * rand(0.3, car.halfLength * 0.85));
  dent.rotation.y = rand(0, Math.PI);
  car.mesh.add(dent);
  dents.push(dent);
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

function buildCity() {
  buildGround();
  for (let i = 0; i < GRID_COUNT; i++) {
    for (let j = 0; j < GRID_COUNT; j++) buildBlock(i, j);
  }
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

// ---------- Vehicle factory ---------------------------------------------
// Per-type footprint/handling specs. halfW/halfL drive the OBB collision
// shape (so cars only "hit" when they actually touch); wheelR/frontZ/rearZ
// drive mesh construction.
const VEHICLE_SPECS = {
  car: { halfW: 1.075, halfL: 2.15, wheelR: 0.42, maxSpeedMul: 1.0, accelMul: 1.0 },
  bus: { halfW: 1.25, halfL: 4.6, wheelR: 0.5, maxSpeedMul: 0.6, accelMul: 0.45 },
  truck: { halfW: 1.2, halfL: 3.7, wheelR: 0.48, maxSpeedMul: 0.68, accelMul: 0.5 },
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
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, 1.7, l), flatMat(color));
    body.position.y = 1.05;
    body.castShadow = true;
    group.add(body);
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
    const headlight = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 0.22, 0.08), flatMat(0xfff2b0));
    headlight.position.set(0, 0.55, spec.halfL + 0.02);
    group.add(headlight);
    const taillight = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 0.22, 0.08), flatMat(0xaa2020));
    taillight.position.set(0, 0.55, -spec.halfL - 0.02);
    group.add(taillight);
  } else if (type === 'truck') {
    const w = spec.halfW * 2;
    const cabLen = 2.1, cargoLen = spec.halfL * 2 - cabLen - 0.25;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 1.3, cabLen), flatMat(color));
    cab.position.set(0, 1.0, spec.halfL - cabLen / 2);
    cab.castShadow = true;
    group.add(cab);
    const cargo = new THREE.Mesh(new THREE.BoxGeometry(w, 1.9, cargoLen), flatMat(0xd8d8d8));
    cargo.position.set(0, 1.15, spec.halfL - cabLen - 0.25 - cargoLen / 2);
    cargo.castShadow = true;
    group.add(cargo);
    const frontZ = spec.halfL - 0.6, rearZ = -spec.halfL + 0.9;
    for (const side of [-1, 1]) {
      addAxle(group, frontWheels, side, w / 2 - 0.02, spec.wheelR, frontZ, spec.wheelR, true);
      addAxle(group, frontWheels, side, w / 2 - 0.02, spec.wheelR, rearZ, spec.wheelR, false);
    }
    const headlight = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.2, 0.08), flatMat(0xfff2b0));
    headlight.position.set(0, 0.5, spec.halfL + 0.02);
    group.add(headlight);
    const taillight = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.2, 0.08), flatMat(0xaa2020));
    taillight.position.set(0, 0.65, -spec.halfL - 0.02);
    group.add(taillight);
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(spec.halfW * 2, 0.75, spec.halfL * 2), flatMat(color));
    body.position.y = 0.62;
    body.castShadow = true;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.62, 2.1), flatMat(isPolice ? 0xdedede : 0x1d1d1d));
    cabin.position.set(0, 1.16, -0.2);
    cabin.castShadow = true;
    group.add(body, cabin);
    for (const side of [-1, 1]) {
      addAxle(group, frontWheels, side, 1.05, spec.wheelR, -1.35, spec.wheelR, false);
      addAxle(group, frontWheels, side, 1.05, spec.wheelR, 1.35, spec.wheelR, true);
    }
    const headlight = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.2, 0.08), flatMat(0xfff2b0));
    headlight.position.set(0, 0.65, 2.16);
    group.add(headlight);
    const taillight = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.2, 0.08), flatMat(0xaa2020));
    taillight.position.set(0, 0.65, -2.16);
    group.add(taillight);

    if (isPolice) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.22, 0.5), flatMat(0x222222));
      bar.position.set(0, 1.55, -0.2);
      group.add(bar);
      const redLight = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.42), flatMat(0xff2020));
      redLight.position.set(-0.35, 1.62, -0.2);
      const blueLight = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.42), flatMat(0x2050ff));
      blueLight.position.set(0.35, 1.62, -0.2);
      group.add(redLight, blueLight);
      group.userData.lights = [redLight, blueLight];
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
    this.wheelBase = 2.6;
    this.crashCooldown = 0;
    this.wheelSteer = 0;
    this.damageCount = 0;
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
    const preImpactSpeed = this.speed;
    const hitWall = collideWithBuildings(this.pos, this.radius);
    if (hitWall && Math.abs(preImpactSpeed) > 4) {
      if (this.crashCooldown <= 0) {
        triggerCrash(this.pos, Math.abs(preImpactSpeed), this === player.inCar);
        applyCarDamage(this);
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
  a.pos.x -= nx * minOverlap * 0.5;
  a.pos.z -= nz * minOverlap * 0.5;
  b.pos.x += nx * minOverlap * 0.5;
  b.pos.z += nz * minOverlap * 0.5;

  const impactSpeed = Math.abs(a.speed) + Math.abs(b.speed);
  const merged = (a.speed + b.speed) * 0.5 * 0.35;
  a.speed = merged;
  b.speed = merged;
  a.syncMesh();
  b.syncMesh();

  if (impactSpeed > 3 && a.crashCooldown <= 0 && b.crashCooldown <= 0) {
    const mid = new THREE.Vector3((a.pos.x + b.pos.x) / 2, 0.4, (a.pos.z + b.pos.z) / 2);
    const involvesPlayer = a === player.inCar || b === player.inCar;
    triggerCrash(mid, impactSpeed, involvesPlayer);
    applyCarDamage(a);
    applyCarDamage(b);
    a.crashCooldown = 0.35;
    b.crashCooldown = 0.35;
  }
}

function updateCarCollisions(dt) {
  const cars = [playerCar, ...trafficCars, ...policeCars];
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

// snaps a car onto the nearest matching lane so it can resume ambient
// lane-driving from wherever it currently is (used when police stand down)
function snapToPatrolLane(car) {
  const h = wrapAngle(car.heading);
  const horizontal = Math.abs(Math.abs(h) - Math.PI / 2) < Math.PI / 4;
  if (horizontal) {
    const dir = Math.sin(h) >= 0 ? 1 : -1;
    let best = roadLines.z[0], bestD = Infinity;
    for (const z of roadLines.z) {
      const d = Math.abs(car.pos.z - (z + LANE_OFFSET * dir));
      if (d < bestD) { bestD = d; best = z; }
    }
    car.horizontal = true;
    car.dir = dir;
    car.lineCoord = best;
    car.pos.z = best + LANE_OFFSET * dir;
    car.heading = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  } else {
    const dir = Math.cos(h) >= 0 ? 1 : -1;
    let best = roadLines.x[0], bestD = Infinity;
    for (const x of roadLines.x) {
      const d = Math.abs(car.pos.x - (x + LANE_OFFSET * dir));
      if (d < bestD) { bestD = d; best = x; }
    }
    car.horizontal = false;
    car.dir = dir;
    car.lineCoord = best;
    car.pos.x = best + LANE_OFFSET * dir;
    car.heading = dir > 0 ? 0 : Math.PI;
  }
  car.state = 'patrol';
  car.speed = car.maxSpeed * rand(0.5, 0.8);
  if (car.mesh.userData.lights) {
    car.mesh.userData.lights[0].material.emissive.set(0);
    car.mesh.userData.lights[1].material.emissive.set(0);
  }
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

function createPlayerMesh() {
  const PC = { skin: 0xF0BC94, shirt: 0x1E88E5, pants: 0x37474F, shoes: 0x1A1A1A, hair: 0x3E2723 };
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
  wanted: 0,
  money: 0,
  busted: false,
  wasted: false,
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

// ---------- Police: persistent patrol, chase only while wanted -------------
const POLICE_PATROL_COUNT = 5;
const MAX_POLICE_TOTAL = 8;
const CHASE_RADIUS = 55;
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
    car.state = 'patrol';
    car.siren = 0;
    policeCars.push(car);
  }
}

// converts nearby patrol cars to pursuit, spawning reinforcements from
// off-screen only if not enough patrol cars are already near the player
function ensurePursuers(neededCount) {
  const pursuing = policeCars.filter((c) => c.state === 'pursuit').length;
  let toConvert = neededCount - pursuing;
  if (toConvert <= 0) return;

  const patrol = policeCars
    .filter((c) => c.state === 'patrol')
    .sort((a, b) => a.pos.distanceTo(player.pos) - b.pos.distanceTo(player.pos));
  for (const car of patrol) {
    if (toConvert <= 0) break;
    car.state = 'pursuit';
    toConvert--;
  }

  for (let i = 0; i < toConvert && policeCars.length < MAX_POLICE_TOTAL; i++) {
    const car = new Car({ isPolice: true });
    const angle = rand(0, Math.PI * 2);
    const dist = rand(45, 70);
    const px = clamp(player.pos.x + Math.sin(angle) * dist, -CITY_HALF, CITY_HALF);
    const pz = clamp(player.pos.z + Math.cos(angle) * dist, -CITY_HALF, CITY_HALF);
    car.place(px, pz, angle);
    car.state = 'pursuit';
    car.siren = Math.random() * Math.PI * 2;
    policeCars.push(car);
    scene.add(car.mesh);
  }
}
spawnPolicePatrol();

function updatePolice(dt) {
  for (const car of policeCars) {
    if (car.state === 'patrol') {
      stepLaneCar(car, dt);
      if (player.wanted > 0 && car.pos.distanceTo(player.pos) < CHASE_RADIUS) {
        car.state = 'pursuit';
      }
      continue;
    }

    if (player.wanted < 0.5) {
      snapToPatrolLane(car);
      continue;
    }

    const toPlayer = new THREE.Vector3().subVectors(player.pos, car.pos);
    const dist = toPlayer.length();
    const desiredHeading = Math.atan2(toPlayer.x, toPlayer.z);
    const diff = wrapAngle(desiredHeading - car.heading);
    const steer = clamp(diff * 1.4, -1, 1);
    const throttle = dist > 6 ? 1 : 0.15;
    car.physicsStep(dt, { throttle, steer, handbrake: false });

    car.siren += dt * 6;
    if (car.mesh.userData.lights) {
      const on = Math.sin(car.siren) > 0;
      car.mesh.userData.lights[0].material.emissive = new THREE.Color(on ? 0x330000 : 0);
      car.mesh.userData.lights[1].material.emissive = new THREE.Color(!on ? 0x000033 : 0);
    }

    if (dist < 3.4 && !player.busted && !player.wasted) {
      triggerBusted();
    }
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
  mesh.position.copy(pos);
  scene.add(mesh);
  pickups.push({ mesh, pos, value: 50 + ((Math.random() * 4) | 0) * 25 });
}
for (let i = 0; i < 12; i++) spawnPickup();

function updatePickups(dt, t) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    p.mesh.rotation.y = t * 2;
    p.mesh.position.y = 0.9 + Math.sin(t * 3 + i) * 0.15;
    const dx = p.pos.x - player.pos.x, dz = p.pos.z - player.pos.z;
    if (dx * dx + dz * dz < 4) {
      scene.remove(p.mesh);
      pickups.splice(i, 1);
      player.money += p.value;
      spawnPickup();
    }
  }
}

// ---------- Missions (delivery runs) ---------------------------------------
const MISSION_TIME = 40;
let mission = null;

function createBeaconMesh(color) {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.14, 8, 20), flatMat(color));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.1;
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 6, 8, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
  );
  beam.position.y = 3;
  group.add(ring, beam);
  group.userData.ring = ring;
  return group;
}

function pickMissionPoint() {
  const cells = sidewalkCells.length ? sidewalkCells : parkCells;
  const cell = pick(cells);
  return new THREE.Vector3(
    cell.x + rand(-cell.half * 0.6, cell.half * 0.6),
    0,
    cell.z + rand(-cell.half * 0.6, cell.half * 0.6)
  );
}

function startNewMission() {
  const pickupPos = pickMissionPoint();
  const mesh = createBeaconMesh(0xffd23f);
  mesh.position.copy(pickupPos);
  scene.add(mesh);
  mission = { stage: 'pickup', pickupPos, mesh, timeLeft: MISSION_TIME, reward: 250 + ((Math.random() * 4) | 0) * 50 };
  showSub('Neuer Auftrag: Fahr zum gelben Marker!');
}

function advanceToDropoff() {
  scene.remove(mission.mesh);
  const dropoffPos = pickMissionPoint();
  const mesh = createBeaconMesh(0x36c7ff);
  mesh.position.copy(dropoffPos);
  scene.add(mesh);
  mission.stage = 'dropoff';
  mission.dropoffPos = dropoffPos;
  mission.mesh = mesh;
  mission.timeLeft = MISSION_TIME;
  showSub('Abgeholt! Bring die Ladung zum blauen Marker!');
}

function failMission() {
  scene.remove(mission.mesh);
  showSub('Auftrag verpasst!');
  mission = null;
  setTimeout(startNewMission, 3000);
}

function completeMission() {
  scene.remove(mission.mesh);
  player.money += mission.reward;
  showSub(`Auftrag erledigt! +$${mission.reward}`);
  mission = null;
  setTimeout(startNewMission, 2500);
}

function updateMissions(dt) {
  if (!mission) return;
  mission.timeLeft -= dt;
  mission.mesh.rotation.y += dt * 2;
  mission.mesh.userData.ring.position.y = 0.1 + Math.sin(elapsed * 3) * 0.05;
  const focus = player.inCar ? player.inCar.pos : player.pos;
  const targetPos = mission.stage === 'pickup' ? mission.pickupPos : mission.dropoffPos;
  const dx = targetPos.x - focus.x, dz = targetPos.z - focus.z;
  if (dx * dx + dz * dz < 4 * 4) {
    if (mission.stage === 'pickup') advanceToDropoff();
    else completeMission();
    return;
  }
  if (mission.timeLeft <= 0) failMission();
}

// ---------- Input -----------------------------------------------------
const keys = new Set();
window.addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code === 'KeyF') tryToggleVehicle();
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
document.getElementById('btnAction')?.addEventListener('touchstart', (e) => { e.preventDefault(); tryToggleVehicle(); });
document.getElementById('btnAction')?.addEventListener('click', tryToggleVehicle);
function triggerJump() { if (!player.inCar) player.jumpBuf = true; }
document.getElementById('btnJump')?.addEventListener('touchstart', (e) => { e.preventDefault(); triggerJump(); });
document.getElementById('btnJump')?.addEventListener('click', triggerJump);

// ---------- Control mode: virtual d-pad buttons vs. swiping the screen directly
let controlMode = localStorage.getItem('viceGridControlMode') || 'buttons';
const controlModeBtn = document.getElementById('btnControlMode');
function applyControlMode() {
  document.body.classList.toggle('drag-mode', controlMode === 'drag');
  if (controlModeBtn) controlModeBtn.textContent = controlMode === 'drag' ? '👆 Wischen' : '🕹️ Tasten';
}
function toggleControlMode() {
  controlMode = controlMode === 'drag' ? 'buttons' : 'drag';
  localStorage.setItem('viceGridControlMode', controlMode);
  applyControlMode();
}
controlModeBtn?.addEventListener('touchstart', (e) => { e.preventDefault(); toggleControlMode(); });
controlModeBtn?.addEventListener('click', toggleControlMode);
applyControlMode();

const dragState = { up: false, down: false, left: false, right: false };
let dragOrigin = null;
const DRAG_DEADZONE = 14;
const appEl = document.getElementById('app');
appEl.addEventListener('touchstart', (e) => {
  if (controlMode !== 'drag' || e.target.closest('.mbtn, #btnControlMode')) return;
  const t = e.touches[0];
  dragOrigin = { x: t.clientX, y: t.clientY };
}, { passive: true });
appEl.addEventListener('touchmove', (e) => {
  if (controlMode !== 'drag' || !dragOrigin) return;
  const t = e.touches[0];
  const dx = t.clientX - dragOrigin.x, dy = t.clientY - dragOrigin.y;
  dragState.up = dy < -DRAG_DEADZONE;
  dragState.down = dy > DRAG_DEADZONE;
  dragState.left = dx < -DRAG_DEADZONE;
  dragState.right = dx > DRAG_DEADZONE;
  e.preventDefault();
}, { passive: false });
appEl.addEventListener('touchend', () => {
  dragOrigin = null;
  dragState.up = dragState.down = dragState.left = dragState.right = false;
});

function readInput() {
  const drag = controlMode === 'drag';
  const up = keys.has('KeyW') || keys.has('ArrowUp') || (drag ? dragState.up : mobileState.gas);
  const down = keys.has('KeyS') || keys.has('ArrowDown') || (drag ? dragState.down : mobileState.brake);
  const left = keys.has('KeyA') || keys.has('ArrowLeft') || (drag ? dragState.left : mobileState.left);
  const right = keys.has('KeyD') || keys.has('ArrowRight') || (drag ? dragState.right : mobileState.right);
  const handbrake = keys.has('Space');
  return {
    throttle: up ? 1 : (down ? -1 : 0),
    steer: (left ? 1 : 0) - (right ? 1 : 0),
    handbrake,
    up, down, left, right,
  };
}

function tryToggleVehicle() {
  if (player.busted || player.wasted) return;
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

// ---------- Wanted / Busted / Wasted state --------------------------------
let wantedCooldown = 0;
function addWanted(amount) {
  if (player.wanted === 0 && amount > 0) {
    showSub('Die Polizei ist dir auf den Fersen!');
  }
  player.wanted = clamp(player.wanted + amount, 0, 3);
  wantedCooldown = 6;
  ensurePursuers(player.wanted);
}

function triggerBusted() {
  player.busted = true;
  showCenter('BUSTED!');
  setTimeout(respawnPlayer, 1800);
}

function triggerWasted() {
  player.wasted = true;
  showCenter('WASTED');
  setTimeout(respawnPlayer, 1800);
}

function respawnPlayer() {
  player.wanted = 0;
  player.health = 100;
  player.busted = false;
  player.wasted = false;
  hideCenter();
  if (player.inCar) {
    player.inCar.occupied = false;
    player.inCar = null;
  }
  player.mesh.visible = true;
  player.pos.set(4, 0, 2);
  player.heading = Math.PI;
  player.moveSpeed = 0;
  player.velY = 0;
  player.onGround = true;
  player.jumpState = 'none';
  player.jumpBuf = false;
  playerCar.place(4, 2, Math.PI);
  playerCar.occupied = false;
  player.money = Math.max(0, player.money - 100);
}

// ---------- HUD -----------------------------------------------------------
const starsEl = document.getElementById('stars');
const moneyEl = document.getElementById('money');
const speedEl = document.getElementById('speed');
const gearEl = document.getElementById('gear');
const centerMsg = document.getElementById('centerMsg');
const subMsg = document.getElementById('subMsg');
const controlsHint = document.getElementById('controlsHint');
const missionPanel = document.getElementById('missionPanel');
const missionText = document.getElementById('missionText');
const missionTimerFill = document.getElementById('missionTimerFill');

let subTimer = 0;
function showSub(text) {
  subMsg.textContent = text;
  subMsg.classList.add('show');
  subTimer = 2.2;
}
function showCenter(text) {
  centerMsg.textContent = text;
  centerMsg.classList.add('show');
}
function hideCenter() {
  centerMsg.classList.remove('show');
}

setTimeout(() => controlsHint.style.opacity = '0', 9000);

function updateHud(dt) {
  let stars = '';
  for (let i = 0; i < 3; i++) stars += `<span class="${i < player.wanted ? '' : 'off'}">★</span>`;
  starsEl.innerHTML = stars;
  moneyEl.textContent = '$' + player.money;

  const activeSpeed = player.inCar ? player.inCar.speed : player.speed;
  speedEl.textContent = Math.round(Math.abs(activeSpeed) * 9);
  gearEl.textContent = player.inCar ? (activeSpeed < -0.1 ? 'R' : 'D') : 'ZU FUSS';

  if (subTimer > 0) {
    subTimer -= dt;
    if (subTimer <= 0) subMsg.classList.remove('show');
  }

  if (mission) {
    missionPanel.classList.remove('hidden');
    missionText.textContent = mission.stage === 'pickup'
      ? `Auftrag: Fahre zum gelben Marker ($${mission.reward})`
      : `Auftrag: Liefere zum blauen Marker ($${mission.reward})`;
    missionTimerFill.style.width = clamp(mission.timeLeft / MISSION_TIME, 0, 1) * 100 + '%';
  } else {
    missionPanel.classList.add('hidden');
  }
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

  if (mission) {
    const targetPos = mission.stage === 'pickup' ? mission.pickupPos : mission.dropoffPos;
    let x = (targetPos.x - focus.x) * scale;
    let y = (targetPos.z - focus.z) * scale;
    // clamp to the rim so far-away missions still show up as a radar blip
    const edge = w / 2 - 10;
    const d = Math.hypot(x, y);
    if (d > edge) {
      x = (x / d) * edge;
      y = (y / d) * edge;
    }
    mmCtx.fillStyle = mission.stage === 'pickup' ? '#ffd23f' : '#36c7ff';
    mmCtx.beginPath();
    mmCtx.arc(x, y, 5.5, 0, Math.PI * 2);
    mmCtx.fill();
    mmCtx.strokeStyle = '#ffffff';
    mmCtx.lineWidth = 1.5;
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

  for (const car of policeCars) {
    const x = (car.pos.x - focus.x) * scale;
    const y = (car.pos.z - focus.z) * scale;
    mmCtx.fillStyle = car.state === 'pursuit' ? '#2050ff' : '#7a8fae';
    mmCtx.beginPath();
    mmCtx.arc(x, y, 3.2, 0, Math.PI * 2);
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
  const cars = new Set([playerCar, ...trafficCars, ...policeCars]);
  if (player.inCar) cars.add(player.inCar);
  for (const car of cars) {
    if (Math.abs(car.speed) < 4) continue;
    for (const ped of pedestrians) {
      if (!ped.alive) continue;
      const dx = ped.pos.x - car.pos.x, dz = ped.pos.z - car.pos.z;
      if (dx * dx + dz * dz < 1.6 * 1.6) {
        ped.kill();
        if (car.isPlayer || car === player.inCar) addWanted(1);
      }
    }
  }
}

// ---------- Camera --------------------------------------------------------
function updateCamera(dt) {
  const focus = player.inCar ? player.inCar.pos : player.pos;
  const targetHeading = player.inCar ? player.inCar.heading : player.heading;
  camTarget.lerp(new THREE.Vector3(focus.x, 0, focus.z), Math.min(1, dt * 4.5));
  camHeading += wrapAngle(targetHeading - camHeading) * Math.min(1, dt * 5);

  const forward = new THREE.Vector3(Math.sin(camHeading), 0, Math.cos(camHeading));
  const desired = new THREE.Vector3(
    camTarget.x - forward.x * CAM_BACK,
    CAM_HEIGHT,
    camTarget.z - forward.z * CAM_BACK
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

  camera.lookAt(camTarget.x, 0, camTarget.z);
  sunTarget.position.copy(camTarget);
  sun.position.set(camTarget.x - 60, 110, camTarget.z + 40);
}

// ---------- Main loop -------------------------------------------------------
const clock = new THREE.Clock();
let elapsed = 0;

function updatePlayer(dt, input) {
  if (player.busted || player.wasted) return;
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
  for (const car of [...trafficCars, ...policeCars]) {
    if (Math.abs(car.speed) < 4) continue;
    const dx = car.pos.x - player.pos.x, dz = car.pos.z - player.pos.z;
    if (dx * dx + dz * dz < 2.0 * 2.0) {
      player.health -= 60 * dt * Math.abs(car.speed) / 10;
      if (player.health <= 0 && !player.wasted) triggerWasted();
    }
  }
}

function decayWanted(dt) {
  if (wantedCooldown > 0) {
    wantedCooldown -= dt;
  } else if (player.wanted > 0) {
    player.wanted = clamp(player.wanted - dt * 0.08, 0, 3);
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
  updateCarCollisions(dt);
  updatePickups(dt, elapsed);
  updateMissions(dt);
  updateDebris(dt);
  checkPedestrianHits();
  decayWanted(dt);
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
onResize();

// ---------- Boot -----------------------------------------------------
const loadingEl = document.getElementById('loading');
requestAnimationFrame(() => {
  loadingEl.style.transition = 'opacity 0.6s ease';
  loadingEl.style.opacity = '0';
  setTimeout(() => loadingEl.remove(), 700);
});

setTimeout(startNewMission, 3000);
animate();
