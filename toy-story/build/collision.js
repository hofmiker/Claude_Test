// Singleton module: every importer shares this same obstacle state.
export const obstaclesByFloor = [[], []];

// `topY`: height of the obstacle's top surface, as an offset above that
// floor's own baseline (same convention as player state.y) — NOT an
// absolute world Y. Omitted (Infinity) means "wall-like": always blocks
// horizontally regardless of how high the player jumps. A finite topY makes
// the obstacle steppable — once the player's feet are at/above it, it stops
// blocking sideways and instead acts as ground to land/stand on.
export function addObstacle(floor, cx, cz, w, d, topY = Infinity, opts = {}) {
    obstaclesByFloor[floor].push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2, topY, blocking: opts.blocking !== false });
}

// Legged furniture (chairs/desks): thin blocking obstacles at each actual
// leg position — matching the leg coordinates the visual model (chair()/
// createDesk() in primitives.js) already uses — so the player can walk
// through the gaps between the legs instead of being stopped by the whole
// footprint, plus one non-blocking "platform" obstacle spanning the full
// seat/desktop so a well-timed jump can still land on top of it.
export function addLeggedObstacle(floor, cx, cz, rotY, legOffsets, legSize, topY, platformW, platformD) {
    const cos = Math.cos(rotY), sin = Math.sin(rotY);
    for (const [lx, lz] of legOffsets) {
        addObstacle(floor, cx + lx * cos + lz * sin, cz - lx * sin + lz * cos, legSize, legSize, topY);
    }
    addObstacle(floor, cx, cz, platformW, platformD, topY, { blocking: false });
}

// `y`: the mover's current height above the floor baseline. Obstacles whose
// top is at or below that height (within a small tolerance) are skipped —
// the mover is standing on/above them, not walking into their side.
export function resolveObstacles(x, z, y, radius, list) {
    for (const o of list) {
        if (!o.blocking) continue;
        if (y >= o.topY - 0.02) continue;
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

// Highest steppable surface under (x,z): the tallest overlapping obstacle's
// topY, or 0 (bare floor) if none. Used to let the player land/stand on top
// of furniture instead of always falling through to the floor.
export function groundHeightAt(x, z, list) {
    let best = 0;
    for (const o of list) {
        if (o.topY === Infinity) continue;
        if (x > o.minX && x < o.maxX && z > o.minZ && z < o.maxZ && o.topY > best) best = o.topY;
    }
    return best;
}
