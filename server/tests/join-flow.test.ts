import { WebSocket } from "ws";
import type { AddressInfo } from "net";
import { describe, expect, it } from "vitest";
import { createWorld } from "../src/core/world.js";
import { tick } from "../src/core/gameLoop.js";
import { spawnInitialFood } from "../src/core/food.js";
import { sendToClient } from "../src/net/messageHandlers.js";
import { startWebSocketServer } from "../src/net/server.js";
import { ARENA_RADIUS } from "../src/constants/game.js";

type AnyMessage = { type: string; [key: string]: unknown };

type BufferedMessage = {
  type: string;
  time: number;
  payload: AnyMessage;
};

const testTimeoutMs = 10000;

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

const parseMessage = (data: WebSocket.RawData): AnyMessage | null => {
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

  const message = parsed as AnyMessage;
  if (typeof message.type !== "string") {
    return null;
  }

  return message;
};

const createMessageBuffer = (socket: WebSocket) => {
  const messages: BufferedMessage[] = [];

  const onMessage = (data: WebSocket.RawData) => {
    const message = parseMessage(data);
    if (!message) {
      return;
    }

    messages.push({ type: message.type, time: Date.now(), payload: message });
  };

  socket.on("message", onMessage);

  const waitFor = (
    type: string,
    options: { since?: number; timeoutMs?: number } = {}
  ): Promise<AnyMessage> =>
    new Promise((resolve, reject) => {
      const timeoutMs = options.timeoutMs ?? 1500;
      const since = options.since ?? 0;
      const existing = messages.find((entry) => entry.type === type && entry.time >= since);
      if (existing) {
        resolve(existing.payload);
        return;
      }

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`Timed out waiting for ${type}.`));
      }, timeoutMs);

      const interval = setInterval(() => {
        const match = messages.find((entry) => entry.type === type && entry.time >= since);
        if (match) {
          cleanup();
          resolve(match.payload);
        }
      }, 10);

      const cleanup = () => {
        clearTimeout(timeout);
        clearInterval(interval);
      };
    });

  const expectNoMessage = (
    type: string,
    options: { since?: number; timeoutMs?: number } = {}
  ): Promise<void> =>
    new Promise((resolve, reject) => {
      const timeoutMs = options.timeoutMs ?? 200;
      const since = options.since ?? 0;
      const existing = messages.find((entry) => entry.type === type && entry.time >= since);
      if (existing) {
        reject(new Error(`Unexpected ${type} message.`));
        return;
      }

      const timeout = setTimeout(() => {
        cleanup();
        resolve();
      }, timeoutMs);

      const interval = setInterval(() => {
        const match = messages.find((entry) => entry.type === type && entry.time >= since);
        if (match) {
          cleanup();
          reject(new Error(`Unexpected ${type} message.`));
        }
      }, 10);

      const cleanup = () => {
        clearTimeout(timeout);
        clearInterval(interval);
      };
    });

  const stop = () => socket.off("message", onMessage);

  return {
    waitFor,
    expectNoMessage,
    stop,
  };
};

