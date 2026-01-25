import { WebSocket, WebSocketServer } from "ws";

export type WorldSnapshot = {
  tick: number;
  players: {
    id: number;
    x: number;
    y: number;
    dirX: number;
    dirY: number;
    length: number;
  }[];
  orbs: {
    id: number;
    x: number;
    y: number;
  }[];
};

export type ClientIntent = {
  type: "set_direction";
  payload: {
    dirX: number;
    dirY: number;
  };
};

const clients = new Set<WebSocket>();
const maxBufferedAmount = 256 * 1024;
const latestIntents = new Map<WebSocket, ClientIntent>();
const clientPlayerIndex = new Map<WebSocket, number>();
let nextPlayerIndex = 0;

export function startWebSocketServer(opts?: { port: number }): WebSocketServer {
  const port = opts?.port ?? 8080;
  const server = new WebSocketServer({ port });

  server.on("connection", (socket) => {
    clients.add(socket);
    clientPlayerIndex.set(socket, nextPlayerIndex);
    nextPlayerIndex += 1;

    socket.on("message", (data) => {
      if (typeof data !== "string") {
        return;
      }

      let message: unknown;
      try {
        message = JSON.parse(data);
      } catch {
        return;
      }

      if (typeof message !== "object" || message === null) {
        return;
      }

      const intent = message as ClientIntent;
      if (intent.type !== "set_direction") {
        return;
      }

      if (typeof intent.payload !== "object" || intent.payload === null) {
        return;
      }

      if (typeof intent.payload.dirX !== "number" || typeof intent.payload.dirY !== "number") {
        return;
      }

      latestIntents.set(socket, intent);
    });

    socket.on("close", () => {
      clients.delete(socket);
      latestIntents.delete(socket);
      clientPlayerIndex.delete(socket);
    });

    socket.on("error", () => {
      clients.delete(socket);
      latestIntents.delete(socket);
      clientPlayerIndex.delete(socket);
    });
  });

  return server;
}

export function getClientCount(): number {
  return clients.size;
}

export function getClientSockets(): Iterable<WebSocket> {
  return clients.values();
}

export function getClientPlayerIndex(socket: WebSocket): number | undefined {
  return clientPlayerIndex.get(socket);
}

export function consumeLatestIntent(socket: WebSocket): ClientIntent | undefined {
  const intent = latestIntents.get(socket);
  latestIntents.delete(socket);
  return intent;
}

export function broadcastSnapshot(snapshot: WorldSnapshot): void {
  const payload = JSON.stringify(snapshot);

  for (const client of clients) {
    if (client.readyState !== WebSocket.OPEN) {
      continue;
    }

    if (client.bufferedAmount > maxBufferedAmount) {
      continue;
    }

    client.send(payload);
  }
}
