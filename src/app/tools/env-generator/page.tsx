'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

/* ── Types ───────────────────────────────────────────────────── */
interface EnvVar { id: string; key: string; value: string; comment: string; secret: boolean; required: boolean }
type EnvName = string
type Envs = Record<EnvName, EnvVar[]>

let idCounter = 0
function newVar(key = '', value = '', comment = ''): EnvVar {
  return { id: String(++idCounter), key, value, comment, secret: false, required: true }
}

function uid() { return Math.random().toString(36).slice(2, 9) }

const TEMPLATES: Record<string, EnvVar[]> = {
  'Node.js API': [
    newVar('NODE_ENV', 'development', 'Runtime environment'),
    newVar('PORT', '3000', 'Server port'),
    newVar('DATABASE_URL', 'postgresql://user:password@localhost:5432/mydb', 'PostgreSQL connection string'),
    newVar('JWT_SECRET', '', 'Secret key for JWT signing'),
    newVar('JWT_EXPIRES_IN', '7d', 'JWT expiry duration'),
    newVar('REDIS_URL', 'redis://localhost:6379', 'Redis connection URL'),
    newVar('CORS_ORIGIN', 'http://localhost:3000', 'Allowed CORS origin'),
    newVar('LOG_LEVEL', 'info', 'Logging verbosity'),
  ],
  'Next.js': [
    newVar('NEXT_PUBLIC_API_URL', 'https://api.example.com', 'Public API base URL'),
    newVar('NEXT_PUBLIC_APP_URL', 'http://localhost:3000', 'App base URL'),
    newVar('DATABASE_URL', '', 'Database connection'),
    newVar('NEXTAUTH_SECRET', '', 'NextAuth secret key'),
    newVar('NEXTAUTH_URL', 'http://localhost:3000', 'NextAuth callback URL'),
    newVar('GOOGLE_CLIENT_ID', '', 'Google OAuth client ID'),
    newVar('GOOGLE_CLIENT_SECRET', '', 'Google OAuth client secret'),
  ],
  'Docker / Compose': [
    newVar('COMPOSE_PROJECT_NAME', 'myapp', 'Docker Compose project name'),
    newVar('POSTGRES_USER', 'admin', 'DB username'),
    newVar('POSTGRES_PASSWORD', '', 'DB password'),
    newVar('POSTGRES_DB', 'myapp', 'DB name'),
    newVar('POSTGRES_PORT', '5432', 'DB port'),
    newVar('REDIS_PORT', '6379', 'Redis port'),
    newVar('APP_PORT', '3000', 'Application port'),
  ],
  'AWS': [
    newVar('AWS_ACCESS_KEY_ID', '', 'AWS access key'),
    newVar('AWS_SECRET_ACCESS_KEY', '', 'AWS secret access key'),
    newVar('AWS_REGION', 'us-east-1', 'Default AWS region'),
    newVar('AWS_S3_BUCKET', '', 'S3 bucket name'),
    newVar('AWS_CLOUDFRONT_URL', '', 'CloudFront distribution URL'),
    newVar('AWS_SES_FROM_EMAIL', '', 'SES sender email'),
  ],
}

/* ── Validation ──────────────────────────────────────────────── */
function validateKey(key: string): string {
  if (!key) return 'Key is required'
  if (!/^[A-Z_][A-Z0-9_]*$/i.test(key)) return 'Use letters, digits and _ only; must start with a letter or _'
  if (/\s/.test(key)) return 'No spaces allowed in keys'
  return ''
}

/* ── Exporters ───────────────────────────────────────────────── */
function toEnvFile(vars: EnvVar[], maskSecrets: boolean): string {
  return vars.map(v => {
    const lines: string[] = []
    if (v.comment) lines.push(`# ${v.comment}`)
    const val = maskSecrets && v.secret ? '***' : v.value
    lines.push(`${v.key}=${val.includes(' ') || val.includes('#') ? `"${val}"` : val}`)
    return lines.join('\n')
  }).join('\n')
}

