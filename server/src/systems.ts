import type { World } from "./world.js";

const orbSpawnInterval = 30;
const tickRate = 60;
const tickDeltaSeconds = 1 / tickRate;
const baseTurnRate = 2.0;
const turnRateLengthFactor = 0.03;
const targetFlipInterval = 180;

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
    if (world.tick % targetFlipInterval === 0) {
      const nextTargetX = -player.targetDirX;
      const nextTargetY = -player.targetDirY;
      player.targetDirX = nextTargetX;
      player.targetDirY = nextTargetY;
    }

    const currentAngle = Math.atan2(player.dirY, player.dirX);
    const targetAngle = Math.atan2(player.targetDirY, player.targetDirX);
    let delta = targetAngle - currentAngle;

    if (delta > Math.PI) {
      delta -= Math.PI * 2;
    } else if (delta < -Math.PI) {
      delta += Math.PI * 2;
    }

    const turnRate = baseTurnRate / (1 + player.length * turnRateLengthFactor);
    const maxTurn = turnRate * tickDeltaSeconds;
    const clampedDelta = Math.max(-maxTurn, Math.min(maxTurn, delta));
    const newAngle = currentAngle + clampedDelta;

    player.dirX = Math.cos(newAngle);
    player.dirY = Math.sin(newAngle);

    player.x += player.dirX * player.speed * tickDeltaSeconds;
    player.y += player.dirY * player.speed * tickDeltaSeconds;
  }
}
