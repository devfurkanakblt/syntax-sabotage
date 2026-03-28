## Syntax Sabotage

This repository now contains:

- web: Next.js frontend scaffold (Step 1)
- server: Express + Socket.IO authoritative backend (Step 4 integrated)
- shared: TypeScript contracts for shared game and socket event types
- contracts: Hardhat workspace for staking/payout smart contract

## Run Frontend

1. `cd web`
2. `npm install`
3. `npm run dev`

## 3-Minute Hackathon Presentation Mode

Use this when you need to demo the full game loop quickly without waiting on real multiplayer timing.

1. Set `NEXT_PUBLIC_PRESENTATION_MODE=true` in your `web/.env.local` (or open the app once with `?demo=1` in the URL).
2. Start frontend with `cd web && npm run dev`.
3. On the landing page, click `LAUNCH_PRESENTATION_MODE()`.
4. Use the `presentation_mode` controls in lobby/game pages to jump phases instantly.

Presentation mode uses in-browser mock state and bypasses live Socket.IO calls.

## Run Backend

1. `cd server`
2. `npm install`
3. `npm run dev`

## Run Contracts Workspace

1. `cd contracts`
2. `npm install`
3. `npm run compile`
4. `npm run test`

Deploy commands:

- `npm run deploy:sepolia`
- `npm run deploy:monad`

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

Step 4 web env (see `web/.env.example`):

- `NEXT_PUBLIC_POOL_ADDRESS`
- `NEXT_PUBLIC_ENTRY_FEE_ETH`
- `NEXT_PUBLIC_MONAD_RPC_URL`
- `NEXT_PUBLIC_SEPOLIA_RPC_URL`

Step 4 server env (see `server/.env.example`):

- `STAKING_MODE=mock|onchain`
- `STAKING_ENFORCE=true|false`
- `STAKING_POOL_ADDRESS`
- `STAKING_SIGNER_PRIVATE_KEY`
- `STAKING_CHAIN=monad|sepolia`
- `STAKING_ENTRY_FEE_WEI`

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

## Step 4 Scope Implemented

- Wallet connect/disconnect and network switching via Wagmi + viem on the frontend
- Monad/Sepolia chain config and app-level web3 providers
- Lobby staking panel for host pool creation and player stake join transaction flow
- Solidity contract `SyntaxSabotagePool.sol` with:
	- `createMatchPool(matchId, entryFee)`
	- `joinMatch(matchId)` payable
	- `finalizeMatch(matchId, winners)` payout logic
- Contract deployment and tests in a dedicated Hardhat workspace
- Backend stake verification gate before game start (`STAKING_ENFORCE=true`)
- Backend end-game payout finalization with `game:payoutStatus` event broadcast

