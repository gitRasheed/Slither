import { sendBoost, sendMove } from "../net/socket";
import { getCanvas } from "../render/canvas";

const MIN_ANGLE_DELTA = 0.01;
const INPUT_RATE = 30;
const MIN_INTERVAL_MS = 1000 / INPUT_RATE;

const keyDirections = new Map<string, { x: number; y: number }>([
  ["ArrowUp", { x: 0, y: -1 }],
  ["ArrowDown", { x: 0, y: 1 }],
  ["ArrowLeft", { x: -1, y: 0 }],
  ["ArrowRight", { x: 1, y: 0 }],
]);

let lastAngle: number | null = null;
let lastSentAt = 0;
let boostActive = false;
const pressedKeys = new Set<string>();

export function initInput(): void {
  const canvas = getCanvas();
  if (!canvas) {
    throw new Error("Canvas not initialized.");
  }

  const onMouseMove = (event: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const dx = x - centerX;
    const dy = y - centerY;
    sendAngleFromVector(dx, dy);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.code === "Space") {
      event.preventDefault();
      if (!boostActive) {
        boostActive = true;
        sendBoost(true);
      }
      return;
    }

    if (keyDirections.has(event.key)) {
      event.preventDefault();
      pressedKeys.add(event.key);
      const vector = getKeyboardVector();
      if (vector) {
        sendAngleFromVector(vector.x, vector.y);
      }
    }
  };

  const onKeyUp = (event: KeyboardEvent) => {
    if (event.code === "Space") {
      event.preventDefault();
      if (boostActive) {
        boostActive = false;
        sendBoost(false);
      }
      return;
    }

    if (keyDirections.has(event.key)) {
      event.preventDefault();
      pressedKeys.delete(event.key);
      const vector = getKeyboardVector();
      if (vector) {
        sendAngleFromVector(vector.x, vector.y);
      }
    }
  };

  canvas.addEventListener("mousemove", onMouseMove);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  setInterval(() => {
    const vector = getKeyboardVector();
    if (!vector) {
      return;
    }
    sendAngleFromVector(vector.x, vector.y);
  }, MIN_INTERVAL_MS);
}

export function getCurrentAngle(): number {
  return lastAngle ?? 0;
}

function sendAngleFromVector(dx: number, dy: number): void {
  const length = Math.hypot(dx, dy);
  if (!Number.isFinite(length) || length === 0) {
    return;
  }

  const angle = Math.atan2(dy, dx);
  const now = performance.now();
  if (lastAngle !== null) {
    const delta = Math.abs(wrapAngle(angle - lastAngle));
    if (delta < MIN_ANGLE_DELTA) {
      return;
    }
  }

  if (now - lastSentAt < MIN_INTERVAL_MS) {
    return;
  }

  lastAngle = angle;
  lastSentAt = now;
  sendMove(angle);
}

function getKeyboardVector(): { x: number; y: number } | null {
  if (pressedKeys.size === 0) {
    return null;
  }

  let x = 0;
  let y = 0;
  for (const key of pressedKeys) {
    const vector = keyDirections.get(key);
    if (vector) {
      x += vector.x;
      y += vector.y;
    }
  }

  const length = Math.hypot(x, y);
  if (length === 0) {
    return null;
  }

  return { x: x / length, y: y / length };
}

function wrapAngle(angle: number): number {
  if (angle > Math.PI) {
    return angle - Math.PI * 2;
  }
  if (angle < -Math.PI) {
    return angle + Math.PI * 2;
  }
  return angle;
}
