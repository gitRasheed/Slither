# Slither Multiplayer

A server-authoritative, real-time multiplayer snake game built with TypeScript and WebSockets. Features include:

* Canvas-based interpolated rendering
* Name tags above snakes
* Join/death/respawn lifecycle
* Leaderboard sorted by length
* Radar minimap showing real-time positions
* Signup and death screen overlays
* Clean client/server message protocol with full TypeScript typing

**Architecture**

* Node.js WebSocket server (30 ticks/sec)
* Vite + Canvas frontend
* Message-driven architecture (`join`, `move`, `boost` → `state`, `dead`, `join_ack`)
* Fully client-interpolated view for smooth rendering
* Stateless WebSocket connections (no cookies or sessions)

**Tech Stack**

* Node.js v20
* TypeScript 5
* Vite 5
* HTML Canvas (no WebGL)
* Pure WebSocket (no Socket.IO or polling)

## Local Development

**Terminal 1 – Server**

```bash
cd server
npm install
npm run dev
```

**Terminal 2 – Client**

```bash
cd client
npm install
VITE_WS_URL=ws://localhost:8080 npm run dev
```

Visit: [http://localhost:5173](http://localhost:5173)

## Remote Testing (ngrok – recommended)

1. Authenticate ngrok (install or use npx):

```bash
npx ngrok@latest config add-authtoken <YOUR_TOKEN>
```

2. In two terminals, tunnel both ports:

```bash
npx ngrok http 8080     # WebSocket server
npx ngrok http 5173     # Client
```

3. Start the client with the WebSocket tunnel URL:

```bash
VITE_WS_URL=wss://<ws-tunnel-id>.ngrok.io npm run dev
```

4. Share the frontend tunnel:

```
https://<frontend-tunnel-id>.ngrok.io
```

If ngrok restarts, you’ll need to update the `VITE_WS_URL` and restart the client.

## Remote Testing (manual port forwarding)

1. Forward ports `8080` (server) and `5173` (client) from your router to your machine.
2. Start the client:

```bash
VITE_WS_URL=ws://<your-public-ip>:8080 npm run dev
```

3. Share the client:

```
http://<your-public-ip>:5173
```