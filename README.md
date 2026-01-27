# Slither Multiplayer

A real-time, server-authoritative multiplayer snake game built with TypeScript, WebSockets, and Canvas. Includes client-side interpolation, HUD overlays, player join lifecycle, radar minimap, and a leaderboard.

## Overview

* Server: Node.js WebSocket server at 30 TPS, managing world state, collisions, and input.
* Client: Vite-powered frontend with Canvas rendering, DOM overlays, input handling, and local interpolation.
* Protocol: Clients send `join`, `move`, `boost`; server sends `join_ack`, `state`, `dead`.

## Local Development

**Two-terminal setup**

Server:

```bash
cd server
npm install
npm run dev
```

Client:

```bash
cd client
npm install
npm run dev
```

Visit: `http://localhost:5173`

**Single command (server + client)**

```bash
node scripts/dev.mjs --mode local
```

## Remote Testing Options

### 1. Port Forwarding

* Forward ports `8080` (WebSocket) and `5173` (client).
* Run:

```bash
node scripts/dev.mjs --mode tunnel --ws ws://<your-public-ip>:8080
```

* Share: `http://<your-public-ip>:5173`

### 2. Ngrok

1. Add your ngrok auth token (via npx or install):

```bash
npx ngrok@latest config add-authtoken <YOUR_TOKEN>
```

2. Start tunnels in separate terminals:

```bash
npx ngrok http 8080
npx ngrok http 5173
```

3. Start dev with the WebSocket tunnel:

```bash
node scripts/dev.mjs --mode tunnel --ws wss://<ws-tunnel-id>.ngrok.io
```

4. Share the frontend tunnel URL:

```
https://<frontend-tunnel-id>.ngrok.io
```

If ngrok restarts, URLs change—restart with the updated tunnel.

## Features

* Server-authoritative simulation
* Player join, death, and respawn lifecycle
* Interpolated Canvas rendering
* Names displayed above snakes
* Top-10 leaderboard by length
* Radar minimap with real-time positions
* Integration and unit tested (join, input, collisions)
