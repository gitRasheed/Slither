import type { World } from "./world.js";

const orbSpawnInterval = 30;

export function updateWorld(world: World): void {
  if (world.tick % orbSpawnInterval === 0) {
    world.orbs.push({
      id: world.orbs.length,
      x: 0,
      y: 0,
    });
  }

  for (const orb of world.orbs) {
    orb.x += 1;
    orb.y += 1;
  }
}
