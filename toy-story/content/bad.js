import * as THREE from '../vendor/three.module.min.js';
import { createBathtub, createToilet, createSinkPedestal, lampWallSpot, picture } from '../build/primitives.js';
import { addObstacle } from '../build/collision.js';
import { rightX, backZ, FLOOR2_Y } from '../data/house-plan.js';

export function placeBad(world) {
    const tub = createBathtub(1.5, 0.7);
    tub.position.set(2.65, FLOOR2_Y, backZ + 0.5);
    world.add(tub);
    addObstacle(1, 2.65, backZ + 0.5, 1.55, 0.75, 0.5);
    const badWc = createToilet();
    badWc.position.set(4.4, FLOOR2_Y, -1.9);
    badWc.rotation.y = -Math.PI / 2;
    world.add(badWc);
    addObstacle(1, 4.4, -1.9, 0.45, 0.3, 0.28);
    const badSink = createSinkPedestal();
    badSink.position.set(3.4, FLOOR2_Y, -3.6);
    world.add(badSink);
    addObstacle(1, 3.4, -3.6, 0.3, 0.25, 0.6);
    const badRug = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45), new THREE.MeshStandardMaterial({ color: 0x8fc7d8, roughness: 1 }));
    badRug.rotation.x = -Math.PI / 2;
    badRug.position.set(1.3, FLOOR2_Y + 0.004, -2.7);
    world.add(badRug);
    world.add(lampWallSpot(rightX, FLOOR2_Y + 1.0, -3.0, 'x', -1));
    world.add(picture(0.32, 0.32, rightX - 0.01, FLOOR2_Y + 1.5, -2.0, -Math.PI / 2, 0xdcecef, 0xbfe0ea));
    world.add(picture(0.3, 0.3, rightX - 0.01, FLOOR2_Y + 1.4, -0.6, -Math.PI / 2, 0xdcecef, 0xffe6a8));

    return { badRug };
}
