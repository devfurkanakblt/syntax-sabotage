'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useGameStore } from '../store/gameStore'
import { initMockLobby } from '../lib/mockEvents'

function generateLobbyId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export default function LandingPage() {
  const router = useRouter()
  const { setPlayerName, setLobbyId } = useGameStore()

  const [createName, setCreateName] = useState('')
  const [joinName, setJoinName] = useState('')
  const [joinCode, setJoinCode] = useState('')

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const name = createName.trim() || 'Anon_0x00'
    const id = generateLobbyId()
    setPlayerName(name)
    setLobbyId(id)
    initMockLobby(id)
    router.push(`/lobby/${id}`)
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const name = joinName.trim() || 'Anon_0x00'
    const id = joinCode.trim().toUpperCase() || generateLobbyId()
    setPlayerName(name)
    setLobbyId(id)
    initMockLobby(id)
    router.push(`/lobby/${id}`)
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
              className="border border-green text-green font-mono text-sm py-2.5 hover:bg-green/10 transition-all active:scale-[0.98]"
            >
              CREATE_LOBBY()
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
              className="border border-amber text-amber font-mono text-sm py-2.5 hover:bg-amber/10 transition-all active:scale-[0.98]"
            >
              JOIN_LOBBY()
            </button>
          </form>
        </div>

        <div className="mt-12 font-mono text-[10px] text-text-muted text-center">
          {'// built for monad_blitz 2025 - open source - no account required'}
        </div>
      </div>
    </main>
  )
}
