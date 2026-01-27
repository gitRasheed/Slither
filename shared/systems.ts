import { config } from "./config.js";
import { clamp, wrapAngle } from "./math.js";
import type { World } from "./types.js";

const {
  tickRate,
  orbSpawnIntervalTicks,
  baseTurnRate,
  lengthTurnPenalty,
} = config.simulation;
const tickDeltaSeconds = 1 / tickRate;

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
    const currentAngle = Math.atan2(player.dirY, player.dirX);
    const targetAngle = Math.atan2(player.targetDirY, player.targetDirX);
    const delta = wrapAngle(targetAngle - currentAngle);

    const turnRate = baseTurnRate / (1 + player.length * lengthTurnPenalty);
    const maxTurn = turnRate * tickDeltaSeconds;
    const clampedDelta = clamp(delta, -maxTurn, maxTurn);
    const newAngle = currentAngle + clampedDelta;

    player.dirX = Math.cos(newAngle);
    player.dirY = Math.sin(newAngle);

    player.x += player.dirX * player.speed * tickDeltaSeconds;
    player.y += player.dirY * player.speed * tickDeltaSeconds;
  }
}
