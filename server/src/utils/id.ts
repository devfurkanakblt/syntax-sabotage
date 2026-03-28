export function generateLobbyId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export function generatePlayerId(): string {
  return `P_${Math.random().toString(36).slice(2, 10).toUpperCase()}`
}
