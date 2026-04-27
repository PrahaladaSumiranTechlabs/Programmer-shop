'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'

type Mode = 'auto' | 'base64-encode' | 'base64-decode' | 'jwt'

interface JWTPayload {
  header: Record<string, unknown>
  payload: Record<string, unknown>
  signature: string
  isExpired: boolean
  expiresAt: Date | null
  issuedAt: Date | null
}

function isJWT(s: string): boolean {
  const parts = s.trim().split('.')
  return parts.length === 3 && parts.every(p => /^[A-Za-z0-9_-]+$/.test(p))
}

function safeBase64Decode(s: string): string {
  try {
    // fix URL-safe base64
    const b = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(s.length + (4 - s.length % 4) % 4, '=')
    return atob(b)
  } catch { return '' }
}

function decodeJWT(token: string): JWTPayload | null {
  try {
    const [h, p, sig] = token.trim().split('.')
    const header = JSON.parse(safeBase64Decode(h))
    const payload = JSON.parse(safeBase64Decode(p))
    const exp = typeof payload.exp === 'number' ? new Date(payload.exp * 1000) : null
    const iat = typeof payload.iat === 'number' ? new Date(payload.iat * 1000) : null
    return { header, payload, signature: sig, isExpired: exp ? exp < new Date() : false, expiresAt: exp, issuedAt: iat }
  } catch { return null }
}

function tryB64Decode(s: string): string {
  try { return atob(s.trim()) } catch { return '' }
}

function b64Encode(s: string): string {
  try { return btoa(s) } catch { return '' }
}

