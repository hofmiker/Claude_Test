import * as THREE from '../vendor/three.module.min.js';
import { box, createDesk, chair, picture, lampPendant } from '../build/primitives.js';
import { addObstacle } from '../build/collision.js';
import { leftX, FLOOR2_Y, upperCeilingY } from '../data/house-plan.js';

export function placeKinderzimmer1(world) {
    const sisterBed = new THREE.Group();
    sisterBed.add(box(1.0, 0.3, 1.9, 0xffffff, 0, 0.15, 0));
    sisterBed.add(box(1.05, 0.5, 0.08, 0xe07fae, 0, 0.4, -0.91));
    sisterBed.add(box(0.9, 0.09, 0.45, 0xffd6ea, 0, 0.35, -0.55));
    sisterBed.position.set(-4.0, FLOOR2_Y, 2.0);
    world.add(sisterBed);
    addObstacle(1, -4.0, 2.0, 1.1, 1.95, 0.3);
    const sisterDesk = createDesk(0xe8b6cf);
    sisterDesk.position.set(-1.5, FLOOR2_Y, 1.5);
    world.add(sisterDesk);
    addObstacle(1, -1.5, 1.5, 0.8, 0.55, 0.57);
    const sisterChair = chair(-1.5, 1.85, Math.PI, 0xd6a0bf);
    sisterChair.position.y = FLOOR2_Y;
    world.add(sisterChair);
    addObstacle(1, -1.5, 1.85, 0.42, 0.42, 0.44);
    const sisterRug = new THREE.Mesh(new THREE.CircleGeometry(0.75, 32), new THREE.MeshStandardMaterial({ color: 0xf0a8c8, roughness: 1 }));
    sisterRug.rotation.x = -Math.PI / 2;
    sisterRug.position.set(-2.6, FLOOR2_Y + 0.004, 2.6);
    world.add(sisterRug);
    world.add(picture(0.32, 0.32, leftX + 0.01, FLOOR2_Y + 1.5, 1.2, Math.PI / 2, 0xe8b6cf, 0xffe27a));
    world.add(picture(0.3, 0.3, leftX + 0.01, FLOOR2_Y + 1.4, 3.2, Math.PI / 2, 0xe8b6cf, 0xbfe0ea));
    world.add(lampPendant(-3.0, upperCeilingY(2.8), 2.8));

    return { sisterRug };
}
