import type {
  ClientMessage,
  DeathMessage,
  JoinAckMessage,
  StateMessage,
} from "../types/messages";
import { parseServerMessage } from "./messageBuffer";

export const handlers = {
  onStateMessage: (_msg: StateMessage) => {},
  onDeathMessage: (_msg: DeathMessage) => {},
  onJoinAckMessage: (_msg: JoinAckMessage) => {},
};

let socket: WebSocket | null = null;

export function connect(url: string): void {
  socket = new WebSocket(url);

  socket.addEventListener("message", (event) => {
    if (typeof event.data !== "string") {
      return;
    }

    const message = parseServerMessage(event.data);
    if (!message) {
      return;
    }

    if (message.type === "state") {
      handlers.onStateMessage(message);
      return;
    }

    if (message.type === "dead") {
      handlers.onDeathMessage(message);
      return;
    }

    if (message.type === "join_ack") {
      handlers.onJoinAckMessage(message);
    }
  });

  socket.addEventListener("close", () => {
    console.log("[net] socket closed");
  });

  socket.addEventListener("error", () => {
    console.log("[net] socket error");
  });
}

export function sendMove(angle: number): void {
  if (!Number.isFinite(angle)) {
    return;
  }
  sendMessage({ type: "move", angle });
}

export function sendBoost(active: boolean): void {
  sendMessage({ type: "boost", active });
}

function sendMessage(message: ClientMessage): void {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(JSON.stringify(message));
}
