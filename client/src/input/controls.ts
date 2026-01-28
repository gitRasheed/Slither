import { sendBoost, sendMove } from "../net/socket";
import { getCanvas } from "../render/canvas";

const MIN_ANGLE_DELTA = 0.01;
const INPUT_RATE = 30;
const MIN_INTERVAL_MS = 1000 / INPUT_RATE;
const JOYSTICK_DEADZONE = 0.15;

const keyDirections = new Map<string, { x: number; y: number }>([
  ["ArrowUp", { x: 0, y: -1 }],
  ["ArrowDown", { x: 0, y: 1 }],
  ["ArrowLeft", { x: -1, y: 0 }],
  ["ArrowRight", { x: 1, y: 0 }],
]);

let lastAngle: number | null = null;
let lastSentAt = 0;
let boostActive = false;
let boostKeyActive = false;
let boostMouseActive = false;
let boostTouchActive = false;
const pressedKeys = new Set<string>();
let inputEnabled = false;
let intervalId: number | null = null;
let listenersAttached = false;
let cachedCanvas: HTMLCanvasElement | null = null;
let joystickVector: { x: number; y: number } | null = null;
let joystickPointerId: number | null = null;
let joystickCenter = { x: 0, y: 0 };
let joystickRadius = 0;
let joystickThumb: HTMLElement | null = null;
let touchControls: HTMLElement | null = null;
let boostButton: HTMLButtonElement | null = null;
let touchEnabled = false;

