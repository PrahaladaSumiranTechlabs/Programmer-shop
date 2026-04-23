'use client'
import { useState, useEffect } from 'react'
import { ParsedGitFile } from '@/lib/types'

interface Props {
  value: string[]
  onChange: (files: string[]) => void
}

function parseGitStatus(input: string): ParsedGitFile[] {
  const files: ParsedGitFile[] = []
  const lines = input.split('\n')
  let inUntracked = false

  for (const line of lines) {
    if (line.includes('Untracked files:')) { inUntracked = true; continue }
    if (line.trim() === '') { inUntracked = false; continue }
    if (line.startsWith('\t') && inUntracked) {
      const file = line.trim()
      if (file && !file.startsWith('(')) {
        files.push({ status: 'untracked', file })
      }
      continue
    }
    // Match: "        deleted:    path/to/file" or "        modified:   path/to/file"
    const match = line.match(/^\s+([\w ]+):\s+(.+)$/)
    if (match) {
      let status = match[1].trim()
      let file = match[2].trim()
      // Handle renames: "old -> new"
      if (status === 'renamed' && file.includes(' -> ')) {
        file = file.split(' -> ')[1]
      }
      files.push({ status, file })
    }
  }

  return files
}

const STATUS_COLORS: Record<string, string> = {
  modified: 'text-yellow-400',
  deleted: 'text-red-400',
  'new file': 'text-green-400',
  untracked: 'text-blue-400',
  renamed: 'text-purple-400',
  copied: 'text-cyan-400',
}

const STATUS_LABEL: Record<string, string> = {
  modified: 'M',
  deleted: 'D',
  'new file': 'A',
  untracked: '?',
  renamed: 'R',
  copied: 'C',
}

export default function GitStatusInput({ value, onChange }: Props) {
  const [raw, setRaw] = useState('')
  const [parsed, setParsed] = useState<ParsedGitFile[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set(value))

  const doParse = (input: string) => {
    const files = parseGitStatus(input)
    setParsed(files)
    // Auto-select all on first parse
    const all = new Set(files.map(f => f.file))
    setSelected(all)
    onChange(Array.from(all))
  }

  const toggle = (file: string) => {
    const next = new Set(selected)
    if (next.has(file)) next.delete(file)
    else next.add(file)
    setSelected(next)
    onChange(Array.from(next))
  }

  const selectByStatus = (status: string) => {
    const next = new Set(selected)
    const statusFiles = parsed.filter(f => f.status === status).map(f => f.file)
    const allSelected = statusFiles.every(f => next.has(f))
    statusFiles.forEach(f => allSelected ? next.delete(f) : next.add(f))
    setSelected(next)
    onChange(Array.from(next))
  }

  const selectAll = () => {
    const all = new Set(parsed.map(f => f.file))
    setSelected(all)
    onChange(Array.from(all))
  }

  const selectNone = () => {
    setSelected(new Set())
    onChange([])
  }

  const groupedStatuses = Array.from(new Set(parsed.map(f => f.status)))

  return (
    <div className="space-y-2">
      <textarea
        className="w-full h-32 bg-slate-900 border border-slate-600 rounded text-sm text-slate-300 font-mono p-2 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
        placeholder={'Paste the output of `git status` here...\n\n        modified:   src/app.ts\n        deleted:    old-file.py\n        new file:   feature.ts'}
        value={raw}
        onChange={e => setRaw(e.target.value)}
      />
      <button
        type="button"
        onClick={() => doParse(raw)}
        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded font-medium transition-colors"
      >
        Parse
      </button>

      {parsed.length > 0 && (
        <div className="border border-slate-700 rounded overflow-hidden">
          {/* Actions bar */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 border-b border-slate-700 flex-wrap">
            <span className="text-xs text-slate-400">{selected.size}/{parsed.length} selected</span>
            <button type="button" onClick={selectAll} className="text-xs text-indigo-400 hover:text-indigo-300">All</button>
            <button type="button" onClick={selectNone} className="text-xs text-slate-400 hover:text-slate-300">None</button>
            {groupedStatuses.map(st => (
              <button
                key={st}
                type="button"
                onClick={() => selectByStatus(st)}
                className={`text-xs px-1.5 py-0.5 rounded border border-slate-600 hover:border-slate-400 transition-colors ${STATUS_COLORS[st] || 'text-slate-300'}`}
              >
                {st} ({parsed.filter(f => f.status === st).length})
              </button>
            ))}
          </div>

          {/* File list */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-800">
            {groupedStatuses.map(status => (
              <div key={status}>
                {parsed.filter(f => f.status === status).map(file => (
                  <label
                    key={file.file}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(file.file)}
                      onChange={() => toggle(file.file)}
                      className="w-3.5 h-3.5 accent-indigo-500 flex-shrink-0"
                    />
                    <span className={`text-xs font-mono font-bold w-4 flex-shrink-0 ${STATUS_COLORS[file.status] || 'text-slate-400'}`}>
                      {STATUS_LABEL[file.status] || '·'}
                    </span>
                    <span className="text-xs font-mono text-slate-300 truncate group-hover:text-white transition-colors">
                      {file.file}
                    </span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {parsed.length === 0 && raw.trim() !== '' && (
        <p className="text-xs text-slate-500">No files detected — paste full `git status` output or lines like <code className="text-slate-400">modified: path/to/file</code></p>
      )}
    </div>
  )
}
