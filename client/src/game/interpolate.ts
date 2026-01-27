import type { Point, SnakeView } from "../types/messages";

export function interpolatePoint(p1: Point, p2: Point, alpha: number): Point {
  return {
    x: p1.x + (p2.x - p1.x) * alpha,
    y: p1.y + (p2.y - p1.y) * alpha,
  };
}

export function interpolateSnakes(
  a: SnakeView[],
  b: SnakeView[],
  alpha: number
): SnakeView[] {
  const mapA = new Map(a.map((snake) => [snake.id, snake]));
  const result: SnakeView[] = [];

  for (const snakeB of b) {
    const snakeA = mapA.get(snakeB.id);
    if (!snakeA) {
      result.push(snakeB);
      continue;
    }

    const segmentCount = Math.min(snakeA.segments.length, snakeB.segments.length);
    const segments: Point[] = [];

    for (let i = 0; i < segmentCount; i += 1) {
      segments.push(interpolatePoint(snakeA.segments[i], snakeB.segments[i], alpha));
    }

    if (snakeB.segments.length > segmentCount) {
      segments.push(...snakeB.segments.slice(segmentCount));
    }

    result.push({
      id: snakeB.id,
      segments,
      isBoosting: snakeB.isBoosting,
      color: snakeB.color,
    });
  }

  return result;
}
