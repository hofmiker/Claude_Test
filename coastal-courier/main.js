import * as THREE from './vendor/three.module.min.js';
import {
  PLAYER_NAME, SPEAKER_STYLE, PHASES, CLOCK_TICK_PER_SEC, DATE_TIME,
  DIALOGS, OBJECTIVES, WIN_SCREEN,
} from './mission.js';

// ============================================================================
// The Coastal Courier — main.js
// Engine/Rendering/Physik/Input/HUD. Vier Transportmittel (Cabrio, Motorboot,
// zu Fuß, Limousine-Cutscene) entlang EINER linearen Welt (Villa -> Küsten-
// straße -> Hafen -> Kanal -> Golden Gate Bridge -> Nordstraße -> Sausalito
// Pier), statt eines freien Grids wie in Vice Grid/gta — die Story ist eine
// einzige Fluchtroute, kein offener Stadtplan. UI (Font, HUD-Layout, Dialog-
// Chat, Minimap, Joystick) bewusst an gta/ angelehnt, siehe Root-CLAUDE.md-
// Auftrag "an das UI von Vice Grid angelehnt".
// ============================================================================

// ---- Weltkoordinaten (X = Reiserichtung Süd->Nord, Z = seitlich) ----------
const WORLD = {
  villaBox:   { xMin: -300, xMax: -220, zMin: -50, zMax: 50 },
  roadA:      { xMin: -220, xMax: -40,  pts: [[-220,10],[-160,-22],[-100,16],[-40,-6]], half: 17 },
  harborBox:  { xMin: -40,  xMax: 60,   zMin: -50, zMax: 50 },
  channel:    { xMin: 60,   xMax: 260,  pts: [[60,-6],[120,14],[180,-12],[260,0]], half: 15 },
  bridge:     { xMin: 260,  xMax: 460,  half: 12 },
  roadB:      { xMin: 460,  xMax: 560,  pts: [[460,0],[510,10],[560,0]], half: 15 },
  pierBox:    { xMin: 560,  xMax: 640,  zMin: -40, zMax: 40 },
};

const MARK = {
  villaSpawn:  new THREE.Vector3(-292, 0, 0),
  villa:       new THREE.Vector3(-232, 0, -22),
  harbor:      new THREE.Vector3(-4, 0, -24),
  boatDock:    new THREE.Vector3(48, 0, 18),
  bridgeDock:  new THREE.Vector3(258, 0, 0),
  bridgeStart: new THREE.Vector3(266, 0, 0),
  bridgeEnd:   new THREE.Vector3(454, 0, 0),
  limoStart:   new THREE.Vector3(462, 0, 0),
  limoEnd:     new THREE.Vector3(566, 0, 0),
  pier:        new THREE.Vector3(626, 0, 0),
};

// ---- Farbpalette ------------------------------------------------------
const COL = {
  villaGround: 0xd9c9a0, villaRoad: 0xc7b98f, villaBuilding: 0xede8dc,
  glass: 0x7fb8c9, pool: 0x2fb0c9, hedge: 0x4a8f3d,
  roadAsphalt: 0x5c5a58, roadLine: 0xffffff, oceanDay: 0x2f7ea8,
  harborGround: 0x8a8478, warehouse: 0x9c4a3a, container1: 0xb0522f,
  container2: 0x3f6f7a, crane: 0x3a3a3a, water: 0x35708a,
  rock: 0x8a7a68, bridgeOrange: 0xc1440e, bridgeDeck: 0x2b2b2e,
  hillGreen: 0x5f9a4c, pierWood: 0x8a6a45, sunsetSky: 0xf5a35a,
};

// ---- Vehicle/Physik-Tuning ---------------------------------------------
const TUNE = {
  cabrio: { maxSpeed: 30, accel: 24, brake: 34, drag: 0.992, turnRate: 2.3, grip: 1.0 },
  boat:   { maxSpeed: 27, accel: 13, brake: 16, drag: 0.985, turnRate: 1.15, grip: 0.09 },
  foot:   { maxSpeed: 5.4, sprintSpeed: 9.4, accel: 40, brake: 40, drag: 0.9, turnRate: 4.2, grip: 1.0 },
  limo:   { speed: 15 },
};

let scene, camera, renderer, clock3;
let cameraMode = 'top';
const dummyVec = new THREE.Vector3();

// ============================================================================
// Boot (Aufruf ganz am Dateiende, nachdem alle const-Deklarationen der
// späteren Abschnitte ausgewertet wurden - init() greift auf sie zu, und
// ein Aufruf hier oben landet sonst in ihrer Temporal Dead Zone)
// ============================================================================

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xaee0f0);
  scene.fog = new THREE.Fog(0xaee0f0, 60, 320);

  camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 900);

  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('scene'), antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = false;

  const hemi = new THREE.HemisphereLight(0xffffff, 0xd9c9a0, 0.95);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d8, 1.05);
  sun.position.set(80, 140, 40);
  scene.add(sun);
  scene.userData.sun = sun;
  scene.userData.hemi = hemi;

  buildWorld();
  buildEntities();

  window.addEventListener('resize', onResize);
  onResize();

  setupInput();
  setupTouch();
  setupSettings();

  document.getElementById('titleSplash').parentElement.addEventListener('pointerdown', dismissSplash, { once: true });
  window.addEventListener('keydown', dismissSplash, { once: true });
  setTimeout(dismissSplash, 2400);

  clock3 = new THREE.Clock();
  requestAnimationFrame(animate);
}

function dismissSplash() {
  const loading = document.getElementById('loading');
  if (loading.style.opacity === '0') return;
  loading.style.transition = 'opacity 0.5s ease';
  loading.style.opacity = '0';
  setTimeout(() => { loading.style.display = 'none'; }, 520);
  startMission();
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  const mm = document.getElementById('minimap');
  const size = Math.round(mm.parentElement.getBoundingClientRect().width * (devicePixelRatio || 1));
  mm.width = size; mm.height = size;
}

// ============================================================================
// Low-poly Builder-Helfer
// ============================================================================
function mat(color, opts) { return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0.05 }, opts || {})); }
function box(w, h, d, color, opts) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
  return m;
}
function cyl(rt, rb, h, color, opts) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 10), mat(color, opts));
  return m;
}
function cone(r, h, color, opts) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 9), mat(color, opts));
  return m;
}
function sph(r, color, opts) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat(color, opts));
  return m;
}
function plane(w, d, color, opts) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(color, Object.assign({ side: THREE.DoubleSide }, opts || {})));
  m.rotation.x = -Math.PI / 2;
  return m;
}
function grp() { return new THREE.Group(); }

function addPalm(x, z, scale) {
  const g = grp();
  const trunk = cyl(0.35, 0.55, 6.5, 0x8a6a45);
  trunk.position.y = 3.25;
  trunk.rotation.z = 0.08;
  g.add(trunk);
  for (let i = 0; i < 6; i++) {
    const frond = cone(0.4, 3.4, COL.hedge);
    frond.position.set(0, 6.6, 0);
    frond.rotation.z = Math.PI / 2.15;
    frond.rotation.y = (i / 6) * Math.PI * 2;
    frond.position.x += Math.cos((i / 6) * Math.PI * 2) * 1.2;
    frond.position.z += Math.sin((i / 6) * Math.PI * 2) * 1.2;
    g.add(frond);
  }
  g.position.set(x, 0, z);
  g.scale.setScalar(scale || 1);
  scene.add(g);
}

function addRock(x, z, r) {
  const m = sph(r, COL.rock, { flatShading: true });
  m.position.set(x, r * 0.4, z);
  m.scale.set(1, 0.7 + Math.random() * 0.3, 1);
  m.rotation.y = Math.random() * Math.PI;
  scene.add(m);
  return { x, z, r: r * 0.95 };
}

function addHedge(x, z, w, d) {
  const m = box(w, 1.1, d, COL.hedge, { roughness: 1 });
  m.position.set(x, 0.55, z);
  scene.add(m);
}

