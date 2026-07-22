import * as THREE from '../vendor/three.module.min.js';
import { box, cyl, ball3 } from '../build/primitives.js';
import { resolveObstacles, groundHeightAt, obstaclesByFloor } from '../build/collision.js';
import { BOUNDS, STAIR_X_MIN, STAIR_X_MAX, STAIR_Z_START, STAIR_Z_END, FLOOR2_Y } from '../data/house-plan.js';
import { PLAYER_RADIUS } from './player-constants.js';
import { unlockAudioOnFirstInput, playFootstep, playJump, playLand } from './audio.js';

const JUMP_STATE = { NONE: 0, WINDUP: 1, AIR: 2, LAND: 3 };
const WINDUP_DUR = 0.2;
const LAND_DUR = 0.25;

const SPEED_MAX = 0.75;
const ACCEL_RATE = 2.25;
const DECEL_RATE = 3.0;
const TURN_RATE = 1.1;
// Floatier, longer-hanging jump arc than a strict real-world fall — reaches
// roughly sofa/chair/nightstand height (~0.55m) and hangs in the air for
// about 1s (vs. ~0.24m/0.37s originally), so most furniture becomes jumpable.
const GRAVITY = -4.2;
const JUMP_VEL = 2.15;
// Extra steering while airborne, on top of the momentum captured at takeoff
// (see launchVX/launchVZ) — deliberately small so the jump reads as a
// committed arc rather than a mid-air dash.
const AIR_SPEED_MULT = 0.4;
const WALK_ANIM_RATE = 11;

function lerp(a, b, t) { return a + (b - a) * t; }
function inStairwell(x, z) {
    return x > STAIR_X_MIN && x < STAIR_X_MAX && z > STAIR_Z_START && z < STAIR_Z_END;
}

