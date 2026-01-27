import { config } from "./config.js";
import type { World } from "./types.js";

const { tickRate, orbSpawnIntervalTicks } = config.simulation;
const tickDeltaSeconds = 1 / tickRate;
const orbRadius = 3;
const playerRadius = 8;
const orbConsumeDistanceSq = (orbRadius + playerRadius) ** 2;

export function updateWorld(world: World): void {
  if (world.tick % orbSpawnIntervalTicks === 0) {
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
    for (let index = world.orbs.length - 1; index >= 0; index -= 1) {
      const orb = world.orbs[index];
      const dx = orb.x - player.x;
      const dy = orb.y - player.y;
      if (dx * dx + dy * dy <= orbConsumeDistanceSq) {
        world.orbs.splice(index, 1);
        player.length += 1;
      }
    }
  }

  for (const player of world.players) {
    player.dirX = player.targetDirX;
    player.dirY = player.targetDirY;

    player.x += player.dirX * player.speed * tickDeltaSeconds;
    player.y += player.dirY * player.speed * tickDeltaSeconds;
  }
}
