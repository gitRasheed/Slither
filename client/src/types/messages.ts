export type Point = {
  x: number;
  y: number;
};

export type SnakeView = {
  id: string;
  segments: Point[];
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

export type DeathMessage = { type: "dead"; killerId?: string };

export type JoinAckMessage = { type: "join_ack"; playerId: string; snakeId: string };

export type ServerMessage = StateMessage | DeathMessage | JoinAckMessage;
