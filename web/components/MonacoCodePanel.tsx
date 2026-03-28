'use client'

import { useGameStore } from '../store/gameStore'
import dynamic from 'next/dynamic'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

export default function MonacoCodePanel() {
  const { game, player, code, setCodeBuffer } = useGameStore()

  const isReadOnly = game.phase !== 'CODING' || player.isEliminated

  return (
    <div
      className={`
        flex flex-col border h-full transition-all duration-500
        ${isReadOnly ? 'border-border' : 'border-green animate-glow-green'}
      `}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-base-mid">
        <div className="font-mono text-xs text-text-muted">
          {code.receivedFromPlayerId
            ? `// assigned_from: ${code.receivedFromPlayerId}`
            : '// your_buffer.ts'}
        </div>
        <div className={`text-xs font-mono px-2 py-0.5 border ${
          isReadOnly
            ? 'border-text-muted text-text-muted'
            : 'border-green text-green'
        }`}>
          {isReadOnly ? 'READ_ONLY' : 'EDITABLE'}
        </div>
      </div>

      {player.isEliminated && (
        <div className="bg-red/10 border-b border-red px-3 py-1.5 font-mono text-xs text-red">
          {'// ACCESS DENIED - you have been eliminated'}
        </div>
      )}

      <div className="flex-1 min-h-0">
        <MonacoEditor
          height="100%"
          language="typescript"
          theme="vs-dark"
          value={code.currentBuffer}
          onChange={(val) => {
            if (!isReadOnly && val !== undefined) setCodeBuffer(val)
          }}
          options={{
            readOnly: isReadOnly,
            fontSize: 13,
            fontFamily: '"JetBrains Mono", "Cascadia Code", monospace',
            minimap: { enabled: false },
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            renderLineHighlight: isReadOnly ? 'none' : 'line',
            cursorBlinking: 'phase',
            padding: { top: 12, bottom: 12 },
            theme: 'vs-dark',
          }}
        />
      </div>
    </div>
  )
}
