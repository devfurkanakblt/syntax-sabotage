import { useGameStore, Phase, Player, Role } from '../store/gameStore'
import type { GameSnapshot, LobbySnapshot } from './socketClient'

export const mockPlayers: Player[] = [
  { id: 'p1', name: 'nullptr_exception', isHost: true, isEliminated: false, isReady: true },
  { id: 'p2', name: 'x0r_cipher', isHost: false, isEliminated: false, isReady: true },
  { id: 'p3', name: 'segfault_sam', isHost: false, isEliminated: false, isReady: false },
  { id: 'p4', name: 'root_0xff', isHost: false, isEliminated: false, isReady: true },
]

const PHASE_TIMERS: Record<Phase, number> = {
  LOBBY: 0,
  ROLE_ASSIGNMENT: 5,
  CODING: 300,
  MEETING: 120,
  SHUFFLE: 5,
  VOTE_RESOLVE: 45,
  END_GAME: 0,
}

const PHASE_ORDER: Phase[] = [
  'LOBBY',
  'ROLE_ASSIGNMENT',
  'CODING',
  'MEETING',
  'SHUFFLE',
  'VOTE_RESOLVE',
  'END_GAME',
]

export function simulatePhase(phase: Phase) {
  const store = useGameStore.getState()
  store.applyGameSnapshot({
    phase,
    roundIndex: store.game.roundIndex,
    totalTimeLeft: Math.max(0, store.game.totalTimeLeft),
    phaseTimeLeft: PHASE_TIMERS[phase],
    startedAt: Date.now(),
  })

  switch (phase) {
    case 'ROLE_ASSIGNMENT':
      store.addEvent('Roles assigned. One among you is the Imposter.', 'warn')
      {
        const currentPlayers = store.lobby.players.length > 0 ? store.lobby.players : mockPlayers
        const imposterIndex = currentPlayers.findIndex((p) => p.id !== store.player.id)
        const pickedImposterIndex = imposterIndex >= 0 ? imposterIndex : 0

        const playersWithRoles = currentPlayers.map((p, i) => {
          const role: Role = i === pickedImposterIndex ? 'IMPOSTER' : 'CREWMATE'
          return {
          ...p,
            role,
          }
        })

        const myRole = playersWithRoles.find((p) => p.id === store.player.id)?.role ?? 'CREWMATE'
        store.setPlayers(playersWithRoles)
        useGameStore.setState((s) => ({
          player: {
            ...s.player,
            role: myRole,
          },
        }))
      }
      break
    case 'CODING':
      store.addEvent('// CODING phase started. 5:00 on the clock.', 'success')
      break
    case 'MEETING':
      store.addEvent('⚠ Emergency meeting called. Editor locked.', 'warn')
      break
    case 'SHUFFLE':
      store.addEvent('CODE SHUFFLED — check your new assignment.', 'warn')
      useGameStore.setState((s) => ({
        code: {
          ...s.code,
          receivedFromPlayerId: 'p2',
          currentBuffer: `// reassigned from: x0r_cipher
// WARNING: inspect carefully for sabotage

function mergeIntervals(intervals: number[][]): number[][] {
  intervals.sort((a, b) => a[0] - b[0])
  const result: number[][] = [intervals[0]]

  for (let i = 1; i < intervals.length; i++) {
    const last = result[result.length - 1]
    if (intervals[i][0] <= last[1]) {
      last[1] = Math.max(last[1], intervals[i][1])
    } else {
      result.push(intervals[i])        // <- suspicious branch
    }
  }

  return result
}
`,
        },
      }))
      break
    case 'VOTE_RESOLVE': {
      const eliminated = mockPlayers[2]
      store.addEvent(`${eliminated.name} was eliminated by vote.`, 'danger')
      store.setPlayers(
        mockPlayers.map((p) =>
          p.id === eliminated.id ? { ...p, isEliminated: true } : p
        )
      )
      break
    }
    case 'END_GAME':
      store.addEvent('GAME OVER — Crewmates failed to fix the code in time.', 'danger')
      break
  }
}

export function simulateNextPhase() {
  const { game } = useGameStore.getState()
  const idx = PHASE_ORDER.indexOf(game.phase)
  const next = PHASE_ORDER[Math.min(idx + 1, PHASE_ORDER.length - 1)]
  simulatePhase(next)
}

export function initMockLobby(lobbyId: string) {
  const store = useGameStore.getState()
  store.setLobbyId(lobbyId)
  store.setPlayers(mockPlayers)
  store.addEvent(`Joined lobby ${lobbyId.toUpperCase()}`, 'success')
}

export function createPresentationLobbySnapshot(input: {
  lobbyId: string
  playerName: string
  walletAddress?: string
  minPlayers?: number
}): { lobby: LobbySnapshot; playerId: string } {
  const normalizedLobbyId = input.lobbyId.trim().toUpperCase()
  const playerId = 'demo-you'
  const minPlayers = input.minPlayers ?? 4
  const now = Date.now()

  const demoPlayers = [
    {
      id: playerId,
      name: input.playerName,
      walletAddress: input.walletAddress,
      isHost: true,
      isReady: true,
      isEliminated: false,
      isConnected: true,
    },
    {
      id: 'demo-p2',
      name: 'x0r_cipher',
      walletAddress: undefined,
      isHost: false,
      isReady: true,
      isEliminated: false,
      isConnected: true,
    },
    {
      id: 'demo-p3',
      name: 'segfault_sam',
      walletAddress: undefined,
      isHost: false,
      isReady: true,
      isEliminated: false,
      isConnected: true,
    },
    {
      id: 'demo-p4',
      name: 'root_0xff',
      walletAddress: undefined,
      isHost: false,
      isReady: true,
      isEliminated: false,
      isConnected: true,
    },
  ]

  const game: GameSnapshot = {
    phase: 'LOBBY',
    roundIndex: 0,
    totalTimeLeft: 420,
    phaseTimeLeft: 0,
    startedAt: null,
  }

  return {
    playerId,
    lobby: {
      id: normalizedLobbyId,
      minPlayers,
      status: 'waiting',
      players: demoPlayers,
      game,
      createdAt: now,
      updatedAt: now,
    },
  }
}

export function bootstrapPresentationLobby(input: {
  lobbyId: string
  playerName: string
  walletAddress?: string
  minPlayers?: number
}): { lobby: LobbySnapshot; playerId: string } {
  const result = createPresentationLobbySnapshot(input)
  const store = useGameStore.getState()

  store.setPlayerId(result.playerId)
  store.setPlayerName(input.playerName)
  if (input.walletAddress) {
    store.setPlayerWallet(input.walletAddress)
  }
  store.applyLobbySnapshot(result.lobby)
  store.applyGameSnapshot(result.lobby.game)
  store.setConnectionState('connected')
  store.resetVoteState()
  store.addEvent('presentation_mode: mock lobby bootstrapped', 'success')

  return result
}
