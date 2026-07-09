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
const CAM_HEIGHT = 62;
const CAM_BACK = 34; // fixed world-space offset -> camera never rotates with the car
const camOffset = new THREE.Vector3(0, CAM_HEIGHT, CAM_BACK);
const camTarget = new THREE.Vector3();
const camPos = new THREE.Vector3(0, CAM_HEIGHT, CAM_BACK);
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
function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
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
function createCarMesh(color, isPolice) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.75, 4.3), flatMat(color));
  body.position.y = 0.62;
  body.castShadow = true;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.62, 2.1), flatMat(isPolice ? 0xdedede : 0x1d1d1d));
  cabin.position.set(0, 1.16, -0.2);
  cabin.castShadow = true;
  group.add(body, cabin);

  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);
  const wheelMat = flatMat(0x161616);
  const wheelPositions = [
    [-1.05, 0.42, 1.35], [1.05, 0.42, 1.35],
    [-1.05, 0.42, -1.35], [1.05, 0.42, -1.35],
  ];
  for (const [wx, wy, wz] of wheelPositions) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, wy, wz);
    wheel.castShadow = true;
    group.add(wheel);
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

  return group;
}

class Car {
  constructor({ color = pick(CAR_PALETTE), isPolice = false, isPlayer = false } = {}) {
    this.mesh = createCarMesh(color, isPolice);
    this.isPolice = isPolice;
    this.isPlayer = isPlayer;
    this.pos = new THREE.Vector3();
    this.heading = 0;
    this.speed = 0;
    this.steer = 0;
    this.occupied = isPlayer;
    this.radius = 2.5;
    this.wheelBase = 2.6;
    this.maxSpeed = isPolice ? 27 : (isPlayer ? 30 : 15);
    this.accel = isPolice ? 16 : (isPlayer ? 20 : 8);
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

    const speedFactor = clamp(Math.abs(this.speed) / this.maxSpeed, 0, 1);
    const turnRate = steer * (0.85 + speedFactor * 1.5) * (this.speed < 0 ? -1 : 1);
    this.heading += turnRate * dt * (handbrake ? 1.6 : 1);

    const dir = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    this.pos.addScaledVector(dir, this.speed * dt);
    collideWithBuildings(this.pos, this.radius);
    this.syncMesh();
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
function spawnTraffic() {
  const count = 14;
  for (let i = 0; i < count; i++) {
    const car = new Car({ color: pick(CAR_PALETTE) });
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

function updateTraffic(dt) {
  for (const car of trafficCars) {
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
}

// ---------- Player character (on-foot) ------------------------------------
function createPlayerMesh() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.75, 3, 8), flatMat(0xffffff));
  body.position.y = 0.9;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), flatMat(0xe8b98a));
  head.position.y = 1.65;
  head.castShadow = true;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 6), flatMat(0xe8b98a));
  nose.position.set(0, 1.63, 0.24);
  nose.rotation.x = Math.PI / 2;
  group.add(body, head, nose);
  return group;
}

const player = {
  mesh: createPlayerMesh(),
  pos: new THREE.Vector3(0, 0, 6),
  heading: 0,
  speed: 0,
  inCar: null,
  health: 100,
  wanted: 0,
  money: 0,
  busted: false,
  wasted: false,
};
scene.add(player.mesh);
player.mesh.position.copy(player.pos);

// spawn the player's own car in the plaza
const playerCar = new Car({ color: 0xe0e0e0, isPlayer: true });
playerCar.place(4, 2, Math.PI);
player.inCar = playerCar;
playerCar.occupied = true;
player.mesh.visible = false;

// ---------- Police ----------------------------------------------------
const policeCars = [];
function spawnPolice(count) {
  for (let i = 0; i < count; i++) {
    if (policeCars.length >= 3) return;
    const car = new Car({ isPolice: true });
    const angle = rand(0, Math.PI * 2);
    const dist = rand(45, 70);
    const px = clamp(player.pos.x + Math.sin(angle) * dist, -CITY_HALF, CITY_HALF);
    const pz = clamp(player.pos.z + Math.cos(angle) * dist, -CITY_HALF, CITY_HALF);
    car.place(px, pz, angle);
    car.siren = Math.random() * Math.PI * 2;
    policeCars.push(car);
    scene.add(car.mesh);
  }
}
function clearPolice() {
  for (const car of policeCars) scene.remove(car.mesh);
  policeCars.length = 0;
}

