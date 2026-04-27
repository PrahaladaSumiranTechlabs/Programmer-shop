'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'

/* ── Types ───────────────────────────────────────────────────── */
type JSONValue = string | number | boolean | null | JSONValue[] | { [k: string]: JSONValue }
type KeyInfo = {
  path: string        // dot-notation path  e.g. "user.address.city"
  type: string        // "string" | "number" | "boolean" | "null" | "array" | "object"
  occurrences: number // how many times this path appears (across array items)
  examples: string[]  // up to 3 sample values
  nullable: boolean
}
type ViewTab = 'format' | 'keys' | 'schema' | 'stats'

/* ── Key extractor ───────────────────────────────────────────── */
function getType(v: JSONValue): string {
  if (v === null) return 'null'
  if (Array.isArray(v)) return 'array'
  return typeof v
}

function collectKeys(
  val: JSONValue,
  prefix: string,
  map: Map<string, KeyInfo>
): void {
  if (Array.isArray(val)) {
    val.forEach(item => collectKeys(item, prefix, map))
    return
  }
  if (val && typeof val === 'object') {
    for (const [k, v] of Object.entries(val)) {
      const path = prefix ? `${prefix}.${k}` : k
      const type = getType(v)
      const existing = map.get(path)
      const sample = type === 'object' || type === 'array' ? '' : String(v)
      if (existing) {
        existing.occurrences++
        if (sample && existing.examples.length < 3 && !existing.examples.includes(sample)) {
          existing.examples.push(sample)
        }
        if (v === null) existing.nullable = true
      } else {
        map.set(path, {
          path,
          type,
          occurrences: 1,
          examples: sample ? [sample] : [],
          nullable: v === null,
        })
      }
      collectKeys(v, path, map)
    }
  }
}

/* ── Schema builder ──────────────────────────────────────────── */
function buildSchema(val: JSONValue): JSONValue {
  if (val === null) return 'null'
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]'
    // merge all item schemas
    const schemas = val.map(buildSchema)
    const unique = [...new Set(schemas.map(s => JSON.stringify(s)))].map(s => JSON.parse(s))
    return unique.length === 1 ? [unique[0]] : unique
  }
  if (typeof val === 'object') {
    const out: Record<string, JSONValue> = {}
    for (const [k, v] of Object.entries(val)) {
      out[k] = buildSchema(v)
    }
    return out
  }
  return typeof val
}

/* ── Stats ───────────────────────────────────────────────────── */
interface JSONStats {
  totalKeys: number
  uniqueKeys: number
  maxDepth: number
  arrayCount: number
  objectCount: number
  stringCount: number
  numberCount: number
  boolCount: number
  nullCount: number
  totalValues: number
  topLevelType: string
  arrayLengths: number[]
}

function computeStats(val: JSONValue, depth = 0): JSONStats {
  const s: JSONStats = { totalKeys: 0, uniqueKeys: 0, maxDepth: depth, arrayCount: 0, objectCount: 0, stringCount: 0, numberCount: 0, boolCount: 0, nullCount: 0, totalValues: 0, topLevelType: getType(val), arrayLengths: [] }
  function walk(v: JSONValue, d: number) {
    s.maxDepth = Math.max(s.maxDepth, d)
    if (v === null) { s.nullCount++; s.totalValues++; return }
    if (Array.isArray(v)) {
      s.arrayCount++; s.arrayLengths.push(v.length)
      v.forEach(item => walk(item, d + 1))
      return
    }
    if (typeof v === 'object') {
      s.objectCount++; s.totalKeys += Object.keys(v).length
      Object.values(v).forEach(child => walk(child, d + 1))
      return
    }
    s.totalValues++
    if (typeof v === 'string') s.stringCount++
    else if (typeof v === 'number') s.numberCount++
    else if (typeof v === 'boolean') s.boolCount++
  }
  walk(val, 0)
  return s
}

/* ── Syntax highlighter ──────────────────────────────────────── */
function syntaxHighlight(json: string): string {
  return json
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, match => {
      let cls = 'text-blue-300'    // number
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'text-indigo-300 font-medium' : 'text-emerald-300'
      } else if (/true|false/.test(match)) {
        cls = 'text-amber-300'
      } else if (/null/.test(match)) {
        cls = 'text-red-400'
      }
      return `<span class="${cls}">${match}</span>`
    })
}

