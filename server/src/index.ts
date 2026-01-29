import { createWorld, findPlayerBySnakeId } from "./core/world.js";
import { startGameLoop } from "./core/gameLoop.js";
import { spawnInitialFood } from "./core/food.js";
import { TICK_RATE } from "./constants/game.js";
import { broadcastToAll, sendToClient } from "./net/messageHandlers.js";
import { startWebSocketServer } from "./net/server.js";

const env = process.env.NODE_ENV ?? "development";
const wsPort = Number(process.env.WS_PORT ?? 8080);

console.log("Server starting...");
console.log(`Node.js version: ${process.version}`);
console.log(`Environment: ${env}`);
console.log(`Tick rate: ${TICK_RATE} TPS`);

const world = createWorld();
spawnInitialFood(world);

const wss = startWebSocketServer(world, { port: wsPort });

const formatError = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

wss.on("listening", () => {
  console.log(`[ws] listening on ws://localhost:${wsPort}`);
});

wss.on("connection", () => {
  console.log(`[ws] client connected count=${world.players.size}`);
});

wss.on("error", (error) => {
  console.log(`[ws] server error ${formatError(error)}`);
});

startGameLoop(world, {
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
