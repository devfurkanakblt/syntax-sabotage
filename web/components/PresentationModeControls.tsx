'use client'

import { useEffect, useState } from 'react'
import { useGameStore, type Phase } from '../store/gameStore'
import { bootstrapPresentationLobby, simulateNextPhase, simulatePhase } from '../lib/mockEvents'
import { isPresentationMode } from '../lib/presentationMode'

const DEMO_PHASES: Phase[] = [
  'LOBBY',
  'ROLE_ASSIGNMENT',
  'CODING',
  'MEETING',
  'SHUFFLE',
  'VOTE_RESOLVE',
  'END_GAME',
]

interface PresentationModeControlsProps {
  lobbyId: string
}

export default function PresentationModeControls({ lobbyId }: PresentationModeControlsProps) {
  const { player } = useGameStore()
  const [presentationModeActive, setPresentationModeActive] = useState(false)

  useEffect(() => {
    setPresentationModeActive(isPresentationMode())
  }, [])

  if (!presentationModeActive) {
    return null
  }

  return (
    <div className="border-b border-cyan/40 bg-cyan/10 px-4 py-3 flex flex-wrap items-center gap-2">
      <span className="font-mono text-[10px] text-cyan border border-cyan/50 px-2 py-1">
        presentation_mode: enabled
      </span>

      <button
        onClick={() => simulateNextPhase()}
        className="font-mono text-[10px] border border-cyan text-cyan px-2 py-1 hover:bg-cyan/10"
      >
        next_phase()
      </button>

      {DEMO_PHASES.map((phase) => (
        <button
          key={phase}
          onClick={() => simulatePhase(phase)}
          className="font-mono text-[10px] border border-border-bright text-text-dim px-2 py-1 hover:border-cyan hover:text-cyan"
        >
          {phase}
        </button>
      ))}

      <button
        onClick={() => {
          bootstrapPresentationLobby({
            lobbyId,
            playerName: player.name || 'Presenter_0x01',
            walletAddress: player.walletAddress,
          })
        }}
        className="font-mono text-[10px] border border-amber text-amber px-2 py-1 hover:bg-amber/10"
      >
        reset_demo_state()
      </button>
    </div>
  )
}
