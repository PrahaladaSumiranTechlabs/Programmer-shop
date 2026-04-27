'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

type DiffOp = 'equal' | 'insert' | 'delete'
interface DiffLine { op: DiffOp; text: string; lineA: number | null; lineB: number | null }

/* ── Simple line-level Myers-style diff ──────────────────────── */
function diffLines(a: string, b: string): DiffLine[] {
  const linesA = a === '' ? [] : a.split('\n')
  const linesB = b === '' ? [] : b.split('\n')
  const n = linesA.length, m = linesB.length
  const max = n + m
  const v: number[] = new Array(2 * max + 1).fill(0)
  const trace: number[][] = []

  outer: for (let d = 0; d <= max; d++) {
    trace.push([...v])
    for (let k = -d; k <= d; k += 2) {
      const ki = k + max
      let x: number
      if (k === -d || (k !== d && v[ki - 1] < v[ki + 1])) x = v[ki + 1]
      else x = v[ki - 1] + 1
      let y = x - k
      while (x < n && y < m && linesA[x] === linesB[y]) { x++; y++ }
      v[ki] = x
      if (x >= n && y >= m) break outer
    }
  }

  // backtrack
  const result: DiffLine[] = []
  let x = n, y = m
  for (let d = trace.length - 1; d >= 0 && (x > 0 || y > 0); d--) {
    const vv = trace[d]
    const ki = (x - y) + max
    let prevK: number
    if (x - y === -d || (x - y !== d && vv[ki - 1] < vv[ki + 1])) prevK = ki + 1
    else prevK = ki - 1
    const prevX = vv[prevK]
    const prevY = prevX - (prevK - max)
    while (x > prevX && y > prevY) { x--; y--; result.unshift({ op: 'equal', text: linesA[x], lineA: x + 1, lineB: y + 1 }) }
    if (d > 0) {
      if (x > prevX) { x--; result.unshift({ op: 'delete', text: linesA[x], lineA: x + 1, lineB: null }) }
      else if (y > prevY) { y--; result.unshift({ op: 'insert', text: linesB[y], lineA: null, lineB: y + 1 }) }
    }
  }
  return result
}

const SAMPLES = {
  code: {
    a: `function greet(name) {
  console.log("Hello, " + name)
  return true
}

const users = ["Alice", "Bob"]
users.forEach(greet)`,
    b: `function greet(name: string): void {
  console.log(\`Hello, \${name}!\`)
}

const users: string[] = ["Alice", "Bob", "Charlie"]
users.forEach(greet)
console.log("Done")`
  },
  json: {
    a: `{
  "name": "my-app",
  "version": "1.0.0",
  "dependencies": {
    "react": "^17.0.0",
    "axios": "^0.21.0"
  }
}`,
    b: `{
  "name": "my-app",
  "version": "2.0.0",
  "dependencies": {
    "react": "^18.0.0",
    "axios": "^1.4.0",
    "typescript": "^5.0.0"
  },
  "scripts": {
    "build": "tsc"
  }
}`
  }
}

