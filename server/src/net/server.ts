import { WebSocketServer } from "ws";
import type { WebSocket } from "ws";
import { addPlayer, removePlayer } from "../core/world.js";
import type { Player, World } from "../types/game.js";
import { handleClientMessage, parseClientMessage, sendToClient } from "./messageHandlers.js";

export function startWebSocketServer(
  world: World,
  opts?: { port: number }
): WebSocketServer {
  const port = opts?.port ?? 8080;
  const server = new WebSocketServer({ port });
  const playersBySocket = new Map<WebSocket, Player>();

  server.on("connection", (socket) => {
    const player = addPlayer(world, socket);
    playersBySocket.set(socket, player);
    sendToClient(player, { type: "join_ack", playerId: player.id });

    socket.on("message", (data) => {
      const message = parseClientMessage(data);
      if (!message) {
        return;
      }
      handleClientMessage(player, message);
    });

    const cleanup = () => {
      playersBySocket.delete(socket);
      removePlayer(world, player.id);
    };

    socket.on("close", cleanup);
    socket.on("error", cleanup);
  });

  return server;
}
