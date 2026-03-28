import type { Phase } from '../../../shared/gameTypes'
import type { LobbyState } from '../state/types'
import { HiddenTestService, type HiddenTestResult } from './hiddenTestService'

const DEFAULT_TOTAL_TIME_SECONDS = Number(process.env.GAME_TOTAL_SECONDS ?? 420)
const ROLE_ASSIGNMENT_SECONDS = Number(process.env.PHASE_ROLE_ASSIGNMENT_SECONDS ?? 5)
const CODING_SECONDS = Number(process.env.PHASE_CODING_SECONDS ?? 300)
const MEETING_SECONDS = Number(process.env.PHASE_MEETING_SECONDS ?? 120)
const SHUFFLE_SECONDS = Number(process.env.PHASE_SHUFFLE_SECONDS ?? 5)
const VOTE_SECONDS = Number(process.env.PHASE_VOTE_SECONDS ?? 45)

export interface VoteResolution {
  votes: Record<string, string>
  tally: Record<string, number>
  eliminatedPlayerId: string | null
}

export interface GameTickOutcome {
  timerTick: { phaseTimeLeft: number; totalTimeLeft: number }
  phaseChanged?: { phase: Phase; roundIndex: number }
  codeAssigned?: { assignments: Record<string, string> }
  voteResolution?: VoteResolution
  playerEliminated?: { playerId: string }
  ended?: { winner: 'CREWMATES' | 'IMPOSTER'; reason: string }
}

export class GameService {
  private readonly hiddenTestService = new HiddenTestService()

  public startGame(lobby: LobbyState): { imposterId: string; phase: Phase } {
    const candidates = [...lobby.players.values()].filter((p) => !p.isEliminated)
    const imposterIndex = Math.floor(Math.random() * candidates.length)
    const imposterId = candidates[imposterIndex].id

    for (const player of lobby.players.values()) {
      player.role = player.id === imposterId ? 'IMPOSTER' : 'CREWMATE'
      player.isReady = false
      player.isEliminated = false
    }

    lobby.status = 'starting'
    lobby.game.phase = 'ROLE_ASSIGNMENT'
    lobby.game.roundIndex = 0
    lobby.game.totalTimeLeft = DEFAULT_TOTAL_TIME_SECONDS
    lobby.game.phaseTimeLeft = ROLE_ASSIGNMENT_SECONDS
    lobby.game.startedAt = Date.now()
    lobby.votes = {}
    lobby.codeByPlayer = {}
    lobby.shuffleHistory = []
    lobby.eliminationHistory = []
    lobby.updatedAt = Date.now()

    return { imposterId, phase: lobby.game.phase }
  }

  public castVote(lobby: LobbyState, voterId: string, targetId: string): VoteResolution {
    const voter = lobby.players.get(voterId)
    const target = lobby.players.get(targetId)

    if (!voter || !target) {
      return this.buildVoteResolution(lobby, null)
    }

    lobby.votes[voterId] = targetId
    lobby.updatedAt = Date.now()

    return this.buildVoteResolution(lobby, null)
  }

