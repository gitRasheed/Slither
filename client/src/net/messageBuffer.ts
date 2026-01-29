import { unpack } from "msgpackr";
import type {
  DeathMessage,
  FoodsMessage,
  JoinAckMessage,
  ServerMessage,
  StateMessage,
} from "../types/messages";

type ServerPayload = {
  v?: number;
  type?: unknown;
  [key: string]: unknown;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isString = (value: unknown): value is string => typeof value === "string";

const isPoint = (value: unknown): value is { x: number; y: number } =>
  isObject(value) && isNumber(value.x) && isNumber(value.y);

const isSnakeView = (value: unknown): value is StateMessage["snakes"][number] =>
  isObject(value) &&
  isString(value.id) &&
  isString(value.name) &&
  Array.isArray(value.segments) &&
  value.segments.every(isPoint) &&
  isNumber(value.length) &&
  typeof value.isBoosting === "boolean" &&
  isString(value.color);

const isFood = (value: unknown): value is StateMessage["foods"][number] =>
  isObject(value) &&
  isString(value.id) &&
  isObject(value.position) &&
  isPoint(value.position) &&
  isNumber(value.value);

const isNumberArray = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every(isNumber);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString);

export function parseServerMessage(raw: ArrayBuffer): ServerMessage | null {
  let data: ServerPayload;

  try {
    data = unpack(new Uint8Array(raw)) as ServerPayload;
  } catch {
    return null;
  }

  if (!isObject(data) || data.v !== 1 || typeof data.type !== "string") {
    return null;
  }

  if (data.type === "state") {
    const message = data as Partial<StateMessage>;
    if (!isNumber(message.time)) {
      return null;
    }
    if (!Array.isArray(message.snakes) || !message.snakes.every(isSnakeView)) {
      return null;
    }
    if (!Array.isArray(message.foods) || !message.foods.every(isFood)) {
      return null;
    }
    return message as StateMessage;
  }

  if (data.type === "foods") {
    const message = data as Partial<FoodsMessage>;
    if (!isNumber(message.time)) {
      return null;
    }
    if (!isStringArray(message.ids) || !isNumberArray(message.positions)) {
      return null;
    }
    if (!isNumberArray(message.values)) {
      return null;
    }
    if (message.positions.length !== message.ids.length * 2) {
      return null;
    }
    if (message.values.length !== message.ids.length) {
      return null;
    }
    return message as FoodsMessage;
  }

  if (data.type === "dead") {
    const message = data as Partial<DeathMessage>;
    if (message.killerId !== undefined && !isString(message.killerId)) {
      return null;
    }
    if (message.killerName !== undefined && !isString(message.killerName)) {
      return null;
    }
    return { type: "dead", killerId: message.killerId, killerName: message.killerName };
  }

  if (data.type === "join_ack") {
    const message = data as Partial<JoinAckMessage>;
    if (!isString(message.playerId) || !isString(message.snakeId)) {
      return null;
    }
    let eliminations = 0;
    if (message.eliminations !== undefined) {
      if (!isNumber(message.eliminations)) {
        return null;
      }
      eliminations = message.eliminations;
    }
    return {
      type: "join_ack",
      playerId: message.playerId,
      snakeId: message.snakeId,
      eliminations,
    };
  }

  if (data.type === "stats") {
    const message = data as { eliminations?: unknown };
    if (!isNumber(message.eliminations)) {
      return null;
    }
    return { type: "stats", eliminations: message.eliminations };
  }

  return null;
}
