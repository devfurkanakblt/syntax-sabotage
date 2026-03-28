export type Phase =
  | 'LOBBY'
  | 'ROLE_ASSIGNMENT'
  | 'CODING'
  | 'MEETING'
  | 'SHUFFLE'
  | 'VOTE_RESOLVE'
  | 'END_GAME'

export type Role = 'CREWMATE' | 'IMPOSTER'

export type LobbyStatus = 'waiting' | 'starting' | 'active' | 'ended'

export interface PublicPlayer {
  id: string
  name: string
  walletAddress?: string
  isHost: boolean
  isReady: boolean
  isEliminated: boolean
  isConnected: boolean
}

export interface GameSnapshot {
  phase: Phase
  roundIndex: number
  totalTimeLeft: number
  phaseTimeLeft: number
  startedAt: number | null
}

export interface LobbySnapshot {
  id: string
  minPlayers: number
  status: LobbyStatus
  players: PublicPlayer[]
  game: GameSnapshot
  createdAt: number
  updatedAt: number
}
