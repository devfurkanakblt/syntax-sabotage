'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGameStore } from '../../../store/gameStore'
import { initMockLobby } from '../../../lib/mockEvents'
import LobbyPanel from '../../../components/LobbyPanel'
import PlayerRoster from '../../../components/PlayerRoster'
import WalletConnectButton from '../../../components/WalletConnectButton'
import EventFeed from '../../../components/EventFeed'

export default function LobbyPage({ params }: { params: { lobbyId: string } }) {
  const { lobbyId } = params
  const router = useRouter()
  const { lobby, setLobbyId } = useGameStore()

  useEffect(() => {
    if (lobby.id !== lobbyId) {
      setLobbyId(lobbyId)
      initMockLobby(lobbyId)
    }
  }, [lobby.id, lobbyId, setLobbyId])

  function handleStartGame() {
    router.push(`/game/${lobbyId}`)
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
        <WalletConnectButton />
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

          <div className="border border-dashed border-border p-4 font-mono text-xs text-text-muted space-y-1">
            <div>{'// game_rules:'}</div>
            <div className="pl-4 text-text-dim">— minimum 4 players required</div>
            <div className="pl-4 text-text-dim">— 1 player will be secretly assigned IMPOSTER</div>
            <div className="pl-4 text-text-dim">— code shuffles every meeting phase</div>
            <div className="pl-4 text-text-dim">— crewmates win if tests pass before timeout</div>
          </div>

          <button
            onClick={handleStartGame}
            className="border border-red text-red font-mono text-sm py-3 hover:bg-red/10 transition-all active:scale-[0.98] w-full md:w-auto md:px-8"
          >
            → ENTER_GAME() <span className="text-text-muted text-xs">[demo]</span>
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
