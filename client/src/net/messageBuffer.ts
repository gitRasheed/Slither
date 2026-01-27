import type {
  DeathMessage,
  JoinAckMessage,
  ServerMessage,
  StateMessage,
} from "../types/messages";

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
  Array.isArray(value.segments) &&
  value.segments.every(isPoint) &&
  typeof value.isBoosting === "boolean" &&
  isString(value.color);

const isFood = (value: unknown): value is StateMessage["foods"][number] =>
  isObject(value) &&
  isString(value.id) &&
  isObject(value.position) &&
  isPoint(value.position) &&
  isNumber(value.value);

export function parseServerMessage(raw: string): ServerMessage | null {
  let data: unknown;

  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isObject(data) || typeof data.type !== "string") {
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

  if (data.type === "dead") {
    const message = data as Partial<DeathMessage>;
    if (message.killerId !== undefined && !isString(message.killerId)) {
      return null;
    }
    return { type: "dead", killerId: message.killerId };
  }

  if (data.type === "join_ack") {
    const message = data as Partial<JoinAckMessage>;
    if (!isString(message.playerId) || !isString(message.snakeId)) {
      return null;
    }
    return { type: "join_ack", playerId: message.playerId, snakeId: message.snakeId };
  }

  return null;
}
