import type { BufferedState } from "../game/state";
import type { SnakeView } from "../types/messages";
import { ARENA_RADIUS } from "./constants";

let canvas: HTMLCanvasElement | null = null;
let context: CanvasRenderingContext2D | null = null;
let dpr = 1;
let width = 0;
let height = 0;
let container: HTMLElement | null = null;

const RADAR_PADDING = 10;

export function initRadar(): void {
  canvas = document.getElementById("radar") as HTMLCanvasElement | null;
  container = document.getElementById("radar-container");
  if (!canvas) {
    throw new Error("Radar canvas not found.");
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Radar 2D context not available.");
  }
  context = ctx;
  resizeRadar();
  window.addEventListener("resize", resizeRadar);
}

export function setRadarVisible(visible: boolean): void {
  if (!container) {
    return;
  }
  container.setAttribute("data-visible", visible ? "true" : "false");
}

export function resizeRadar(): void {
  if (!canvas) {
    return;
  }
  const rect = canvas.getBoundingClientRect();
  dpr = window.devicePixelRatio || 1;
  width = Math.max(1, Math.floor(rect.width));
  height = Math.max(1, Math.floor(rect.height));
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
}

export function renderRadar(state: BufferedState, localId?: string): void {
  if (!canvas || !context) {
    return;
  }

  const ctx = context;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const size = Math.min(width, height);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.max(0, size / 2 - RADAR_PADDING);
  const scale = ARENA_RADIUS > 0 ? radius / ARENA_RADIUS : 0;

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.strokeStyle = "rgba(148, 163, 184, 0.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();

  for (const snake of state.snakes) {
    drawRadarSnake(ctx, snake, scale, centerX, centerY, snake.id === localId);
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function drawRadarSnake(
  ctx: CanvasRenderingContext2D,
  snake: SnakeView,
  scale: number,
  centerX: number,
  centerY: number,
  isLocal: boolean
): void {
  if (snake.segments.length === 0 || scale <= 0) {
    return;
  }

  const lengthFactor = Math.min(3.5, Math.max(1, snake.segments.length / 35));

  if (isLocal) {
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = "rgba(248, 250, 252, 0.9)";
    ctx.lineWidth = lengthFactor + 1.5;
    drawRadarPath(ctx, snake, scale, centerX, centerY);
  }

  ctx.globalAlpha = isLocal ? 1 : 0.6;
  ctx.strokeStyle = snake.color;
  ctx.lineWidth = lengthFactor;
  drawRadarPath(ctx, snake, scale, centerX, centerY);
  ctx.globalAlpha = 1;
}

function drawRadarPath(
  ctx: CanvasRenderingContext2D,
  snake: SnakeView,
  scale: number,
  centerX: number,
  centerY: number
): void {
  ctx.beginPath();
  for (let i = 0; i < snake.segments.length; i += 1) {
    const segment = snake.segments[i];
    const x = centerX + segment.x * scale;
    const y = centerY + segment.y * scale;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}
