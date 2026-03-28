'use client'

import { useGameStore } from '../store/gameStore'

export default function VotingPanel() {
  const { lobby, game, player, voting, castVote } = useGameStore()
  const { players } = lobby
  const { phase } = game

  if (phase !== 'VOTE_RESOLVE') return null

  const eligible = players.filter((p) => !p.isEliminated && p.id !== player.id)
  const voteCounts: Record<string, number> = {}
  Object.values(voting.votes).forEach((targetId) => {
    voteCounts[targetId] = (voteCounts[targetId] ?? 0) + 1
  })
  const mostVotes = Math.max(0, ...Object.values(voteCounts))

  return (
    <div className="border border-red bg-red/5 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-red flex items-center gap-3">
        <span className="text-red font-display text-lg tracking-widest">✕ VOTE</span>
        <span className="text-text-muted font-mono text-xs ml-auto">
          {voting.hasVoted ? '// vote_cast' : '// select_target'}
        </span>
      </div>

      <div className="p-3 flex-1">
        <div className="text-text-muted font-mono text-[10px] mb-3">
          {'// who_is_the_imposter?'}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {eligible.map((p) => {
            const voteCount = voteCounts[p.id] ?? 0
            const isVotedFor = voting.votes[player.id] === p.id
            const isLeading = voteCount === mostVotes && voteCount > 0

            return (
              <button
                key={p.id}
                onClick={() => !voting.hasVoted && castVote(p.id)}
                disabled={voting.hasVoted}
                className={`
                  border p-3 text-left font-mono text-xs transition-all duration-200
                  ${isVotedFor
                    ? 'border-red bg-red/20 text-red'
                    : voting.hasVoted
                      ? 'border-border text-text-muted cursor-default'
                      : 'border-border-bright text-text hover:border-red hover:bg-red/10 cursor-pointer'
                  }
                `}
              >
                <div className="flex items-center justify-between mb-1">
                  <span>{p.name}</span>
                  {isLeading && (
                    <span className="text-[9px] border border-red text-red px-1">LEADING</span>
                  )}
                </div>
                {voting.hasVoted && (
                  <div className="mt-1">
                    <div
                      className="h-0.5 bg-red transition-all duration-700"
                      style={{ width: `${(voteCount / players.length) * 100}%` }}
                    />
                    <div className="text-[10px] text-text-muted mt-1">{voteCount} vote{voteCount !== 1 ? 's' : ''}</div>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {!voting.hasVoted && (
        <div className="p-3 border-t border-border font-mono text-[10px] text-text-muted">
          {'// one vote per player - choose wisely'}
        </div>
      )}
    </div>
  )
}
