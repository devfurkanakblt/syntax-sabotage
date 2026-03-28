'use client'

import { useGameStore } from '../store/gameStore'

export default function LobbyPanel() {
  const { lobby, player, toggleReady } = useGameStore()
  const { players, minPlayers } = lobby
  const canStart = players.length >= minPlayers && player.isHost

  return (
    <div className="border border-border bg-base-light p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="font-mono text-xs text-text-muted">
          {`// lobby_${lobby.id.toUpperCase() || 'XXXX'}`}
        </div>
        <div className="font-mono text-xs text-text-muted">
          {players.length}/{minPlayers}+ players
        </div>
      </div>

      <ul className="space-y-2">
        {players.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between border border-border px-3 py-2 font-mono text-xs"
          >
            <span className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${p.isReady ? 'bg-green' : 'bg-text-muted'}`} />
              <span className="text-text">
                {p.name}
                {p.id === player.id && <span className="text-text-muted ml-1">[you]</span>}
                {p.isHost && <span className="text-amber ml-1">[host]</span>}
              </span>
            </span>
            <span className={`text-[10px] border px-1.5 py-0.5 ${
              p.isReady
                ? 'border-green/50 text-green'
                : 'border-text-muted text-text-muted'
            }`}>
              {p.isReady ? 'READY' : 'WAITING'}
            </span>
          </li>
        ))}
        {players.length === 0 && (
          <li className="font-mono text-xs text-text-muted text-center py-4">
            {'// no players yet - share the lobby code'}
          </li>
        )}
      </ul>

      {players.length < minPlayers && (
        <div className="font-mono text-[10px] text-text-muted border border-dashed border-border px-3 py-2 text-center">
          need {minPlayers - players.length} more player{minPlayers - players.length !== 1 ? 's' : ''} to start
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={toggleReady}
          className={`flex-1 py-2 font-mono text-xs border transition-all ${
            player.isReady
              ? 'border-green/50 text-green bg-green/10 hover:bg-green/20'
              : 'border-border-bright text-text-dim hover:border-green hover:text-green'
          }`}
        >
          {player.isReady ? '// unready' : '// ready_up()'}
        </button>

        {player.isHost && (
          <button
            disabled={!canStart}
            className={`flex-1 py-2 font-mono text-xs border transition-all ${
              canStart
                ? 'border-red text-red hover:bg-red/10 cursor-pointer'
                : 'border-border text-text-muted cursor-not-allowed opacity-40'
            }`}
          >
            {canStart ? 'START_GAME()' : 'WAITING...'}
          </button>
        )}
      </div>
    </div>
  )
}
