# Performance Log

Standardized benchmark runs recorded by `server/tools/bench.ts`.

## Profiles

- `med-100`: 100 clients, 20 Hz move rate, 1 Hz boost toggle, 10s warmup, 30s steady, seed 1337

## Runs

Baseline runs will be appended below.
### 2026-01-29T17:50:31.093Z - med-100
- profile: med-100 (clients=100, moveRateHz=20, boostToggleRateHz=1, warmup=10s, steady=30s)
- metrics window: 30s
- tick duration ms: avg 21.1031 | p95 30.3296 | p99 35.2898 | max 40.9663
- tick drift ms: avg 168.0224 | p95 308.6667 | p99 327.6667 | max 373.6667
- event loop lag ms: avg 141.9516 | p95 261 | p99 274 | max 393
- ws inbound: 565.73 msg/s, 23013.10 B/s
- ws outbound: 498.77 msg/s, 125418808.50 B/s
- backpressure drops: 0 (0.00 /s)
- world: players=100, snakes=97, foods=2002
- memory: rss 140.54 MB, heapUsed 25.37 MB
- notes: baseline (JSON full snapshot, no AOI, broadcast all)
### 2026-01-29T18:00:30.438Z - med-100
- profile: med-100 (clients=100, moveRateHz=20, boostToggleRateHz=1, warmup=10s, steady=30s)
- metrics window: 30s
- tick duration ms: avg 83.5017 | p95 107.8578 | p99 112.9615 | max 116.1964
- tick drift ms: avg 121.9516 | p95 183.6667 | p99 210.6667 | max 217.6667
- event loop lag ms: avg 186.2404 | p95 251 | p99 266 | max 267
- ws inbound: 603.00 msg/s, 24496.10 B/s
- ws outbound: 657.23 msg/s, 67611263.57 B/s
- backpressure drops: 0 (0.00 /s)
- world: players=100, snakes=99, foods=2795
- memory: rss 127.46 MB, heapUsed 14.04 MB
- notes: AOI (JSON, client-provided radius, full scan per player, no grid)
### 2026-01-29T18:07:17.940Z - med-100
- profile: med-100 (clients=100, moveRateHz=20, boostToggleRateHz=1, warmup=10s, steady=30s)
- metrics window: 30s
- tick duration ms: avg 84.2603 | p95 105.5463 | p99 109.6281 | max 118.1983
- tick drift ms: avg 127.8387 | p95 201.6667 | p99 224.6667 | max 227.6667
- event loop lag ms: avg 203.6364 | p95 297 | p99 309 | max 309
- ws inbound: 562.47 msg/s, 22878.70 B/s
- ws outbound: 617.43 msg/s, 66872927.30 B/s
- backpressure drops: 0 (0.00 /s)
- world: players=100, snakes=96, foods=2415
- memory: rss 130.86 MB, heapUsed 16.48 MB
- notes: AOI (JSON, server-derived radius, full scan per player, no grid)
### 2026-01-29T18:16:56.872Z - med-100
- profile: med-100 (clients=100, moveRateHz=20, boostToggleRateHz=1, warmup=10s, steady=30s)
- metrics window: 30s
- tick duration ms: avg 85.0278 | p95 107.2357 | p99 109.9244 | max 111.1484
- tick drift ms: avg 130.0145 | p95 190.6667 | p99 202.6667 | max 210.6667
- event loop lag ms: avg 184.4245 | p95 242 | p99 256 | max 265
- ws inbound: 595.20 msg/s, 24266.87 B/s
- ws outbound: 607.77 msg/s, 67690260.83 B/s
- backpressure drops: 0 (0.00 /s)
- world: players=100, snakes=100, foods=2575
- memory: rss 133.19 MB, heapUsed 30.01 MB
- notes: AOI (JSON, grid, server-derived radius, cell size 400)
### 2026-01-29T18:21:09.221Z - med-100
- profile: med-100 (clients=100, moveRateHz=20, boostToggleRateHz=1, warmup=10s, steady=30s)
- metrics window: 30s
- tick duration ms: avg 27.0277 | p95 41.0704 | p99 47.2128 | max 55.5073
- tick drift ms: avg 12.5596 | p95 31.6667 | p99 41.6667 | max 48.6667
- event loop lag ms: avg 26.7161 | p95 55 | p99 72 | max 84
- ws inbound: 1337.33 msg/s, 55487.13 B/s
- ws outbound: 2183.77 msg/s, 31205716.37 B/s
- backpressure drops: 0 (0.00 /s)
- world: players=100, snakes=96, foods=9541
- memory: rss 115.16 MB, heapUsed 14.16 MB
- notes: AOI (JSON, grid, server-derived radius, cell size 100, base radius 100, update every 15 ticks)
### 2026-01-29T18:33:18.168Z - med-100
- profile: med-100 (clients=100, moveRateHz=20, boostToggleRateHz=1, warmup=10s, steady=30s)
- metrics window: 30s
- tick duration ms: avg 19.5021 | p95 28.1057 | p99 29.6406 | max 39.8771
- tick drift ms: avg 54.4174 | p95 128.6667 | p99 144.6667 | max 157.6667
- event loop lag ms: avg 76.8402 | p95 143 | p99 153 | max 157
- ws inbound: 834.10 msg/s, 4903.63 B/s
- ws outbound: 1160.90 msg/s, 224505818.60 B/s
- backpressure drops: 0 (0.00 /s)
- world: players=100, snakes=97, foods=5193
- memory: rss 152.36 MB, heapUsed 28.78 MB
- notes: manual binary v1 (UUID strings, Float32), full snapshot, no AOI
### 2026-01-29T18:40:25.011Z - med-100
- profile: med-100 (clients=100, moveRateHz=20, boostToggleRateHz=1, warmup=10s, steady=30s)
- metrics window: 30s
- tick duration ms: avg 17.3104 | p95 25.1958 | p99 27.5881 | max 41.4254
- tick drift ms: avg 98.2851 | p95 190.6667 | p99 205.6667 | max 236.6667
- event loop lag ms: avg 126.1805 | p95 212 | p99 219 | max 222
- ws inbound: 677.60 msg/s, 20521.00 B/s
- ws outbound: 760.00 msg/s, 175362308.57 B/s
- backpressure drops: 0 (0.00 /s)
- world: players=100, snakes=99, foods=3006
- memory: rss 172.66 MB, heapUsed 15.31 MB
- notes: protocol=msgpackr v1 (UUID strings, Float32), full snapshot, no AOI
### 2026-01-29T18:53:41.013Z - med-100
- profile: med-100 (clients=100, moveRateHz=20, boostToggleRateHz=1, warmup=10s, steady=30s)
- metrics window: 30s
- tick duration ms: avg 17.7042 | p95 26.0998 | p99 27.9984 | max 33.4957
- tick drift ms: avg 100.6936 | p95 202.6667 | p99 216.6667 | max 244.6667
- event loop lag ms: avg 93.3442 | p95 214 | p99 234 | max 252
- ws inbound: 801.70 msg/s, 24374.33 B/s
- ws outbound: 741.17 msg/s, 176741769.03 B/s
- backpressure drops: 0 (0.00 /s)
- world: players=100, snakes=97, foods=3135
- memory: rss 178.89 MB, heapUsed 14.98 MB
- notes: protocol=msgpackr v1 (UUID strings, Float32), snakes full, foods batched arrays
### 2026-01-29T18:54:22.224Z - med-100
- profile: med-100 (clients=100, moveRateHz=20, boostToggleRateHz=1, warmup=10s, steady=30s)
- metrics window: 30s
- tick duration ms: avg 17.5559 | p95 24.6315 | p99 26.5407 | max 29.7635
- tick drift ms: avg 103.7123 | p95 194.6667 | p99 205.6667 | max 223.6667
- event loop lag ms: avg 119.3358 | p95 209 | p99 227 | max 232
- ws inbound: 722.23 msg/s, 21903.93 B/s
- ws outbound: 736.20 msg/s, 179342307.67 B/s
- backpressure drops: 0 (0.00 /s)
- world: players=100, snakes=99, foods=3245
- memory: rss 180.23 MB, heapUsed 20.98 MB
- notes: protocol=msgpackr v1 (UUID strings, Float32), snakes full, foods delta add/remove

