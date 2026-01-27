import { describe, expect, it } from "vitest";
import { TURN_RATE, TICK_RATE } from "../src/constants/game.js";
import { updateSnakeMovement, trimSnakeTail } from "../src/core/gameLoop.js";
import { wrapAngle } from "../src/core/math.js";
import { createSnake } from "../src/entities/Snake.js";

describe("Movement integration", () => {
  it("clamps turn rate per tick", () => {
    const snake = createSnake({
      ownerId: "player",
      position: { x: 0, y: 0 },
      direction: 0,
      length: 100,
    });
    snake.speed = 0;
    snake.targetDirection = Math.PI;

    updateSnakeMovement(snake, 1 / TICK_RATE);

    const maxDelta = TURN_RATE / TICK_RATE;
    const delta = wrapAngle(snake.direction - 0);
    expect(delta).toBeCloseTo(maxDelta, 5);
  });

  it("trims tail to match length", () => {
    const snake = createSnake({
      ownerId: "player",
      position: { x: 0, y: 0 },
      direction: 0,
      length: 100,
    });

    snake.segments = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    snake.length = 50;

    trimSnakeTail(snake);

    const tail = snake.segments[snake.segments.length - 1];
    expect(tail.x).toBeCloseTo(50, 5);
    expect(tail.y).toBeCloseTo(0, 5);
  });
});
