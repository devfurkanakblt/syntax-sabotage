'use client'

import { useGameStore } from '../store/gameStore'
import { Phase } from '../store/gameStore'

const PHASE_CONFIG: Record<Phase, { label: string; color: string; borderColor: string; bg: string; icon: string; desc: string }> = {
  LOBBY: {
    label: 'LOBBY',
    color: 'text-text-dim',
    borderColor: 'border-border-bright',
    bg: 'bg-base-mid',
    icon: '◈',
    desc: 'waiting for players',
  },
  ROLE_ASSIGNMENT: {
    label: 'ROLE ASSIGNMENT',
    color: 'text-amber',
    borderColor: 'border-amber',
    bg: 'bg-amber/5',
    icon: '⬡',
    desc: 'roles are being assigned',
  },
  CODING: {
    label: 'CODING',
    color: 'text-green',
    borderColor: 'border-green',
    bg: 'bg-green/5',
    icon: '▶',
    desc: '// write code — find the sabotage',
  },
  MEETING: {
    label: 'EMERGENCY MEETING',
    color: 'text-amber',
    borderColor: 'border-amber',
    bg: 'bg-amber/5',
    icon: '⚠',
    desc: 'discuss — editor is locked',
  },
  SHUFFLE: {
    label: 'CODE SHUFFLE',
    color: 'text-cyan',
    borderColor: 'border-cyan',
    bg: 'bg-cyan/5',
    icon: '⇄',
    desc: 'code reassigned — inspect carefully',
  },
  VOTE_RESOLVE: {
    label: 'VOTE & ELIMINATE',
    color: 'text-red',
    borderColor: 'border-red',
    bg: 'bg-red/5',
    icon: '✕',
    desc: 'cast your vote — eliminate the imposter',
  },
  END_GAME: {
    label: 'GAME OVER',
    color: 'text-text-dim',
    borderColor: 'border-border',
    bg: 'bg-base-mid',
    icon: '■',
    desc: 'session terminated',
  },
}

export default function PhaseBanner() {
  const { game } = useGameStore()
  const cfg = PHASE_CONFIG[game.phase]

  return (
    <div
      className={`
        w-full border-b ${cfg.borderColor} ${cfg.bg}
        px-6 py-3 flex items-center gap-4 animate-slide-down
        transition-all duration-500
      `}
    >
      <span className={`font-display text-2xl tracking-widest ${cfg.color}`}>
        {cfg.icon}
      </span>
      <div>
        <div className={`font-display text-xl tracking-[0.25em] ${cfg.color}`}>
          {cfg.label}
        </div>
        <div className="font-mono text-[11px] text-text-muted mt-0.5">
          {cfg.desc}
        </div>
      </div>
      <div className="ml-auto font-mono text-xs text-text-muted">
        {`// round_${String(game.roundIndex + 1).padStart(2, '0')}`}
      </div>
    </div>
  )
}
