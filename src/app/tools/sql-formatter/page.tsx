'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Script from 'next/script'

declare global {
  interface Window {
    sqlFormatter: {
      format: (sql: string, options?: Record<string, unknown>) => string
    }
  }
}

type Dialect = 'sql' | 'mysql' | 'postgresql' | 'sqlite' | 'tsql' | 'plsql' | 'bigquery'
type KeywordCase = 'upper' | 'lower' | 'preserve'

const DIALECTS: { value: Dialect; label: string }[] = [
  { value: 'sql', label: 'Standard SQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'sqlite', label: 'SQLite' },
  { value: 'tsql', label: 'T-SQL (SQL Server)' },
  { value: 'plsql', label: 'PL/SQL (Oracle)' },
  { value: 'bigquery', label: 'BigQuery' },
]

const SAMPLE_SQL = `SELECT u.id,u.name,u.email,COUNT(o.id) as order_count,SUM(o.total) as total_spent,MAX(o.created_at) as last_order FROM users u LEFT JOIN orders o ON o.user_id=u.id LEFT JOIN user_profiles p ON p.user_id=u.id WHERE u.created_at>='2024-01-01' AND u.status='active' AND (u.role='customer' OR u.role='vip') GROUP BY u.id,u.name,u.email HAVING COUNT(o.id)>0 ORDER BY total_spent DESC LIMIT 50;`

export default function SQLFormatterPage() {
  const [input, setInput] = useState(SAMPLE_SQL)
  const [output, setOutput] = useState('')
  const [dialect, setDialect] = useState<Dialect>('postgresql')
  const [keywordCase, setKeywordCase] = useState<KeywordCase>('upper')
  const [indentSize, setIndentSize] = useState(2)
  const [linesBetweenQueries, setLinesBetweenQueries] = useState(1)
  const [ready, setReady] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const format = useCallback(() => {
    if (!ready || !window.sqlFormatter || !input.trim()) { setOutput(''); return }
    try {
      const result = window.sqlFormatter.format(input, {
        language: dialect,
        keywordCase,
        indentStyle: 'standard',
        tabWidth: indentSize,
        linesBetweenQueries,
      })
      setOutput(result)
      setError('')
    } catch (e) {
      setError(String(e))
      setOutput('')
    }
  }, [input, dialect, keywordCase, indentSize, linesBetweenQueries, ready])

  useEffect(() => { format() }, [format])

  function copy() {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function minify() {
    // Simple minifier: collapse whitespace, keep single spaces
    const minified = input
      .replace(/\s+/g, ' ')
      .replace(/\s*([,;()=<>!+\-*/])\s*/g, '$1')
      .trim()
    setInput(minified)
  }

  const lineCount = output ? output.split('\n').length : 0

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/sql-formatter@15.4.2/dist/sql-formatter.min.js"
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
      />

      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        {/* Nav */}
        <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
          <div className="max-w-screen-xl mx-auto px-4 h-13 py-3 flex items-center gap-3 flex-wrap">
            <Link href="/" className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Home
            </Link>
            <span className="text-slate-700">·</span>
            <span className="font-semibold text-sm">🗄 SQL Formatter</span>

            <div className="ml-auto flex items-center gap-2 flex-wrap">
              {/* Dialect */}
              <select value={dialect} onChange={e => setDialect(e.target.value as Dialect)}
                className="text-xs bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                {DIALECTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>

              {/* Keyword case */}
              <select value={keywordCase} onChange={e => setKeywordCase(e.target.value as KeywordCase)}
                className="text-xs bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                <option value="upper">UPPERCASE keywords</option>
                <option value="lower">lowercase keywords</option>
                <option value="preserve">Preserve case</option>
              </select>

              {/* Indent */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                Indent:
                <select value={indentSize} onChange={e => setIndentSize(Number(e.target.value))}
                  className="text-xs bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  {[2, 4, 8].map(n => <option key={n} value={n}>{n} spaces</option>)}
                </select>
              </div>

              <span className={`flex items-center gap-1 text-xs ${ready ? 'text-emerald-500' : 'text-yellow-500 animate-pulse'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${ready ? 'bg-emerald-500' : 'bg-yellow-400 animate-pulse'}`} />
                {ready ? 'Ready' : 'Loading…'}
              </span>
            </div>
          </div>
        </nav>

        {/* Split layout */}
        <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden" style={{ minHeight: 0 }}>

          {/* Input */}
          <div className="flex flex-col border-r border-slate-800 overflow-hidden">
            <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-slate-900/60 border-b border-slate-800">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                Input SQL
              </span>
              <div className="flex gap-2">
                <button onClick={minify} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Minify</button>
                <button onClick={() => setInput('')} className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Clear</button>
                <button onClick={() => setInput(SAMPLE_SQL)} className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Sample</button>
              </div>
            </div>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              spellCheck={false}
              placeholder="Paste your SQL here…"
              className="flex-1 bg-slate-950 text-slate-300 font-mono text-[13px] resize-none px-4 py-3 focus:outline-none leading-relaxed placeholder-slate-700 overflow-auto"
            />
            <div className="shrink-0 px-4 py-1.5 border-t border-slate-800 text-xs text-slate-700">
              {input.length} chars · {input.split('\n').length} lines
            </div>
          </div>

          {/* Output */}
          <div className="flex flex-col overflow-hidden">
            <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-slate-900/60 border-b border-slate-800">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Formatted SQL
              </span>
              <button onClick={copy} disabled={!output}
                className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${copied ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-40'}`}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>

            {error ? (
              <div className="flex-1 flex items-start p-4">
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400 font-mono w-full">
                  ⚠ {error}
                </div>
              </div>
            ) : (
              <pre className="flex-1 bg-slate-950 text-emerald-300 font-mono text-[13px] px-4 py-3 overflow-auto leading-relaxed whitespace-pre">
                {output || <span className="text-slate-700">Formatted SQL will appear here…</span>}
              </pre>
            )}

            <div className="shrink-0 px-4 py-1.5 border-t border-slate-800 text-xs text-slate-700">
              {output ? `${output.length} chars · ${lineCount} lines · ${dialect}` : ''}
            </div>
          </div>
        </div>

        {/* Quick SQL reference */}
        <div className="border-t border-slate-800/60 bg-slate-900/30 px-6 py-3 flex flex-wrap gap-4 text-xs text-slate-600">
          {['SELECT', 'INSERT INTO', 'UPDATE … SET', 'DELETE FROM', 'CREATE TABLE', 'ALTER TABLE', 'JOIN … ON', 'GROUP BY', 'HAVING', 'WINDOW … OVER', 'WITH … AS', 'EXPLAIN'].map(kw => (
            <button key={kw} onClick={() => setInput(kw + ' ')}
              className="text-slate-500 hover:text-indigo-400 transition-colors font-mono">
              {kw}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
