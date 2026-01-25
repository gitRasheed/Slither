import { describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import type { AddressInfo } from "net";
import { startWebSocketServer, type WorldSnapshot } from "../src/network.js";
import { startTickLoop } from "../src/tick.js";

const waitForOpen = (socket: WebSocket, timeoutMs = 2000): Promise<void> =>
  new Promise((resolve, reject) => {
    if (socket.readyState === WebSocket.OPEN) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timed out waiting for WebSocket open."));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timeout);
      socket.off("open", onOpen);
      socket.off("error", onError);
    };

    const onOpen = () => {
      cleanup();
      resolve();
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    socket.on("open", onOpen);
    socket.on("error", onError);
  });

const waitForClose = (socket: WebSocket, timeoutMs = 2000): Promise<void> =>
  new Promise((resolve, reject) => {
    if (socket.readyState === WebSocket.CLOSED) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timed out waiting for WebSocket close."));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timeout);
      socket.off("close", onClose);
      socket.off("error", onError);
    };

    const onClose = () => {
      cleanup();
      resolve();
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    socket.on("close", onClose);
    socket.on("error", onError);
  });

const parseSnapshot = (data: WebSocket.RawData): WorldSnapshot | null => {
  const text = typeof data === "string" ? data : data.toString("utf-8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }

  const snapshot = parsed as WorldSnapshot;
  if (typeof snapshot.tick !== "number" || !Array.isArray(snapshot.players)) {
    return null;
  }

  return snapshot;
};

const createSnapshotListener = (socket: WebSocket) => {
  let latest: WorldSnapshot | null = null;
  const onMessage = (data: WebSocket.RawData) => {
    const snapshot = parseSnapshot(data);
    if (snapshot) {
      latest = snapshot;
    }
  };

  socket.on("message", onMessage);

  return {
    getLatest: () => latest,
    stop: () => socket.off("message", onMessage),
  };
};

const closeServer = (server: ReturnType<typeof startWebSocketServer>): Promise<void> =>
  new Promise((resolve) => {
    server.close(() => resolve());
  });

describe("Phase 4A movement integration", () => {
  it("Happy Path: client controls player 0", async () => {
    const server = startWebSocketServer({ port: 0 });
    const tickHandle = startTickLoop();
    let client: WebSocket | null = null;
    let listener: ReturnType<typeof createSnapshotListener> | null = null;

    try {
      if (!server.address()) {
        await new Promise<void>((resolve) => server.on("listening", resolve));
      }

      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("Failed to resolve WebSocket server address.");
      }

      const url = `ws://127.0.0.1:${(address as AddressInfo).port}`;
      client = new WebSocket(url);

      await waitForOpen(client);
      listener = createSnapshotListener(client);

      await expect.poll(
        () => listener?.getLatest()?.tick ?? -1,
        { timeout: 3000, interval: 50 }
      ).toBeGreaterThan(0);

      const baseline = listener.getLatest();
      if (!baseline) {
        throw new Error("Missing baseline snapshot.");
      }

      client.send(
        JSON.stringify({
          type: "set_direction",
          payload: { dirX: 1, dirY: 0 },
        })
      );

      await expect.poll(
        () => listener?.getLatest()?.tick ?? -1,
        { timeout: 3000, interval: 50 }
      ).toBeGreaterThan(baseline.tick + 10);

      const snapshot = listener.getLatest();
      if (!snapshot) {
        throw new Error("Missing post-intent snapshot.");
      }

      expect(snapshot.players[0]).toBeTruthy();
      expect(snapshot.players[0].dirX).toBeCloseTo(1, 1);
    } finally {
      listener?.stop();
      if (client) {
        client.close();
        await waitForClose(client);
      }
      clearInterval(tickHandle);
      await closeServer(server);
    }
  });

  it("Refresh Scenario: reconnected client controls player 0", async () => {
    const server = startWebSocketServer({ port: 0 });
    const tickHandle = startTickLoop();
    let client1: WebSocket | null = null;
    let client2: WebSocket | null = null;
    let listener1: ReturnType<typeof createSnapshotListener> | null = null;
    let listener2: ReturnType<typeof createSnapshotListener> | null = null;

    try {
      if (!server.address()) {
        await new Promise<void>((resolve) => server.on("listening", resolve));
      }

      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("Failed to resolve WebSocket server address.");
      }

      const url = `ws://127.0.0.1:${(address as AddressInfo).port}`;
      client1 = new WebSocket(url);

      await waitForOpen(client1);
      listener1 = createSnapshotListener(client1);

      await expect.poll(
        () => listener1?.getLatest()?.tick ?? -1,
        { timeout: 3000, interval: 50 }
      ).toBeGreaterThan(0);

      client1.close();
      await waitForClose(client1);

      client2 = new WebSocket(url);
      await waitForOpen(client2);
      listener2 = createSnapshotListener(client2);

      await expect.poll(
        () => listener2?.getLatest()?.tick ?? -1,
        { timeout: 3000, interval: 50 }
      ).toBeGreaterThan(0);

      const baseline = listener2.getLatest();
      if (!baseline) {
        throw new Error("Missing baseline snapshot after reconnect.");
      }

      client2.send(
        JSON.stringify({
          type: "set_direction",
          payload: { dirX: 1, dirY: 0 },
        })
      );

      await expect.poll(
        () => listener2?.getLatest()?.tick ?? -1,
        { timeout: 5000, interval: 50 }
      ).toBeGreaterThan(baseline.tick + 60);

      const snapshot = listener2.getLatest();
      if (!snapshot) {
        throw new Error("Missing post-intent snapshot after reconnect.");
      }

      expect(snapshot.players[0]).toBeTruthy();
      expect(snapshot.players[0].dirX).toBeCloseTo(1, 1);
    } finally {
      listener1?.stop();
      listener2?.stop();
      if (client1) {
        client1.close();
        await waitForClose(client1);
      }
      if (client2) {
        client2.close();
        await waitForClose(client2);
      }
      clearInterval(tickHandle);
      await closeServer(server);
    }
  });
});
