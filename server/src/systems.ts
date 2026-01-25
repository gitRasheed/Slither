import { config } from "./config.js";
import type { World } from "./world.js";

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
    let delta = targetAngle - currentAngle;

    if (delta > Math.PI) {
      delta -= Math.PI * 2;
    } else if (delta < -Math.PI) {
      delta += Math.PI * 2;
    }

    const turnRate = baseTurnRate / (1 + player.length * lengthTurnPenalty);
    const maxTurn = turnRate * tickDeltaSeconds;
    const clampedDelta = Math.max(-maxTurn, Math.min(maxTurn, delta));
    const newAngle = currentAngle + clampedDelta;

    player.dirX = Math.cos(newAngle);
    player.dirY = Math.sin(newAngle);

    player.x += player.dirX * player.speed * tickDeltaSeconds;
    player.y += player.dirY * player.speed * tickDeltaSeconds;
  }
}
