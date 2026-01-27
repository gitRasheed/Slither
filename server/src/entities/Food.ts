import { randomUUID } from "node:crypto";
import { FOOD_VALUE } from "../constants/game.js";
import type { Food, Point } from "../types/game.js";

export function createFood(position: Point, value = FOOD_VALUE): Food {
  return {
    id: randomUUID(),
    position: { x: position.x, y: position.y },
    value,
  };
}
