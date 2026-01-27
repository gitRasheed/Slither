import { config } from "./config.js";
import type { World } from "./types.js";

export function createWorld(): World {
  return {
    tick: 0,
    orbs: [],
    players: [
      {
        id: 0,
        x: 0,
        y: 0,
        dirX: 1,
        dirY: 0,
        targetDirX: 0,
        targetDirY: 1,
        speed: config.simulation.playerDefaultSpeed,
        length: config.simulation.playerDefaultLength,
      },
    ],
  };
}
