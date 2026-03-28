'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { useGameStore } from '../store/gameStore'
import { createLobbySession, joinLobbySession } from '../lib/socketClient'
import { bootstrapPresentationLobby } from '../lib/mockEvents'
import { setLobbySession } from '../lib/lobbySession'
import { isPresentationMode } from '../lib/presentationMode'

function generateLobbyId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export default function LandingPage() {
  const router = useRouter()
  const { address } = useAccount()
  const {
    setPlayerName,
    setPlayerWallet,
    setLobbyId,
    setPlayerId,
    applyLobbySnapshot,
    applyGameSnapshot,
  } = useGameStore()

  const [createName, setCreateName] = useState('')
  const [joinName, setJoinName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [presentationModeActive, setPresentationModeActive] = useState(false)

  useEffect(() => {
    setPresentationModeActive(isPresentationMode())
  }, [])

  function handleLaunchPresentation() {
    const playerName = createName.trim() || joinName.trim() || 'Presenter_0x01'
    const result = bootstrapPresentationLobby({
      lobbyId: 'DEMO42',
      playerName,
      walletAddress: address?.toLowerCase(),
    })

    setLobbySession({
      lobbyId: result.lobby.id,
      playerId: result.playerId,
      playerName,
      walletAddress: address?.toLowerCase(),
    })
    router.push(`/lobby/${result.lobby.id}?demo=1`)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const name = createName.trim() || 'Anon_0x00'

    try {
      const requestedLobbyId = generateLobbyId()
      const created = await createLobbySession({
        lobbyId: requestedLobbyId,
        playerName: name,
        walletAddress: address?.toLowerCase(),
      })

      setPlayerName(name)
      if (address) {
        setPlayerWallet(address.toLowerCase())
      }
      setPlayerId(created.playerId)
      setLobbyId(created.lobby.id)
      applyLobbySnapshot(created.lobby)
      applyGameSnapshot(created.lobby.game)
      setLobbySession({
        lobbyId: created.lobby.id,
        playerId: created.playerId,
        playerName: name,
        walletAddress: address?.toLowerCase(),
      })
      router.push(`/lobby/${created.lobby.id}`)
    } catch (err) {
      setError(String(err))
    } finally {
      setPending(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const name = joinName.trim() || 'Anon_0x00'

    try {
      const id = joinCode.trim().toUpperCase() || generateLobbyId()
      const joined = await joinLobbySession({
        lobbyId: id,
        playerName: name,
        walletAddress: address?.toLowerCase(),
      })

      setPlayerName(name)
      if (address) {
        setPlayerWallet(address.toLowerCase())
      }
      setPlayerId(joined.playerId)
      setLobbyId(joined.lobby.id)
      applyLobbySnapshot(joined.lobby)
      applyGameSnapshot(joined.lobby.game)
      setLobbySession({
        lobbyId: joined.lobby.id,
        playerId: joined.playerId,
        playerName: name,
        walletAddress: address?.toLowerCase(),
      })
      router.push(`/lobby/${joined.lobby.id}`)
    } catch (err) {
      setError(String(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header bar */}
      <header className="border-b border-border px-6 py-3 flex items-center justify-between">
        <span className="font-mono text-xs text-text-muted">{'// syntax_sabotage v0.1.0-alpha'}</span>
        <span className="font-mono text-xs text-text-muted">monad_blitz_hackathon</span>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 stagger">

        {/* Hero */}
        <div className="text-center mb-16 max-w-3xl">
          <div className="font-mono text-xs text-green mb-4 tracking-widest">
            {'// multiplayer_social_deduction_coding_game'}
          </div>
          <h1 className="font-display text-[80px] md:text-[120px] leading-none tracking-widest text-text mb-2">
            SYNTAX
          </h1>
          <h1 className="font-display text-[80px] md:text-[120px] leading-none tracking-widest text-red">
            SABOTAGE
          </h1>
          <p className="font-mono text-sm text-text-dim mt-6 max-w-lg mx-auto leading-relaxed">
            4+ programmers. 1 hidden imposter. 5 minutes to write code,
            2 to find the saboteur. Your editor gets shuffled every round.
            Trust no one — not even the code.
          </p>
        </div>

        {/* Game mechanics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-3xl mb-16">
          {[
            { icon: '▶', label: 'CODING', desc: '5 min to build', color: 'text-green', border: 'border-green/30' },
            { icon: '⚠', label: 'MEETING', desc: '2 min to discuss', color: 'text-amber', border: 'border-amber/30' },
            { icon: '⇄', label: 'SHUFFLE', desc: 'code reassigned', color: 'text-cyan', border: 'border-cyan/30' },
            { icon: '✕', label: 'VOTE', desc: 'eliminate suspect', color: 'text-red', border: 'border-red/30' },
          ].map((m) => (
            <div key={m.label} className={`border ${m.border} bg-base-light p-4 text-center`}>
              <div className={`font-display text-3xl ${m.color} mb-1`}>{m.icon}</div>
              <div className={`font-display text-lg tracking-widest ${m.color}`}>{m.label}</div>
              <div className="font-mono text-[10px] text-text-muted mt-1">{m.desc}</div>
            </div>
          ))}
        </div>

        {/* Forms */}
        <div className="grid md:grid-cols-2 gap-6 w-full max-w-2xl">
          {/* Create lobby */}
          <form onSubmit={handleCreate} className="border border-border bg-base-light p-5 flex flex-col gap-4">
            <div className="font-mono text-xs text-green border-b border-border pb-3">
              {'// create_lobby()'}
            </div>
            <div>
              <label className="font-mono text-[10px] text-text-muted block mb-1">username</label>
              <input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Anon_0x00"
                className="w-full bg-transparent border border-border px-3 py-2 font-mono text-sm text-text placeholder-text-muted outline-none focus:border-green transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="border border-green text-green font-mono text-sm py-2.5 hover:bg-green/10 transition-all active:scale-[0.98]"
            >
              {pending ? 'PENDING...' : 'CREATE_LOBBY()'}
            </button>
          </form>

          {/* Join lobby */}
          <form onSubmit={handleJoin} className="border border-border bg-base-light p-5 flex flex-col gap-4">
            <div className="font-mono text-xs text-amber border-b border-border pb-3">
              {'// join_lobby()'}
            </div>
            <div>
              <label className="font-mono text-[10px] text-text-muted block mb-1">lobby_code</label>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="ABC123"
                className="w-full bg-transparent border border-border px-3 py-2 font-mono text-sm text-text placeholder-text-muted outline-none focus:border-amber transition-colors uppercase"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] text-text-muted block mb-1">username</label>
              <input
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                placeholder="Anon_0x00"
                className="w-full bg-transparent border border-border px-3 py-2 font-mono text-sm text-text placeholder-text-muted outline-none focus:border-amber transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="border border-amber text-amber font-mono text-sm py-2.5 hover:bg-amber/10 transition-all active:scale-[0.98]"
            >
              {pending ? 'PENDING...' : 'JOIN_LOBBY()'}
            </button>
          </form>
        </div>

        <div className="mt-6 w-full max-w-2xl border border-cyan/40 bg-cyan/5 p-4">
          <div className="font-mono text-xs text-cyan mb-3">{'// hackathon_presentation_mode'}</div>
          <div className="font-mono text-[11px] text-text-muted mb-3">
            Instantly boots a 4-player mock match with phase controls. Ideal for a 3-minute live demo.
          </div>
          <button
            type="button"
            onClick={handleLaunchPresentation}
            className="border border-cyan text-cyan font-mono text-sm py-2.5 px-4 hover:bg-cyan/10 transition-all active:scale-[0.98]"
          >
            LAUNCH_PRESENTATION_MODE()
          </button>
          {presentationModeActive && (
            <div className="font-mono text-[10px] text-cyan mt-2">presentation mode is active for this browser session</div>
          )}
        </div>

        {error && (
          <div className="mt-4 font-mono text-[11px] text-red border border-red/40 px-3 py-2 max-w-2xl w-full">
            {error}
          </div>
        )}

        <div className="mt-12 font-mono text-[10px] text-text-muted text-center">
          {'// built for monad_blitz 2025 - open source - no account required'}
        </div>
      </div>
    </main>
  )
}
