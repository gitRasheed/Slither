# Slither Multiplayer

A server-authoritative, real-time multiplayer snake game built with TypeScript and WebSockets.

## Live demo

- https://slither-1.onrender.com/ (Render cold start: wait ~30 seconds for the backend to boot on first load)

## Highlights

- Server-authoritative simulation at 30 ticks/sec
- Client-side interpolation for smooth rendering
- Typed message protocol (`join`, `move`, `boost` -> `state`, `dead`, `join_ack`)
- Canvas rendering with name tags, radar minimap, and leaderboard
- Join/death/respawn lifecycle with overlay screens

## How it works

- WebSocket server simulates game state and broadcasts snapshots.
- Clients send input events only; rendering uses interpolated snapshots.
- Stateless connections (no cookies or sessions).

## Tech stack

- Node.js 20, TypeScript 5, Vite 7, HTML Canvas, WebSocket (ws), msgpackr

## Project structure

- `server/` WebSocket game server
- `client/` Vite + Canvas client

## Quick start

### Server

```bash
cd server
npm install
npm run dev
```

### Client

```bash
cd client
npm install
VITE_WS_URL=ws://localhost:8080 npm run dev
```

Open http://localhost:5173

## Scripts

### Server

- `npm run dev` - run server with tsx
- `npm run build` - compile TypeScript
- `npm run start` - run compiled server
- `npm run test` - run tests
- `npm run bench` - run benchmark

### Client

- `npm run dev` - start Vite dev server
- `npm run build` - production build
- `npm run preview` - preview build