function toDockerEnv(vars: EnvVar[]): string {
  return vars.map(v => `--env ${v.key}="${v.value}"`).join(' \\\n  ')
}

function toK8sSecret(vars: EnvVar[]): string {
  const data = vars.map(v => `  ${v.key}: ${btoa(v.value || '')}`).join('\n')
  return `apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
${data}`
}

function toDockerCompose(vars: EnvVar[]): string {
  const lines = vars.map(v => `      - ${v.key}=${v.value}`).join('\n')
  return `services:\n  app:\n    environment:\n${lines}`
}

function toJSON(vars: EnvVar[]): string {
  const obj: Record<string, string> = {}
  vars.forEach(v => { if (v.key) obj[v.key] = v.value })
  return JSON.stringify(obj, null, 2)
}

function parseEnvFile(text: string): EnvVar[] {
  const vars: EnvVar[] = []
  let lastComment = ''
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) { lastComment = ''; continue }
    if (trimmed.startsWith('#')) { lastComment = trimmed.slice(1).trim(); continue }
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    vars.push(newVar(key, value, lastComment))
    lastComment = ''
  }
  return vars
}

export default function EnvGeneratorPage() {
  const [envs, setEnvs] = useState<Envs>({ development: [newVar('NODE_ENV', 'development'), newVar('PORT', '3000'), newVar('DATABASE_URL', 'postgresql://localhost/myapp_dev')] })
  const [activeEnv, setActiveEnv] = useState<EnvName>('development')
  const [newEnvName, setNewEnvName] = useState('')
  const [exportFormat, setExportFormat] = useState<'env' | 'docker' | 'k8s' | 'compose' | 'json'>('env')
  const [maskSecrets, setMaskSecrets] = useState(false)
  const [copied, setCopied] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')

  const vars = envs[activeEnv] ?? []

  function setVars(v: EnvVar[]) {
    setEnvs(e => ({ ...e, [activeEnv]: v }))
  }

  function addVar() { setVars([...vars, newVar()]) }
  function deleteVar(id: string) { setVars(vars.filter(v => v.id !== id)) }
  function updateVar(id: string, patch: Partial<EnvVar>) {
    setVars(vars.map(v => v.id === id ? { ...v, ...patch } : v))
  }
  function moveUp(idx: number) {
    if (idx === 0) return
    const n = [...vars]; [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; setVars(n)
  }
  function moveDown(idx: number) {
    if (idx === vars.length - 1) return
    const n = [...vars]; [n[idx], n[idx + 1]] = [n[idx + 1], n[idx]]; setVars(n)
  }
  function addEnv() {
    const name = newEnvName.trim().toLowerCase()
    if (!name || envs[name]) return
    setEnvs(e => ({ ...e, [name]: [] }))
    setActiveEnv(name)
    setNewEnvName('')
  }
  function removeEnv(name: EnvName) {
    if (Object.keys(envs).length <= 1) return
    const newEnvs = { ...envs }; delete newEnvs[name]
    setEnvs(newEnvs)
    if (activeEnv === name) setActiveEnv(Object.keys(newEnvs)[0])
  }
  function loadTemplate(name: string) {
    const tmpl = TEMPLATES[name]
    if (tmpl) setVars(tmpl.map(v => ({ ...v, id: uid() })))
  }
  function doImport() {
    const parsed = parseEnvFile(importText)
    if (parsed.length) { setVars(parsed); setShowImport(false); setImportText('') }
  }

  const exported = useMemo(() => {
    switch (exportFormat) {
      case 'env': return toEnvFile(vars, maskSecrets)
      case 'docker': return toDockerEnv(vars)
      case 'k8s': return toK8sSecret(vars)
      case 'compose': return toDockerCompose(vars)
      case 'json': return toJSON(vars)
    }
  }, [vars, exportFormat, maskSecrets])

  /* diff: keys in other envs but not this one */
  const otherEnvs = Object.keys(envs).filter(e => e !== activeEnv)
  const missingInOthers = useMemo(() => {
    const myKeys = new Set(vars.map(v => v.key).filter(Boolean))
    return otherEnvs.map(env => {
      const otherKeys = new Set(envs[env].map(v => v.key))
      const missing = [...myKeys].filter(k => !otherKeys.has(k))
      const extra = [...otherKeys].filter(k => !myKeys.has(k))
      return { env, missing, extra }
    }).filter(r => r.missing.length > 0 || r.extra.length > 0)
  }, [vars, envs, otherEnvs])

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => { setCopied(id); setTimeout(() => setCopied(''), 2000) })
  }

  const validationErrors = useMemo(() => {
    const errs: Record<string, string> = {}
    const seen = new Set<string>()
    vars.forEach(v => {
      const e = validateKey(v.key)
      if (e) errs[v.id] = e
      else if (v.key) {
        if (seen.has(v.key)) errs[v.id] = 'Duplicate key'
        seen.add(v.key)
      }
    })
    return errs
  }, [vars])

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-screen-xl mx-auto px-4 h-13 py-3 flex items-center gap-3 flex-wrap">
          <Link href="/" className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Home
          </Link>
          <span className="text-slate-700">·</span>
          <span className="font-semibold text-sm">🔑 ENV Generator</span>
          <span className="text-xs text-slate-600">{vars.length} variables · {Object.keys(envs).length} environment{Object.keys(envs).length !== 1 ? 's' : ''}</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setShowImport(s => !s)} className="px-2.5 py-1 text-xs rounded-md bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">Import .env</button>
          </div>
        </div>
      </nav>

      {/* Import modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowImport(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-3">Import .env file</h3>
            <textarea value={importText} onChange={e => setImportText(e.target.value)} rows={8} placeholder="Paste .env contents here…" spellCheck={false}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-300 focus:outline-none resize-none mb-3" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowImport(false)} className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={doImport} disabled={!importText.trim()} className="px-3 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-40 transition-colors">Import</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 max-w-screen-xl mx-auto w-full px-4 py-6 flex flex-col gap-5">

        {/* Env tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {Object.keys(envs).map(env => (
            <div key={env} className="relative group">
              <button onClick={() => setActiveEnv(env)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${activeEnv === env ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                {env}
              </button>
              {Object.keys(envs).length > 1 && (
                <button onClick={() => removeEnv(env)} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] items-center justify-center hidden group-hover:flex">✕</button>
              )}
            </div>
          ))}
          {/* Add env */}
          <div className="flex gap-1">
            <input type="text" value={newEnvName} onChange={e => setNewEnvName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addEnv()}
              placeholder="+ add env" className="w-24 text-xs bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-600" />
            {newEnvName && <button onClick={addEnv} className="px-2 text-xs rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors">Add</button>}
          </div>

          {/* Templates */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-600">Templates:</span>
            {Object.keys(TEMPLATES).map(t => (
              <button key={t} onClick={() => loadTemplate(t)} className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-500 hover:text-white hover:bg-slate-700 hover:border-slate-600 transition-colors">{t}</button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">

          {/* Variables editor */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-400">{activeEnv} — {vars.length} variables</h3>
              <button onClick={addVar} className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Add variable
              </button>
            </div>

            {vars.length === 0 ? (
              <div className="border-2 border-dashed border-slate-800 rounded-2xl p-8 text-center text-slate-600 text-sm">
                No variables yet — add one or load a template
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {vars.map((v, idx) => (
                  <div key={v.id} className={`border rounded-xl p-3 flex flex-col gap-2 transition-colors ${validationErrors[v.id] ? 'border-red-500/40 bg-red-500/5' : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'}`}>
                    <div className="flex items-center gap-2">
                      {/* Key */}
                      <input type="text" value={v.key} onChange={e => updateVar(v.id, { key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') })}
                        placeholder="KEY_NAME"
                        className="flex-1 min-w-0 text-xs font-mono bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-600 uppercase" />
                      <span className="text-slate-600">=</span>
                      {/* Value */}
                      <input type={v.secret ? 'password' : 'text'} value={v.value} onChange={e => updateVar(v.id, { value: e.target.value })}
                        placeholder="value"
                        className="flex-1 min-w-0 text-xs font-mono bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-600" />
                      {/* Controls */}
                      <button onClick={() => updateVar(v.id, { secret: !v.secret })} title={v.secret ? 'Mark not secret' : 'Mark as secret'}
                        className={`shrink-0 w-7 h-7 rounded-lg border text-xs transition-colors flex items-center justify-center ${v.secret ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-slate-800 border-slate-700 text-slate-600 hover:text-slate-400'}`}>
                        🔒
                      </button>
                      <button onClick={() => deleteVar(v.id)} className="shrink-0 w-7 h-7 rounded-lg border border-slate-700 bg-slate-800 text-slate-600 hover:text-red-400 hover:border-red-500/30 transition-colors flex items-center justify-center text-xs">✕</button>
                    </div>
                    {/* Comment */}
                    <input type="text" value={v.comment} onChange={e => updateVar(v.id, { comment: e.target.value })}
                      placeholder="# Optional comment"
                      className="text-xs bg-transparent border-0 text-slate-600 focus:outline-none placeholder-slate-700 px-0 font-mono" />
                    {/* Error */}
                    {validationErrors[v.id] && (
                      <span className="text-[11px] text-red-400">{validationErrors[v.id]}</span>
                    )}
                    {/* Move */}
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => moveUp(idx)} disabled={idx === 0} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-600 hover:text-slate-400 disabled:opacity-30 transition-colors">↑</button>
                      <button onClick={() => moveDown(idx)} disabled={idx === vars.length - 1} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-600 hover:text-slate-400 disabled:opacity-30 transition-colors">↓</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Cross-env diff */}
            {missingInOthers.length > 0 && (
              <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-3 flex flex-col gap-2">
                <h4 className="text-xs font-semibold text-amber-400">⚠ Environment diff</h4>
                {missingInOthers.map(({ env, missing, extra }) => (
                  <div key={env} className="text-xs text-slate-500">
                    <span className="text-slate-400 font-medium">{env}:</span>
                    {missing.length > 0 && <span className="text-red-400 ml-2">missing: {missing.join(', ')}</span>}
                    {extra.length > 0 && <span className="text-amber-400 ml-2">extra: {extra.join(', ')}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Export panel */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs font-semibold text-slate-400">Export as</h3>
              <div className="flex rounded-lg border border-slate-700 overflow-hidden">
                {([['env','.env'],['docker','Docker'],['k8s','K8s Secret'],['compose','Compose'],['json','JSON']] as const).map(([fmt, label]) => (
                  <button key={fmt} onClick={() => setExportFormat(fmt)}
                    className={`px-2.5 py-1 text-xs font-medium transition-colors ${exportFormat === fmt ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer ml-auto">
                <input type="checkbox" checked={maskSecrets} onChange={e => setMaskSecrets(e.target.checked)} className="accent-amber-500" />
                Mask secrets
              </label>
              <button onClick={() => copy(exported, 'export')}
                className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${copied === 'export' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                {copied === 'export' ? '✓ Copied' : 'Copy'}
              </button>
            </div>

            <pre className="flex-1 min-h-0 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-[12px] font-mono text-slate-300 overflow-auto leading-relaxed whitespace-pre" style={{ minHeight: '300px' }}>
              {exported || <span className="text-slate-700">Add variables to see export…</span>}
            </pre>

            {/* Validation summary */}
            {Object.keys(validationErrors).length > 0 && (
              <div className="bg-red-500/8 border border-red-500/20 rounded-xl p-3">
                <p className="text-xs font-semibold text-red-400 mb-1">⚠ Fix these errors before exporting:</p>
                {Object.entries(validationErrors).map(([id, err]) => {
                  const v = vars.find(x => x.id === id)
                  return <p key={id} className="text-xs text-red-300">{v?.key || '(empty key)'}: {err}</p>
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
