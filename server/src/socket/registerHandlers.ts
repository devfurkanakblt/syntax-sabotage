import type { Server, Socket } from 'socket.io'
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketAck,
  SocketData,
} from '../../../shared/socketProtocol'
import { ServerError } from '../errors/ServerError'
import { LobbyService } from '../services/lobbyService'

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>

const lobbyTickers = new Map<string, NodeJS.Timeout>()

function normalizeLobbyId(lobbyId: string): string {
  return lobbyId.trim().toUpperCase()
}

function stopLobbyTicker(lobbyId: string): void {
  const timer = lobbyTickers.get(lobbyId)
  if (!timer) {
    return
  }
  clearInterval(timer)
  lobbyTickers.delete(lobbyId)
}

function startLobbyTicker(io: TypedServer, lobbyService: LobbyService, lobbyId: string): void {
  if (lobbyTickers.has(lobbyId)) {
    return
  }

  const timer = setInterval(() => {
    if (!lobbyService.hasLobby(lobbyId)) {
      stopLobbyTicker(lobbyId)
      return
    }

    try {
      const { snapshot, tick } = lobbyService.tickLobby(lobbyId)

      io.to(lobbyId).emit('game:timerTick', {
        lobbyId,
        phaseTimeLeft: tick.timerTick.phaseTimeLeft,
        totalTimeLeft: tick.timerTick.totalTimeLeft,
      })

      io.to(lobbyId).emit('game:state', {
        lobbyId,
        game: snapshot.game,
      })

      if (tick.phaseChanged) {
        io.to(lobbyId).emit('game:phaseChanged', {
          lobbyId,
          phase: tick.phaseChanged.phase,
          roundIndex: tick.phaseChanged.roundIndex,
        })
      }

      if (tick.codeAssigned) {
        io.to(lobbyId).emit('game:codeAssigned', {
          lobbyId,
          assignments: tick.codeAssigned.assignments,
          buffers: tick.codeAssigned.buffers,
        })
      }

      if (tick.voteResolution) {
        io.to(lobbyId).emit('game:voteResult', {
          lobbyId,
          votes: tick.voteResolution.votes,
          tally: tick.voteResolution.tally,
        })
      }

      if (tick.playerEliminated) {
        io.to(lobbyId).emit('game:playerEliminated', {
          lobbyId,
          playerId: tick.playerEliminated.playerId,
        })
      }

      if (tick.phaseChanged || tick.codeAssigned || tick.voteResolution || tick.playerEliminated || tick.ended) {
        io.to(lobbyId).emit('lobby:updated', snapshot)
      }

      if (tick.ended) {
        io.to(lobbyId).emit('game:ended', {
          lobbyId,
          winner: tick.ended.winner,
          reason: tick.ended.reason,
        })

        void lobbyService.finalizePayout(lobbyId, tick.ended.winner)
          .then((payout) => {
            io.to(lobbyId).emit('game:payoutStatus', {
              lobbyId,
              status: payout.status,
              txHash: payout.txHash,
              detail: payout.detail,
            })
          })
          .catch((error) => {
            io.to(lobbyId).emit('game:payoutStatus', {
              lobbyId,
              status: 'failed',
              detail: `payout finalize error: ${String(error)}`,
            })
          })

        stopLobbyTicker(lobbyId)
      }
    } catch {
      stopLobbyTicker(lobbyId)
    }
  }, 1000)

  lobbyTickers.set(lobbyId, timer)
}

function ackOk<T>(ack: ((response: SocketAck<T>) => void) | undefined, data?: T): void {
  if (!ack) return
  ack({ ok: true, data })
}

function ackError<T>(ack: ((response: SocketAck<T>) => void) | undefined, code: string, message: string): void {
  if (!ack) return
  ack({
    ok: false,
    error: {
      code: code as never,
      message,
    },
  })
}

function resolveError(err: unknown): { code: string; message: string } {
  if (err instanceof ServerError) {
    return {
      code: err.code,
      message: err.message,
    }
  }

  return {
    code: 'INTERNAL_ERROR',
    message: 'Unexpected server error.',
  }
}

