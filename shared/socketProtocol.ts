import type { GameSnapshot, LobbySnapshot, Phase } from './gameTypes'

export type ErrorCode =
  | 'LOBBY_NOT_FOUND'
  | 'LOBBY_ALREADY_EXISTS'
  | 'ALREADY_IN_LOBBY'
  | 'ALREADY_VOTED'
  | 'SELF_VOTE_FORBIDDEN'
  | 'GAME_ALREADY_STARTED'
  | 'NOT_HOST'
  | 'MIN_PLAYERS_NOT_MET'
  | 'PLAYER_NOT_FOUND'
  | 'INVALID_PHASE'
  | 'INVALID_PAYLOAD'
  | 'UNAUTHORIZED'
  | 'INTERNAL_ERROR'

export interface SocketErrorPayload {
  code: ErrorCode
  message: string
}

export interface SocketAck<T = void> {
  ok: boolean
  data?: T
  error?: SocketErrorPayload
}

export interface LobbyCreateRequest {
  lobbyId?: string
  playerName: string
  minPlayers?: number
}

export interface LobbyCreateResponse {
  lobby: LobbySnapshot
  playerId: string
}

export interface LobbyJoinRequest {
  lobbyId: string
  playerName: string
  playerId?: string
}

export interface LobbyJoinResponse {
  lobby: LobbySnapshot
  playerId: string
  reconnected: boolean
}

export interface LobbyLeaveRequest {
  lobbyId: string
}

export interface PlayerReadyRequest {
  lobbyId: string
  isReady?: boolean
}

export interface GameStartRequest {
  lobbyId: string
}

export interface CodeSubmitRequest {
  lobbyId: string
  code: string
}

export interface VoteCastRequest {
  lobbyId: string
  targetPlayerId: string
}

export interface ChatSendRequest {
  lobbyId: string
  text: string
}

export interface GamePhaseChangedPayload {
  lobbyId: string
  phase: Phase
  roundIndex: number
}

export interface GameStatePayload {
  lobbyId: string
  game: GameSnapshot
}

export interface VoteResultPayload {
  lobbyId: string
  votes: Record<string, string>
  tally: Record<string, number>
}

export interface PlayerEliminatedPayload {
  lobbyId: string
  playerId: string
}

export interface GameEndedPayload {
  lobbyId: string
  winner: 'CREWMATES' | 'IMPOSTER'
  reason: string
}

export interface ChatMessagePayload {
  lobbyId: string
  playerId: string
  playerName: string
  text: string
  timestamp: number
}

export interface ClientToServerEvents {
  'lobby:create': (payload: LobbyCreateRequest, ack?: (response: SocketAck<LobbyCreateResponse>) => void) => void
  'lobby:join': (payload: LobbyJoinRequest, ack?: (response: SocketAck<LobbyJoinResponse>) => void) => void
  'lobby:leave': (payload: LobbyLeaveRequest, ack?: (response: SocketAck) => void) => void
  'player:ready': (payload: PlayerReadyRequest, ack?: (response: SocketAck) => void) => void
  'game:start': (payload: GameStartRequest, ack?: (response: SocketAck) => void) => void
  'code:submit': (payload: CodeSubmitRequest, ack?: (response: SocketAck) => void) => void
  'vote:cast': (payload: VoteCastRequest, ack?: (response: SocketAck) => void) => void
  'chat:send': (payload: ChatSendRequest, ack?: (response: SocketAck) => void) => void
}

export interface ServerToClientEvents {
  'lobby:updated': (payload: LobbySnapshot) => void
  'game:state': (payload: GameStatePayload) => void
  'game:phaseChanged': (payload: GamePhaseChangedPayload) => void
  'game:timerTick': (payload: { lobbyId: string; phaseTimeLeft: number; totalTimeLeft: number }) => void
  'game:codeAssigned': (payload: { lobbyId: string; assignments: Record<string, string> }) => void
  'game:voteResult': (payload: VoteResultPayload) => void
  'game:playerEliminated': (payload: PlayerEliminatedPayload) => void
  'game:ended': (payload: GameEndedPayload) => void
  'chat:message': (payload: ChatMessagePayload) => void
  error: (payload: SocketErrorPayload) => void
}

export interface InterServerEvents {
  ping: () => void
}

export interface SocketData {
  lobbyId?: string
  playerId?: string
}
