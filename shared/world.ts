import type { World } from "./types.js";

export function createWorld(): World {
  return {
    tick: 0,
    orbs: [],
    players: [],
  };
}
