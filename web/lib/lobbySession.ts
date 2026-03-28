export interface LobbySessionRecord {
  lobbyId: string
  playerId: string
  playerName: string
  walletAddress?: string
  updatedAt: number
}

const STORAGE_KEY = 'syntax-sabotage:lobby-sessions'

function normalizeLobbyId(lobbyId: string): string {
  return lobbyId.trim().toUpperCase()
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readAll(): Record<string, LobbySessionRecord> {
  if (!canUseStorage()) {
    return {}
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return {}
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, LobbySessionRecord>
    return parsed ?? {}
  } catch {
    return {}
  }
}

function writeAll(data: Record<string, LobbySessionRecord>): void {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function getLobbySession(lobbyId: string): LobbySessionRecord | null {
  const key = normalizeLobbyId(lobbyId)
  const all = readAll()
  return all[key] ?? null
}

export function setLobbySession(record: Omit<LobbySessionRecord, 'updatedAt'>): void {
  const key = normalizeLobbyId(record.lobbyId)
  const all = readAll()
  all[key] = {
    ...record,
    lobbyId: key,
    updatedAt: Date.now(),
  }
  writeAll(all)
}

export function clearLobbySession(lobbyId: string): void {
  const key = normalizeLobbyId(lobbyId)
  const all = readAll()
  delete all[key]
  writeAll(all)
}