// ============================================================================
// Welt-Bau
// ============================================================================
const channelRocks = [];
const bridgeGuard = { half: WORLD.bridge.half };

function roadZAt(cfg, x) {
  const pts = cfg.pts;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
    if (x >= x0 && x <= x1) {
      const t = (x - x0) / (x1 - x0 || 1);
      return z0 + (z1 - z0) * t;
    }
  }
  return pts[pts.length - 1][1];
}

function buildWorld() {
  buildVillaZone();
  buildRoad(WORLD.roadA, COL.roadAsphalt, true);
  buildHarborZone();
  buildChannelZone();
  buildBridgeZone();
  buildRoad(WORLD.roadB, COL.roadAsphalt, false, true);
  buildPierZone();

  // groß angelegter Ozean-Hintergrund hinter der ganzen Küstenlinie
  const ocean = plane(2000, 900, COL.oceanDay, { roughness: 0.75, metalness: 0.05 });
  ocean.position.set(160, -0.4, -260);
  scene.add(ocean);
}

function buildVillaZone() {
  const g = WORLD.villaBox;
  scene.add(plane(g.xMax - g.xMin + 40, g.zMax - g.zMin + 40, COL.villaGround, {}).translateX((g.xMin + g.xMax) / 2 - 0).translateZ((g.zMin+g.zMax)/2));
  // Einfahrt/Parkbereich
  const drive = plane(70, 14, COL.villaRoad);
  drive.position.set(-292, 0.02, 0);
  scene.add(drive);

  const villa = grp();
  villa.add(box(30, 6, 16, COL.villaBuilding));
  const glassWall = box(0.4, 4.6, 13, COL.glass, { metalness: 0.4, roughness: 0.2, transparent: true, opacity: 0.75 });
  glassWall.position.set(15.2, 2.6, 0);
  villa.add(glassWall);
  const roofSlab = box(31, 0.6, 17, 0xe0d8c0);
  roofSlab.position.y = 6.3;
  villa.add(roofSlab);
  villa.position.set(-232, 3, -22);
  scene.add(villa);

  const poolWater = plane(10, 6, COL.pool, { metalness: 0.15, roughness: 0.55 });
  poolWater.position.set(-232, 0.03, -4);
  scene.add(poolWater);

  addHedge(-232, -30, 26, 1.2);
  addPalm(-244, -28, 1.05);
  addPalm(-220, -30, 0.95);
  addPalm(-292, 8, 1);
  addPalm(-282, -10, 0.9);

  window.__viktor = spawnPerson(MARK.villa.x, MARK.villa.z + 4, { shirt: 0xffb347, female: false }, Math.PI);
}

function buildRoad(cfg, color, coastal, north) {
  const segLen = 20;
  for (let x = cfg.xMin; x < cfg.xMax; x += segLen) {
    const x0 = x, x1 = Math.min(x + segLen, cfg.xMax);
    const z0 = roadZAt(cfg, x0), z1 = roadZAt(cfg, x1);
    const midX = (x0 + x1) / 2, midZ = (z0 + z1) / 2;
    const len = Math.hypot(x1 - x0, z1 - z0) + 0.5;
    const ang = Math.atan2(z1 - z0, x1 - x0);
    const seg = plane(len, cfg.half * 2, color);
    seg.rotation.z = -ang;
    seg.position.set(midX, 0.01, midZ);
    scene.add(seg);
    const line = plane(len, 0.4, COL.roadLine);
    line.rotation.z = -ang;
    line.position.set(midX, 0.02, midZ);
    scene.add(line);
    if (coastal && Math.random() < 0.6) addPalm(midX, midZ + cfg.half + 6, 0.85 + Math.random() * 0.3);
    if (north && Math.random() < 0.5) {
      const hill = cone(9 + Math.random() * 4, 6 + Math.random() * 3, COL.hillGreen, { flatShading: true });
      hill.position.set(midX + (Math.random() - 0.5) * 10, 0, midZ - cfg.half - 14 - Math.random() * 10);
      scene.add(hill);
    }
  }
}

function buildHarborZone() {
  const g = WORLD.harborBox;
  const ground = plane(g.xMax - g.xMin + 20, g.zMax - g.zMin + 20, COL.harborGround, { roughness: 1 });
  ground.position.set((g.xMin + g.xMax) / 2, 0.005, (g.zMin + g.zMax) / 2);
  scene.add(ground);

  const warehouse = grp();
  warehouse.add(box(26, 10, 18, COL.warehouse, { roughness: 1 }));
  warehouse.position.set(6, 5, -34);
  scene.add(warehouse);
  const sign = box(10, 2, 0.3, 0xffd54a, { emissive: 0x554400, emissiveIntensity: 0.5 });
  sign.position.set(6, 11, -25.2);
  scene.add(sign);

  const containerColors = [COL.container1, COL.container2, 0xb08b2f];
  for (let i = 0; i < 5; i++) {
    const c = box(6, 2.6, 2.4, containerColors[i % containerColors.length]);
    c.position.set(-24 + i * 7, 1.3, -6 + (i % 2) * 3);
    c.rotation.y = (i % 2) * 0.15;
    scene.add(c);
  }
  const cranePost = cyl(0.6, 0.7, 14, COL.crane);
  cranePost.position.set(30, 7, -4);
  scene.add(cranePost);
  const craneArm = box(24, 0.8, 0.8, COL.crane);
  craneArm.position.set(20, 13.5, -4);
  scene.add(craneArm);

  window.__mechanic = spawnPerson(MARK.harbor.x, MARK.harbor.z + 5, { shirt: 0x7CFC7A, female: false }, Math.PI);

  const dockDeck = box(16, 0.6, 8, COL.pierWood);
  dockDeck.position.set(48, 0.3, 18);
  scene.add(dockDeck);
  const dockWater = plane(30, 30, COL.water, { metalness: 0.1, roughness: 0.5 });
  dockWater.position.set(58, 0.01, 30);
  scene.add(dockWater);
}

function buildChannelZone() {
  const cfg = WORLD.channel;
  for (let x = cfg.xMin - 10; x <= cfg.xMax + 40; x += 12) {
    const zc = roadZAt(cfg, Math.min(Math.max(x, cfg.xMin), cfg.xMax));
    const w = plane(14, cfg.half * 2 + 14, COL.water, { metalness: 0.1, roughness: 0.5 });
    w.position.set(x, 0.01, zc);
    scene.add(w);
  }
  const rockSeed = [
    [90, -22], [110, 24], [150, 26], [170, -22], [205, 20], [225, -20],
  ];
  rockSeed.forEach(([x, offset]) => {
    const zc = roadZAt(cfg, Math.min(Math.max(x, cfg.xMin), cfg.xMax));
    channelRocks.push(addRock(x, zc + offset, 3 + Math.random() * 1.5));
  });
  for (let x = cfg.xMin; x < cfg.xMax; x += 30) {
    const zc = roadZAt(cfg, x);
    const buoyColor = Math.random() < 0.5 ? 0xff3b3b : 0xffd54a;
    const buoy = cone(1, 1.6, buoyColor);
    const bz = zc + (Math.random() < 0.5 ? -cfg.half - 3 : cfg.half + 3);
    buoy.position.set(x, 0.8, bz);
    scene.add(buoy);
    channelRocks.push({ x, z: bz, r: 1.4 });
  }
}

