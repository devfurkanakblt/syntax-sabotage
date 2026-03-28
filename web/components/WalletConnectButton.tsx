'use client'

import { useState } from 'react'

export default function WalletConnectButton() {
  const [connected, setConnected] = useState(false)
  const [address] = useState('0x4a2b...f91c')

  return (
    <button
      onClick={() => setConnected((v) => !v)}
      className={`
        font-mono text-xs px-4 py-2 border transition-all duration-200
        ${connected
          ? 'border-green text-green bg-green/10 hover:bg-green/20'
          : 'border-border-bright text-text-dim hover:border-red hover:text-red'
        }
      `}
    >
      {connected ? (
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green animate-pulse inline-block" />
          {address}
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-text-muted inline-block" />
          connect_wallet()
        </span>
      )}
    </button>
  )
}
