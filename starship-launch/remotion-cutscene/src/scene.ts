// Ported from ../../index.html (starship-launch): the launch-through-landing
// cinematic only. Gameplay, UI/HUD, audio, the post-landing ramp/hatch/astronaut
// walkout, and every open-world-only landmark (space station, solar park, comms
// mast, rover/rig, crystals, pickup stones, decorative rocks) are intentionally
// left out -- the camera in this segment never frames them, so building them
// would add cost without changing a single visible pixel.
//
// IMPORTANT: this module keeps mutable state (activePuffs, camState, the
// launch/moon "state" flags) across calls to renderFrame(), exactly like the
// original requestAnimationFrame loop kept state across ticks. That only
// produces correct output when frames are advanced strictly in ascending
// order, one step at a time -- i.e. `remotion render --concurrency=1`.
// Scrubbing the Remotion Studio timeline backwards, or rendering with
// concurrency > 1, will desync it. This mirrors the source file's own
// assumption (a single ongoing rAF loop) rather than inventing a new one.
import * as THREE from "three";

export const FPS = 60;
export const WIDTH = 1920;
export const HEIGHT = 1080;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* ---------- timeline (unchanged from starship-launch/index.html) ---------- */
const T_COUNTDOWN = 10.0;
const T_IGNITE = 9.4;
const T_LIFTOFF = 10.6;
const T_ASCENT_END = 34.0;
const T_BLACK = 35.2;
const T_MOON_IN = 36.4;
const T_MOON_TOUCHDOWN = 46.4;
const ASCENT_DIST = 700;
const ASCENT_EXP = 2.6;
const MOON_START_Y = 260;
const LOW_ALT_THRESHOLD = 90;
const SEPARATION_ALT = 400;
const FALL_G = 14;
// One beat past touchdown; the source file's post-landing cutscene (ramp
// deploy / hatch / astronaut walkout) starts at T_MOON_TOUCHDOWN+1.2 -- we
// stop just short of that so its code never has to be ported at all.
const T_RAMP_START = T_MOON_TOUCHDOWN + 1.2;
export const SIM_CAP = T_RAMP_START - 0.05;

const FADE_START_SEC = T_MOON_TOUCHDOWN + 1.6;
const FADE_END_SEC = FADE_START_SEC + 1.0;
export const TOTAL_DURATION_SEC = FADE_END_SEC;
export const DURATION_IN_FRAMES = Math.round(TOTAL_DURATION_SEC * FPS);

const PAD_X = 0,
  PAD_TOP = 6;
const PLATFORM_H = 3;

function currentAltitude(tt: number) {
  if (tt < T_LIFTOFF) return 0;
  const p = clamp((tt - T_LIFTOFF) / (T_ASCENT_END - T_LIFTOFF), 0, 1);
  return ASCENT_DIST * Math.pow(p, ASCENT_EXP);
}
function altitudeVelocity(tt: number) {
  const h = 0.05;
  return (currentAltitude(tt + h) - currentAltitude(tt - h)) / (2 * h);
}

export type OverlayState = {
  countdownText: string;
  countdownOpacity: number;
  skyBackground: string;
  glow: { left: number; top: number; opacity: number } | null;
  fadeOpacity: number;
};

