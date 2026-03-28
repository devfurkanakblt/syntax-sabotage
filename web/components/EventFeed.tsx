'use client'

import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore'

function useHydrated() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])
  return hydrated
}

const TYPE_COLORS = {
  info: 'text-text-dim',
  warn: 'text-amber',
  danger: 'text-red',
  success: 'text-green',
}

const TYPE_PREFIX = {
  info: '//',
  warn: '⚠',
  danger: '✕',
  success: '✓',
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s ago`
  return `${Math.floor(s / 60)}m ago`
}

export default function EventFeed() {
  const { events } = useGameStore()
  const bottomRef = useRef<HTMLDivElement>(null)
  const hydrated = useHydrated()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events])

  return (
    <div className="border border-border bg-base-light flex flex-col h-48 overflow-hidden">
      <div className="px-3 py-2 border-b border-border font-mono text-[10px] text-text-muted shrink-0">
        {`// event_feed [${events.length}]`}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin">
        {events.map((ev) => (
          <div key={ev.id} className="flex items-start gap-2 font-mono text-[11px]">
            <span className={`shrink-0 ${TYPE_COLORS[ev.type]}`}>
              {TYPE_PREFIX[ev.type]}
            </span>
            <span className={TYPE_COLORS[ev.type]}>{ev.message}</span>
            <span className="ml-auto text-text-muted text-[9px] shrink-0 pt-0.5">
              {hydrated ? timeAgo(ev.timestamp) : '--'}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
