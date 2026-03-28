'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatEther, isAddress, parseEther } from 'viem'
import { useAccount, useChainId, usePublicClient, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { monadTestnet } from '../lib/chains'
import { getMatchIdForLobby, getPoolContractAddress, SYNTAX_POOL_ABI } from '../lib/syntaxSabotagePool'
import { useGameStore } from '../store/gameStore'
import { isPresentationMode } from '../lib/presentationMode'

interface StakeMatchPanelProps {
  lobbyId: string
  isHost: boolean
}

const entryFeeFromEnv = process.env.NEXT_PUBLIC_ENTRY_FEE_ETH?.trim() || '0.001'

function extractErrorMessage(error: unknown): string {
  if (!error) {
    return 'unknown error'
  }

  if (typeof error === 'string') {
    return error
  }

  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'object') {
    const asRecord = error as Record<string, unknown>
    const candidates = [
      asRecord.shortMessage,
      asRecord.message,
      asRecord.reason,
      (asRecord.cause as Record<string, unknown> | undefined)?.shortMessage,
      (asRecord.cause as Record<string, unknown> | undefined)?.message,
      (asRecord.data as Record<string, unknown> | undefined)?.message,
    ]

    const first = candidates.find((value): value is string => typeof value === 'string' && value.trim().length > 0)
    if (first) {
      return first
    }
  }

  return String(error)
}

