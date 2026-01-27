import type { Point } from "../types/game.js";

export const TAU = Math.PI * 2;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function wrapAngle(angle: number): number {
  let wrapped = angle;
  while (wrapped > Math.PI) {
    wrapped -= TAU;
  }
  while (wrapped < -Math.PI) {
    wrapped += TAU;
  }
  return wrapped;
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomPointInCircle(radius: number): Point {
  const t = Math.random() * TAU;
  const r = Math.sqrt(Math.random()) * radius;
  return { x: Math.cos(t) * r, y: Math.sin(t) * r };
}

export function distanceSq(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function pointToSegmentDistanceSq(point: Point, a: Point, b: Point): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = point.x - a.x;
  const apy = point.y - a.y;
  const abLenSq = abx * abx + aby * aby;

  if (abLenSq === 0) {
    return distanceSq(point, a);
  }

  const t = clamp((apx * abx + apy * aby) / abLenSq, 0, 1);
  const closest = { x: a.x + abx * t, y: a.y + aby * t };
  return distanceSq(point, closest);
}