function updatePolice(dt) {
  const targetPos = player.pos;
  for (const car of policeCars) {
    const toPlayer = new THREE.Vector3().subVectors(targetPos, car.pos);
    const dist = toPlayer.length();
    const desiredHeading = Math.atan2(toPlayer.x, toPlayer.z);
    let diff = wrapAngle(desiredHeading - car.heading);
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

// ---------- Input -----------------------------------------------------
const keys = new Set();
window.addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code === 'KeyF') tryToggleVehicle();
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

function readInput() {
  const up = keys.has('KeyW') || keys.has('ArrowUp') || mobileState.gas;
  const down = keys.has('KeyS') || keys.has('ArrowDown') || mobileState.brake;
  const left = keys.has('KeyA') || keys.has('ArrowLeft') || mobileState.left;
  const right = keys.has('KeyD') || keys.has('ArrowRight') || mobileState.right;
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
  const needed = player.wanted;
  if (policeCars.length < needed) spawnPolice(needed - policeCars.length);
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
  clearPolice();
  hideCenter();
  if (player.inCar) {
    player.inCar.occupied = false;
    player.inCar = null;
  }
  player.mesh.visible = true;
  player.pos.set(4, 0, 2);
  player.heading = Math.PI;
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

  mmCtx.save();
  mmCtx.beginPath();
  mmCtx.arc(cx, cy, w / 2, 0, Math.PI * 2);
  mmCtx.clip();

  mmCtx.fillStyle = '#3a3d41';
  for (const b of buildingColliders) {
    const x1 = cx + (b.minX - focus.x) * scale;
    const y1 = cy + (b.minZ - focus.z) * scale;
    const x2 = cx + (b.maxX - focus.x) * scale;
    const y2 = cy + (b.maxZ - focus.z) * scale;
    mmCtx.fillRect(x1, y1, x2 - x1, y2 - y1);
  }

  mmCtx.fillStyle = '#2f6b34';
  for (const p of parkCells) {
    const x = cx + (p.x - focus.x) * scale;
    const y = cy + (p.z - focus.z) * scale;
    const s = p.half * 2 * scale;
    mmCtx.fillRect(x - s / 2, y - s / 2, s, s);
  }

  mmCtx.fillStyle = '#ffd23f';
  for (const p of pickups) {
    const x = cx + (p.pos.x - focus.x) * scale;
    const y = cy + (p.pos.z - focus.z) * scale;
    mmCtx.beginPath();
    mmCtx.arc(x, y, 2.2, 0, Math.PI * 2);
    mmCtx.fill();
  }

  mmCtx.fillStyle = '#2050ff';
  for (const car of policeCars) {
    const x = cx + (car.pos.x - focus.x) * scale;
    const y = cy + (car.pos.z - focus.z) * scale;
    mmCtx.beginPath();
    mmCtx.arc(x, y, 3.2, 0, Math.PI * 2);
    mmCtx.fill();
  }

  const heading = player.inCar ? player.inCar.heading : player.heading;
  mmCtx.save();
  mmCtx.translate(cx, cy);
  mmCtx.rotate(heading);
  mmCtx.fillStyle = '#ff3b3b';
  mmCtx.beginPath();
  mmCtx.moveTo(0, -6);
  mmCtx.lineTo(4, 5);
  mmCtx.lineTo(-4, 5);
  mmCtx.closePath();
  mmCtx.fill();
  mmCtx.restore();

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
  camTarget.lerp(new THREE.Vector3(focus.x, 0, focus.z), Math.min(1, dt * 4.5));
  const desired = new THREE.Vector3(camTarget.x + camOffset.x, camOffset.y, camTarget.z + camOffset.z);
  camPos.lerp(desired, Math.min(1, dt * 4.5));
  camera.position.copy(camPos);
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
  const moveDir = new THREE.Vector3(
    (input.right ? 1 : 0) - (input.left ? 1 : 0),
    0,
    (input.down ? 1 : 0) - (input.up ? 1 : 0)
  );
  if (moveDir.lengthSq() > 0) {
    moveDir.normalize();
    const speed = 5.4;
    player.pos.addScaledVector(moveDir, speed * dt);
    player.heading = Math.atan2(moveDir.x, moveDir.z);
    collideWithBuildings(player.pos, 0.5);
  }
  player.mesh.position.set(player.pos.x, 0, player.pos.z);
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
    if (player.wanted < 0.5 && policeCars.length) clearPolice();
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
  updatePickups(dt, elapsed);
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

animate();
