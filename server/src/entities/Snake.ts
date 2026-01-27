import { randomUUID } from "node:crypto";
import {
  ARENA_RADIUS,
  SNAKE_RADIUS,
  SNAKE_SPEED,
  START_LENGTH,
} from "../constants/game.js";
import { randomPointInCircle, randomRange } from "../core/math.js";
import type { Point, Snake, SnakeView } from "../types/game.js";

const palette = [
  "#22d3ee",
  "#4ade80",
  "#facc15",
  "#f97316",
  "#f43f5e",
  "#a78bfa",
  "#60a5fa",
  "#f472b6",
];

type CreateSnakeOptions = {
  ownerId: string;
  position?: Point;
  direction?: number;
  length?: number;
  color?: string;
  name?: string;
};

export function createSnake(options: CreateSnakeOptions): Snake {
  const direction = options.direction ?? randomRange(-Math.PI, Math.PI);
  const length = options.length ?? START_LENGTH;
  const spawnRadius = Math.max(0, ARENA_RADIUS - SNAKE_RADIUS * 2);
  const position = options.position ?? randomPointInCircle(spawnRadius);
  const color =
    options.color ?? palette[Math.floor(Math.random() * palette.length)];

  const head = { x: position.x, y: position.y };
  const tail = {
    x: position.x - Math.cos(direction) * length,
    y: position.y - Math.sin(direction) * length,
  };

  return {
    id: randomUUID(),
    ownerId: options.ownerId,
    name: options.name ?? "anon",
    segments: [head, tail],
    direction,
    targetDirection: direction,
    speed: SNAKE_SPEED,
    length,
    isBoosting: false,
    lastUpdateTime: 0,
    color,
    boostAccumulator: 0,
  };
}

export function toSnakeView(snake: Snake): SnakeView {
  return {
    id: snake.id,
    name: snake.name,
    segments: snake.segments.map((segment) => ({
      x: segment.x,
      y: segment.y,
    })),
    isBoosting: snake.isBoosting,
    color: snake.color,
  };
}
