import { WebSocket } from "ws";
import { mkdir, readFile, appendFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { startServer } from "../src/app.js";
import { pack, unpack } from "msgpackr";
import { resetMetrics } from "../src/metrics/index.js";

type Profile = {
  clients: number;
  moveRateHz: number;
  boostToggleRateHz: number;
  warmupSeconds: number;
  steadySeconds: number;
  seed: number;
};

type BenchConfig = {
  wsPort: number;
  metricsPort: number;
  profiles: Record<string, Profile>;
  order: string[];
};

type MetricsSnapshot = {
  time: string;
  windowSeconds: number;
  uptimeSeconds: number;
  tick: {
    lastDurationMs: number;
    lastIntervalMs: number;
    lastDriftMs: number;
    durationMs: Stats | null;
    driftMs: Stats | null;
  };
  eventLoopLagMs: {
    last: number;
    stats: Stats | null;
  };
  ws: {
    inbound: {
      messagesPerSecond: number;
      bytesPerSecond: number;
      messages: number;
      bytes: number;
    };
    outbound: {
      messagesPerSecond: number;
      bytesPerSecond: number;
      messages: number;
      bytes: number;
    };
    backpressureDrops: {
      count: number;
      perSecond: number;
    };
  };
  world: {
    players: number;
    snakes: number;
    foods: number;
  };
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
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

class BenchClient {
  private socket: WebSocket;
  private joinPromise: Promise<void>;
  private joinResolve?: () => void;
  private joined = false;
  private alive = false;
  private respawnPending = false;
  private moveTimer: NodeJS.Timeout | null = null;
  private boostTimer: NodeJS.Timeout | null = null;
  private angle = 0;
  private readonly rng: () => number;
  private readonly name: string;
  private readonly moveRateHz: number;
  private readonly boostToggleRateHz: number;

  constructor(
    url: string,
    name: string,
    rng: () => number,
    moveRateHz: number,
    boostToggleRateHz: number
  ) {
    this.socket = new WebSocket(url);
    this.rng = rng;
    this.name = name;
    this.moveRateHz = moveRateHz;
    this.boostToggleRateHz = boostToggleRateHz;
    this.joinPromise = new Promise((resolve) => {
      this.joinResolve = resolve;
    });

    this.socket.on("message", (data) => {
      let parsed: { type?: string } | null = null;
      try {
        parsed = unpack(data) as { type?: string };
      } catch {
        return;
      }
      if (!parsed) {
        return;
      }
      if (parsed.type === "join_ack") {
        this.joined = true;
        this.alive = true;
        this.respawnPending = false;
        this.joinResolve?.();
        return;
      }
      if (parsed.type === "dead") {
        this.alive = false;
        this.requestRespawn();
      }
    });
  }

  async connect(timeoutMs = 4000): Promise<void> {
    await waitForOpen(this.socket, timeoutMs);
    this.socket.send(pack({ v: 1, type: "join", name: this.name }));
    await withTimeout(this.joinPromise, timeoutMs, "Timed out waiting for join_ack");
  }

  private requestRespawn(): void {
    if (this.respawnPending) {
      return;
    }
    this.respawnPending = true;
    if (this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    this.socket.send(pack({ v: 1, type: "join", name: this.name }));
  }

  startSending(): void {
    if (!this.joined) {
      return;
    }

    const moveIntervalMs = Math.max(5, Math.floor(1000 / this.moveRateHz));
    this.moveTimer = setInterval(() => {
      if (!this.alive || this.socket.readyState !== WebSocket.OPEN) {
        return;
      }
      this.angle = wrapAngle(this.angle + (this.rng() - 0.5) * 0.6);
      this.socket.send(pack({ v: 1, type: "move", angle: this.angle }));
    }, moveIntervalMs);

    if (this.boostToggleRateHz > 0) {
      const boostIntervalMs = Math.max(50, Math.floor(1000 / this.boostToggleRateHz));
      this.boostTimer = setInterval(() => {
        if (!this.alive || this.socket.readyState !== WebSocket.OPEN) {
          return;
        }
        const active = this.rng() > 0.85;
        this.socket.send(pack({ v: 1, type: "boost", active }));
      }, boostIntervalMs);
    }
  }

  stop(): Promise<void> {
    if (this.moveTimer) {
      clearInterval(this.moveTimer);
    }
    if (this.boostTimer) {
      clearInterval(this.boostTimer);
    }
    return closeSocket(this.socket);
  }
}

const waitForOpen = (socket: WebSocket, timeoutMs = 2000): Promise<void> =>
  new Promise((resolve, reject) => {
    if (socket.readyState === WebSocket.OPEN) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timed out waiting for WebSocket open."));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timeout);
      socket.off("open", onOpen);
      socket.off("error", onError);
    };

    const onOpen = () => {
      cleanup();
      resolve();
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    socket.on("open", onOpen);
    socket.on("error", onError);
  });

const closeSocket = (socket: WebSocket): Promise<void> =>
  new Promise((resolve) => {
    if (socket.readyState === WebSocket.CLOSED) {
      resolve();
      return;
    }
    socket.once("close", () => resolve());
    socket.close();
  });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> => {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]);
};

const wrapAngle = (angle: number): number => {
  if (angle > Math.PI) {
    return angle - Math.PI * 2;
  }
  if (angle < -Math.PI) {
    return angle + Math.PI * 2;
  }
  return angle;
};

const mulberry32 = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

async function runProfile(
  name: string,
  profile: Profile,
  config: BenchConfig
): Promise<MetricsSnapshot> {
  console.log(`\n[bench] profile=${name} clients=${profile.clients}`);
  const externalWsUrl = process.env.BENCH_WS_URL ?? "";
  const externalMetricsUrl = process.env.BENCH_METRICS_URL ?? "";
  const useExternal = externalWsUrl.length > 0;

  if (useExternal) {
    console.log(`[bench] using external server ${externalWsUrl}`);
  } else {
    resetMetrics();
  }

  const server = useExternal
    ? null
    : await startServer({
        wsPort: config.wsPort,
        metricsPort: config.metricsPort,
        log: false,
      });

  const wsUrl = useExternal
    ? externalWsUrl
    : `ws://127.0.0.1:${server?.ports.ws ?? config.wsPort}`;
  const metricsUrl = useExternal
    ? externalMetricsUrl
    : `http://127.0.0.1:${server?.ports.metrics ?? config.metricsPort}/metrics?mode=window`;

  const clients: BenchClient[] = [];
  for (let i = 0; i < profile.clients; i += 1) {
    clients.push(
      new BenchClient(
        wsUrl,
        `bench-${name}-${i}`,
        mulberry32(profile.seed + i),
        profile.moveRateHz,
        profile.boostToggleRateHz
      )
    );
  }

  await Promise.all(clients.map((client) => client.connect(6000)));
  clients.forEach((client) => client.startSending());

  console.log(`[bench] warmup ${profile.warmupSeconds}s`);
  await sleep(profile.warmupSeconds * 1000);

  console.log(`[bench] steady ${profile.steadySeconds}s`);
  await sleep(profile.steadySeconds * 1000);

  const response = await fetch(metricsUrl);
  const metrics = (await response.json()) as MetricsSnapshot;

  await Promise.all(clients.map((client) => client.stop()));
  if (server) {
    await server.stop();
  }

  return metrics;
}

function formatStats(stats: Stats | null): string {
  if (!stats) {
    return "n/a";
  }
  return `avg ${stats.avg} | p95 ${stats.p95} | p99 ${stats.p99} | max ${stats.max}`;
}

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) {
    return `${mb.toFixed(2)} MB`;
  }
  const kb = bytes / 1024;
  if (kb >= 1) {
    return `${kb.toFixed(2)} KB`;
  }
  return `${bytes} B`;
}

