import {
  ARENA_RADIUS,
  FOOD_RADIUS,
  FOOD_MAX_COUNT,
  INITIAL_FOOD_COUNT,
} from "../constants/game.js";
import { createFood } from "../entities/Food.js";
import { randomPointInCircle } from "./math.js";
import type { Food, Point, World } from "../types/game.js";

export function spawnInitialFood(world: World): void {
  spawnRandomFood(world, INITIAL_FOOD_COUNT);
}

export function spawnRandomFood(world: World, count: number): Food[] {
  const foods: Food[] = [];
  if (world.foods.size >= FOOD_MAX_COUNT) {
    return foods;
  }
  const radius = Math.max(0, ARENA_RADIUS - FOOD_RADIUS);

  for (let i = 0; i < count; i += 1) {
    const position = randomPointInCircle(radius);
    const food = createFood(position);
    world.foods.set(food.id, food);
    foods.push(food);
  }

  return foods;
}

export function removeFood(foodId: string, world: World): void {
  world.foods.delete(foodId);
}

export function spawnFoodAt(world: World, position: Point, value?: number): Food {
  const food = createFood(position, value);
  world.foods.set(food.id, food);
  return food;
}
