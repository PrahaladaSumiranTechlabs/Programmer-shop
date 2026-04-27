'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Shanghai',
  'Australia/Sydney', 'Pacific/Auckland',
]

function relativeTime(ms: number): string {
  const diff = Date.now() - ms
  const abs = Math.abs(diff)
  const s = Math.floor(abs / 1000)
  const m = Math.floor(abs / 60000)
  const h = Math.floor(abs / 3600000)
  const d = Math.floor(abs / 86400000)
  const w = Math.floor(abs / 604800000)
  const mo = Math.floor(abs / 2592000000)
  const y = Math.floor(abs / 31536000000)
  const suf = diff < 0 ? 'from now' : 'ago'
  if (abs < 5000) return 'just now'
  if (s < 60) return `${s}s ${suf}`
  if (m < 60) return `${m}m ${suf}`
  if (h < 24) return `${h}h ${suf}`
  if (d < 7) return `${d}d ${suf}`
  if (w < 5) return `${w}w ${suf}`
  if (mo < 12) return `${mo} months ${suf}`
  return `${y}y ${suf}`
}

function formatInTZ(ms: number, tz: string, fmt: 'date' | 'datetime' | 'time' | 'iso'): string {
  try {
    const d = new Date(ms)
    if (fmt === 'iso') return new Date(ms - new Date(ms).getTimezoneOffset() * 60000).toISOString().replace('T', ' ').replace('Z', '')
    const opts: Intl.DateTimeFormatOptions = fmt === 'time'
      ? { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }
      : fmt === 'date'
        ? { timeZone: tz, year: 'numeric', month: 'short', day: '2-digit', weekday: 'short' }
        : { timeZone: tz, year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, weekday: 'short' }
    return d.toLocaleString('en-US', opts)
  } catch { return 'Invalid' }
}

