import { describe, expect, it } from "vitest";
import { FOOD_VALUE } from "../src/constants/game.js";
import {
  checkSnakeFoodCollisions,
  checkSnakeSnakeCollisions,
} from "../src/core/collision.js";
import { createWorld } from "../src/core/world.js";
import { createFood } from "../src/entities/Food.js";
import { createSnake } from "../src/entities/Snake.js";

describe("Collision system", () => {
  it("consumes food and grows the snake", () => {
    const world = createWorld();
    const snake = createSnake({
      ownerId: "player",
      position: { x: 0, y: 0 },
      direction: 0,
      length: 100,
    });

    world.snakes.set(snake.id, snake);
    const food = createFood({ x: 0, y: 0 }, FOOD_VALUE);
    world.foods.set(food.id, food);

    const startLength = snake.length;
    checkSnakeFoodCollisions(world);

    expect(world.foods.size).toBe(0);
    expect(snake.length).toBe(startLength + FOOD_VALUE);
  });

  it("kills when head hits another snake body", () => {
    const world = createWorld();

    const snakeA = createSnake({
      ownerId: "a",
      position: { x: 75, y: 0 },
      direction: 0,
      length: 80,
    });

    const snakeB = createSnake({
      ownerId: "b",
      position: { x: 0, y: 0 },
      direction: 0,
      length: 100,
    });

    snakeB.segments = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 100, y: 0 },
    ];
    snakeB.length = 100;

    world.snakes.set(snakeA.id, snakeA);
    world.snakes.set(snakeB.id, snakeB);

    const events = checkSnakeSnakeCollisions(world);
    const killedA = events.find((event) => event.snakeId === snakeA.id);

    expect(killedA).toBeTruthy();
    expect(killedA?.killerId).toBe(snakeB.id);
    expect(world.snakes.size).toBe(1);
  });

  it("ignores self collision against own body", () => {
    const world = createWorld();

    const snake = createSnake({
      ownerId: "self",
      position: { x: 0, y: 0 },
      direction: 0,
      length: 140,
    });

    snake.segments = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 10 },
      { x: -10, y: 10 },
      { x: -10, y: 20 },
    ];
    snake.length = 160;

    world.snakes.set(snake.id, snake);

    const events = checkSnakeSnakeCollisions(world);
    const selfDeath = events.find((event) => event.snakeId === snake.id);

    expect(selfDeath).toBeUndefined();
    expect(world.snakes.has(snake.id)).toBe(true);
  });
});
