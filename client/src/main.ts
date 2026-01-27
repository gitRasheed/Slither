import { initInput } from "./input/controls";
import { connect, handlers } from "./net/socket";
import { initCanvas, drawFrame } from "./render/canvas";
import { getInterpolatedState, pushState, setPlayerId, setSnakeId } from "./game/state";

const wsProtocol = location.protocol === "https:" ? "wss" : "ws";
const defaultWsUrl = `${wsProtocol}://${location.hostname}:8080`;
const wsUrl = import.meta.env.VITE_WS_URL ?? defaultWsUrl;

handlers.onStateMessage = (message) => {
  pushState(message, performance.now());
};

handlers.onJoinAckMessage = (message) => {
  setPlayerId(message.playerId);
  setSnakeId(message.snakeId);
};

handlers.onDeathMessage = (message) => {
  if (message.killerId) {
    console.log(`[client] killed by ${message.killerId}`);
  } else {
    console.log("[client] died");
  }
};

connect(wsUrl);
initCanvas();
initInput();

const loop = () => {
  const state = getInterpolatedState(performance.now());
  if (state) {
    drawFrame(state);
  }
  requestAnimationFrame(loop);
};

requestAnimationFrame(loop);