function getTZOffset(ms: number, tz: string): string {
  try {
    const d = new Date(ms)
    const utcStr = d.toLocaleString('en-US', { timeZone: 'UTC', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const tzStr = d.toLocaleString('en-US', { timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const parse = (s: string) => new Date(s).getTime()
    const diff = Math.round((parse(tzStr) - parse(utcStr)) / 60000)
    const sign = diff >= 0 ? '+' : '-'
    const h = Math.floor(Math.abs(diff) / 60).toString().padStart(2, '0')
    const m = (Math.abs(diff) % 60).toString().padStart(2, '0')
    return `UTC${sign}${h}:${m}`
  } catch { return '' }
}

export default function TimestampPage() {
  const [now, setNow] = useState(Date.now())
  const [input, setInput] = useState('')
  const [dateInput, setDateInput] = useState('')
  const [copied, setCopied] = useState('')
  const [selectedTZ, setSelectedTZ] = useState('UTC')

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // Set default date input to now
  useEffect(() => {
    const d = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    setDateInput(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`)
  }, [])

  const parsedMs: number | null = (() => {
    if (!input.trim()) return null
    const n = Number(input.trim())
    if (!isNaN(n)) {
      // auto-detect seconds vs ms: unix ts in seconds is ~10 digits
      return String(Math.floor(n)).length <= 10 ? n * 1000 : n
    }
    const d = new Date(input.trim())
    return isNaN(d.getTime()) ? null : d.getTime()
  })()

  const dateMs: number | null = (() => {
    if (!dateInput) return null
    const d = new Date(dateInput)
    return isNaN(d.getTime()) ? null : d.getTime()
  })()

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => { setCopied(id); setTimeout(() => setCopied(''), 2000) })
  }

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <button onClick={() => copy(text, id)}
      className={`shrink-0 px-2 py-0.5 text-xs rounded border transition-colors ${copied === id ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-white hover:bg-slate-700'}`}>
      {copied === id ? '✓' : 'Copy'}
    </button>
  )

  const Row = ({ label, value, id }: { label: string; value: string; id: string }) => (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-800/60 last:border-0">
      <span className="text-xs text-slate-500 w-36 shrink-0">{label}</span>
      <span className="flex-1 text-sm font-mono text-slate-200 break-all">{value}</span>
      <CopyBtn text={value} id={id} />
    </div>
  )

  const displayMs = parsedMs ?? now

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-13 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Home
          </Link>
          <span className="text-slate-700">·</span>
          <span className="font-semibold text-sm">⏱ Unix Timestamp Converter</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs font-mono text-indigo-400 animate-pulse">{Math.floor(now / 1000)}</span>
            <span className="text-xs text-slate-600">now</span>
          </div>
        </div>
      </nav>

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 flex flex-col gap-8">

        {/* Live now bar */}
        <div className="bg-indigo-500/8 border border-indigo-500/20 rounded-2xl px-5 py-4 flex flex-wrap items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-indigo-400 font-medium">Current Unix Timestamp</span>
            <span className="text-3xl font-mono font-bold text-white tracking-tight">{Math.floor(now / 1000)}</span>
            <span className="text-xs text-slate-500 mt-0.5">milliseconds: {now}</span>
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={() => copy(String(Math.floor(now / 1000)), 'now-s')}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${copied === 'now-s' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
              {copied === 'now-s' ? '✓' : 'Copy seconds'}
            </button>
            <button onClick={() => copy(String(now), 'now-ms')}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${copied === 'now-ms' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
              {copied === 'now-ms' ? '✓' : 'Copy ms'}
            </button>
          </div>
        </div>

        {/* Two columns: parse ts + pick date */}
        <div className="grid sm:grid-cols-2 gap-6">

          {/* Parse a timestamp */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-slate-300">Parse a timestamp</h2>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="1700000000 or 1700000000000 or 2024-01-15…"
              className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder-slate-700"
            />
            {input && !parsedMs && (
              <p className="text-xs text-red-400">⚠ Could not parse — try a Unix timestamp (seconds or ms) or ISO date</p>
            )}
            {parsedMs && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-400">✓ Parsed</span>
                <span className="text-xs text-slate-500">{relativeTime(parsedMs)}</span>
                <button onClick={() => setInput('')} className="text-xs text-slate-700 hover:text-slate-500 ml-auto">Clear</button>
              </div>
            )}
          </div>

          {/* Pick a date → get timestamp */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-slate-300">Date → Timestamp</h2>
            <input
              type="datetime-local"
              value={dateInput}
              onChange={e => setDateInput(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            {dateMs && (
              <div className="flex gap-2">
                <div className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-indigo-300">{Math.floor(dateMs / 1000)}</div>
                <CopyBtn text={String(Math.floor(dateMs / 1000))} id="date-s" />
              </div>
            )}
          </div>
        </div>

        {/* Breakdown table */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">
              Breakdown {!input && <span className="text-slate-600 font-normal text-xs ml-1">(showing current time — paste a timestamp above to inspect it)</span>}
            </h2>
            <select value={selectedTZ} onChange={e => setSelectedTZ(e.target.value)}
              className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500">
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl px-5 py-2">
            <Row label="Unix (seconds)" value={String(Math.floor(displayMs / 1000))} id="r-s" />
            <Row label="Unix (milliseconds)" value={String(displayMs)} id="r-ms" />
            <Row label="ISO 8601" value={new Date(displayMs).toISOString()} id="r-iso" />
            <Row label="UTC datetime" value={formatInTZ(displayMs, 'UTC', 'datetime')} id="r-utc" />
            <Row label={`${selectedTZ} (${getTZOffset(displayMs, selectedTZ)})`} value={formatInTZ(displayMs, selectedTZ, 'datetime')} id="r-tz" />
            <Row label="Relative" value={relativeTime(displayMs)} id="r-rel" />
            <Row label="Day of week" value={new Date(displayMs).toLocaleDateString('en-US', { weekday: 'long' })} id="r-dow" />
            <Row label="Week of year" value={`Week ${Math.ceil((Math.floor((displayMs - new Date(new Date(displayMs).getFullYear(), 0, 0).getTime()) / 86400000)) / 7)}`} id="r-woy" />
          </div>
        </div>

        {/* Timezone world clock */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-300">World clock</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo'].map(tz => (
              <button key={tz} onClick={() => setSelectedTZ(tz)}
                className={`flex flex-col gap-0.5 p-3 rounded-xl border text-left transition-colors ${selectedTZ === tz ? 'border-indigo-500/50 bg-indigo-500/8' : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'}`}>
                <span className="text-xs text-slate-500">{tz.split('/')[1]?.replace('_', ' ') || tz}</span>
                <span className="text-sm font-mono font-semibold text-white">{formatInTZ(displayMs, tz, 'time')}</span>
                <span className="text-xs text-slate-600">{getTZOffset(displayMs, tz)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
