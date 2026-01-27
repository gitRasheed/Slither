import { describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import type { AddressInfo } from "net";
import { createWorld } from "../src/core/world.js";
import { startGameLoop } from "../src/core/gameLoop.js";
import { spawnInitialFood } from "../src/core/food.js";
import { broadcastToAll } from "../src/net/messageHandlers.js";
import { startWebSocketServer } from "../src/net/server.js";

type JoinAckMessage = {
  type: "join_ack";
  playerId?: string;
  snakeId?: string;
};

type StateMessage = {
  type: "state";
  time: number;
  snakes: { id: string; segments: { x: number; y: number }[] }[];
  foods: { id: string; position: { x: number; y: number }; value: number }[];
};

type ServerMessage = JoinAckMessage | StateMessage | { type: "dead" };

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

const parseMessage = (data: WebSocket.RawData): ServerMessage | null => {
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

  const message = parsed as ServerMessage;
  if (message.type === "state") {
    if (
      typeof (message as StateMessage).time !== "number" ||
      !Array.isArray((message as StateMessage).snakes)
    ) {
      return null;
    }
  }

  return message;
};

const createMessageBuffer = (socket: WebSocket) => {
  let latestState: StateMessage | null = null;
  let latestJoinAck: JoinAckMessage | null = null;

  const onMessage = (data: WebSocket.RawData) => {
    const message = parseMessage(data);
    if (!message) {
      return;
    }

    if (message.type === "state") {
      latestState = message as StateMessage;
      return;
    }

    if (message.type === "join_ack") {
      latestJoinAck = message as JoinAckMessage;
    }
  };

  socket.on("message", onMessage);

  const waitForJoinAck = (timeoutMs = 2000): Promise<JoinAckMessage> =>
    new Promise((resolve, reject) => {
      if (latestJoinAck) {
        resolve(latestJoinAck);
        return;
      }

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Timed out waiting for join_ack."));
      }, timeoutMs);

      const interval = setInterval(() => {
        if (latestJoinAck) {
          cleanup();
          resolve(latestJoinAck);
        }
      }, 20);

      const cleanup = () => {
        clearTimeout(timeout);
        clearInterval(interval);
      };
    });

  const waitForState = (predicate?: (state: StateMessage) => boolean, timeoutMs = 3000) =>
    new Promise<StateMessage>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Timed out waiting for state."));
      }, timeoutMs);

      const interval = setInterval(() => {
        if (!latestState) {
          return;
        }
        if (!predicate || predicate(latestState)) {
          cleanup();
          resolve(latestState);
        }
      }, 20);

      const cleanup = () => {
        clearTimeout(timeout);
        clearInterval(interval);
      };
    });

  const stop = () => socket.off("message", onMessage);

  return {
    getLatestState: () => latestState,
    waitForJoinAck,
    waitForState,
    stop,
  };
};

const waitFor = async (
  condition: () => boolean,
  timeoutMs = 4000,
  intervalMs = 50
): Promise<void> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error("Timed out waiting for condition.");
};

const getHeading = (snake: StateMessage["snakes"][number]): number | null => {
  if (snake.segments.length < 2) {
    return null;
  }
  const head = snake.segments[0];
  const next = snake.segments[1];
  return Math.atan2(head.y - next.y, head.x - next.x);
};

const wrapAngle = (angle: number): number => {
  if (angle > Math.PI) {
    return angle - Math.PI * 2;
  }
  if (angle < -Math.PI) {
    return angle + Math.PI * 2;
  }
  return angle;
};

describe("Multi-client isolation", () => {
  it(
    "join_ack includes snakeId",
    async () => {
      const world = createWorld();
      spawnInitialFood(world);
      const server = startWebSocketServer(world, { port: 0 });
      const tickHandle = startGameLoop(world, {
        onState: (message) => broadcastToAll(world, message),
      });

      let client: WebSocket | null = null;
      let buffer: ReturnType<typeof createMessageBuffer> | null = null;

      try {
        const url = await resolveServerUrl(server);
        client = new WebSocket(url);
        buffer = createMessageBuffer(client);
        await waitForOpen(client);
        client.send(JSON.stringify({ type: "join", name: "alpha" }));

        const joinAck = await buffer.waitForJoinAck();
        expect(typeof joinAck.playerId).toBe("string");
        expect(typeof joinAck.snakeId).toBe("string");
      } finally {
        buffer?.stop();
        await closeSocket(client);
        clearInterval(tickHandle);
        await closeServer(server);
      }
    },
    testTimeoutMs
  );

  it(
    "isolates inputs per socket",
    async () => {
      const world = createWorld();
      spawnInitialFood(world);
      const server = startWebSocketServer(world, { port: 0 });
      const tickHandle = startGameLoop(world, {
        onState: (message) => broadcastToAll(world, message),
      });

      let clientA: WebSocket | null = null;
      let clientB: WebSocket | null = null;
      let bufferA: ReturnType<typeof createMessageBuffer> | null = null;
      let bufferB: ReturnType<typeof createMessageBuffer> | null = null;

      try {
        const url = await resolveServerUrl(server);

        clientA = new WebSocket(url);
        bufferA = createMessageBuffer(clientA);
        await waitForOpen(clientA);
        clientA.send(JSON.stringify({ type: "join", name: "alpha" }));

        clientB = new WebSocket(url);
        bufferB = createMessageBuffer(clientB);
        await waitForOpen(clientB);
        clientB.send(JSON.stringify({ type: "join", name: "bravo" }));

        const joinA = await bufferA.waitForJoinAck();
        const joinB = await bufferB.waitForJoinAck();

        expect(joinA.playerId).not.toBe(joinB.playerId);
        expect(joinA.snakeId).not.toBe(joinB.snakeId);

        const state = await bufferA.waitForState((snapshot) => snapshot.snakes.length >= 2);
        const snakeA = state.snakes.find((snake) => snake.id === joinA.snakeId);
        const snakeB = state.snakes.find((snake) => snake.id === joinB.snakeId);
        if (!snakeA || !snakeB) {
          throw new Error("Missing snakes in state snapshot.");
        }

        const baselineHeadingA = getHeading(snakeA);
        const baselineHeadingB = getHeading(snakeB);
        if (baselineHeadingA === null || baselineHeadingB === null) {
          throw new Error("Missing snake headings.");
        }

        const targetAngle = wrapAngle(baselineHeadingA + Math.PI / 2);
        clientA.send(JSON.stringify({ type: "move", angle: targetAngle }));

        await waitFor(() => {
          const latest = bufferA?.getLatestState();
          if (!latest) {
            return false;
          }
          const latestA = latest.snakes.find((snake) => snake.id === joinA.snakeId);
          const latestB = latest.snakes.find((snake) => snake.id === joinB.snakeId);
          if (!latestA || !latestB) {
            return false;
          }
          const headingA = getHeading(latestA);
          const headingB = getHeading(latestB);
          if (headingA === null || headingB === null) {
            return false;
          }
          const deltaA = Math.abs(wrapAngle(headingA - baselineHeadingA));
          const deltaB = Math.abs(wrapAngle(headingB - baselineHeadingB));
          return deltaA > 0.4 && deltaB < 0.2;
        });
      } finally {
        bufferA?.stop();
        bufferB?.stop();
        await closeSocket(clientA);
        await closeSocket(clientB);
        clearInterval(tickHandle);
        await closeServer(server);
      }
    },
    testTimeoutMs
  );
});
