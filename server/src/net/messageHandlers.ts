import { WebSocket } from "ws";
import { pack, unpack } from "msgpackr";
import { wrapAngle } from "../core/math.js";
import type { ClientMessage, Player, ServerMessage, World } from "../types/index.js";
import {
  recordBackpressureDrop,
  recordMessageIn,
  recordMessageOut,
} from "../metrics/index.js";

type ClientPayload = {
  v?: number;
  type?: unknown;
  angle?: unknown;
  active?: unknown;
  name?: unknown;
};

const PROTOCOL_VERSION = 1;

const maxBufferedAmount = 256 * 1024;

export function parseClientMessage(data: WebSocket.RawData): ClientMessage | null {
  if (typeof data === "string") {
    recordMessageIn(Buffer.byteLength(data));
    return null;
  }
  if (ArrayBuffer.isView(data)) {
    recordMessageIn(data.byteLength);
  } else if (data instanceof ArrayBuffer) {
    recordMessageIn(data.byteLength);
  } else if (Array.isArray(data)) {
    const total = data.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    recordMessageIn(total);
  }

  let payload: ClientPayload;
  try {
    const payloadData =
      data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : ArrayBuffer.isView(data)
          ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
          : Array.isArray(data)
            ? Buffer.concat(data)
            : null;
    if (!payloadData) {
      return null;
    }
    payload = unpack(payloadData) as ClientPayload;
  } catch {
    return null;
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  if (payload.v !== PROTOCOL_VERSION) {
    return null;
  }

  if (payload.type === "join" && typeof payload.name === "string") {
    return { type: "join", name: payload.name };
  }
  if (payload.type === "move" && typeof payload.angle === "number") {
    if (!Number.isFinite(payload.angle)) {
      return null;
    }
    return { type: "move", angle: payload.angle };
  }

  if (payload.type === "boost" && typeof payload.active === "boolean") {
    return { type: "boost", active: payload.active };
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
    return;
  }
}

export function sendToClient(player: Player, msg: ServerMessage): void {
  if (player.socket.readyState !== WebSocket.OPEN) {
    return;
  }

  if (player.socket.bufferedAmount > maxBufferedAmount) {
    recordBackpressureDrop();
    return;
  }

  const payload = pack({ v: PROTOCOL_VERSION, ...msg });
  const payloadBytes =
    payload instanceof Uint8Array ? payload.byteLength : Buffer.byteLength(payload);
  recordMessageOut(payloadBytes);
  player.socket.send(payload);
}

export function broadcastToAll(world: World, msg: ServerMessage): void {
  const payload = pack({ v: PROTOCOL_VERSION, ...msg });
  const payloadBytes =
    payload instanceof Uint8Array ? payload.byteLength : Buffer.byteLength(payload);

  for (const player of world.players.values()) {
    if (player.socket.readyState !== WebSocket.OPEN) {
      continue;
    }

    if (player.socket.bufferedAmount > maxBufferedAmount) {
      recordBackpressureDrop();
      continue;
    }
    recordMessageOut(payloadBytes);
    player.socket.send(payload);
  }
}
