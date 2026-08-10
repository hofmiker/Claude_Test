import * as THREE from './vendor/three.module.min.js';
import { DISTRICT, ACTION, MISSION, DIALOGS, POLICE, PLAYER_NAME, CITY_STYLE, LEVEL_ID } from './mission.js';

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
// matches buildGround()'s ground plane edge exactly, so the movement bound
// below never lets anything wander past the point where geometry actually
// stops rendering. Needed some room past the old CITY_HALF+ROAD_WIDTH*1.5 -
// the waterfront landmark's canal/pier reach out to CITY_HALF+30.
const WORLD_BOUND = CITY_HALF + ROAD_WIDTH * 3;

// same grid/road/collision engine for every level, but CITY_STYLE (from
// mission.js, chosen per active level) drives what actually gets built -
// dense, colorful night blocks for "Der Kessel" vs. low, pale, park-heavy
// villa streets for "Coastal Courier". Nothing below this line needs to
// know which level is active; it just reads CITY_STYLE.
const COLORS = CITY_STYLE.colors;
const BUILDING_PALETTE = CITY_STYLE.buildingPalette;

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
const buildingColliders = []; // {minX,maxX,minZ,maxZ} - solid, blocks movement
const waterColliders = [];    // same shape, also solid but drawn blue on the minimap
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

// grid cells reserved for hand-built mission landmarks instead of the usual
// random building/park roll - mission.js's waypoints used to be plain
// placeholder coordinates that landed wherever the procedural city happened
// to put a generic box, so "Sofias Werkstatt" or "der Kanal" never actually
// looked like a workshop or a canal. These cells are skipped in buildBlock()
// and built by buildLandmarks() instead, at exact coordinates mission.js's
// waypoints now point at directly.
// Only Level 1 ("Der Kessel") uses this grid at all - Level 2 ("Coastal
// Courier") is a completely separate, hand-placed world (see
// buildCoastalTown() below) with its own roads/buildings/beach, not a
// re-skin of this grid. buildCity() branches on LEVEL_ID before any of
// this runs.
const LANDMARK_CELLS = new Set(['2,4', '5,6', '1,1']);

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

// straight decorative road ribbon between two points (asphalt strip or a
// thin centerline stripe on top of one, reusing the same "flatten a plane,
// then yaw the whole group" trick as every other rotated-strip mesh in this
// file) - used by buildCoastalRoute() below instead of the grid's fixed
// horizontal/vertical stripes, since Level 3's road isn't on a grid at all.
function addRoadSegment(x1, z1, x2, z2, width, colorHex, y = 0.02) {
  const dx = x2 - x1, dz = z2 - z1;
  const len = Math.hypot(dx, dz);
  if (len < 0.01) return;
  const angle = Math.atan2(dx, dz);
  const group = new THREE.Group();
  group.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
  group.rotation.y = angle;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, len), flatMat(colorHex));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.receiveShadow = true;
  group.add(mesh);
  cityRoot.add(group);
}

// a distinct palm silhouette for the Coastal Courier beach - tall slender
// leaning trunk + a radial cluster of flattened frond wedges, same flat-
// shaded box/cylinder primitives as everywhere else, just a new arrangement
function addPalm(x, z) {
  const group = new THREE.Group();
  const lean = rand(-0.12, 0.12);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 5.2, 6), flatMat(0x8a6b45));
  trunk.position.y = 2.6;
  trunk.rotation.z = lean;
  trunk.castShadow = true;
  group.add(trunk);
  const frondCount = 6;
  for (let i = 0; i < frondCount; i++) {
    const angle = (i / frondCount) * Math.PI * 2;
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.6, 4), flatMat(0x3f8f3a));
    frond.position.set(Math.sin(lean) * 5.2 + Math.cos(angle) * 1.1, 5.2, Math.sin(angle) * 1.1);
    frond.rotation.x = Math.PI / 2.1;
    frond.rotation.z = angle;
    frond.castShadow = true;
    group.add(frond);
  }
  group.position.set(x, 0, z);
  cityRoot.add(group);
}

function buildBlock(i, j) {
  const { x, z } = blockCenter(i, j);
  const isPark = Math.random() < CITY_STYLE.parkChance;
  const isPlaza = i === Math.floor(GRID_COUNT / 2) && j === Math.floor(GRID_COUNT / 2);

  if (LANDMARK_CELLS.has(`${i},${j}`)) {
    // plain walkable/driveable ground only - buildLandmarks() puts the
    // actual hand-built structure here after the whole grid exists
    const plainSidewalk = new THREE.Mesh(
      new THREE.PlaneGeometry(BLOCK_SIZE, BLOCK_SIZE),
      flatMat(COLORS.sidewalk)
    );
    plainSidewalk.rotation.x = -Math.PI / 2;
    plainSidewalk.position.set(x, 0.01, z);
    plainSidewalk.receiveShadow = true;
    cityRoot.add(plainSidewalk);
    sidewalkCells.push({ x, z, half: BLOCK_SIZE / 2 - SIDEWALK_MARGIN });
    return;
  }

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
  const height = rand(CITY_STYLE.heightMin, CITY_STYLE.heightMax) * (Math.random() < CITY_STYLE.tallChance ? CITY_STYLE.tallMul : 1);
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
  // offset past the road edge (ROAD_WIDTH/2) and into the sidewalk margin,
  // not out on the road itself and not far enough to reach the building footprint
  const sidewalkOffset = ROAD_WIDTH / 2 + 1.4;
  for (let i = 0; i < roadLines.x.length; i += stride) {
    for (let j = 0; j < roadLines.z.length; j += stride) {
      const x = roadLines.x[i] + sidewalkOffset;
      const z = roadLines.z[j] + sidewalkOffset;
      const lamp = createStreetLampMesh();
      lamp.position.set(x, 0, z);
      cityRoot.add(lamp);
      const light = new THREE.PointLight(0xffdf9b, 26, 19, 2);
      light.position.set(x + 0.85, 5.3, z);
      cityRoot.add(light);
    }
  }
}

// ---------- Mission landmarks --------------------------------------------
// exact world coordinates for the LANDMARK_CELLS above - mission.js's
// waypoints are set to these same numbers, so "Sofias Werkstatt" etc. are
// no longer arbitrary placeholders that happen to land on a random box.
const LANDMARK_POS = {
  workshop: blockCenter(2, 4),
  waterfront: blockCenter(5, 6),
  garage: blockCenter(1, 1),
};

// Coastal Courier's own hand-placed world - fixed absolute coordinates, no
// grid math at all (see buildCoastalTown() below). mission.js's Level 2
// waypoints are set to these same numbers.
const COASTAL_POS = {
  villa: { x: -70, z: -110 },
  harbor: { x: -145, z: 90 },
  garage: { x: 10, z: -50 },
  pierBase: { x: 110, z: 87 }, // where the finale pier deck starts, at the promenade edge
};

function buildWorkshop({ x, z }) {
  const w = 24, d = 18, h = 9;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), flatMat(0x4a5a5e));
  body.position.set(x, h / 2, z);
  body.castShadow = true;
  body.receiveShadow = true;
  cityRoot.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, 0.6, d * 1.02), flatMat(0x1c1c1c));
  roof.position.set(x, h + 0.3, z);
  cityRoot.add(roof);
  buildingColliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  sidewalkCells.push({ x, z, half: (w + d) / 4 });

  const frontZ = z - d / 2 - 0.16;
  const door = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 0.3), flatMat(0x131313));
  door.position.set(x, 3, frontZ);
  cityRoot.add(door);
  for (let s = 0; s < 4; s++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.12, 0.06), flatMat(0x2a2a2a));
    slat.position.set(x, 1 + s * 1.3, frontZ - 0.2);
    cityRoot.add(slat);
  }
  const sign = new THREE.Mesh(new THREE.BoxGeometry(12, 1.6, 0.3), glowMat(0xffcc00, 0.7));
  sign.position.set(x, h - 0.5, frontZ);
  cityRoot.add(sign);

  // a parked project car out front, in for repairs - sells "workshop" at a
  // glance even before the player is close enough to read the sign. A plain
  // box silhouette rather than the full createCarMesh() factory, which
  // depends on VEHICLE_SPECS - a const declared further down the file than
  // buildCity()'s call site, so calling it from here would hit VEHICLE_SPECS
  // before its temporal-dead-zone initialization.
  const projectCarGroup = new THREE.Group();
  const carBody = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.9, 4.1), flatMat(0xd6a13a));
  carBody.position.y = 0.55;
  carBody.castShadow = true;
  const carCabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 1.9), flatMat(0x2a2f3a));
  carCabin.position.set(0, 1.15, -0.2);
  projectCarGroup.add(carBody, carCabin);
  projectCarGroup.position.set(x + w / 2 - 3, 0, z + d / 2 + 3.5);
  projectCarGroup.rotation.y = Math.PI * 0.5;
  cityRoot.add(projectCarGroup);
}

function buildWaterfront({ x, z }) {
  const w = 24, d = 24, h = 28;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), flatMat(0xa9666b));
  body.position.set(x, h / 2, z);
  body.castShadow = true;
  body.receiveShadow = true;
  cityRoot.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, 0.6, d * 1.02), flatMat(0x1c1c1c));
  roof.position.set(x, h + 0.3, z);
  cityRoot.add(roof);
  // window bands, same trick as the bus windshield strip - a few darker
  // insets read as floors of windows without modeling individual panes
  for (let f = 0; f < 5; f++) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.9, d * 1.01), flatMat(0x2a2f3a));
    band.position.set(x, 4 + f * 5, z);
    cityRoot.add(band);
  }
  buildingColliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  sidewalkCells.push({ x, z, half: (w + d) / 4 });

  // the canal runs along the far edge of this row - a dedicated water
  // material (lower roughness than the flat city palette) so it reads as
  // wet even under simple lighting
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x1b3a4a, roughness: 0.35, metalness: 0.15, flatShading: true });
  const canalNearZ = CITY_HALF + 2, canalFarZ = CITY_HALF + 30;
  const canalMinX = -CITY_HALF - 5, canalMaxX = CITY_HALF + 5;
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(canalMaxX - canalMinX, canalFarZ - canalNearZ),
    waterMat
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set((canalMinX + canalMaxX) / 2, 0.05, (canalNearZ + canalFarZ) / 2);
  water.receiveShadow = true;
  cityRoot.add(water);

  // pier: a solid deck bridging the water (no collider under it, unlike the
  // open water on either side, so the player can actually walk/drive out
  // onto it to reach the briefcase at the far end)
  const pierW = 7, pierFarZ = CITY_HALF + 24;
  const deckLen = pierFarZ - canalNearZ;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(pierW, 0.4, deckLen), flatMat(0x6b4a30));
  deck.position.set(x, 0.3, canalNearZ + deckLen / 2);
  deck.receiveShadow = true;
  cityRoot.add(deck);
  for (let p = 0; p <= 4; p++) {
    const pz = canalNearZ + (deckLen / 4) * p;
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.6, 6), flatMat(0x4a3320));
      post.position.set(x + side * (pierW / 2 - 0.3), -0.3, pz);
      cityRoot.add(post);
    }
  }
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.7, deckLen), flatMat(0x3a2a1a));
    rail.position.set(x + side * (pierW / 2 - 0.1), 0.85, canalNearZ + deckLen / 2);
    cityRoot.add(rail);
  }

  // water collision: open water on both sides of the pier, plus the strip
  // beyond its far end, so the pier itself is the only way out onto the canal
  waterColliders.push(
    { minX: canalMinX, maxX: x - pierW / 2, minZ: canalNearZ, maxZ: canalFarZ },
    { minX: x + pierW / 2, maxX: canalMaxX, minZ: canalNearZ, maxZ: canalFarZ },
    { minX: canalMinX, maxX: canalMaxX, minZ: pierFarZ, maxZ: canalFarZ }
  );
}

