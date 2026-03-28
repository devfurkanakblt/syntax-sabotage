import { useGameStore, Phase, Player } from '../store/gameStore'

export const mockPlayers: Player[] = [
  { id: 'p1', name: 'nullptr_exception', isHost: true, isEliminated: false, isReady: true },
  { id: 'p2', name: 'x0r_cipher', isHost: false, isEliminated: false, isReady: true },
  { id: 'p3', name: 'segfault_sam', isHost: false, isEliminated: false, isReady: false },
  { id: 'p4', name: 'root_0xff', isHost: false, isEliminated: false, isReady: true },
]

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
  store.setPhase(phase)

  switch (phase) {
    case 'ROLE_ASSIGNMENT':
      store.addEvent('Roles assigned. One among you is the Imposter.', 'warn')
      store.setPlayers(
        mockPlayers.map((p, i) => ({
          ...p,
          role: i === 1 ? 'IMPOSTER' : 'CREWMATE',
        }))
      )
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
