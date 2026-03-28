import { keccak256, stringToBytes, type Hex } from 'viem'

export const SYNTAX_POOL_ABI = [
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
    name: 'joinMatch',
    stateMutability: 'payable',
    inputs: [{ name: 'matchId', type: 'bytes32' }],
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
    name: 'poolExists',
    stateMutability: 'view',
    inputs: [{ name: 'matchId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'finalizeMatchAndMintCrewBadge',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'matchId', type: 'bytes32' },
      { name: 'winners', type: 'address[]' },
      { name: 'badgeType', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'mintDemoCrewBadges',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipients', type: 'address[]' },
      { name: 'badgeType', type: 'uint8' },
    ],
    outputs: [],
  },
] as const

export function getMatchIdForLobby(lobbyId: string): Hex {
  return keccak256(stringToBytes(lobbyId.trim().toUpperCase()))
}

export function getPoolContractAddress(): `0x${string}` | null {
  const raw = process.env.NEXT_PUBLIC_POOL_ADDRESS?.trim()
  if (!raw || !raw.startsWith('0x')) {
    return null
  }

  return raw as `0x${string}`
}
