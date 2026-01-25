const tickRate = 60;
const tickIntervalMs = 1000 / tickRate;

export function startTickLoop(): NodeJS.Timeout {
  let tick = 0;
  const startTime = Date.now();
  let lastLogSecond = -1;

  const onTick = (currentTick: number) => {
    const uptimeSeconds = (Date.now() - startTime) / 1000;
    const uptimeWholeSeconds = Math.floor(uptimeSeconds);

    if (uptimeWholeSeconds !== lastLogSecond) {
      lastLogSecond = uptimeWholeSeconds;
      console.log(`[tick] tick=${currentTick} uptime=${uptimeSeconds.toFixed(1)}s`);
    }
  };

  return setInterval(() => {
    tick += 1;
    onTick(tick);
  }, tickIntervalMs);
}
