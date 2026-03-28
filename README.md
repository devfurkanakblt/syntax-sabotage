## Syntax Sabotage

Multiplayer social deduction coding game with Socket.IO game loop, on-chain staking, and soulbound ending badges.

## Monorepo Structure

- `web`: Next.js frontend (game UI, wallet, staking panel)
- `server`: Express + Socket.IO authoritative game backend
- `shared`: shared TypeScript socket/game types
- `contracts`: Hardhat workspace (`SyntaxSabotagePool.sol`)
- `nft-images`: source badge images
- `web/public/nft-images`: served badge images used by NFT metadata

## Quick Start

Frontend:

1. `cd web`
2. `npm install`
3. `npm run dev`

Backend:

1. `cd server`
2. `npm install`
3. `npm run dev`

Contracts:

1. `cd contracts`
2. `npm install`
3. `npm run compile`
4. `npm run test`

Deploy:

- `npm run deploy:monad`
- `npm run deploy:sepolia`

## 3-Minute Presentation Mode

1. Set `NEXT_PUBLIC_PRESENTATION_MODE=true` in `web/.env.local` (or open once with `?demo=1`).
2. Click `LAUNCH_PRESENTATION_MODE()` on landing.
3. Use in-page `presentation_mode` controls to jump phases and trigger ending tests quickly.

In presentation mode, create/join stake flow is mocked and ending badge mint can be tested via demo mint path.

## On-Chain + NFT Endings

- Wallet + network switch with Wagmi/Viem (Monad/Sepolia)
- Staking flow: host creates pool, players join, backend finalizes payout
- Distinct crewmate badge outcomes:
  - `code_fixed_in_time` -> `debugger`
  - `imposter_found_in_time` -> `de-impostorer`
- Badges are soulbound (non-transferable)
- NFT metadata image URLs point to `/nft-images/*` assets served by frontend

## Required Environment Variables

Web (`web/.env.example`):

- `NEXT_PUBLIC_POOL_ADDRESS`
- `NEXT_PUBLIC_ENTRY_FEE_ETH`
- `NEXT_PUBLIC_MONAD_RPC_URL`
- `NEXT_PUBLIC_SEPOLIA_RPC_URL`

Server (`server/.env.example`):

- `STAKING_MODE=mock|onchain`
- `STAKING_ENFORCE=true|false`
- `STAKING_POOL_ADDRESS`
- `STAKING_SIGNER_PRIVATE_KEY`
- `STAKING_CHAIN=monad|sepolia`
- `STAKING_ENTRY_FEE_WEI`