function buildParkingGarage({ x, z }) {
  const w = 26, d = 26, levelH = 5, levels = 3;
  const h = levelH * levels;
  buildingColliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  sidewalkCells.push({ x, z, half: (w + d) / 4 });

  for (let lvl = 0; lvl <= levels; lvl++) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), flatMat(0x6b6f73));
    slab.position.set(x, lvl * levelH, z);
    slab.receiveShadow = true;
    slab.castShadow = true;
    cityRoot.add(slab);
  }
  const corners = [
    [-1, -1], [1, -1], [-1, 1], [1, 1],
    [0, -1], [0, 1], // extra mid-span pillars front/back for a busier silhouette
  ];
  for (const [cx, cz] of corners) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.2, h, 1.2), flatMat(0x555a5e));
    pillar.position.set(x + cx * (w / 2 - 0.6), h / 2, z + cz * (d / 2 - 0.6));
    pillar.castShadow = true;
    cityRoot.add(pillar);
  }

  // illuminated "P" sign facing the street the player approaches from - two
  // boxes read as a blocky glyph at this low-poly scale without needing
  // actual text geometry
  const signZ = z - d / 2 - 0.3;
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.8, 5, 0.4), glowMat(0x2255ee, 1.2));
  stem.position.set(x - w / 2 + 2, h + 3, signZ);
  cityRoot.add(stem);
  const head = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.0, 0.4), glowMat(0x2255ee, 1.2));
  head.position.set(x - w / 2 + 2.9, h + 4.6, signZ);
  cityRoot.add(head);
}

// ---------- Level 2 ("Coastal Courier") landmarks -------------------------
// same construction technique as the Level 1 landmarks above (box bodies,
// flat/glow materials, a front-face detail, a collider) - Level 2 reuses
// the exact same engine and interaction, only the story/location dressing
// changes.
function buildVilla({ x, z }) {
  const w = 22, d = 18, h = 7;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), flatMat(0xede8dc));
  body.position.set(x, h / 2, z);
  body.castShadow = true;
  body.receiveShadow = true;
  cityRoot.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 1.04, 0.5, d * 1.04), flatMat(0xd8d2c0));
  roof.position.set(x, h + 0.25, z);
  cityRoot.add(roof);
  buildingColliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  sidewalkCells.push({ x, z, half: (w + d) / 4 });

  const frontZ = z - d / 2 - 0.16;
  const glassWall = new THREE.Mesh(new THREE.BoxGeometry(14, 4, 0.25), glowMat(0x9fc9d9, 0.35));
  glassWall.position.set(x, 3, frontZ);
  cityRoot.add(glassWall);

  // small pool out front, purely decorative (no collider) - a flat tinted
  // plane like the road markings elsewhere, not a new collision feature
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), flatMat(0x2ab8d9));
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(x, 0.03, frontZ - 6);
  cityRoot.add(pool);

  // palm-flavor via the existing park tree mesh - no new geometry, just
  // reused decoration placed for a Malibu feel
  addTree(x - w / 2 - 2, z + 2);
  addTree(x + w / 2 + 2, z - 3);
}

function buildHarbor({ x, z }) {
  const w = 20, d = 16, h = 8;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), flatMat(0x8a4a3a));
  body.position.set(x, h / 2, z);
  body.castShadow = true;
  body.receiveShadow = true;
  cityRoot.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, 0.6, d * 1.02), flatMat(0x1c1c1c));
  roof.position.set(x, h + 0.3, z);
  cityRoot.add(roof);
  buildingColliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  sidewalkCells.push({ x, z, half: (w + d) / 4 });

  const frontZ = z - d / 2 - 0.16;
  const door = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 0.3), flatMat(0x131313));
  door.position.set(x, 2.5, frontZ);
  cityRoot.add(door);

  // shipping containers + a crane sell "harbor" even from a distance
  const containerSpots = [
    { dx: -w / 2 - 4, dz: 3, rot: 0.2, color: 0xb35a2e },
    { dx: -w / 2 - 4, dz: -3.5, rot: -0.15, color: 0x2e7d6b },
    { dx: w / 2 + 4, dz: 2, rot: 0.1, color: 0xb35a2e },
  ];
  for (const c of containerSpots) {
    const container = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 6), flatMat(c.color));
    container.position.set(x + c.dx, 1.2, z + c.dz);
    container.rotation.y = c.rot;
    container.castShadow = true;
    cityRoot.add(container);
    buildingColliders.push({
      minX: x + c.dx - 3.2, maxX: x + c.dx + 3.2,
      minZ: z + c.dz - 1.3, maxZ: z + c.dz + 1.3,
    });
  }
  const cranePole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 11, 6), flatMat(0xb8a23a));
  cranePole.position.set(x + w / 2 + 4, 5.5, z + d / 2 + 3);
  cranePole.castShadow = true;
  cityRoot.add(cranePole);
  const craneArm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 9), flatMat(0xb8a23a));
  craneArm.position.set(x + w / 2 + 4, 10.5, z + d / 2 + 3 - 3.5);
  cityRoot.add(craneArm);
}

function buildLandmarks() {
  buildWorkshop(LANDMARK_POS.workshop);
  buildWaterfront(LANDMARK_POS.waterfront);
  buildParkingGarage(LANDMARK_POS.garage);
}

// ============================================================================
// Level 2 ("Coastal Courier") — a completely separate, hand-placed world,
// not a re-skin of the grid above. Every road/building/tree/umbrella below
// sits at an explicit, chosen coordinate (no Math.random() driving layout
// decisions, no loop over a uniform grid) so the town is the same every
// time you play it, the way a real level would be authored. It still runs
// on the exact same ground-plane/collision/traffic/pedestrian/minimap code
// as Level 1 - only the data fed into that code is bespoke.
// ============================================================================

const COASTAL_ROADS = { x: [-120, -20, 80], z: [-130, -90, -10, 70] };
// full water body along the south edge; OCEAN_NEAR_Z..FAR_Z is solid
// (impassable) everywhere except the gap the finale pier carves out
const OCEAN_NEAR_Z = 130, OCEAN_FAR_Z = 175, OCEAN_MIN_X = -170, OCEAN_MAX_X = 170;
const BEACH_NEAR_Z = 100, BEACH_FAR_Z = OCEAN_NEAR_Z;
// the nice boardwalk only runs along the beach/cafe stretch, not past the
// harbor's industrial patch further west
const PROMENADE_NEAR_Z = 87, PROMENADE_FAR_Z = BEACH_NEAR_Z;
const PROMENADE_MIN_X = -60, PROMENADE_MAX_X = OCEAN_MAX_X;

function buildCoastalGround() {
  const groundSize = CITY_SIZE + ROAD_WIDTH * 6;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(groundSize, groundSize), flatMat(COLORS.road));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  cityRoot.add(ground);

  // hand-picked street centerlines instead of a uniform grid loop - same
  // stripe rendering as buildGround(), just fed COASTAL_ROADS' coordinates
  for (const coord of COASTAL_ROADS.z) {
    roadLines.z.push(coord);
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(groundSize, 0.35), flatMat(COLORS.roadLine));
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(0, 0.02, coord);
    cityRoot.add(stripe);
  }
  for (const coord of COASTAL_ROADS.x) {
    roadLines.x.push(coord);
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.35, groundSize), flatMat(COLORS.roadLine));
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(coord, 0.02, 0);
    cityRoot.add(stripe);
  }
}

function buildOceanAndBeach() {
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(OCEAN_MAX_X - OCEAN_MIN_X, BEACH_FAR_Z - BEACH_NEAR_Z),
    flatMat(0xe8d19a)
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.015, (BEACH_NEAR_Z + BEACH_FAR_Z) / 2);
  sand.receiveShadow = true;
  cityRoot.add(sand);
  sidewalkCells.push({ x: -60, z: (BEACH_NEAR_Z + BEACH_FAR_Z) / 2, half: 55 });
  sidewalkCells.push({ x: 60, z: (BEACH_NEAR_Z + BEACH_FAR_Z) / 2, half: 55 });

  const promenade = new THREE.Mesh(
    new THREE.PlaneGeometry(PROMENADE_MAX_X - PROMENADE_MIN_X, PROMENADE_FAR_Z - PROMENADE_NEAR_Z),
    flatMat(0xd8cdb8)
  );
  promenade.rotation.x = -Math.PI / 2;
  promenade.position.set((PROMENADE_MIN_X + PROMENADE_MAX_X) / 2, 0.02, (PROMENADE_NEAR_Z + PROMENADE_FAR_Z) / 2);
  promenade.receiveShadow = true;
  cityRoot.add(promenade);
  sidewalkCells.push({ x: (PROMENADE_MIN_X + PROMENADE_MAX_X) / 2, z: (PROMENADE_NEAR_Z + PROMENADE_FAR_Z) / 2, half: (PROMENADE_MAX_X - PROMENADE_MIN_X) / 2 });

  const waterMat = new THREE.MeshStandardMaterial({ color: 0x2a6a86, roughness: 0.3, metalness: 0.15, flatShading: true });
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(OCEAN_MAX_X - OCEAN_MIN_X, OCEAN_FAR_Z - OCEAN_NEAR_Z),
    waterMat
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, 0.05, (OCEAN_NEAR_Z + OCEAN_FAR_Z) / 2);
  ocean.receiveShadow = true;
  cityRoot.add(ocean);
}

// the finale pier: a long deck reaching from the promenade out into open
// ocean, carving its own gap into the otherwise solid water collider -
// same "deck bridges the water, open water on either side blocks movement"
// pattern as Level 1's canal pier, just much longer for a proper "walk out
// over the sea" finale beat instead of a small local pond.
function buildBeachPier({ x, z }) {
  const pierW = 6, pierFarZ = 145;
  const deckLen = pierFarZ - z;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(pierW, 0.4, deckLen), flatMat(0x8a6a48));
  deck.position.set(x, 0.3, z + deckLen / 2);
  deck.receiveShadow = true;
  cityRoot.add(deck);
  const postCount = 6;
  for (let p = 0; p <= postCount; p++) {
    const pz = z + (deckLen / postCount) * p;
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2.2, 6), flatMat(0x5a3f28));
      post.position.set(x + side * (pierW / 2 - 0.3), -0.4, pz);
      cityRoot.add(post);
    }
  }
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.75, deckLen), flatMat(0x4a3320));
    rail.position.set(x + side * (pierW / 2 - 0.1), 0.85, z + deckLen / 2);
    cityRoot.add(rail);
  }
  waterColliders.push(
    { minX: OCEAN_MIN_X, maxX: x - pierW / 2, minZ: OCEAN_NEAR_Z, maxZ: OCEAN_FAR_Z },
    { minX: x + pierW / 2, maxX: OCEAN_MAX_X, minZ: OCEAN_NEAR_Z, maxZ: OCEAN_FAR_Z }
  );
}

