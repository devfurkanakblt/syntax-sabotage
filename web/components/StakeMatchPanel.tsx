'use client'

import { useMemo, useState } from 'react'
import { formatEther, parseEther } from 'viem'
import { useAccount, useChainId, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { monadTestnet } from '../lib/chains'
import { getMatchIdForLobby, getPoolContractAddress, SYNTAX_POOL_ABI } from '../lib/syntaxSabotagePool'

interface StakeMatchPanelProps {
  lobbyId: string
  isHost: boolean
}

const entryFeeFromEnv = process.env.NEXT_PUBLIC_ENTRY_FEE_ETH?.trim() || '0.001'

export default function StakeMatchPanel({ lobbyId, isHost }: StakeMatchPanelProps) {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()

  const [createHash, setCreateHash] = useState<`0x${string}` | undefined>()
  const [joinHash, setJoinHash] = useState<`0x${string}` | undefined>()
  const [status, setStatus] = useState<string>('')

  const poolAddress = getPoolContractAddress()
  const matchId = useMemo(() => getMatchIdForLobby(lobbyId), [lobbyId])
  const entryFeeWei = useMemo(() => parseEther(entryFeeFromEnv), [])

  const createReceipt = useWaitForTransactionReceipt({ hash: createHash })
  const joinReceipt = useWaitForTransactionReceipt({ hash: joinHash })

  const pending = createReceipt.isLoading || joinReceipt.isLoading || isSwitching

  async function ensureMonadNetwork() {
    if (chainId === monadTestnet.id) {
      return true
    }

    try {
      await switchChainAsync({ chainId: monadTestnet.id })
      return true
    } catch {
      setStatus('Failed to switch to Monad Testnet.')
      return false
    }
  }

  async function handleCreatePool() {
    if (!poolAddress) {
      setStatus('Set NEXT_PUBLIC_POOL_ADDRESS before creating a pool.')
      return
    }

    const ok = await ensureMonadNetwork()
    if (!ok) return

    try {
      const hash = await writeContractAsync({
        address: poolAddress,
        abi: SYNTAX_POOL_ABI,
        functionName: 'createMatchPool',
        args: [matchId, entryFeeWei],
      })
      setCreateHash(hash)
      setStatus('Pool creation transaction submitted.')
    } catch (error) {
      setStatus(`Pool creation failed: ${String(error)}`)
    }
  }

  async function handleJoinPool() {
    if (!poolAddress) {
      setStatus('Set NEXT_PUBLIC_POOL_ADDRESS before joining a pool.')
      return
    }

    const ok = await ensureMonadNetwork()
    if (!ok) return

    try {
      const hash = await writeContractAsync({
        address: poolAddress,
        abi: SYNTAX_POOL_ABI,
        functionName: 'joinMatch',
        args: [matchId],
        value: entryFeeWei,
      })
      setJoinHash(hash)
      setStatus('Stake transaction submitted.')
    } catch (error) {
      setStatus(`Stake transaction failed: ${String(error)}`)
    }
  }

  return (
    <div className="border border-cyan/40 bg-cyan/5 p-4 font-mono text-xs text-text-dim space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-cyan">{'// staking_pool'}</div>
        <div className="text-text-muted">entry_fee: {formatEther(entryFeeWei)} MON</div>
      </div>

      <div className="text-[11px] text-text-muted">
        Connect wallet and stake to be eligible for payout at match finalization.
      </div>

      {!isConnected && (
        <div className="border border-dashed border-border px-3 py-2 text-text-muted">
          connect wallet first to enable on-chain actions
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {isHost && (
          <button
            onClick={handleCreatePool}
            disabled={!isConnected || pending}
            className={`px-3 py-2 border transition-colors ${
              !isConnected || pending
                ? 'border-border text-text-muted opacity-50 cursor-not-allowed'
                : 'border-cyan text-cyan hover:bg-cyan/10'
            }`}
          >
            CREATE_POOL()
          </button>
        )}

        <button
          onClick={handleJoinPool}
          disabled={!isConnected || pending}
          className={`px-3 py-2 border transition-colors ${
            !isConnected || pending
              ? 'border-border text-text-muted opacity-50 cursor-not-allowed'
              : 'border-green text-green hover:bg-green/10'
          }`}
        >
          JOIN_POOL_AND_STAKE()
        </button>
      </div>

      {status && <div className="text-[10px] text-text-muted break-words">{status}</div>}

      {createHash && (
        <div className="text-[10px] text-amber break-all">
          pool_tx: {createHash}
          {createReceipt.isSuccess ? ' (confirmed)' : createReceipt.isLoading ? ' (confirming...)' : ''}
        </div>
      )}

      {joinHash && (
        <div className="text-[10px] text-green break-all">
          stake_tx: {joinHash}
          {joinReceipt.isSuccess ? ' (confirmed)' : joinReceipt.isLoading ? ' (confirming...)' : ''}
        </div>
      )}
    </div>
  )
}
