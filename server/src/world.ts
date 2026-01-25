export type Orb = {
  id: number;
  x: number;
  y: number;
};

export type World = {
  tick: number;
  orbs: Orb[];
};

export function createWorld(): World {
  return {
    tick: 0,
    orbs: [],
  };
}
