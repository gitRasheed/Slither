import type { Food, SnakeView } from "./game.js";

export type ClientMessage =
  | { type: "join"; name: string }
  | { type: "move"; angle: number }
  | { type: "boost"; active: boolean };

export type ServerMessage =
  | { type: "state"; time: number; snakes: SnakeView[]; foods: Food[] }
  | { type: "dead"; killerId?: string }
  | { type: "join_ack"; playerId: string; snakeId: string };
