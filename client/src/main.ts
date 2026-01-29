import {
  disableInput,
  enableInput,
  initInput,
  setTouchControlsVisible,
} from "./input/controls";
import { getPhase, getUsername, setPhase, setUsername } from "./game/phase";
import {
  getInterpolatedState,
  getLatestState,
  getSnakeId,
  pushFoods,
  pushState,
  resetStateBuffer,
  setEliminations,
  setPlayerId,
  setSnakeId,
} from "./game/state";
import { connect, handlers, sendJoin } from "./net/socket";
import { initCanvas, drawFrame } from "./render/canvas";
import { initRadar, renderRadar, setRadarVisible } from "./render/radar";
import {
  initLeaderboard,
  setLeaderboardVisible,
  updateLeaderboard,
} from "./ui/leaderboard";
import {
  initOverlays,
  setDeathStats,
  setDeathVisible,
  setRespawnEnabled,
  setSignupError,
  setSignupName,
  setSignupVisible,
} from "./ui/overlays";

const wsProtocol = location.protocol === "https:" ? "wss" : "ws";
const defaultWsUrl = `${wsProtocol}://${location.hostname}:8080`;
const wsUrl = import.meta.env.VITE_WS_URL ?? defaultWsUrl;

let renderHandle: number | null = null;
let joinInFlight = false;

const startRenderLoop = (): void => {
  if (renderHandle !== null) {
    return;
  }

  const loop = () => {
    if (getPhase() !== "playing") {
      renderHandle = null;
      return;
    }
    const state = getInterpolatedState(performance.now());
    if (state) {
      drawFrame(state);
      renderRadar(state, getSnakeId());
    }
    renderHandle = requestAnimationFrame(loop);
  };

  renderHandle = requestAnimationFrame(loop);
};

const stopRenderLoop = (): void => {
  if (renderHandle === null) {
    return;
  }
  cancelAnimationFrame(renderHandle);
  renderHandle = null;
};

const startPlaying = (): void => {
  setPhase("playing");
  setSignupVisible(false);
  setDeathVisible(false);
  setRespawnEnabled(true);
  setLeaderboardVisible(true);
  setRadarVisible(true);
  setTouchControlsVisible(true);
  enableInput();
  startRenderLoop();
};

const stopPlaying = (): void => {
  disableInput();
  stopRenderLoop();
  setLeaderboardVisible(false);
  setRadarVisible(false);
  setTouchControlsVisible(false);
};

const getScoreFromLatestState = (): number => {
  const latest = getLatestState();
  if (!latest) {
    return 0;
  }
  const localId = getSnakeId();
  if (!localId) {
    return 0;
  }
  const snake = latest.snakes.find((entry) => entry.id === localId);
  return snake ? Math.floor(snake.length) : 0;
};

handlers.onStateMessage = (message) => {
  if (getPhase() !== "playing") {
    return;
  }
  pushState(message, performance.now());
  updateLeaderboard(message.snakes, getSnakeId());
};

handlers.onFoodsMessage = (message) => {
  if (getPhase() !== "playing") {
    return;
  }
  pushFoods(message);
};

handlers.onJoinAckMessage = (message) => {
  resetStateBuffer();
  setPlayerId(message.playerId);
  setSnakeId(message.snakeId);
  setEliminations(message.eliminations);
  joinInFlight = false;
  startPlaying();
};

handlers.onDeathMessage = (message) => {
  if (getPhase() !== "playing") {
    return;
  }
  stopPlaying();
  setPhase("dead");
  setDeathStats({
    score: getScoreFromLatestState(),
    killerId: message.killerId,
    killerName: message.killerName,
  });
  setDeathVisible(true);
  setRespawnEnabled(true);
};

handlers.onStatsMessage = (message) => {
  setEliminations(message.eliminations);
};

const requestJoin = async (name: string): Promise<void> => {
  if (joinInFlight) {
    return;
  }
  joinInFlight = true;
  try {
    await connect(wsUrl);
    sendJoin(name);
  } catch (error) {
    joinInFlight = false;
    setSignupVisible(true);
    setSignupError("Connection failed. Try again.", true);
  }
};

const handleSignup = (name: string): void => {
  setSignupError("", false);
  setUsername(name);
  setSignupVisible(false);
  setPhase("signup");
  void requestJoin(name);
};

const handleRespawn = (): void => {
  if (getPhase() !== "dead") {
    return;
  }
  const name = getUsername();
  if (!name) {
    setSignupVisible(true);
    return;
  }
  setRespawnEnabled(false);
  void requestJoin(name);
};

initCanvas();
initInput();
disableInput();
initOverlays({ onSubmitName: handleSignup, onRespawn: handleRespawn });
initLeaderboard();
initRadar();

setPhase("signup");
setSignupVisible(true);
setDeathVisible(false);
setLeaderboardVisible(false);
setRadarVisible(false);
setTouchControlsVisible(false);
const storedName = getUsername();
if (storedName) {
  setSignupName(storedName);
}
