import http from "node:http";
import { URL } from "node:url";

type Sample = {
  t: number;
  value: number;
};

type Stats = {
  count: number;
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
};

type WorldCounts = {
  players: number;
  snakes: number;
  foods: number;
};

const WINDOW_SECONDS = 30;
const SAMPLE_RETENTION_MS = WINDOW_SECONDS * 1000 * 3;
const LAG_INTERVAL_MS = 100;

const tickDurations: Sample[] = [];
const tickDrifts: Sample[] = [];
const eventLoopLags: Sample[] = [];

let lastTickAtMs: number | null = null;
let lastTickDurationMs = 0;
let lastTickIntervalMs = 0;
let lastTickDriftMs = 0;
let lastEventLoopLagMs = 0;
let tickOverruns = 0;
let totalTicks = 0;

let lastWorldCounts: WorldCounts = { players: 0, snakes: 0, foods: 0 };

class RollingCounter {
  private buckets: { sec: number; count: number }[];
  private size: number;
  total = 0;

  constructor(windowSeconds: number) {
    this.size = windowSeconds + 2;
    this.buckets = Array.from({ length: this.size }, () => ({ sec: -1, count: 0 }));
  }

  add(count: number, nowMs = Date.now()): void {
    const sec = Math.floor(nowMs / 1000);
    const index = sec % this.size;
    const bucket = this.buckets[index];
    if (bucket.sec !== sec) {
      bucket.sec = sec;
      bucket.count = 0;
    }
    bucket.count += count;
    this.total += count;
  }

  sum(windowSeconds: number, nowMs = Date.now()): number {
    const currentSec = Math.floor(nowMs / 1000);
    let total = 0;
    for (let i = 0; i < windowSeconds; i += 1) {
      const sec = currentSec - i;
      const bucket = this.buckets[sec % this.size];
      if (bucket.sec === sec) {
        total += bucket.count;
      }
    }
    return total;
  }
}

const messageInCounter = new RollingCounter(WINDOW_SECONDS);
const messageOutCounter = new RollingCounter(WINDOW_SECONDS);
const bytesInCounter = new RollingCounter(WINDOW_SECONDS);
const bytesOutCounter = new RollingCounter(WINDOW_SECONDS);
const backpressureCounter = new RollingCounter(WINDOW_SECONDS);

let eventLoopTimer: NodeJS.Timeout | null = null;
let metricsServer: http.Server | null = null;

export function resetMetrics(): void {
  tickDurations.length = 0;
  tickDrifts.length = 0;
  eventLoopLags.length = 0;
  lastTickAtMs = null;
  lastTickDurationMs = 0;
  lastTickIntervalMs = 0;
  lastTickDriftMs = 0;
  lastEventLoopLagMs = 0;
  tickOverruns = 0;
  totalTicks = 0;
  lastWorldCounts = { players: 0, snakes: 0, foods: 0 };
  messageInCounter.total = 0;
  messageOutCounter.total = 0;
  bytesInCounter.total = 0;
  bytesOutCounter.total = 0;
  backpressureCounter.total = 0;
}

export function recordTick(
  durationMs: number,
  expectedIntervalMs: number,
  nowMs = Date.now()
): void {
  totalTicks += 1;
  lastTickDurationMs = durationMs;

  if (lastTickAtMs !== null) {
    const intervalMs = nowMs - lastTickAtMs;
    lastTickIntervalMs = intervalMs;
    lastTickDriftMs = intervalMs - expectedIntervalMs;
    tickDrifts.push({ t: nowMs, value: lastTickDriftMs });
  }

  if (durationMs > expectedIntervalMs) {
    tickOverruns += 1;
  }

  tickDurations.push({ t: nowMs, value: durationMs });
  lastTickAtMs = nowMs;
  pruneSamples(tickDurations, nowMs);
  pruneSamples(tickDrifts, nowMs);
}

export function recordWorldSize(players: number, snakes: number, foods: number): void {
  lastWorldCounts = { players, snakes, foods };
}

export function recordMessageIn(bytes: number, nowMs = Date.now()): void {
  messageInCounter.add(1, nowMs);
  bytesInCounter.add(bytes, nowMs);
}

export function recordMessageOut(bytes: number, nowMs = Date.now()): void {
  messageOutCounter.add(1, nowMs);
  bytesOutCounter.add(bytes, nowMs);
}

export function recordBackpressureDrop(nowMs = Date.now()): void {
  backpressureCounter.add(1, nowMs);
}

export function startMetricsServer(options: { port?: number; host?: string } = {}): http.Server {
  if (metricsServer && metricsServer.listening) {
    return metricsServer;
  }
  if (metricsServer && !metricsServer.listening) {
    metricsServer = null;
  }

  startEventLoopMonitor();
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 1990;

  metricsServer = http.createServer((req, res) => {
    if (!req.url) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "missing url" }));
      return;
    }

    const url = new URL(req.url, `http://${host}:${port}`);
    if (url.pathname !== "/metrics") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "not found" }));
      return;
    }

    const mode = url.searchParams.get("mode") === "instant" ? "instant" : "window";
    const snapshot = getMetricsSnapshot(mode);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(snapshot));
  });

  metricsServer.listen(port, host);
  return metricsServer;
}

