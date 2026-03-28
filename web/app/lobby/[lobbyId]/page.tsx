'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useGameStore } from '../../../store/gameStore'
import LobbyPanel from '../../../components/LobbyPanel'
import PlayerRoster from '../../../components/PlayerRoster'
import WalletConnectButton from '../../../components/WalletConnectButton'
import EventFeed from '../../../components/EventFeed'
import StakeMatchPanel from '../../../components/StakeMatchPanel'
import ConnectionBadge from '../../../components/ConnectionBadge'
import { reconnectGameSocket, requestGameStart } from '../../../lib/socketClient'
import { useLobbySocketSync } from '../../../lib/useLobbySocketSync'

export default function LobbyPage({ params }: { params: { lobbyId: string } }) {
  const { lobbyId } = params
  const router = useRouter()
  const { player, connection, setConnectionState } = useGameStore()
  const [startPending, setStartPending] = useState(false)

  useLobbySocketSync(lobbyId)

  function handleRetrySocket() {
    setConnectionState('connecting')
    reconnectGameSocket()
  }

  async function handleStartGame() {
    setStartPending(true)
    try {
      await requestGameStart(lobbyId)
      router.push(`/game/${lobbyId}`)
    } catch (err) {
      useGameStore.getState().addEvent(`start_game_failed: ${String(err)}`, 'danger')
    } finally {
      setStartPending(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <span className="font-display text-xl text-text tracking-widest">SYNTAX SABOTAGE</span>
          <span className="font-mono text-xs text-text-muted">
            {`// lobby_${lobbyId.toUpperCase()}`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionBadge status={connection.status} error={connection.error} onRetry={handleRetrySocket} />
          <WalletConnectButton />
        </div>
      </header>

      <div className="flex-1 grid md:grid-cols-[1fr_280px] gap-0 overflow-hidden">
        {/* Main — lobby panel */}
        <div className="p-6 flex flex-col gap-6 border-r border-border stagger">
          <div>
            <div className="font-display text-4xl text-text tracking-widest mb-1">LOBBY</div>
            <div className="font-mono text-xs text-text-muted">
              {'// share code '}<span className="text-amber">{lobbyId.toUpperCase()}</span>{' - waiting for players'}
            </div>
          </div>

          <LobbyPanel />

          <StakeMatchPanel lobbyId={lobbyId} isHost={player.isHost} />

          <div className="border border-dashed border-border p-4 font-mono text-xs text-text-muted space-y-1">
            <div>{'// game_rules:'}</div>
            <div className="pl-4 text-text-dim">— minimum 4 players required</div>
            <div className="pl-4 text-text-dim">— 1 player will be secretly assigned IMPOSTER</div>
            <div className="pl-4 text-text-dim">— code shuffles every meeting phase</div>
            <div className="pl-4 text-text-dim">— crewmates win if tests pass before timeout</div>
          </div>

          <button
            onClick={handleStartGame}
            disabled={startPending}
            className="border border-red text-red font-mono text-sm py-3 hover:bg-red/10 transition-all active:scale-[0.98] w-full md:w-auto md:px-8 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {startPending ? 'STARTING...' : '→ ENTER_GAME()'} <span className="text-text-muted text-xs">[live]</span>
          </button>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-0 border-t md:border-t-0 border-border">
          <div className="p-4 border-b border-border">
            <PlayerRoster />
          </div>
          <div className="p-4 flex-1">
            <EventFeed />
          </div>
        </div>
      </div>
    </main>
  )
}
