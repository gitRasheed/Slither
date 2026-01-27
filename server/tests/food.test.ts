import { describe, expect, it } from "vitest";
import { ARENA_RADIUS, FOOD_RADIUS } from "../src/constants/game.js";
import { spawnRandomFood } from "../src/core/food.js";
import { createWorld } from "../src/core/world.js";

describe("Food system", () => {
  it("spawns food within arena bounds", () => {
    const world = createWorld();
    const foods = spawnRandomFood(world, 25);

    expect(foods).toHaveLength(25);
    for (const food of foods) {
      const distance = Math.hypot(food.position.x, food.position.y);
      expect(distance).toBeLessThanOrEqual(ARENA_RADIUS - FOOD_RADIUS + 0.0001);
    }
  });
});
