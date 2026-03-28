'use client'

import { useGameStore } from '../store/gameStore'

function fmt(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export default function RoundTimer() {
  const { game } = useGameStore()
  const phaseLeft = game.phaseTimeLeft
  const totalLeft = game.totalTimeLeft

  const phaseUrgent = phaseLeft <= 30
  const totalUrgent = totalLeft <= 60

  return (
    <div className="flex items-center gap-6 font-mono text-sm px-4 py-2 border-b border-border bg-base-mid">
      <div className="flex items-center gap-2">
        <span className="text-text-muted text-xs">phase</span>
        <span
          className={`text-lg font-bold tracking-widest transition-colors ${
            phaseUrgent ? 'text-red animate-pulse-red' : 'text-green'
          }`}
        >
          {fmt(phaseLeft)}
        </span>
      </div>
      <div className="w-px h-5 bg-border" />
      <div className="flex items-center gap-2">
        <span className="text-text-muted text-xs">total</span>
        <span
          className={`text-base tracking-widest transition-colors ${
            totalUrgent ? 'text-red' : 'text-text-dim'
          }`}
        >
          {fmt(totalLeft)}
        </span>
      </div>
      {phaseUrgent && (
        <div className="ml-auto text-xs text-red animate-flicker">
          {'// time critical'}
        </div>
      )}
    </div>
  )
}