function buildBridgeZone() {
  const cfg = WORLD.bridge;
  const deck = box(cfg.xMax - cfg.xMin, 1, cfg.half * 2, COL.bridgeDeck);
  deck.position.set((cfg.xMin + cfg.xMax) / 2, 0.5, 0);
  scene.add(deck);

  // Fußgänger-Gehweg (heller, wo der Spieler tatsächlich läuft) statt einer
  // einzigen dunklen Fläche - sonst verschluckt die Draufsicht komplett.
  const walkway = plane(cfg.xMax - cfg.xMin, cfg.half * 2 - 2.4, 0x4a4a50, { roughness: 0.95 });
  walkway.position.set((cfg.xMin + cfg.xMax) / 2, 1.02, 0);
  scene.add(walkway);
  for (let x = cfg.xMin + 6; x < cfg.xMax; x += 9) {
    const dash = box(4.5, 0.02, 0.5, 0xdddddd);
    dash.position.set(x, 1.03, 0);
    scene.add(dash);
  }
  for (let x = cfg.xMin; x < cfg.xMax; x += 14) {
    const seam = box(0.4, 0.03, cfg.half * 2, 0x1c1c1f);
    seam.position.set(x, 1.035, 0);
    scene.add(seam);
  }

  [cfg.xMin + 40, (cfg.xMin + cfg.xMax) / 2 + 0, cfg.xMax - 40].slice(0, 2).forEach((tx) => {
    const towerL = box(2.2, 42, 2.2, COL.bridgeOrange);
    towerL.position.set(tx, 21, -cfg.half - 1);
    scene.add(towerL);
    const towerR = box(2.2, 42, 2.2, COL.bridgeOrange);
    towerR.position.set(tx, 21, cfg.half + 1);
    scene.add(towerR);
    const beam = box(2.4, 2.4, cfg.half * 2 + 2.4, COL.bridgeOrange);
    beam.position.set(tx, 40, 0);
    scene.add(beam);
    for (let i = -1; i <= 1; i += 2) {
      const cable = cyl(0.25, 0.25, 44, 0xd8d8d8);
      cable.rotation.z = 0.5 * i;
      cable.position.set(tx - i * 12, 26, -cfg.half - 1);
      scene.add(cable);
      const cable2 = cable.clone();
      cable2.position.z = cfg.half + 1;
      scene.add(cable2);
    }
  });

  for (let z = -cfg.half; z <= cfg.half; z += cfg.half * 2) {
    const rail = box(cfg.xMax - cfg.xMin, 1.4, 0.3, 0xb8b8b8);
    rail.position.set((cfg.xMin + cfg.xMax) / 2, 1.7, z);
    scene.add(rail);
  }
}

function buildPierZone() {
  const g = WORLD.pierBox;
  const ground = plane(g.xMax - g.xMin + 20, g.zMax - g.zMin + 20, COL.hillGreen, { roughness: 1 });
  ground.position.set((g.xMin + g.xMax) / 2, 0.005, (g.zMin + g.zMax) / 2);
  scene.add(ground);
  const water = plane(300, 260, COL.water, { metalness: 0.1, roughness: 0.5 });
  water.position.set(700, 0, 0);
  scene.add(water);

  const gallery = grp();
  gallery.add(box(14, 5, 10, 0xf0e6cf));
  gallery.position.set(600, 2.5, -22);
  scene.add(gallery);
  addPalm(590, -30, 0.9);
  addPalm(614, -28, 0.8);

  const deck = box(g.xMax - 596, 0.7, 8, COL.pierWood);
  deck.position.set((596 + g.xMax) / 2, 0.35, 0);
  scene.add(deck);
  for (let x = 598; x <= g.xMax; x += 8) {
    const post1 = cyl(0.3, 0.35, 2, 0x5c4630);
    post1.position.set(x, -0.6, -3.6);
    scene.add(post1);
    const post2 = post1.clone();
    post2.position.z = 3.6;
    scene.add(post2);
  }
  const rail1 = box(g.xMax - 596, 0.9, 0.15, 0x5c4630);
  rail1.position.set((596 + g.xMax) / 2, 1.2, -3.7);
  scene.add(rail1);
  const rail2 = rail1.clone();
  rail2.position.z = 3.7;
  scene.add(rail2);

  for (let i = 0; i < 4; i++) {
    const yacht = box(6, 1.6, 2, 0xffffff);
    yacht.position.set(560 + Math.random() * 60, 0.6, -30 - i * 8);
    yacht.rotation.y = Math.random() * 0.4;
    scene.add(yacht);
  }

  window.__elaine = spawnPerson(MARK.pier.x, MARK.pier.z, { shirt: 0xffd54a, female: true }, -Math.PI / 2);
}

// ============================================================================
// Charaktere & Fahrzeuge (Low-Poly-Fabriken)
// ============================================================================
function createPersonMesh(palette) {
  const g = grp();
  const shirt = palette.shirt || 0xffffff;
  const skin = 0xe8b48c;
  const pants = palette.pants || 0x2c2c34;

  const torso = box(0.9, 1.1, 0.55, shirt);
  torso.position.y = 1.55;
  g.add(torso);

  const head = sph(0.36, skin);
  head.position.y = 2.35;
  g.add(head);

  const legL = box(0.34, 1.1, 0.4, pants);
  legL.position.set(-0.24, 0.55, 0);
  g.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.24;
  g.add(legR);
  g.userData.legL = legL; g.userData.legR = legR;

  const armL = box(0.24, 1.0, 0.24, shirt);
  armL.position.set(-0.62, 1.55, 0);
  g.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.62;
  g.add(armR);
  g.userData.armL = armL; g.userData.armR = armR;

  if (palette.female) {
    const skirt = cone(0.62, 0.9, palette.skirt || shirt);
    skirt.position.y = 0.95;
    g.add(skirt);
    legL.visible = legR.visible = false;
    const hair = cyl(0.1, 0.16, 1.0, 0x2a1c14);
    hair.position.set(0, 1.7, -0.28);
    hair.rotation.x = 0.25;
    g.add(hair);
  }
  return g;
}

function spawnPerson(x, z, palette, heading) {
  const m = createPersonMesh(palette);
  m.position.set(x, 0, z);
  m.rotation.y = heading || 0;
  scene.add(m);
  return m;
}

function animateWalk(mesh, phase, moving) {
  const s = moving ? Math.sin(phase * 8) * 0.55 : 0;
  if (mesh.userData.legL) { mesh.userData.legL.rotation.x = s; mesh.userData.legR.rotation.x = -s; }
  if (mesh.userData.armL) { mesh.userData.armL.rotation.x = -s; mesh.userData.armR.rotation.x = s; }
}

function createCabrioMesh(colorBody) {
  const g = grp();
  const body = box(2, 0.6, 4.2, colorBody);
  body.position.y = 0.6;
  g.add(body);
  const cabin = box(1.7, 0.55, 2, 0x1c1c22);
  cabin.position.set(0, 1.05, -0.2);
  g.add(cabin);
  const stripe = box(0.25, 0.05, 4.2, 0xff2e88);
  stripe.position.set(0.85, 0.92, 0);
  g.add(stripe);
  const wheelGeo = () => cyl(0.42, 0.42, 0.35, 0x1a1a1a);
  const wpos = [[-1, 0.42, 1.4], [1, 0.42, 1.4], [-1, 0.42, -1.4], [1, 0.42, -1.4]];
  const wheels = wpos.map(([x, y, z]) => { const w = wheelGeo(); w.rotation.z = Math.PI / 2; w.position.set(x, y, z); g.add(w); return w; });
  g.userData.wheels = wheels;
  const light1 = box(0.3, 0.2, 0.1, 0xfff2b0, { emissive: 0xffe27a, emissiveIntensity: 0.6 });
  light1.position.set(-0.7, 0.65, 2.1);
  g.add(light1);
  const light2 = light1.clone(); light2.position.x = 0.7; g.add(light2);
  return g;
}

function createPoliceCarMesh() {
  const g = createCabrioMesh(0x1b1b3a);
  const bar = box(1.2, 0.25, 0.5, 0x222222);
  bar.position.set(0, 1.35, -0.2);
  g.add(bar);
  const lr = box(0.5, 0.18, 0.4, 0xff2020, { emissive: 0xff0000, emissiveIntensity: 1 });
  lr.position.set(-0.3, 1.45, -0.2);
  g.add(lr);
  const lb = box(0.5, 0.18, 0.4, 0x2050ff, { emissive: 0x2050ff, emissiveIntensity: 1 });
  lb.position.set(0.3, 1.45, -0.2);
  g.add(lb);
  g.userData.lightL = lr; g.userData.lightR = lb;
  return g;
}

