import type { Food, SnakeView } from "../types/messages";
import { interpolatePoint, interpolateSnakes } from "./interpolate";

export type BufferedState = {
  time: number;
  snakes: SnakeView[];
  foods: Food[];
};

const MAX_BUFFER_SIZE = 64;
const INTERPOLATION_DELAY_MS = 100;
const MAX_HISTORY_MS = 1000;

const stateBuffer: BufferedState[] = [];
let localPlayerId: string | undefined;
let localSnakeId: string | undefined;
let timeOffsetMs: number | null = null;

export function pushState(newState: BufferedState, receivedAt = performance.now()): void {
  const last = stateBuffer[stateBuffer.length - 1];
  if (last && newState.time <= last.time) {
    return;
  }

  timeOffsetMs = receivedAt - newState.time;
  stateBuffer.push(newState);

  const minTime = newState.time - MAX_HISTORY_MS;
  while (stateBuffer.length > 0 && stateBuffer[0].time < minTime) {
    stateBuffer.shift();
  }

  while (stateBuffer.length > MAX_BUFFER_SIZE) {
    stateBuffer.shift();
  }
}

export function getInterpolatedState(now = performance.now()): BufferedState | null {
  if (stateBuffer.length === 0) {
    return null;
  }

  if (stateBuffer.length === 1) {
    return stateBuffer[0];
  }

  const offset = timeOffsetMs ?? 0;
  const serverNow = now - offset;
  const renderTime = serverNow - INTERPOLATION_DELAY_MS;

  const first = stateBuffer[0];
  const last = stateBuffer[stateBuffer.length - 1];
  if (renderTime <= first.time) {
    return first;
  }
  if (renderTime >= last.time) {
    return last;
  }

  let previous = first;
  let next = last;

  for (let i = 0; i < stateBuffer.length - 1; i += 1) {
    const a = stateBuffer[i];
    const b = stateBuffer[i + 1];
    if (renderTime >= a.time && renderTime <= b.time) {
      previous = a;
      next = b;
      break;
    }
  }

  if (next.time === previous.time) {
    return next;
  }

  const alpha = Math.max(0, Math.min(1, (renderTime - previous.time) / (next.time - previous.time)));
  const snakes = interpolateSnakes(previous.snakes, next.snakes, alpha);
  const foods = interpolateFoods(previous.foods, next.foods, alpha);

  return {
    time: renderTime,
    snakes,
    foods,
  };
}

export function setPlayerId(id: string): void {
  localPlayerId = id;
}

export function getPlayerId(): string | undefined {
  return localPlayerId;
}

export function setSnakeId(id: string): void {
  localSnakeId = id;
}

export function getSnakeId(): string | undefined {
  return localSnakeId;
}

function interpolateFoods(a: Food[], b: Food[], alpha: number): Food[] {
  const mapA = new Map(a.map((food) => [food.id, food]));
  const result: Food[] = [];

  for (const foodB of b) {
    const foodA = mapA.get(foodB.id);
    if (!foodA) {
      result.push(foodB);
      continue;
    }

    result.push({
      id: foodB.id,
      position: interpolatePoint(foodA.position, foodB.position, alpha),
      value: foodB.value,
    });
  }

  return result;
}
