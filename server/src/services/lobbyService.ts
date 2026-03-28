import type {
  ChatSendRequest,
  CodeSubmitRequest,
  LobbyCreateRequest,
  LobbyCreateResponse,
  LobbyJoinRequest,
  LobbyJoinResponse,
  VoteCastRequest,
} from '../../../shared/socketProtocol'
import type { LobbySnapshot } from '../../../shared/gameTypes'
import { ServerError } from '../errors/ServerError'
import { toLobbySnapshot, type LobbyState } from '../state/types'
import { generateLobbyId } from '../utils/id'
import { GameService, type GameTickOutcome, type VoteResolution } from './gameService'
import { PlayerService } from './playerService'

const DISCONNECT_GRACE_MS = Number(process.env.DISCONNECT_GRACE_MS ?? 30000)

interface SocketSession {
  lobbyId: string
  playerId: string
}

export class LobbyService {
  private readonly lobbies = new Map<string, LobbyState>()
  private readonly socketSessions = new Map<string, SocketSession>()
  private readonly playerService = new PlayerService()
  private readonly gameService = new GameService()

  public createLobby(payload: LobbyCreateRequest, socketId: string): LobbyCreateResponse {
    const requestedId = payload.lobbyId?.trim().toUpperCase()
    const lobbyId = requestedId && requestedId.length > 0 ? requestedId : this.allocateLobbyId()

    if (this.lobbies.has(lobbyId)) {
      throw new ServerError('LOBBY_ALREADY_EXISTS', `Lobby ${lobbyId} already exists.`)
    }

    const host = this.playerService.createPlayer({
      name: payload.playerName,
      socketId,
      isHost: true,
    })

    const now = Date.now()
    const lobby: LobbyState = {
      id: lobbyId,
      minPlayers: Math.max(4, payload.minPlayers ?? 4),
      status: 'waiting',
      players: new Map([[host.id, host]]),
      hostId: host.id,
      game: {
        phase: 'LOBBY',
        roundIndex: 0,
        totalTimeLeft: Number(process.env.GAME_TOTAL_SECONDS ?? 420),
        phaseTimeLeft: Number(process.env.PHASE_CODING_SECONDS ?? 300),
        startedAt: null,
      },
      codeByPlayer: {},
      votes: {},
      shuffleHistory: [],
      eliminationHistory: [],
      createdAt: now,
      updatedAt: now,
      disconnectTimers: new Map(),
    }

    this.lobbies.set(lobbyId, lobby)
    this.socketSessions.set(socketId, { lobbyId, playerId: host.id })

    return {
      lobby: toLobbySnapshot(lobby),
      playerId: host.id,
    }
  }

  public joinLobby(payload: LobbyJoinRequest, socketId: string): LobbyJoinResponse {
    const lobby = this.requireLobby(payload.lobbyId)

    if (payload.playerId) {
      const reconnecting = lobby.players.get(payload.playerId)
      if (reconnecting) {
        this.clearDisconnectTimer(lobby, reconnecting.id)
        this.playerService.attachSocket(reconnecting, socketId, payload.playerName)
        lobby.updatedAt = Date.now()

        this.socketSessions.set(socketId, { lobbyId: lobby.id, playerId: reconnecting.id })

        return {
          lobby: toLobbySnapshot(lobby),
          playerId: reconnecting.id,
          reconnected: true,
        }
      }
    }

    if (lobby.status !== 'waiting') {
      throw new ServerError('GAME_ALREADY_STARTED', 'Cannot join. The game has already started.')
    }

    const player = this.playerService.createPlayer({
      name: payload.playerName,
      socketId,
      isHost: false,
    })

    lobby.players.set(player.id, player)
    lobby.updatedAt = Date.now()
    this.socketSessions.set(socketId, { lobbyId: lobby.id, playerId: player.id })

    return {
      lobby: toLobbySnapshot(lobby),
      playerId: player.id,
      reconnected: false,
    }
  }

  public leaveLobby(lobbyId: string, playerId: string): LobbySnapshot | null {
    const lobby = this.requireLobby(lobbyId)
    this.finalizePlayerRemoval(lobby, playerId)
    return this.afterLobbyMutation(lobby)
  }