function buildCafe({ x, z }) {
  const w = 10, d = 8, h = 6;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), flatMat(0xf2e6cf));
  body.position.set(x, h / 2, z);
  body.castShadow = true;
  body.receiveShadow = true;
  cityRoot.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 1.05, 0.4, d * 1.05), flatMat(0xb35a2e));
  roof.position.set(x, h + 0.2, z);
  cityRoot.add(roof);
  buildingColliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  sidewalkCells.push({ x, z, half: (w + d) / 4 });

  // outdoor seating facing the promenade/beach (+z side)
  for (const dx of [-2.5, 2.5]) {
    const table = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.7, 8), flatMat(0x3a2f28));
    table.position.set(x + dx, 0.35, z + d / 2 + 2.5);
    table.castShadow = true;
    cityRoot.add(table);
    addBeachUmbrella(x + dx, z + d / 2 + 2.5, 0xdedede, 2.0);
  }
}

function addBeachUmbrella(x, z, color, scale = 1) {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * scale, 0.06 * scale, 2.0 * scale, 6), flatMat(0xdedede));
  pole.position.set(x, 1.0 * scale, z);
  pole.castShadow = true;
  cityRoot.add(pole);
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.3 * scale, 0.7 * scale, 8), flatMat(color));
  canopy.position.set(x, 2.1 * scale, z);
  canopy.castShadow = true;
  cityRoot.add(canopy);
}

// purely decorative horizon landmark, sitting well past the ocean collider
// (never physically reachable) - two towers + a suspension-cable silhouette
// in International Orange, unmistakable even at this low-poly scale
function buildGoldenGateBridge() {
  const deckY = 22, towerH = 42, spanHalf = 62, z = 168;
  const color = 0xc1440e;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(spanHalf * 2 + 20, 1.2, 6), flatMat(color));
  deck.position.set(0, deckY, z);
  cityRoot.add(deck);
  for (const side of [-1, 1]) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(2.2, towerH, 4), flatMat(color));
    tower.position.set(side * spanHalf, towerH / 2, z);
    cityRoot.add(tower);
    const crossbeam = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 4.4), flatMat(color));
    crossbeam.position.set(side * spanHalf, towerH * 0.7, z);
    cityRoot.add(crossbeam);
    // cable silhouette: a shallow V of thin boxes from tower top down to the
    // deck at mid-span and back up to the next tower
    const cableSeg = new THREE.Mesh(new THREE.BoxGeometry(0.35, spanHalf * 0.9, 0.35), flatMat(0x8a8a8a));
    cableSeg.position.set(side * spanHalf * 0.5, deckY + spanHalf * 0.22, z);
    cableSeg.rotation.z = side * 0.62;
    cityRoot.add(cableSeg);
  }
}

function buildCoastalTown() {
  buildCoastalGround();
  buildOceanAndBeach();

  buildVilla(COASTAL_POS.villa);
  buildHarbor(COASTAL_POS.harbor);
  buildParkingGarage(COASTAL_POS.garage);
  buildBeachPier(COASTAL_POS.pierBase);
  buildGoldenGateBridge();

  buildCafe({ x: 40, z: 80 });
  buildCafe({ x: 150, z: 80 });

  const palmSpots = [
    [-40, 110], [0, 116], [50, 108], [90, 119], [130, 105], [20, 126], [70, 121], [140, 115],
  ];
  for (const [x, z] of palmSpots) addPalm(x, z);

  const umbrellaSpots = [
    [10, 112], [16, 110], [60, 116], [66, 113], [100, 109], [105, 112],
  ];
  for (const [x, z] of umbrellaSpots) addBeachUmbrella(x, z, pick([0xd6473c, 0xf0c53a, 0x3a8fd6]));
}

// ---------- Level 3 ("Golden Gate Run") world -----------------------------
// Levels 1 and 2 each already got their own from-scratch city builder
// (buildBlock()'s procedural grid for "Der Kessel"; buildCoastalTown()'s
// fully hand-authored beach town above for "Coastal Courier" - see that
// section's own header comment). Level 3's story - Malibu villa -> coast
// road -> harbor -> a boat chase across an open bay, under a bridge, on
// foot across that bridge, then an auto-driven limo to a pier - doesn't fit
// either shape: it's a linear route through a few hand-placed zones, not a
// grid and not a single town footprint. This is a third, genuinely
// different city builder, selected by LEVEL_ID === 'golden_gate_run' in
// buildCity() below. It still reuses everything level-agnostic: the
// collision arrays (buildingColliders/waterColliders), the landmark
// builders that take arbitrary {x,z} rather than grid cells (buildVilla/
// buildHarbor, reused unchanged from Level 1/2), pedestrians, pickups, the
// full mission/dialog/police-chase system. NOTE: buildPier2() (the old
// Level 1/2 Sausalito-style pier+gallery) no longer exists upstream - Level
// 2's pier was rebuilt into buildBeachPier(), which is tied to Level 2's
// own OCEAN_*/COASTAL_POS constants and isn't reusable here. Level 3 has
// its own buildSausalitoPier() below instead (ported from that old
// function), intentionally NOT shared with Level 2's landmarks - sharing a
// pier builder across two levels is exactly what broke this merge once
// already, see git history around this section.
const ROUTE3 = {
  villa: [0, 140],
  rp1: [30, 95],
  rp2: [-15, 55],
  rp3: [20, 15],
  harbor: [40, -20],
  harborDock: [35, -34],
  mooring: [-45, -72],
  bridgeWest: [-58, -78],
  bridgeEast: [58, -78],
  eastShore: [58, -95],
  limoP1: [30, -125],
  limoP2: [0, -148],
  pierRoad: [0, -150],
  pier: [0, -160],
};

// the bay is two water rectangles with a gap between them at the bridge's
// own z-span - the gap is where buildBridge()'s deck sits, so the crossing
// itself is walkable ground rather than fighting its own water collider.
// Land movers (pedestrians, cars, the on-foot player) are blocked by these
// exactly like any other waterCollider; the boat instead uses collideBoat()
// below, which ignores this array entirely and clamps to BAY_BOUNDS.
const BAY_BOUNDS = { minX: -50, maxX: 50, minZ: -118, maxZ: -30 };

function buildBridge() {
  const [wx, wz] = ROUTE3.bridgeWest;
  const [ex, ez] = ROUTE3.bridgeEast;
  const deckZ = (wz + ez) / 2;
  const deckLen = ex - wx + 12;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(deckLen, 0.4, 8), flatMat(COLORS.bridge));
  deck.position.set((wx + ex) / 2, 0.3, deckZ);
  deck.receiveShadow = true;
  deck.castShadow = true;
  cityRoot.add(deck);
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(deckLen, 0.9, 0.25), flatMat(0x8a2c10));
    rail.position.set((wx + ex) / 2, 0.9, deckZ + side * 3.9);
    cityRoot.add(rail);
  }
  // two towers (base + twin pillars + crossbar), plus a handful of vertical
  // hangers along the span - a cosmetic stand-in for suspension cables, not
  // a real catenary curve
  for (const [tx, tz] of [ROUTE3.bridgeWest, ROUTE3.bridgeEast]) {
    const towerBase = new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 4), flatMat(0x8a2c10));
    towerBase.position.set(tx, 0.25, tz);
    cityRoot.add(towerBase);
    for (const side of [-1, 1]) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 42, 8), flatMat(COLORS.bridge));
      pillar.position.set(tx, 21, tz + side * 3.4);
      pillar.castShadow = true;
      cityRoot.add(pillar);
    }
    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 8), flatMat(COLORS.bridge));
    crossbar.position.set(tx, 40, tz);
    cityRoot.add(crossbar);
    buildingColliders.push({ minX: tx - 2.2, maxX: tx + 2.2, minZ: tz - 2.2, maxZ: tz + 2.2 });
  }
  for (let i = 1; i < 7; i++) {
    const x = wx + (ex - wx) * (i / 7);
    const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 14, 5), flatMat(0x3a3a3a));
    hanger.position.set(x, 33, deckZ);
    cityRoot.add(hanger);
  }
}

// Sausalito pier + small art-deco gallery for Level 3's finale - ported
// from the old (now-removed) buildPier2(), kept as Level 3's own function
// rather than shared, see the "Level 3 world" header comment above.
function buildSausalitoPier({ x, z }) {
  const gx = x - 10, gz = z - 5;
  const gw = 14, gd = 10, gh = 8;
  const gallery = new THREE.Mesh(new THREE.BoxGeometry(gw, gh, gd), flatMat(0xe8ddc0));
  gallery.position.set(gx, gh / 2, gz);
  gallery.castShadow = true;
  gallery.receiveShadow = true;
  cityRoot.add(gallery);
  const galleryRoof = new THREE.Mesh(new THREE.BoxGeometry(gw * 1.03, 0.5, gd * 1.03), flatMat(0xc9a24b));
  galleryRoof.position.set(gx, gh + 0.25, gz);
  cityRoot.add(galleryRoof);
  buildingColliders.push({ minX: gx - gw / 2, maxX: gx + gw / 2, minZ: gz - gd / 2, maxZ: gz + gd / 2 });
  sidewalkCells.push({ x: gx, z: gz, half: (gw + gd) / 4 });

  // small, fully local pool + pier (separate from the main bay further
  // north - ROUTE3.pier sits well south of BAY_BOUNDS, no overlap)
  const px = x + 7, pz = z + 5;
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x2a6a86, roughness: 0.3, metalness: 0.15, flatShading: true });
  const poolMinX = px - 9, poolMaxX = px + 9, poolMinZ = pz - 7, poolMaxZ = pz + 7;
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(poolMaxX - poolMinX, poolMaxZ - poolMinZ), waterMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(px, 0.05, pz);
  pool.receiveShadow = true;
  cityRoot.add(pool);

  const pierW = 4, pierNearZ = poolMinZ, pierFarZ = poolMinZ + 11;
  const deckLen = pierFarZ - pierNearZ;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(pierW, 0.35, deckLen), flatMat(0x8a6a48));
  deck.position.set(px, 0.28, pierNearZ + deckLen / 2);
  deck.receiveShadow = true;
  cityRoot.add(deck);
  for (let p = 0; p <= 3; p++) {
    const pzPost = pierNearZ + (deckLen / 3) * p;
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.4, 6), flatMat(0x6b4a30));
      post.position.set(px + side * (pierW / 2 - 0.25), -0.25, pzPost);
      cityRoot.add(post);
    }
  }
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, deckLen), flatMat(0x5a3f28));
    rail.position.set(px + side * (pierW / 2 - 0.08), 0.75, pierNearZ + deckLen / 2);
    cityRoot.add(rail);
  }
  waterColliders.push(
    { minX: poolMinX, maxX: px - pierW / 2, minZ: poolMinZ, maxZ: poolMaxZ },
    { minX: px + pierW / 2, maxX: poolMaxX, minZ: poolMinZ, maxZ: poolMaxZ },
    { minX: poolMinX, maxX: poolMaxX, minZ: pierFarZ, maxZ: poolMaxZ }
  );
}

// short walkable dock bridging the boat's mooring point (open water) to the
// bridge's west tower landing - same "no collider on the deck itself"
// pattern as buildWaterfront/buildSausalitoPier's piers, purely visual/walkable
function buildMooringDock() {
  const [dx, dz] = ROUTE3.mooring;
  const [wx, wz] = ROUTE3.bridgeWest;
  const deckLen = Math.hypot(wx - dx, wz - dz);
  const group = new THREE.Group();
  group.position.set((dx + wx) / 2, 0, (dz + wz) / 2);
  group.rotation.y = Math.atan2(wx - dx, wz - dz);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(4, 0.35, deckLen), flatMat(0x6b4a30));
  deck.position.y = 0.28;
  deck.receiveShadow = true;
  group.add(deck);
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.7, deckLen), flatMat(0x3a2a1a));
    rail.position.set(side * 1.9, 0.85, 0);
    group.add(rail);
  }
  cityRoot.add(group);
}

