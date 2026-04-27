'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

/* ── Cron field defs ─────────────────────────────────────────── */
interface Field { name: string; label: string; min: number; max: number; names?: string[] }
const FIELDS: Field[] = [
  { name: 'minute', label: 'Minute', min: 0, max: 59 },
  { name: 'hour', label: 'Hour', min: 0, max: 23 },
  { name: 'day', label: 'Day of Month', min: 1, max: 31 },
  { name: 'month', label: 'Month', min: 1, max: 12, names: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] },
  { name: 'weekday', label: 'Day of Week', min: 0, max: 6, names: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] },
]

const PRESETS = [
  { label: 'Every minute',     cron: '* * * * *',    desc: 'Runs every minute' },
  { label: 'Every 5 minutes',  cron: '*/5 * * * *',  desc: 'Runs every 5 minutes' },
  { label: 'Every 15 minutes', cron: '*/15 * * * *', desc: 'Runs every 15 minutes' },
  { label: 'Every 30 minutes', cron: '*/30 * * * *', desc: 'Runs every 30 minutes' },
  { label: 'Every hour',       cron: '0 * * * *',    desc: 'Runs at the start of every hour' },
  { label: 'Every 6 hours',    cron: '0 */6 * * *',  desc: 'Runs at midnight, 6am, noon, 6pm' },
  { label: 'Daily at midnight',cron: '0 0 * * *',    desc: 'Runs once a day at midnight' },
  { label: 'Daily at noon',    cron: '0 12 * * *',   desc: 'Runs once a day at noon' },
  { label: 'Weekdays 9am',     cron: '0 9 * * 1-5',  desc: 'Mon–Fri at 9:00 AM' },
  { label: 'Weekly (Sunday)',  cron: '0 0 * * 0',    desc: 'Every Sunday at midnight' },
  { label: 'Monthly (1st)',    cron: '0 0 1 * *',    desc: '1st of every month at midnight' },
  { label: 'Yearly (Jan 1)',   cron: '0 0 1 1 *',    desc: 'January 1st at midnight' },
]

/* ── Cron next-run calculator (no external deps) ─────────────── */
function matchField(val: number, expr: string, min: number, max: number): boolean {
  if (expr === '*') return true
  for (const part of expr.split(',')) {
    if (part.includes('/')) {
      const [range, step] = part.split('/')
      const stepN = parseInt(step)
      const [start, end] = range === '*' ? [min, max] : range.split('-').map(Number)
      for (let v = start; v <= (end ?? max); v += stepN) if (v === val) return true
    } else if (part.includes('-')) {
      const [a, b] = part.split('-').map(Number)
      if (val >= a && val <= b) return true
    } else {
      if (parseInt(part) === val) return true
    }
  }
  return false
}

function getNextRuns(cron: string, count = 10): Date[] {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return []
  const [min, hour, day, month, weekday] = parts
  const results: Date[] = []
  const d = new Date()
  d.setSeconds(0, 0)
  d.setMinutes(d.getMinutes() + 1)
  let guard = 0
  while (results.length < count && guard++ < 100000) {
    const mo = d.getMonth() + 1
    const dw = d.getDay()
    if (
      matchField(mo, month, 1, 12) &&
      matchField(d.getDate(), day, 1, 31) &&
      matchField(dw, weekday, 0, 6) &&
      matchField(d.getHours(), hour, 0, 23) &&
      matchField(d.getMinutes(), min, 0, 59)
    ) {
      results.push(new Date(d))
    }
    d.setMinutes(d.getMinutes() + 1)
  }
  return results
}

/* ── Human-readable ──────────────────────────────────────────── */
function describe(cron: string): string {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return 'Invalid cron expression'
  const [min, hour, day, month, wday] = parts
  const pad = (n: string) => n.padStart(2, '0')
  if (cron === '* * * * *') return 'Every minute'
  if (min.startsWith('*/') && hour === '*' && day === '*' && month === '*' && wday === '*')
    return `Every ${min.slice(2)} minutes`
  if (min === '0' && hour.startsWith('*/') && day === '*' && month === '*' && wday === '*')
    return `Every ${hour.slice(2)} hours`
  if (min === '0' && hour === '*' && day === '*' && month === '*' && wday === '*')
    return `At the start of every hour`
  if (hour !== '*' && min !== '*' && !hour.includes('*') && !min.includes('*')) {
    const timeStr = `${pad(hour)}:${pad(min)}`
    if (day === '*' && month === '*' && wday === '*') return `Daily at ${timeStr}`
    if (day === '*' && month === '*' && wday === '1-5') return `Weekdays (Mon-Fri) at ${timeStr}`
    if (day !== '*' && month === '*' && wday === '*') return `Day ${day} of every month at ${timeStr}`
    if (day === '*' && month === '*' && wday !== '*') {
      const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
      return `Every ${days[parseInt(wday)] ?? wday} at ${timeStr}`
    }
  }
  return `${min} ${hour} ${day} ${month} ${wday}`
}