export async function stopMetricsServer(): Promise<void> {
  if (eventLoopTimer) {
    clearInterval(eventLoopTimer);
    eventLoopTimer = null;
  }

  if (!metricsServer) {
    return;
  }

  if (!metricsServer.listening) {
    metricsServer = null;
    return;
  }

  await new Promise<void>((resolve) => {
    metricsServer?.close(() => resolve());
  });
  metricsServer = null;
}

export function getMetricsSnapshot(mode: "window" | "instant" = "window") {
  const nowMs = Date.now();
  const windowMs = WINDOW_SECONDS * 1000;

  const tickStats = summarize(getValuesWithin(tickDurations, nowMs - windowMs));
  const driftStats = summarize(getValuesWithin(tickDrifts, nowMs - windowMs));
  const lagStats = summarize(getValuesWithin(eventLoopLags, nowMs - windowMs));

  const messagesInWindow = messageInCounter.sum(WINDOW_SECONDS, nowMs);
  const messagesOutWindow = messageOutCounter.sum(WINDOW_SECONDS, nowMs);
  const bytesInWindow = bytesInCounter.sum(WINDOW_SECONDS, nowMs);
  const bytesOutWindow = bytesOutCounter.sum(WINDOW_SECONDS, nowMs);
  const backpressureWindow = backpressureCounter.sum(WINDOW_SECONDS, nowMs);

  const perSecond = (value: number) => (WINDOW_SECONDS > 0 ? value / WINDOW_SECONDS : 0);

  const snapshot = {
    mode,
    time: new Date(nowMs).toISOString(),
    windowSeconds: WINDOW_SECONDS,
    uptimeSeconds: Math.round(process.uptime()),
    tick: {
      total: totalTicks,
      lastDurationMs: round(lastTickDurationMs, 3),
      lastIntervalMs: round(lastTickIntervalMs, 3),
      lastDriftMs: round(lastTickDriftMs, 3),
      overruns: {
        count: tickOverruns,
        perSecond: round(perSecond(tickOverruns), 4),
      },
      durationMs: tickStats,
      driftMs: driftStats,
    },
    eventLoopLagMs: {
      last: round(lastEventLoopLagMs, 3),
      stats: lagStats,
    },
    ws: {
      inbound: {
        messages: messagesInWindow,
        bytes: bytesInWindow,
        messagesPerSecond: round(perSecond(messagesInWindow), 4),
        bytesPerSecond: round(perSecond(bytesInWindow), 2),
        totalMessages: messageInCounter.total,
        totalBytes: bytesInCounter.total,
      },
      outbound: {
        messages: messagesOutWindow,
        bytes: bytesOutWindow,
        messagesPerSecond: round(perSecond(messagesOutWindow), 4),
        bytesPerSecond: round(perSecond(bytesOutWindow), 2),
        totalMessages: messageOutCounter.total,
        totalBytes: bytesOutCounter.total,
      },
      backpressureDrops: {
        count: backpressureWindow,
        perSecond: round(perSecond(backpressureWindow), 4),
        total: backpressureCounter.total,
      },
    },
    world: lastWorldCounts,
    memory: formatMemory(process.memoryUsage()),
  };

  return snapshot;
}

function startEventLoopMonitor(): void {
  if (eventLoopTimer) {
    return;
  }

  let expected = Date.now() + LAG_INTERVAL_MS;
  eventLoopTimer = setInterval(() => {
    const now = Date.now();
    const lag = Math.max(0, now - expected);
    expected = now + LAG_INTERVAL_MS;
    lastEventLoopLagMs = lag;
    eventLoopLags.push({ t: now, value: lag });
    pruneSamples(eventLoopLags, now);
  }, LAG_INTERVAL_MS);
}

function pruneSamples(samples: Sample[], nowMs: number): void {
  const cutoff = nowMs - SAMPLE_RETENTION_MS;
  while (samples.length > 0 && samples[0].t < cutoff) {
    samples.shift();
  }
}

function getValuesWithin(samples: Sample[], cutoffMs: number): number[] {
  const values: number[] = [];
  for (const sample of samples) {
    if (sample.t >= cutoffMs) {
      values.push(sample.value);
    }
  }
  return values;
}

function summarize(values: number[]): Stats | null {
  const count = values.length;
  if (count === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, value) => acc + value, 0);
  const avg = sum / count;
  return {
    count,
    avg: round(avg, 4),
    min: round(sorted[0], 4),
    max: round(sorted[count - 1], 4),
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  const index = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p));
  return round(sorted[index], 4);
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatMemory(memory: NodeJS.MemoryUsage) {
  return {
    rss: memory.rss,
    heapUsed: memory.heapUsed,
    heapTotal: memory.heapTotal,
    external: memory.external,
  };
}