export function createCutsceneScene(canvas: HTMLCanvasElement) {
  /* ---------- renderer / scene / camera ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(1);
  renderer.setSize(WIDTH, HEIGHT, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, WIDTH / HEIGHT, 0.1, 6000);

  const hemi = new THREE.HemisphereLight(0xbfe0ff, 0xd6d2bf, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.15);
  sun.position.set(120, 220, 160);
  scene.add(sun);
  const fill = new THREE.AmbientLight(0x8899aa, 0.25);
  scene.add(fill);

  /* ---------- materials ---------- */
  const MAT = {
    metal: new THREE.MeshStandardMaterial({ color: 0xd9dde2, flatShading: true, metalness: 0.35, roughness: 0.5 }),
    metalDark: new THREE.MeshStandardMaterial({ color: 0x9195a0, flatShading: true, metalness: 0.4, roughness: 0.5 }),
    engineDark: new THREE.MeshStandardMaterial({ color: 0x24252a, flatShading: true, roughness: 0.85 }),
    tower: new THREE.MeshStandardMaterial({ color: 0xb7bbc1, flatShading: true, roughness: 0.75 }),
    towerDark: new THREE.MeshStandardMaterial({ color: 0x6b6f76, flatShading: true, roughness: 0.8 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xffcc00, flatShading: true, roughness: 0.55 }),
    red: new THREE.MeshStandardMaterial({ color: 0xe0362b, flatShading: true, roughness: 0.55 }),
    pad: new THREE.MeshStandardMaterial({ color: 0x585c62, flatShading: true, roughness: 0.95 }),
    trench: new THREE.MeshStandardMaterial({ color: 0x18181b, flatShading: true, roughness: 1 }),
    ground: new THREE.MeshStandardMaterial({ color: 0x4f9a48, flatShading: true, roughness: 1 }),
    sea: new THREE.MeshStandardMaterial({ color: 0x1f7fae, flatShading: true, roughness: 0.3, metalness: 0.2 }),
    scrub: new THREE.MeshStandardMaterial({ color: 0x3f8a3a, flatShading: true, roughness: 1 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x7a5738, flatShading: true, roughness: 1 }),
    frond: new THREE.MeshStandardMaterial({ color: 0x3f9c46, flatShading: true, roughness: 1 }),
    tank: new THREE.MeshStandardMaterial({ color: 0xe7e9ec, flatShading: true, roughness: 0.6 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0xb9b9ae, flatShading: true, roughness: 0.9 }),
    asphalt: new THREE.MeshStandardMaterial({ color: 0x3a3a3e, flatShading: true, roughness: 0.9 }),
    hangarWall: new THREE.MeshStandardMaterial({ color: 0xe6e8ea, flatShading: true, roughness: 0.75 }),
    hangarRoof: new THREE.MeshStandardMaterial({ color: 0x8992a0, flatShading: true, roughness: 0.7 }),
    moonGround: new THREE.MeshStandardMaterial({ color: 0x9a9a9a, flatShading: true, roughness: 1 }),
    moonBase: new THREE.MeshStandardMaterial({ color: 0xd6d8db, flatShading: true, roughness: 0.6, metalness: 0.2 }),
    moonBaseDark: new THREE.MeshStandardMaterial({ color: 0x53565c, flatShading: true, roughness: 0.6, metalness: 0.2 }),
    earth: new THREE.MeshStandardMaterial({ color: 0x2f7fe0, emissive: 0x1f5fb0, emissiveIntensity: 0.9, flatShading: true, roughness: 0.6 }),
    earthCloud: new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, transparent: true, opacity: 0.5, roughness: 1 }),
    lampGlow: new THREE.MeshBasicMaterial({ color: 0xffe9b0, toneMapped: false }),
  };

  /* ---------- engine exhaust glow ---------- */
  function buildFlame(scale: number) {
    const core = new THREE.Mesh(new THREE.ConeGeometry(3.8 * scale, 20 * scale, 10), new THREE.MeshBasicMaterial({ color: 0xfff6d0, toneMapped: false }));
    core.rotation.x = Math.PI;
    core.position.y = -8.5 * scale;
    const mid = new THREE.Mesh(new THREE.ConeGeometry(5.6 * scale, 14 * scale, 10), new THREE.MeshBasicMaterial({ color: 0xffa93c, transparent: true, opacity: 0.88, blending: THREE.AdditiveBlending, toneMapped: false }));
    mid.rotation.x = Math.PI;
    mid.position.y = -4.5 * scale;
    const halo = new THREE.Mesh(new THREE.SphereGeometry(11.5 * scale, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.52, blending: THREE.AdditiveBlending, toneMapped: false }));
    halo.position.y = -1.3 * scale;
    const outer = new THREE.Mesh(new THREE.SphereGeometry(19 * scale, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff5010, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, toneMapped: false }));
    const grp = new THREE.Group();
    grp.add(outer, halo, mid, core);
    return { grp, core, mid, halo, outer };
  }
  type Flame = ReturnType<typeof buildFlame>;
  function buildEngineGlow(scale: number, offsets: [number, number][]) {
    const root = new THREE.Group();
    const flames = offsets.map(([ox, oz]) => {
      const f = buildFlame(scale);
      f.grp.position.set(ox, 0, oz);
      root.add(f.grp);
      return f;
    });
    root.visible = false;
    (root.userData as { flames: Flame[] }).flames = flames;
    return root;
  }
  function pulseEngine(glow: THREE.Group, tt: number, freq: number) {
    (glow.userData.flames as Flame[]).forEach((u, idx) => {
      const ph = idx * 0.7;
      u.core.scale.setScalar(0.85 + Math.sin(tt * freq + ph) * 0.15);
      u.mid.scale.setScalar(0.9 + Math.sin(tt * freq * 0.8 + 1 + ph) * 0.2);
      (u.mid.material as THREE.MeshBasicMaterial).opacity = 0.78 + Math.sin(tt * freq * 1.3 + ph) * 0.15;
      (u.halo.material as THREE.MeshBasicMaterial).opacity = 0.46 + Math.sin(tt * freq * 0.9 + 2 + ph) * 0.16;
      (u.outer.material as THREE.MeshBasicMaterial).opacity = 0.2 + Math.sin(tt * freq * 0.6 + ph) * 0.08;
    });
  }

  /* ---------- rocket: booster + ship ---------- */
  const boosterR = 8,
    boosterH = 80;
  const shipRb = 7.6,
    shipRt = 6.4,
    shipH = 45,
    noseH = 15;

  function buildBoosterPart() {
    const g = new THREE.Group();
    let y = 0;
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(boosterR * 1.02, boosterR * 1.1, 6, 8), MAT.engineDark);
    skirt.position.y = y + 3;
    g.add(skirt);
    y += 6;

    const raptors = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const r = i === 0 ? 0 : boosterR * 0.55;
      const m = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.4, 6), MAT.engineDark);
      m.position.set(Math.cos(a) * r, 4.4, Math.sin(a) * r);
      m.rotation.x = Math.PI;
      raptors.add(m);
    }
    g.add(raptors);

    const booster = new THREE.Mesh(new THREE.CylinderGeometry(boosterR, boosterR, boosterH, 8), MAT.metal);
    booster.position.y = y + boosterH / 2;
    g.add(booster);

    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(4.5, 7, 0.6), MAT.metalDark);
      fin.position.set(Math.cos(a) * (boosterR + 1.6), y + boosterH - 10, Math.sin(a) * (boosterR + 1.6));
      fin.rotation.y = -a;
      fin.rotation.z = 0.18;
      g.add(fin);
    }

    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(boosterR + 0.05, boosterR + 0.05, 3, 8), MAT.red);
    stripe.position.y = y + boosterH - 4;
    g.add(stripe);

    y += boosterH;

    const boosterFlameOffsets: [number, number][] = Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * Math.PI * 2,
        r = i === 0 ? 0 : boosterR * 0.55;
      return [Math.cos(a) * r, Math.sin(a) * r];
    });
    const engineGlow = buildEngineGlow(0.95, boosterFlameOffsets);
    engineGlow.position.y = 2;
    g.add(engineGlow);

    g.userData = { topY: y, engineGlow };
    return g;
  }

  function buildShipPart() {
    const g = new THREE.Group();
    let y = 0;

    const interstage = new THREE.Mesh(new THREE.CylinderGeometry(boosterR * 0.98, boosterR, 3, 8), MAT.metalDark);
    interstage.position.y = y + 1.5;
    g.add(interstage);
    y += 3;

    const ship = new THREE.Mesh(new THREE.CylinderGeometry(shipRt, shipRb, shipH, 8), MAT.metal);
    ship.position.y = y + shipH / 2;
    g.add(ship);

    for (let i = 0; i < 2; i++) {
      const s = i === 0 ? 1 : -1;
      const aft = new THREE.Mesh(new THREE.BoxGeometry(0.6, 14, 7), MAT.metalDark);
      aft.position.set(0, y + 9, s * (shipRb + 2.6));
      aft.rotation.x = s * 0.35;
      g.add(aft);
      const fwd = new THREE.Mesh(new THREE.BoxGeometry(0.5, 9, 5), MAT.metalDark);
      fwd.position.set(0, y + shipH - 6, s * (shipRt + 1.8));
      fwd.rotation.x = s * 0.3;
      g.add(fwd);
    }

    const rcsOffsets: [number, number, number][] = [];
    const rcsY = y + shipH * 0.6;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const nx = Math.cos(a) * (shipRb + 1),
        nz = Math.sin(a) * (shipRb + 1);
      const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.4, 6), MAT.metalDark);
      nozzle.position.set(nx, rcsY, nz);
      nozzle.rotation.z = Math.PI / 2;
      nozzle.rotation.y = -a;
      g.add(nozzle);
      rcsOffsets.push([nx, rcsY, nz]);
    }

    y += shipH;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(shipRt, noseH, 8), MAT.metal);
    nose.position.y = y + noseH / 2;
    g.add(nose);
    y += noseH;

    const shipFlameOffsets: [number, number][] = Array.from({ length: 3 }, (_, i) => {
      const a = (i / 3) * Math.PI * 2,
        r = shipRb * 0.42;
      return [Math.cos(a) * r, Math.sin(a) * r];
    });
    const engineGlow = buildEngineGlow(0.8, shipFlameOffsets);
    engineGlow.position.y = 3;
    g.add(engineGlow);

    g.userData = { topY: y, engineGlow, rcsOffsets };
    return g;
  }

  const boosterPart = buildBoosterPart();
  const shipPart = buildShipPart();
  const SHIP_LOCAL_Y = boosterPart.userData.topY as number;

  const rocketStack = new THREE.Group();

  /* ---------- launch pad, tower, ground ---------- */
  const launchScene = new THREE.Group();
  scene.add(launchScene);

  {
    const land = new THREE.Mesh(new THREE.PlaneGeometry(2600, 1500), MAT.ground);
    land.rotation.x = -Math.PI / 2;
    land.position.set(0, 0, 500);
    launchScene.add(land);

    const sea = new THREE.Mesh(new THREE.PlaneGeometry(2600, 1100), MAT.sea);
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, -0.4, -670);
    launchScene.add(sea);

    const landSkirt = new THREE.Mesh(new THREE.CircleGeometry(2600, 64), MAT.sea);
    landSkirt.rotation.x = -Math.PI / 2;
    landSkirt.position.y = -0.6;
    launchScene.add(landSkirt);

    const TOWER_X_PREVIEW = -46;
    const INDUSTRIAL_X = 170,
      INDUSTRIAL_Z = 95;
    function farEnough(x: number, z: number, minD: number) {
      if (Math.hypot(x - PAD_X, z) < minD) return false;
      if (Math.hypot(x - TOWER_X_PREVIEW, z) < minD) return false;
      if (Math.hypot(x - 59, z - 50) < 30) return false;
      if (Math.hypot(x - INDUSTRIAL_X, z - INDUSTRIAL_Z) < 100) return false;
      return true;
    }

    for (let i = 0; i < 70; i++) {
      let x = 0,
        z = 0,
        ok = false,
        tries = 0;
      do {
        x = rand(-420, 420);
        z = rand(20, 340);
        ok = farEnough(x, z, 55);
        tries++;
      } while (!ok && tries < 15);
      const s = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(1.2, 3), 0), MAT.scrub);
      s.position.set(x, 1, z);
      launchScene.add(s);
    }

    function makePalm(x: number, z: number) {
      const grp = new THREE.Group();
      const trunkH = rand(14, 22);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.6, trunkH, 6), MAT.trunk);
      trunk.position.y = trunkH / 2;
      trunk.rotation.z = rand(-0.12, 0.12);
      grp.add(trunk);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const frond = new THREE.Mesh(new THREE.ConeGeometry(1.4, 11, 4), MAT.frond);
        frond.position.set(Math.cos(a) * 3, trunkH, Math.sin(a) * 3);
        frond.rotation.x = Math.PI / 2.15;
        frond.rotation.y = a;
        grp.add(frond);
      }
      grp.position.set(x, 0, z);
      return grp;
    }
    for (let i = 0; i < 14; i++) {
      let x = 0,
        z = 0,
        ok = false,
        tries = 0;
      do {
        x = rand(-380, 380);
        z = rand(30, 330);
        ok = farEnough(x, z, 65);
        tries++;
      } while (!ok && tries < 15);
      launchScene.add(makePalm(x, z));
    }

    const trench = new THREE.Mesh(new THREE.BoxGeometry(70, 10, 16), MAT.trench);
    trench.position.set(PAD_X + 18, -3, 0);
    launchScene.add(trench);

    const pad = new THREE.Mesh(new THREE.CylinderGeometry(30, 32, PAD_TOP, 8), MAT.pad);
    pad.position.set(PAD_X, PAD_TOP / 2, 0);
    launchScene.add(pad);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.BoxGeometry(3, 10, 3), MAT.pad);
      leg.position.set(PAD_X + Math.cos(a) * 24, 1, Math.sin(a) * 24);
      launchScene.add(leg);
    }

    const tanks = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 14, 8), MAT.tank);
      t.position.set(48 + (i % 3) * 11, 7, 40 + Math.floor(i / 3) * 11);
      tanks.add(t);
    }
    launchScene.add(tanks);

    const plazaGeo = new THREE.PlaneGeometry(150, 100);
    plazaGeo.rotateX(-Math.PI / 2);
    const plaza = new THREE.Mesh(plazaGeo, MAT.concrete);
    plaza.position.set(15, 0.05, 20);
    launchScene.add(plaza);

    const roadDX = INDUSTRIAL_X - 60,
      roadDZ = INDUSTRIAL_Z - 50;
    const roadLen = Math.hypot(roadDX, roadDZ) + 30;
    const roadGeo = new THREE.PlaneGeometry(roadLen, 12);
    roadGeo.rotateX(-Math.PI / 2);
    const road = new THREE.Mesh(roadGeo, MAT.asphalt);
    road.rotation.y = -Math.atan2(roadDZ, roadDX);
    road.position.set((60 + INDUSTRIAL_X) / 2, 0.06, (50 + INDUSTRIAL_Z) / 2);
    launchScene.add(road);

    function makeHangar(x: number, z: number, w: number, d: number, h: number, ry?: number) {
      const grp = new THREE.Group();
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), MAT.hangarWall);
      wall.position.y = h / 2;
      grp.add(wall);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 2.5, 1.6, d + 2.5), MAT.hangarRoof);
      roof.position.y = h + 0.8;
      grp.add(roof);
      const door = new THREE.Mesh(new THREE.BoxGeometry(w * 0.42, h * 0.62, 0.7), MAT.hangarRoof);
      door.position.set(0, h * 0.31, d / 2 + 0.4);
      grp.add(door);
      grp.position.set(x, 0, z);
      grp.rotation.y = ry ?? 0;
      return grp;
    }
    launchScene.add(makeHangar(INDUSTRIAL_X - 55, INDUSTRIAL_Z - 25, 46, 32, 20, 0.15));
    launchScene.add(makeHangar(INDUSTRIAL_X + 15, INDUSTRIAL_Z - 40, 34, 26, 15, -0.1));
    launchScene.add(makeHangar(INDUSTRIAL_X + 40, INDUSTRIAL_Z + 25, 50, 34, 22, 0.3));
    launchScene.add(makeHangar(INDUSTRIAL_X - 30, INDUSTRIAL_Z + 45, 30, 24, 14, -0.25));

    const yardGeo = new THREE.PlaneGeometry(210, 170);
    yardGeo.rotateX(-Math.PI / 2);
    const yard = new THREE.Mesh(yardGeo, MAT.concrete);
    yard.position.set(INDUSTRIAL_X, 0.04, INDUSTRIAL_Z);
    launchScene.add(yard);
  }

  const TOWER_X = -46;
  const tower = new THREE.Group();
  {
    const legOffsets: [number, number][] = [
      [-6, -6],
      [6, -6],
      [-6, 6],
      [6, 6],
    ];
    const towerH = 118,
      seg = 8;
    legOffsets.forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(2.2, towerH, 2.2), MAT.tower);
      leg.position.set(lx, towerH / 2, lz);
      tower.add(leg);
    });
    for (let s = 0; s <= towerH; s += seg) {
      const brace = new THREE.Mesh(new THREE.BoxGeometry(15.5, 1.2, 1.2), MAT.towerDark);
      brace.position.set(0, s, -6);
      tower.add(brace);
      const brace2 = brace.clone();
      brace2.position.z = 6;
      tower.add(brace2);
      const braceX = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 15.5), MAT.towerDark);
      braceX.position.set(-6, s, 0);
      tower.add(braceX);
      const braceX2 = braceX.clone();
      braceX2.position.x = 6;
      tower.add(braceX2);
      if (s % (seg * 2) === 0) {
        const diag = new THREE.Mesh(new THREE.BoxGeometry(21, 0.9, 0.9), MAT.towerDark);
        diag.position.set(0, s + seg / 2, -6);
        diag.rotation.z = 0.36;
        tower.add(diag);
        const diag2 = diag.clone();
        diag2.position.z = 6;
        diag2.rotation.z = -0.36;
        tower.add(diag2);
      }
    }
    const topBlock = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 16), MAT.tower);
    topBlock.position.set(0, towerH + 3, 0);
    tower.add(topBlock);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 10, 6), MAT.towerDark);
    antenna.position.set(0, towerH + 9, 0);
    tower.add(antenna);
    for (let i = 0; i < 6; i++) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(16.4, 2, 16.4), i % 2 === 0 ? MAT.yellow : MAT.red);
      band.position.set(0, 10 + i * 16, -6.2);
      tower.add(band);
    }

    const armPivot = new THREE.Group();
    armPivot.position.set(6, 76, 0);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(34, 3, 4), MAT.yellow);
    arm.position.set(17, 0, 0);
    armPivot.add(arm);
    tower.userData.armPivot = armPivot;
    tower.add(armPivot);

    tower.position.set(TOWER_X, 0, 0);
  }
  launchScene.add(tower);

  rocketStack.add(boosterPart);
  boosterPart.position.set(0, 0, 0);
  rocketStack.add(shipPart);
  shipPart.position.set(0, SHIP_LOCAL_Y, 0);
  rocketStack.position.set(PAD_X, PAD_TOP, 0);
  launchScene.add(rocketStack);

  /* ---------- cloud decks ---------- */
  const cloudSphereGeo = new THREE.SphereGeometry(1, 10, 8);
  function makeCloudLayer(altitude: number, clusterCount: number, spreadRadius: number, opacity: number, sizeRange: [number, number]) {
    const transforms: { x: number; y: number; z: number; s: number }[] = [];
    for (let c = 0; c < clusterCount; c++) {
      const cx = rand(-spreadRadius, spreadRadius);
      const cz = rand(-spreadRadius, spreadRadius);
      const puffs = Math.floor(rand(2, 4));
      for (let i = 0; i < puffs; i++) {
        const size = rand(sizeRange[0], sizeRange[1]);
        transforms.push({
          x: cx + rand(-size * 1.15, size * 1.15),
          y: altitude + rand(-8, 8),
          z: cz + rand(-size * 1.15, size * 1.15),
          s: size,
        });
      }
    }
    const opaque = opacity >= 0.999;
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      flatShading: false,
      roughness: 0.85,
      transparent: !opaque,
      opacity,
      depthWrite: true,
      emissive: 0x333333,
      emissiveIntensity: 0.15,
    });
    const mesh = new THREE.InstancedMesh(cloudSphereGeo, mat, transforms.length);
    const dummy = new THREE.Object3D();
    transforms.forEach((tr, i) => {
      dummy.position.set(tr.x, tr.y, tr.z);
      dummy.scale.setScalar(tr.s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    launchScene.add(mesh);
  }
  makeCloudLayer(260, 20, 700, 1.0, [16, 27]);
  makeCloudLayer(430, 16, 850, 0.9, [19, 31]);
  makeCloudLayer(580, 12, 980, 0.55, [21, 33]);

  /* ---------- stars ---------- */
  const starGeo = new THREE.BufferGeometry();
  const starCount = 1400;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = rand(1400, 2600);
    const theta = rand(0, Math.PI * 2),
      phi = Math.acos(rand(-1, 1));
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.6 + 200;
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0 });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  /* ---------- moon scene (landing pad + terrain immediately around it only) ---------- */
  const moonScene = new THREE.Group();
  moonScene.visible = false;
  scene.add(moonScene);
  {
    const moonSize = 4000,
      segs = 200;
    const moonGeo = new THREE.PlaneGeometry(moonSize, moonSize, segs, segs);
    moonGeo.rotateX(-Math.PI / 2);

    const moonCraters: { x: number; z: number; r: number; depth: number }[] = [];
    const moonHills: { x: number; z: number; r: number; height: number }[] = [];
    function moonCraterY(x: number, z: number) {
      let y = 0;
      for (const c of moonCraters) {
        const d = Math.hypot(x - c.x, z - c.z);
        if (d < c.r) {
          const tt = d / c.r;
          const bowl = -c.depth * (1 - tt * tt);
          if (bowl < y) y = bowl;
        }
      }
      return y;
    }
    function moonHillY(x: number, z: number) {
      let y = 0;
      for (const h of moonHills) {
        const d = Math.hypot(x - h.x, z - h.z);
        if (d < h.r) {
          const tt = d / h.r;
          const dome = h.height * (1 - tt * tt);
          if (dome > y) y = dome;
        }
      }
      return y;
    }
    for (let i = 0; i < 52; i++) {
      let cx = 0,
        cz = 0,
        r = 0,
        ok = false,
        tries = 0;
      do {
        cx = rand(-650, 650);
        cz = rand(-650, 650);
        r = rand(14, 62);
        ok = Math.hypot(cx, cz) > r + 50;
        tries++;
      } while (!ok && tries < 20);
      if (ok) moonCraters.push({ x: cx, z: cz, r, depth: rand(8, 28) });
    }
    for (let i = 0; i < 9; i++) {
      let cx = 0,
        cz = 0,
        r = 0,
        ok = false,
        tries = 0;
      do {
        cx = rand(-700, 700);
        cz = rand(-700, 700);
        r = rand(40, 90);
        ok = Math.hypot(cx, cz) > r + 40;
        tries++;
      } while (!ok && tries < 20);
      if (ok) moonHills.push({ x: cx, z: cz, r, height: rand(3, 7) });
    }
    const pos = moonGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, moonCraterY(pos.getX(i), pos.getZ(i)) + moonHillY(pos.getX(i), pos.getZ(i)));
    }
    moonGeo.computeVertexNormals();
    const surf = new THREE.Mesh(moonGeo, MAT.moonGround);
    moonScene.add(surf);

    function buildLandingBase() {
      const grp = new THREE.Group();
      const plat = new THREE.Mesh(new THREE.CylinderGeometry(24, 26, PLATFORM_H, 8), MAT.moonBase);
      plat.position.y = PLATFORM_H / 2;
      grp.add(plat);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const strut = new THREE.Mesh(new THREE.BoxGeometry(2, PLATFORM_H + 3, 2), MAT.moonBaseDark);
        strut.position.set(Math.cos(a) * 20, -1, Math.sin(a) * 20);
        grp.add(strut);
      }
      const dish = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.6, 10), MAT.moonBaseDark);
      dish.rotation.z = 0.5;
      dish.position.set(-16, PLATFORM_H + 3, 14);
      grp.add(dish);
      const dishPole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 4, 6), MAT.moonBaseDark);
      dishPole.position.set(-16, PLATFORM_H + 1.5, 14);
      grp.add(dishPole);
      const beaconPole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 6, 6), MAT.moonBaseDark);
      beaconPole.position.set(15, PLATFORM_H + 3, -15);
      grp.add(beaconPole);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff3b30, toneMapped: false }));
      beacon.position.set(15, PLATFORM_H + 6.2, -15);
      grp.add(beacon);
      return grp;
    }
    const landingBase = buildLandingBase();
    landingBase.position.set(PAD_X, 0, 0);
    moonScene.add(landingBase);

    function buildLamp() {
      const grp = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 2.4, 6), MAT.moonBaseDark);
      pole.position.y = 1.2;
      grp.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), MAT.lampGlow);
      bulb.position.y = 2.5;
      grp.add(bulb);
      return grp;
    }
    const LAMP_COUNT = 10;
    for (let i = 0; i < LAMP_COUNT; i++) {
      const a = (i / LAMP_COUNT) * Math.PI * 2;
      const lamp = buildLamp();
      lamp.position.set(PAD_X + Math.cos(a) * 25, PLATFORM_H, Math.sin(a) * 25);
      moonScene.add(lamp);
    }

    const earth = new THREE.Mesh(new THREE.SphereGeometry(60, 12, 10), MAT.earth);
    earth.position.set(-420, 16, -900);
    moonScene.add(earth);
    const earthClouds = new THREE.Mesh(new THREE.SphereGeometry(63, 12, 10), MAT.earthCloud);
    earthClouds.position.copy(earth.position);
    moonScene.add(earthClouds);

    const moonSun = new THREE.DirectionalLight(0xffffff, 1.3);
    moonSun.position.set(-150, 200, 120);
    moonScene.add(moonSun);
    const moonAmb = new THREE.HemisphereLight(0x2a2a3a, 0x111111, 0.35);
    moonScene.add(moonAmb);
  }

  /* ---------- particle puffs (smoke / fire / dust) ---------- */
  const puffGeo = new THREE.SphereGeometry(1, 8, 6);
  type PuffMesh = THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  const activePuffs: PuffMesh[] = [];
  function spawnPuff(
    posV: THREE.Vector3,
    opts: {
      color: number;
      opacity?: number;
      emissive?: number;
      emissiveIntensity?: number;
      scale0?: number;
      vel: THREE.Vector3;
      growth?: number;
      maxLife?: number;
      fadeFrom?: number;
      drag?: number;
      maxScale?: number;
    },
    targetGroup?: THREE.Group
  ) {
    const target = targetGroup || launchScene;
    const mat = new THREE.MeshStandardMaterial({
      color: opts.color,
      flatShading: false,
      roughness: 1,
      transparent: true,
      opacity: opts.opacity ?? 0.85,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 0,
    });
    const mesh: PuffMesh = new THREE.Mesh(puffGeo, mat);
    mesh.position.copy(posV);
    const scale0 = opts.scale0 ?? 1.2;
    mesh.scale.setScalar(scale0);
    mesh.userData = {
      vel: opts.vel.clone(),
      growth: opts.growth ?? 6,
      life: 0,
      maxLife: opts.maxLife ?? 3.2,
      fadeFrom: opts.fadeFrom ?? 0.6,
      drag: opts.drag ?? 0.94,
      maxScale: opts.maxScale ?? 40,
    };
    target.add(mesh);
    activePuffs.push(mesh);
  }
  function updatePuffs(dt: number) {
    for (let i = activePuffs.length - 1; i >= 0; i--) {
      const p = activePuffs[i],
        d = p.userData as { vel: THREE.Vector3; growth: number; life: number; maxLife: number; fadeFrom: number; drag: number; maxScale: number };
      d.life += dt;
      p.position.addScaledVector(d.vel, dt);
      d.vel.multiplyScalar(d.drag);
      const grown = p.scale.x + d.growth * dt;
      p.scale.setScalar(Math.min(grown, d.maxScale));
      const lt = d.life / d.maxLife;
      p.material.opacity = lt < d.fadeFrom ? p.material.opacity : Math.max(0, p.material.opacity - dt * 1.4);
      if (d.life > d.maxLife || p.material.opacity <= 0.01) {
        if (p.parent) p.parent.remove(p);
        p.material.dispose();
        activePuffs.splice(i, 1);
      }
    }
  }

  let smokeAccum = 0,
    trailAccum = 0,
    dustAccum = 0;
  function spawnLaunchSmoke(dt: number, centerX: number) {
    smokeAccum += dt;
    const interval = 1 / 20;
    while (smokeAccum > interval) {
      smokeAccum -= interval;
      const ang = rand(0, Math.PI * 2);
      const dist = Math.pow(Math.random(), 0.6) * 46;
      const originX = centerX + Math.cos(ang) * dist;
      const originZ = Math.sin(ang) * dist;
      const fiery = dist < 15 && Math.random() < 0.55;
      if (fiery) {
        spawnPuff(new THREE.Vector3(originX, rand(1, 9), originZ), {
          color: 0xffb347,
          emissive: 0xff5a10,
          emissiveIntensity: 1.7,
          opacity: 0.95,
          vel: new THREE.Vector3((originX - centerX) * 0.6 + rand(-4, 4), rand(9, 18), originZ * 0.6 + rand(-4, 4)),
          growth: rand(9, 14),
          maxLife: rand(0.8, 1.4),
          scale0: rand(1.6, 2.6),
          fadeFrom: 0.3,
          drag: 0.92,
          maxScale: 6,
        });
      } else {
        spawnPuff(new THREE.Vector3(originX, rand(1, 10), originZ), {
          color: 0xf6f4ef,
          opacity: rand(0.78, 0.94),
          vel: new THREE.Vector3((originX - centerX) * 0.45 + rand(-10, 10), rand(5, 11), originZ * 0.45 + rand(-10, 10)),
          growth: rand(5, 8),
          maxLife: rand(16, 24),
          scale0: rand(2.6, 4),
          fadeFrom: 0.88,
          drag: 0.986,
          maxScale: 17,
        });
      }
    }
  }
  function spawnEngineTrail(dt: number, worldPos: THREE.Vector3, scale: number) {
    trailAccum += dt;
    const interval = 1 / 22;
    while (trailAccum > interval) {
      trailAccum -= interval;
      const fiery = Math.random() < 0.75;
      spawnPuff(new THREE.Vector3(worldPos.x + rand(-1.5, 1.5) * scale, worldPos.y + rand(-2, 1) * scale, worldPos.z + rand(-1.5, 1.5) * scale), {
        color: fiery ? 0xffb347 : 0xffe4b8,
        emissive: fiery ? 0xff5a10 : 0xffaa55,
        emissiveIntensity: fiery ? 1.9 : 0.9,
        opacity: 0.92,
        vel: new THREE.Vector3(rand(-4, 4) * scale, rand(-16, -5) * scale, rand(-4, 4) * scale),
        growth: rand(4, 7) * scale,
        maxLife: rand(0.35, 0.65),
        scale0: rand(0.8, 1.4) * scale,
        fadeFrom: 0.2,
        drag: 0.9,
        maxScale: 6 * scale,
      });
    }
  }
  function spawnMoonDust(dt: number, rocketWorldPos: THREE.Vector3, closeness: number) {
    dustAccum += dt;
    const interval = 1 / (18 * closeness + 2);
    while (dustAccum > interval) {
      dustAccum -= interval;
      spawnPuff(
        new THREE.Vector3(rocketWorldPos.x + rand(-4, 4), 0.5, rocketWorldPos.z + rand(-4, 4)),
        {
          color: 0xb9ad95,
          opacity: rand(0.5, 0.75),
          vel: new THREE.Vector3(rand(-30, 30), rand(2, 6), rand(-30, 30)),
          growth: rand(3, 6),
          maxLife: rand(1.6, 2.6),
          scale0: rand(0.8, 1.4),
          fadeFrom: 0.4,
          drag: 0.98,
          maxScale: 8,
        },
        moonScene
      );
    }
  }
  let rcsAccum = 0,
    rcsNextFire = rand(0.6, 1.4);
  function spawnRCS(dt: number) {
    rcsAccum += dt;
    if (rcsAccum < rcsNextFire) return;
    rcsAccum = 0;
    rcsNextFire = rand(0.7, 1.8);
    const offsets = shipPart.userData.rcsOffsets as [number, number, number][];
    const off = offsets[Math.floor(Math.random() * offsets.length)];
    const local = new THREE.Vector3(off[0], off[1], off[2]);
    const worldPos = shipPart.localToWorld(local.clone());
    const outDir = new THREE.Vector3(off[0], 0, off[2]).normalize();
    for (let i = 0; i < 5; i++) {
      spawnPuff(
        worldPos.clone().addScaledVector(outDir, i * 0.7),
        {
          color: 0xf3f2ee,
          opacity: 0.88,
          vel: new THREE.Vector3(outDir.x * rand(20, 34), rand(-2, 2), outDir.z * rand(20, 34)),
          growth: rand(3, 5),
          maxLife: rand(0.35, 0.6),
          scale0: rand(0.5, 0.9),
          fadeFrom: 0.15,
          drag: 0.88,
          maxScale: 3,
        },
        moonScene
      );
    }
  }

  /* ---------- sky / fog ---------- */
  const skyDayTop = "#8ec9f0",
    skyDayBot = "#cfe9ff";
  const skyDuskTop = "#3b3f6b",
    skyDuskBot = "#e08a5a";
  const skyNightTop = "#03040c",
    skyNightBot = "#0c0e22";
  const fogColorDay = new THREE.Color(0xbfe0ff);
  const fogColorNight = new THREE.Color(0x03040c);
  const fog = new THREE.Fog(fogColorDay.getHex(), 500, 1900);
  scene.fog = fog;
  function hexLerp(c1: string, c2: string, tt: number) {
    const a = new THREE.Color(c1),
      b = new THREE.Color(c2);
    return "#" + a.lerp(b, tt).getHexString();
  }
  function skyGradient(tt: number) {
    const p = clamp(currentAltitude(tt) / ASCENT_DIST, 0, 1);
    let top, bot;
    if (p < 0.5) {
      const q = p / 0.5;
      top = hexLerp(skyDayTop, skyDuskTop, q);
      bot = hexLerp(skyDayBot, skyDuskBot, q);
    } else {
      const q = (p - 0.5) / 0.5;
      top = hexLerp(skyDuskTop, skyNightTop, q);
      bot = hexLerp(skyDuskBot, skyNightBot, q);
    }
    fog.color.copy(fogColorDay).lerp(fogColorNight, p);
    stars.material.opacity = smoothstep(0.55, 0.95, p);
    return `linear-gradient(${top},${bot})`;
  }

  /* ---------- camera rig ---------- */
  const camState = { y: 70 };
  camera.position.set(215, 70, 265);
  function updateCameraLaunch(altitude: number, tt: number) {
    const targetY = 70 + altitude;
    camState.y = lerp(camState.y, targetY, 0.06);
    let shakeX = 0,
      shakeY = 0;
    if (tt > T_IGNITE - 0.4 && tt < T_LIFTOFF + 1.2) {
      const amt = smoothstep(T_IGNITE - 0.4, T_IGNITE + 0.4, tt) * (1 - smoothstep(T_LIFTOFF + 0.4, T_LIFTOFF + 1.2, tt));
      shakeX = Math.sin(tt * 47) * amt * 1.4;
      shakeY = Math.cos(tt * 53) * amt * 1.1;
    }
    camera.position.set(215 + shakeX, camState.y + shakeY, 265);
    camera.lookAt(PAD_X, camState.y - 5, 0);
  }
  function updateCameraMoon(altitude: number) {
    const targetY = 90 + altitude * 0.55;
    camState.y = lerp(camState.y, targetY, 0.05);
    camera.position.set(150, camState.y, 200);
    camera.lookAt(PAD_X, camState.y * 0.6, 0);
  }

  /* ---------- glow (screen-space engine flare) ---------- */
  const projV = new THREE.Vector3();
  function computeGlow(worldPos: THREE.Vector3, intensity: number) {
    if (intensity <= 0.01) return null;
    projV.copy(worldPos).project(camera);
    const x = (projV.x * 0.5 + 0.5) * WIDTH;
    const y = (-projV.y * 0.5 + 0.5) * HEIGHT;
    return { left: x, top: y, opacity: intensity };
  }

  /* ---------- countdown ---------- */
  function countdownState(tt: number) {
    if (tt < T_COUNTDOWN) {
      const n = Math.ceil(T_COUNTDOWN - tt);
      return { text: String(Math.max(n, 0)), opacity: tt < 0.6 ? tt / 0.6 : 1 };
    } else if (tt < T_COUNTDOWN + 0.8) {
      return { text: "0", opacity: 1 - (tt - T_COUNTDOWN) / 0.8 };
    }
    return { text: "0", opacity: 0 };
  }

  /* ---------- overlay (black fade) ---------- */
  function overlayOpacity(tt: number) {
    if (tt < 1.2) return 1 - smoothstep(0, 1.2, tt);
    if (tt >= T_ASCENT_END && tt < T_MOON_IN) {
      if (tt < T_BLACK) return smoothstep(T_ASCENT_END, T_BLACK, tt);
      return 1 - smoothstep(T_BLACK, T_MOON_IN, tt);
    }
    return 0;
  }

  /* ---------- timeline state ---------- */
  type SimState = {
    moonSwapped: boolean;
    separated: boolean;
    sepTime: number;
    sepVelY: number;
    sepX0: number;
    sepY0: number;
    sepZ0: number;
    rumbleStarted: boolean;
  };
  function freshState(): SimState {
    return { moonSwapped: false, separated: false, sepTime: 0, sepVelY: 0, sepX0: 0, sepY0: 0, sepZ0: 0, rumbleStarted: false };
  }
  let state: SimState = freshState();
  const tmpV = new THREE.Vector3();
  const dt = 1 / FPS;

  // Rendering keeps mutable state across steps (see file header). This
  // function restores everything to its just-constructed condition, so a
  // non-sequential frame request (Studio scrubbing, `remotion still`, or a
  // parallel/out-of-order renderer) can safely be served by replaying from
  // frame 0 instead of producing whatever the single-shot original loop
  // would have shown -- an empty sky, mid-air, or nothing at all.
  function resetSimulation() {
    state = freshState();
    for (const p of activePuffs.splice(0)) {
      if (p.parent) p.parent.remove(p);
      p.material.dispose();
    }
    smokeAccum = 0;
    trailAccum = 0;
    dustAccum = 0;
    rcsAccum = 0;
    rcsNextFire = rand(0.6, 1.4);
    camState.y = 70;
    camera.position.set(215, 70, 265);
    (tower.userData.armPivot as THREE.Group).rotation.z = 0;
    launchScene.visible = true;
    moonScene.visible = false;
    rocketStack.add(boosterPart);
    boosterPart.position.set(0, 0, 0);
    boosterPart.rotation.set(0, 0, 0);
    boosterPart.visible = true;
    (boosterPart.userData.engineGlow as THREE.Group).visible = false;
    rocketStack.add(shipPart);
    shipPart.position.set(0, SHIP_LOCAL_Y, 0);
    shipPart.rotation.set(0, 0, 0);
    (shipPart.userData.engineGlow as THREE.Group).visible = false;
    rocketStack.position.set(PAD_X, PAD_TOP, 0);
  }

  function stepOnce(t: number): { skyBackground: string; glow: OverlayState["glow"] } {
    let skyBackground = "linear-gradient(#8ec9f0,#cfe9ff)";
    let glow: OverlayState["glow"] = null;

    if (!state.moonSwapped) {
      skyBackground = skyGradient(t);
      const altitude = currentAltitude(t);

      const armProg = smoothstep(T_IGNITE - 0.6, T_LIFTOFF - 0.2, t);
      (tower.userData.armPivot as THREE.Group).rotation.z = -1.05 * armProg;

      if (!state.separated) {
        rocketStack.position.y = PAD_TOP + altitude;

        const bg = boosterPart.userData.engineGlow as THREE.Group;
        if (t > T_IGNITE) bg.visible = true;
        if (t > T_IGNITE && !state.rumbleStarted) {
          state.rumbleStarted = true;
        }
        if (bg.visible) {
          pulseEngine(bg, t, 38);
          bg.getWorldPosition(tmpV);
          spawnEngineTrail(dt, tmpV, 1.15);
        }

        if (altitude < LOW_ALT_THRESHOLD) {
          spawnLaunchSmoke(dt, rocketStack.position.x);
        }

        if (altitude > SEPARATION_ALT) {
          state.separated = true;
          state.sepTime = t;
          state.sepVelY = altitudeVelocity(t);
          boosterPart.getWorldPosition(tmpV);
          state.sepX0 = tmpV.x;
          state.sepY0 = tmpV.y;
          state.sepZ0 = tmpV.z;
          launchScene.add(boosterPart);
          boosterPart.position.copy(tmpV);
          shipPart.getWorldPosition(tmpV);
          launchScene.add(shipPart);
          shipPart.position.copy(tmpV);
          bg.visible = false;
          (shipPart.userData.engineGlow as THREE.Group).visible = true;
        }
      } else {
        shipPart.position.y = PAD_TOP + altitude + SHIP_LOCAL_Y;

        const sg = shipPart.userData.engineGlow as THREE.Group;
        if (t > T_ASCENT_END - 1) sg.visible = altitude < ASCENT_DIST * 0.55;
        if (sg.visible) {
          pulseEngine(sg, t, 38);
          sg.getWorldPosition(tmpV);
          spawnEngineTrail(dt, tmpV, 0.85);
        }

        const dtSep = t - state.sepTime;
        boosterPart.position.y = state.sepY0 + state.sepVelY * dtSep - 0.5 * FALL_G * dtSep * dtSep;
        boosterPart.position.x = state.sepX0 + dtSep * 18;
        boosterPart.position.z = state.sepZ0 + dtSep * 7;
        // Direct function of elapsed time since separation, not `rotation.x += dt*...`:
        // this loop only ever advances forward one fixed dt per frame, so both forms
        // are equivalent -- but the direct form stays correct even if a frame were
        // ever skipped or re-evaluated, which the additive form would not guarantee.
        boosterPart.rotation.x = dtSep * 1.4;
        boosterPart.rotation.z = dtSep * 0.8;
        boosterPart.visible = boosterPart.position.y >= -60;
      }

      updatePuffs(dt);
      updateCameraLaunch(altitude, t);

      const activeGlow = state.separated ? (shipPart.userData.engineGlow as THREE.Group) : (boosterPart.userData.engineGlow as THREE.Group);
      activeGlow.getWorldPosition(tmpV);
      const glowStrength = activeGlow.visible ? clamp(1 - altitude / 260, 0.2, 1) : 0;
      glow = computeGlow(tmpV, glowStrength * 0.95);

      if (t >= T_BLACK && !state.moonSwapped) {
        state.moonSwapped = true;
        launchScene.visible = false;
        moonScene.visible = false;
        launchScene.remove(shipPart);
        moonScene.add(shipPart);
        shipPart.position.set(PAD_X, MOON_START_Y, 0);
        shipPart.rotation.set(0, 0, 0);
        camState.y = 90 + MOON_START_Y * 0.55 + 40;
      }
    } else {
      if (t >= T_MOON_IN && !moonScene.visible) moonScene.visible = true;

      const q = clamp((t - T_MOON_IN) / (T_MOON_TOUCHDOWN - T_MOON_IN), 0, 1);
      const y = MOON_START_Y * (1 - q) * (1 - q) + PLATFORM_H;
      shipPart.position.y = y;

      const sg = shipPart.userData.engineGlow as THREE.Group;
      sg.visible = q > 0.02 && q < 1.0;
      if (sg.visible) {
        pulseEngine(sg, t, 40);
      }

      const closeness = clamp(1 - (y - PLATFORM_H) / 70, 0, 1);
      if (closeness > 0) spawnMoonDust(dt, shipPart.position, closeness);
      if (q > 0.04 && q < 0.94) spawnRCS(dt);
      updatePuffs(dt);

      // Original branches to the post-landing ramp/hatch cutscene once
      // t >= T_RAMP_START; `t` here is capped below that (SIM_CAP), so this
      // is always the touchdown/resting shot -- intentionally, see file header.
      updateCameraMoon(y);

      sg.getWorldPosition(tmpV);
      glow = sg.visible ? computeGlow(tmpV, 0.9) : null;

      skyBackground = "linear-gradient(#03040c,#0a0c1c)";
    }

    return { skyBackground, glow };
  }

  let lastFrameProcessed = -1;

  function renderFrame(frameIndex: number, realT: number): OverlayState {
    const t = Math.min(realT, SIM_CAP);
    let transient: { skyBackground: string; glow: OverlayState["glow"] };

    if (frameIndex === lastFrameProcessed + 1) {
      transient = stepOnce(t);
    } else {
      // Non-sequential request: replay from scratch. Cheap relative to a
      // full render (no GPU rasterization until the final, requested frame),
      // and the only way to get correct output for anything that isn't a
      // strictly ascending `remotion render --concurrency=1` pass.
      resetSimulation();
      let replayed: { skyBackground: string; glow: OverlayState["glow"] } | null = null;
      for (let f = 0; f <= frameIndex; f++) {
        const ft = Math.min(f / FPS, SIM_CAP);
        replayed = stepOnce(ft);
      }
      transient = replayed as { skyBackground: string; glow: OverlayState["glow"] };
    }
    lastFrameProcessed = frameIndex;

    renderer.render(scene, camera);

    const cd = countdownState(t);
    const endFade = smoothstep(FADE_START_SEC, FADE_END_SEC, realT);
    const fadeOpacity = Math.max(overlayOpacity(t), endFade);

    return { countdownText: cd.text, countdownOpacity: cd.opacity, skyBackground: transient.skyBackground, glow: transient.glow, fadeOpacity };
  }

  return { renderFrame };
}