const TYPE_COLORS: Record<string, string> = {
  string: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  number: 'text-blue-400 bg-blue-500/10 border-blue-500/25',
  boolean: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
  null: 'text-red-400 bg-red-500/10 border-red-500/25',
  object: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/25',
  array: 'text-pink-400 bg-pink-500/10 border-pink-500/25',
}

const SAMPLE_JSON = `{
  "users": [
    {
      "id": 1,
      "name": "Alice Johnson",
      "email": "alice@example.com",
      "role": "admin",
      "active": true,
      "address": {
        "city": "New York",
        "country": "US",
        "zip": "10001"
      },
      "tags": ["frontend", "design"],
      "loginCount": 142,
      "lastLogin": "2024-11-20T08:30:00Z"
    },
    {
      "id": 2,
      "name": "Bob Smith",
      "email": "bob@example.com",
      "role": "developer",
      "active": true,
      "address": {
        "city": "San Francisco",
        "country": "US",
        "zip": "94105"
      },
      "tags": ["backend", "devops"],
      "loginCount": 89,
      "lastLogin": "2024-11-19T14:22:00Z"
    },
    {
      "id": 3,
      "name": "Carol White",
      "email": null,
      "role": "viewer",
      "active": false,
      "address": {
        "city": "London",
        "country": "GB",
        "zip": null
      },
      "tags": [],
      "loginCount": 0,
      "lastLogin": null
    }
  ],
  "meta": {
    "total": 3,
    "page": 1,
    "perPage": 10
  }
}`

