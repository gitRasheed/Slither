import { updateWorld } from "./systems.js";
import { createWorld } from "./world.js";

const tickRate = 60;
const tickIntervalMs = 1000 / tickRate;

export function startTickLoop(): NodeJS.Timeout {
  const world = createWorld();
  const startTime = Date.now();
  let lastLogSecond = -1;

  const onTick = () => {
    const uptimeSeconds = (Date.now() - startTime) / 1000;
    const uptimeWholeSeconds = Math.floor(uptimeSeconds);

    if (uptimeWholeSeconds !== lastLogSecond) {
      lastLogSecond = uptimeWholeSeconds;
      const firstPlayer = world.players[0];
      const playerPosition = firstPlayer
        ? `p0=(${firstPlayer.x.toFixed(1)}, ${firstPlayer.y.toFixed(1)})`
        : "p0=(n/a, n/a)";

      console.log(
        `[tick] tick=${world.tick} uptime=${uptimeSeconds.toFixed(1)}s orbs=${world.orbs.length} players=${world.players.length} ${playerPosition}`
      );
    }
  };

  return setInterval(() => {
    world.tick += 1;
    updateWorld(world);
    onTick();
  }, tickIntervalMs);
}
