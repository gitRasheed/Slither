import type {
  ClientMessage,
  DeathMessage,
  FoodsMessage,
  JoinAckMessage,
  StatsMessage,
  StateMessage,
} from "../types/messages";
import { parseServerMessage } from "./messageBuffer";
import { pack } from "msgpackr";

export const handlers = {
  onStateMessage: (_msg: StateMessage) => {},
  onFoodsMessage: (_msg: FoodsMessage) => {},
  onDeathMessage: (_msg: DeathMessage) => {},
  onJoinAckMessage: (_msg: JoinAckMessage) => {},
  onStatsMessage: (_msg: StatsMessage) => {},
};

let socket: WebSocket | null = null;
let connectPromise: Promise<void> | null = null;

export function connect(url: string): Promise<void> {
  if (socket && socket.readyState === WebSocket.OPEN) {
    return Promise.resolve();
  }

  if (connectPromise) {
    return connectPromise;
  }

  socket = new WebSocket(url);
  socket.binaryType = "arraybuffer";
  connectPromise = new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error("Socket initialization failed."));
      return;
    }

    const onOpen = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      connectPromise = null;
      socket = null;
      reject(new Error("WebSocket connection failed."));
    };

    const cleanup = () => {
      socket?.removeEventListener("open", onOpen);
      socket?.removeEventListener("error", onError);
    };

    socket.addEventListener("open", onOpen);
    socket.addEventListener("error", onError);
  });

  socket.addEventListener("message", (event) => {
    if (!(event.data instanceof ArrayBuffer)) {
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

    if (message.type === "foods") {
      handlers.onFoodsMessage(message);
      return;
    }

    if (message.type === "dead") {
      handlers.onDeathMessage(message);
      return;
    }

    if (message.type === "join_ack") {
      handlers.onJoinAckMessage(message);
      return;
    }

    if (message.type === "stats") {
      handlers.onStatsMessage(message);
    }
  });

  socket.addEventListener("close", () => {
    console.log("[net] socket closed");
    connectPromise = null;
    socket = null;
  });

  socket.addEventListener("error", () => {
    console.log("[net] socket error");
  });

  return connectPromise;
}

export function sendJoin(name: string): void {
  sendMessage({ type: "join", name });
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

  socket.send(pack({ v: 1, ...message }));
}
