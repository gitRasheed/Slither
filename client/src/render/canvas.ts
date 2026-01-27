import type { BufferedState } from "../game/state";
import { getSnakeId } from "../game/state";
import type { SnakeView } from "../types/messages";

export type Viewport = {
  width: number;
  height: number;
  dpr: number;
};

const ZOOM = 1.0;
const FOOD_RADIUS = 4;
const SNAKE_WIDTH = 18;
const HEAD_RADIUS = 12;
const ARENA_RADIUS = 2000;
const WALL_WIDTH = 3;

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
  ctx.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);
  ctx.fillStyle = colors.hud;
  ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  ctx.textBaseline = "top";
  ctx.fillText(`time ${Math.round(state.time)}`, 12, 12);

  if (localId) {
    ctx.fillStyle = colors.hudMuted;
    ctx.fillText(`player ${localId.slice(0, 8)}`, 12, 30);
  }
}
