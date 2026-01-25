type InputOptions = {
  canvas: HTMLCanvasElement;
  sendIntent: (dirX: number, dirY: number) => void;
};

const minAngleDelta = (2 * Math.PI) / 180;
const minIntervalMs = 50;
const minVectorLength = 2;

const wrapAngle = (angle: number): number => {
  if (angle > Math.PI) {
    return angle - Math.PI * 2;
  }
  if (angle < -Math.PI) {
    return angle + Math.PI * 2;
  }
  return angle;
};

export function startInput({ canvas, sendIntent }: InputOptions): void {
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
    const dx = x - rect.width / 2;
    const dy = y - rect.height / 2;
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
