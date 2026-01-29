export type Point = {
  x: number;
  y: number;
};

export type SnakeView = {
  id: string;
  name: string;
  segments: Point[];
  length: number;
  isBoosting: boolean;
  color: string;
};

export type Food = {
  id: string;
  position: Point;
  value: number;
};

export type ClientMessage =
  | { type: "join"; name: string }
  | { type: "move"; angle: number }
  | { type: "boost"; active: boolean };

export type StateMessage = {
  type: "state";
  time: number;
  snakes: SnakeView[];
  foods: Food[];
};

export type DeathMessage = { type: "dead"; killerId?: string; killerName?: string };

export type JoinAckMessage = {
  type: "join_ack";
  playerId: string;
  snakeId: string;
  eliminations: number;
};

export type StatsMessage = { type: "stats"; eliminations: number };

export type ServerMessage = StateMessage | DeathMessage | JoinAckMessage | StatsMessage;