/* ── Field mode ──────────────────────────────────────────────── */
type FieldMode = 'every' | 'specific' | 'range' | 'step'
interface FieldState { mode: FieldMode; specific: string; rangeFrom: string; rangeTo: string; step: string }
function defaultField(): FieldState { return { mode: 'every', specific: '', rangeFrom: '', rangeTo: '', step: '1' } }
function fieldToExpr(f: FieldState, field: Field): string {
  switch (f.mode) {
    case 'every': return '*'
    case 'specific': return f.specific || String(field.min)
    case 'range': return `${f.rangeFrom || field.min}-${f.rangeTo || field.max}`
    case 'step': return `*/${f.step || '1'}`
  }
}

export default function CronBuilderPage() {
  const [rawCron, setRawCron] = useState('0 9 * * 1-5')
  const [editMode, setEditMode] = useState<'raw' | 'visual'>('visual')
  const [fieldStates, setFieldStates] = useState<Record<string, FieldState>>({
    minute: { mode: 'specific', specific: '0', rangeFrom: '', rangeTo: '', step: '' },
    hour: { mode: 'specific', specific: '9', rangeFrom: '', rangeTo: '', step: '' },
    day: defaultField(),
    month: defaultField(),
    weekday: { mode: 'range', specific: '', rangeFrom: '1', rangeTo: '5', step: '' },
  })
  const [copied, setCopied] = useState('')

  /* Build cron from visual fields */
  const visualCron = useMemo(() => {
    return FIELDS.map(f => fieldToExpr(fieldStates[f.name], f)).join(' ')
  }, [fieldStates])

  const activeCron = editMode === 'raw' ? rawCron : visualCron
  const nextRuns = useMemo(() => getNextRuns(activeCron, 10), [activeCron])
  const description = useMemo(() => describe(activeCron), [activeCron])

  function loadPreset(cron: string) {
    setRawCron(cron)
    setEditMode('raw')
  }

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => { setCopied(id); setTimeout(() => setCopied(''), 2000) })
  }

  function setField(name: string, partial: Partial<FieldState>) {
    setFieldStates(prev => ({ ...prev, [name]: { ...prev[name], ...partial } }))
  }

  const systemdTimer = `[Unit]
Description=My scheduled job

[Timer]
OnCalendar=${activeCron.replace(/\s+/g, ' ')}
Persistent=true

[Install]
WantedBy=timers.target`

  const githubActions = `on:
  schedule:
    - cron: '${activeCron}'`

  const kubernetesJob = `apiVersion: batch/v1
kind: CronJob
metadata:
  name: my-cronjob
spec:
  schedule: "${activeCron}"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: job
            image: my-image:latest
          restartPolicy: OnFailure`

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-screen-xl mx-auto px-4 h-13 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Home
          </Link>
          <span className="text-slate-700">·</span>
          <span className="font-semibold text-sm">⏰ Cron Builder</span>
          {nextRuns.length > 0 && (
            <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full">Valid</span>
          )}
        </div>
      </nav>

      <div className="flex-1 max-w-screen-xl mx-auto w-full px-4 py-8 flex flex-col gap-6">

        {/* Expression + description */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Mode toggle */}
            <div className="flex rounded-lg border border-slate-700 overflow-hidden">
              {(['visual','raw'] as const).map(m => (
                <button key={m} onClick={() => setEditMode(m)}
                  className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${editMode === m ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
                  {m === 'visual' ? '🎛 Visual' : '✏ Raw'}
                </button>
              ))}
            </div>

            {editMode === 'raw' && (
              <input
                type="text"
                value={rawCron}
                onChange={e => setRawCron(e.target.value)}
                placeholder="* * * * *"
                className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-lg font-mono text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            )}

            {editMode === 'visual' && (
              <div className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 font-mono text-lg text-indigo-300">
                {visualCron}
              </div>
            )}

            <button onClick={() => copy(activeCron, 'cron')}
              className={`px-3 py-2 text-xs rounded-lg border transition-colors ${copied === 'cron' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'}`}>
              {copied === 'cron' ? '✓ Copied' : 'Copy'}
            </button>
          </div>

          {/* Human description */}
          <div className="flex items-center gap-2 px-4 py-3 bg-indigo-500/8 border border-indigo-500/20 rounded-xl">
            <span className="text-indigo-400 text-lg">🗓</span>
            <span className="text-sm text-indigo-200 font-medium">{description}</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* Visual field builder / Presets */}
          <div className="lg:col-span-1 flex flex-col gap-4">

            {editMode === 'visual' && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4">
                <h3 className="text-xs font-semibold text-slate-400">Field editor</h3>
                {FIELDS.map(field => {
                  const fs = fieldStates[field.name]
                  return (
                    <div key={field.name} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-300">{field.label}</span>
                        <code className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-1.5 rounded">{fieldToExpr(fs, field)}</code>
                      </div>
                      {/* Mode selector */}
                      <div className="flex rounded-md border border-slate-700 overflow-hidden text-[11px]">
                        {(['every','specific','range','step'] as FieldMode[]).map(m => (
                          <button key={m} onClick={() => setField(field.name, { mode: m })}
                            className={`flex-1 py-1 capitalize transition-colors ${fs.mode === m ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500 hover:text-white hover:bg-slate-700'}`}>
                            {m}
                          </button>
                        ))}
                      </div>
                      {/* Value inputs */}
                      {fs.mode === 'specific' && (
                        <input type="text" value={fs.specific} onChange={e => setField(field.name, { specific: e.target.value })}
                          placeholder={`${field.min}-${field.max}${field.names ? ` or ${field.names.slice(0,3).join(',')}` : ''}`}
                          className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                      )}
                      {fs.mode === 'range' && (
                        <div className="flex items-center gap-1">
                          <input type="number" min={field.min} max={field.max} value={fs.rangeFrom} onChange={e => setField(field.name, { rangeFrom: e.target.value })}
                            className="flex-1 text-xs bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 font-mono text-slate-300 focus:outline-none" placeholder={String(field.min)} />
                          <span className="text-slate-600 text-xs">–</span>
                          <input type="number" min={field.min} max={field.max} value={fs.rangeTo} onChange={e => setField(field.name, { rangeTo: e.target.value })}
                            className="flex-1 text-xs bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 font-mono text-slate-300 focus:outline-none" placeholder={String(field.max)} />
                        </div>
                      )}
                      {fs.mode === 'step' && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          Every
                          <input type="number" min={1} value={fs.step} onChange={e => setField(field.name, { step: e.target.value })}
                            className="w-16 text-xs bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 font-mono text-slate-300 focus:outline-none" />
                          {field.label.toLowerCase()}(s)
                        </div>
                      )}
                      {/* Named value hints */}
                      {field.names && fs.mode !== 'every' && (
                        <div className="flex flex-wrap gap-1">
                          {field.names.map((n, idx) => (
                            <button key={n} onClick={() => setField(field.name, { specific: String(idx + (field.min === 0 ? 0 : 1)), mode: 'specific' })}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-colors font-mono">
                              {n}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Presets */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col gap-1.5">
              <h3 className="text-xs font-semibold text-slate-400 mb-1">Quick presets</h3>
              {PRESETS.map(p => (
                <button key={p.cron} onClick={() => loadPreset(p.cron)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${activeCron === p.cron ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-300' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}>
                  <span className="text-xs">{p.label}</span>
                  <code className="text-[11px] font-mono text-slate-600">{p.cron}</code>
                </button>
              ))}
            </div>
          </div>

          {/* Next runs + exports */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* Next 10 runs */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
              <h3 className="text-xs font-semibold text-slate-400 mb-3">Next 10 scheduled runs</h3>
              {nextRuns.length === 0 ? (
                <div className="text-sm text-red-400">Invalid cron expression</div>
              ) : (
                <div className="flex flex-col gap-1">
                  {nextRuns.map((d, i) => {
                    const diff = d.getTime() - Date.now()
                    const mins = Math.round(diff / 60000)
                    const hours = Math.round(diff / 3600000)
                    const days = Math.round(diff / 86400000)
                    const rel = mins < 60 ? `in ${mins}m` : hours < 24 ? `in ${hours}h` : `in ${days}d`
                    return (
                      <div key={i} className="flex items-center gap-3 py-1.5 border-b border-slate-800/60 last:border-0">
                        <span className="text-xs text-slate-600 w-5 text-center">{i + 1}</span>
                        <span className="flex-1 text-sm font-mono text-slate-200">{d.toLocaleString()}</span>
                        <span className="text-xs text-slate-600">{rel}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Export formats */}
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { label: 'systemd Timer', id: 'systemd', content: systemdTimer, color: 'text-green-400' },
                { label: 'GitHub Actions', id: 'github', content: githubActions, color: 'text-slate-300' },
                { label: 'Kubernetes CronJob', id: 'k8s', content: kubernetesJob, color: 'text-blue-400' },
              ].map(({ label, id, content, color }) => (
                <div key={id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${color}`}>{label}</span>
                    <button onClick={() => copy(content, id)}
                      className={`text-xs px-2 py-0.5 rounded border transition-colors ${copied === id ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-white hover:bg-slate-700'}`}>
                      {copied === id ? '✓' : 'Copy'}
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono text-slate-500 leading-relaxed whitespace-pre overflow-x-auto">{content}</pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
