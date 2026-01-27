import { randomUUID } from "node:crypto";
import type { WebSocket } from "ws";
import { MAP_HEIGHT, MAP_WIDTH } from "../constants/game.js";
import { createPlayer } from "../entities/Player.js";
import { createSnake } from "../entities/Snake.js";
import type { Player, World } from "../types/game.js";

export function createWorld(): World {
  return {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    tick: 0,
    snakes: new Map(),
    foods: new Map(),
    players: new Map(),
  };
}

export function addPlayer(world: World, socket: WebSocket): Player {
  const playerId = randomUUID();
  const snake = createSnake({ ownerId: playerId });
  const player = createPlayer(playerId, socket, snake);

  world.players.set(player.id, player);
  world.snakes.set(snake.id, snake);

  return player;
}

export function removePlayer(world: World, playerId: string): void {
  const player = world.players.get(playerId);
  if (!player) {
    return;
  }

  world.players.delete(playerId);
  world.snakes.delete(player.snake.id);
}

export function respawnPlayer(world: World, player: Player): void {
  world.snakes.delete(player.snake.id);
  const snake = createSnake({ ownerId: player.id });
  player.snake = snake;
  world.snakes.set(snake.id, snake);
}

export function findPlayerBySnakeId(world: World, snakeId: string): Player | undefined {
  for (const player of world.players.values()) {
    if (player.snake.id === snakeId) {
      return player;
    }
  }
  return undefined;
}
