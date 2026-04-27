'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

/* ── Types ───────────────────────────────────────────────────── */
interface MatchResult {
  match: string
  index: number
  end: number
  groups: string[]
  namedGroups: Record<string, string>
}

/* ── Pattern library ─────────────────────────────────────────── */
const PATTERNS = [
  { label: 'Email', pattern: '[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}', flags: 'gi', desc: 'Standard email address' },
  { label: 'URL', pattern: 'https?:\\/\\/[^\\s/$.?#].[^\\s]*', flags: 'gi', desc: 'HTTP/HTTPS URLs' },
  { label: 'IPv4', pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b', flags: 'g', desc: 'IPv4 address' },
  { label: 'IPv6', pattern: '([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}', flags: 'gi', desc: 'IPv6 address' },
  { label: 'Phone (US)', pattern: '(\\+1[\\s.-]?)?\\(?\\d{3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4}', flags: 'g', desc: 'US phone number' },
  { label: 'Date (YYYY-MM-DD)', pattern: '\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])', flags: 'g', desc: 'ISO date format' },
  { label: 'Time (HH:MM)', pattern: '([01]?\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?', flags: 'g', desc: '24-hour time' },
  { label: 'Hex Color', pattern: '#(?:[0-9a-fA-F]{3}){1,2}\\b', flags: 'gi', desc: 'CSS hex color' },
  { label: 'JWT', pattern: 'eyJ[A-Za-z0-9_-]+\\.eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+', flags: 'g', desc: 'JSON Web Token' },
  { label: 'UUID', pattern: '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', flags: 'gi', desc: 'UUID v4' },
  { label: 'Semantic version', pattern: '\\bv?\\d+\\.\\d+\\.\\d+(?:-[\\w.]+)?\\b', flags: 'gi', desc: 'Semver string' },
  { label: 'HTML tag', pattern: '<([a-z][a-z0-9]*)(?:\\s[^>]*)?>.*?<\\/\\1>', flags: 'gi', desc: 'HTML element' },
  { label: 'Credit card', pattern: '\\b(?:\\d{4}[\\s-]?){3}\\d{4}\\b', flags: 'g', desc: '16-digit card number' },
  { label: 'Slug', pattern: '[a-z0-9]+(?:-[a-z0-9]+)*', flags: 'g', desc: 'URL-friendly slug' },
  { label: 'MD heading', pattern: '^#{1,6}\\s.+', flags: 'gm', desc: 'Markdown heading' },
]

const SAMPLE_TEXT = `Welcome to Regex Tester!

Contact: alice@example.com or bob.smith+work@company.co.uk
Phone: +1 (555) 123-4567 or 555.987.6543
Website: https://www.example.com/path?q=test&page=2

Dates: 2024-01-15, 2023-12-31
Colors: #ff0000, #abc, #3b82f6
Version: v1.2.3, 2.0.0-beta.1
UUID: 550e8400-e29b-41d4-a716-446655440000

IP addresses: 192.168.1.1, 10.0.0.255
Server: 2001:0db8:85a3:0000:0000:8a2e:0370:7334`

/* ── Regex explainer ─────────────────────────────────────────── */
function explainRegex(pattern: string): { token: string; color: string; desc: string }[] {
  const tokens: { token: string; color: string; desc: string }[] = []
  let i = 0
  while (i < pattern.length) {
    const ch = pattern[i]
    if (ch === '\\' && i + 1 < pattern.length) {
      const next = pattern[i + 1]
      const map: Record<string, string> = { d: 'Any digit [0-9]', D: 'Non-digit', w: 'Word char [a-zA-Z0-9_]', W: 'Non-word', s: 'Whitespace', S: 'Non-whitespace', b: 'Word boundary', B: 'Non-word boundary', n: 'Newline', t: 'Tab', r: 'Carriage return', '.': 'Literal dot', '+': 'Literal +', '*': 'Literal *', '?': 'Literal ?', '(': 'Literal (', ')': 'Literal )', '[': 'Literal [', ']': 'Literal ]' }
      tokens.push({ token: `\\${next}`, color: 'text-blue-400', desc: map[next] || `Escaped: ${next}` })
      i += 2
    } else if (ch === '[') {
      const end = pattern.indexOf(']', i)
      const cls = pattern.slice(i, end + 1)
      tokens.push({ token: cls, color: 'text-amber-400', desc: `Character class: ${cls}` })
      i = end + 1
    } else if (ch === '(' ) {
      const isNamed = pattern.slice(i).match(/^\(\?<([^>]+)>/)
      const isNonCapture = pattern.slice(i, i + 3) === '(?:'
      const isLookahead = pattern.slice(i, i + 3) === '(?='
      const isNegLook = pattern.slice(i, i + 4) === '(?!='
      if (isNamed) {
        tokens.push({ token: `(?<${isNamed[1]}>`, color: 'text-purple-400', desc: `Named capture group: ${isNamed[1]}` })
        i += isNamed[0].length
      } else if (isNonCapture) {
        tokens.push({ token: '(?:', color: 'text-slate-400', desc: 'Non-capturing group' })
        i += 3
      } else if (isLookahead) {
        tokens.push({ token: '(?=', color: 'text-pink-400', desc: 'Positive lookahead' })
        i += 3
      } else if (isNegLook) {
        tokens.push({ token: '(?!=', color: 'text-red-400', desc: 'Negative lookahead' })
        i += 4
      } else {
        tokens.push({ token: '(', color: 'text-green-400', desc: 'Capturing group start' })
        i++
      }
    } else if (ch === ')') {
      tokens.push({ token: ')', color: 'text-green-400', desc: 'Group end' })
      i++
    } else if (ch === '{') {
      const m = pattern.slice(i).match(/^\{(\d+)(?:,(\d*))?\}/)
      if (m) {
        const desc = m[2] === undefined ? `Exactly ${m[1]}` : m[2] === '' ? `${m[1]} or more` : `Between ${m[1]} and ${m[2]}`
        tokens.push({ token: m[0], color: 'text-orange-400', desc: `Quantifier: ${desc}` })
        i += m[0].length
      } else { tokens.push({ token: ch, color: 'text-slate-300', desc: 'Literal {' }); i++ }
    } else if (ch === '*') { tokens.push({ token: '*', color: 'text-orange-400', desc: 'Quantifier: 0 or more' }); i++ }
    else if (ch === '+') { tokens.push({ token: '+', color: 'text-orange-400', desc: 'Quantifier: 1 or more' }); i++ }
    else if (ch === '?') { tokens.push({ token: '?', color: 'text-orange-400', desc: 'Quantifier: 0 or 1 (optional)' }); i++ }
    else if (ch === '^') { tokens.push({ token: '^', color: 'text-pink-400', desc: 'Start of string/line' }); i++ }
    else if (ch === '$') { tokens.push({ token: '$', color: 'text-pink-400', desc: 'End of string/line' }); i++ }
    else if (ch === '.') { tokens.push({ token: '.', color: 'text-cyan-400', desc: 'Any character (except newline)' }); i++ }
    else if (ch === '|') { tokens.push({ token: '|', color: 'text-red-400', desc: 'Alternation (OR)' }); i++ }
    else { tokens.push({ token: ch, color: 'text-slate-300', desc: `Literal: ${ch}` }); i++ }
  }
  return tokens
}

export default function RegexTesterPage() {
  const [pattern, setPattern] = useState('[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}')
  const [flags, setFlags] = useState({ g: true, i: true, m: false, s: false, u: false })
  const [testStr, setTestStr] = useState(SAMPLE_TEXT)
  const [tab, setTab] = useState<'matches' | 'explain' | 'library'>('matches')
  const [copied, setCopied] = useState('')

  const flagStr = Object.entries(flags).filter(([, v]) => v).map(([k]) => k).join('')

  /* ── Compile regex ─────────────────────────────────────────── */
  const compiled = useMemo<{ re: RegExp; err: string } >(() => {
    if (!pattern) return { re: /(?:)/, err: '' }
    try { return { re: new RegExp(pattern, flagStr), err: '' } }
    catch (e) { return { re: /(?:)/, err: String(e) } }
  }, [pattern, flagStr])

  /* ── Run matches ───────────────────────────────────────────── */
  const matches = useMemo<MatchResult[]>(() => {
    if (compiled.err || !pattern || !testStr) return []
    const results: MatchResult[] = []
    const re = new RegExp(pattern, flagStr.includes('g') ? flagStr : flagStr + 'g')
    let m: RegExpExecArray | null
    let guard = 0
    while ((m = re.exec(testStr)) !== null && guard++ < 500) {
      results.push({
        match: m[0],
        index: m.index,
        end: m.index + m[0].length,
        groups: m.slice(1).map(g => g ?? '(undefined)'),
        namedGroups: (m.groups ?? {}) as Record<string, string>,
      })
      if (m[0].length === 0) re.lastIndex++
    }
    return results
  }, [compiled, pattern, flagStr, testStr])

  /* ── Highlighted test string ─────────────────────────────────*/
  const highlighted = useMemo(() => {
    if (!matches.length || !testStr) return testStr.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    let result = ''
    let last = 0
    const colors = ['bg-yellow-400/30 text-yellow-200', 'bg-blue-400/30 text-blue-200', 'bg-green-400/30 text-green-200', 'bg-pink-400/30 text-pink-200', 'bg-orange-400/30 text-orange-200']
    matches.forEach((m, idx) => {
      const pre = testStr.slice(last, m.index).replace(/</g, '&lt;').replace(/>/g, '&gt;')
      const match = testStr.slice(m.index, m.end).replace(/</g, '&lt;').replace(/>/g, '&gt;')
      result += pre + `<mark class="${colors[idx % colors.length]} rounded px-0.5" title="Match ${idx + 1}">${match}</mark>`
      last = m.end
    })
    result += testStr.slice(last).replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return result
  }, [matches, testStr])

  const explained = useMemo(() => explainRegex(pattern), [pattern])

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => { setCopied(id); setTimeout(() => setCopied(''), 2000) })
  }

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
          <span className="font-semibold text-sm">🔍 Regex Tester</span>
          {!compiled.err && pattern && (
            <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full">
              {matches.length} match{matches.length !== 1 ? 'es' : ''}
            </span>
          )}
          {compiled.err && <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/25 px-2 py-0.5 rounded-full">Invalid regex</span>}
        </div>
      </nav>

      <div className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>

        {/* Pattern input row */}
        <div className="shrink-0 border-b border-slate-800 bg-slate-900/50 px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-mono text-lg select-none shrink-0">/</span>
            <input
              type="text"
              value={pattern}
              onChange={e => setPattern(e.target.value)}
              placeholder="Enter regex pattern…"
              spellCheck={false}
              className={`flex-1 bg-slate-900 border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${compiled.err ? 'border-red-500/50 text-red-300' : 'border-slate-700 text-slate-200'}`}
            />
            <span className="text-slate-500 font-mono text-lg select-none shrink-0">/</span>
            {/* Flags */}
            <div className="flex gap-1">
              {(['g','i','m','s','u'] as const).map(f => (
                <button key={f} onClick={() => setFlags(fl => ({ ...fl, [f]: !fl[f] }))}
                  className={`w-7 h-7 text-xs font-mono rounded border transition-colors font-bold ${flags[f] ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-white'}`}>
                  {f}
                </button>
              ))}
            </div>
            <button onClick={() => copy(`/${pattern}/${flagStr}`, 'pat')}
              className={`px-2.5 py-1.5 text-xs rounded-md border transition-colors ${copied === 'pat' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'}`}>
              {copied === 'pat' ? '✓' : 'Copy'}
            </button>
          </div>
          {compiled.err && <div className="text-xs text-red-400 font-mono">{compiled.err}</div>}
          {/* Flag legend */}
          <div className="flex gap-3 text-[11px] text-slate-600">
            {[['g','global'],['i','case insensitive'],['m','multiline'],['s','dotAll'],['u','unicode']].map(([k,v]) => (
              <span key={k} className={flags[k as keyof typeof flags] ? 'text-indigo-400' : ''}><code className="font-mono">{k}</code> = {v}</span>
            ))}
          </div>
        </div>

        {/* Split: test string + results */}
        <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden">

          {/* Left: test string */}
          <div className="flex flex-col border-r border-slate-800 overflow-hidden">
            <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-slate-900/60 border-b border-slate-800">
              <span className="text-xs text-slate-500">Test string</span>
              <div className="flex gap-2">
                <button onClick={() => setTestStr(SAMPLE_TEXT)} className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Sample</button>
                <button onClick={() => setTestStr('')} className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Clear</button>
              </div>
            </div>
            <textarea
              value={testStr}
              onChange={e => setTestStr(e.target.value)}
              spellCheck={false}
              placeholder="Paste text to test against…"
              className="flex-1 bg-slate-950 text-slate-300 font-mono text-[13px] resize-none px-4 py-3 focus:outline-none leading-relaxed placeholder-slate-700 overflow-auto"
            />
          </div>

          {/* Right: tabs */}
          <div className="flex flex-col overflow-hidden">
            {/* Tab bar */}
            <div className="shrink-0 flex border-b border-slate-800 bg-slate-900/60">
              {([['matches','Matches'],['explain','Explain'],['library','Library']] as const).map(([t,l]) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${tab === t ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                  {l}
                </button>
              ))}
            </div>

            {/* MATCHES tab */}
            {tab === 'matches' && (
              <div className="flex-1 overflow-auto flex flex-col">
                {/* Highlighted preview */}
                <div className="shrink-0 border-b border-slate-800 px-4 py-3 bg-slate-900/30">
                  <div className="text-xs text-slate-500 mb-1.5">Highlighted preview</div>
                  <pre className="text-[12px] font-mono text-slate-300 leading-relaxed whitespace-pre-wrap break-all max-h-32 overflow-auto"
                    dangerouslySetInnerHTML={{ __html: highlighted }} />
                </div>
                {/* Match list */}
                <div className="flex-1 overflow-auto px-4 py-3 flex flex-col gap-2">
                  {matches.length === 0 ? (
                    <div className="text-slate-600 text-sm text-center mt-4">{pattern ? 'No matches' : 'Enter a pattern above'}</div>
                  ) : matches.map((m, i) => (
                    <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2.5 hover:border-slate-700 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded font-mono">#{i + 1}</span>
                        <code className="text-xs font-mono text-yellow-300 font-semibold break-all">{m.match || '(empty)'}</code>
                        <span className="ml-auto text-[10px] text-slate-600 font-mono">idx {m.index}–{m.end}</span>
                      </div>
                      {m.groups.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {m.groups.map((g, gi) => (
                            <span key={gi} className="text-[11px] font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                              ${gi + 1}: {g}
                            </span>
                          ))}
                        </div>
                      )}
                      {Object.keys(m.namedGroups).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(m.namedGroups).map(([k, v]) => (
                            <span key={k} className="text-[11px] font-mono bg-purple-500/15 text-purple-300 border border-purple-500/20 px-1.5 py-0.5 rounded">
                              {k}: {v}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* EXPLAIN tab */}
            {tab === 'explain' && (
              <div className="flex-1 overflow-auto px-4 py-4 flex flex-col gap-2">
                <div className="text-xs text-slate-500 mb-1">Token-by-token breakdown of <code className="font-mono text-slate-300">/{pattern}/</code></div>
                {!pattern ? (
                  <div className="text-slate-600 text-sm text-center mt-4">Enter a pattern to explain</div>
                ) : (
                  <>
                    {/* Visual token strip */}
                    <div className="flex flex-wrap gap-1 p-3 bg-slate-900 border border-slate-800 rounded-xl font-mono text-sm">
                      {explained.map((t, i) => (
                        <span key={i} className={`${t.color} cursor-default`} title={t.desc}>{t.token}</span>
                      ))}
                    </div>
                    {/* Token table */}
                    <div className="flex flex-col gap-1.5">
                      {explained.map((t, i) => (
                        <div key={i} className="flex items-center gap-3 bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-1.5">
                          <code className={`text-xs font-mono w-24 shrink-0 ${t.color}`}>{t.token}</code>
                          <span className="text-xs text-slate-500">{t.desc}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* LIBRARY tab */}
            {tab === 'library' && (
              <div className="flex-1 overflow-auto px-4 py-3 flex flex-col gap-2">
                <div className="text-xs text-slate-500 mb-1">Click to load pattern</div>
                {PATTERNS.map(p => (
                  <button key={p.label} onClick={() => { setPattern(p.pattern); const fl = { g: false, i: false, m: false, s: false, u: false }; p.flags.split('').forEach(f => { if (f in fl) (fl as Record<string,boolean>)[f] = true }); setFlags(fl); setTab('matches') }}
                    className="flex items-center gap-3 bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2.5 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-left group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-300 group-hover:text-white">{p.label}</span>
                        <code className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1 rounded border border-indigo-500/20">/{p.flags}/</code>
                      </div>
                      <code className="text-[11px] font-mono text-slate-600 truncate block mt-0.5">{p.pattern.slice(0, 50)}{p.pattern.length > 50 ? '…' : ''}</code>
                      <span className="text-[11px] text-slate-600">{p.desc}</span>
                    </div>
                    <svg className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
