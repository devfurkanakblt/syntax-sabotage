import { generatePlayerId } from '../utils/id'
import type { PlayerSession } from '../state/types'

interface CreatePlayerInput {
  name: string
  socketId: string
  isHost: boolean
  id?: string
}

export class PlayerService {
  public normalizeName(raw: string): string {
    const trimmed = raw.trim()
    return trimmed.length > 0 ? trimmed.slice(0, 24) : 'Anon_0x00'
  }

  public createPlayer(input: CreatePlayerInput): PlayerSession {
    const now = Date.now()
    return {
      id: input.id ?? generatePlayerId(),
      name: this.normalizeName(input.name),
      isHost: input.isHost,
      isReady: false,
      isEliminated: false,
      isConnected: true,
      role: null,
      socketId: input.socketId,
      joinedAt: now,
    }
  }

  public attachSocket(player: PlayerSession, socketId: string, name?: string): PlayerSession {
    if (name && name.trim().length > 0) {
      player.name = this.normalizeName(name)
    }
    player.socketId = socketId
    player.isConnected = true
    return player
  }

  public chooseNextHost(players: Map<string, PlayerSession>): string | null {
    const connected = [...players.values()]
      .filter((p) => p.isConnected && !p.isEliminated)
      .sort((a, b) => a.joinedAt - b.joinedAt)

    if (connected.length > 0) {
      return connected[0].id
    }

    const fallback = [...players.values()].sort((a, b) => a.joinedAt - b.joinedAt)
    return fallback[0]?.id ?? null
  }
}
