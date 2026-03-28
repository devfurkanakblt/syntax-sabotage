'use client'

import { useEffect } from 'react'
import { useGameStore } from '../../../store/gameStore'
import { initMockLobby, simulateNextPhase } from '../../../lib/mockEvents'
import PhaseBanner from '../../../components/PhaseBanner'
import RoundTimer from '../../../components/RoundTimer'
import MonacoCodePanel from '../../../components/MonacoCodePanel'
import MeetingPanel from '../../../components/MeetingPanel'
import VotingPanel from '../../../components/VotingPanel'
import PlayerRoster from '../../../components/PlayerRoster'
import EventFeed from '../../../components/EventFeed'
import WalletConnectButton from '../../../components/WalletConnectButton'

export default function GamePage({ params }: { params: { lobbyId: string } }) {
  const { lobbyId } = params
  const { lobby, game, player, setLobbyId } = useGameStore()

  useEffect(() => {
    if (lobby.id !== lobbyId) {
      setLobbyId(lobbyId)
      initMockLobby(lobbyId)
    }
  }, [lobby.id, lobbyId, setLobbyId])

  const showMeeting = game.phase === 'MEETING'
  const showVoting = game.phase === 'VOTE_RESOLVE'
  const showPanel = showMeeting || showVoting

  return (
    <main className="h-screen flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="border-b border-border px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <span className="font-display text-lg text-text tracking-widest">SYNTAX SABOTAGE</span>
          <span className="font-mono text-xs text-text-muted">{`// ${lobbyId.toUpperCase()}`}</span>
        </div>
        <div className="flex items-center gap-3">
          {player.isEliminated && (
            <span className="font-mono text-xs text-red border border-red/40 px-2 py-0.5">ELIMINATED</span>
          )}
          <WalletConnectButton />
        </div>
      </header>

      {/* Phase banner */}
      <PhaseBanner />

      {/* Timer */}
      <RoundTimer />

      {/* Main content area */}
      <div className="flex-1 grid md:grid-cols-[1fr_260px] overflow-hidden min-h-0">
        {/* Left — editor + panel */}
        <div className="flex flex-col overflow-hidden border-r border-border min-h-0">
          {showPanel ? (
            <div className="flex-1 overflow-hidden">
              {showMeeting && <MeetingPanel />}
              {showVoting && <VotingPanel />}
            </div>
          ) : (
            <div className="flex-1 min-h-0">
              <MonacoCodePanel />
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col overflow-hidden border-t md:border-t-0 border-border">
          <div className="p-3 border-b border-border shrink-0">
            <PlayerRoster />
          </div>
          <div className="p-3 flex-1 overflow-hidden">
            <EventFeed />
          </div>

          {/* Dev controls */}
          <div className="p-3 border-t border-border shrink-0">
            <div className="font-mono text-[10px] text-text-muted mb-2">{'// dev_controls [mock]'}</div>
            <div className="flex flex-col gap-1.5">
              {(['CODING', 'MEETING', 'SHUFFLE', 'VOTE_RESOLVE', 'END_GAME'] as const).map((phase) => (
                <button
                  key={phase}
                  onClick={() => simulateNextPhase()}
                  className={`font-mono text-[10px] px-2 py-1 border text-left transition-colors ${
                    game.phase === phase
                      ? 'border-text-dim text-text-dim bg-base-mid'
                      : 'border-border text-text-muted hover:border-border-bright hover:text-text-dim'
                  }`}
                >
                  {game.phase === phase ? '► ' : '  '}{phase}
                </button>
              ))}
              <button
                onClick={() => simulateNextPhase()}
                className="font-mono text-[10px] px-2 py-1.5 border border-cyan/50 text-cyan hover:bg-cyan/10 transition-colors mt-1"
              >
                → next_phase()
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