export default function JSONFormatterPage() {
  const [input, setInput] = useState(SAMPLE_JSON)
  const [indent, setIndent] = useState(2)
  const [tab, setTab] = useState<ViewTab>('format')
  const [copied, setCopied] = useState('')
  const [keyFilter, setKeyFilter] = useState('')
  const [sortKeys, setSortKeys] = useState<'alpha' | 'freq' | 'depth'>('depth')
  const [expandSchema, setExpandSchema] = useState(true)

  /* ── Parse ─────────────────────────────────────────────────── */
  const parsed = useMemo<{ ok: true; val: JSONValue } | { ok: false; err: string }>(() => {
    if (!input.trim()) return { ok: false, err: '' }
    try { return { ok: true, val: JSON.parse(input) } }
    catch (e) { return { ok: false, err: String(e) } }
  }, [input])

  /* ── Formatted output ──────────────────────────────────────── */
  const formatted = useMemo(() => {
    if (!parsed.ok) return ''
    return JSON.stringify(parsed.val, null, indent)
  }, [parsed, indent])

  /* ── Key list ──────────────────────────────────────────────── */
  const keyMap = useMemo<Map<string, KeyInfo>>(() => {
    if (!parsed.ok) return new Map()
    const m = new Map<string, KeyInfo>()
    collectKeys(parsed.val, '', m)
    return m
  }, [parsed])

  const keyList = useMemo(() => {
    let list = [...keyMap.values()]
    if (keyFilter) list = list.filter(k => k.path.toLowerCase().includes(keyFilter.toLowerCase()))
    if (sortKeys === 'alpha') list.sort((a, b) => a.path.localeCompare(b.path))
    else if (sortKeys === 'freq') list.sort((a, b) => b.occurrences - a.occurrences)
    else list.sort((a, b) => a.path.split('.').length - b.path.split('.').length || a.path.localeCompare(b.path))
    return list
  }, [keyMap, keyFilter, sortKeys])

  /* ── Schema ────────────────────────────────────────────────── */
  const schema = useMemo(() => {
    if (!parsed.ok) return ''
    return JSON.stringify(buildSchema(parsed.val), null, 2)
  }, [parsed])

  /* ── Stats ─────────────────────────────────────────────────── */
  const stats = useMemo<JSONStats | null>(() => {
    if (!parsed.ok) return null
    return computeStats(parsed.val)
  }, [parsed])

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => { setCopied(id); setTimeout(() => setCopied(''), 2000) })
  }

  function minify() {
    if (!parsed.ok) return
    setInput(JSON.stringify(parsed.val))
  }

  function sortAlphaKeys() {
    if (!parsed.ok) return
    function sortObj(v: JSONValue): JSONValue {
      if (Array.isArray(v)) return v.map(sortObj)
      if (v && typeof v === 'object') {
        return Object.keys(v).sort().reduce((acc: Record<string, JSONValue>, k) => {
          acc[k] = sortObj((v as Record<string, JSONValue>)[k])
          return acc
        }, {})
      }
      return v
    }
    setInput(JSON.stringify(sortObj(parsed.val), null, indent))
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    const r = new FileReader(); r.onload = ev => setInput(ev.target?.result as string || ''); r.readAsText(f); e.target.value = ''
  }

  const CopyBtn = useCallback(({ text, id, label = 'Copy' }: { text: string; id: string; label?: string }) => (
    <button onClick={() => copy(text, id)}
      className={`px-2.5 py-1 text-xs rounded-md border transition-colors shrink-0 ${copied === id ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'}`}>
      {copied === id ? '✓' : label}
    </button>
  ), [copied])

  const depth = (path: string) => path.split('.').length

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
          <span className="font-semibold text-sm">{'{ }'} JSON Formatter</span>

          {/* Parse status */}
          {input.trim() && (
            <span className={`text-xs px-2 py-0.5 rounded-full border ${parsed.ok ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-red-500/10 border-red-500/25 text-red-400'}`}>
              {parsed.ok ? `✓ Valid JSON · ${keyMap.size} unique keys` : '✗ Invalid JSON'}
            </span>
          )}

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {/* Indent */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              Indent:
              <select value={indent} onChange={e => setIndent(Number(e.target.value))}
                className="text-xs bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-slate-300 focus:outline-none">
                <option value={2}>2 spaces</option>
                <option value={4}>4 spaces</option>
                <option value={1}>1 tab (\\t)</option>
              </select>
            </div>
            <button onClick={minify} disabled={!parsed.ok}
              className="px-2.5 py-1 text-xs rounded-md bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-40 transition-colors">
              Minify
            </button>
            <button onClick={sortAlphaKeys} disabled={!parsed.ok}
              className="px-2.5 py-1 text-xs rounded-md bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-40 transition-colors">
              Sort keys A→Z
            </button>
            <label className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 cursor-pointer transition-colors">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Upload
              <input type="file" accept=".json,.txt" className="hidden" onChange={handleFile} />
            </label>
          </div>
        </div>
      </nav>

      {/* Tab bar */}
      <div className="border-b border-slate-800 bg-slate-900/40 px-4 flex items-center gap-0">
        {([
          ['format', '{ } Format'],
          ['keys', `🔑 Keys ${parsed.ok ? `(${keyMap.size})` : ''}`],
          ['schema', '🗂 Schema'],
          ['stats', '📊 Stats'],
        ] as [ViewTab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${tab === t ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Main split */}
      <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden" style={{ minHeight: 0 }}>

        {/* ── Left: raw input ──────────────────────────────────── */}
        <div className="flex flex-col border-r border-slate-800 overflow-hidden">
          <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-slate-900/60 border-b border-slate-800">
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" /> Raw input
            </span>
            <div className="flex gap-2">
              <button onClick={() => setInput(SAMPLE_JSON)} className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Sample</button>
              <button onClick={() => setInput('')} className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Clear</button>
              {input && <CopyBtn text={input} id="raw" label="Copy raw" />}
            </div>
          </div>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            spellCheck={false}
            placeholder={'Paste JSON here…\n\n{"key": "value"}'}
            className="flex-1 bg-slate-950 text-slate-300 font-mono text-[13px] resize-none px-4 py-3 focus:outline-none leading-relaxed placeholder-slate-700 overflow-auto"
          />
          {!parsed.ok && input.trim() && (
            <div className="shrink-0 px-4 py-2 bg-red-500/8 border-t border-red-500/20 text-xs text-red-400 font-mono">
              {parsed.err}
            </div>
          )}
          <div className="shrink-0 px-4 py-1.5 border-t border-slate-800 text-xs text-slate-700">
            {input.length.toLocaleString()} chars · {input.split('\n').length} lines
          </div>
        </div>

        {/* ── Right: output tabs ───────────────────────────────── */}
        <div className="flex flex-col overflow-hidden">

          {/* FORMAT tab */}
          {tab === 'format' && (
            <>
              <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-slate-900/60 border-b border-slate-800">
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Formatted
                </span>
                <div className="flex gap-2">
                  {formatted && <CopyBtn text={formatted} id="fmt" label="Copy formatted" />}
                </div>
              </div>
              <div className="flex-1 overflow-auto bg-slate-950 px-4 py-3">
                {parsed.ok ? (
                  <pre className="text-[13px] font-mono leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: syntaxHighlight(formatted) }} />
                ) : (
                  <div className="text-slate-700 text-sm mt-4 text-center">Formatted output appears here</div>
                )}
              </div>
              {formatted && (
                <div className="shrink-0 px-4 py-1.5 border-t border-slate-800 text-xs text-slate-700">
                  {formatted.length.toLocaleString()} chars · {formatted.split('\n').length} lines
                </div>
              )}
            </>
          )}

          {/* KEYS tab */}
          {tab === 'keys' && (
            <>
              <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-slate-900/60 border-b border-slate-800 flex-wrap">
                {/* Search */}
                <input
                  type="text"
                  value={keyFilter}
                  onChange={e => setKeyFilter(e.target.value)}
                  placeholder="Search keys…"
                  className="flex-1 min-w-0 text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-600"
                />
                {/* Sort */}
                <select value={sortKeys} onChange={e => setSortKeys(e.target.value as typeof sortKeys)}
                  className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-400 focus:outline-none">
                  <option value="depth">Sort: depth</option>
                  <option value="alpha">Sort: A→Z</option>
                  <option value="freq">Sort: frequency</option>
                </select>
                {/* Copy all keys */}
                <CopyBtn text={keyList.map(k => k.path).join('\n')} id="keys-all" label="Copy all" />
              </div>

              {/* Key cards */}
              <div className="flex-1 overflow-auto px-4 py-3 flex flex-col gap-2">
                {!parsed.ok ? (
                  <div className="text-slate-700 text-sm mt-4 text-center">Parse valid JSON to see keys</div>
                ) : keyList.length === 0 ? (
                  <div className="text-slate-600 text-sm mt-4 text-center">No keys match "{keyFilter}"</div>
                ) : (
                  keyList.map(key => (
                    <div key={key.path} className="flex items-start gap-3 bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2.5 hover:border-slate-700 transition-colors group">
                      {/* Depth indent indicator */}
                      <div className="flex items-center gap-0.5 mt-0.5 shrink-0">
                        {Array.from({ length: depth(key.path) - 1 }).map((_, i) => (
                          <div key={i} className="w-2 border-l border-slate-700 h-4" />
                        ))}
                        <div className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${TYPE_COLORS[key.type] ?? 'text-slate-400 bg-slate-800 border-slate-700'}`}>
                          {key.type}
                        </div>
                      </div>

                      {/* Path */}
                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="text-xs font-mono text-slate-200 break-all">{key.path}</code>
                          {key.nullable && <span className="text-[10px] text-amber-500 border border-amber-500/30 bg-amber-500/10 px-1 rounded">nullable</span>}
                          {key.occurrences > 1 && <span className="text-[10px] text-slate-500">×{key.occurrences}</span>}
                        </div>
                        {key.examples.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {key.examples.map((ex, i) => (
                              <span key={i} className="text-[11px] text-slate-500 font-mono bg-slate-800 px-1.5 py-0.5 rounded max-w-[120px] truncate" title={ex}>
                                {ex.length > 20 ? ex.slice(0, 20) + '…' : ex}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Copy key path */}
                      <button onClick={() => copy(key.path, `key-${key.path}`)}
                        className={`opacity-0 group-hover:opacity-100 shrink-0 px-1.5 py-0.5 text-[10px] rounded border transition-all ${copied === `key-${key.path}` ? 'bg-emerald-600 border-emerald-500 text-white opacity-100' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                        {copied === `key-${key.path}` ? '✓' : 'Copy'}
                      </button>
                    </div>
                  ))
                )}
              </div>

              {parsed.ok && (
                <div className="shrink-0 px-4 py-1.5 border-t border-slate-800 text-xs text-slate-700">
                  {keyList.length} of {keyMap.size} keys shown
                </div>
              )}
            </>
          )}

          {/* SCHEMA tab */}
          {tab === 'schema' && (
            <>
              <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-slate-900/60 border-b border-slate-800">
                <span className="text-xs text-slate-500">Inferred schema (type signatures)</span>
                <div className="flex gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                    <input type="checkbox" checked={expandSchema} onChange={e => setExpandSchema(e.target.checked)} className="accent-indigo-500" />
                    Expanded
                  </label>
                  {schema && <CopyBtn text={schema} id="schema" label="Copy schema" />}
                </div>
              </div>
              <div className="flex-1 overflow-auto bg-slate-950 px-4 py-3">
                {parsed.ok ? (
                  <pre className="text-[13px] font-mono leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: syntaxHighlight(expandSchema ? schema : JSON.stringify(buildSchema(parsed.val))) }} />
                ) : (
                  <div className="text-slate-700 text-sm mt-4 text-center">Parse valid JSON to see schema</div>
                )}
              </div>
            </>
          )}

          {/* STATS tab */}
          {tab === 'stats' && (
            <div className="flex-1 overflow-auto px-4 py-4 flex flex-col gap-5">
              {!stats ? (
                <div className="text-slate-700 text-sm mt-4 text-center">Parse valid JSON to see stats</div>
              ) : (
                <>
                  {/* Overview grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: 'Root type', value: stats.topLevelType, color: TYPE_COLORS[stats.topLevelType] },
                      { label: 'Unique key paths', value: keyMap.size.toString(), color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/25' },
                      { label: 'Max nesting depth', value: stats.maxDepth.toString(), color: 'text-pink-400 bg-pink-500/10 border-pink-500/25' },
                      { label: 'Objects', value: stats.objectCount.toString(), color: TYPE_COLORS.object },
                      { label: 'Arrays', value: stats.arrayCount.toString(), color: TYPE_COLORS.array },
                      { label: 'Total leaf values', value: stats.totalValues.toString(), color: 'text-slate-300 bg-slate-800 border-slate-700' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className={`rounded-xl border px-4 py-3 ${color}`}>
                        <div className="text-2xl font-bold font-mono">{value}</div>
                        <div className="text-xs mt-0.5 opacity-70">{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Value type breakdown */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
                    <h3 className="text-xs font-semibold text-slate-400 mb-3">Value type distribution</h3>
                    {[
                      { label: 'Strings', count: stats.stringCount, color: 'bg-emerald-500' },
                      { label: 'Numbers', count: stats.numberCount, color: 'bg-blue-500' },
                      { label: 'Booleans', count: stats.boolCount, color: 'bg-amber-500' },
                      { label: 'Nulls', count: stats.nullCount, color: 'bg-red-500' },
                    ].map(({ label, count, color }) => {
                      const pct = stats.totalValues > 0 ? Math.round((count / stats.totalValues) * 100) : 0
                      return (
                        <div key={label} className="flex items-center gap-3 py-1.5">
                          <span className="text-xs text-slate-500 w-16 shrink-0">{label}</span>
                          <div className="flex-1 bg-slate-800 rounded-full h-2">
                            <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-mono text-slate-400 w-16 text-right">{count} ({pct}%)</span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Array length info */}
                  {stats.arrayLengths.length > 0 && (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
                      <h3 className="text-xs font-semibold text-slate-400 mb-3">Array sizes</h3>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        {[
                          { label: 'Arrays found', val: stats.arrayLengths.length },
                          { label: 'Avg length', val: Math.round(stats.arrayLengths.reduce((a, b) => a + b, 0) / stats.arrayLengths.length) },
                          { label: 'Max length', val: Math.max(...stats.arrayLengths) },
                        ].map(({ label, val }) => (
                          <div key={label} className="bg-slate-800/60 rounded-xl px-3 py-2">
                            <div className="text-lg font-mono font-bold text-pink-400">{val}</div>
                            <div className="text-xs text-slate-600 mt-0.5">{label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key depth distribution */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
                    <h3 className="text-xs font-semibold text-slate-400 mb-3">Keys by depth</h3>
                    {Array.from({ length: stats.maxDepth }, (_, i) => i + 1).map(d => {
                      const count = [...keyMap.values()].filter(k => depth(k.path) === d).length
                      return (
                        <div key={d} className="flex items-center gap-3 py-1.5">
                          <span className="text-xs text-slate-600 w-16 shrink-0 font-mono">depth {d}</span>
                          <div className="flex-1 bg-slate-800 rounded-full h-2">
                            <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${keyMap.size > 0 ? (count / keyMap.size) * 100 : 0}%` }} />
                          </div>
                          <span className="text-xs font-mono text-slate-500 w-10 text-right">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
