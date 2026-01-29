import type { WebSocket } from "ws";

export type Point = {
  x: number;
  y: number;
};

export type Snake = {
  id: string;
  ownerId: string;
  name: string;
  segments: Point[];
  direction: number;
  targetDirection: number;
  speed: number;
  length: number;
  isBoosting: boolean;
  lastUpdateTime: number;
  color: string;
  boostAccumulator: number;
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

export type Player = {
  id: string;
  socket: WebSocket;
  snake: Snake;
  eliminations: number;
  connectedAt: number;
};

export type World = {
  width: number;
  height: number;
  tick: number;
  snakes: Map<string, Snake>;
  foods: Map<string, Food>;
  players: Map<string, Player>;
};

export type DeathEvent = {
  snakeId: string;
  ownerId: string;
  killerId?: string;
};
