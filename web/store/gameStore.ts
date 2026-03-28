import { create } from 'zustand'
import type { GameSnapshot, LobbySnapshot, Phase } from '../lib/socketClient'

export type { Phase } from '../lib/socketClient'

export type Role = 'CREWMATE' | 'IMPOSTER'

export interface Player {
  id: string
  name: string
  walletAddress?: string
  isHost: boolean
  isEliminated: boolean
  role?: Role
  isReady: boolean
}

type EventType = 'info' | 'warn' | 'danger' | 'success'

export interface GameState {
  player: Player
  lobby: {
    id: string
    players: Player[]
    minPlayers: number
    status: 'waiting' | 'starting' | 'active' | 'ended'
  }
  game: {
    phase: Phase
    roundIndex: number
    totalTimeLeft: number
    phaseTimeLeft: number
  }
  code: {
    currentBuffer: string
    lastSubmissionAt: number | null
    receivedFromPlayerId: string | null
  }
  voting: {
    votes: Record<string, string>
    hasVoted: boolean
  }
  connection: {
    status: 'idle' | 'connecting' | 'connected' | 'error'
    error: string | null
  }
  events: Array<{ id: string; message: string; type: EventType; timestamp: number }>

  setPhase: (phase: Phase) => void
  setPlayers: (players: Player[]) => void
  setCodeBuffer: (buffer: string) => void
  markVoted: (targetId: string) => void
  resetVoteState: () => void
  setVoteState: (votes: Record<string, string>) => void
  addEvent: (message: string, type?: EventType) => void
  toggleReady: () => void
  setLobbyId: (id: string) => void
  setPlayerName: (name: string) => void
  setPlayerId: (id: string) => void
  setPlayerWallet: (walletAddress?: string) => void
  setConnectionState: (status: 'idle' | 'connecting' | 'connected' | 'error', error?: string | null) => void
  applyLobbySnapshot: (snapshot: LobbySnapshot) => void
  applyGameSnapshot: (snapshot: GameSnapshot) => void
  applyTimerTick: (phaseTimeLeft: number, totalTimeLeft: number) => void
  applyCodeAssignment: (receivedFromPlayerId: string | null, buffer?: string) => void
}

const DEFAULT_BUFFER = `// syntax-sabotage :: round 01
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
  return []
}

// TODO: handle edge cases
`

export const useGameStore = create<GameState>((set, get) => ({
  player: {
    id: 'local-player',
    name: 'Anon_0x00',
    walletAddress: undefined,
    isHost: false,
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
    currentBuffer: DEFAULT_BUFFER,
    lastSubmissionAt: null,
    receivedFromPlayerId: null,
  },

  voting: {
    votes: {},
    hasVoted: false,
  },

  connection: {
    status: 'idle',
    error: null,
  },

  events: [
    { id: 'boot-1', message: 'Game session initialized.', type: 'info', timestamp: Date.now() - 5000 },
    { id: 'boot-2', message: 'Waiting for players to join...', type: 'info', timestamp: Date.now() - 3000 },
  ],

  setPhase: (phase) =>
    set((s) => ({
      game: { ...s.game, phase },
    })),

  setPlayers: (players) =>
    set((s) => ({ lobby: { ...s.lobby, players } })),

  setCodeBuffer: (buffer) =>
    set((s) => ({ code: { ...s.code, currentBuffer: buffer, lastSubmissionAt: Date.now() } })),

  markVoted: (targetId) =>
    set((s) => ({
      voting: {
        votes: { ...s.voting.votes, [s.player.id]: targetId },
        hasVoted: true,
      },
    })),

  resetVoteState: () =>
    set(() => ({
      voting: {
        votes: {},
        hasVoted: false,
      },
    })),

  setVoteState: (votes) =>
    set((s) => ({
      voting: {
        votes,
        hasVoted: Boolean(votes[s.player.id]),
      },
    })),

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
    set((s) => ({ lobby: { ...s.lobby, id: id.trim().toUpperCase() } })),

  setPlayerName: (name) =>
    set((s) => ({ player: { ...s.player, name } })),

  setPlayerId: (id) =>
    set((s) => ({ player: { ...s.player, id } })),

  setPlayerWallet: (walletAddress) =>
    set((s) => ({ player: { ...s.player, walletAddress } })),

  setConnectionState: (status, error = null) =>
    set(() => ({ connection: { status, error } })),

  applyLobbySnapshot: (snapshot) =>
    set((s) => {
      const existingRoles = new Map(s.lobby.players.map((p) => [p.id, p.role]))
      const players: Player[] = snapshot.players.map((p) => ({
        id: p.id,
        name: p.name,
        walletAddress: p.walletAddress,
        isHost: p.isHost,
        isEliminated: p.isEliminated,
        isReady: p.isReady,
        role: existingRoles.get(p.id),
      }))

      const me = players.find((p) => p.id === s.player.id)

      return {
        lobby: {
          id: snapshot.id,
          minPlayers: snapshot.minPlayers,
          status: snapshot.status,
          players,
        },
        player: me
          ? {
              ...s.player,
              name: me.name,
              walletAddress: me.walletAddress,
              isHost: me.isHost,
              isEliminated: me.isEliminated,
              isReady: me.isReady,
              role: me.role,
            }
          : s.player,
      }
    }),

  applyGameSnapshot: (snapshot) =>
    set((s) => ({
      game: {
        ...s.game,
        phase: snapshot.phase,
        roundIndex: snapshot.roundIndex,
        totalTimeLeft: snapshot.totalTimeLeft,
        phaseTimeLeft: snapshot.phaseTimeLeft,
      },
      voting:
        snapshot.phase === 'CODING' || snapshot.phase === 'MEETING' || snapshot.phase === 'SHUFFLE'
          ? { votes: {}, hasVoted: false }
          : s.voting,
    })),

  applyTimerTick: (phaseTimeLeft, totalTimeLeft) =>
    set((s) => ({
      game: {
        ...s.game,
        phaseTimeLeft,
        totalTimeLeft,
      },
    })),

  applyCodeAssignment: (receivedFromPlayerId, buffer) =>
    set((s) => ({
      code: {
        ...s.code,
        receivedFromPlayerId,
        currentBuffer: buffer ?? s.code.currentBuffer,
        lastSubmissionAt: Date.now(),
      },
    })),
}))