function formatRate(value: number): string {
  return value.toFixed(2);
}

async function appendRunLog(
  name: string,
  profile: Profile,
  metrics: MetricsSnapshot,
  note: string
): Promise<void> {
  const rootDir = path.resolve(process.cwd(), "..");
  const logPath = path.join(rootDir, "docs", "perf-log.md");
  await mkdir(path.dirname(logPath), { recursive: true });

  if (!existsSync(logPath)) {
    const header =
      "# Performance Log\n\n" +
      "Standardized benchmark runs recorded by `server/tools/bench.ts`.\n\n" +
      "## Profiles\n\n" +
      "- `solo-1`: 1 client, 20 Hz move rate, 1 Hz boost toggle, 10s warmup, 30s steady, seed 1337\n" +
      "- `med-100`: 100 clients, 20 Hz move rate, 1 Hz boost toggle, 10s warmup, 30s steady, seed 1337\n\n" +
      "## Runs\n\n";
    await appendFile(logPath, header);
  }

  const now = new Date().toISOString();
  const lines = [
    `### ${now} - ${name}`,
    `- profile: ${name} (clients=${profile.clients}, moveRateHz=${profile.moveRateHz}, boostToggleRateHz=${profile.boostToggleRateHz}, warmup=${profile.warmupSeconds}s, steady=${profile.steadySeconds}s)`,
    `- metrics window: ${metrics.windowSeconds}s`,
    `- tick duration ms: ${formatStats(metrics.tick.durationMs)}`,
    `- tick drift ms: ${formatStats(metrics.tick.driftMs)}`,
    `- event loop lag ms: ${formatStats(metrics.eventLoopLagMs.stats)}`,
    `- ws inbound: ${formatRate(metrics.ws.inbound.messagesPerSecond)} msg/s, ${formatRate(metrics.ws.inbound.bytesPerSecond)} B/s`,
    `- ws outbound: ${formatRate(metrics.ws.outbound.messagesPerSecond)} msg/s, ${formatRate(metrics.ws.outbound.bytesPerSecond)} B/s`,
    `- backpressure drops: ${metrics.ws.backpressureDrops.count} (${formatRate(metrics.ws.backpressureDrops.perSecond)} /s)`,
    `- world: players=${metrics.world.players}, snakes=${metrics.world.snakes}, foods=${metrics.world.foods}`,
    `- memory: rss ${formatBytes(metrics.memory.rss)}, heapUsed ${formatBytes(metrics.memory.heapUsed)}`,
    `- notes: ${note}`,
    "",
  ];

  await appendFile(logPath, `${lines.join("\n")}\n`);
}