function buildCoastalRoute() {
  // one big ground plane under the whole route (villa hill down to the
  // pier), instead of the grid's tiled ground + crosshatch stripe pattern -
  // a winding coast road doesn't look like a city grid and shouldn't read
  // as one. Sized to fully cover WORLD_BOUND (the hard movement clamp every
  // level shares) with margin, not just the route's own waypoints, so
  // nothing can ever drive/walk past the plane's edge into the void.
  const groundSpan = WORLD_BOUND * 2 + 20;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(groundSpan, groundSpan), flatMat(COLORS.ground));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 0);
  ground.receiveShadow = true;
  cityRoot.add(ground);

  const pchPts = [ROUTE3.villa, ROUTE3.rp1, ROUTE3.rp2, ROUTE3.rp3, ROUTE3.harbor];
  for (let i = 0; i < pchPts.length - 1; i++) {
    const [x1, z1] = pchPts[i], [x2, z2] = pchPts[i + 1];
    addRoadSegment(x1, z1, x2, z2, 12, COLORS.road, 0.02);
    addRoadSegment(x1, z1, x2, z2, 0.4, COLORS.roadLine, 0.03);
  }
  const limoPts = [ROUTE3.eastShore, ROUTE3.limoP1, ROUTE3.limoP2, ROUTE3.pierRoad];
  for (let i = 0; i < limoPts.length - 1; i++) {
    const [x1, z1] = limoPts[i], [x2, z2] = limoPts[i + 1];
    addRoadSegment(x1, z1, x2, z2, 11, COLORS.road, 0.02);
    addRoadSegment(x1, z1, x2, z2, 0.4, COLORS.roadLine, 0.03);
  }

  waterColliders.push(
    { minX: BAY_BOUNDS.minX, maxX: BAY_BOUNDS.maxX, minZ: -74, maxZ: BAY_BOUNDS.maxZ },
    { minX: BAY_BOUNDS.minX, maxX: BAY_BOUNDS.maxX, minZ: BAY_BOUNDS.minZ, maxZ: -82 }
  );
  const bayWaterMat = new THREE.MeshStandardMaterial({ color: COLORS.water, roughness: 0.28, metalness: 0.2, flatShading: true });
  const waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(120, 96), bayWaterMat);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.set(0, 0.05, -74);
  waterMesh.receiveShadow = true;
  cityRoot.add(waterMesh);

  buildBridge();
  buildMooringDock();

  // hand-built landmarks, reused as-is from Level 1/2 (they already take
  // arbitrary {x,z}, nothing grid-specific in them) - just placed along
  // this route instead of a reserved grid cell
  buildVilla({ x: ROUTE3.villa[0], z: ROUTE3.villa[1] });
  buildHarbor({ x: ROUTE3.harbor[0], z: ROUTE3.harbor[1] });
  buildSausalitoPier({ x: ROUTE3.pier[0], z: ROUTE3.pier[1] });

  // walkable/spawn cells so spawnPedestrians()/spawnPickup() (which run
  // unconditionally at module load) have somewhere to place things - ambient
  // traffic/police patrol are skipped entirely for this level instead (see
  // spawnTraffic()/spawnPolicePatrol() below), since their lane-following
  // logic assumes the grid's straight roadLines.x/z, which a winding route
  // doesn't have
  sidewalkCells.push(
    { x: ROUTE3.villa[0], z: ROUTE3.villa[1] + 14, half: 16 },
    { x: ROUTE3.harbor[0] - 4, z: ROUTE3.harbor[1] + 10, half: 14 },
    { x: ROUTE3.pier[0], z: ROUTE3.pier[1] + 12, half: 14 }
  );
}

function buildCity() {
  if (LEVEL_ID === 'der_kessel') {
    buildGround();
    for (let i = 0; i < GRID_COUNT; i++) {
      for (let j = 0; j < GRID_COUNT; j++) buildBlock(i, j);
    }
    buildLandmarks();
  } else if (LEVEL_ID === 'golden_gate_run') {
    buildCoastalRoute();
  } else {
    buildCoastalTown();
  }
  addStreetLamps();
}
buildCity();

const _wallNormal = { x: 0, z: 0 };
// outNormal (optional): filled with the collision's push-out direction, so
// a caller with an actual velocity (cars) can bleed off only the component
// that drives INTO the wall and keep the rest as a sliding deflection,
// instead of the caller only learning "yes/no" and having to guess.
function collideWithBuildings(pos, radius, outNormal) {
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
      if (outNormal) { outNormal.x = dx / dist; outNormal.z = dz / dist; }
      return true;
    }
  }
  // open water (either side of the waterfront's pier) is impassable too,
  // same push-out behavior as a building
  for (const b of waterColliders) {
    const cx = clamp(pos.x, b.minX, b.maxX);
    const cz = clamp(pos.z, b.minZ, b.maxZ);
    const dx = pos.x - cx, dz = pos.z - cz;
    const distSq = dx * dx + dz * dz;
    if (distSq < radius * radius) {
      const dist = Math.sqrt(distSq) || 0.001;
      const push = radius - dist;
      pos.x += (dx / dist) * push;
      pos.z += (dz / dist) * push;
      if (outNormal) { outNormal.x = dx / dist; outNormal.z = dz / dist; }
      return true;
    }
  }
  pos.x = clamp(pos.x, -WORLD_BOUND, WORLD_BOUND);
  pos.z = clamp(pos.z, -WORLD_BOUND, WORLD_BOUND);
  return false;
}

// boat collision: the inverse of collideWithBuildings. Land (buildings,
// bridge towers) is the obstacle; the bay's own waterColliders are NOT
// checked at all (that array exists to keep *land* movers out of the water,
// not to fence the boat in) - instead the boat is clamped to BAY_BOUNDS,
// the open-water rectangle it's actually allowed to roam.
function collideBoat(pos, radius, outNormal) {
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
      if (outNormal) { outNormal.x = dx / dist; outNormal.z = dz / dist; }
      return true;
    }
  }
  const clampedX = clamp(pos.x, BAY_BOUNDS.minX, BAY_BOUNDS.maxX);
  const clampedZ = clamp(pos.z, BAY_BOUNDS.minZ, BAY_BOUNDS.maxZ);
  const hitBound = clampedX !== pos.x || clampedZ !== pos.z;
  pos.x = clampedX;
  pos.z = clampedZ;
  return hitBound;
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
  // Level 3 ("Golden Gate Run") vehicles - boat is player-driven (manual
  // chase across the bay), limo is scripted/auto-driven (see
  // missionState.autoDrive) so its handling numbers barely matter beyond
  // "not twitchy"; both get turnMul < 1 so they feel looser/heavier to turn
  // than the base car, reusing the exact same physicsStep() formula.
  boat: { halfW: 1.3, halfL: 3.0, wheelR: 0, maxSpeedMul: 1.35, accelMul: 0.8, mass: 1.6, turnMul: 0.7 },
  limo: { halfW: 1.15, halfL: 3.2, wheelR: 0.42, maxSpeedMul: 0.85, accelMul: 0.6, mass: 2.0, turnMul: 0.75 },
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

function createCarMesh(color, isPolice, type, isPlayer) {
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
  } else if (type === 'boat') {
    // hull + angled bow (a scaled/rotated box instead of a proper tapered
    // shape - reads fine as a speedboat at this low-poly scale) + a small
    // cabin, no wheels at all
    const hull = new THREE.Mesh(new THREE.BoxGeometry(spec.halfW * 2, 0.7, spec.halfL * 1.5), flatMat(color));
    hull.position.set(0, 0.42, -spec.halfL * 0.25);
    hull.castShadow = true;
    group.add(hull);
    group.userData.bodyMesh = hull;
    group.userData.bodyHalfExtents = { x: spec.halfW, y: 0.35, z: spec.halfL * 0.75 };
    const bow = new THREE.Mesh(new THREE.BoxGeometry(spec.halfW * 1.7, 0.62, spec.halfL * 1.1), flatMat(color));
    bow.position.set(0, 0.4, spec.halfL * 0.55);
    bow.rotation.x = -0.28;
    bow.castShadow = true;
    group.add(bow);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.6, 1.3), flatMat(0x1c1f24));
    cabin.position.set(0, 1.05, -0.5);
    cabin.castShadow = true;
    group.add(cabin);
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.36, 0.1), glowMat(0x9fd9e8, 0.15));
    windshield.position.set(0, 1.15, 0.15);
    group.add(windshield);
    const wake = new THREE.PointLight(0xbfe8ff, 0.6, 5);
    wake.position.set(0, 0.4, -spec.halfL);
    group.add(wake);
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
    if (isPlayer) {
      // the player's own car gets two distinct headlights
      for (const side of [-1, 1]) {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.22, 0.08), glowMat(0xfff2b0));
        hl.position.set(side * 0.62, 0.65, 2.16);
        group.add(hl);
      }
    } else {
      // every other car gets a single headlight, with a bit of per-car
      // variance in size/offset/tint so the traffic doesn't look identical
      const hlWidth = 0.85 + rand(-0.15, 0.18);
      const hlOffset = rand(-0.14, 0.14);
      const hlTint = pick([0xfff2b0, 0xffe9a0, 0xfff6cc]);
      const headlight = new THREE.Mesh(new THREE.BoxGeometry(hlWidth, 0.2, 0.08), glowMat(hlTint));
      headlight.position.set(hlOffset, 0.65, 2.16);
      group.add(headlight);
    }
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
    this.mesh = createCarMesh(color, isPolice, type, isPlayer);
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
      const turnMul = VEHICLE_SPECS[this.type].turnMul ?? 1;
      const turnRate = steer * 2.1 * speedFactor * sdir * turnMul;
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
    const hitWall = this.type === 'boat'
      ? collideBoat(this.pos, this.radius, _wallNormal)
      : collideWithBuildings(this.pos, this.radius, _wallNormal);
    if (hitWall && Math.abs(preImpactSpeed) > 4) {
      if (this.crashCooldown <= 0) {
        triggerCrash(this.pos, Math.abs(preImpactSpeed), this === player.inCar);
        const impactSign = Math.sign(preImpactSpeed) || 1;
        applyCarDamage(this, dir.x * impactSign, dir.z * impactSign);
        this.crashCooldown = 0.35;
      }
      // a head-on hit still bleeds real speed off, but a glancing graze
      // along the wall keeps most of it and slides tangentially instead of
      // just stalling in place - mirrors how car-vs-car collisions already
      // only kill the velocity component driving into the other body.
      const align = Math.abs(dir.x * _wallNormal.x + dir.z * _wallNormal.z);
      this.speed *= 1 - 0.7 * align;
      const tx = -_wallNormal.z, tz = _wallNormal.x;
      const tangentSign = Math.sign(dir.x * tx + dir.z * tz) || 1;
      const slideSpeed = Math.abs(preImpactSpeed) * 0.55 * (1 - align);
      this.shove.x += tx * tangentSign * slideSpeed;
      this.shove.z += tz * tangentSign * slideSpeed;
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

    // ramming an on-duty patrol car (not already part of an active manhunt)
    // hard enough starts a full chase, same as the scripted GRAB_ITEM alarm
    if (!policeState.active && impactSpeed > 9) {
      const involvesPlayerCar = a === player.inCar || b === player.inCar;
      const rammedPatrolCop = (a.isPolice && !chaseCops.includes(a)) ? a
        : (b.isPolice && !chaseCops.includes(b)) ? b : null;
      if (involvesPlayerCar && rammedPatrolCop) startPolice();
    }
  }
}

