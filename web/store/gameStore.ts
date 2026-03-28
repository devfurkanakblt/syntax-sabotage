import { create } from 'zustand'

export type Phase =
  | 'LOBBY'
  | 'ROLE_ASSIGNMENT'
  | 'CODING'
  | 'MEETING'
  | 'SHUFFLE'
  | 'VOTE_RESOLVE'
  | 'END_GAME'

export type Role = 'CREWMATE' | 'IMPOSTER'

export interface Player {
  id: string
  name: string
  isHost: boolean
  isEliminated: boolean
  role?: Role
  isReady: boolean
}

export interface GameState {
  // Player (self)
  player: Player

  // Lobby
  lobby: {
    id: string
    players: Player[]
    minPlayers: number
    status: 'waiting' | 'starting' | 'active'
  }

  // Game
  game: {
    phase: Phase
    roundIndex: number
    totalTimeLeft: number
    phaseTimeLeft: number
  }

  // Code
  code: {
    currentBuffer: string
    lastSubmissionAt: number | null
    receivedFromPlayerId: string | null
  }

  // Voting
  voting: {
    votes: Record<string, string> // voterId -> targetId
    hasVoted: boolean
  }

  // Event feed
  events: Array<{ id: string; message: string; type: 'info' | 'warn' | 'danger' | 'success'; timestamp: number }>

  // Actions
  setPhase: (phase: Phase) => void
  setPlayers: (players: Player[]) => void
  setCodeBuffer: (buffer: string) => void
  castVote: (targetId: string) => void
  addEvent: (message: string, type?: 'info' | 'warn' | 'danger' | 'success') => void
  toggleReady: () => void
  setLobbyId: (id: string) => void
  setPlayerName: (name: string) => void
}

export const useGameStore = create<GameState>((set, get) => ({
  player: {
    id: 'local-player',
    name: 'Anon_0x00',
    isHost: true,
    isEliminated: false,
    role: undefined,
    isReady: false,
  },

  lobby: {
    id: '',
    players: [],
    minPlayers: 4,
    status: 'waiting',
  },

  game: {
    phase: 'LOBBY',
    roundIndex: 0,
    totalTimeLeft: 420,
    phaseTimeLeft: 300,
  },

  code: {
    currentBuffer: `// syntax-sabotage :: round 01
// assigned from: ???
// objective: implement the missing logic below

function findTwoSum(nums: number[], target: number): number[] {
  const seen: Record<number, number> = {}
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i]
    if (seen[complement] !== undefined) {
      return [seen[complement], i]
    }
    seen[nums[i]] = i
  }
  return [] // unreachable
}

// TODO: handle edge cases — or maybe leave them broken? 😈
`,
    lastSubmissionAt: null,
    receivedFromPlayerId: null,
  },

  voting: {
    votes: {},
    hasVoted: false,
  },

  events: [
    { id: '1', message: 'Game session initialized.', type: 'info', timestamp: Date.now() - 5000 },
    { id: '2', message: 'Waiting for players to join...', type: 'info', timestamp: Date.now() - 3000 },
  ],

  setPhase: (phase) =>
    set((s) => ({
      game: { ...s.game, phase },
      events: [
        ...s.events,
        {
          id: Date.now().toString(),
          message: `// phase transition → ${phase}`,
          type: phase === 'CODING' ? 'success' : phase === 'VOTE_RESOLVE' ? 'danger' : 'warn',
          timestamp: Date.now(),
        },
      ],
    })),

  setPlayers: (players) =>
    set((s) => ({ lobby: { ...s.lobby, players } })),

  setCodeBuffer: (buffer) =>
    set((s) => ({ code: { ...s.code, currentBuffer: buffer, lastSubmissionAt: Date.now() } })),

  castVote: (targetId) =>
    set((s) => {
      if (s.voting.hasVoted) return s
      const target = s.lobby.players.find((p) => p.id === targetId)
      return {
        voting: {
          votes: { ...s.voting.votes, [s.player.id]: targetId },
          hasVoted: true,
        },
        events: [
          ...s.events,
          {
            id: Date.now().toString(),
            message: `You voted against ${target?.name ?? targetId}.`,
            type: 'warn',
            timestamp: Date.now(),
          },
        ],
      }
    }),

  addEvent: (message, type = 'info') =>
    set((s) => ({
      events: [
        ...s.events,
        { id: Date.now().toString(), message, type, timestamp: Date.now() },
      ],
    })),

  toggleReady: () =>
    set((s) => ({ player: { ...s.player, isReady: !s.player.isReady } })),

  setLobbyId: (id) =>
    set((s) => ({ lobby: { ...s.lobby, id } })),

  setPlayerName: (name) =>
    set((s) => ({ player: { ...s.player, name } })),
}))
