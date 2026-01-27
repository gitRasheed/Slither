import { setSnapshot } from "./state";
import type { WorldSnapshot } from "../../shared/types";

export type Network = {
  socket: WebSocket;
  sendIntent: (dirX: number, dirY: number) => void;
};

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isWorldSnapshot = (value: unknown): value is WorldSnapshot => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const snapshot = value as WorldSnapshot;
  return (
    isNumber(snapshot.tick) &&
    Array.isArray(snapshot.players) &&
    Array.isArray(snapshot.orbs) &&
    (snapshot.localPlayerId === undefined || isNumber(snapshot.localPlayerId))
  );
};

export function connect(url: string): Network {
  const socket = new WebSocket(url);

  socket.addEventListener("message", (event) => {
    if (typeof event.data !== "string") {
      return;
    }

    let message: unknown;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }

    if (!isWorldSnapshot(message)) {
      return;
    }

    setSnapshot(message);
  });

  const sendIntent = (dirX: number, dirY: number) => {
    if (socket.readyState !== WebSocket.OPEN) {
      console.log(`[network] Send failed. ReadyState: ${socket.readyState}.`);
      return;
    }

    const payload = {
      type: "set_direction",
      payload: { dirX, dirY },
    };

    console.log(`[client] sending intent: ${dirX.toFixed(2)}, ${dirY.toFixed(2)}`);
    socket.send(JSON.stringify(payload));
  };

  return { socket, sendIntent };
}