  public tick(lobby: LobbyState): GameTickOutcome {
    if (lobby.game.phase === 'LOBBY' || lobby.game.phase === 'END_GAME') {
      return {
        timerTick: {
          phaseTimeLeft: lobby.game.phaseTimeLeft,
          totalTimeLeft: lobby.game.totalTimeLeft,
        },
      }
    }

    lobby.game.totalTimeLeft = Math.max(0, lobby.game.totalTimeLeft - 1)
    lobby.game.phaseTimeLeft = Math.max(0, lobby.game.phaseTimeLeft - 1)

    const outcome: GameTickOutcome = {
      timerTick: {
        phaseTimeLeft: lobby.game.phaseTimeLeft,
        totalTimeLeft: lobby.game.totalTimeLeft,
      },
    }

    if (lobby.game.totalTimeLeft <= 0) {
      const result = this.evaluateCrewmateTests(lobby)
      const winner = result.passed ? 'CREWMATES' : 'IMPOSTER'
      return this.endGame(lobby, winner, `timeout_reached: ${result.summary}`, outcome)
    }

    if (lobby.game.phaseTimeLeft > 0) {
      return outcome
    }

    switch (lobby.game.phase) {
      case 'ROLE_ASSIGNMENT':
        return this.transitionPhase(lobby, 'CODING', CODING_SECONDS, outcome)
      case 'CODING':
        return this.transitionPhase(lobby, 'MEETING', MEETING_SECONDS, outcome)
      case 'MEETING': {
        const assignments = this.shuffleCodeAssignments(lobby)
        outcome.codeAssigned = { assignments }
        return this.transitionPhase(lobby, 'SHUFFLE', SHUFFLE_SECONDS, outcome)
      }
      case 'SHUFFLE':
        return this.transitionPhase(lobby, 'VOTE_RESOLVE', VOTE_SECONDS, outcome)
      case 'VOTE_RESOLVE':
        return this.resolveVoteAndAdvance(lobby, outcome)
      default:
        return outcome
    }
  }

  private resolveVoteAndAdvance(lobby: LobbyState, outcome: GameTickOutcome): GameTickOutcome {
    const resolution = this.buildVoteResolution(lobby, 'resolve')
    outcome.voteResolution = resolution

    if (resolution.eliminatedPlayerId) {
      const eliminated = lobby.players.get(resolution.eliminatedPlayerId)
      if (eliminated && !eliminated.isEliminated) {
        eliminated.isEliminated = true
        lobby.eliminationHistory.push({
          roundIndex: lobby.game.roundIndex,
          playerId: eliminated.id,
          votes: resolution.tally[eliminated.id] ?? 0,
          timestamp: Date.now(),
        })
        outcome.playerEliminated = { playerId: eliminated.id }
      }
    }

    lobby.votes = {}

    if (this.allCrewmatesEliminated(lobby)) {
      return this.endGame(lobby, 'IMPOSTER', 'all_crewmates_eliminated', outcome)
    }

    const testResult = this.evaluateCrewmateTests(lobby)
    if (testResult.passed) {
      return this.endGame(lobby, 'CREWMATES', `hidden_tests_passed: ${testResult.summary}`, outcome)
    }

    lobby.game.roundIndex += 1
    return this.transitionPhase(lobby, 'CODING', CODING_SECONDS, outcome)
  }

  private transitionPhase(
    lobby: LobbyState,
    phase: Phase,
    phaseTimeLeft: number,
    outcome: GameTickOutcome,
  ): GameTickOutcome {
    lobby.status = phase === 'END_GAME' ? 'ended' : 'active'
    lobby.game.phase = phase
    lobby.game.phaseTimeLeft = phaseTimeLeft
    lobby.updatedAt = Date.now()
    outcome.phaseChanged = {
      phase,
      roundIndex: lobby.game.roundIndex,
    }
    outcome.timerTick = {
      phaseTimeLeft: lobby.game.phaseTimeLeft,
      totalTimeLeft: lobby.game.totalTimeLeft,
    }
    return outcome
  }

  private endGame(
    lobby: LobbyState,
    winner: 'CREWMATES' | 'IMPOSTER',
    reason: string,
    outcome: GameTickOutcome,
  ): GameTickOutcome {
    lobby.status = 'ended'
    lobby.game.phase = 'END_GAME'
    lobby.game.phaseTimeLeft = 0
    lobby.updatedAt = Date.now()

    outcome.phaseChanged = {
      phase: 'END_GAME',
      roundIndex: lobby.game.roundIndex,
    }
    outcome.ended = { winner, reason }
    outcome.timerTick = {
      phaseTimeLeft: 0,
      totalTimeLeft: lobby.game.totalTimeLeft,
    }
    return outcome
  }