async function loadConfig(): Promise<BenchConfig> {
  const configPath = path.resolve(process.cwd(), "tools", "bench.config.json");
  const raw = await readFile(configPath, "utf-8");
  return JSON.parse(raw) as BenchConfig;
}

function resolveProfiles(config: BenchConfig, args: string[]): string[] {
  const index = args.findIndex((arg) => arg === "--profile");
  if (index !== -1 && args[index + 1]) {
    return [args[index + 1]];
  }
  return config.order.length > 0 ? config.order : Object.keys(config.profiles);
}

async function run(): Promise<void> {
  const config = await loadConfig();
  const profiles = resolveProfiles(config, process.argv.slice(2));

  for (const name of profiles) {
    const profile = config.profiles[name];
    if (!profile) {
      throw new Error(`Unknown profile: ${name}`);
    }
    const note =
      "protocol=msgpackr v1 (UUID strings, Float32), snakes full, foods batched arrays, foods every 5 ticks";

    const metrics = await runProfile(name, profile, config);
    console.log(`[bench] ${name} completed`);
    console.log(
      `[bench] tick avg ${metrics.tick.durationMs?.avg ?? "n/a"} ms, ` +
        `p95 ${metrics.tick.durationMs?.p95 ?? "n/a"} ms, ` +
        `p99 ${metrics.tick.durationMs?.p99 ?? "n/a"} ms`
    );
    if (process.env.BENCH_LOG !== "false") {
      await appendRunLog(name, profile, metrics, note);
    }
  }

  console.log("\n[bench] all profiles completed");
}

run().catch((error) => {
  console.error(`[bench] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
