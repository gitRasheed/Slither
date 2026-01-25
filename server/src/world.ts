export type Orb = {
  id: number;
  x: number;
  y: number;
};

export type Player = {
  id: number;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  speed: number;
  length: number;
};

export type World = {
  tick: number;
  orbs: Orb[];
  players: Player[];
};

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
        speed: 120,
        length: 16,
      },
    ],
  };
}
