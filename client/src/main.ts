import { connect } from "./network";
import { startInput } from "./input";
import { startRenderLoop, type Viewport } from "./render";

const canvas = document.getElementById("game");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Canvas element #game not found.");
}

const context = canvas.getContext("2d");
if (!context) {
  throw new Error("Failed to get 2D context.");
}

const viewport: Viewport = {
  width: 0,
  height: 0,
  dpr: 1,
};

const resize = () => {
  const rect = canvas.getBoundingClientRect();
  viewport.width = Math.max(1, Math.floor(rect.width));
  viewport.height = Math.max(1, Math.floor(rect.height));
  viewport.dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * viewport.dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * viewport.dpr));
};

window.addEventListener("resize", resize);
resize();

const wsProtocol = location.protocol === "https:" ? "wss" : "ws";
const defaultWsUrl = `${wsProtocol}://${location.hostname}:8080`;
const wsUrl = import.meta.env.VITE_WS_URL ?? defaultWsUrl;

const network = connect(wsUrl);

startInput({
  canvas,
  sendIntent: network.sendIntent,
});

startRenderLoop(context, viewport);
