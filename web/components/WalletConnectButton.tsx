'use client'

import { useMemo } from 'react'
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { monadTestnet } from '../lib/chains'

export default function WalletConnectButton() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  const injectedConnector = useMemo(
    () => connectors.find((connector) => connector.id === 'injected') ?? connectors[0],
    [connectors],
  )

  const wrongNetwork = isConnected && chainId !== monadTestnet.id
  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''

  if (isConnected && wrongNetwork) {
    return (
      <button
        onClick={() => switchChain({ chainId: monadTestnet.id })}
        disabled={isSwitching}
        className="font-mono text-xs px-4 py-2 border border-amber text-amber bg-amber/10 hover:bg-amber/20 transition-all duration-200"
      >
        {isSwitching ? 'switching...' : 'switch_to_monad_testnet()'}
      </button>
    )
  }

  if (isConnected) {
    return (
      <button
        onClick={() => disconnect()}
        className="font-mono text-xs px-4 py-2 border transition-all duration-200 border-green text-green bg-green/10 hover:bg-green/20"
      >
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green animate-pulse inline-block" />
          {shortAddress}
        </span>
      </button>
    )
  }

  return (
    <button
      onClick={() => injectedConnector && connect({ connector: injectedConnector })}
      disabled={!injectedConnector || isPending}
      className="font-mono text-xs px-4 py-2 border transition-all duration-200 border-border-bright text-text-dim hover:border-red hover:text-red"
    >
      <span className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-text-muted inline-block" />
        {isPending ? 'connecting...' : 'connect_wallet()'}
      </span>
    </button>
  )
}
