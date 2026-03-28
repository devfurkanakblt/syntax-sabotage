'use client'

import { useEffect } from 'react'
import { useAccount } from 'wagmi'
import { getGameSocket, joinLobbySession, type LobbySnapshot, type SocketErrorPayload } from './socketClient'
import { bootstrapPresentationLobby } from './mockEvents'
import { isPresentationMode } from './presentationMode'
import { useGameStore } from '../store/gameStore'
import { getLobbySession, setLobbySession } from './lobbySession'

function normalizeLobbyId(lobbyId: string): string {
  return lobbyId.trim().toUpperCase()
}

export function useLobbySocketSync(lobbyId: string) {
  const { address } = useAccount()

  useEffect(() => {
    const normalizedLobbyId = normalizeLobbyId(lobbyId)
    if (!normalizedLobbyId) {
      return
    }

    if (isPresentationMode()) {
      const state = useGameStore.getState()
      const currentLobbyId = normalizeLobbyId(state.lobby.id)
      const walletAddress = address?.toLowerCase()

      if (walletAddress) {
        state.setPlayerWallet(walletAddress)
      }

      if (currentLobbyId !== normalizedLobbyId || state.lobby.players.length === 0) {
        bootstrapPresentationLobby({
          lobbyId: normalizedLobbyId,
          playerName: state.player.name || 'Presenter_0x01',
          walletAddress,
        })
      } else {
        state.setConnectionState('connected')
      }

      return
    }

    const socket = getGameSocket()
    const store = useGameStore.getState()
    store.setConnectionState('connecting')

    const syncJoin = async () => {
      const state = useGameStore.getState()
      const walletAddress = address?.toLowerCase()
      const persisted = getLobbySession(normalizedLobbyId)

      if (walletAddress) {
        state.setPlayerWallet(walletAddress)
      }

      try {
        const candidatePlayerId = persisted?.playerId
          ?? (state.player.id.startsWith('local-') ? undefined : state.player.id)
        const candidatePlayerName = state.player.name || persisted?.playerName || 'Anon_0x00'

        const joined = await joinLobbySession({
          lobbyId: normalizedLobbyId,
          playerName: candidatePlayerName,
          playerId: candidatePlayerId,
          walletAddress,
        })

        const next = useGameStore.getState()
        next.setPlayerId(joined.playerId)
        next.setLobbyId(joined.lobby.id)
        next.applyLobbySnapshot(joined.lobby)
        next.applyGameSnapshot(joined.lobby.game)
        next.setConnectionState('connected')
        setLobbySession({
          lobbyId: joined.lobby.id,
          playerId: joined.playerId,
          playerName: candidatePlayerName,
          walletAddress,
        })
      } catch (error) {
        useGameStore.getState().setConnectionState('error', String(error))
        useGameStore.getState().addEvent(`socket_join_failed: ${String(error)}`, 'danger')
      }
    }

    const onConnect = () => {
      useGameStore.getState().setConnectionState('connected')
      void syncJoin()
    }

    const onConnectError = (error: Error) => {
      useGameStore.getState().setConnectionState('error', error.message)
      useGameStore.getState().addEvent(`socket_connect_error: ${error.message}`, 'danger')
    }

    const onDisconnect = () => {
      useGameStore.getState().setConnectionState('idle')
    }

    const onLobbyUpdated = (snapshot: LobbySnapshot) => {
      if (normalizeLobbyId(snapshot.id) !== normalizedLobbyId) return
      useGameStore.getState().applyLobbySnapshot(snapshot)
    }

    const onGameState = (payload: { lobbyId: string; game: LobbySnapshot['game'] }) => {
      if (normalizeLobbyId(payload.lobbyId) !== normalizedLobbyId) return
      useGameStore.getState().applyGameSnapshot(payload.game)
    }

    const onPhaseChanged = (payload: { lobbyId: string; phase: string; roundIndex: number }) => {
      if (normalizeLobbyId(payload.lobbyId) !== normalizedLobbyId) return
      useGameStore.getState().addEvent(`// phase -> ${payload.phase} (round ${payload.roundIndex + 1})`, 'warn')
      if (payload.phase === 'CODING') {
        useGameStore.getState().resetVoteState()
      }
    }

    const onTimerTick = (payload: { lobbyId: string; phaseTimeLeft: number; totalTimeLeft: number }) => {
      if (normalizeLobbyId(payload.lobbyId) !== normalizedLobbyId) return
      useGameStore.getState().applyTimerTick(payload.phaseTimeLeft, payload.totalTimeLeft)
    }

    const onCodeAssigned = (payload: { lobbyId: string; assignments: Record<string, string>; buffers?: Record<string, string> }) => {
      if (normalizeLobbyId(payload.lobbyId) !== normalizedLobbyId) return
      const state = useGameStore.getState()
      const selfId = state.player.id
      const receivedFrom = payload.assignments[selfId] ?? null
      const newBuffer = payload.buffers?.[selfId]
      state.applyCodeAssignment(receivedFrom, newBuffer)
      state.addEvent(`Received shuffled code from ${receivedFrom ?? 'unknown'}.`, 'warn')
    }

    const onVoteResult = (payload: { lobbyId: string; votes: Record<string, string>; tally: Record<string, number> }) => {
      if (normalizeLobbyId(payload.lobbyId) !== normalizedLobbyId) return
      useGameStore.getState().setVoteState(payload.votes)
    }

    const onPlayerEliminated = (payload: { lobbyId: string; playerId: string }) => {
      if (normalizeLobbyId(payload.lobbyId) !== normalizedLobbyId) return
      const state = useGameStore.getState()
      const player = state.lobby.players.find((p) => p.id === payload.playerId)
      state.addEvent(`${player?.name ?? payload.playerId} was eliminated.`, 'danger')
    }

    const onGameEnded = (payload: {
      lobbyId: string
      winner: 'CREWMATES' | 'IMPOSTER'
      reason: 'code_fixed_in_time' | 'imposter_found_in_time' | 'all_crewmates_eliminated' | 'timeout_failed_tests'
    }) => {
      if (normalizeLobbyId(payload.lobbyId) !== normalizedLobbyId) return

      let summary = `GAME ENDED: ${payload.winner}`
      if (payload.winner === 'CREWMATES' && payload.reason === 'code_fixed_in_time') {
        summary = 'CREWMATES WIN: code fixed in time -> debugger soulbound NFT minted'
      } else if (payload.winner === 'CREWMATES' && payload.reason === 'imposter_found_in_time') {
        summary = 'CREWMATES WIN: imposter found in time -> de-impostorer soulbound NFT minted'
      } else if (payload.reason === 'all_crewmates_eliminated') {
        summary = 'IMPOSTER WIN: all crewmates eliminated'
      } else if (payload.reason === 'timeout_failed_tests') {
        summary = 'IMPOSTER WIN: timer expired and hidden tests failed'
      }

      useGameStore.getState().addEvent(summary, payload.winner === 'CREWMATES' ? 'success' : 'danger')
    }

    const onPayout = (payload: { lobbyId: string; status: string; txHash?: string; detail: string }) => {
      if (normalizeLobbyId(payload.lobbyId) !== normalizedLobbyId) return
      const detail = payload.txHash ? `${payload.detail} tx=${payload.txHash}` : payload.detail
      useGameStore.getState().addEvent(`payout_status(${payload.status}): ${detail}`, payload.status === 'failed' ? 'danger' : 'success')
    }

    const onChat = (payload: { lobbyId: string; playerName: string; text: string }) => {
      if (normalizeLobbyId(payload.lobbyId) !== normalizedLobbyId) return
      useGameStore.getState().addEvent(`${payload.playerName}: ${payload.text}`, 'info')
    }

    const onError = (payload: SocketErrorPayload) => {
      useGameStore.getState().setConnectionState('error', payload.message)
      useGameStore.getState().addEvent(`${payload.code}: ${payload.message}`, 'danger')
    }

    socket.on('connect', onConnect)
    socket.on('connect_error', onConnectError)
    socket.on('disconnect', onDisconnect)
    socket.on('lobby:updated', onLobbyUpdated)
    socket.on('game:state', onGameState)
    socket.on('game:phaseChanged', onPhaseChanged)
    socket.on('game:timerTick', onTimerTick)
    socket.on('game:codeAssigned', onCodeAssigned)
    socket.on('game:voteResult', onVoteResult)
    socket.on('game:playerEliminated', onPlayerEliminated)
    socket.on('game:ended', onGameEnded)
    socket.on('game:payoutStatus', onPayout)
    socket.on('chat:message', onChat)
    socket.on('error', onError)

    if (socket.connected) {
      void syncJoin()
    } else {
      socket.connect()
    }

    return () => {
      socket.off('connect', onConnect)
      socket.off('connect_error', onConnectError)
      socket.off('disconnect', onDisconnect)
      socket.off('lobby:updated', onLobbyUpdated)
      socket.off('game:state', onGameState)
      socket.off('game:phaseChanged', onPhaseChanged)
      socket.off('game:timerTick', onTimerTick)
      socket.off('game:codeAssigned', onCodeAssigned)
      socket.off('game:voteResult', onVoteResult)
      socket.off('game:playerEliminated', onPlayerEliminated)
      socket.off('game:ended', onGameEnded)
      socket.off('game:payoutStatus', onPayout)
      socket.off('chat:message', onChat)
      socket.off('error', onError)
    }
  }, [address, lobbyId])
}
