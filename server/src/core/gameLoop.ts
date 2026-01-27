import {
  BOOST_LENGTH_DRAIN_PER_SECOND,
  BOOST_SPEED,
  FOOD_SPAWN_COUNT,
  FOOD_SPAWN_INTERVAL_TICKS,
  FOOD_VALUE,
  MIN_LENGTH,
  SNAKE_RADIUS,
  TICK_INTERVAL_MS,
  TICK_RATE,
  TURN_RATE,
} from "../constants/game.js";
import { createFood } from "../entities/Food.js";
import { toSnakeView } from "../entities/Snake.js";
import type { DeathEvent, Food, Snake, World } from "../types/game.js";
import type { ServerMessage } from "../types/messages.js";
import { checkSnakeFoodCollisions, checkSnakeSnakeCollisions } from "./collision.js";
import { spawnRandomFood } from "./food.js";
import { clamp, randomPointInCircle, wrapAngle } from "./math.js";

export type GameLoopCallbacks = {
  onState?: (message: ServerMessage) => void;
  onDeath?: (event: DeathEvent) => void;
};

export function startGameLoop(
  world: World,
  callbacks: GameLoopCallbacks = {}
): NodeJS.Timeout {
  return setInterval(() => {
    tick(world, callbacks);
  }, TICK_INTERVAL_MS);
}

export function tick(world: World, callbacks: GameLoopCallbacks = {}): void {
  world.tick += 1;
  const deltaSeconds = 1 / TICK_RATE;

  const boostDrops: Food[] = [];
  for (const snake of world.snakes.values()) {
    boostDrops.push(...applyBoostDrain(snake, deltaSeconds));
    updateSnakeMovement(snake, deltaSeconds);
  }

  for (const food of boostDrops) {
    world.foods.set(food.id, food);
  }

  checkSnakeFoodCollisions(world);

  for (const snake of world.snakes.values()) {
    trimSnakeTail(snake);
    snake.lastUpdateTime = world.tick * TICK_INTERVAL_MS;
  }

  const deaths = handleCollisions(world);
  for (const event of deaths) {
    callbacks.onDeath?.(event);
  }

  if (world.tick % FOOD_SPAWN_INTERVAL_TICKS === 0) {
    spawnRandomFood(world, FOOD_SPAWN_COUNT);
  }

  if (callbacks.onState) {
    broadcastGameState(world, callbacks.onState);
  }
}

export function updateSnakeMovement(snake: Snake, deltaSeconds = 1 / TICK_RATE): void {
  const target = Number.isFinite(snake.targetDirection)
    ? wrapAngle(snake.targetDirection)
    : snake.direction;
  const delta = wrapAngle(target - snake.direction);
  const maxDelta = TURN_RATE * deltaSeconds;
  const appliedDelta = clamp(delta, -maxDelta, maxDelta);
  snake.direction = wrapAngle(snake.direction + appliedDelta);

  const speed = snake.isBoosting ? BOOST_SPEED : snake.speed;
  const distance = speed * deltaSeconds;

  if (distance <= 0) {
    return;
  }

  const head = snake.segments[0];
  if (!head) {
    return;
  }

  const nextHead = {
    x: head.x + Math.cos(snake.direction) * distance,
    y: head.y + Math.sin(snake.direction) * distance,
  };

  snake.segments.unshift(nextHead);
}

export function trimSnakeTail(snake: Snake): void {
  if (snake.segments.length === 0) {
    return;
  }

  const maxLength = Math.max(0, snake.length);
  const trimmed = [snake.segments[0]];
  let remaining = maxLength;

  for (let i = 0; i < snake.segments.length - 1; i += 1) {
    const current = snake.segments[i];
    const next = snake.segments[i + 1];
    const dx = next.x - current.x;
    const dy = next.y - current.y;
    const segmentLength = Math.hypot(dx, dy);

    if (segmentLength === 0) {
      continue;
    }

    if (remaining >= segmentLength) {
      remaining -= segmentLength;
      trimmed.push(next);
    } else {
      const t = segmentLength === 0 ? 0 : remaining / segmentLength;
      trimmed.push({
        x: current.x + dx * t,
        y: current.y + dy * t,
      });
      remaining = 0;
      break;
    }
  }

  if (trimmed.length === 1) {
    trimmed.push({ ...trimmed[0] });
  }

  snake.segments = trimmed;
}

export function handleCollisions(world: World): DeathEvent[] {
  return checkSnakeSnakeCollisions(world);
}

export function broadcastGameState(
  world: World,
  broadcast: (message: ServerMessage) => void
): void {
  const message: ServerMessage = {
    type: "state",
    time: world.tick * TICK_INTERVAL_MS,
    snakes: Array.from(world.snakes.values()).map((snake) => toSnakeView(snake)),
    foods: Array.from(world.foods.values()).map((food) => ({
      id: food.id,
      position: { x: food.position.x, y: food.position.y },
      value: food.value,
    })),
  };

  broadcast(message);
}

function applyBoostDrain(snake: Snake, deltaSeconds: number): Food[] {
  if (!snake.isBoosting) {
    return [];
  }

  if (snake.length <= MIN_LENGTH) {
    snake.isBoosting = false;
    snake.boostAccumulator = 0;
    return [];
  }

  const drain = BOOST_LENGTH_DRAIN_PER_SECOND * deltaSeconds;
  snake.length = Math.max(MIN_LENGTH, snake.length - drain);
  snake.boostAccumulator += drain;

  const drops: Food[] = [];
  const dropCount = Math.floor(snake.boostAccumulator / FOOD_VALUE);
  if (dropCount > 0) {
    snake.boostAccumulator -= dropCount * FOOD_VALUE;
    const tail = snake.segments[snake.segments.length - 1] ?? snake.segments[0];

    if (!tail) {
      return drops;
    }

    for (let i = 0; i < dropCount; i += 1) {
      const offset = randomPointInCircle(SNAKE_RADIUS);
      drops.push(
        createFood({
          x: tail.x + offset.x,
          y: tail.y + offset.y,
        })
      );
    }
  }

  if (snake.length <= MIN_LENGTH) {
    snake.isBoosting = false;
  }

  return drops;
}