function createBoatMesh(colorBody) {
  const g = grp();
  const hull = box(2.4, 0.9, 5.5, colorBody);
  hull.position.y = 0.6;
  g.add(hull);
  const bow = cone(1.3, 1.6, colorBody);
  bow.rotation.x = Math.PI / 2;
  bow.position.set(0, 0.6, 2.9);
  g.add(bow);
  const cabin = box(1.6, 0.8, 1.6, 0xe8e8ec);
  cabin.position.set(0, 1.35, -0.6);
  g.add(cabin);
  const engine = box(1.4, 0.6, 0.6, 0x1a1a1a);
  engine.position.set(0, 0.8, -2.7);
  g.add(engine);
  return g;
}

function createPoliceBoatMesh() {
  const g = createBoatMesh(0x263850);
  const lr = box(0.4, 0.2, 0.3, 0xff2020, { emissive: 0xff0000, emissiveIntensity: 1 });
  lr.position.set(-0.4, 1.85, -0.6);
  g.add(lr);
  const lb = box(0.4, 0.2, 0.3, 0x2050ff, { emissive: 0x2050ff, emissiveIntensity: 1 });
  lb.position.set(0.4, 1.85, -0.6);
  g.add(lb);
  g.userData.lightL = lr; g.userData.lightR = lb;
  return g;
}

function createLimoMesh() {
  const g = grp();
  const body = box(2.1, 0.9, 8.5, 0xf5f2ea);
  body.position.y = 0.75;
  g.add(body);
  const cabin = box(1.8, 0.7, 6.4, 0xece6d4);
  cabin.position.set(0, 1.35, -0.2);
  g.add(cabin);
  for (let i = -1; i <= 1; i += 2) {
    for (let k = -1.6; k <= 2.2; k += 1.9) {
      const win = box(0.05, 0.4, 1.2, 0x2a3038, { metalness: 0.5, roughness: 0.2 });
      win.position.set(i * 0.92, 1.4, k);
      g.add(win);
    }
  }
  const wheelPos = [[-1.05, 0.42, 3.2], [1.05, 0.42, 3.2], [-1.05, 0.42, -3.2], [1.05, 0.42, -3.2]];
  wheelPos.forEach(([x, y, z]) => { const w = cyl(0.42, 0.42, 0.35, 0x1a1a1a); w.rotation.z = Math.PI / 2; w.position.set(x, y, z); g.add(w); });
  return g;
}

// ============================================================================
// Entitäten
// ============================================================================
const player = {
  x: MARK.villaSpawn.x, z: MARK.villaSpawn.z, heading: Math.PI / 2,
  speed: 0, slipVX: 0, slipVZ: 0, walkPhase: 0, sprintStamina: 1, vehicle: 'foot',
  mesh: null, cabrioMesh: null, boatMesh: null, footMesh: null,
};
const policeCars = [];
const policeBoats = [];
const officers = [];
const pedestrians = [];
let limo = null;

function buildEntities() {
  player.cabrioMesh = createCabrioMesh(0xff2e88);
  player.boatMesh = createBoatMesh(0x2b3a4a);
  player.footMesh = createPersonMesh({ shirt: 0xff2e88, pants: 0x1c1c26 });
  scene.add(player.cabrioMesh, player.boatMesh, player.footMesh);
  player.cabrioMesh.visible = false;
  player.boatMesh.visible = false;
  player.footMesh.visible = false;

  for (let i = 0; i < 3; i++) {
    const m = createPoliceCarMesh();
    m.visible = false;
    scene.add(m);
    policeCars.push({ mesh: m, x: 0, z: 0, heading: 0, speed: 0, active: false });
  }
  for (let i = 0; i < 2; i++) {
    const m = createPoliceBoatMesh();
    m.visible = false;
    scene.add(m);
    policeBoats.push({ mesh: m, x: 0, z: 0, heading: 0, speed: 0, active: false });
  }
  for (let i = 0; i < 3; i++) {
    const m = createPersonMesh({ shirt: 0x1c2a4a, pants: 0x14141c });
    m.visible = false;
    scene.add(m);
    officers.push({ mesh: m, x: 0, z: 0, heading: 0, speed: 0, active: false, phase: Math.random() * 10 });
  }
  const pedSeed = [270, 300, 330, 360, 390, 420];
  pedSeed.forEach((x, i) => {
    const m = createPersonMesh({ shirt: [0xffffff, 0xffd54a, 0x6ea8ff, 0xff8a6a][i % 4], pants: 0x33333c });
    scene.add(m);
    const z0 = (i % 2 === 0) ? -6 : 6;
    pedestrians.push({ mesh: m, x, z: z0, baseX: x, dir: (i % 2 === 0) ? 1 : -1, phase: Math.random() * 10, range: 16 + Math.random() * 10 });
  });

  limo = createLimoMesh();
  limo.visible = false;
  scene.add(limo);
}

// ============================================================================
// Input
// ============================================================================
const keys = {};
let sprintHeld = false;
window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === 'Shift') sprintHeld = true;
  if (e.key.toLowerCase() === 'c') toggleCamera();
  if (e.key.toLowerCase() === 'f') { if (missionState.inDialog) advanceDialogLine(); }
});
window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
  if (e.key === 'Shift') sprintHeld = false;
});

let joySteer = 0, joyThrottle = 0;
function setupTouch() {
  const joy = document.getElementById('joystick');
  const knob = document.getElementById('joystickKnob');
  const R = 40;
  let active = false, originX = 0, originY = 0;

  joy.addEventListener('pointerdown', (e) => {
    active = true;
    joy.setPointerCapture(e.pointerId);
    const r = joy.getBoundingClientRect();
    originX = r.left + r.width / 2; originY = r.top + r.height / 2;
    moveKnob(e);
  });
  window.addEventListener('pointermove', (e) => { if (active) moveKnob(e); });
  window.addEventListener('pointerup', resetKnob);
  window.addEventListener('pointercancel', resetKnob);

  function moveKnob(e) {
    let dx = e.clientX - originX, dy = e.clientY - originY;
    dx = Math.max(-R, Math.min(R, dx));
    dy = Math.max(-R, Math.min(R, dy));
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    joySteer = dx / R;
    joyThrottle = -dy / R;
  }
  function resetKnob() {
    active = false;
    knob.style.transform = 'translate(0,0)';
    joySteer = 0; joyThrottle = 0;
  }

  const btnJump = document.getElementById('btnJump');
  btnJump.addEventListener('pointerdown', () => { sprintHeld = true; });
  btnJump.addEventListener('pointerup', () => { sprintHeld = false; });
  btnJump.addEventListener('pointercancel', () => { sprintHeld = false; });

  document.getElementById('btnAction').addEventListener('pointerdown', () => {
    if (missionState.inDialog) advanceDialogLine();
  });
}

function computeInput() {
  let steer = joySteer, throttle = joyThrottle;
  if (keys['a'] || keys['arrowleft']) steer = -1;
  if (keys['d'] || keys['arrowright']) steer = 1;
  if (keys['w'] || keys['arrowup']) throttle = 1;
  if (keys['s'] || keys['arrowdown']) throttle = -1;
  return { steer, throttle };
}

// ============================================================================
// Physik
// ============================================================================
function boxClamp(x, z, box2) {
  return { x: Math.min(Math.max(x, box2.xMin + 3), box2.xMax - 3), z: Math.min(Math.max(z, box2.zMin + 3), box2.zMax - 3) };
}

function pushOutCircle(x, z, cx, cz, r) {
  const dx = x - cx, dz = z - cz;
  const d = Math.hypot(dx, dz) || 0.001;
  if (d < r) {
    const nx = dx / d, nz = dz / d;
    return { x: cx + nx * r, z: cz + nz * r, hit: true };
  }
  return { x, z, hit: false };
}

function corridorClamp(cfg, x, z) {
  if (x < cfg.xMin || x > cfg.xMax) return z;
  const target = roadZAt(cfg, x);
  const half = cfg.half;
  return Math.min(Math.max(z, target - half), target + half);
}

