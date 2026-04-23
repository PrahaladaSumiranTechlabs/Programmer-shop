'use client'
import { useState } from 'react'
import { GeneratedCommand } from '@/lib/types'

interface Props {
  generated: GeneratedCommand | null
}

export default function OutputBox({ generated }: Props) {
  const [copied, setCopied] = useState<'single' | 'multi' | null>(null)
  const [view, setView] = useState<'multi' | 'single'>('multi')

  if (!generated) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-600 text-sm border border-dashed border-slate-700 rounded-lg">
        Fill in the form above to generate a command
      </div>
    )
  }

  const singleLine = generated.parts.join(' ')
  const multiLine = generated.parts.length > 1
    ? [generated.parts[0], ...generated.parts.slice(1).map(p => '  ' + p)].join(' \\\n')
    : singleLine

  const displayText = view === 'multi' ? multiLine : singleLine

  const copy = async (text: string, type: 'single' | 'multi') => {
    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Generated Command</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView('multi')}
            className={`text-xs px-2 py-1 rounded transition-colors ${view === 'multi' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Multiline
          </button>
          <button
            onClick={() => setView('single')}
            className={`text-xs px-2 py-1 rounded transition-colors ${view === 'single' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Single line
          </button>
        </div>
      </div>

      <div className="relative group">
        <pre className="bg-slate-950 border border-slate-700 rounded-lg p-4 text-sm font-mono text-emerald-400 overflow-x-auto whitespace-pre leading-relaxed min-h-[4rem]">
          <span className="text-slate-600 select-none mr-2">$</span>{displayText}
        </pre>
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => copy(singleLine, 'single')}
            className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-xs text-slate-300 rounded transition-colors"
            title="Copy as single line"
          >
            {copied === 'single' ? '✓ Copied' : 'Copy'}
          </button>
          {generated.parts.length > 1 && (
            <button
              onClick={() => copy(multiLine, 'multi')}
              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-xs text-slate-300 rounded transition-colors"
              title="Copy with line continuations"
            >
              {copied === 'multi' ? '✓ Copied' : 'Copy \\'}
            </button>
          )}
        </div>
      </div>

      {generated.parts.length > 2 && (
        <p className="text-xs text-slate-600">{generated.parts.length - 1} arguments</p>
      )}
    </div>
  )
}