  public handleDisconnect(socketId: string): LobbySnapshot | null {
    const session = this.socketSessions.get(socketId)
    if (!session) {
      return null
    }

    this.socketSessions.delete(socketId)
    const lobby = this.lobbies.get(session.lobbyId)
    if (!lobby) {
      return null
    }

    const player = lobby.players.get(session.playerId)
    if (!player) {
      return toLobbySnapshot(lobby)
    }

    player.isConnected = false
    lobby.updatedAt = Date.now()

    if (player.isHost) {
      this.reassignHost(lobby, player.id)
    }

    this.clearDisconnectTimer(lobby, player.id)
    const timer = setTimeout(() => {
      const l = this.lobbies.get(lobby.id)
      if (!l) return
      const disconnected = l.players.get(player.id)
      if (!disconnected || disconnected.isConnected) return
      this.finalizePlayerRemoval(l, disconnected.id)
      this.afterLobbyMutation(l)
    }, DISCONNECT_GRACE_MS)

    lobby.disconnectTimers.set(player.id, timer)
    return toLobbySnapshot(lobby)
  }

  public toggleReady(lobbyId: string, playerId: string, isReady?: boolean): LobbySnapshot {
    const lobby = this.requireLobby(lobbyId)
    if (lobby.status !== 'waiting') {
      throw new ServerError('INVALID_PHASE', 'Ready toggle is only allowed in lobby phase.')
    }

    const player = lobby.players.get(playerId)
    if (!player) {
      throw new ServerError('PLAYER_NOT_FOUND', 'Player was not found in this lobby.')
    }

    player.isReady = typeof isReady === 'boolean' ? isReady : !player.isReady
    lobby.updatedAt = Date.now()
    return toLobbySnapshot(lobby)
  }

  public startGame(lobbyId: string, requesterId: string): LobbySnapshot {
    const lobby = this.requireLobby(lobbyId)
    const requester = lobby.players.get(requesterId)

    if (!requester) {
      throw new ServerError('PLAYER_NOT_FOUND', 'Requester was not found in this lobby.')
    }
    if (!requester.isHost) {
      throw new ServerError('NOT_HOST', 'Only host can start the game.')
    }
    if (lobby.players.size < lobby.minPlayers) {
      throw new ServerError('MIN_PLAYERS_NOT_MET', `Need at least ${lobby.minPlayers} players to start.`)
    }
    if (lobby.status !== 'waiting') {
      throw new ServerError('GAME_ALREADY_STARTED', 'Game has already started in this lobby.')
    }

    this.gameService.startGame(lobby)
    return toLobbySnapshot(lobby)
  }

  public tickLobby(lobbyId: string): { snapshot: LobbySnapshot; tick: GameTickOutcome } {
    const lobby = this.requireLobby(lobbyId)
    const tick = this.gameService.tick(lobby)
    lobby.updatedAt = Date.now()
    return {
      snapshot: toLobbySnapshot(lobby),
      tick,
    }
  }

  public submitCode(payload: CodeSubmitRequest, playerId: string): void {
    const lobby = this.requireLobby(payload.lobbyId)
    if (lobby.game.phase !== 'CODING') {
      throw new ServerError('INVALID_PHASE', 'Code submission is only allowed in coding phase.')
    }

    const player = lobby.players.get(playerId)
    if (!player || player.isEliminated) {
      throw new ServerError('UNAUTHORIZED', 'Eliminated or unknown players cannot submit code.')
    }

    lobby.codeByPlayer[playerId] = payload.code
    lobby.updatedAt = Date.now()
  }