function updateCarCollisions(dt) {
  // a chase cop who got out to run on foot shouldn't leave their parked
  // car behind as an invisible obstacle for real traffic
  const cars = [playerCar, ...trafficCars, ...policeCars, ...chaseCops.filter((c) => !c.onFoot)];
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
  // ambient lane traffic drives along the grid's straight roadLines.x/z;
  // Level 3's winding coastal route has no such lines (see buildCoastalRoute
  // above) - rather than have cars drive straight through the scenery,
  // ambient traffic is simply skipped for this level. The mission-critical
  // police chase (chaseCops) is unaffected - it seeks the player directly
  // and never touches roadLines.
  if (LEVEL_ID === 'golden_gate_run') return;
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

// how much a lane car should brake for another car sitting ahead of it in
// its own path - returns 1 (full speed) down to 0 (stopped), so ambient
// traffic queues/waits at its own initiative instead of ramming into itself
function laneBrakeFactor(car, other, dir, lookAhead) {
  const dx = other.pos.x - car.pos.x, dz = other.pos.z - car.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist > lookAhead) return 1;
  const fwd = dx * dir.x + dz * dir.z;
  if (fwd <= 0.1) return 1; // not ahead of us
  const lateral = Math.abs(dx * dir.z - dz * dir.x);
  if (lateral > car.halfWidth + other.halfWidth + 1.1) return 1; // not in our path
  const clearance = fwd - (car.halfLength + other.halfLength + 1.6);
  return clamp(clearance / lookAhead, 0, 1);
}

