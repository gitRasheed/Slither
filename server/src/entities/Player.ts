import type { WebSocket } from "ws";
import type { Player, Snake } from "../types/game.js";

export function createPlayer(id: string, socket: WebSocket, snake: Snake): Player {
  return {
    id,
    socket,
    snake,
    eliminations: 0,
    connectedAt: Date.now(),
  };
}
