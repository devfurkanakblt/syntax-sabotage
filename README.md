## Syntax Sabotage

This repository now contains:

- web: Next.js frontend scaffold (Step 1)
- server: Express + Socket.IO authoritative backend scaffold (Step 2 in progress)
- shared: TypeScript contracts for shared game and socket event types

## Run Frontend

1. `cd web`
2. `npm install`
3. `npm run dev`

## Run Backend

1. `cd server`
2. `npm install`
3. `npm run dev`

Backend defaults:

- `PORT=4001`
- `FRONTEND_ORIGIN=*`
- `GAME_TOTAL_SECONDS=420`
- `PHASE_CODING_SECONDS=300`
- `DISCONNECT_GRACE_MS=30000`

## Step 2 Scope Implemented

- Room-based lobbies over Socket.IO
- Lobby lifecycle: create, join, leave, disconnect grace handling
- Player ready toggling and host reassignment
- Host-only game start and minimum player enforcement
- Authoritative phase transitions (`LOBBY -> ROLE_ASSIGNMENT -> CODING`)
- Exactly one imposter assignment at game start (server-side)
- Shared typed socket contracts under `shared/`

