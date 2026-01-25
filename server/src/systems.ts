import type { World } from "./world.js";

const orbSpawnInterval = 30;
const tickRate = 60;
const tickDeltaSeconds = 1 / tickRate;

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

  for (const player of world.players) {
    player.x += player.dirX * player.speed * tickDeltaSeconds;
    player.y += player.dirY * player.speed * tickDeltaSeconds;
  }
}
