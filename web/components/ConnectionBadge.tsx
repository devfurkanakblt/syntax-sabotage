'use client'

interface ConnectionBadgeProps {
  status: 'idle' | 'connecting' | 'connected' | 'error'
  error?: string | null
  onRetry?: () => void
}

export default function ConnectionBadge({ status, error, onRetry }: ConnectionBadgeProps) {
  const color =
    status === 'connected'
      ? 'border-green/50 text-green'
      : status === 'connecting'
        ? 'border-cyan/50 text-cyan'
        : status === 'error'
          ? 'border-red/50 text-red'
          : 'border-border text-text-muted'

  const label =
    status === 'connected'
      ? 'socket:connected'
      : status === 'connecting'
        ? 'socket:connecting'
        : status === 'error'
          ? 'socket:error'
          : 'socket:idle'

  return (
    <div className="flex items-center gap-2">
      <span className={`font-mono text-[10px] border px-2 py-1 ${color}`}>
        {label}
      </span>
      {status === 'error' && onRetry && (
        <button
          onClick={onRetry}
          className="font-mono text-[10px] border border-red/50 text-red px-2 py-1 hover:bg-red/10 transition-colors"
        >
          retry_socket()
        </button>
      )}
      {status === 'error' && error && (
        <span className="font-mono text-[10px] text-red max-w-[220px] truncate" title={error}>
          {error}
        </span>
      )}
    </div>
  )
}
