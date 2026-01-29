import type { Food, FoodsMessage, SnakeView } from "../types/messages";
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
const foodsBuffer: { time: number; foods: Food[] }[] = [];
let localPlayerId: string | undefined;
let localSnakeId: string | undefined;
let localEliminations = 0;
let timeOffsetMs: number | null = null;

export function pushState(newState: BufferedState, receivedAt = performance.now()): void {
  const last = stateBuffer[stateBuffer.length - 1];
  if (last && newState.time <= last.time) {
    return;
  }

  const foods = getFoodsForTime(newState.time);
  const nextState = foods
    ? { ...newState, foods }
    : newState;

  timeOffsetMs = receivedAt - nextState.time;
  stateBuffer.push(nextState);

  const minTime = nextState.time - MAX_HISTORY_MS;
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

export function getLatestState(): BufferedState | null {
  if (stateBuffer.length === 0) {
    return null;
  }
  return stateBuffer[stateBuffer.length - 1];
}

export function resetStateBuffer(): void {
  stateBuffer.length = 0;
  foodsBuffer.length = 0;
  timeOffsetMs = null;
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

export function setEliminations(count: number): void {
  localEliminations = Math.max(0, Math.floor(count));
}

export function getEliminations(): number {
  return localEliminations;
}

export function pushFoods(message: FoodsMessage): void {
  const last = foodsBuffer[foodsBuffer.length - 1];
  if (last && message.time <= last.time) {
    return;
  }

  const foods: Food[] = [];
  for (let i = 0; i < message.ids.length; i += 1) {
    const x = message.positions[i * 2];
    const y = message.positions[i * 2 + 1];
    foods.push({ id: message.ids[i], position: { x, y }, value: message.values[i] });
  }

  foodsBuffer.push({ time: message.time, foods });

  const minTime = message.time - MAX_HISTORY_MS;
  while (foodsBuffer.length > 0 && foodsBuffer[0].time < minTime) {
    foodsBuffer.shift();
  }
  while (foodsBuffer.length > MAX_BUFFER_SIZE) {
    foodsBuffer.shift();
  }
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

function getFoodsForTime(time: number): Food[] | null {
  if (foodsBuffer.length === 0) {
    return null;
  }

  if (time < foodsBuffer[0].time) {
    return null;
  }

  let selected = foodsBuffer[0];
  for (const entry of foodsBuffer) {
    if (entry.time <= time) {
      selected = entry;
    } else {
      break;
    }
  }

  return selected.foods;
}
