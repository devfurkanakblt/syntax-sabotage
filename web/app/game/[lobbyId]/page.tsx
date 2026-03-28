'use client'

import { useGameStore } from '../../../store/gameStore'
import PhaseBanner from '../../../components/PhaseBanner'
import RoundTimer from '../../../components/RoundTimer'
import MonacoCodePanel from '../../../components/MonacoCodePanel'
import MeetingPanel from '../../../components/MeetingPanel'
import VotingPanel from '../../../components/VotingPanel'
import PlayerRoster from '../../../components/PlayerRoster'
import EventFeed from '../../../components/EventFeed'
import WalletConnectButton from '../../../components/WalletConnectButton'
import ConnectionBadge from '../../../components/ConnectionBadge'
import { reconnectGameSocket } from '../../../lib/socketClient'
import { useLobbySocketSync } from '../../../lib/useLobbySocketSync'

export default function GamePage({ params }: { params: { lobbyId: string } }) {
  const { lobbyId } = params
  const { game, player, connection, setConnectionState } = useGameStore()

  useLobbySocketSync(lobbyId)

  const showMeeting = game.phase === 'MEETING'
  const showVoting = game.phase === 'VOTE_RESOLVE'
  const showPanel = showMeeting || showVoting

  function handleRetrySocket() {
    setConnectionState('connecting')
    reconnectGameSocket()
  }

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
          <ConnectionBadge status={connection.status} error={connection.error} onRetry={handleRetrySocket} />
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
        </div>
      </div>
    </main>
  )
}
