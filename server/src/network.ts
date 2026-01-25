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

const clients = new Set<WebSocket>();
const maxBufferedAmount = 256 * 1024;

export function startWebSocketServer(opts?: { port: number }): WebSocketServer {
  const port = opts?.port ?? 8080;
  const server = new WebSocketServer({ port });

  server.on("connection", (socket) => {
    clients.add(socket);

    socket.on("close", () => {
      clients.delete(socket);
    });

    socket.on("error", () => {
      clients.delete(socket);
    });
  });

  return server;
}

export function getClientCount(): number {
  return clients.size;
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
