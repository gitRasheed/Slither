import { WebSocketServer } from "ws";
import type { WebSocket } from "ws";
import { addPlayer, removePlayer, respawnPlayer } from "../core/world.js";
import type { Player, World } from "../types/game.js";
import { handleClientMessage, parseClientMessage, sendToClient } from "./messageHandlers.js";

export function startWebSocketServer(
  world: World,
  opts?: { port: number }
): WebSocketServer {
  const port = opts?.port ?? 8080;
  const server = new WebSocketServer({ port });
  const playersBySocket = new Map<WebSocket, Player>();

  const normalizeName = (name: string): string | null => {
    const trimmed = name.trim();
    if (!trimmed) {
      return null;
    }
    if (trimmed.length > 16) {
      return null;
    }
    return trimmed;
  };

  server.on("connection", (socket) => {
    let player: Player | null = null;

    socket.on("message", (data) => {
      const message = parseClientMessage(data);
      if (!message) {
        return;
      }

      if (message.type === "join") {
        const name = normalizeName(message.name);
        if (!name) {
          return;
        }

        if (!player) {
          player = addPlayer(world, socket, name);
          playersBySocket.set(socket, player);
        } else {
          respawnPlayer(world, player, name);
        }

        sendToClient(player, {
          type: "join_ack",
          playerId: player.id,
          snakeId: player.snake.id,
        });
        return;
      }

      if (!player) {
        return;
      }

      handleClientMessage(player, message);
    });

    const cleanup = () => {
      if (player) {
        playersBySocket.delete(socket);
        removePlayer(world, player.id);
      }
    };

    socket.on("close", cleanup);
    socket.on("error", cleanup);
  });

  return server;
}