function physicsStep(dt) {
  const input = computeInput();
  if (player.vehicle === 'cabrio') stepCar(dt, input, TUNE.cabrio, true);
  else if (player.vehicle === 'boat') stepBoat(dt, input);
  else if (player.vehicle === 'foot') stepFoot(dt, input);
}

function stepCar(dt, input, T, onRoad) {
  const accel = input.throttle > 0 ? T.accel : T.brake;
  player.speed += input.throttle * accel * dt;
  player.speed *= Math.pow(T.drag, dt * 60);
  player.speed = Math.max(-T.maxSpeed * 0.5, Math.min(T.maxSpeed, player.speed));
  const speedFactor = Math.min(1, Math.abs(player.speed) / 6 + 0.35);
  const dir = player.speed >= 0 ? 1 : -1;
  player.heading += input.steer * T.turnRate * dt * speedFactor * dir;

  const fx = Math.sin(player.heading), fz = Math.cos(player.heading);
  let nx = player.x + fx * player.speed * dt;
  let nz = player.z + fz * player.speed * dt;

  const phase = missionState.phase;
  if (phase === PHASES.DRIVE_VILLA.id || phase === PHASES.CALL_DANTE.id || phase === PHASES.DIALOG_VIKTOR.id) {
    const c = boxClamp(nx, nz, WORLD.villaBox);
    nx = c.x; nz = c.z;
  } else if (phase === PHASES.DRIVE_HARBOR.id) {
    if (nx >= WORLD.roadA.xMin && nx <= WORLD.roadA.xMax) {
      nz = corridorClamp(WORLD.roadA, nx, nz);
    } else {
      const c = boxClamp(nx, nz, nx < WORLD.roadA.xMin ? WORLD.villaBox : WORLD.harborBox);
      nx = c.x; nz = c.z;
    }
  } else if (phase === PHASES.DIALOG_MECH.id) {
    const c = boxClamp(nx, nz, WORLD.harborBox);
    nx = c.x; nz = c.z;
  }

  player.x = nx; player.z = nz;
}

function stepBoat(dt, input) {
  const T = TUNE.boat;
  player.speed += input.throttle * T.accel * dt;
  player.speed *= Math.pow(T.drag, dt * 60);
  player.speed = Math.max(-T.maxSpeed * 0.4, Math.min(T.maxSpeed, player.speed));
  const speedFactor = Math.min(1, Math.abs(player.speed) / 6 + 0.3);
  player.heading += input.steer * T.turnRate * dt * speedFactor;

  const fx = Math.sin(player.heading), fz = Math.cos(player.heading);
  const targetVX = fx * player.speed, targetVZ = fz * player.speed;
  player.slipVX += (targetVX - player.slipVX) * Math.min(1, T.grip * dt * 60);
  player.slipVZ += (targetVZ - player.slipVZ) * Math.min(1, T.grip * dt * 60);

  let nx = player.x + player.slipVX * dt;
  let nz = player.z + player.slipVZ * dt;

  nz = corridorClamp(WORLD.channel, nx, nz);
  nx = Math.max(WORLD.channel.xMin - 8, Math.min(WORLD.channel.xMax + 30, nx));

  channelRocks.forEach((r) => {
    const out = pushOutCircle(nx, nz, r.x, r.z, r.r + 1.2);
    if (out.hit) { nx = out.x; nz = out.z; player.speed *= 0.55; }
  });

  player.x = nx; player.z = nz;
}

function stepFoot(dt, input) {
  const T = TUNE.foot;
  const sprinting = sprintHeld && missionState.phase === PHASES.FOOT_BRIDGE.id && player.sprintStamina > 0.02;
  const maxS = sprinting ? T.sprintSpeed : T.maxSpeed;
  const targetSpeed = input.throttle * maxS;
  const accel = Math.abs(targetSpeed) > Math.abs(player.speed) ? T.accel : T.brake;
  player.speed += Math.sign(targetSpeed - player.speed || 1) * accel * dt;
  if (Math.abs(player.speed - targetSpeed) < accel * dt) player.speed = targetSpeed;
  player.speed = Math.max(-maxS * 0.6, Math.min(maxS, player.speed));

  if (Math.abs(input.steer) > 0.05) player.heading += input.steer * T.turnRate * dt;

  if (missionState.phase === PHASES.FOOT_BRIDGE.id) {
    if (sprinting) player.sprintStamina = Math.max(0, player.sprintStamina - dt * 0.32);
    else player.sprintStamina = Math.min(1, player.sprintStamina + dt * 0.16);
  }

  const fx = Math.sin(player.heading), fz = Math.cos(player.heading);
  let nx = player.x + fx * player.speed * dt;
  let nz = player.z + fz * player.speed * dt;

  const phase = missionState.phase;
  if (phase === PHASES.DIALOG_MECH.id || phase === PHASES.DRIVE_HARBOR.id) {
    const c = boxClamp(nx, nz, WORLD.harborBox);
    nx = c.x; nz = c.z;
  } else if (phase === PHASES.FOOT_BRIDGE.id) {
    const half = bridgeGuard.half - 1.4;
    nz = Math.min(Math.max(nz, -half), half);
    nx = Math.min(Math.max(nx, WORLD.bridge.xMin + 2), WORLD.bridge.xMax - 2);
  } else if (phase === PHASES.PIER_ARRIVE.id || phase === PHASES.DIALOG_ELAINE.id) {
    const c = boxClamp(nx, nz, WORLD.pierBox);
    nx = c.x; nz = c.z;
  }

  player.x = nx; player.z = nz;
  if (Math.abs(player.speed) > 0.3) player.walkPhase += dt * (Math.abs(player.speed) / 5.4);
}

// ============================================================================
// Missions-/Phasen-Zustandsmaschine
// ============================================================================
const missionState = {
  phase: PHASES.CALL_DANTE.id,
  phaseStartTime: 0,
  inDialog: false,
  dialogKey: null,
  dialogLineIdx: 0,
  chaseCarsOn: false,
  chaseBoatsOn: false,
  chaseOfficersOn: false,
  lastCatchTime: -10,
  phoneShown: false,
  cutsceneT: 0,
  won: false,
};

function elapsedSincePhase() {
  return (performance.now() - missionState.phaseStartTime) / 1000;
}

