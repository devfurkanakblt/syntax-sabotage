import { io, type Socket } from 'socket.io-client'
import { bootstrapPresentationLobby } from './mockEvents'
import { isPresentationMode } from './presentationMode'

export type Phase =
  | 'LOBBY'
  | 'ROLE_ASSIGNMENT'
  | 'CODING'
  | 'MEETING'
  | 'SHUFFLE'
  | 'VOTE_RESOLVE'
  | 'END_GAME'

export interface SocketErrorPayload {
  code: string
  message: string
}

export interface GameSnapshot {
  phase: Phase
  roundIndex: number
  totalTimeLeft: number
  phaseTimeLeft: number
  startedAt: number | null
}

export interface LobbyPlayerSnapshot {
  id: string
  name: string
  walletAddress?: string
  isHost: boolean
  isReady: boolean
  isEliminated: boolean
  isConnected: boolean
}

export interface LobbySnapshot {
  id: string
  minPlayers: number
  status: 'waiting' | 'starting' | 'active' | 'ended'
  players: LobbyPlayerSnapshot[]
  game: GameSnapshot
  createdAt: number
  updatedAt: number
}

interface Ack<T = void> {
  ok: boolean
  data?: T
  error?: SocketErrorPayload
}

interface LobbyCreateAck {
  lobby: LobbySnapshot
  playerId: string
}

interface LobbyJoinAck {
  lobby: LobbySnapshot
  playerId: string
  reconnected: boolean
}

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL?.trim() || 'http://localhost:4001'

let socket: Socket | null = null

function getSocketInstance(): Socket {
  if (isPresentationMode()) {
    throw new Error('Socket instance is unavailable in presentation mode')
  }

  if (socket) {
    return socket
  }

  socket = io(SERVER_URL, {
    autoConnect: true,
    timeout: 8000,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  })

  return socket
}

function emitWithAck<T>(event: string, payload: unknown): Promise<T> {
  const s = getSocketInstance()

  return new Promise((resolve, reject) => {
    s.emit(event, payload, (ack: Ack<T>) => {
      if (ack?.ok) {
        resolve(ack.data as T)
        return
      }

      reject(new Error(ack?.error?.message ?? 'Unknown socket error'))
    })
  })
}

export function getGameSocket(): Socket {
  if (isPresentationMode()) {
    throw new Error('Socket instance is unavailable in presentation mode')
  }

  return getSocketInstance()
}

export function reconnectGameSocket(): void {
  if (isPresentationMode()) {
    return
  }

  const s = getSocketInstance()
  s.disconnect()
  s.connect()
}

export async function createLobbySession(input: {
  lobbyId?: string
  playerName: string
  walletAddress?: string
  minPlayers?: number
}): Promise<LobbyCreateAck> {
  if (isPresentationMode()) {
    const generatedLobbyId = input.lobbyId?.trim().toUpperCase() || 'DEMO42'
    return bootstrapPresentationLobby({
      lobbyId: generatedLobbyId,
      playerName: input.playerName,
      walletAddress: input.walletAddress,
      minPlayers: input.minPlayers,
    })
  }

  return emitWithAck<LobbyCreateAck>('lobby:create', input)
}

export async function joinLobbySession(input: {
  lobbyId: string
  playerName: string
  walletAddress?: string
  playerId?: string
}): Promise<LobbyJoinAck> {
  if (isPresentationMode()) {
    const result = bootstrapPresentationLobby({
      lobbyId: input.lobbyId,
      playerName: input.playerName,
      walletAddress: input.walletAddress,
    })

    return {
      ...result,
      reconnected: true,
    }
  }

  return emitWithAck<LobbyJoinAck>('lobby:join', input)
}

export async function leaveLobbySession(lobbyId: string): Promise<void> {
  if (isPresentationMode()) {
    return
  }

  await emitWithAck('lobby:leave', { lobbyId })
}

export async function setReadyState(lobbyId: string, isReady: boolean): Promise<void> {
  if (isPresentationMode()) {
    return
  }

  await emitWithAck('player:ready', { lobbyId, isReady })
}

export async function requestGameStart(lobbyId: string): Promise<void> {
  if (isPresentationMode()) {
    return
  }

  await emitWithAck('game:start', { lobbyId })
}

export async function submitCodeBuffer(lobbyId: string, code: string): Promise<void> {
  if (isPresentationMode()) {
    return
  }

  await emitWithAck('code:submit', { lobbyId, code })
}

export async function castVoteRequest(lobbyId: string, targetPlayerId: string): Promise<void> {
  if (isPresentationMode()) {
    return
  }

  await emitWithAck('vote:cast', { lobbyId, targetPlayerId })
}
