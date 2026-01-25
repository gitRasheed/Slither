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
      console.log(
        `[tick] tick=${world.tick} uptime=${uptimeSeconds.toFixed(1)}s orbs=${world.orbs.length}`
      );
    }
  };

  return setInterval(() => {
    world.tick += 1;
    updateWorld(world);
    onTick();
  }, tickIntervalMs);
}
