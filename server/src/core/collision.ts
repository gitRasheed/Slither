import {
  ARENA_RADIUS,
  FOOD_COLLISION_CELL_SIZE,
  FOOD_RADIUS,
  FOOD_VALUE,
  MAX_LENGTH,
  SNAKE_RADIUS,
} from "../constants/game.js";
import { createFood } from "../entities/Food.js";
import { distanceSq, pointToSegmentDistanceSq, randomPointInCircle } from "./math.js";
import type { DeathEvent, Food, Point, Snake, World } from "../types/game.js";

const consumeDistanceSq = (FOOD_RADIUS + SNAKE_RADIUS) ** 2;
const bodyHitRadiusSq = (SNAKE_RADIUS * 1.05) ** 2;
const foodCellRadius = 2;

export function checkSnakeFoodCollisions(world: World): void {
  const foodGrid = new Map<string, Food[]>();
  for (const food of world.foods.values()) {
    const key = getFoodCellKey(food.position.x, food.position.y);
    const bucket = foodGrid.get(key);
    if (bucket) {
      bucket.push(food);
    } else {
      foodGrid.set(key, [food]);
    }
  }

  for (const snake of world.snakes.values()) {
    const head = snake.segments[0];
    if (!head) {
      continue;
    }

    const baseCellX = getFoodCellIndex(head.x);
    const baseCellY = getFoodCellIndex(head.y);

    for (let dx = -foodCellRadius; dx <= foodCellRadius; dx += 1) {
      for (let dy = -foodCellRadius; dy <= foodCellRadius; dy += 1) {
        const key = getFoodCellKeyFromCell(baseCellX + dx, baseCellY + dy);
        const bucket = foodGrid.get(key);
        if (!bucket) {
          continue;
        }

        for (const food of bucket) {
          if (!world.foods.has(food.id)) {
            continue;
          }
          if (distanceSq(head, food.position) <= consumeDistanceSq) {
            world.foods.delete(food.id);
            snake.length = Math.min(MAX_LENGTH, snake.length + food.value);
          }
        }
      }
    }
  }
}

export function checkSnakeSnakeCollisions(world: World): DeathEvent[] {
  const deaths: DeathEvent[] = [];
  const killed = new Set<string>();
  const snakes = Array.from(world.snakes.values());

  for (let i = 0; i < snakes.length; i += 1) {
    const snakeA = snakes[i];
    if (killed.has(snakeA.id)) {
      continue;
    }

    const headA = snakeA.segments[0];
    if (!headA) {
      continue;
    }

    for (let j = i + 1; j < snakes.length; j += 1) {
      const snakeB = snakes[j];
      if (killed.has(snakeB.id)) {
        continue;
      }

      const headB = snakeB.segments[0];
      if (!headB) {
        continue;
      }

      const headDistanceSq = distanceSq(headA, headB);
      if (headDistanceSq <= (SNAKE_RADIUS * 2) ** 2) {
        deaths.push(killSnake(snakeA, world, snakeB.id));
        deaths.push(killSnake(snakeB, world, snakeA.id));
        killed.add(snakeA.id);
        killed.add(snakeB.id);
      }

      if (killed.has(snakeA.id)) {
        break;
      }
    }
  }

  for (const snake of snakes) {
    if (killed.has(snake.id)) {
      continue;
    }

    const head = snake.segments[0];
    if (!head) {
      continue;
    }

    const arenaRadius = Math.max(0, ARENA_RADIUS - SNAKE_RADIUS);
    if (head.x * head.x + head.y * head.y > arenaRadius * arenaRadius) {
      deaths.push(killSnake(snake, world));
      killed.add(snake.id);
      continue;
    }

    for (const other of snakes) {
      if (other.id === snake.id || killed.has(other.id)) {
        continue;
      }

      const segments = other.segments;
      for (let index = 0; index < segments.length - 1; index += 1) {
        const a = segments[index];
        const b = segments[index + 1];
        if (pointToSegmentDistanceSq(head, a, b) <= bodyHitRadiusSq) {
          deaths.push(killSnake(snake, world, other.id));
          killed.add(snake.id);
          break;
        }
      }

      if (killed.has(snake.id)) {
        break;
      }
    }

  }

  return deaths;
}

export function killSnake(snake: Snake, world: World, killerId?: string): DeathEvent {
  world.snakes.delete(snake.id);

  const spawned = spawnFoodFromSnake(snake);
  for (const food of spawned) {
    world.foods.set(food.id, food);
  }

  return {
    snakeId: snake.id,
    ownerId: snake.ownerId,
    killerId,
  };
}

export function spawnFoodFromSnake(snake: Snake): Food[] {
  const foods: Food[] = [];
  const count = Math.max(1, Math.floor(snake.length / FOOD_VALUE));

  const spacing = snake.length / (count + 1);
  for (let i = 1; i <= count; i += 1) {
    const point = pointAlongSegments(snake.segments, spacing * i);
    const jitter = randomPointInCircle(SNAKE_RADIUS);
    foods.push(
      createFood({
        x: point.x + jitter.x,
        y: point.y + jitter.y,
      })
    );
  }

  return foods;
}

function pointAlongSegments(segments: Point[], distance: number): Point {
  if (segments.length === 0) {
    return { x: 0, y: 0 };
  }

  let remaining = Math.max(0, distance);
  for (let i = 0; i < segments.length - 1; i += 1) {
    const a = segments[i];
    const b = segments[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const segmentLength = Math.hypot(dx, dy);

    if (segmentLength === 0) {
      continue;
    }

    if (remaining <= segmentLength) {
      const t = remaining / segmentLength;
      return {
        x: a.x + dx * t,
        y: a.y + dy * t,
      };
    }

    remaining -= segmentLength;
  }

  return segments[segments.length - 1];
}

function getFoodCellIndex(value: number): number {
  return Math.floor(value / FOOD_COLLISION_CELL_SIZE);
}

function getFoodCellKeyFromCell(cellX: number, cellY: number): string {
  return `${cellX},${cellY}`;
}

function getFoodCellKey(x: number, y: number): string {
  return getFoodCellKeyFromCell(getFoodCellIndex(x), getFoodCellIndex(y));
}
