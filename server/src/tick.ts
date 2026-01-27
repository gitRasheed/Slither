import { config } from "../../shared/config.js";
import type { WorldSnapshot } from "../../shared/types.js";
import { updateWorld } from "../../shared/systems.js";
import { createWorld } from "../../shared/world.js";
import {
  broadcastSnapshot,
  consumeLatestIntent,
  getClientPlayerIndex,
  getClientSockets,
} from "./network.js";

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
    // DEBUG: Log if we are checking a socket, and if it has an intent
    // console.log(`[tick] Checking socket. Intent available: ${!!intent}`);

    if (!intent) {
      continue;
    }

    const clientIndex = getClientPlayerIndex(socket);
    // DEBUG: Log the resolved indices
    console.log(
      `[tick] Processing Intent. ClientIndex: ${clientIndex} | World Players: ${world.players.length}`
    );

    if (clientIndex === undefined) {
      console.log(`[tick] ERROR: ClientIndex undefined`);
      continue;
    }

    const playerIndex = clientIndex % world.players.length;
    const player = world.players[playerIndex];

    console.log(`[tick] Mapped Client ${clientIndex} -> Player ${playerIndex}. Found: ${!!player}`);

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

    // DEBUG: Log the final application
    console.log(`[tick] APPLYING: Player ${playerIndex} target set to (${dirX}, ${dirY})`);

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
