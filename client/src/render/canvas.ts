import type { BufferedState } from "../game/state";
import { getEliminations, getSnakeId } from "../game/state";
import type { SnakeView } from "../types/messages";
import { ARENA_RADIUS, HEAD_RADIUS, ZOOM } from "./constants";

export type Viewport = {
  width: number;
  height: number;
  dpr: number;
};

const FOOD_RADIUS = 6;
const SNAKE_WIDTH = 8;
const WALL_WIDTH = 3;
const LABEL_FONT_LOCAL = 14;
const LABEL_FONT_OTHER = 12;
const LABEL_PADDING_X = 6;
const LABEL_PADDING_Y = 4;
const LABEL_GAP = 8;
const LABEL_RADIUS = 6;
const LABEL_CULL_MARGIN = 120;

const colors = {
  food: "#facc15",
  hud: "#e5e7eb",
  hudMuted: "#94a3b8",
  wall: "#f8fafc",
};

let canvas: HTMLCanvasElement | null = null;
let context: CanvasRenderingContext2D | null = null;
const viewport: Viewport = { width: 0, height: 0, dpr: 1 };

export function initCanvas(): void {
  const element = document.getElementById("game");
  if (!(element instanceof HTMLCanvasElement)) {
    throw new Error("Canvas element #game not found.");
  }

  const ctx = element.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2D context.");
  }

  canvas = element;
  context = ctx;
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
}

export function drawFrame(state: BufferedState): void {
  if (!canvas || !context) {
    return;
  }

  const ctx = context;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const scale = viewport.dpr * ZOOM;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  const focus = getFocusSnake(state.snakes, getSnakeId());

  ctx.save();
  ctx.translate(viewport.width / (2 * ZOOM), viewport.height / (2 * ZOOM));
  if (focus) {
    const head = focus.segments[0];
    if (head) {
      ctx.translate(-head.x, -head.y);
    }
  }

  drawArena(ctx);
  drawFoods(ctx, state);
  drawSnakes(ctx, state, focus?.id);
  drawLabels(ctx, state, focus ?? null, focus?.id ?? null);
  ctx.restore();

  drawHud(ctx, state, focus?.id ?? null);
}

export function getCanvas(): HTMLCanvasElement | null {
  return canvas;
}

export function getViewport(): Viewport {
  return viewport;
}

function resizeCanvas(): void {
  if (!canvas) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  viewport.width = Math.max(1, Math.floor(rect.width));
  viewport.height = Math.max(1, Math.floor(rect.height));
  viewport.dpr = window.devicePixelRatio || 1;

  canvas.width = Math.max(1, Math.floor(rect.width * viewport.dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * viewport.dpr));
}

function getFocusSnake(snakes: SnakeView[], playerId?: string): SnakeView | null {
  if (snakes.length === 0) {
    return null;
  }

  if (playerId) {
    const match = snakes.find((snake) => snake.id === playerId);
    if (match) {
      return match;
    }
  }

  return snakes[0];
}

