import type { LobbyState } from '../state/types'

const DEFAULT_TOTAL_TIME_SECONDS = Number(process.env.GAME_TOTAL_SECONDS ?? 420)
const DEFAULT_CODING_SECONDS = Number(process.env.PHASE_CODING_SECONDS ?? 300)

export class GameService {
  public startGame(lobby: LobbyState): { imposterId: string } {
    const candidates = [...lobby.players.values()].filter((p) => !p.isEliminated)
    const imposterIndex = Math.floor(Math.random() * candidates.length)
    const imposterId = candidates[imposterIndex].id

    for (const player of lobby.players.values()) {
      player.role = player.id === imposterId ? 'IMPOSTER' : 'CREWMATE'
      player.isReady = false
    }

    lobby.status = 'starting'
    lobby.game.phase = 'ROLE_ASSIGNMENT'
    lobby.game.roundIndex = 0
    lobby.game.totalTimeLeft = DEFAULT_TOTAL_TIME_SECONDS
    lobby.game.phaseTimeLeft = 5
    lobby.game.startedAt = Date.now()
    lobby.updatedAt = Date.now()

    return { imposterId }
  }

  public transitionToCoding(lobby: LobbyState): void {
    lobby.status = 'active'
    lobby.game.phase = 'CODING'
    lobby.game.phaseTimeLeft = DEFAULT_CODING_SECONDS
    lobby.updatedAt = Date.now()
  }
}
