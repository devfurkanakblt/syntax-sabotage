## Syntax Sabotage

This repository now contains:

- web: Next.js frontend scaffold (Step 1)
- server: Express + Socket.IO authoritative backend (Step 3 implemented)
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
- `PHASE_ROLE_ASSIGNMENT_SECONDS=5`
- `PHASE_CODING_SECONDS=300`
- `PHASE_MEETING_SECONDS=120`
- `PHASE_SHUFFLE_SECONDS=5`
- `PHASE_VOTE_SECONDS=45`
- `DISCONNECT_GRACE_MS=30000`
- `MOCK_HIDDEN_TEST_FORCE=pass|fail` (optional)

## Step 2 Scope Implemented

- Room-based lobbies over Socket.IO
- Lobby lifecycle: create, join, leave, disconnect grace handling
- Player ready toggling and host reassignment
- Host-only game start and minimum player enforcement
- Authoritative phase transitions (`LOBBY -> ROLE_ASSIGNMENT -> CODING`)
- Exactly one imposter assignment at game start (server-side)
- Shared typed socket contracts under `shared/`

## Step 3 Scope Implemented

- Per-second timer engine with `game:timerTick` broadcasts
- Automatic phase loop:
	`ROLE_ASSIGNMENT -> CODING -> MEETING -> SHUFFLE -> VOTE_RESOLVE -> next round CODING`
- Server-side code submission lock rules (`CODING` only + non-eliminated players)
- Shuffle algorithm for active players with assignment history persisted in lobby state
- Voting rules with one vote per player, no self-vote, deterministic tie-break on elimination
- Elimination events and lockout support (`game:playerEliminated`)
- Win evaluation at round boundaries and timeout:
	- Crewmates win when hidden tests pass
	- Imposter wins when all crewmates are eliminated or timeout ends with failed tests