export function initInput(): void {
  if (listenersAttached) {
    return;
  }

  const canvas = getCanvas();
  if (!canvas) {
    throw new Error("Canvas not initialized.");
  }
  cachedCanvas = canvas;

  initTouchControls();

  const onMouseMove = (event: MouseEvent) => {
    if (!inputEnabled) {
      return;
    }
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
    if (!inputEnabled) {
      return;
    }
    if (event.code === "Space") {
      event.preventDefault();
      boostKeyActive = true;
      updateBoostState();
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
    if (!inputEnabled) {
      return;
    }
    if (event.code === "Space") {
      event.preventDefault();
      boostKeyActive = false;
      updateBoostState();
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

  const onMouseDown = (event: MouseEvent) => {
    if (!inputEnabled) {
      return;
    }
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    boostMouseActive = true;
    updateBoostState();
  };

  const onMouseUp = (event: MouseEvent) => {
    if (event.button !== 0) {
      return;
    }
    boostMouseActive = false;
    updateBoostState();
  };

  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mousedown", onMouseDown);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("mouseup", onMouseUp);
  listenersAttached = true;
}

export function enableInput(): void {
  if (!cachedCanvas) {
    initInput();
  }
  if (inputEnabled) {
    return;
  }
  inputEnabled = true;
  if (intervalId !== null) {
    return;
  }
  intervalId = window.setInterval(() => {
    if (!inputEnabled) {
      return;
    }
    const vector = joystickVector ?? getKeyboardVector();
    if (!vector) {
      return;
    }
    sendAngleFromVector(vector.x, vector.y);
  }, MIN_INTERVAL_MS);
}

export function disableInput(): void {
  if (!inputEnabled && intervalId === null) {
    return;
  }
  if (boostActive) {
    sendBoost(false);
  }
  inputEnabled = false;
  lastAngle = null;
  lastSentAt = 0;
  pressedKeys.clear();
  boostActive = false;
  boostKeyActive = false;
  boostMouseActive = false;
  boostTouchActive = false;
  joystickVector = null;
  joystickPointerId = null;
  resetJoystickThumb();
  if (intervalId !== null) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
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

function updateBoostState(): void {
  if (!inputEnabled) {
    return;
  }
  const nextActive = boostKeyActive || boostMouseActive || boostTouchActive;
  if (nextActive === boostActive) {
    return;
  }
  boostActive = nextActive;
  sendBoost(boostActive);
}

export function setTouchControlsVisible(visible: boolean): void {
  if (!touchEnabled || !touchControls) {
    return;
  }
  touchControls.setAttribute("data-visible", visible ? "true" : "false");
}

function initTouchControls(): void {
  if (touchEnabled) {
    return;
  }

  const supportsTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  if (!supportsTouch) {
    return;
  }

  document.body.dataset.touch = "true";
  touchControls = document.getElementById("touch-controls");
  const joystick = document.getElementById("touch-joystick");
  joystickThumb = document.getElementById("touch-joystick-thumb");
  boostButton = document.getElementById("touch-boost") as HTMLButtonElement | null;

  if (!touchControls || !joystick || !joystickThumb || !boostButton) {
    return;
  }

  touchEnabled = true;

  const onJoystickDown = (event: PointerEvent) => {
    if (!inputEnabled) {
      return;
    }
    if (event.pointerType === "mouse") {
      return;
    }
    event.preventDefault();
    joystickPointerId = event.pointerId;
    joystick.setPointerCapture(event.pointerId);
    const rect = joystick.getBoundingClientRect();
    joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    joystickRadius = rect.width / 2;
    updateJoystickFromPointer(event.clientX, event.clientY);
  };

  const onJoystickMove = (event: PointerEvent) => {
    if (event.pointerId !== joystickPointerId) {
      return;
    }
    if (!inputEnabled) {
      return;
    }
    event.preventDefault();
    updateJoystickFromPointer(event.clientX, event.clientY);
  };

  const onJoystickUp = (event: PointerEvent) => {
    if (event.pointerId !== joystickPointerId) {
      return;
    }
    joystickPointerId = null;
    joystick.releasePointerCapture(event.pointerId);
    joystickVector = null;
    resetJoystickThumb();
  };

  const onBoostDown = (event: PointerEvent) => {
    if (!inputEnabled) {
      return;
    }
    if (event.pointerType === "mouse") {
      return;
    }
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    boostTouchActive = true;
    updateBoostState();
  };

  const onBoostUp = (event: PointerEvent) => {
    if (event.pointerType === "mouse") {
      return;
    }
    boostTouchActive = false;
    updateBoostState();
  };

  joystick.addEventListener("pointerdown", onJoystickDown);
  joystick.addEventListener("pointermove", onJoystickMove);
  joystick.addEventListener("pointerup", onJoystickUp);
  joystick.addEventListener("pointercancel", onJoystickUp);
  boostButton.addEventListener("pointerdown", onBoostDown);
  boostButton.addEventListener("pointerup", onBoostUp);
  boostButton.addEventListener("pointercancel", onBoostUp);
}

function updateJoystickFromPointer(x: number, y: number): void {
  const dx = x - joystickCenter.x;
  const dy = y - joystickCenter.y;
  const distance = Math.hypot(dx, dy);
  const maxRadius = Math.max(1, joystickRadius);
  const clamped = distance > maxRadius ? maxRadius / distance : 1;
  const clampedDx = dx * clamped;
  const clampedDy = dy * clamped;

  if (joystickThumb) {
    joystickThumb.style.setProperty("--joy-x", `${clampedDx}px`);
    joystickThumb.style.setProperty("--joy-y", `${clampedDy}px`);
  }

  const normalizedLength = distance / maxRadius;
  if (normalizedLength <= JOYSTICK_DEADZONE) {
    joystickVector = null;
    return;
  }

  const length = Math.hypot(clampedDx, clampedDy);
  if (length <= 0.0001) {
    joystickVector = null;
    return;
  }

  joystickVector = { x: clampedDx / length, y: clampedDy / length };
  if (inputEnabled) {
    sendAngleFromVector(joystickVector.x, joystickVector.y);
  }
}

function resetJoystickThumb(): void {
  if (!joystickThumb) {
    return;
  }
  joystickThumb.style.setProperty("--joy-x", "0px");
  joystickThumb.style.setProperty("--joy-y", "0px");
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
