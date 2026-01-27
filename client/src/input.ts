type InputOptions = {
  canvas: HTMLCanvasElement;
  sendIntent: (dirX: number, dirY: number) => void;
  getSnapshot: () => { players: { id: number; x: number; y: number }[] } | null;
  getLocalPlayerId: () => number | null;
  getViewport: () => { width: number; height: number };
};

const minAngleDelta = (2 * Math.PI) / 180;
const minIntervalMs = 50;
const minVectorLength = 2;
const invertInput = true;

const wrapAngle = (angle: number): number => {
  if (angle > Math.PI) {
    return angle - Math.PI * 2;
  }
  if (angle < -Math.PI) {
    return angle + Math.PI * 2;
  }
  return angle;
};

const getFocusPlayer = (
  snapshot: { players: { id: number; x: number; y: number }[] },
  localPlayerId: number | null
) => {
  if (snapshot.players.length === 0) {
    return null;
  }

  if (localPlayerId !== null) {
    const match = snapshot.players.find((player) => player.id === localPlayerId);
    if (match) {
      return match;
    }
  }

  return snapshot.players[0];
};

export function startInput({
  canvas,
  sendIntent,
  getSnapshot,
  getLocalPlayerId,
  getViewport,
}: InputOptions): void {
  let lastAngle: number | null = null;
  let lastSentAt = 0;
  let logCounter = 0;

  const handleMove = (event: MouseEvent) => {
    logCounter += 1;
    const shouldLog = logCounter % 60 === 0;

    if (shouldLog) {
      console.log("Input: mousemove");
    }

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const snapshot = getSnapshot();
    const localPlayerId = getLocalPlayerId();
    if (!snapshot) {
      return;
    }

    const focusPlayer = getFocusPlayer(snapshot, localPlayerId);
    if (!focusPlayer) {
      return;
    }

    const viewport = getViewport();
    const worldMouseX = x - viewport.width / 2 + focusPlayer.x;
    const worldMouseY = y - viewport.height / 2 + focusPlayer.y;
    const rawDx = worldMouseX - focusPlayer.x;
    const rawDy = worldMouseY - focusPlayer.y;
    const dx = invertInput ? -rawDx : rawDx;
    const dy = invertInput ? -rawDy : rawDy;
    const length = Math.hypot(dx, dy);

    if (shouldLog) {
      console.log(`Input: math dx=${dx} dy=${dy} length=${length}`);
    }

    if (!Number.isFinite(length) || length < minVectorLength) {
      if (shouldLog) {
        console.log("Input: Vector too short");
      }
      return;
    }

    const angle = Math.atan2(dy, dx);
    const now = performance.now();
    const angleDelta =
      lastAngle === null ? Number.POSITIVE_INFINITY : Math.abs(wrapAngle(angle - lastAngle));
    const timeSinceLast = now - lastSentAt;

    if (shouldLog) {
      console.log(
        `Input: throttle angleDelta=${angleDelta} minAngleDelta=${minAngleDelta} timeSinceLast=${timeSinceLast} minIntervalMs=${minIntervalMs}`
      );
    }

    if (angleDelta >= minAngleDelta || timeSinceLast >= minIntervalMs) {
      console.log("Input: Sending intent...");
      sendIntent(dx / length, dy / length);
      lastAngle = angle;
      lastSentAt = now;
    }
  };

  window.addEventListener("mousemove", handleMove);
}