export default function StakeMatchPanel({ lobbyId, isHost }: StakeMatchPanelProps) {
  const { isConnected, address } = useAccount()
  const { lobby } = useGameStore()
  const publicClient = usePublicClient({ chainId: monadTestnet.id })
  const chainId = useChainId()
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()

  const [createHash, setCreateHash] = useState<`0x${string}` | undefined>()
  const [joinHash, setJoinHash] = useState<`0x${string}` | undefined>()
  const [endingHash, setEndingHash] = useState<`0x${string}` | undefined>()
  const [status, setStatus] = useState<string>('')
  const [presentationModeActive, setPresentationModeActive] = useState(false)

  const poolAddress = getPoolContractAddress()
  const matchId = useMemo(() => getMatchIdForLobby(lobbyId), [lobbyId])
  const entryFeeWei = useMemo(() => parseEther(entryFeeFromEnv), [])

  const createReceipt = useWaitForTransactionReceipt({ hash: createHash })
  const joinReceipt = useWaitForTransactionReceipt({ hash: joinHash })
  const endingReceipt = useWaitForTransactionReceipt({ hash: endingHash })

  useEffect(() => {
    setPresentationModeActive(isPresentationMode())
  }, [])

  useEffect(() => {
    if (createReceipt.isSuccess) {
      setStatus('Pool creation confirmed on-chain.')
      return
    }

    if (createReceipt.isError) {
      setStatus(`Pool creation failed on-chain: ${extractErrorMessage(createReceipt.error)}`)
    }
  }, [createReceipt.isSuccess, createReceipt.isError, createReceipt.error])

  useEffect(() => {
    if (joinReceipt.isSuccess) {
      setStatus('Stake transaction confirmed on-chain.')
      return
    }

    if (joinReceipt.isError) {
      setStatus(`Stake transaction failed on-chain: ${extractErrorMessage(joinReceipt.error)}`)
    }
  }, [joinReceipt.isSuccess, joinReceipt.isError, joinReceipt.error])

  useEffect(() => {
    if (endingReceipt.isSuccess) {
      setStatus('Ending test mint confirmed on-chain.')
      return
    }

    if (endingReceipt.isError) {
      setStatus(`Ending test mint failed on-chain: ${extractErrorMessage(endingReceipt.error)}`)
    }
  }, [endingReceipt.isSuccess, endingReceipt.isError, endingReceipt.error])

  const winnerWalletsForTest = useMemo(() => {
    const wallets = new Set<string>()
    for (const player of lobby.players) {
      const wallet = player.walletAddress?.trim().toLowerCase()
      if (wallet && isAddress(wallet)) {
        wallets.add(wallet)
      }
    }
    return Array.from(wallets) as `0x${string}`[]
  }, [lobby.players])

  const effectiveRecipientsForTest = useMemo(() => {
    if (winnerWalletsForTest.length > 0) {
      return winnerWalletsForTest
    }

    if (presentationModeActive && address && isAddress(address)) {
      return [address.toLowerCase() as `0x${string}`]
    }

    return [] as `0x${string}`[]
  }, [winnerWalletsForTest, presentationModeActive, address])

  const pending = createReceipt.isLoading || joinReceipt.isLoading || endingReceipt.isLoading || isSwitching

  const endingDisabledReason = useMemo(() => {
    if (!isConnected) {
      return 'ending buttons locked: connect wallet first'
    }

    if (pending) {
      return 'ending buttons locked: waiting for previous transaction confirmation'
    }

    if (effectiveRecipientsForTest.length === 0) {
      return 'ending buttons locked: no recipient wallet found in lobby'
    }

    return null
  }, [isConnected, pending, effectiveRecipientsForTest.length])

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
    if (presentationModeActive) {
      setStatus('Presentation mode: CREATE_POOL() skipped (mock). Use ending buttons for demo mint.')
      return
    }

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
    if (presentationModeActive) {
      setStatus('Presentation mode: JOIN_POOL_AND_STAKE() skipped (mock).')
      return
    }

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

  async function handleTestEndingMint(badgeType: 0 | 1) {
    if (!poolAddress) {
      setStatus('Set NEXT_PUBLIC_POOL_ADDRESS before test-ending mint.')
      return
    }

    if (effectiveRecipientsForTest.length === 0) {
      setStatus('No valid lobby wallet addresses found for test mint recipients.')
      return
    }

    const ok = await ensureMonadNetwork()
    if (!ok) return

    if (!publicClient) {
      setStatus('Public client is not ready yet. Try again in a moment.')
      return
    }

    try {
      const owner = await publicClient.readContract({
        address: poolAddress,
        abi: SYNTAX_POOL_ABI,
        functionName: 'owner',
      })

      if (!address || owner.toLowerCase() !== address.toLowerCase()) {
        setStatus(`Only pool owner can mint ending badges. owner=${owner}`)
        return
      }

      if (presentationModeActive) {
        const hash = await writeContractAsync({
          address: poolAddress,
          abi: SYNTAX_POOL_ABI,
          functionName: 'mintDemoCrewBadges',
          args: [effectiveRecipientsForTest, badgeType],
        })
        setEndingHash(hash)
        setStatus(
          badgeType === 0
            ? 'Presentation Ending 1 submitted: debugger demo NFT mint tx sent.'
            : 'Presentation Ending 2 submitted: de-impostorer demo NFT mint tx sent.',
        )
        return
      }

      const exists = await publicClient.readContract({
        address: poolAddress,
        abi: SYNTAX_POOL_ABI,
        functionName: 'poolExists',
        args: [matchId],
      })

      if (!exists) {
        setStatus('Pool not found for this lobby. Run CREATE_POOL() first.')
        return
      }

      for (const winner of winnerWalletsForTest) {
        const joined = await publicClient.readContract({
          address: poolAddress,
          abi: SYNTAX_POOL_ABI,
          functionName: 'hasJoined',
          args: [matchId, winner],
        })

        if (!joined) {
          setStatus(`Winner wallet has not joined stake pool: ${winner}`)
          return
        }
      }
    } catch (error) {
      if (presentationModeActive) {
        setStatus(`Presentation mint preflight failed: ${extractErrorMessage(error)}. Contract may be old; redeploy latest pool.`)
      } else {
        setStatus(`Preflight check failed: ${extractErrorMessage(error)}`)
      }
      return
    }

    try {
      const hash = await writeContractAsync({
        address: poolAddress,
        abi: SYNTAX_POOL_ABI,
        functionName: 'finalizeMatchAndMintCrewBadge',
        args: [matchId, effectiveRecipientsForTest, badgeType],
      })
      setEndingHash(hash)
      setStatus(
        badgeType === 0
          ? 'Ending 1 submitted: debugger soulbound badge mint tx sent.'
          : 'Ending 2 submitted: de-impostorer soulbound badge mint tx sent.',
      )
    } catch (error) {
      setStatus(`Ending test mint failed: ${String(error)}`)
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

      {presentationModeActive && (
        <div className="text-[10px] text-amber border border-amber/40 bg-amber/10 px-3 py-2">
          presentation mode active: pool/stake buttons are mocked, ending buttons mint demo NFTs directly.
        </div>
      )}

      {isHost && (
        <div className="text-[10px] text-cyan border border-cyan/30 bg-cyan/10 px-3 py-2">
          test recipients detected: {effectiveRecipientsForTest.length} wallet(s)
          {winnerWalletsForTest.length === 0 && effectiveRecipientsForTest.length > 0 ? ' (fallback: connected wallet)' : ''}
        </div>
      )}

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

        {isHost && (
          <>
            <button
              onClick={() => handleTestEndingMint(0)}
              disabled={!isConnected || pending || effectiveRecipientsForTest.length === 0}
              className={`px-3 py-2 border transition-colors ${
                !isConnected || pending || effectiveRecipientsForTest.length === 0
                  ? 'border-border text-text-muted opacity-50 cursor-not-allowed'
                  : 'border-amber text-amber hover:bg-amber/10'
              }`}
            >
              ENDING_1_DEBUGGER()
            </button>

            <button
              onClick={() => handleTestEndingMint(1)}
              disabled={!isConnected || pending || effectiveRecipientsForTest.length === 0}
              className={`px-3 py-2 border transition-colors ${
                !isConnected || pending || effectiveRecipientsForTest.length === 0
                  ? 'border-border text-text-muted opacity-50 cursor-not-allowed'
                  : 'border-red text-red hover:bg-red/10'
              }`}
            >
              ENDING_2_DE_IMPOSTORER()
            </button>
          </>
        )}
      </div>

      {isHost && endingDisabledReason && (
        <div className="text-[10px] text-amber/90 border border-amber/30 bg-amber/10 px-3 py-2">
          {endingDisabledReason}
        </div>
      )}

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

      {endingHash && (
        <div className="text-[10px] text-cyan break-all">
          ending_tx: {endingHash}
          {endingReceipt.isSuccess ? ' (confirmed)' : endingReceipt.isLoading ? ' (confirming...)' : ''}
        </div>
      )}
    </div>
  )
}