  public castVote(payload: VoteCastRequest, playerId: string): VoteResolution {
    const lobby = this.requireLobby(payload.lobbyId)
    if (lobby.game.phase !== 'MEETING' && lobby.game.phase !== 'VOTE_RESOLVE') {
      throw new ServerError('INVALID_PHASE', 'Voting is only allowed during meeting and vote phases.')
    }

    const voter = lobby.players.get(playerId)
    const target = lobby.players.get(payload.targetPlayerId)
    if (!voter || !target) {
      throw new ServerError('PLAYER_NOT_FOUND', 'Voter or target does not exist in this lobby.')
    }
    if (voter.isEliminated) {
      throw new ServerError('UNAUTHORIZED', 'Eliminated players cannot vote.')
    }
    if (target.isEliminated) {
      throw new ServerError('UNAUTHORIZED', 'Cannot vote for eliminated players.')
    }
    if (target.id === voter.id) {
      throw new ServerError('SELF_VOTE_FORBIDDEN', 'You cannot vote for yourself.')
    }
    if (lobby.votes[playerId]) {
      throw new ServerError('ALREADY_VOTED', 'One vote per round is allowed.')
    }

    const vote = this.gameService.castVote(lobby, voter.id, target.id)
    lobby.updatedAt = Date.now()
    return vote
  }

  public sendChat(payload: ChatSendRequest, playerId: string): { playerName: string; timestamp: number; text: string } {
    const lobby = this.requireLobby(payload.lobbyId)
    const player = lobby.players.get(playerId)
    if (!player) {
      throw new ServerError('PLAYER_NOT_FOUND', 'Cannot send chat message from unknown player.')
    }

    lobby.updatedAt = Date.now()
    return {
      playerName: player.name,
      timestamp: Date.now(),
      text: payload.text.trim().slice(0, 400),
    }
  }

  public getGameState(lobbyId: string) {
    const lobby = this.requireLobby(lobbyId)
    return { ...lobby.game }
  }

  public getPlayerIdBySocket(socketId: string): string | null {
    return this.socketSessions.get(socketId)?.playerId ?? null
  }

  public hasLobby(lobbyId: string): boolean {
    const normalized = lobbyId.trim().toUpperCase()
    return this.lobbies.has(normalized)
  }

  private requireLobby(lobbyId: string): LobbyState {
    const normalized = lobbyId.trim().toUpperCase()
    const lobby = this.lobbies.get(normalized)
    if (!lobby) {
      throw new ServerError('LOBBY_NOT_FOUND', `Lobby ${normalized} was not found.`)
    }
    return lobby
  }

  private allocateLobbyId(): string {
    let id = generateLobbyId()
    while (this.lobbies.has(id)) {
      id = generateLobbyId()
    }
    return id
  }

  private clearDisconnectTimer(lobby: LobbyState, playerId: string): void {
    const timer = lobby.disconnectTimers.get(playerId)
    if (!timer) return
    clearTimeout(timer)
    lobby.disconnectTimers.delete(playerId)
  }

  private finalizePlayerRemoval(lobby: LobbyState, playerId: string): void {
    this.clearDisconnectTimer(lobby, playerId)

    for (const [socketId, session] of this.socketSessions.entries()) {
      if (session.lobbyId === lobby.id && session.playerId === playerId) {
        this.socketSessions.delete(socketId)
      }
    }

    const leavingPlayer = lobby.players.get(playerId)
    if (!leavingPlayer) {
      return
    }

    lobby.players.delete(playerId)
    delete lobby.codeByPlayer[playerId]
    delete lobby.votes[playerId]

    for (const [voterId, targetId] of Object.entries(lobby.votes)) {
      if (targetId === playerId) {
        delete lobby.votes[voterId]
      }
    }

    if (leavingPlayer.isHost) {
      this.reassignHost(lobby, playerId)
    }

    lobby.updatedAt = Date.now()
  }

  private reassignHost(lobby: LobbyState, previousHostId: string): void {
    const newHostId = this.playerService.chooseNextHost(lobby.players)
    lobby.hostId = newHostId ?? ''

    for (const player of lobby.players.values()) {
      player.isHost = player.id === newHostId
    }

    if (previousHostId === newHostId) {
      return
    }
  }

  private afterLobbyMutation(lobby: LobbyState): LobbySnapshot | null {
    if (lobby.players.size === 0) {
      for (const timer of lobby.disconnectTimers.values()) {
        clearTimeout(timer)
      }
      this.lobbies.delete(lobby.id)
      return null
    }

    return toLobbySnapshot(lobby)
  }
}
