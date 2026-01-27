import { WebSocket, WebSocketServer } from "ws";
import type { WorldSnapshot } from "../../shared/types.js";

const VERBOSE = process.env.VERBOSE === "true" || process.argv.includes("--verbose");

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
    const myId = nextPlayerIndex;
    nextPlayerIndex += 1;

    console.log(`[network] New Connection. ID: ${myId}. Total Clients: ${clients.size}`);

    socket.on("message", (data) => {
      const messageString = typeof data === "string" ? data : data.toString("utf-8");

      if (VERBOSE) {
        console.log(`[network] Raw message from ${myId}:`, messageString);
      }

      let message: unknown;
      try {
        message = JSON.parse(messageString);
      } catch (e) {
        if (VERBOSE) {
          console.log(`[network] JSON Parse Error from ${myId}:`, e);
        }
        return;
      }

      if (typeof message !== "object" || message === null) {
        if (VERBOSE) {
          console.log(`[network] Invalid message format from ${myId}`);
        }
        return;
      }

      const intent = message as ClientIntent;
      if (intent.type !== "set_direction") {
        // console.log(`[network] Unknown intent type: ${intent.type}`);
        return;
      }

      if (typeof intent.payload !== "object" || intent.payload === null) {
        if (VERBOSE) {
          console.log(`[network] Missing payload from ${myId}`);
        }
        return;
      }

      const { dirX, dirY } = intent.payload;
      if (typeof dirX !== "number" || typeof dirY !== "number") {
        if (VERBOSE) {
          console.log(`[network] Invalid direction numbers from ${myId}:`, dirX, dirY);
        }
        return;
      }

      if (VERBOSE) {
        console.log(`[network] Intent ACCEPTED from ${myId}: ${dirX}, ${dirY}`);
      }
      latestIntents.set(socket, intent);
    });

    socket.on("close", () => {
      console.log(`[network] Connection Closed. ID: ${myId}`);
      clients.delete(socket);
      latestIntents.delete(socket);
      clientPlayerIndex.delete(socket);
    });

    socket.on("error", (err) => {
      console.log(`[network] Connection Error ${myId}:`, err);
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
