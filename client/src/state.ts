export type PlayerSnapshot = {
  id: number;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
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
};

export type ConnectionStatus = "connecting" | "open" | "closed" | "error";

export const state = {
  latestSnapshot: null as WorldSnapshot | null,
  localPlayerId: null as number | null,
  connectionStatus: "connecting" as ConnectionStatus,
};

export function setSnapshot(snapshot: WorldSnapshot): void {
  state.latestSnapshot = snapshot;
  if (state.localPlayerId === null && snapshot.players.length > 0) {
    state.localPlayerId = snapshot.players[0].id;
  }
}

export function setConnectionStatus(status: ConnectionStatus): void {
  state.connectionStatus = status;
}