function drawFoods(ctx: CanvasRenderingContext2D, state: BufferedState): void {
  ctx.fillStyle = colors.food;
  for (const food of state.foods) {
    ctx.beginPath();
    ctx.arc(food.position.x, food.position.y, FOOD_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawArena(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.strokeStyle = colors.wall;
  ctx.lineWidth = WALL_WIDTH;
  ctx.beginPath();
  ctx.arc(0, 0, ARENA_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawSnakes(
  ctx: CanvasRenderingContext2D,
  state: BufferedState,
  localId?: string | null
): void {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const snake of state.snakes) {
    if (snake.segments.length < 2) {
      continue;
    }

    ctx.strokeStyle = snake.color;
    ctx.lineWidth = SNAKE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(snake.segments[0].x, snake.segments[0].y);
    for (let i = 1; i < snake.segments.length; i += 1) {
      const segment = snake.segments[i];
      ctx.lineTo(segment.x, segment.y);
    }
    ctx.stroke();

    const head = snake.segments[0];
    ctx.fillStyle = snake.color;
    ctx.beginPath();
    ctx.arc(head.x, head.y, HEAD_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    drawGooglyEyes(ctx, head, snake.segments[1]);

    if (snake.isBoosting) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(head.x, head.y, HEAD_RADIUS + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (localId && snake.id === localId) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(head.x, head.y, HEAD_RADIUS + 10, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawHud(
  ctx: CanvasRenderingContext2D,
  state: BufferedState,
  localId: string | null
): void {
  const baseX = 12;
  const baseY = 12;
  const lineHeight = 18;
  ctx.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);
  ctx.fillStyle = colors.hud;
  ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  ctx.textBaseline = "top";
  ctx.fillText(`time ${Math.round(state.time)}`, baseX, baseY);

  if (localId) {
    ctx.fillStyle = colors.hudMuted;
    ctx.fillText(`player ${localId.slice(0, 8)}`, baseX, baseY + lineHeight);

    const localSnake = state.snakes.find((snake) => snake.id === localId);
    if (localSnake) {
      ctx.fillStyle = colors.hud;
      ctx.fillText(`your length: ${localSnake.segments.length}`, baseX, baseY + lineHeight * 2);
      ctx.fillText(`elims: ${getEliminations()}`, baseX, baseY + lineHeight * 3);
    }
  }
}

function drawGooglyEyes(
  ctx: CanvasRenderingContext2D,
  head: { x: number; y: number },
  neck?: { x: number; y: number }
): void {
  let forwardX = 1;
  let forwardY = 0;
  if (neck) {
    const dx = head.x - neck.x;
    const dy = head.y - neck.y;
    const length = Math.hypot(dx, dy);
    if (length > 0.0001) {
      forwardX = dx / length;
      forwardY = dy / length;
    }
  }

  const perpX = -forwardY;
  const perpY = forwardX;
  const eyeRadius = Math.max(1, HEAD_RADIUS * 0.46);
  const pupilRadius = Math.max(1, HEAD_RADIUS * 0.26);
  const eyeOffsetForward = HEAD_RADIUS * 0.35;
  const eyeSeparation = HEAD_RADIUS * 0.45;
  const pupilOffset = eyeRadius * 0.45;

  const leftEyeX = head.x + forwardX * eyeOffsetForward + perpX * eyeSeparation;
  const leftEyeY = head.y + forwardY * eyeOffsetForward + perpY * eyeSeparation;
  const rightEyeX = head.x + forwardX * eyeOffsetForward - perpX * eyeSeparation;
  const rightEyeY = head.y + forwardY * eyeOffsetForward - perpY * eyeSeparation;

  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.arc(leftEyeX, leftEyeY, eyeRadius, 0, Math.PI * 2);
  ctx.arc(rightEyeX, rightEyeY, eyeRadius, 0, Math.PI * 2);
  ctx.fill();

  const pupilDx = forwardX * pupilOffset;
  const pupilDy = forwardY * pupilOffset;

  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(leftEyeX + pupilDx, leftEyeY + pupilDy, pupilRadius, 0, Math.PI * 2);
  ctx.arc(rightEyeX + pupilDx, rightEyeY + pupilDy, pupilRadius, 0, Math.PI * 2);
  ctx.fill();
}

function drawLabels(
  ctx: CanvasRenderingContext2D,
  state: BufferedState,
  focus: SnakeView | null,
  localId: string | null
): void {
  const focusHead = focus?.segments[0];
  const viewHalfWidth = viewport.width / (2 * ZOOM);
  const viewHalfHeight = viewport.height / (2 * ZOOM);

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const snake of state.snakes) {
    const head = snake.segments[0];
    if (!head) {
      continue;
    }

    if (focusHead) {
      const dx = head.x - focusHead.x;
      const dy = head.y - focusHead.y;
      if (
        Math.abs(dx) > viewHalfWidth + LABEL_CULL_MARGIN ||
        Math.abs(dy) > viewHalfHeight + LABEL_CULL_MARGIN
      ) {
        continue;
      }
    }

    const displayName = snake.name.trim() || "anon";
    const isLocal = localId !== null && snake.id === localId;
    const fontSize = isLocal ? LABEL_FONT_LOCAL : LABEL_FONT_OTHER;
    ctx.font = `${fontSize}px Outfit, "Segoe UI", sans-serif`;

    const metrics = ctx.measureText(displayName);
    const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.8;
    const descent = metrics.actualBoundingBoxDescent || fontSize * 0.2;
    const textHeight = ascent + descent;
    const rectWidth = metrics.width + LABEL_PADDING_X * 2;
    const rectHeight = textHeight + LABEL_PADDING_Y * 2;
    const rectX = head.x - rectWidth / 2;
    const rectY = head.y - HEAD_RADIUS - rectHeight - LABEL_GAP;

    ctx.fillStyle = isLocal ? "rgba(15, 23, 42, 0.78)" : "rgba(8, 12, 20, 0.65)";
    drawRoundedRect(ctx, rectX, rectY, rectWidth, rectHeight, LABEL_RADIUS);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = isLocal ? "#f8fafc" : "#e2e8f0";
    ctx.fillText(displayName, head.x, rectY + rectHeight / 2);
  }

  ctx.restore();
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