// Spielfigur: 10cm kleines Spielzeug-Model (Hüfte+Knie-Gelenkkette Beine,
// Torso, Arme, Kopf+Barett) + State + Input (Tastatur/Touch) + Bewegung/
// Sprung-Zustandsautomat/Kollision + Lauf-/Sprunganimation.
export function createPlayer(world) {
    const player = new THREE.Group();
    const skin = 0xffcf9e;
    const tunic = 0x3f6fd1;
    const trim = 0xffd166;

    const HIP_Y = 0.036, THIGH_LEN = 0.020, SHIN_LEN = 0.016;
    function legChain(x) {
        const hip = new THREE.Group();
        hip.position.set(x, HIP_Y, 0);
        player.add(hip);
        hip.add(cyl(0.0075, 0.008, THIGH_LEN, 0x274a8f, 0, -THIGH_LEN / 2, 0, { seg: 10 }));
        const knee = new THREE.Group();
        knee.position.set(0, -THIGH_LEN, 0);
        hip.add(knee);
        knee.add(cyl(0.006, 0.0075, SHIN_LEN, 0x274a8f, 0, -SHIN_LEN / 2, 0, { seg: 10 }));
        return { hip, knee };
    }
    const legL = legChain(-0.010);
    const legR = legChain(0.010);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.030, 4, 10), new THREE.MeshStandardMaterial({ color: tunic, roughness: 0.6 }));
    torso.position.set(0, 0.053, 0);
    torso.castShadow = true;
    player.add(torso);
    player.add(box(0.040, 0.006, 0.019, trim, 0, 0.040, 0));

    const armL = cyl(0.005, 0.006, 0.027, tunic, -0.023, 0.052, 0, { seg: 8 });
    const armR = cyl(0.005, 0.006, 0.027, tunic, 0.023, 0.052, 0, { seg: 8 });
    player.add(armL, armR);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.016, 20, 16), new THREE.MeshStandardMaterial({ color: skin, roughness: 0.6 }));
    head.position.set(0, 0.082, 0);
    head.castShadow = true;
    player.add(head);

    const beretColor = 0xd6413f;
    const beretCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.0135, 16, 10, 0, Math.PI * 2, 0, Math.PI / 1.8),
        new THREE.MeshStandardMaterial({ color: beretColor, roughness: 0.6 })
    );
    beretCap.position.set(0, 0.092, 0);
    beretCap.castShadow = true;
    player.add(beretCap);
    player.add(cyl(0.0145, 0.0145, 0.004, beretColor, 0, 0.085, 0, { seg: 16 }));
    player.add(ball3(0.002, 0x222222, -0.006, 0.083, 0.014, { seg: 8 }));
    player.add(ball3(0.002, 0x222222, 0.006, 0.083, 0.014, { seg: 8 }));

    const bodyTilt = new THREE.Group();
    bodyTilt.add(player);
    world.add(bodyTilt);

    // Spawnt im Kinderzimmer 2 (offener Boden zwischen Schaukelpferd und
    // Rennbahn, Richtung Fensterwand) statt unten im Flur.
    const state = {
        x: 2.2, z: 1.6, y: 0, vy: 0,
        yaw: 0,
        grounded: true,
        moveSpeed: 0,
        walkPhase: 0,
        jumpState: JUMP_STATE.NONE,
        jumpTimer: 0,
        jumpBuffered: false,
        floor: 1,
        baseY: FLOOR2_Y,
        wasInStair: false,
        launchVX: 0, launchVZ: 0,
    };

    unlockAudioOnFirstInput();

    // ---------- Input ----------
    const keys = new Set();
    window.addEventListener('keydown', (e) => {
        keys.add(e.code);
        if (e.code === 'Space') { state.jumpBuffered = true; e.preventDefault(); }
    });
    window.addEventListener('keyup', (e) => keys.delete(e.code));

    // Dedicated on-screen buttons (D-pad + jump), not a single-finger swipe —
    // separate DOM elements each get their own touch listeners, so holding
    // forward and tapping jump at the same time actually works on mobile
    // (a swipe gesture and a tap can't both be tracked off one touch point).
    const touch = { forward: false, back: false, left: false, right: false };
    function bindTouch(id, onChange) {
        const el = document.getElementById(id);
        if (!el) return;
        const set = (v) => (e) => { e.preventDefault(); onChange(v); };
        el.addEventListener('touchstart', set(true), { passive: false });
        el.addEventListener('touchend', set(false), { passive: false });
        // touchcancel fires when the OS interrupts the touch (finger slides
        // off, a system gesture takes over) — without this the button would
        // stay stuck "down" forever since touchend never fires in that case.
        el.addEventListener('touchcancel', set(false), { passive: false });
        el.addEventListener('mousedown', set(true));
        el.addEventListener('mouseup', set(false));
        el.addEventListener('mouseleave', set(false));
    }
    bindTouch('btn-fwd', (v) => { touch.forward = v; });
    bindTouch('btn-back', (v) => { touch.back = v; });
    bindTouch('btn-left', (v) => { touch.left = v; });
    bindTouch('btn-right', (v) => { touch.right = v; });
    bindTouch('btn-jump', (v) => { if (v) state.jumpBuffered = true; });

    function update(dt) {
        dt = Math.min(dt, 0.05);

        if (keys.has('KeyA') || keys.has('ArrowLeft') || touch.left) state.yaw += TURN_RATE * dt;
        if (keys.has('KeyD') || keys.has('ArrowRight') || touch.right) state.yaw -= TURN_RATE * dt;

        const fwdX = Math.sin(state.yaw), fwdZ = Math.cos(state.yaw);
        const wantForward = keys.has('KeyW') || keys.has('ArrowUp') || touch.forward;
        const wantBack = keys.has('KeyS') || keys.has('ArrowDown') || touch.back;
        const wantMove = wantForward || wantBack;

        if (wantMove) state.moveSpeed = Math.min(state.moveSpeed + ACCEL_RATE * dt, SPEED_MAX);
        else state.moveSpeed = Math.max(state.moveSpeed - DECEL_RATE * dt, 0);

        const moveMult = state.jumpState === JUMP_STATE.AIR ? AIR_SPEED_MULT : 1;
        if (wantForward) { state.x += fwdX * state.moveSpeed * moveMult * dt; state.z += fwdZ * state.moveSpeed * moveMult * dt; }
        if (wantBack) { state.x -= fwdX * state.moveSpeed * moveMult * dt; state.z -= fwdZ * state.moveSpeed * moveMult * dt; }
        // Momentum captured at takeoff (see WINDUP→AIR below) carries the
        // jump forward along its arc even if the player isn't still holding
        // the direction button mid-air — otherwise a jump only goes straight
        // up unless forward happens to be held for the entire flight.
        if (state.jumpState === JUMP_STATE.AIR) { state.x += state.launchVX * dt; state.z += state.launchVZ * dt; }
        if (wantMove && state.jumpState === JUMP_STATE.NONE) {
            const prevPhase = state.walkPhase;
            state.walkPhase += dt * WALK_ANIM_RATE;
            // Footstep on every half-cycle of the walk animation (each foot's
            // contact with the ground), only while actually grounded/walking.
            if (Math.floor(state.walkPhase / Math.PI) !== Math.floor(prevPhase / Math.PI)) playFootstep();
        }

        state.x = Math.max(BOUNDS.minX + PLAYER_RADIUS, Math.min(BOUNDS.maxX - PLAYER_RADIUS, state.x));
        state.z = Math.max(BOUNDS.minZ + PLAYER_RADIUS, Math.min(BOUNDS.maxZ - PLAYER_RADIUS, state.z));

        const nowInStair = inStairwell(state.x, state.z);
        if (nowInStair) {
            const t = (state.z - STAIR_Z_START) / (STAIR_Z_END - STAIR_Z_START);
            state.baseY = t * FLOOR2_Y;
        } else {
            if (state.wasInStair) state.floor = state.z >= STAIR_Z_END ? 1 : 0;
            state.baseY = state.floor * FLOOR2_Y;
        }
        state.wasInStair = nowInStair;

        [state.x, state.z] = resolveObstacles(state.x, state.z, state.y, PLAYER_RADIUS, obstaclesByFloor[state.floor]);

        if (state.jumpBuffered && state.grounded && state.jumpState !== JUMP_STATE.WINDUP && state.jumpState !== JUMP_STATE.AIR) {
            state.jumpState = JUMP_STATE.WINDUP;
            state.jumpTimer = 0;
            state.jumpBuffered = false;
            // Lock in the horizontal speed/direction at the moment the jump
            // is triggered (not when it actually launches) — otherwise a
            // quick "run then tap jump" loses most of its speed to normal
            // deceleration during the windup pause before takeoff even happens.
            state.launchVX = fwdX * state.moveSpeed;
            state.launchVZ = fwdZ * state.moveSpeed;
        }
        if (state.jumpState === JUMP_STATE.WINDUP) {
            state.jumpTimer += dt;
            if (state.jumpTimer >= WINDUP_DUR) {
                state.vy = JUMP_VEL;
                state.grounded = false;
                state.jumpState = JUMP_STATE.AIR;
                state.jumpTimer = 0;
                playJump();
            }
        }
        if (state.jumpState === JUMP_STATE.LAND) {
            state.jumpTimer += dt;
            if (state.jumpTimer >= LAND_DUR) state.jumpState = JUMP_STATE.NONE;
        }

        state.vy += GRAVITY * dt;
        state.y += state.vy * dt;
        // Ground can be the bare floor (0) or, if the player is over a
        // steppable piece of furniture, that furniture's top surface —
        // letting a well-timed jump land ON TOP of most objects instead of
        // always falling through to the floor.
        const groundY = nowInStair ? 0 : groundHeightAt(state.x, state.z, obstaclesByFloor[state.floor]);
        if (state.y <= groundY) {
            if (state.vy < -0.4 && state.jumpState === JUMP_STATE.AIR) {
                state.jumpState = JUMP_STATE.LAND;
                state.jumpTimer = 0;
                playLand();
                state.launchVX = 0;
                state.launchVZ = 0;
            } else if (state.jumpState === JUMP_STATE.AIR) {
                state.jumpState = JUMP_STATE.NONE;
                state.launchVX = 0;
                state.launchVZ = 0;
            }
            state.y = groundY;
            state.vy = 0;
            state.grounded = true;
        } else {
            state.grounded = false;
        }

        const moving = state.moveSpeed > 0.02;

        bodyTilt.position.set(state.x, state.baseY + state.y, state.z);
        bodyTilt.rotation.y = state.yaw;

        const TORSO_Y = 0.053;
        if (state.jumpState === JUMP_STATE.WINDUP) {
            const t = Math.min(state.jumpTimer / WINDUP_DUR, 1);
            const sq = Math.sin(t * Math.PI * 0.5);
            legL.hip.rotation.x = lerp(legL.hip.rotation.x, 0.62 * sq, 0.32);
            legR.hip.rotation.x = lerp(legR.hip.rotation.x, 0.62 * sq, 0.32);
            legL.knee.rotation.x = lerp(legL.knee.rotation.x, 0.95 * sq, 0.32);
            legR.knee.rotation.x = lerp(legR.knee.rotation.x, 0.95 * sq, 0.32);
            armL.rotation.x = lerp(armL.rotation.x, -0.6 * sq, 0.3);
            armR.rotation.x = lerp(armR.rotation.x, -0.6 * sq, 0.3);
            // Deeper, clearly visible crouch dip before launch (was -0.011).
            torso.position.y = lerp(torso.position.y, TORSO_Y - 0.024 * sq, 0.4);
            torso.rotation.x = lerp(torso.rotation.x, -0.2 * sq, 0.3);
        } else if (state.jumpState === JUMP_STATE.AIR) {
            legL.hip.rotation.x = lerp(legL.hip.rotation.x, -0.70, 0.17);
            legR.hip.rotation.x = lerp(legR.hip.rotation.x, -0.70, 0.17);
            legL.knee.rotation.x = lerp(legL.knee.rotation.x, 1.45, 0.17);
            legR.knee.rotation.x = lerp(legR.knee.rotation.x, 1.45, 0.17);
            armL.rotation.x = lerp(armL.rotation.x, -0.9, 0.2);
            armR.rotation.x = lerp(armR.rotation.x, -0.9, 0.2);
            torso.position.y = lerp(torso.position.y, TORSO_Y + 0.005, 0.2);
            torso.rotation.x = lerp(torso.rotation.x, 0.08, 0.15);
        } else if (state.jumpState === JUMP_STATE.LAND) {
            const t = Math.min(state.jumpTimer / LAND_DUR, 1);
            const sq = 1 - t;
            legL.hip.rotation.x = lerp(legL.hip.rotation.x, 0.72 * sq, 0.32);
            legR.hip.rotation.x = lerp(legR.hip.rotation.x, 0.72 * sq, 0.32);
            legL.knee.rotation.x = lerp(legL.knee.rotation.x, 1.10 * sq, 0.32);
            legR.knee.rotation.x = lerp(legR.knee.rotation.x, 1.10 * sq, 0.32);
            armL.rotation.x = lerp(armL.rotation.x, -0.5 * sq, 0.3);
            armR.rotation.x = lerp(armR.rotation.x, -0.5 * sq, 0.3);
            torso.position.y = lerp(torso.position.y, TORSO_Y - 0.015 * sq, 0.4);
            torso.rotation.x = lerp(torso.rotation.x, 0, 0.3);
        } else {
            const s = moving ? Math.sin(state.walkPhase) : 0;
            const lLeg = s * 0.68, rLeg = -s * 0.68;
            legL.hip.rotation.x = lerp(legL.hip.rotation.x, lLeg * 0.88, 0.35);
            legR.hip.rotation.x = lerp(legR.hip.rotation.x, rLeg * 0.88, 0.35);
            legL.knee.rotation.x = lerp(legL.knee.rotation.x, Math.max(0, lLeg) * 1.0 + Math.max(0, -lLeg) * 0.7, 0.35);
            legR.knee.rotation.x = lerp(legR.knee.rotation.x, Math.max(0, rLeg) * 1.0 + Math.max(0, -rLeg) * 0.7, 0.35);
            const swing = s * 0.55;
            armL.rotation.x = lerp(armL.rotation.x, -swing, 0.3);
            armR.rotation.x = lerp(armR.rotation.x, swing, 0.3);
            torso.position.y = lerp(torso.position.y, TORSO_Y + (moving ? Math.abs(s) * 0.002 : 0), 0.3);
            torso.rotation.x = lerp(torso.rotation.x, 0, 0.3);
        }
    }

    return { state, bodyTilt, update };
}
