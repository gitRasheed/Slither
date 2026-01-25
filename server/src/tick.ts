import { config } from "./config.js";
import {
  broadcastSnapshot,
  consumeLatestIntent,
  getClientPlayerIndex,
  getClientSockets,
  type WorldSnapshot,
} from "./network.js";
import { updateWorld } from "./systems.js";
import { createWorld } from "./world.js";

const tickIntervalMs = 1000 / config.simulation.tickRate;
const snapshotEveryNTicks = 1;

const createSnapshot = (world: ReturnType<typeof createWorld>): WorldSnapshot => {
  const players = world.players.map((player) => ({
    id: player.id,
    x: player.x,
    y: player.y,
    dirX: player.dirX,
    dirY: player.dirY,
    length: player.length,
  }));

  const orbs = world.orbs.map((orb) => ({
    id: orb.id,
    x: orb.x,
    y: orb.y,
  }));

  Object.freeze(players);
  Object.freeze(orbs);

  const snapshot = {
    tick: world.tick,
    players,
    orbs,
  };

  Object.freeze(snapshot);
  return snapshot;
};

const applyIntents = (world: ReturnType<typeof createWorld>) => {
  for (const socket of getClientSockets()) {
    const intent = consumeLatestIntent(socket);
    if (!intent) {
      continue;
    }

    const playerIndex = getClientPlayerIndex(socket);
    if (playerIndex === undefined) {
      continue;
    }

    const player = world.players[playerIndex];
    if (!player) {
      continue;
    }

    const { dirX, dirY } = intent.payload;
    if (!Number.isFinite(dirX) || !Number.isFinite(dirY)) {
      continue;
    }

    const length = Math.hypot(dirX, dirY);
    if (length === 0) {
      continue;
    }

    player.targetDirX = dirX / length;
    player.targetDirY = dirY / length;
  }
};

export function startTickLoop(): NodeJS.Timeout {
  const world = createWorld();
  const startTime = Date.now();
  let lastLogSecond = -1;

  const onTick = () => {
    const uptimeSeconds = (Date.now() - startTime) / 1000;
    const uptimeWholeSeconds = Math.floor(uptimeSeconds);

    if (uptimeWholeSeconds !== lastLogSecond) {
      lastLogSecond = uptimeWholeSeconds;
      const firstPlayer = world.players[0];
      const playerPosition = firstPlayer
        ? `p0=(${firstPlayer.x.toFixed(1)}, ${firstPlayer.y.toFixed(1)})`
        : "p0=(n/a, n/a)";
      const playerDirection = firstPlayer
        ? `dir=(${firstPlayer.dirX.toFixed(2)}, ${firstPlayer.dirY.toFixed(2)})`
        : "dir=(n/a, n/a)";
      const playerTargetDirection = firstPlayer
        ? `target=(${firstPlayer.targetDirX.toFixed(2)}, ${firstPlayer.targetDirY.toFixed(2)})`
        : "target=(n/a, n/a)";

      console.log(
        `[tick] tick=${world.tick} uptime=${uptimeSeconds.toFixed(1)}s orbs=${world.orbs.length} players=${world.players.length} ${playerPosition} ${playerDirection} ${playerTargetDirection}`
      );
    }
  };

  return setInterval(() => {
    world.tick += 1;
    applyIntents(world);
    updateWorld(world);
    if (world.tick % snapshotEveryNTicks === 0) {
      broadcastSnapshot(createSnapshot(world));
    }
    onTick();
  }, tickIntervalMs);
}