function parseClock(str) {
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
}
function formatClock(mins) {
  mins = Math.round(mins) % (24 * 60);
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function setPhase(id) {
  missionState.phase = id;
  missionState.phaseStartTime = performance.now();
  onPhaseEnter(id);
}

function startMission() {
  document.body.classList.remove('dialog-active');
  document.getElementById('hud').style.opacity = '';
  player.footMesh.visible = false;
  player.cabrioMesh.visible = true;
  player.vehicle = 'cabrio';
  player.x = MARK.villaSpawn.x; player.z = MARK.villaSpawn.z; player.heading = Math.PI / 2;
  setPhase(PHASES.CALL_DANTE.id);
  startDialog('call_dante', () => setPhase(PHASES.DRIVE_VILLA.id));
}

function onPhaseEnter(id) {
  if (id === PHASES.DRIVE_HARBOR.id) {
    missionState.chaseCarsOn = true;
    showWanted(true);
  }
  if (id === PHASES.DIALOG_MECH.id) {
    missionState.chaseCarsOn = false;
    policeCars.forEach((c) => { c.active = false; c.mesh.visible = false; });
  }
  if (id === PHASES.BOAT_CHASE.id) {
    player.cabrioMesh.visible = false;
    player.boatMesh.visible = true;
    player.vehicle = 'boat';
    player.x = MARK.boatDock.x; player.z = MARK.boatDock.z; player.heading = Math.PI / 2;
    player.speed = 4; player.slipVX = 0; player.slipVZ = 0;
    missionState.chaseBoatsOn = true;
    policeBoats.forEach((b, i) => {
      b.active = true; b.mesh.visible = true;
      b.x = MARK.boatDock.x - 20 - i * 10; b.z = MARK.boatDock.z + (i === 0 ? -8 : 8);
      b.heading = Math.PI / 2; b.speed = 0;
    });
    showWanted(true);
  }
  if (id === PHASES.DOCK_BRIDGE.id) {
    missionState.chaseBoatsOn = false;
    policeBoats.forEach((b) => { b.active = false; b.mesh.visible = false; });
    showWanted(false);
  }
  if (id === PHASES.FOOT_BRIDGE.id) {
    player.boatMesh.visible = false;
    player.footMesh.visible = true;
    player.vehicle = 'foot';
    player.x = MARK.bridgeStart.x; player.z = 0; player.heading = Math.PI / 2;
    player.speed = 0; player.sprintStamina = 1;
    missionState.chaseOfficersOn = true;
    officers.forEach((o, i) => {
      o.active = true; o.mesh.visible = true;
      o.x = MARK.bridgeStart.x - 34 - i * 10; o.z = (i - 1) * 5;
      o.heading = Math.PI / 2; o.speed = 0;
    });
    showWanted(true);
    document.getElementById('staminaWrap').classList.add('show');
    document.getElementById('btnJump').classList.add('show');
    missionState.phoneShown = false;
  }
  if (id === PHASES.LIMO_CUTSCENE.id) {
    missionState.chaseOfficersOn = false;
    officers.forEach((o) => { o.active = false; o.mesh.visible = false; });
    showWanted(false);
    document.getElementById('staminaWrap').classList.remove('show');
    document.getElementById('btnJump').classList.remove('show');
    player.footMesh.visible = false;
    limo.visible = true;
    limo.position.set(MARK.limoStart.x, 0, 0);
    limo.rotation.y = Math.PI / 2;
    missionState.cutsceneT = 0;
  }
  if (id === PHASES.PIER_ARRIVE.id) {
    limo.visible = false;
    player.footMesh.visible = true;
    player.vehicle = 'foot';
    player.x = MARK.limoEnd.x; player.z = 0; player.heading = Math.PI / 2;
    player.speed = 0;
  }
  updateObjectiveText();
}

function showWanted(on) {
  const el = document.getElementById('wantedBanner');
  el.textContent = 'GESUCHT';
  el.classList.toggle('show', on);
}

function updateObjectiveText() {
  const o = OBJECTIVES[missionState.phase];
  document.getElementById('objectiveText').textContent = o ? o.text : '';
}

function currentMarker() {
  const o = OBJECTIVES[missionState.phase];
  if (!o) return null;
  return MARK[o.marker];
}

function checkWaypointTrigger() {
  const phase = missionState.phase;
  if (phase === PHASES.DRIVE_VILLA.id) {
    if (dist2D(player, MARK.villa) < 8) {
      startDialog('talk_viktor', () => setPhase(PHASES.DRIVE_HARBOR.id));
    }
  } else if (phase === PHASES.DRIVE_HARBOR.id) {
    if (dist2D(player, MARK.harbor) < 9) {
      setPhase(PHASES.DIALOG_MECH.id);
      startDialog('talk_mechanic', () => setPhase(PHASES.BOAT_CHASE.id));
    }
  } else if (phase === PHASES.BOAT_CHASE.id) {
    if (dist2D(player, MARK.bridgeDock) < 12) {
      setPhase(PHASES.DOCK_BRIDGE.id);
      startDialog('dock_bridge', () => setPhase(PHASES.FOOT_BRIDGE.id));
    }
    if (!missionState.phoneShown && player.x > 150) {
      missionState.phoneShown = true;
      showPhoneToast('phone_elaine');
    }
  } else if (phase === PHASES.FOOT_BRIDGE.id) {
    if (dist2D(player, MARK.bridgeEnd) < 8) {
      setPhase(PHASES.LIMO_CUTSCENE.id);
      startDialog('limo_pickup', null);
    }
  } else if (phase === PHASES.PIER_ARRIVE.id) {
    if (dist2D(player, MARK.pier) < 10) {
      setPhase(PHASES.DIALOG_ELAINE.id);
      startDialog('elaine_pier', winGame);
    }
  }
}

function dist2D(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }

let phoneTimeout = null;
function showPhoneToast(dialogKey) {
  const line = DIALOGS[dialogKey].lines[0];
  const el = document.getElementById('phoneToast');
  document.getElementById('phoneToastText').textContent = line.text;
  el.classList.add('show');
  clearTimeout(phoneTimeout);
  phoneTimeout = setTimeout(() => el.classList.remove('show'), 4200);
}

function winGame() {
  missionState.won = true;
  setPhase(PHASES.WIN.id);
  document.getElementById('endTitle').textContent = WIN_SCREEN.title;
  document.getElementById('endSubtitle').textContent = WIN_SCREEN.subtitle;
  const btn = document.getElementById('endRestartBtn');
  btn.textContent = WIN_SCREEN.restartLabel;
  btn.onclick = () => location.reload();
  const el = document.getElementById('endOverlay');
  el.classList.add('win');
  setTimeout(() => el.classList.add('show'), 400);
}

// ============================================================================
// Dialogsystem (Chat-Bubbles, wie Vice Grid)
// ============================================================================
let dialogOnComplete = null;
const DIALOG_HISTORY_MAX = 3;

function startDialog(key, onComplete) {
  missionState.inDialog = true;
  missionState.dialogKey = key;
  missionState.dialogLineIdx = 0;
  dialogOnComplete = onComplete || null;
  document.body.classList.add('dialog-active');
  const box2 = document.getElementById('dialogBox');
  box2.querySelectorAll('.dchat-row').forEach((r) => r.remove());
  pushNextDialogLine();
}

function pushDialogRow(line) {
  const box2 = document.getElementById('dialogBox');
  const nextRow = document.getElementById('dialogNextRow');
  const row = document.createElement('div');
  const style = SPEAKER_STYLE[line.speaker] || {};
  const isMe = line.speaker === PLAYER_NAME;
  row.className = 'dchat-row' + (isMe ? ' me' : '') + (line.speaker === '' ? ' narration' : '');
  const bubble = document.createElement('div');
  bubble.className = 'dchat-bubble';
  bubble.style.borderColor = style.color ? style.color + '99' : '';
  if (line.speaker) {
    const sp = document.createElement('div');
    sp.className = 'dchat-speaker';
    sp.textContent = line.speaker;
    sp.style.color = style.color || '#ccc';
    bubble.appendChild(sp);
  }
  const txt = document.createElement('div');
  txt.className = 'dchat-text';
  txt.textContent = line.text;
  bubble.appendChild(txt);
  row.appendChild(bubble);
  box2.insertBefore(row, nextRow);
  requestAnimationFrame(() => row.classList.add('show'));

  const rows = Array.from(box2.querySelectorAll('.dchat-row'));
  const keep = rows.slice(-DIALOG_HISTORY_MAX);
  rows.forEach((r) => {
    if (!keep.includes(r)) { r.classList.remove('show'); setTimeout(() => r.remove(), 380); }
    else r.style.opacity = '';
  });
}

function pushNextDialogLine() {
  const lines = DIALOGS[missionState.dialogKey].lines;
  const idx = missionState.dialogLineIdx;
  pushDialogRow(lines[idx]);
  const nextRow = document.getElementById('dialogNextRow');
  nextRow.classList.toggle('show', true);
}

function advanceDialogLine() {
  if (!missionState.inDialog) return;
  const lines = DIALOGS[missionState.dialogKey].lines;
  missionState.dialogLineIdx++;
  if (missionState.dialogLineIdx >= lines.length) {
    endDialog();
    return;
  }
  pushNextDialogLine();
}

function endDialog() {
  missionState.inDialog = false;
  document.getElementById('dialogNextRow').classList.remove('show');
  document.body.classList.remove('dialog-active');
  const box2 = document.getElementById('dialogBox');
  box2.querySelectorAll('.dchat-row').forEach((r) => {
    r.classList.remove('show');
    setTimeout(() => r.remove(), 380);
  });
  const cb = dialogOnComplete;
  dialogOnComplete = null;
  if (cb) cb();
}

document.getElementById('dialogBox').addEventListener('pointerdown', () => { if (missionState.inDialog) advanceDialogLine(); });

// ============================================================================
// Verfolgungs-KI
// ============================================================================
function seekToward(entity, targetX, targetZ, maxSpeed, accel, turnRate, dt) {
  const dx = targetX - entity.x, dz = targetZ - entity.z;
  const desiredHeading = Math.atan2(dx, dz);
  let diff = desiredHeading - entity.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  entity.heading += Math.max(-turnRate * dt, Math.min(turnRate * dt, diff));
  const d = Math.hypot(dx, dz);
  const targetSpeed = d > 6 ? maxSpeed : maxSpeed * (d / 6);
  entity.speed += Math.sign(targetSpeed - entity.speed) * accel * dt;
  entity.speed = Math.max(0, Math.min(maxSpeed, entity.speed));
  entity.x += Math.sin(entity.heading) * entity.speed * dt;
  entity.z += Math.cos(entity.heading) * entity.speed * dt;
}

function updateChasers(dt) {
  if (missionState.chaseCarsOn) {
    policeCars.forEach((c, i) => {
      if (!c.active) {
        if (dist2D(player, { x: MARK.villa.x, z: MARK.villa.z }) < 40 || player.x > MARK.villa.x + 4) {
          c.active = true; c.mesh.visible = true;
          c.x = MARK.villa.x - 6 - i * 8; c.z = MARK.villa.z + (i - 1) * 6;
          c.heading = Math.PI / 2; c.speed = 0;
        }
      }
      if (!c.active) return;
      let tz = corridorClamp(WORLD.roadA, player.x - 6, player.z);
      seekToward(c, player.x - 6, tz, 22, 14, 2.0, dt);
      c.mesh.position.set(c.x, 0, c.z);
      c.mesh.rotation.y = c.heading;
      const blink = Math.sin(performance.now() / 90) > 0;
      c.mesh.userData.lightL.material.emissiveIntensity = blink ? 1.4 : 0.1;
      c.mesh.userData.lightR.material.emissiveIntensity = blink ? 0.1 : 1.4;
      maybeCatch(c, 4.2);
    });
  }
  if (missionState.chaseBoatsOn) {
    policeBoats.forEach((b) => {
      if (!b.active) return;
      const tz = corridorClamp(WORLD.channel, player.x - 8, player.z);
      seekToward(b, player.x - 8, tz, 19, 8, 1.0, dt);
      b.mesh.position.set(b.x, 0, b.z);
      b.mesh.rotation.y = b.heading;
      const blink = Math.sin(performance.now() / 90) > 0;
      b.mesh.userData.lightL.material.emissiveIntensity = blink ? 1.4 : 0.1;
      b.mesh.userData.lightR.material.emissiveIntensity = blink ? 0.1 : 1.4;
      maybeCatch(b, 5);
    });
  }
  if (missionState.chaseOfficersOn) {
    officers.forEach((o) => {
      if (!o.active) return;
      seekToward(o, player.x - 3, player.z, 7.6, 6, 3.4, dt);
      o.mesh.position.set(o.x, 0, o.z);
      o.mesh.rotation.y = o.heading;
      o.phase += dt * (o.speed / 5.4 + 0.001);
      animateWalk(o.mesh, o.phase, o.speed > 0.3);
      maybeCatch(o, 2.4);
    });
  }
}

function maybeCatch(entity, radius) {
  if (missionState.inDialog) return;
  const now = performance.now() / 1000;
  if (now - missionState.lastCatchTime < 3) return;
  if (dist2D(player, entity) < radius) {
    missionState.lastCatchTime = now;
    closeCall();
  }
}

function closeCall() {
  const back = -18;
  const fx = Math.sin(player.heading), fz = Math.cos(player.heading);
  player.x += fx * back; player.z += fz * back;
  player.speed = 0; player.slipVX = 0; player.slipVZ = 0;
  missionState.clockPenaltyMin = (missionState.clockPenaltyMin || 0) + 4;
  showSub('Knapp entkommen! (+4 Min. verloren)');
  flashScreen();
}

let subTimeout = null;
function showSub(text) {
  const el = document.getElementById('subMsg');
  document.getElementById('subMsgText').textContent = text;
  el.classList.add('show');
  clearTimeout(subTimeout);
  subTimeout = setTimeout(() => el.classList.remove('show'), 2600);
}
document.getElementById('subMsgOk').addEventListener('click', () => document.getElementById('subMsg').classList.remove('show'));

function flashScreen() {
  const app = document.getElementById('app');
  app.style.boxShadow = 'inset 0 0 120px 40px rgba(255,40,40,0.6)';
  setTimeout(() => { app.style.boxShadow = ''; }, 260);
}

function updatePedestrians(dt) {
  pedestrians.forEach((p) => {
    p.x += p.dir * 2.0 * dt;
    if (p.x > p.baseX + p.range) p.dir = -1;
    if (p.x < p.baseX - p.range) p.dir = 1;
    p.phase += dt * 1.6;
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = p.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    animateWalk(p.mesh, p.phase, true);
  });
}

// ============================================================================
// Limo-Cutscene
// ============================================================================
function limoStep(dt) {
  missionState.cutsceneT += dt;
  const duration = 11;
  const t = Math.min(1, missionState.cutsceneT / duration);
  const cfg = WORLD.roadB;
  const x = MARK.limoStart.x + (MARK.limoEnd.x - MARK.limoStart.x) * t;
  const z = roadZAt(cfg, x);
  limo.position.set(x, 0, z);
  const nextX = Math.min(x + 4, MARK.limoEnd.x);
  const nz = roadZAt(cfg, nextX);
  limo.rotation.y = Math.atan2(nextX - x, nz - z || 0.001);

  if (!missionState.phoneShown2 && t > 0.45) {
    missionState.phoneShown2 = true;
    showPhoneToast('phone_elaine');
  }

  if (t >= 1) {
    setPhase(PHASES.PIER_ARRIVE.id);
  }
}

// ============================================================================
// Kamera
// ============================================================================
function toggleCamera() {
  cameraMode = cameraMode === 'top' ? 'chase' : 'top';
  const label = document.getElementById('btnCameraToggle');
  if (label) label.textContent = cameraMode === 'top' ? '🎥 Kamera: Oben' : '🎥 Kamera: Verfolgung';
}

function updateCamera(dt) {
  let targetX = player.x, targetZ = player.z, targetH = player.heading;
  let targetPos, lookAt;

  if (missionState.phase === PHASES.LIMO_CUTSCENE.id && limo.visible) {
    targetX = limo.position.x; targetZ = limo.position.z; targetH = limo.rotation.y;
    const side = new THREE.Vector3(Math.cos(targetH), 0, -Math.sin(targetH));
    targetPos = new THREE.Vector3(targetX, 9, targetZ).addScaledVector(side, 16).add(new THREE.Vector3(-6, 0, 0));
    lookAt = new THREE.Vector3(targetX, 1.5, targetZ);
  } else if (missionState.inDialog) {
    const fx = Math.sin(targetH), fz = Math.cos(targetH);
    targetPos = new THREE.Vector3(targetX - fx * 5, 4.2, targetZ - fz * 5);
    lookAt = new THREE.Vector3(targetX + fx * 2, 1.6, targetZ + fz * 2);
  } else if (cameraMode === 'chase') {
    const fx = Math.sin(targetH), fz = Math.cos(targetH);
    targetPos = new THREE.Vector3(targetX - fx * 9, 5.5, targetZ - fz * 9);
    lookAt = new THREE.Vector3(targetX + fx * 4, 1, targetZ + fz * 4);
  } else {
    // Fußgänger sind viel kleiner als Auto/Boot - dieselbe Kamerahöhe wie
    // beim Fahren würde die Figur auf ein paar Pixel schrumpfen, darum
    // niedriger + näher, sobald zu Fuß unterwegs.
    // onFoot braucht einen spürbar flacheren Winkel als Fahrzeuge (nicht nur
    // niedriger) - bei einer fast senkrechten Draufsicht reicht der breite
    // Sichtkegel sonst weit HINTER die Kamera und zeigt verfolgende Cops im
    // Riesenformat direkt am unteren Bildrand statt normal in der Ferne.
    const onFoot = player.vehicle === 'foot';
    const height = onFoot ? 11 : 24;
    const back = onFoot ? 4.5 : 4;
    const fx = Math.sin(targetH), fz = Math.cos(targetH);
    targetPos = new THREE.Vector3(targetX - fx * back, height, targetZ - fz * back);
    lookAt = new THREE.Vector3(targetX, 0, targetZ);
  }

  camera.position.lerp(targetPos, Math.min(1, dt * 4));
  dummyVec.copy(lookAt);
  camera.lookAt(dummyVec);
}

// ============================================================================
// HUD
// ============================================================================
function updateClock() {
  const base = parseClock(PHASES[missionState.phase]?.clockBase || '13:30');
  const elapsed = elapsedSincePhase() * CLOCK_TICK_PER_SEC;
  const penalty = missionState.clockPenaltyMin || 0;
  const mins = base + elapsed + penalty;
  document.getElementById('clockText').textContent = formatClock(mins);
}

function updateHUD() {
  const speedKmh = Math.round(Math.abs(player.speed) * (player.vehicle === 'foot' ? 5 : 5.4));
  document.getElementById('speed').textContent = speedKmh;
  const tag = { cabrio: 'CABRIO', boat: 'MOTORBOOT', foot: 'ZU FUSS', limo: 'LIMOUSINE' }[player.vehicle] || '';
  document.getElementById('vehicleTag').textContent = tag;

  const marker = currentMarker();
  if (marker) {
    const d = Math.round(dist2D(player, marker));
    document.getElementById('objectiveDistance').textContent = d + ' m';
  } else {
    document.getElementById('objectiveDistance').textContent = '';
  }

  document.getElementById('staminaFill').style.width = Math.round(player.sprintStamina * 100) + '%';
  updateClock();
}

// ============================================================================
// Minimap
// ============================================================================
function drawMinimap() {
  const cvs = document.getElementById('minimap');
  const ctx = cvs.getContext('2d');
  const w = cvs.width, h = cvs.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0d2233';
  ctx.fillRect(0, 0, w, h);

  const range = 90;
  const scale = (w / 2) / range;
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-player.heading);

  function worldToMap(wx, wz) { return [(wx - player.x) * scale, -(wz - player.z) * scale]; }

  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = Math.max(6, scale * 20);
  ctx.beginPath();
  const drawSeg = (cfg) => {
    for (let x = cfg.xMin; x <= cfg.xMax; x += 10) {
      const z = roadZAt(cfg, x);
      const [mx, mz] = worldToMap(x, z);
      ctx.lineTo(mx, mz);
    }
  };
  ctx.moveTo(...worldToMap(WORLD.roadA.xMin, roadZAt(WORLD.roadA, WORLD.roadA.xMin)));
  drawSeg(WORLD.roadA);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(80,170,220,0.7)';
  ctx.beginPath();
  ctx.moveTo(...worldToMap(WORLD.channel.xMin, roadZAt(WORLD.channel, WORLD.channel.xMin)));
  drawSeg(WORLD.channel);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(193,68,14,0.8)';
  ctx.lineWidth = Math.max(8, scale * 22);
  ctx.beginPath();
  ctx.moveTo(...worldToMap(WORLD.bridge.xMin, 0));
  ctx.lineTo(...worldToMap(WORLD.bridge.xMax, 0));
  ctx.stroke();

  [policeCars, policeBoats, officers].forEach((arr) => {
    arr.forEach((c) => {
      if (!c.active) return;
      const [mx, mz] = worldToMap(c.x, c.z);
      if (Math.hypot(mx, mz) > w / 2) return;
      const blink = Math.sin(performance.now() / 90) > 0;
      ctx.fillStyle = blink ? '#ff3030' : '#3060ff';
      ctx.beginPath(); ctx.arc(mx, mz, Math.max(3, scale * 4), 0, Math.PI * 2); ctx.fill();
    });
  });

  const marker = currentMarker();
  if (marker) {
    let [mx, mz] = worldToMap(marker.x, marker.z);
    const d = Math.hypot(mx, mz);
    const edge = w / 2 - 10;
    if (d > edge) { mx = mx / d * edge; mz = mz / d * edge; }
    const pulse = 3 + (Math.sin(performance.now() / 260) + 1) * 3;
    ctx.strokeStyle = 'rgba(255,204,0,0.7)';
    ctx.beginPath(); ctx.arc(mx, mz, 6 + pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath(); ctx.arc(mx, mz, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle = '#ff2e88';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

// ============================================================================
// Beleuchtung/Atmosphäre je nach Fortschritt
// ============================================================================
function updateAtmosphere() {
  const p = missionState.phase;
  let t = 0;
  if (p === PHASES.FOOT_BRIDGE.id) t = 0.35;
  else if (p === PHASES.LIMO_CUTSCENE.id) t = 0.7;
  else if (p === PHASES.PIER_ARRIVE.id || p === PHASES.DIALOG_ELAINE.id || p === PHASES.WIN.id) t = 1;
  const dayColor = new THREE.Color(0xaee0f0);
  const sunsetColor = new THREE.Color(0xf5a35a);
  const bg = dayColor.clone().lerp(sunsetColor, t);
  scene.background = bg;
  scene.fog.color = bg;
  scene.fog.near = 60 - t * 20;
  scene.fog.far = 320 - t * 120;
  scene.userData.sun.color.setHex(0xfff2d8).lerp(new THREE.Color(0xffb066), t);
  scene.userData.sun.position.set(80 - t * 40, 140 - t * 90, 40);
}

// ============================================================================
// Settings
// ============================================================================
function setupSettings() {
  const btn = document.getElementById('btnSettings');
  const menu = document.getElementById('settingsMenu');
  btn.addEventListener('click', () => menu.classList.toggle('show'));
  document.getElementById('btnCameraToggle').addEventListener('click', toggleCamera);
  document.getElementById('btnFullscreen').addEventListener('click', () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      (el.requestFullscreen || el.webkitRequestFullscreen || function () {}).call(el);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen || function () {}).call(document);
    }
  });
}
function setupInput() {}

// ============================================================================
// Render-/Update-Loop
// ============================================================================
function updateVehicleVisuals() {
  if (player.vehicle === 'cabrio') {
    player.cabrioMesh.position.set(player.x, 0, player.z);
    player.cabrioMesh.rotation.y = player.heading;
    player.cabrioMesh.userData.wheels.forEach((w) => { w.rotation.x += player.speed * 0.06; });
  } else if (player.vehicle === 'boat') {
    player.boatMesh.position.set(player.x, Math.sin(performance.now() / 500) * 0.05, player.z);
    player.boatMesh.rotation.y = player.heading;
    player.boatMesh.rotation.z = -Math.sin(performance.now() / 400) * 0.02;
  } else if (player.vehicle === 'foot') {
    player.footMesh.position.set(player.x, 0, player.z);
    player.footMesh.rotation.y = player.heading;
    animateWalk(player.footMesh, player.walkPhase, Math.abs(player.speed) > 0.3);
  }
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock3.getDelta());

  if (!missionState.inDialog && missionState.phase !== PHASES.LIMO_CUTSCENE.id && missionState.phase !== PHASES.WIN.id) {
    physicsStep(dt);
    checkWaypointTrigger();
    updateChasers(dt);
    updatePedestrians(dt);
  } else if (missionState.phase === PHASES.LIMO_CUTSCENE.id && !missionState.inDialog) {
    limoStep(dt);
  }

  updateVehicleVisuals();
  updateAtmosphere();
  updateCamera(dt);
  updateHUD();
  drawMinimap();

  renderer.render(scene, camera);
}

init();
