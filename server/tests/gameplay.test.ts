import { describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import type { AddressInfo } from "net";
import { startWebSocketServer } from "../src/network.js";
import { startTickLoop } from "../src/tick.js";
import type { WorldSnapshot } from "../../shared/types.js";

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
  if (
    typeof snapshot.tick !== "number" ||
    !Array.isArray(snapshot.players) ||
    !Array.isArray(snapshot.orbs)
  ) {
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

const resolveServerUrl = async (
  server: ReturnType<typeof startWebSocketServer>
): Promise<string> => {
  if (!server.address()) {
    await new Promise<void>((resolve) => server.on("listening", resolve));
  }

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to resolve WebSocket server address.");
  }

  return `ws://127.0.0.1:${(address as AddressInfo).port}`;
};

const closeServer = (server: ReturnType<typeof startWebSocketServer>): Promise<void> =>
  new Promise((resolve) => server.close(() => resolve()));

const closeSocket = async (socket: WebSocket | null): Promise<void> => {
  if (!socket) {
    return;
  }

  if (socket.readyState !== WebSocket.CLOSED) {
    socket.close();
  }

  await waitForClose(socket);
};

describe("Phase 4A gameplay behaviors", () => {
  const testTimeoutMs = 10000;

  it("System Liveness & Orb Spawning", async () => {
    const server = startWebSocketServer({ port: 0 });
    const tickHandle = startTickLoop();
    let client: WebSocket | null = null;
    let listener: ReturnType<typeof createSnapshotListener> | null = null;

    try {
      const url = await resolveServerUrl(server);
      client = new WebSocket(url);
      await waitForOpen(client);
      listener = createSnapshotListener(client);

      await expect.poll(
        () => listener?.getLatest()?.tick ?? -1,
        { timeout: 5000, interval: 50 }
      ).toBeGreaterThanOrEqual(0);

      const first = listener.getLatest();
      if (!first) {
        throw new Error("Missing initial snapshot.");
      }

      await expect.poll(
        () => listener?.getLatest()?.tick ?? -1,
        { timeout: 7000, interval: 50 }
      ).toBeGreaterThanOrEqual(first.tick + 60);

      await expect.poll(
        () => listener?.getLatest()?.orbs.length ?? 0,
        { timeout: 7000, interval: 50 }
      ).toBeGreaterThan(0);
    } finally {
      listener?.stop();
      await closeSocket(client);
      clearInterval(tickHandle);
      await closeServer(server);
    }
  }, testTimeoutMs);

  it("Inertia & Continuity", async () => {
    const server = startWebSocketServer({ port: 0 });
    const tickHandle = startTickLoop();
    let client: WebSocket | null = null;
    let listener: ReturnType<typeof createSnapshotListener> | null = null;

    try {
      const url = await resolveServerUrl(server);
      client = new WebSocket(url);
      await waitForOpen(client);
      listener = createSnapshotListener(client);

      await expect.poll(
        () => listener?.getLatest()?.tick ?? -1,
        { timeout: 5000, interval: 50 }
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
        () => listener?.getLatest()?.players[0]?.x ?? Number.NEGATIVE_INFINITY,
        { timeout: 5000, interval: 50 }
      ).toBeGreaterThan(baseline.players[0].x);

      const after = listener.getLatest();
      if (!after) {
        throw new Error("Missing post-intent snapshot.");
      }

      expect(after.players[0].x).toBeGreaterThan(0);
    } finally {
      listener?.stop();
      await closeSocket(client);
      clearInterval(tickHandle);
      await closeServer(server);
    }
  }, testTimeoutMs);

  it("Multi-Client Control Handoff", async () => {
    const server = startWebSocketServer({ port: 0 });
    const tickHandle = startTickLoop();
    let clientA: WebSocket | null = null;
    let clientB: WebSocket | null = null;
    let listenerA: ReturnType<typeof createSnapshotListener> | null = null;
    let listenerB: ReturnType<typeof createSnapshotListener> | null = null;

    try {
      const url = await resolveServerUrl(server);
      clientA = new WebSocket(url);
      await waitForOpen(clientA);
      listenerA = createSnapshotListener(clientA);

      await expect.poll(
        () => listenerA?.getLatest()?.tick ?? -1,
        { timeout: 5000, interval: 50 }
      ).toBeGreaterThan(0);

      const baseline = listenerA.getLatest();
      if (!baseline) {
        throw new Error("Missing baseline snapshot for client A.");
      }

      clientA.send(
        JSON.stringify({
          type: "set_direction",
          payload: { dirX: 1, dirY: 0 },
        })
      );

      await expect.poll(
        () => listenerA?.getLatest()?.players[0]?.x ?? Number.NEGATIVE_INFINITY,
        { timeout: 5000, interval: 50 }
      ).toBeGreaterThan(baseline.players[0].x);

      const afterRight = listenerA.getLatest();
      if (!afterRight) {
        throw new Error("Missing movement snapshot for client A.");
      }

      clientB = new WebSocket(url);
      await waitForOpen(clientB);
      listenerB = createSnapshotListener(clientB);

      clientB.send(
        JSON.stringify({
          type: "set_direction",
          payload: { dirX: 0, dirY: 1 },
        })
      );

      await expect.poll(
        () => {
          const snapshot = listenerB?.getLatest();
          if (!snapshot) {
            return Number.NEGATIVE_INFINITY;
          }
          return snapshot.players[0].dirY - snapshot.players[0].dirX;
        },
        { timeout: 7000, interval: 50 }
      ).toBeGreaterThan(0);

      const afterDown = listenerB.getLatest();
      if (!afterDown) {
        throw new Error("Missing movement snapshot for client B.");
      }

      expect(afterDown.players[0].x).toBeGreaterThan(afterRight.players[0].x);
      expect(afterDown.players[0].y).toBeGreaterThan(afterRight.players[0].y);
      expect(afterDown.players[0].dirY).toBeGreaterThan(0);
    } finally {
      listenerA?.stop();
      listenerB?.stop();
      await closeSocket(clientA);
      await closeSocket(clientB);
      clearInterval(tickHandle);
      await closeServer(server);
    }
  }, testTimeoutMs);

  it("Connection Resilience (Small Burst)", async () => {
    const server = startWebSocketServer({ port: 0 });
    const tickHandle = startTickLoop();
    let client1: WebSocket | null = null;
    let client2: WebSocket | null = null;
    let client3: WebSocket | null = null;
    let finalClient: WebSocket | null = null;
    let finalListener: ReturnType<typeof createSnapshotListener> | null = null;

    try {
      const url = await resolveServerUrl(server);

      client1 = new WebSocket(url);
      await waitForOpen(client1);
      client2 = new WebSocket(url);
      await waitForOpen(client2);
      client3 = new WebSocket(url);
      await waitForOpen(client3);

      client1.close();
      await waitForClose(client1);
      client2.close();
      await waitForClose(client2);
      client3.close();
      await waitForClose(client3);

      finalClient = new WebSocket(url);
      await waitForOpen(finalClient);
      finalListener = createSnapshotListener(finalClient);

      await expect.poll(
        () => finalListener?.getLatest()?.tick ?? -1,
        { timeout: 5000, interval: 50 }
      ).toBeGreaterThan(0);
    } finally {
      finalListener?.stop();
      await closeSocket(client1);
      await closeSocket(client2);
      await closeSocket(client3);
      await closeSocket(finalClient);
      clearInterval(tickHandle);
      await closeServer(server);
    }
  }, testTimeoutMs);
});
