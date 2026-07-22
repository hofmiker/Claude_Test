// Singleton module: every importer shares this same obstacle state.
export const obstaclesByFloor = [[], []];

export function addObstacle(floor, cx, cz, w, d) {
    obstaclesByFloor[floor].push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
}

export function resolveObstacles(x, z, radius, list) {
    for (const o of list) {
        const cx = Math.max(o.minX, Math.min(x, o.maxX));
        const cz = Math.max(o.minZ, Math.min(z, o.maxZ));
        const dx = x - cx, dz = z - cz;
        const distSq = dx * dx + dz * dz;
        if (distSq < radius * radius) {
            const dist = Math.sqrt(distSq) || 0.0001;
            const push = radius - dist;
            x += (dx / dist) * push;
            z += (dz / dist) * push;
        }
    }
    return [x, z];
}