### Checkpoint 1 — Protocol + Food Batching
- Switched the wire protocol from JSON to msgpackr v1 (UUID strings, Float32) because the baseline tick time moved from ~21.1 ms (JSON full snapshot) down to ~17.3–18.4 ms (msgpackr full snapshot), which is a clear speedup without changing gameplay semantics.
- Picked foods‑batched arrays every 5 ticks as the current default since it keeps the implementation simple while still lowering average tick time to ~16.17 ms, beating msgpackr full (~17.3–18.4 ms) and manual binary (~19.5 ms) with fewer moving parts than delta.
- Foods‑delta every 5 ticks is the fastest so far (~14.5–15.7 ms average), but it adds more state bookkeeping, so we’re keeping foods‑batched for now and leaving delta as the next step if we need more headroom.

Comparisons (avg tick, lower is better)
- JSON full 21.1 ms -> msgpackr full 17.3–18.4 ms (~13–18% faster)
- msgpackr full 17.3–18.4 ms -> foods‑batched 16.17 ms (~6–12% faster)
- JSON full 21.1 ms -> foods‑batched 16.17 ms (~23% faster)
- manual binary 19.5 ms -> foods‑batched 16.17 ms (~17% faster)

### 2026-01-29T19:02:24.529Z - med-100
- profile: med-100 (clients=100, moveRateHz=20, boostToggleRateHz=1, warmup=10s, steady=30s)
- metrics window: 30s
- tick duration ms: avg 16.1677 | p95 34.333 | p99 40.0844 | max 43.5248
- tick drift ms: avg 26.1925 | p95 81.6667 | p99 105.6667 | max 131.6667
- event loop lag ms: avg 37.7752 | p95 99 | p99 129 | max 141
- ws inbound: 1120.50 msg/s, 34313.47 B/s
- ws outbound: 2002.50 msg/s, 192483010.30 B/s
- backpressure drops: 0 (0.00 /s)
- world: players=100, snakes=99, foods=7205
- memory: rss 174.38 MB, heapUsed 29.87 MB
- notes: protocol=msgpackr v1 (UUID strings, Float32), snakes full, foods batched arrays, foods every 5 ticks, food grid 5x5 cells (cell size 64), head-only collisions (~35% avg tick improvement vs 16.17 ms)
### 2026-01-29T19:03:04.984Z - med-100
- profile: med-100 (clients=100, moveRateHz=20, boostToggleRateHz=1, warmup=10s, steady=30s)
- metrics window: 30s
- tick duration ms: avg 15.7282 | p95 23.3478 | p99 26.6187 | max 31.2142
- tick drift ms: avg 18.5458 | p95 52.6667 | p99 59.6667 | max 64.6667
- event loop lag ms: avg 27.7106 | p95 61 | p99 68 | max 77
- ws inbound: 1274.33 msg/s, 39098.93 B/s
- ws outbound: 2352.43 msg/s, 133552335.10 B/s
- backpressure drops: 0 (0.00 /s)
- world: players=100, snakes=99, foods=8617
- memory: rss 170.50 MB, heapUsed 20.11 MB
- notes: protocol=msgpackr v1 (UUID strings, Float32), snakes full, foods delta add/remove, foods every 5 ticks
### 2026-01-29T20:18:10.171Z - med-100
- profile: med-100 (clients=100, moveRateHz=20, boostToggleRateHz=1, warmup=10s, steady=30s)
- metrics window: 30s
- tick duration ms: avg 10.4567 | p95 28.5159 | p99 35.168 | max 50.2036
- tick drift ms: avg 23.0704 | p95 78.6667 | p99 97.6667 | max 115.6667
- event loop lag ms: avg 33.1689 | p95 98 | p99 112 | max 132
- ws inbound: 1173.57 msg/s, 35961.23 B/s
- ws outbound: 2097.93 msg/s, 212914836.37 B/s
- backpressure drops: 0 (0.00 /s)
- world: players=100, snakes=99, foods=8228
- memory: rss 176.04 MB, heapUsed 27.52 MB
- notes: protocol=msgpackr v1 (UUID strings, Float32), snakes full, foods batched arrays, foods every 5 ticks

### Checkpoint 2 — Food Collision Grid
- Profiling consistently pointed at `checkSnakeFoodCollisions` as the hottest JS path, so we targeted that directly instead of touching serialization or networking.
- Replaced the naive food scan with a uniform grid: foods are bucketed into cells (`FOOD_COLLISION_CELL_SIZE = 64`), and each snake head only checks a 5×5 cell neighborhood, which keeps the collision test head‑only and drastically reduces candidate checks per tick.
- Result: average tick time dropped from **16.17 ms** (p95 **34.33**, p99 **40.08**) to **10.46 ms** (p95 **28.52**, p99 **35.17**), about **35% faster**, while keeping the same gameplay rules.
