import type { AddressInfo } from "node:net";
import type { Server as HttpServer } from "node:http";
import { createWorld, findPlayerBySnakeId } from "./core/world.js";
import { startGameLoop } from "./core/gameLoop.js";
import { spawnInitialFood } from "./core/food.js";
import { TICK_RATE } from "./constants/game.js";
import { broadcastToAll, sendToClient } from "./net/messageHandlers.js";
import { startWebSocketServer } from "./net/server.js";
import { startMetricsServer, stopMetricsServer } from "./metrics/index.js";

type StartServerOptions = {
  wsPort?: number;
  metricsPort?: number;
  log?: boolean;
};

type ServerHandle = {
  world: ReturnType<typeof createWorld>;
  wss: ReturnType<typeof startWebSocketServer>;
  metricsServer: HttpServer;
  ports: { ws: number; metrics: number };
  stop: () => Promise<void>;
};

const formatError = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const waitForListening = (server: { on: (event: string, cb: () => void) => void }) =>
  new Promise<void>((resolve) => {
    server.on("listening", resolve);
  });

const resolvePort = (server: { address: () => string | AddressInfo | null }): number => {
  const address = server.address();
  if (!address || typeof address === "string") {
    return 0;
  }
  return address.port;
};

const closeServer = (server: { close: (cb: () => void) => void }) =>
  new Promise<void>((resolve) => server.close(resolve));

export async function startServer(options: StartServerOptions = {}): Promise<ServerHandle> {
  const wsPort = options.wsPort ?? 8080;
  const metricsPort = options.metricsPort ?? 1990;
  const log = options.log ?? true;
  const env = process.env.NODE_ENV ?? "development";

  if (log) {
    console.log("Server starting...");
    console.log(`Node.js version: ${process.version}`);
    console.log(`Environment: ${env}`);
    console.log(`Tick rate: ${TICK_RATE} TPS`);
  }

  const world = createWorld();
  spawnInitialFood(world);

  const wss = startWebSocketServer(world, { port: wsPort });
  const metricsServer = startMetricsServer({ port: metricsPort });

  if (log) {
    wss.on("connection", () => {
      console.log(`[ws] client connected count=${world.players.size}`);
    });

    wss.on("error", (error) => {
      console.log(`[ws] server error ${formatError(error)}`);
    });
  }

  const tickHandle = startGameLoop(world, {
    onState: (message) => broadcastToAll(world, message),
    onDeath: (event) => {
      const player = world.players.get(event.ownerId);
      if (!player) {
        return;
      }

      let killerName: string | undefined;
      if (event.killerId) {
        const killerPlayer = findPlayerBySnakeId(world, event.killerId);
        if (killerPlayer) {
          killerPlayer.eliminations += 1;
          sendToClient(killerPlayer, {
            type: "stats",
            eliminations: killerPlayer.eliminations,
          });
          const name = killerPlayer.snake.name.trim();
          if (name) {
            killerName = name;
          }
        }
      }

      sendToClient(player, {
        type: "dead",
        killerId: event.killerId,
        killerName,
      });
    },
  });

  await Promise.all([waitForListening(wss), waitForListening(metricsServer)]);

  const resolvedWsPort = resolvePort(wss);
  const resolvedMetricsPort = resolvePort(metricsServer);

  if (log) {
    console.log(`[ws] listening on ws://localhost:${resolvedWsPort}`);
    console.log(`[metrics] listening on http://localhost:${resolvedMetricsPort}/metrics`);
  }

  const stop = async () => {
    clearInterval(tickHandle);
    await closeServer(wss);
    await closeServer(metricsServer);
    await stopMetricsServer();
  };

  return {
    world,
    wss,
    metricsServer,
    ports: { ws: resolvedWsPort, metrics: resolvedMetricsPort },
    stop,
  };
}
