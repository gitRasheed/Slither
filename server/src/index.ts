import "./config.js";
import { startTickLoop } from "./tick.js";

const env = process.env.NODE_ENV ?? "development";

console.log("Server starting...");
console.log(`Node.js version: ${process.version}`);
console.log(`Environment: ${env}`);

startTickLoop();
