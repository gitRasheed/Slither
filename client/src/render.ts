import { state, type PlayerSnapshot, type WorldSnapshot } from "./state";

export type Viewport = {
  width: number;
  height: number;
  dpr: number;
};

const colors = {
  orb: "#facc15",
  localPlayer: "#4ade80",
  otherPlayer: "#60a5fa",
  text: "#e5e7eb",
};

const getLocalPlayer = (snapshot: WorldSnapshot): PlayerSnapshot | null => {
  if (snapshot.players.length === 0) {
    return null;
  }

  if (state.localPlayerId === null) {
    return snapshot.players[0];
  }

  return snapshot.players.find((player) => player.id === state.localPlayerId) ?? snapshot.players[0];
};

const drawOrbs = (ctx: CanvasRenderingContext2D, snapshot: WorldSnapshot): void => {
  ctx.fillStyle = colors.orb;
  for (const orb of snapshot.orbs) {
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawPlayers = (
  ctx: CanvasRenderingContext2D,
  snapshot: WorldSnapshot,
  localPlayerId: number | null
): void => {
  ctx.lineCap = "round";

  for (const player of snapshot.players) {
    const isLocal = localPlayerId !== null && player.id === localPlayerId;
    const bodyLength = Math.max(12, player.length * 6);
    const tailX = player.x - player.dirX * bodyLength;
    const tailY = player.y - player.dirY * bodyLength;

    ctx.strokeStyle = isLocal ? colors.localPlayer : colors.otherPlayer;
    ctx.lineWidth = isLocal ? 8 : 6;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(tailX, tailY);
    ctx.stroke();

    ctx.fillStyle = isLocal ? colors.localPlayer : colors.otherPlayer;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 8, 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawHud = (ctx: CanvasRenderingContext2D, tick: number | null): void => {
  ctx.fillStyle = colors.text;
  ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  ctx.textBaseline = "top";
  const label = tick === null ? "tick --" : `tick ${tick}`;
  ctx.fillText(label, 12, 12);
};

export function startRenderLoop(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport
): void {
  const render = () => {
    const { width, height, dpr } = viewport;
    if (width <= 0 || height <= 0) {
      requestAnimationFrame(render);
      return;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const snapshot = state.latestSnapshot;
    if (snapshot) {
      const localPlayer = getLocalPlayer(snapshot);
      ctx.save();
      if (localPlayer) {
        ctx.translate(width / 2 - localPlayer.x, height / 2 - localPlayer.y);
      }
      drawOrbs(ctx, snapshot);
      drawPlayers(ctx, snapshot, localPlayer?.id ?? null);
      ctx.restore();
      drawHud(ctx, snapshot.tick);
    } else {
      drawHud(ctx, null);
    }

    requestAnimationFrame(render);
  };

  requestAnimationFrame(render);
}