describe("Join flow", () => {
  it(
    "join required",
    async () => {
      const world = createWorld();
      spawnInitialFood(world);
      const server = startWebSocketServer(world, { port: 0 });

      let clientA: WebSocket | null = null;
      let clientB: WebSocket | null = null;
      let bufferA: ReturnType<typeof createMessageBuffer> | null = null;
      let bufferB: ReturnType<typeof createMessageBuffer> | null = null;

      try {
        const url = await resolveServerUrl(server);
        clientA = new WebSocket(url);
        clientB = new WebSocket(url);
        bufferA = createMessageBuffer(clientA);
        bufferB = createMessageBuffer(clientB);

        await waitForOpen(clientA);
        await waitForOpen(clientB);

        expect(world.players.size).toBe(0);
        expect(world.snakes.size).toBe(0);

        await bufferA.expectNoMessage("join_ack", { timeoutMs: 200 });
        await bufferB.expectNoMessage("join_ack", { timeoutMs: 200 });

        const joinSentAt = Date.now();
        clientA.send(JSON.stringify({ type: "join", name: "alpha" }));
        const joinAckA = await bufferA.waitFor("join_ack", { since: joinSentAt });

        expect(typeof joinAckA.playerId).toBe("string");
        expect(typeof joinAckA.snakeId).toBe("string");
        await bufferB.expectNoMessage("join_ack", { timeoutMs: 200 });

        expect(world.players.size).toBe(1);
        expect(world.snakes.size).toBe(1);

        const joinSentBAt = Date.now();
        clientB.send(JSON.stringify({ type: "join", name: "bravo" }));
        const joinAckB = await bufferB.waitFor("join_ack", { since: joinSentBAt });

        expect(typeof joinAckB.playerId).toBe("string");
        expect(typeof joinAckB.snakeId).toBe("string");
        expect(world.players.size).toBe(2);
        expect(world.snakes.size).toBe(2);
      } finally {
        bufferA?.stop();
        bufferB?.stop();
        await closeSocket(clientA);
        await closeSocket(clientB);
        await closeServer(server);
      }
    },
    testTimeoutMs
  );

  it(
    "no auto-respawn",
    async () => {
      const world = createWorld();
      spawnInitialFood(world);
      const server = startWebSocketServer(world, { port: 0 });

      let client: WebSocket | null = null;
      let buffer: ReturnType<typeof createMessageBuffer> | null = null;

      try {
        const url = await resolveServerUrl(server);
        client = new WebSocket(url);
        buffer = createMessageBuffer(client);
        await waitForOpen(client);

        const joinSentAt = Date.now();
        client.send(JSON.stringify({ type: "join", name: "solo" }));
        const joinAck = await buffer.waitFor("join_ack", { since: joinSentAt });
        const snakeId = joinAck.snakeId;
        if (typeof snakeId !== "string") {
          throw new Error("Missing snakeId in join_ack.");
        }

        const snake = world.snakes.get(snakeId);
        if (!snake) {
          throw new Error("Expected snake to exist after join_ack.");
        }

        const outOfBounds = ARENA_RADIUS + 200;
        snake.segments[0] = { x: outOfBounds, y: 0 };

        tick(world, {
          onDeath: (event) => {
            const player = world.players.get(event.ownerId);
            if (!player) {
              return;
            }
            sendToClient(player, { type: "dead", killerId: event.killerId });
          },
        });

        const deathReceivedAt = Date.now();
        await buffer.waitFor("dead", { since: deathReceivedAt - 1000 });
        await buffer.expectNoMessage("join_ack", { since: deathReceivedAt, timeoutMs: 300 });

        expect(world.snakes.size).toBe(0);
        expect(world.players.size).toBe(1);
      } finally {
        buffer?.stop();
        await closeSocket(client);
        await closeServer(server);
      }
    },
    testTimeoutMs
  );

  it(
    "rejoin spawns new snake",
    async () => {
      const world = createWorld();
      spawnInitialFood(world);
      const server = startWebSocketServer(world, { port: 0 });

      let client: WebSocket | null = null;
      let buffer: ReturnType<typeof createMessageBuffer> | null = null;

      try {
        const url = await resolveServerUrl(server);
        client = new WebSocket(url);
        buffer = createMessageBuffer(client);
        await waitForOpen(client);

        const firstJoinAt = Date.now();
        client.send(JSON.stringify({ type: "join", name: "reborn" }));
        const firstJoin = await buffer.waitFor("join_ack", { since: firstJoinAt });
        const firstSnakeId = firstJoin.snakeId;
        if (typeof firstSnakeId !== "string") {
          throw new Error("Missing snakeId in join_ack.");
        }

        const snake = world.snakes.get(firstSnakeId);
        if (!snake) {
          throw new Error("Expected snake to exist after join_ack.");
        }

        const outOfBounds = ARENA_RADIUS + 200;
        snake.segments[0] = { x: outOfBounds, y: 0 };

        tick(world, {
          onDeath: (event) => {
            const player = world.players.get(event.ownerId);
            if (!player) {
              return;
            }
            sendToClient(player, { type: "dead", killerId: event.killerId });
          },
        });

        await buffer.waitFor("dead", { since: Date.now() - 1000 });

        const secondJoinAt = Date.now();
        client.send(JSON.stringify({ type: "join", name: "reborn" }));
        const secondJoin = await buffer.waitFor("join_ack", { since: secondJoinAt });
        const secondSnakeId = secondJoin.snakeId;
        if (typeof secondSnakeId !== "string") {
          throw new Error("Missing snakeId in join_ack.");
        }

        expect(secondSnakeId).not.toBe(firstSnakeId);
        expect(world.snakes.size).toBe(1);
      } finally {
        buffer?.stop();
        await closeSocket(client);
        await closeServer(server);
      }
    },
    testTimeoutMs
  );
});
