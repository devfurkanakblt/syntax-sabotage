import type { GameSnapshot, LobbySnapshot, LobbyStatus, PublicPlayer, Role } from '../../../shared/gameTypes'

export interface PlayerSession {
  id: string
  name: string
  walletAddress: string | null
  isHost: boolean
  isReady: boolean
  isEliminated: boolean
  isConnected: boolean
  role: Role | null
  socketId: string
  joinedAt: number
}

export interface ShuffleRecord {
  roundIndex: number
  assignments: Record<string, string>
  timestamp: number
}

export interface EliminationRecord {
  roundIndex: number
  playerId: string
  votes: number
  timestamp: number
}

export interface LobbyState {
  id: string
  minPlayers: number
  status: LobbyStatus
  players: Map<string, PlayerSession>
  hostId: string
  game: GameSnapshot
  codeByPlayer: Record<string, string>
  votes: Record<string, string>
  shuffleHistory: ShuffleRecord[]
  eliminationHistory: EliminationRecord[]
  payout: {
    status: 'idle' | 'processing' | 'confirmed' | 'failed'
    txHash: string | null
    detail: string | null
  }
  createdAt: number
  updatedAt: number
  disconnectTimers: Map<string, NodeJS.Timeout>
}

export function toPublicPlayer(player: PlayerSession): PublicPlayer {
  return {
    id: player.id,
    name: player.name,
    walletAddress: player.walletAddress ?? undefined,
    isHost: player.isHost,
    isReady: player.isReady,
    isEliminated: player.isEliminated,
    isConnected: player.isConnected,
  }
}

export function toLobbySnapshot(lobby: LobbyState): LobbySnapshot {
  const players = [...lobby.players.values()]
    .sort((a, b) => a.joinedAt - b.joinedAt)
    .map(toPublicPlayer)

  return {
    id: lobby.id,
    minPlayers: lobby.minPlayers,
    status: lobby.status,
    players,
    game: { ...lobby.game },
    createdAt: lobby.createdAt,
    updatedAt: lobby.updatedAt,
  }
}
