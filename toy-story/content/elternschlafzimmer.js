import * as THREE from '../vendor/three.module.min.js';
import { box, lampTable, createWardrobe, houseplant, lampPendant, picture } from '../build/primitives.js';
import { addObstacle } from '../build/collision.js';
import { leftX, backZ, FLOOR2_Y, upperCeilingY } from '../data/house-plan.js';

export function placeElternschlafzimmer(world) {
    const parentBed = new THREE.Group();
    parentBed.add(box(1.6, 0.34, 2.0, 0xffffff, 0, 0.17, 0));
    parentBed.add(box(1.65, 0.55, 0.08, 0x6b7fae, 0, 0.44, -0.96));
    parentBed.add(box(1.5, 0.1, 0.5, 0xdfe4f2, -0.35, 0.4, -0.55));
    parentBed.add(box(1.5, 0.1, 0.5, 0xdfe4f2, 0.35, 0.4, -0.55));
    parentBed.position.set(-3.4, FLOOR2_Y, backZ + 1.35);
    world.add(parentBed);
    addObstacle(1, -3.4, backZ + 1.35, 1.7, 2.05, 0.34);
    world.add(lampTable(-3.4 - 1.0, FLOOR2_Y + 0.5, backZ + 1.35));
    world.add(box(0.32, 0.5, 0.32, 0x9c6b3f, -3.4 - 1.0, FLOOR2_Y + 0.25, backZ + 1.35));
    addObstacle(1, -3.4 - 1.0, backZ + 1.35, 0.34, 0.34, 0.5);
    const wardrobe = createWardrobe(1.3, 1.9, 0.6, 0x7a5230);
    wardrobe.position.set(leftX + 0.35, FLOOR2_Y, -0.6);
    world.add(wardrobe);
    addObstacle(1, leftX + 0.35, -0.6, 1.35, 0.65);
    world.add(houseplant(-1.5, FLOOR2_Y, -3.6, 0.8));
    addObstacle(1, -1.5, backZ + 0.4, 0.25, 0.25);
    world.add(lampPendant(-3.0, upperCeilingY(-1.7), -1.7));
    world.add(picture(0.4, 0.5, leftX + 0.01, FLOOR2_Y + 1.5, -2.5, Math.PI / 2, 0x7a5230, 0xdfe4f2));
    world.add(picture(0.36, 0.46, leftX + 0.01, FLOOR2_Y + 1.4, 0.5, Math.PI / 2, 0x7a5230, 0xb8c9a8));
}