export function registerHandlers(io: TypedServer, socket: TypedSocket, lobbyService: LobbyService): void {
  socket.on('lobby:create', (payload, ack) => {
    try {
      const created = lobbyService.createLobby(payload, socket.id)
      socket.data.lobbyId = created.lobby.id
      socket.data.playerId = created.playerId
      socket.join(created.lobby.id)

      io.to(created.lobby.id).emit('lobby:updated', created.lobby)
      io.to(created.lobby.id).emit('game:state', {
        lobbyId: created.lobby.id,
        game: lobbyService.getGameState(created.lobby.id),
      })

      ackOk(ack, created)
    } catch (err) {
      const resolved = resolveError(err)
      socket.emit('error', resolved as never)
      ackError(ack, resolved.code, resolved.message)
    }
  })

  socket.on('lobby:join', (payload, ack) => {
    try {
      const joined = lobbyService.joinLobby(payload, socket.id)
      socket.data.lobbyId = joined.lobby.id
      socket.data.playerId = joined.playerId
      socket.join(joined.lobby.id)

      io.to(joined.lobby.id).emit('lobby:updated', joined.lobby)
      io.to(joined.lobby.id).emit('game:state', {
        lobbyId: joined.lobby.id,
        game: lobbyService.getGameState(joined.lobby.id),
      })

      if (joined.lobby.status !== 'waiting' && joined.lobby.game.phase !== 'END_GAME') {
        startLobbyTicker(io, lobbyService, joined.lobby.id)
      }

      ackOk(ack, joined)
    } catch (err) {
      const resolved = resolveError(err)
      socket.emit('error', resolved as never)
      ackError(ack, resolved.code, resolved.message)
    }
  })

  socket.on('lobby:leave', (payload, ack) => {
    try {
      const playerId = socket.data.playerId
      if (!playerId) {
        throw new ServerError('UNAUTHORIZED', 'No active player session for this socket.')
      }

      const lobbyId = payload.lobbyId.trim().toUpperCase()
      const snapshot = lobbyService.leaveLobby(lobbyId, playerId)

      socket.leave(lobbyId)
      socket.data.playerId = undefined
      socket.data.lobbyId = undefined

      if (snapshot) {
        io.to(lobbyId).emit('lobby:updated', snapshot)
        io.to(lobbyId).emit('game:state', {
          lobbyId,
          game: lobbyService.getGameState(lobbyId),
        })
      } else {
        stopLobbyTicker(lobbyId)
      }

      ackOk(ack)
    } catch (err) {
      const resolved = resolveError(err)
      socket.emit('error', resolved as never)
      ackError(ack, resolved.code, resolved.message)
    }
  })

  socket.on('player:ready', (payload, ack) => {
    try {
      const playerId = socket.data.playerId
      if (!playerId) {
        throw new ServerError('UNAUTHORIZED', 'No active player session for this socket.')
      }

      const lobbyId = payload.lobbyId.trim().toUpperCase()
      const snapshot = lobbyService.toggleReady(lobbyId, playerId, payload.isReady)
      io.to(lobbyId).emit('lobby:updated', snapshot)
      ackOk(ack)
    } catch (err) {
      const resolved = resolveError(err)
      socket.emit('error', resolved as never)
      ackError(ack, resolved.code, resolved.message)
    }
  })

  socket.on('game:start', async (payload, ack) => {
    try {
      const playerId = socket.data.playerId
      if (!playerId) {
        throw new ServerError('UNAUTHORIZED', 'No active player session for this socket.')
      }

      const lobbyId = payload.lobbyId.trim().toUpperCase()
      const startingSnapshot = await lobbyService.startGame(lobbyId, playerId)

      io.to(lobbyId).emit('lobby:updated', startingSnapshot)
      io.to(lobbyId).emit('game:phaseChanged', {
        lobbyId,
        phase: 'ROLE_ASSIGNMENT',
        roundIndex: startingSnapshot.game.roundIndex,
      })
      io.to(lobbyId).emit('game:state', {
        lobbyId,
        game: lobbyService.getGameState(lobbyId),
      })

      startLobbyTicker(io, lobbyService, lobbyId)

      ackOk(ack)
    } catch (err) {
      const resolved = resolveError(err)
      socket.emit('error', resolved as never)
      ackError(ack, resolved.code, resolved.message)
    }
  })

  socket.on('code:submit', (payload, ack) => {
    try {
      const playerId = socket.data.playerId
      if (!playerId) {
        throw new ServerError('UNAUTHORIZED', 'No active player session for this socket.')
      }

      lobbyService.submitCode(payload, playerId)
      ackOk(ack)
    } catch (err) {
      const resolved = resolveError(err)
      socket.emit('error', resolved as never)
      ackError(ack, resolved.code, resolved.message)
    }
  })

  socket.on('vote:cast', (payload, ack) => {
    try {
      const playerId = socket.data.playerId
      if (!playerId) {
        throw new ServerError('UNAUTHORIZED', 'No active player session for this socket.')
      }

      const lobbyId = normalizeLobbyId(payload.lobbyId)
      const voteState = lobbyService.castVote(payload, playerId)
      io.to(lobbyId).emit('game:voteResult', {
        lobbyId,
        votes: voteState.votes,
        tally: voteState.tally,
      })

      ackOk(ack)
    } catch (err) {
      const resolved = resolveError(err)
      socket.emit('error', resolved as never)
      ackError(ack, resolved.code, resolved.message)
    }
  })

  socket.on('chat:send', (payload, ack) => {
    try {
      const playerId = socket.data.playerId
      if (!playerId) {
        throw new ServerError('UNAUTHORIZED', 'No active player session for this socket.')
      }

      const lobbyId = payload.lobbyId.trim().toUpperCase()
      const chat = lobbyService.sendChat(payload, playerId)

      io.to(lobbyId).emit('chat:message', {
        lobbyId,
        playerId,
        playerName: chat.playerName,
        text: chat.text,
        timestamp: chat.timestamp,
      })

      ackOk(ack)
    } catch (err) {
      const resolved = resolveError(err)
      socket.emit('error', resolved as never)
      ackError(ack, resolved.code, resolved.message)
    }
  })

  socket.on('disconnect', () => {
    const snapshot = lobbyService.handleDisconnect(socket.id)
    const lobbyId = socket.data.lobbyId
    if (!snapshot || !lobbyId) {
      if (lobbyId) {
        stopLobbyTicker(lobbyId)
      }
      return
    }

    io.to(lobbyId).emit('lobby:updated', snapshot)
    io.to(lobbyId).emit('game:state', {
      lobbyId,
      game: lobbyService.getGameState(lobbyId),
    })

    if (snapshot.players.length === 0) {
      stopLobbyTicker(lobbyId)
    }
  })
}
