import "../../shared/config.js";
import { getClientCount, startWebSocketServer } from "./network.js";
import { startTickLoop } from "./tick.js";

const env = process.env.NODE_ENV ?? "development";

console.log("Server starting...");
console.log(`Node.js version: ${process.version}`);
console.log(`Environment: ${env}`);

const wsPort = Number(process.env.WS_PORT ?? 8080);
const wss = startWebSocketServer({ port: wsPort });

const formatError = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

wss.on("connection", (socket) => {
  console.log(`[ws] client connected count=${getClientCount()}`);

  socket.on("close", () => {
    console.log(`[ws] client disconnected count=${getClientCount()}`);
  });

  socket.on("error", (error) => {
    console.log(`[ws] client error ${formatError(error)}`);
  });
});

wss.on("error", (error) => {
  console.log(`[ws] server error ${formatError(error)}`);
});

console.log(`[ws] listening on ws://localhost:${wsPort}`);

startTickLoop();
