import { WebSocket } from "ws";
import { wrapAngle } from "../core/math.js";
import type { ClientMessage, Player, ServerMessage, World } from "../types/index.js";

const maxBufferedAmount = 256 * 1024;

export function parseClientMessage(data: WebSocket.RawData): ClientMessage | null {
  const messageString = typeof data === "string" ? data : data.toString("utf-8");
  let payload: unknown;

  try {
    payload = JSON.parse(messageString);
  } catch {
    return null;
  }

  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const message = payload as { type?: unknown; angle?: unknown; active?: unknown; name?: unknown };
  if (message.type === "join" && typeof message.name === "string") {
    return { type: "join", name: message.name };
  }
  if (message.type === "move" && typeof message.angle === "number") {
    if (!Number.isFinite(message.angle)) {
      return null;
    }
    return { type: "move", angle: message.angle };
  }

  if (message.type === "boost" && typeof message.active === "boolean") {
    return { type: "boost", active: message.active };
  }

  return null;
}

export function handleClientMessage(player: Player, msg: ClientMessage): void {
  if (msg.type === "join") {
    return;
  }
  if (msg.type === "move") {
    player.snake.targetDirection = wrapAngle(msg.angle);
    return;
  }

  if (msg.type === "boost") {
    player.snake.isBoosting = msg.active;
  }
}

export function sendToClient(player: Player, msg: ServerMessage): void {
  if (player.socket.readyState !== WebSocket.OPEN) {
    return;
  }

  if (player.socket.bufferedAmount > maxBufferedAmount) {
    return;
  }

  player.socket.send(JSON.stringify(msg));
}

export function broadcastToAll(world: World, msg: ServerMessage): void {
  const payload = JSON.stringify(msg);

  for (const player of world.players.values()) {
    if (player.socket.readyState !== WebSocket.OPEN) {
      continue;
    }

    if (player.socket.bufferedAmount > maxBufferedAmount) {
      continue;
    }

    player.socket.send(payload);
  }
}
