import type { WorldSnapshot } from "../../shared/types";

export type { PlayerSnapshot, OrbSnapshot, WorldSnapshot } from "../../shared/types";

export const state = {
  latestSnapshot: null as WorldSnapshot | null,
  localPlayerId: null as number | null,
};

export function setSnapshot(snapshot: WorldSnapshot): void {
  state.latestSnapshot = snapshot;
  if (typeof snapshot.localPlayerId === "number") {
    state.localPlayerId = snapshot.localPlayerId;
  }
}
