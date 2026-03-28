'use client'

import { useGameStore } from '../store/gameStore'

const DISCUSSION_PROMPTS = [
  'Who submitted broken code last round?',
  'Did anyone notice an infinite loop injected in the sort function?',
  'x0r_cipher has been suspiciously quiet...',
  'segfault_sam\'s code had unreachable branches. Intentional?',
  'The shuffle gave me code with a missing return statement.',
  'nullptr_exception fixed a bug that wasn\'t there before.',
]

export default function MeetingPanel() {
  const { lobby, game } = useGameStore()
  const { players } = lobby
  const activePlayers = players.filter((p) => !p.isEliminated)

  if (game.phase !== 'MEETING') return null

  return (
    <div className="border border-amber bg-amber/5 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-amber flex items-center gap-3">
        <span className="text-amber font-display text-lg tracking-widest">⚠ MEETING</span>
        <span className="text-text-muted font-mono text-xs ml-auto">editor locked // discuss</span>
      </div>

      <div className="p-3 border-b border-border">
        <div className="text-text-muted font-mono text-[10px] mb-2">{'// discussion_feed'}</div>
        <ul className="space-y-2">
          {DISCUSSION_PROMPTS.slice(0, 4).map((prompt, i) => {
            const speaker = activePlayers[i % activePlayers.length]
            return (
              <li key={i} className="font-mono text-xs">
                <span className="text-amber">{speaker?.name ?? 'unknown'}</span>
                <span className="text-text-muted mx-1">›</span>
                <span className="text-text">{prompt}</span>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="p-3">
        <div className="text-text-muted font-mono text-[10px] mb-2">{`// active_players [${activePlayers.length}]`}</div>
        <div className="flex flex-wrap gap-2">
          {activePlayers.map((p) => (
            <span
              key={p.id}
              className="font-mono text-xs border border-border-bright text-text-dim px-2 py-1"
            >
              {p.name}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-auto p-3 border-t border-border">
        <input
          type="text"
          placeholder="// type to discuss..."
          className="w-full bg-transparent border border-border font-mono text-xs text-text placeholder-text-muted px-3 py-2 outline-none focus:border-amber transition-colors"
        />
      </div>
    </div>
  )
}
