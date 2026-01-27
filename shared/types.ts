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
  targetDirX: number;
  targetDirY: number;
  speed: number;
  length: number;
};

export type World = {
  tick: number;
  orbs: Orb[];
  players: Player[];
};

export type PlayerSnapshot = {
  id: number;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  targetDirX: number;
  targetDirY: number;
  length: number;
};

export type OrbSnapshot = {
  id: number;
  x: number;
  y: number;
};

export type WorldSnapshot = {
  tick: number;
  players: PlayerSnapshot[];
  orbs: OrbSnapshot[];
  localPlayerId?: number;
};
