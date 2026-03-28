import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  isAddress,
  keccak256,
  stringToBytes,
  type Address,
  type Hex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import type { LobbyState, PlayerSession } from '../state/types'

const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.MONAD_RPC_URL ?? 'https://testnet-rpc.monad.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: process.env.MONAD_EXPLORER_URL ?? 'https://testnet.monadexplorer.com',
    },
  },
  testnet: true,
})

const STAKING_MODE = (process.env.STAKING_MODE ?? 'mock').toLowerCase()
const STAKING_ENFORCE = (process.env.STAKING_ENFORCE ?? 'false').toLowerCase() === 'true'
const STAKING_CHAIN = (process.env.STAKING_CHAIN ?? 'sepolia').toLowerCase()
const STAKING_RPC_URL = process.env.STAKING_RPC_URL?.trim()
const STAKING_POOL_ADDRESS = process.env.STAKING_POOL_ADDRESS?.trim()
const STAKING_SIGNER_PRIVATE_KEY = process.env.STAKING_SIGNER_PRIVATE_KEY?.trim()
const STAKING_ENTRY_FEE_WEI = BigInt(process.env.STAKING_ENTRY_FEE_WEI ?? '1000000000000000')

const poolAbi = [
  {
    type: 'function',
    name: 'poolExists',
    stateMutability: 'view',
    inputs: [{ name: 'matchId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'createMatchPool',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'matchId', type: 'bytes32' },
      { name: 'entryFee', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'hasJoined',
    stateMutability: 'view',
    inputs: [
      { name: 'matchId', type: 'bytes32' },
      { name: 'player', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'finalizeMatch',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'matchId', type: 'bytes32' },
      { name: 'winners', type: 'address[]' },
    ],
    outputs: [],
  },
] as const

export interface StakeVerificationResult {
  verified: boolean
  reason: string
}

export interface PayoutResult {
  status: 'skipped' | 'mock-settled' | 'submitted' | 'confirmed' | 'failed'
  txHash?: string
  detail: string
}

function resolveChain() {
  return STAKING_CHAIN === 'monad' ? monadTestnet : sepolia
}

function resolvePublicTransport() {
  if (STAKING_RPC_URL && STAKING_RPC_URL.length > 0) {
    return http(STAKING_RPC_URL)
  }

  return http()
}

function requirePoolAddress(): Address {
  if (!STAKING_POOL_ADDRESS || !isAddress(STAKING_POOL_ADDRESS)) {
    throw new Error('Invalid or missing STAKING_POOL_ADDRESS.')
  }

  return STAKING_POOL_ADDRESS as Address
}

function getWalletAddress(player: PlayerSession): Address | null {
  if (!player.walletAddress || !isAddress(player.walletAddress)) {
    return null
  }

  return player.walletAddress as Address
}

export class StakeService {
  public getMatchId(lobbyId: string): Hex {
    return keccak256(stringToBytes(lobbyId.trim().toUpperCase()))
  }

  public async verifyLobbyStake(lobby: LobbyState): Promise<StakeVerificationResult> {
    if (!STAKING_ENFORCE) {
      return {
        verified: true,
        reason: 'staking enforcement disabled by STAKING_ENFORCE=false',
      }
    }

    const activePlayers = [...lobby.players.values()].filter((p) => !p.isEliminated)
    if (activePlayers.some((player) => !player.walletAddress)) {
      return {
        verified: false,
        reason: 'all players must connect wallet before game start',
      }
    }

    if (STAKING_MODE !== 'onchain') {
      return {
        verified: true,
        reason: 'mock staking accepted for demo mode',
      }
    }

    try {
      const chain = resolveChain()
      const poolAddress = requirePoolAddress()
      const client = createPublicClient({ chain, transport: resolvePublicTransport() })
      const matchId = this.getMatchId(lobby.id)

      for (const player of activePlayers) {
        const walletAddress = getWalletAddress(player)
        if (!walletAddress) {
          return {
            verified: false,
            reason: `player ${player.id} has invalid wallet address`,
          }
        }

        const joined = await client.readContract({
          address: poolAddress,
          abi: poolAbi,
          functionName: 'hasJoined',
          args: [matchId, walletAddress],
        })

        if (!joined) {
          return {
            verified: false,
            reason: `wallet ${walletAddress} has not joined stake pool`,
          }
        }
      }

      return {
        verified: true,
        reason: 'all players verified on-chain',
      }
    } catch (error) {
      return {
        verified: false,
        reason: `on-chain stake verification failed: ${String(error)}`,
      }
    }
  }

  public async ensureMatchPool(lobbyId: string): Promise<void> {
    if (STAKING_MODE !== 'onchain' || !STAKING_ENFORCE) {
      return
    }

    const poolAddress = requirePoolAddress()
    if (!STAKING_SIGNER_PRIVATE_KEY) {
      throw new Error('Missing STAKING_SIGNER_PRIVATE_KEY for on-chain pool creation.')
    }

    const chain = resolveChain()
    const account = privateKeyToAccount(STAKING_SIGNER_PRIVATE_KEY as Hex)
    const publicClient = createPublicClient({ chain, transport: resolvePublicTransport() })
    const walletClient = createWalletClient({
      chain,
      transport: resolvePublicTransport(),
      account,
    })

    const matchId = this.getMatchId(lobbyId)
    const exists = await publicClient.readContract({
      address: poolAddress,
      abi: poolAbi,
      functionName: 'poolExists',
      args: [matchId],
    })

    if (exists) {
      return
    }

    const hash = await walletClient.writeContract({
      address: poolAddress,
      abi: poolAbi,
      functionName: 'createMatchPool',
      args: [matchId, STAKING_ENTRY_FEE_WEI],
    })

    await publicClient.waitForTransactionReceipt({ hash })
  }

  public async finalizeMatch(lobby: LobbyState, winner: 'CREWMATES' | 'IMPOSTER'): Promise<PayoutResult> {
    const winners = [...lobby.players.values()].filter((player) => {
      if (winner === 'CREWMATES') {
        return player.role === 'CREWMATE' && !player.isEliminated
      }
      return player.role === 'IMPOSTER' && !player.isEliminated
    })

    const winnerAddresses = winners
      .map(getWalletAddress)
      .filter((value): value is Address => Boolean(value))

    if (winnerAddresses.length === 0) {
      return {
        status: 'skipped',
        detail: 'no eligible winner wallet addresses were available for payout',
      }
    }

    if (!STAKING_ENFORCE) {
      return {
        status: 'skipped',
        detail: 'staking enforcement disabled; payout skipped',
      }
    }

    if (STAKING_MODE !== 'onchain') {
      return {
        status: 'mock-settled',
        detail: `mock payout computed for ${winnerAddresses.length} winner(s)`,
      }
    }

    try {
      const poolAddress = requirePoolAddress()
      if (!STAKING_SIGNER_PRIVATE_KEY) {
        return {
          status: 'failed',
          detail: 'missing STAKING_SIGNER_PRIVATE_KEY for finalize transaction',
        }
      }

      const chain = resolveChain()
      const account = privateKeyToAccount(STAKING_SIGNER_PRIVATE_KEY as Hex)
      const publicClient = createPublicClient({ chain, transport: resolvePublicTransport() })
      const walletClient = createWalletClient({
        chain,
        transport: resolvePublicTransport(),
        account,
      })

      const hash = await walletClient.writeContract({
        address: poolAddress,
        abi: poolAbi,
        functionName: 'finalizeMatch',
        args: [this.getMatchId(lobby.id), winnerAddresses],
      })

      await publicClient.waitForTransactionReceipt({ hash })
      return {
        status: 'confirmed',
        txHash: hash,
        detail: 'match finalized and payout confirmed on-chain',
      }
    } catch (error) {
      return {
        status: 'failed',
        detail: `payout transaction failed: ${String(error)}`,
      }
    }
  }
}