  private shuffleCodeAssignments(lobby: LobbyState): Record<string, string> {
    const activePlayers = [...lobby.players.values()].filter((p) => !p.isEliminated)
    const targetIds = activePlayers.map((p) => p.id)
    const sourceIds = [...targetIds]

    const rng = this.createSeededRng(`${lobby.id}:${lobby.game.roundIndex}:${lobby.createdAt}`)
    for (let i = sourceIds.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1))
      const tmp = sourceIds[i]
      sourceIds[i] = sourceIds[j]
      sourceIds[j] = tmp
    }

    const assignments: Record<string, string> = {}
    const nextCodeByPlayer = { ...lobby.codeByPlayer }

    targetIds.forEach((targetId, idx) => {
      const sourceId = sourceIds[idx]
      assignments[targetId] = sourceId
      nextCodeByPlayer[targetId] = lobby.codeByPlayer[sourceId] ?? this.defaultCodeTemplate(sourceId, lobby.game.roundIndex)
    })

    lobby.codeByPlayer = nextCodeByPlayer
    lobby.shuffleHistory.push({
      roundIndex: lobby.game.roundIndex,
      assignments,
      timestamp: Date.now(),
    })

    return assignments
  }

  private buildVoteResolution(lobby: LobbyState, mode: 'resolve' | null): VoteResolution {
    const activeIds = new Set(
      [...lobby.players.values()]
        .filter((p) => !p.isEliminated)
        .map((p) => p.id),
    )

    const filteredVotes: Record<string, string> = {}
    const tally: Record<string, number> = {}

    for (const [voterId, targetId] of Object.entries(lobby.votes)) {
      if (!activeIds.has(voterId) || !activeIds.has(targetId)) {
        continue
      }

      filteredVotes[voterId] = targetId
      tally[targetId] = (tally[targetId] ?? 0) + 1
    }

    lobby.votes = filteredVotes

    if (mode !== 'resolve') {
      return {
        votes: { ...filteredVotes },
        tally,
        eliminatedPlayerId: null,
      }
    }

    let maxVotes = 0
    for (const count of Object.values(tally)) {
      maxVotes = Math.max(maxVotes, count)
    }

    if (maxVotes === 0) {
      return {
        votes: { ...filteredVotes },
        tally,
        eliminatedPlayerId: null,
      }
    }

    const tied = Object.entries(tally)
      .filter(([, count]) => count === maxVotes)
      .map(([playerId]) => playerId)

    tied.sort((a, b) => this.hash(`${lobby.id}:${lobby.game.roundIndex}:${a}`) - this.hash(`${lobby.id}:${lobby.game.roundIndex}:${b}`))

    return {
      votes: { ...filteredVotes },
      tally,
      eliminatedPlayerId: tied[0] ?? null,
    }
  }

  private allCrewmatesEliminated(lobby: LobbyState): boolean {
    const crewmates = [...lobby.players.values()].filter((p) => p.role === 'CREWMATE')
    if (crewmates.length === 0) {
      return false
    }

    return crewmates.every((p) => p.isEliminated)
  }

  private evaluateCrewmateTests(lobby: LobbyState): HiddenTestResult {
    const activeCode = [...lobby.players.values()]
      .filter((p) => !p.isEliminated)
      .map((p) => lobby.codeByPlayer[p.id] ?? '')

    return this.hiddenTestService.evaluate(activeCode)
  }

  private createSeededRng(seedInput: string): () => number {
    let seed = this.hash(seedInput) || 1
    return () => {
      seed ^= seed << 13
      seed ^= seed >> 17
      seed ^= seed << 5
      const normalized = (seed >>> 0) / 0xffffffff
      return normalized
    }
  }

  private hash(input: string): number {
    let h = 2166136261
    for (let i = 0; i < input.length; i += 1) {
      h ^= input.charCodeAt(i)
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)
    }
    return h >>> 0
  }

  private defaultCodeTemplate(sourceId: string, roundIndex: number): string {
    return `// syntax-sabotage fallback buffer\n// source: ${sourceId}\n// round: ${roundIndex + 1}\n\nexport function solve(input: number[]): number[] {\n  return input\n}\n`
  }
}
