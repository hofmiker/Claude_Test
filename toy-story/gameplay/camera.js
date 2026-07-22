import * as THREE from '../vendor/three.module.min.js';

// Feste Verfolgungskamera hinter der Spielfigur, mit Wandkollisions-Raycast,
// damit die Kamera nie durch Wände/Möbel clippt. Wird erst NACH Platzierung
// aller Inhalte gebaut (braucht world.children für die Blocker-Liste).
export function createCameraRig(camera, cameraBlockers) {
    const CAM_DIST_MOVE = 0.85;
    const CAM_DIST_IDLE = 0.60;
    const CAM_HEIGHT = 0.24;
    const CAM_LOOK_HEIGHT = 0.08;
    let camDist = CAM_DIST_IDLE;

    const camTarget = new THREE.Vector3();
    const camDesired = new THREE.Vector3();
    const camRay = new THREE.Raycaster();
    const camRayDir = new THREE.Vector3();
    const camPivot = new THREE.Vector3();

    function lerp(a, b, t) { return a + (b - a) * t; }

    function update(dt, state) {
        const fwdX = Math.sin(state.yaw), fwdZ = Math.cos(state.yaw);
        const moving = state.moveSpeed > 0.02;

        camDist = lerp(camDist, moving ? CAM_DIST_MOVE : CAM_DIST_IDLE, Math.min(1, dt * 2.5));

        camPivot.set(state.x, state.baseY + state.y + 0.055, state.z);
        camDesired.set(
            state.x - fwdX * camDist,
            state.baseY + state.y + CAM_HEIGHT,
            state.z - fwdZ * camDist
        );
        camRayDir.subVectors(camDesired, camPivot);
        const desiredDist = camRayDir.length();
        camRayDir.normalize();
        camRay.set(camPivot, camRayDir);
        camRay.far = desiredDist;
        camRay.near = 0.02;
        const hits = camRay.intersectObjects(cameraBlockers, true);
        let allowedDist = desiredDist;
        if (hits.length) allowedDist = Math.max(0.15, hits[0].distance - 0.06);
        if (allowedDist < desiredDist) camDesired.copy(camPivot).addScaledVector(camRayDir, allowedDist);
        camera.position.lerp(camDesired, Math.min(1, dt * 6));

        camTarget.lerp(new THREE.Vector3(state.x, state.baseY + state.y + CAM_LOOK_HEIGHT, state.z), Math.min(1, dt * 8));
        camera.lookAt(camTarget);
    }

    return { update };
}
