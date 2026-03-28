'use client'

import { useEffect, useMemo, useState } from 'react'
import { isPresentationMode } from '../lib/presentationMode'
import { useGameStore } from '../store/gameStore'

export default function RoleRevealOverlay() {
  const { game, player } = useGameStore()
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const presentationMode = isPresentationMode()

  const isRoleAssignment = game.phase === 'ROLE_ASSIGNMENT'

  useEffect(() => {
    if (isRoleAssignment) {
      setVisible(true)
      setDismissed(false)
      return
    }

    setVisible(false)
    setDismissed(false)
  }, [isRoleAssignment])

  const role = player.role ?? 'CREWMATE'
  const isImposter = role === 'IMPOSTER'

  const accent = useMemo(
    () =>
      isImposter
        ? {
            border: 'border-red/70',
            glow: 'shadow-[0_0_45px_rgba(230,57,70,0.35)]',
            roleText: 'text-red',
            chip: 'border-red/60 text-red bg-red/10',
            subtitle: 'Blend in. Delay fixes. Avoid suspicion.',
          }
        : {
            border: 'border-green/70',
            glow: 'shadow-[0_0_45px_rgba(0,255,136,0.25)]',
            roleText: 'text-green',
            chip: 'border-green/60 text-green bg-green/10',
            subtitle: 'Ship clean code. Catch the saboteur.',
          },
    [isImposter],
  )

  if (!visible || (presentationMode && dismissed)) {
    return null
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center px-4 role-reveal-enter">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(8,12,16,0.55)_0%,rgba(8,12,16,0.92)_100%)]" />

      <div className="pointer-events-auto relative w-full max-w-2xl overflow-hidden">
        <div className={`absolute inset-0 ${accent.glow}`} />
        <div className={`relative border ${accent.border} bg-base-mid/95 p-8 md:p-10`}>
          <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan/70 to-transparent role-reveal-scan" />

          {presentationMode && (
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="absolute right-3 top-3 h-7 w-7 border border-border-bright text-text-muted hover:text-text hover:border-cyan transition-colors font-mono text-sm"
              aria-label="Close role reveal"
            >
              x
            </button>
          )}

          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] tracking-[0.28em] text-cyan">ROLE_ASSIGNMENT_PROTOCOL</span>
            <span className={`font-mono text-[10px] px-2 py-1 border ${accent.chip}`}>
              {isImposter ? 'HIGH RISK' : 'TRUSTED UNIT'}
            </span>
          </div>

          <div className="font-display text-[44px] md:text-[64px] leading-none tracking-[0.08em] text-text">
            YOU ARE A
          </div>
          <div className={`font-display text-[56px] md:text-[96px] leading-[0.9] tracking-[0.12em] ${accent.roleText} role-reveal-flicker`}>
            {role}
          </div>

          <div className="mt-4 border-t border-border pt-3 font-mono text-xs text-text-dim">
            {accent.subtitle}
          </div>
        </div>
      </div>
    </div>
  )
}
