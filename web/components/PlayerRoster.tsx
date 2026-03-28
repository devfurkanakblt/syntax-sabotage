'use client'

import { useGameStore } from '../store/gameStore'

export default function PlayerRoster() {
  const { lobby } = useGameStore()
  const { players } = lobby

  if (players.length === 0) return null

  return (
    <div className="border border-border bg-base-light p-3">
      <div className="text-text-muted font-mono text-xs mb-3 border-b border-border pb-2">
        {`// players [${players.length}]`}
      </div>
      <ul className="space-y-1.5">
        {players.map((p) => (
          <li
            key={p.id}
            className={`flex items-center justify-between font-mono text-xs transition-opacity duration-300 ${
              p.isEliminated ? 'opacity-30' : 'opacity-100'
            }`}
          >
            <span className="flex items-center gap-2">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  p.isEliminated
                    ? 'bg-text-muted'
                    : 'bg-green animate-pulse'
                }`}
              />
              <span className={p.isEliminated ? 'line-through text-text-muted' : 'text-text'}>
                {p.name}
                {p.isHost && <span className="text-amber ml-1">[host]</span>}
              </span>
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 border ${
                p.isEliminated
                  ? 'border-text-muted text-text-muted'
                  : 'border-green/40 text-green'
              }`}
            >
              {p.isEliminated ? 'DEAD' : 'ACTIVE'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