// straight-line lane driving shared by ambient traffic and patrolling police
function stepLaneCar(car, dt) {
  const dir = new THREE.Vector3(Math.sin(car.heading), 0, Math.cos(car.heading));

  let brake = 1;
  const lookAhead = 10 + car.halfLength;
  for (const other of trafficCars) {
    if (other !== car) brake = Math.min(brake, laneBrakeFactor(car, other, dir, lookAhead));
  }
  for (const other of policeCars) {
    if (other !== car) brake = Math.min(brake, laneBrakeFactor(car, other, dir, lookAhead));
  }

  car.pos.addScaledVector(dir, car.speed * brake * dt);
  // decaying knockback from collisions (rammed from the side, etc.) - without
  // this, a shove computed on impact just gets silently discarded here
  car.pos.addScaledVector(car.shove, dt);
  car.shove.multiplyScalar(Math.max(0, 1 - dt * 3.2));
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

  // female-flagged characters get one clear, unmistakable silhouette cue
  // instead of relying on subtler proportion tweaks that would barely read
  // at this low-poly scale: a long ponytail down the back, plus a flared
  // skirt instead of straight hips/pants further below.
  if (PC.female) {
    const ponytail = charCyl(0.052, 0.020, 0.36, PC.hair, 6);
    ponytail.position.set(0, -0.19, -0.150);
    ponytail.rotation.x = 0.32;
    headJoint.add(ponytail);
  }

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
  if (PC.female) {
    // flared skirt hem instead of straight hips/shorts - same waist anchor
    // (top edge) as the male cylinder below so it attaches at the same
    // height, just flaring outward and hanging lower over the thighs
    const skirt = charCyl(0.20, 0.37, 0.34, PC.pants);
    skirt.position.y = -0.075;
    hipsGrp.add(skirt);
  } else {
    hipsGrp.add(charCyl(0.23, 0.21, 0.19, PC.pants));
  }

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

// player wears one solid, uniform outfit color (head-to-toe: shirt/pants/
// shoes all match) so they stay instantly recognizable among pedestrians
// and named NPCs, which each keep their own distinct palette (see
// NPC_BY_STEP / createPedMesh) instead of sharing this one.
const PLAYER_PALETTE = { shirt: 0xff2e88, pants: 0xff2e88, shoes: 0xff2e88 };
const player = {
  mesh: createPlayerMesh(PLAYER_PALETTE),
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

// spawn the player's own car - the grid levels start in the plaza; a level
// can override this via DISTRICT.spawn (Level 3 starts near the villa
// instead, since there's no plaza on a linear coastal route)
const SPAWN_POS = DISTRICT.spawn?.pos || [4, 2];
const SPAWN_HEADING = DISTRICT.spawn?.heading ?? Math.PI;
const playerCar = new Car({ color: 0xe0e0e0, isPlayer: true });
playerCar.place(SPAWN_POS[0], SPAWN_POS[1], SPAWN_HEADING);
player.inCar = playerCar;
playerCar.occupied = true;
player.mesh.visible = false;

// real forward-facing headlight beams, only on the player's own car (kept to
// two instances for performance; other cars just glow via their headlight mesh)
if (isNight) {
  for (const side of [-1, 1]) {
    const headSpot = new THREE.SpotLight(0xfff2b0, 22, 32, Math.PI / 8, 0.55, 1.3);
    headSpot.position.set(side * 0.62, 0.65, 2.2);
    const headSpotTarget = new THREE.Object3D();
    headSpotTarget.position.set(side * 0.62, 0, 12);
    playerCar.mesh.add(headSpot, headSpotTarget);
    headSpot.target = headSpotTarget;
  }
}

// ---------- Ambient police: pure background flavor, patrol forever --------
// (the actual manhunt is a separate system below, driven by mission.js/POLICE)
const POLICE_PATROL_COUNT = 5;
const policeCars = [];

function spawnPolicePatrol() {
  if (LEVEL_ID === 'golden_gate_run') return; // see spawnTraffic() above
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
const policeState = { active: false, safeTimer: 0, lastRampTime: 0, surroundTimer: 0 };

// dark navy uniform, distinct from both the player's pink outfit and any
// NPC palette, used when a chase cop gets out to chase the player on foot
const OFFICER_PALETTE = { shirt: 0x1c3a6e, pants: 0x14213d, shoes: 0x0c0c0c, hair: 0x0e0e0e };
const OFFICER_SPEED = CHAR_SPEED_MAX * 1.08;

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
  car.onFoot = false;
  car.officer = { mesh: createPlayerMesh(OFFICER_PALETTE), animT: 0, jumpState: 'none', idleTimer: 0, scratchPhase: 0 };
  car.officer.mesh.visible = false;
  scene.add(car.officer.mesh);
  chaseCops.push(car);
  scene.add(car.mesh);
}

function startPolice() {
  policeState.active = true;
  policeState.safeTimer = 0;
  policeState.surroundTimer = 0;
  policeState.lastRampTime = elapsed;
  for (let i = 0; i < POLICE.units.initial; i++) spawnChaseCop();
}

function stopPolice() {
  policeState.active = false;
  policeState.surroundTimer = 0;
  for (const car of chaseCops) {
    scene.remove(car.mesh);
    scene.remove(car.officer.mesh);
  }
  chaseCops.length = 0;
}

function updatePoliceChase(dt) {
  if (!policeState.active) return;
  const focus = player.inCar ? player.inCar.pos : player.pos;
  const playerOnFoot = !player.inCar;
  const playerMax = (player.inCar ? player.inCar.maxSpeed : playerCar.maxSpeed) || playerCar.baseMaxSpeed;

  if (elapsed - policeState.lastRampTime >= POLICE.units.rampEverySeconds && chaseCops.length < POLICE.units.max) {
    spawnChaseCop();
    policeState.lastRampTime = elapsed;
  }

  let anyInSight = false;
  const SURROUND_RADIUS = 11;
  const nearAngles = [];
  for (const car of chaseCops) {
    const toPlayer = new THREE.Vector3().subVectors(focus, car.pos);
    const dist = toPlayer.length();
    if (dist < POLICE.ai.sightRadius) anyInSight = true;
    if (dist < SURROUND_RADIUS) nearAngles.push(Math.atan2(-toPlayer.x, -toPlayer.z));

    // player fled on foot: cops park their car and chase on foot too,
    // instead of visibly tailing a runner with a parked-looking vehicle
    if (playerOnFoot) {
      if (!car.onFoot) {
        car.onFoot = true;
        car.mesh.visible = false;
        car.officer.mesh.visible = true;
        car.speed = 0;
      }
      const dirLen = dist || 1;
      const stepDist = Math.min(dist, OFFICER_SPEED * dt);
      const moving = dist > 0.5;
      if (moving) {
        car.pos.x += (toPlayer.x / dirLen) * stepDist;
        car.pos.z += (toPlayer.z / dirLen) * stepDist;
      }
      car.heading = Math.atan2(toPlayer.x, toPlayer.z);
      collideWithBuildings(car.pos, 0.5);
      car.officer.mesh.position.set(car.pos.x, 0, car.pos.z);
      car.officer.mesh.rotation.y = car.heading;
      animateCharacter(car.officer, dt, { up: moving, down: false, left: false, right: false });
    } else {
      if (car.onFoot) {
        car.onFoot = false;
        car.mesh.visible = true;
        car.officer.mesh.visible = false;
        car.speed = 0;
        car.syncMesh();
      }
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
    }

    // a land-bound chase cop can never actually touch a boat out on the
    // bay - without this, "dist" (measured straight-line, before this
    // frame's own collideBoat/collideWithBuildings clamp) could dip under
    // the bust threshold whenever the boat hugs the shoreline a cop is
    // stuck at, busting the player through solid water.
    const playerOnBoat = player.inCar && player.inCar.type === 'boat';
    if (POLICE.bust.onCollision && dist < 3.2 && !missionState.gameOver && !playerOnBoat) {
      failMission();
      return;
    }
  }

  // encircled: cops spread across most of the compass around the player,
  // all close by, held continuously for POLICE.bust.surroundSeconds - same
  // "cops can't actually reach a boat" exemption as the single-collision
  // bust check above
  if (POLICE.bust.surroundSeconds && nearAngles.length >= 2 && !(player.inCar && player.inCar.type === 'boat')) {
    nearAngles.sort((a, b) => a - b);
    let maxGap = 0;
    for (let i = 0; i < nearAngles.length; i++) {
      const next = nearAngles[(i + 1) % nearAngles.length];
      let gap = next - nearAngles[i];
      if (gap < 0) gap += Math.PI * 2;
      if (gap > maxGap) maxGap = gap;
    }
    const surrounded = maxGap < Math.PI * 1.15;
    if (surrounded) {
      policeState.surroundTimer += dt;
      if (policeState.surroundTimer >= POLICE.bust.surroundSeconds && !missionState.gameOver) {
        failMission();
        return;
      }
    } else {
      policeState.surroundTimer = 0;
    }
  } else {
    policeState.surroundTimer = 0;
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
  v.x = clamp(v.x, -WORLD_BOUND, WORLD_BOUND);
  v.z = clamp(v.z, -WORLD_BOUND, WORLD_BOUND);
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
  dialogExitedCar: null,
  gameOver: false,
};

// people the story mentions are actually standing where the story happens -
// keyed by step id since mission.js's own shape stays untouched. Shirt colors
// match each character's SPEAKER_STYLE border color so the same person reads
// as the same color in the chat, on the minimap tint and on their model.
const NPC_BY_STEP = {
  FIND_CONTACT: { palette: { shirt: 0xa05ae6, pants: 0x2b2116, hair: 0x241a14, female: true }, offset: [1.7, -0.4] },
  GRAB_ITEM: { palette: { shirt: 0xffaa28, pants: 0x1c1c1c, hair: 0x100c0a }, offset: [-1.3, -0.9] },
  // Level 2 ("Coastal Courier") - step ids are distinct strings from Level 1's,
  // so both can share this one dict without collisions.
  L2_VILLA: { palette: { shirt: 0x28be96, pants: 0x1c2b28, hair: 0x2a2018 }, offset: [1.5, -0.5] },
  L2_HARBOR: { palette: { shirt: 0xffaa28, pants: 0x2a2a2a, hair: 0x100c0a }, offset: [-1.3, -0.9] },
  L2_PIER: { palette: { shirt: 0xffe6bf, pants: 0xffe6bf, hair: 0x5c3a22, female: true }, offset: [0, 52] },
  // Level 3 ("Golden Gate Run") - same cast/palettes as Level 2's Viktor/
  // Mechaniker/Elaine (deliberate, see mission.js's Level 3 header comment),
  // distinct step ids so this shares the one dict without collisions.
  L3_VILLA: { palette: { shirt: 0x28be96, pants: 0x1c2b28, hair: 0x2a2018 }, offset: [1.5, -0.5] },
  L3_HARBOR: { palette: { shirt: 0xffaa28, pants: 0x2a2a2a, hair: 0x100c0a }, offset: [-1.3, -0.9] },
  L3_PIER: { palette: { shirt: 0xffe6bf, pants: 0xffe6bf, hair: 0x5c3a22, female: true }, offset: [7, 9] },
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

  // optional flavor toast on activation (e.g. Level 3's "missed call from
  // Elaine" beat during the limo ride) - reuses the existing toast, not a
  // new notification system
  if (step.notify) showSub(step.notify);

  // steps with no world target (nothing to walk/drive up to) resolve as soon
  // as they become active: play their dialog immediately, or just chain on
  if (!step.waypoint && !step.pickup) {
    if (step.dialog) startDialog(step.dialog, () => runStepOnComplete(step));
    else runStepOnComplete(step);
  }
}

// Level 3 only: puts the player into a fresh scripted vehicle (boat or
// limo) instead of the usual "walk up and press F" boarding. Whatever the
// player was in before gets cleanly released first (occupied=false) so it
// doesn't linger as a phantom "still occupied" car - it just becomes an
// inert prop, same as any other car left parked mid-level.
// cfg: { type, pos: [x,z], heading, color?, autoDrivePath?: [[x,z], ...] }
// autoDrivePath present -> the vehicle drives itself (see updateAutoDrive()
// below) and stopPolice() fires immediately (matches the story beat: once
// Marcus is in the getaway limo, the chase is over). Absent -> normal
// player-controlled vehicle (the boat is manually driven).
function boardVehicle(cfg) {
  if (player.inCar) player.inCar.occupied = false;
  const spot = resolveWorldPoint(cfg.pos);
  const car = new Car({ type: cfg.type, isPlayer: true, color: cfg.color ?? (cfg.type === 'limo' ? 0xf2f2f2 : undefined) });
  car.place(spot.x, spot.z, cfg.heading || 0);
  car.occupied = true;
  player.inCar = car;
  player.mesh.visible = false;
  if (cfg.autoDrivePath && cfg.autoDrivePath.length) {
    stopPolice();
    missionState.autoDrive = { car, path: cfg.autoDrivePath.map(resolveWorldPoint), index: 0 };
  } else {
    missionState.autoDrive = null;
  }
}

// mirrors tryToggleVehicle()'s exit branch, but silent (no "Zu Fuß
// unterwegs" toast) and never returns the vehicle to trafficCars - used for
// scripted transitions (leaving the boat at the mooring, stepping out of
// the limo at the pier), not a manual player action
function forceExitVehicle() {
  const car = player.inCar;
  if (!car) return;
  car.occupied = false;
  const exitDir = new THREE.Vector3(Math.cos(car.heading), 0, -Math.sin(car.heading));
  player.pos.copy(car.pos).addScaledVector(exitDir, 2.6);
  player.heading = car.heading;
  player.mesh.visible = true;
  player.inCar = null;
  if (missionState.autoDrive && missionState.autoDrive.car === car) missionState.autoDrive = null;
}

// drives an autoDrive vehicle (the Level 3 limo) toward each point of its
// path in turn using the same seek-and-steer approach as the police chase
// AI, just aimed at waypoints instead of the player. The mission's own
// waypoint/triggerRadius system (updateMission()) independently detects
// arrival at the step's real target and advances the story - this function
// only has to move the car, not know anything about missions.
function updateAutoDrive(dt) {
  const ad = missionState.autoDrive;
  if (!ad || !ad.car) return;
  const target = ad.path[ad.index];
  if (!target) { missionState.autoDrive = null; return; }
  const dx = target.x - ad.car.pos.x, dz = target.z - ad.car.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 5) {
    ad.index++;
    if (ad.index >= ad.path.length) { missionState.autoDrive = null; return; }
  }
  const desiredHeading = Math.atan2(dx, dz);
  const diff = wrapAngle(desiredHeading - ad.car.heading);
  const steer = clamp(diff * 1.4, -1, 1);
  const throttle = dist > 8 ? 1 : 0.4;
  ad.car.physicsStep(dt, { throttle, steer, handbrake: false });
}

function advanceStep() {
  activateStep(missionState.stepIndex + 1);
}

function runStepOnComplete(step) {
  // Level 3 only: board a scripted vehicle (boat/limo) and/or force the
  // player out of whatever they were in, as part of completing this step -
  // see boardVehicle()/forceExitVehicle() above
  if (step.vehicleAfter) boardVehicle(step.vehicleAfter);
  if (step.exitVehicleOnComplete && player.inCar) forceExitVehicle();

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
  // hides HUD/touch controls and pauses the sim for every dialog, not just
  // the intro one - see body.dialog-active and animate()'s paused branch
  document.body.classList.add('dialog-active');

  // a face-to-face conversation (a real NPC standing there, not just a
  // phone voice) looks wrong with the player still sitting in the car they
  // drove up in - hop out for the duration, same door-exit placement as the
  // manual exit key, and face the NPC; hopped back in again once the
  // dialog ends (see advanceDialogLine below).
  missionState.dialogExitedCar = null;
  if (player.inCar && missionState.npcMesh) {
    missionState.dialogExitedCar = player.inCar;
    tryToggleVehicle(); // player.inCar is set, so this exits
    const npc = missionState.npcMesh.position;
    player.heading = Math.atan2(npc.x - player.pos.x, npc.z - player.pos.z);
  }

  showDialogLine();
}

function advanceDialogLine() {
  missionState.dialogLineIndex++;
  if (missionState.dialogLineIndex >= missionState.dialogLines.length) {
    dialogNextRow.classList.remove('show');
    clearDialogHistory();
    missionState.inDialog = false;
    // every dialog (not just the intro) hides HUD/touch controls and pauses
    // the sim while it's on screen - reveal/resume again now it's done
    document.body.classList.remove('dialog-active');
    // hop back into whatever car the player stepped out of to have this
    // conversation, if any - guarded by !occupied in case something else
    // already claimed it in the meantime
    const exitedCar = missionState.dialogExitedCar;
    missionState.dialogExitedCar = null;
    if (exitedCar && !exitedCar.occupied) {
      exitedCar.occupied = true;
      player.inCar = exitedCar;
      player.mesh.visible = false;
    }
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

const btnActionEl = document.getElementById('btnAction');
btnActionEl?.addEventListener('touchstart', (e) => { e.preventDefault(); handleActionButton(); });
btnActionEl?.addEventListener('click', handleActionButton);
function triggerJump() { if (!player.inCar) player.jumpBuf = true; }
document.getElementById('btnJump')?.addEventListener('touchstart', (e) => { e.preventDefault(); triggerJump(); });
document.getElementById('btnJump')?.addEventListener('click', triggerJump);

// ---------- Analog joystick (steering + throttle in one), ported from
// starship-launch/toy-story: a fixed circular pad instead of drag-anywhere,
// so it can't be triggered by accidentally touching HUD/dialog elements.
const touchMove = { forward: 0, back: 0, left: 0, right: 0 };
const joyEl = document.getElementById('joystick');
const joyKnobEl = document.getElementById('joystickKnob');
const JOY_RADIUS = 46;
let joyPointerId = null;
// independent per-axis clamp (a square range, not a circular one) so
// pushing the knob diagonally still gives full steer AND full throttle at
// the same time - a circular clamp silently caps both to ~70% whenever
// they're combined, which read as "steering got weaker" while driving.
function setJoyFromPoint(clientX, clientY) {
  const rect = joyEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
  const dx = clamp(clientX - cx, -JOY_RADIUS, JOY_RADIUS);
  const dy = clamp(clientY - cy, -JOY_RADIUS, JOY_RADIUS);
  joyKnobEl.style.transform = `translate(${dx}px, ${dy}px)`;
  touchMove.left = Math.max(0, -dx / JOY_RADIUS);
  touchMove.right = Math.max(0, dx / JOY_RADIUS);
  touchMove.forward = Math.max(0, -dy / JOY_RADIUS);
  touchMove.back = Math.max(0, dy / JOY_RADIUS);
}
function resetJoy() {
  joyKnobEl.style.transform = '';
  touchMove.forward = touchMove.back = touchMove.left = touchMove.right = 0;
  joyPointerId = null;
}
if (joyEl) {
  joyEl.addEventListener('pointerdown', (e) => {
    joyPointerId = e.pointerId;
    try { joyEl.setPointerCapture(e.pointerId); } catch { /* still tracked via window listeners below */ }
    setJoyFromPoint(e.clientX, e.clientY);
    e.preventDefault();
  });
  // move/up/cancel listen on window (not joyEl) and are pointerId-gated:
  // a real finger easily drifts outside the small 92px pad while pushed to
  // full deflection, and 'pointerleave' firing on that drift (some mobile
  // browsers fire it by physical position even under setPointerCapture)
  // was snapping the knob straight back to center mid-drag.
  window.addEventListener('pointermove', (e) => {
    if (joyPointerId !== e.pointerId) return;
    setJoyFromPoint(e.clientX, e.clientY);
    e.preventDefault();
  }, { passive: false });
  ['pointerup', 'pointercancel'].forEach((evt) => {
    window.addEventListener(evt, (e) => { if (joyPointerId === e.pointerId) resetJoy(); });
  });
}

// ---------- Settings: camera mode, tucked into a gear menu
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

// mobile browsers keep their own address/tab bar chrome unless the page is
// actually in the Fullscreen API - lets players reclaim that space instead
// of playing in a letterboxed strip between two browser toolbars. iOS
// Safari's support for this is inconsistent (varies by iOS version, and
// silently rejects instead of erroring in some cases), so this tries both
// the standard and the older webkit-prefixed API and actually tells the
// player when it didn't work instead of the button just doing nothing.
const fullscreenBtn = document.getElementById('btnFullscreen');
function isFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
function applyFullscreenLabel() {
  if (fullscreenBtn) fullscreenBtn.textContent = isFullscreen() ? '⛶ Vollbild aus' : '⛶ Vollbild';
}
function requestFs(el) {
  const fn = el.requestFullscreen || el.webkitRequestFullscreen;
  return fn ? Promise.resolve(fn.call(el)) : Promise.reject(new Error('unsupported'));
}
function exitFs() {
  const fn = document.exitFullscreen || document.webkitExitFullscreen;
  return fn ? Promise.resolve(fn.call(document)) : Promise.reject(new Error('unsupported'));
}
function toggleFullscreen() {
  if (!isFullscreen()) {
    requestFs(document.documentElement).catch(() => {
      showSub('Vollbild wird von diesem Browser nicht unterstützt');
    });
  } else {
    exitFs().catch(() => {});
  }
}
const isStandaloneApp = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const hasFullscreenApi = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
if (isStandaloneApp) {
  // launched from a home-screen icon - already chrome-less, the button
  // would just be redundant
  if (fullscreenBtn) fullscreenBtn.style.display = 'none';
} else if (!hasFullscreenApi) {
  // typical iOS Safari: no Fullscreen API for regular elements at all, in
  // any version. Repurpose the button into a hint for the one thing that
  // DOES reliably give a chrome-less iOS launch (see the apple-mobile-web-
  // app-capable meta tag), instead of just hiding it with no explanation.
  if (fullscreenBtn) {
    fullscreenBtn.textContent = '⛶ Vollbild: Zum Home-Bildschirm';
    fullscreenBtn.addEventListener('click', () => {
      showSub('Teilen-Symbol → „Zum Home-Bildschirm" für echtes Vollbild');
    });
  }
} else {
  fullscreenBtn?.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', applyFullscreenLabel);
  document.addEventListener('webkitfullscreenchange', applyFullscreenLabel);
  applyFullscreenLabel();
}

function readInput() {
  const up = keys.has('KeyW') || keys.has('ArrowUp') || touchMove.forward > 0.12;
  const down = keys.has('KeyS') || keys.has('ArrowDown') || touchMove.back > 0.12;
  const leftKey = keys.has('KeyA') || keys.has('ArrowLeft');
  const rightKey = keys.has('KeyD') || keys.has('ArrowRight');
  const keySteer = (leftKey ? 1 : 0) - (rightKey ? 1 : 0);
  const joySteer = touchMove.left - touchMove.right;
  const steer = keySteer !== 0 ? keySteer : joySteer;
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
  player.pos.set(SPAWN_POS[0], 0, SPAWN_POS[1]);
  player.heading = SPAWN_HEADING;
  player.moveSpeed = 0;
  player.velY = 0;
  player.onGround = true;
  player.jumpState = 'none';
  player.jumpBuf = false;
  playerCar.place(SPAWN_POS[0], SPAWN_POS[1], SPAWN_HEADING);
  playerCar.occupied = true;
  player.inCar = playerCar;
}

function restartMission() {
  endOverlay.classList.remove('show');
  missionState.gameOver = false;
  missionState.inDialog = false;
  document.body.classList.remove('dialog-active');
  dialogNextRow.classList.remove('show');
  clearDialogHistory();
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
const subMsgTextEl = document.getElementById('subMsgText');
const subMsgOkBtn = document.getElementById('subMsgOk');
const controlsHint = document.getElementById('controlsHint');
const objectiveTextEl = document.getElementById('objectiveText');
const objectiveDistanceEl = document.getElementById('objectiveDistance');
const missionClockEl = document.getElementById('missionClock');
const objectivePanelEl = document.getElementById('objectivePanel');
const speedWrapEl = document.getElementById('speedWrap');
const minimapWrapEl = document.getElementById('minimapWrap');
const moneyDisplayEl = document.getElementById('moneyDisplay');
const wantedBanner = document.getElementById('wantedBanner');
const dialogBox = document.getElementById('dialogBox');
const dialogNextRow = document.getElementById('dialogNextRow');
const dialogNextBtn = document.getElementById('dialogNextBtn');
const endOverlay = document.getElementById('endOverlay');
const endTitleEl = document.getElementById('endTitle');
const endSubtitleEl = document.getElementById('endSubtitle');
const endRestartBtn = document.getElementById('endRestartBtn');

let subTimer = 0;
function hideSub() {
  subTimer = 0;
  subMsg.classList.remove('show');
}
function showSub(text) {
  subMsgTextEl.textContent = text;
  subMsg.classList.add('show');
  subTimer = 2.6;
}
subMsgOkBtn.addEventListener('click', hideSub);

// one color per named speaker so the thread reads like a real group chat
// instead of "pink for me, grey for everyone else" - Marco (the player)
// always sits on the right and keeps the pink used across the rest of the
// UI; every other character gets their own fixed color (also used to tint
// their in-world character mesh, see NPC_BY_STEP) so the same color means
// the same person on the map, on their model and in the chat; narration (no
// speaker) is centered, bubble-less italic text.
// near-opaque on purpose (0.95 alpha, up from 0.75-0.85 after repeated
// "still too transparent" feedback across several rounds) - anything more
// see-through than that made the text hard to read against a busy, moving
// 3D scene, which is the whole point of a bubble background in the first
// place.
const SPEAKER_STYLE = {
  Marco: { bubble: 'rgba(200,15,105,0.95)', border: 'rgba(255,46,136,0.95)', name: '#ffb3d9' },
  Vincent: { bubble: 'rgba(15,60,135,0.95)', border: 'rgba(32,140,255,0.95)', name: '#a9d4ff' },
  Sofia: { bubble: 'rgba(80,35,135,0.95)', border: 'rgba(160,90,230,0.95)', name: '#dcc4ff' },
  Jack: { bubble: 'rgba(140,80,5,0.95)', border: 'rgba(255,170,40,0.95)', name: '#ffdfa3' },
  // Level 2 ("Coastal Courier") cast - Marcus keeps the same pink-and-right
  // player treatment as Marco (isMe checks PLAYER_NAME, not a hardcoded
  // name), every other character gets its own fixed color same as Level 1.
  Marcus: { bubble: 'rgba(200,15,105,0.95)', border: 'rgba(255,46,136,0.95)', name: '#ffb3d9' },
  Dante: { bubble: 'rgba(15,60,135,0.95)', border: 'rgba(32,140,255,0.95)', name: '#a9d4ff' },
  Viktor: { bubble: 'rgba(20,95,80,0.95)', border: 'rgba(40,190,150,0.95)', name: '#b8f2dd' },
  Mechaniker: { bubble: 'rgba(140,80,5,0.95)', border: 'rgba(255,170,40,0.95)', name: '#ffdfa3' },
  Elaine: { bubble: 'rgba(150,95,15,0.95)', border: 'rgba(255,195,90,0.95)', name: '#ffe6bf' },
};
const DEFAULT_SPEAKER_STYLE = { bubble: 'rgba(30,32,36,0.95)', border: 'rgba(255,255,255,0.35)', name: '#e6e8eb' };
const DIALOG_HISTORY_MAX = 3;
const dialogRows = [];

function clearDialogHistory() {
  for (const row of dialogRows) row.remove();
  dialogRows.length = 0;
}

function pushDialogRow(line) {
  const isMe = line.speaker === PLAYER_NAME;
  const isNarration = !line.speaker;
  const row = document.createElement('div');
  row.className = 'dchat-row' + (isMe ? ' me' : '') + (isNarration ? ' narration' : '');

  const bubble = document.createElement('div');
  bubble.className = 'dchat-bubble';
  if (!isNarration) {
    const style = SPEAKER_STYLE[line.speaker] || DEFAULT_SPEAKER_STYLE;
    bubble.style.background = style.bubble;
    bubble.style.borderColor = style.border;
    if (line.speaker) {
      const nameEl = document.createElement('div');
      nameEl.className = 'dchat-speaker';
      nameEl.textContent = line.speaker;
      nameEl.style.color = style.name;
      bubble.appendChild(nameEl);
    }
  }
  const textEl = document.createElement('div');
  textEl.className = 'dchat-text';
  textEl.textContent = line.text;
  bubble.appendChild(textEl);
  row.appendChild(bubble);

  dialogBox.insertBefore(row, dialogNextRow);
  dialogRows.push(row);

  // retire rows past the cap with their OWN shrink-out transition instead
  // of yanking them out of the DOM instantly - removing them in the same
  // instant the new row starts growing in caused a visible "snap down,
  // then animate back up" glitch, since one side of that swap was animated
  // and the other wasn't.
  while (dialogRows.length > DIALOG_HISTORY_MAX) {
    const old = dialogRows.shift();
    old.classList.remove('show');
    old.querySelector('.dchat-bubble').style.opacity = '0';
    setTimeout(() => old.remove(), 400);
  }

  // growing this row's grid track from 0fr->1fr is what visibly pushes the
  // earlier rows above it upward (see .dchat-row in index.html); dim older
  // rows a touch so the newest reads as "current" without making them hard
  // to read - real chat apps keep history legible, not faded to a shadow
  requestAnimationFrame(() => {
    row.classList.add('show');
    const n = dialogRows.length;
    dialogRows.forEach((r, i) => {
      const rank = n - 1 - i; // 0 = newest
      const op = rank === 0 ? 1 : rank === 1 ? 0.78 : 0.58;
      r.querySelector('.dchat-bubble').style.opacity = String(op);
    });
  });
}

function showDialogLine() {
  const line = missionState.dialogLines[missionState.dialogLineIndex];
  pushDialogRow(line);
  dialogNextRow.classList.add('show');
}
// tap-anywhere-to-continue: bound to the whole box (bubbles included, not
// just the 32px arrow) so a miss on the small button doesn't read as "the
// dialog is stuck/broken". A single listener here instead of one on
// dialogNextBtn too - the button click would otherwise bubble up and fire
// this same handler a second time for one tap.
dialogBox.addEventListener('pointerdown', () => {
  if (missionState.inDialog) advanceDialogLine();
});

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
    if (subTimer <= 0) hideSub();
  }

  const step = missionState.step;
  objectiveTextEl.textContent = step ? (step.objective || '') : '';
  objectiveDistanceEl.textContent = (step && missionState.targetPos)
    ? `${Math.round(missionState.distance)} m — ${missionState.targetLabel || ''}`
    : '';

  // Level 3's atmospheric race-the-clock readout - cosmetic only (ticks off
  // real elapsed play time against MISSION.clock's configured window, no
  // separate fail state tied to it - the actual fail condition stays purely
  // "caught by police", same as every other level)
  if (missionClockEl) {
    if (MISSION.clock && !missionState.gameOver) {
      const { startMinutes, endMinutes, realSecondsForFullRun } = MISSION.clock;
      const totalMin = startMinutes + Math.min(1, elapsed / realSecondsForFullRun) * (endMinutes - startMinutes);
      const hh = Math.floor(totalMin / 60) % 24;
      const mm = Math.floor(totalMin % 60);
      missionClockEl.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} Uhr`;
      missionClockEl.classList.add('show');
    } else {
      missionClockEl.classList.remove('show');
    }
  }

  wantedBanner.classList.toggle('show', policeState.active);
  if (policeState.active) {
    wantedBanner.textContent = POLICE.hud.wantedLabel;
    // objective text wraps to a variable number of lines depending on
    // string length and viewport width (narrow phones + a long objective
    // like the escape step can push it several lines deep), and on narrow
    // screens the centered banner can reach sideways into the money/minimap
    // corner too - measuring the actual rendered bottom of every top-row
    // element instead of a fixed CSS top offset is the only way to
    // guarantee it never overlaps any of them regardless of screen size or
    // text length.
    const rowBottom = Math.max(
      objectivePanelEl.getBoundingClientRect().bottom,
      speedWrapEl.getBoundingClientRect().bottom,
      moneyDisplayEl.getBoundingClientRect().bottom,
      minimapWrapEl.getBoundingClientRect().bottom
    );
    wantedBanner.style.top = Math.max(14, rowBottom + 8) + 'px';
  }

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

function hexToRgba(hex, alpha) {
  const c = new THREE.Color(hex);
  return `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${alpha})`;
}

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

  mmCtx.fillStyle = '#1f5a78';
  for (const b of waterColliders) {
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
    // clamp to the rim so far-away targets still show up as a radar blip -
    // this doubles as the "still points the right way once it's off the
    // map" indicator: the dot never actually leaves the visible circle, it
    // just slides along the rim in the target's direction.
    const edge = w / 2 - 16;
    const d = Math.hypot(x, y);
    if (d > edge) {
      x = (x / d) * edge;
      y = (y / d) * edge;
    }
    const step = missionState.step;
    const targetColor = step?.waypoint ? step.waypoint.color : '#ffcc00';
    // radar-ping: two expanding, fading rings looping out from the marker -
    // reads as "something is here" far more clearly than the previous
    // plain grow/shrink pulse on the solid dot alone.
    for (let i = 0; i < 2; i++) {
      const phase = (elapsed * 0.8 + i * 0.5) % 1;
      mmCtx.beginPath();
      mmCtx.arc(x, y, 13 + phase * 24, 0, Math.PI * 2);
      mmCtx.strokeStyle = hexToRgba(targetColor, (1 - phase) * 0.55);
      mmCtx.lineWidth = 2;
      mmCtx.stroke();
    }
    mmCtx.fillStyle = targetColor;
    mmCtx.beginPath();
    mmCtx.arc(x, y, 13, 0, Math.PI * 2);
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

  // ambient patrol: a clear, saturated blue so they read as police at a
  // glance instead of blending into the grey traffic dots - sized/outlined
  // like the player marker so they're easy to spot, not just tinted
  mmCtx.fillStyle = '#3b7bff';
  mmCtx.strokeStyle = '#ffffff';
  mmCtx.lineWidth = 1.2;
  for (const car of policeCars) {
    const x = (car.pos.x - focus.x) * scale;
    const y = (car.pos.z - focus.z) * scale;
    mmCtx.beginPath();
    mmCtx.arc(x, y, 5.5, 0, Math.PI * 2);
    mmCtx.fill();
    mmCtx.stroke();
  }

  // active manhunt units flash red/blue like real light bars - they only
  // exist while policeState.active, so this is always "during an alarm"
  const alarmBlink = Math.sin(elapsed * 10) > 0;
  mmCtx.fillStyle = alarmBlink ? '#ff2020' : '#2050ff';
  for (const car of chaseCops) {
    const x = (car.pos.x - focus.x) * scale;
    const y = (car.pos.z - focus.z) * scale;
    mmCtx.beginPath();
    mmCtx.arc(x, y, 6.4, 0, Math.PI * 2);
    mmCtx.fill();
    mmCtx.stroke();
  }

  // the player's own car, parked and empty while they're on foot, was
  // invisible on the map before - it isn't in trafficCars (only OTHER cars
  // the player has driven and left end up there), so it needs its own draw
  if (!playerCar.occupied) {
    const x = (playerCar.pos.x - focus.x) * scale;
    const y = (playerCar.pos.z - focus.z) * scale;
    mmCtx.fillStyle = '#ff2e88';
    mmCtx.strokeStyle = '#ffffff';
    mmCtx.lineWidth = 1.2;
    mmCtx.beginPath();
    mmCtx.arc(x, y, 4.6, 0, Math.PI * 2);
    mmCtx.fill();
    mmCtx.stroke();
  }

  mmCtx.restore();

  // player marker always points straight up (screen space) since the map
  // itself already rotates opposite to heading above - it must be drawn
  // AFTER restore(), otherwise it inherits that same rotation and visibly
  // spins with the map instead of staying fixed pointing "forward".
  mmCtx.fillStyle = '#ff2e88';
  mmCtx.beginPath();
  mmCtx.moveTo(cx, cy - 12);
  mmCtx.lineTo(cx + 8, cy + 10);
  mmCtx.lineTo(cx - 8, cy + 10);
  mmCtx.closePath();
  mmCtx.fill();
  mmCtx.strokeStyle = '#ffffff';
  mmCtx.lineWidth = 1.5;
  mmCtx.stroke();

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

  // face-to-face conversation with a visible NPC: swing to a side two-shot
  // instead of the usual forward-facing chase cam, so both characters sit
  // together in frame like an actual dialogue scene - eases back to the
  // normal camera on its own once missionState.inDialog flips off and this
  // branch stops running, same lerp-based transition as everywhere else.
  if (missionState.inDialog && missionState.npcMesh) {
    const npc = missionState.npcMesh.position;
    const midX = (focus.x + npc.x) / 2, midZ = (focus.z + npc.z) / 2;
    let dirX = npc.x - focus.x, dirZ = npc.z - focus.z;
    const pairDist = Math.hypot(dirX, dirZ) || 1;
    dirX /= pairDist; dirZ /= pairDist;
    const sideX = dirZ, sideZ = -dirX; // perpendicular to the player->NPC line
    const sideBack = clamp(pairDist * 1.3 + 3.5, 5, 10);
    camTarget.lerp(new THREE.Vector3(midX, 0, midZ), Math.min(1, dt * 4.5));
    // matches the on-foot conversation camera's own height (CAM3_HEIGHT_FOOT
    // * 0.72) rather than a lower guess - tall enough to clear a parked car
    // between the camera and the two characters, which is the common case
    // right after stepping out to talk (see the exit-car block above).
    const desired = new THREE.Vector3(midX + sideX * sideBack, CAM3_HEIGHT_FOOT * 0.72, midZ + sideZ * sideBack);
    camPos.lerp(desired, Math.min(1, dt * 5));
    camera.position.copy(camPos);
    camera.lookAt(camTarget.x, 1.3, camTarget.z);
    sunTarget.position.copy(camTarget);
    sun.position.set(camTarget.x - 60, 110, camTarget.z + 40);
    return;
  }

  const targetHeading = inCar ? player.inCar.heading : player.heading;
  const activeSpeed = inCar ? player.inCar.speed : player.moveSpeed;
  const maxSpeedRef = inCar ? player.inCar.maxSpeed : CHAR_SPEED_MAX;
  const spdFac = clamp(Math.abs(activeSpeed) / Math.max(maxSpeedRef, 0.01), 0, 1);

  camTarget.lerp(new THREE.Vector3(focus.x, 0, focus.z), Math.min(1, dt * 4.5));
  camHeading += wrapAngle(targetHeading - camHeading) * Math.min(1, dt * 5);
  const forward = new THREE.Vector3(Math.sin(camHeading), 0, Math.cos(camHeading));

  let height, back, lookY;
  if (missionState.inDialog) {
    // conversation framing: a closer third-person shot regardless of the
    // player's own camera preference, which the existing lerp below eases
    // into and back out of on its own once the dialog ends (cameraMode
    // itself is never touched, so it resumes exactly where it was - top-
    // down by default).
    height = (inCar ? CAM3_HEIGHT_CAR : CAM3_HEIGHT_FOOT) * 0.72;
    back = (inCar ? CAM3_BACK_CAR : CAM3_BACK_FOOT) * 0.72;
    lookY = inCar ? 1.1 : 1.3;
  } else if (cameraMode === 'third') {
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
    // Level 3's limo drives itself (see updateAutoDrive()) - the player
    // sits in it but real input is ignored while that's active
    if (missionState.autoDrive && player.inCar === missionState.autoDrive.car) return;
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

  // a dialog freezes the whole simulation (traffic, police, physics, HUD
  // numbers) - the camera still eases into its closer conversation framing
  // and the scene keeps rendering, but nothing in the world moves or ticks
  // while it's on screen
  if (!missionState.inDialog) {
    const input = readInput();
    updatePlayer(dt, input);
    updateAutoDrive(dt);
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
  }
  updateCamera(dt);
  drawMinimap();

  renderer.render(scene, camera);
}

// ---------- Resize -----------------------------------------------------
// --minimap-size's CSS clamp() only scales off viewport WIDTH, so on a
// landscape phone (wide but short, and further squeezed by the browser's
// own address-bar/tab-bar chrome eating into that height) the minimap kept
// its full width-driven size and ran into the bottom-right jump/action
// buttons, which are anchored to the bottom edge independent of minimap
// size. Re-measuring the actual gap at runtime (rather than guessing a
// fixed landscape breakpoint) shrinks the minimap only exactly as much as
// the current screen actually requires.
function fitMinimapToViewport() {
  const btnJumpEl = document.getElementById('btnJump');
  if (!btnJumpEl || getComputedStyle(btnJumpEl).display === 'none') {
    // desktop / non-touch: no bottom-right buttons to collide with
    document.documentElement.style.removeProperty('--minimap-size');
    return;
  }
  const natural = Math.min(130, Math.max(96, window.innerWidth * 0.26));
  const minimapTop = 40;
  const jumpTop = btnJumpEl.getBoundingClientRect().top;
  const available = jumpTop - minimapTop - 12;
  const size = Math.max(64, Math.min(natural, available));
  document.documentElement.style.setProperty('--minimap-size', size + 'px');
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  fitMinimapToViewport();
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);
window.visualViewport?.addEventListener('resize', onResize);
onResize();

// ---------- Boot -----------------------------------------------------
// Title card sits as a translucent overlay directly on top of the already-
// running/rendering game (see #loading's background) rather than blocking
// it with a solid screen first, and any key press or tap skips it
// immediately. The regular HUD + touch controls stay hidden (body's
// initial "dialog-active" class) through the whole title card AND the
// intro call that follows it - only advanceDialogLine() finishing that
// first dialog reveals them, so nothing competes with the intro beats.
const loadingEl = document.getElementById('loading');
let splashDone = false;
function dismissSplash() {
  if (splashDone) return;
  splashDone = true;
  loadingEl.style.transition = 'opacity 0.4s ease';
  loadingEl.style.opacity = '0';
  setTimeout(() => loadingEl.remove(), 450);
  startMission();
}
const splashTimer = setTimeout(dismissSplash, 2400);
['pointerdown', 'keydown'].forEach((evt) => {
  window.addEventListener(evt, () => { clearTimeout(splashTimer); dismissSplash(); }, { once: true });
});
// locked level-select stubs shouldn't skip the intro when tapped - stopping
// propagation here keeps the window-level dismiss listener above from ever
// seeing the event, same "locked, nothing happens" feel a real gated level
// will need later.
document.querySelectorAll('.ts-level.locked').forEach((el) => {
  el.addEventListener('pointerdown', (e) => e.stopPropagation());
});
// playable level chips: mission.js reads its active level from
// localStorage once at module load, so switching levels needs a fresh
// page load - clicking the already-active chip just starts it like normal
// (no pointless reload), clicking the other one persists the choice first.
const activeLevelId = localStorage.getItem('viceGridLevel') || 'der_kessel';
document.querySelectorAll('.ts-level[data-level]').forEach((el) => {
  if (el.dataset.level === activeLevelId) el.classList.add('current');
  el.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    if (el.dataset.level === activeLevelId) { clearTimeout(splashTimer); dismissSplash(); return; }
    localStorage.setItem('viceGridLevel', el.dataset.level);
    location.reload();
  });
});
const titleSubEl = document.getElementById('titleSub');
if (titleSubEl) titleSubEl.textContent = MISSION.title;

// ---------- TEMP DEBUG: click/tap logs world [x,z] to console ----------
// Used to fine-tune the placeholder pos values in mission.js. Remove once done.
const DEBUG_LOG_COORDS = false;
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

animate();
