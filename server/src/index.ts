import { startServer } from "./app.js";

const wsPort = Number(process.env.WS_PORT ?? 8080);
const metricsPort = Number(process.env.METRICS_PORT ?? 1990);

await startServer({ wsPort, metricsPort, log: true });