function b64UrlEncode(s: string): string {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function formatTime(d: Date): string {
  const diff = d.getTime() - Date.now()
  const abs = Math.abs(diff)
  const mins = Math.floor(abs / 60000)
  const hours = Math.floor(abs / 3600000)
  const days = Math.floor(abs / 86400000)
  const suffix = diff < 0 ? 'ago' : 'from now'
  if (days > 1) return `${days} days ${suffix}`
  if (hours > 1) return `${hours} hours ${suffix}`
  if (mins > 1) return `${mins} minutes ${suffix}`
  return diff < 0 ? 'just now' : 'in a moment'
}

export default function Base64JWTPage() {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<Mode>('auto')
  const [urlSafe, setUrlSafe] = useState(false)
  const [copied, setCopied] = useState('')

  const detected: Mode = isJWT(input.trim()) ? 'jwt' : 'base64-decode'
  const activeMode = mode === 'auto' ? detected : mode

  const jwtData = activeMode === 'jwt' ? decodeJWT(input) : null

  const b64Result = activeMode === 'base64-decode'
    ? tryB64Decode(input.trim())
    : activeMode === 'base64-encode'
      ? (urlSafe ? b64UrlEncode(input) : b64Encode(input))
      : ''

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(''), 2000)
    })
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const result = ev.target?.result as string
      // data URL → strip prefix
      const b64 = result.split(',')[1] || ''
      setInput(b64)
      setMode('base64-decode')
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <button onClick={() => copy(text, id)}
      className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${copied === id ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'}`}>
      {copied === id ? '✓ Copied' : 'Copy'}
    </button>
  )

  const JSONBlock = ({ data, label, copyId }: { data: Record<string, unknown>; label: string; copyId: string }) => (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400">{label}</span>
        <CopyBtn text={JSON.stringify(data, null, 2)} id={copyId} />
      </div>
      <pre className="text-xs bg-slate-900 border border-slate-700 rounded-lg p-3 overflow-x-auto text-slate-300 leading-relaxed">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-13 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Home
          </Link>
          <span className="text-slate-700">·</span>
          <span className="font-semibold text-sm">🔐 Base64 / JWT Decoder</span>
          {input && isJWT(input.trim()) && (
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">JWT detected</span>
          )}
        </div>
      </nav>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 flex flex-col gap-6">

        {/* Mode selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-slate-700 overflow-hidden">
            {([['auto', 'Auto-detect'], ['base64-encode', 'Encode'], ['base64-decode', 'Decode'], ['jwt', 'JWT']] as [Mode, string][]).map(([m, label]) => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${mode === m ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                {label}
              </button>
            ))}
          </div>
          {(activeMode === 'base64-encode' || mode === 'auto') && (
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
              <input type="checkbox" checked={urlSafe} onChange={e => setUrlSafe(e.target.checked)} className="accent-indigo-500" />
              URL-safe (no +/=)
            </label>
          )}
          <label className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Upload file
            <input type="file" className="hidden" onChange={handleFile} />
          </label>
        </div>

        {/* Input */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              {activeMode === 'base64-encode' ? 'Plain text input' : 'Base64 / JWT input'}
            </label>
            <div className="flex gap-2">
              <button onClick={() => setInput('')} className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Clear</button>
              {input && <CopyBtn text={input} id="input" />}
            </div>
          </div>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={activeMode === 'base64-encode' ? 'Type or paste text to encode…' : activeMode === 'jwt' ? 'Paste a JWT token (eyJ…)' : 'Paste Base64 or JWT string…'}
            spellCheck={false}
            rows={5}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm font-mono text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none leading-relaxed placeholder-slate-700"
          />
          <div className="text-xs text-slate-700">{input.length} characters</div>
        </div>

        {/* Output */}
        {input && (
          <div className="flex flex-col gap-4">
            {/* JWT view */}
            {activeMode === 'jwt' && jwtData && (
              <div className="flex flex-col gap-4">
                {/* Status banner */}
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${jwtData.isExpired ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
                  <span className="text-lg">{jwtData.isExpired ? '⛔' : '✅'}</span>
                  <div className="flex flex-col">
                    <span className="font-semibold">{jwtData.isExpired ? 'Token expired' : 'Token valid'}</span>
                    {jwtData.expiresAt && (
                      <span className="text-xs opacity-80">
                        Expires: {jwtData.expiresAt.toLocaleString()} ({formatTime(jwtData.expiresAt)})
                      </span>
                    )}
                    {jwtData.issuedAt && (
                      <span className="text-xs opacity-80">
                        Issued: {jwtData.issuedAt.toLocaleString()} ({formatTime(jwtData.issuedAt)})
                      </span>
                    )}
                  </div>
                </div>

                <JSONBlock data={jwtData.header} label="Header (algorithm & token type)" copyId="jwt-header" />
                <JSONBlock data={jwtData.payload} label="Payload (claims)" copyId="jwt-payload" />

                {/* Signature */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-400">Signature (cannot be verified client-side)</span>
                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
                    <code className="flex-1 text-xs text-slate-500 font-mono break-all">{jwtData.signature}</code>
                    <CopyBtn text={jwtData.signature} id="sig" />
                  </div>
                </div>
              </div>
            )}

            {activeMode === 'jwt' && !jwtData && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
                ⚠ Invalid JWT — could not decode
              </div>
            )}

            {/* Base64 result */}
            {(activeMode === 'base64-encode' || activeMode === 'base64-decode') && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    {activeMode === 'base64-encode' ? 'Base64 output' : 'Decoded output'}
                  </label>
                  <CopyBtn text={b64Result} id="b64-out" />
                </div>
                {b64Result ? (
                  <pre className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm font-mono text-emerald-300 whitespace-pre-wrap break-all leading-relaxed overflow-auto max-h-64">
                    {b64Result}
                  </pre>
                ) : (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
                    ⚠ Invalid Base64 string
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quick reference */}
        <div className="mt-auto pt-4 border-t border-slate-800/60 grid sm:grid-cols-3 gap-4 text-xs text-slate-600">
          <div><span className="text-slate-500 font-medium">Base64</span> — encodes binary data as ASCII text. Used in data URIs, email attachments, auth headers.</div>
          <div><span className="text-slate-500 font-medium">JWT</span> — three Base64URL parts: header.payload.signature. Signature can only be verified with the secret key.</div>
          <div><span className="text-slate-500 font-medium">URL-safe</span> — replaces + with -, / with _, removes = padding. Safe to use in URLs without encoding.</div>
        </div>
      </div>
    </div>
  )
}