export default function DiffViewerPage() {
  const [textA, setTextA] = useState(SAMPLES.code.a)
  const [textB, setTextB] = useState(SAMPLES.code.b)
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split')
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false)
  const [showEqual, setShowEqual] = useState(true)

  const normalize = (s: string) => ignoreWhitespace ? s.replace(/\s+/g, ' ').trim() : s

  const diff = useMemo(() => diffLines(normalize(textA), normalize(textB)), [textA, textB, ignoreWhitespace])

  const added = diff.filter(d => d.op === 'insert').length
  const removed = diff.filter(d => d.op === 'delete').length
  const changed = diff.filter(d => d.op !== 'equal').length

  function loadSample(key: 'code' | 'json') {
    setTextA(SAMPLES[key].a)
    setTextB(SAMPLES[key].b)
  }

  function handleFileA(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    new FileReader().onload = ev => setTextA(ev.target?.result as string || '')
    new FileReader().readAsText(f); e.target.value = ''
  }
  function handleFileB(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    const r = new FileReader(); r.onload = ev => setTextB(ev.target?.result as string || ''); r.readAsText(f); e.target.value = ''
  }

  const opStyle: Record<DiffOp, string> = {
    insert: 'bg-emerald-500/10 border-l-2 border-emerald-500 text-emerald-200',
    delete: 'bg-red-500/10 border-l-2 border-red-500 text-red-200',
    equal: 'text-slate-400',
  }
  const opPrefix: Record<DiffOp, string> = { insert: '+', delete: '−', equal: ' ' }
  const opPrefixColor: Record<DiffOp, string> = { insert: 'text-emerald-500', delete: 'text-red-500', equal: 'text-slate-700' }

  const displayDiff = showEqual ? diff : diff.filter(d => d.op !== 'equal')

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-screen-xl mx-auto px-4 h-13 py-3 flex items-center gap-3 flex-wrap">
          <Link href="/" className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Home
          </Link>
          <span className="text-slate-700">·</span>
          <span className="font-semibold text-sm">🔀 Diff Viewer</span>

          {/* Stats */}
          {(added > 0 || removed > 0) && (
            <div className="flex items-center gap-2 ml-2">
              <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">+{added} added</span>
              <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/10 border border-red-500/25 text-red-400">−{removed} removed</span>
              <span className="px-2 py-0.5 text-xs rounded-full bg-slate-700/50 border border-slate-600/50 text-slate-400">{changed} changed lines</span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {/* Samples */}
            <button onClick={() => loadSample('code')} className="px-2.5 py-1 text-xs rounded-md bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">Sample: Code</button>
            <button onClick={() => loadSample('json')} className="px-2.5 py-1 text-xs rounded-md bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">Sample: JSON</button>

            {/* Ignore whitespace */}
            <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
              <input type="checkbox" checked={ignoreWhitespace} onChange={e => setIgnoreWhitespace(e.target.checked)} className="accent-indigo-500" />
              Ignore whitespace
            </label>

            {/* Show equal */}
            <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
              <input type="checkbox" checked={showEqual} onChange={e => setShowEqual(e.target.checked)} className="accent-indigo-500" />
              Show context
            </label>

            {/* View mode */}
            <div className="flex rounded-md border border-slate-700 overflow-hidden">
              {(['split', 'unified'] as const).map(v => (
                <button key={v} onClick={() => setViewMode(v)}
                  className={`px-2.5 py-1 text-xs font-medium capitalize transition-colors ${viewMode === v ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex flex-col gap-0 overflow-hidden" style={{ minHeight: 0 }}>

        {/* Input row */}
        <div className="grid grid-cols-2 gap-0 border-b border-slate-800">
          {/* Left */}
          <div className="flex flex-col border-r border-slate-800">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900/60 border-b border-slate-800">
              <span className="text-xs font-medium text-red-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400" /> Original (A)
              </span>
              <label className="text-xs text-slate-600 hover:text-slate-400 cursor-pointer transition-colors">
                Upload
                <input type="file" accept=".txt,.js,.ts,.json,.md,.py,.sql,.yaml,.yml,.css,.html" className="hidden" onChange={handleFileA} />
              </label>
            </div>
            <textarea value={textA} onChange={e => setTextA(e.target.value)} spellCheck={false}
              className="flex-1 bg-slate-950 text-slate-300 font-mono text-xs resize-none px-4 py-3 focus:outline-none leading-relaxed"
              style={{ height: '180px' }} />
          </div>
          {/* Right */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900/60 border-b border-slate-800">
              <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Modified (B)
              </span>
              <label className="text-xs text-slate-600 hover:text-slate-400 cursor-pointer transition-colors">
                Upload
                <input type="file" accept=".txt,.js,.ts,.json,.md,.py,.sql,.yaml,.yml,.css,.html" className="hidden" onChange={handleFileB} />
              </label>
            </div>
            <textarea value={textB} onChange={e => setTextB(e.target.value)} spellCheck={false}
              className="flex-1 bg-slate-950 text-slate-300 font-mono text-xs resize-none px-4 py-3 focus:outline-none leading-relaxed"
              style={{ height: '180px' }} />
          </div>
        </div>

        {/* Diff output */}
        <div className="flex-1 overflow-auto bg-slate-950">
          {displayDiff.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-600 text-sm">
              {textA === textB ? '✓ Files are identical' : 'No differences to show'}
            </div>
          ) : viewMode === 'unified' ? (
            /* Unified view */
            <table className="w-full text-xs font-mono border-collapse">
              <tbody>
                {displayDiff.map((line, i) => (
                  <tr key={i} className={`${line.op === 'insert' ? 'bg-emerald-500/8' : line.op === 'delete' ? 'bg-red-500/8' : ''} hover:brightness-110`}>
                    <td className="w-10 text-right px-2 py-0.5 text-slate-700 select-none border-r border-slate-800">{line.lineA ?? ''}</td>
                    <td className="w-10 text-right px-2 py-0.5 text-slate-700 select-none border-r border-slate-800">{line.lineB ?? ''}</td>
                    <td className={`w-5 text-center py-0.5 select-none font-bold ${opPrefixColor[line.op]}`}>{opPrefix[line.op]}</td>
                    <td className={`px-3 py-0.5 whitespace-pre-wrap break-all ${opStyle[line.op]}`}>{line.text || ' '}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            /* Split view */
            <div className="grid grid-cols-2 gap-0 h-full">
              <div className="border-r border-slate-800 overflow-auto">
                <table className="w-full text-xs font-mono border-collapse">
                  <tbody>
                    {displayDiff.filter(l => l.op !== 'insert').map((line, i) => (
                      <tr key={i} className={`${line.op === 'delete' ? 'bg-red-500/10' : ''} hover:brightness-110`}>
                        <td className="w-10 text-right px-2 py-0.5 text-slate-700 select-none border-r border-slate-800">{line.lineA ?? ''}</td>
                        <td className={`w-5 text-center py-0.5 font-bold select-none ${line.op === 'delete' ? 'text-red-500' : 'text-slate-700'}`}>{line.op === 'delete' ? '−' : ' '}</td>
                        <td className={`px-3 py-0.5 whitespace-pre-wrap break-all ${line.op === 'delete' ? 'text-red-200 border-l-2 border-red-500' : 'text-slate-400'}`}>{line.text || ' '}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="overflow-auto">
                <table className="w-full text-xs font-mono border-collapse">
                  <tbody>
                    {displayDiff.filter(l => l.op !== 'delete').map((line, i) => (
                      <tr key={i} className={`${line.op === 'insert' ? 'bg-emerald-500/10' : ''} hover:brightness-110`}>
                        <td className="w-10 text-right px-2 py-0.5 text-slate-700 select-none border-r border-slate-800">{line.lineB ?? ''}</td>
                        <td className={`w-5 text-center py-0.5 font-bold select-none ${line.op === 'insert' ? 'text-emerald-500' : 'text-slate-700'}`}>{line.op === 'insert' ? '+' : ' '}</td>
                        <td className={`px-3 py-0.5 whitespace-pre-wrap break-all ${line.op === 'insert' ? 'text-emerald-200 border-l-2 border-emerald-500' : 'text-slate-400'}`}>{line.text || ' '}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
