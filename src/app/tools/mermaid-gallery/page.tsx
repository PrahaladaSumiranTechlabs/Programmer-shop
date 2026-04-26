'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Script from 'next/script'
import Link from 'next/link'

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface RenderedChart {
  index: number
  type: string
  code: string
  svgHTML: string
  error?: string
}

declare global {
  interface Window {
    mermaid: {
      initialize: (cfg: object) => void
      render: (id: string, code: string) => Promise<{ svg: string }>
    }
    PptxGenJS: new () => PptxGenInstance
  }
}

interface PptxGenInstance {
  layout: string
  addSlide: () => PptxSlide
  writeFile: (opts: { fileName: string }) => Promise<void>
}

interface PptxSlide {
  background: { color: string }
  addText: (text: string | Array<{ text: string; options: object }>, opts: object) => void
  addImage: (opts: object) => void
}

/* ─── Constants ──────────────────────────────────────────────────────────── */
const DIAGRAM_TYPES = [
  'graph','flowchart','sequenceDiagram','classDiagram','stateDiagram',
  'stateDiagram-v2','erDiagram','journey','gantt','pie','requirementDiagram',
  'gitGraph','mindmap','timeline','xychart-beta','block-beta','quadrantChart',
  'sankey-beta','packet-beta','kanban','architecture-beta','zenuml',
]
const KEYWORD_RE = new RegExp(
  `^(${DIAGRAM_TYPES.map(t => t.replace(/-/g,'\\-')).join('|')})(?:\\s|$)`, 'im'
)

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function splitDiagrams(raw: string): string[] {
  const fenced: string[] = []
  const fenceRE = /```(?:mermaid)?\s*\n([\s\S]*?)```/gi
  let m: RegExpExecArray | null
  while ((m = fenceRE.exec(raw)) !== null) {
    const code = m[1].trim()
    if (KEYWORD_RE.test(code)) fenced.push(code)
  }
  if (fenced.length) return fenced

  const lines = raw.split('\n')
  const chunks: string[] = []
  let current: string[] = []
  for (const line of lines) {
    if (KEYWORD_RE.test(line.trim()) && current.length > 0) {
      const c = current.join('\n').trim()
      if (c) chunks.push(c)
      current = [line]
    } else { current.push(line) }
  }
  const last = current.join('\n').trim()
  if (last) chunks.push(last)
  return chunks.filter(c => KEYWORD_RE.test(c.trim()))
}

function detectType(code: string): string {
  return code.trim().split(/\s/)[0]
}

function svgToPNG(svgHTML: string, scale = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(svgHTML, 'image/svg+xml')
    const svgEl = doc.querySelector('svg')
    if (!svgEl) { reject(new Error('No SVG element')); return }

    const w = (parseFloat(svgEl.getAttribute('width') || '0') || 800) * scale
    const h = (parseFloat(svgEl.getAttribute('height') || '0') || 600) * scale
    const blob = new Blob([svgHTML], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/png')
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')) }
    img.src = url
  })
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function triggerDownload(blob: Blob, filename: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
      }),
    }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(err?.error?.message || `HTTP ${res.status}`)
  }
  const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

function parseSlideContent(raw: string): { title: string; bullets: string[] } {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  let title = ''
  const bullets: string[] = []
  for (const line of lines) {
    if (!title && !line.startsWith('-')) {
      title = line.replace(/^#+\s*/, '').replace(/^\*+|\*+$/g, '').trim()
    } else if (line.startsWith('-') || line.startsWith('•') || /^\d+\./.test(line)) {
      bullets.push(line.replace(/^[-•\d.]\s*/, '').trim())
    }
  }
  return { title: title || 'Diagram', bullets: bullets.slice(0, 5) }
}

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function MermaidGalleryPage() {
  const [scriptsReady, setScriptsReady] = useState(0) // counts loaded scripts (need 2)
  const [rawInput, setRawInput] = useState('')
  const [charts, setCharts] = useState<RenderedChart[]>([])
  const [status, setStatus] = useState<{ msg: string; type: 'idle'|'loading'|'ok'|'error' }>({ msg: 'Drop a file or paste Mermaid code above.', type: 'idle' })
  const [geminiKey, setGeminiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [pptProgress, setPptProgress] = useState<{ open: boolean; step: string; pct: number }>({ open: false, step: '', pct: 0 })

  // Lightbox
  const [lbOpen, setLbOpen] = useState(false)
  const [lbIdx, setLbIdx] = useState(0)
  const [lbZoom, setLbZoom] = useState(1)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<HTMLDivElement>(null)

  // Init mermaid once both scripts are ready
  useEffect(() => {
    if (scriptsReady < 1) return
    if (typeof window.mermaid !== 'undefined') {
      window.mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })
    }
  }, [scriptsReady])

  /* ── File drop ────────────────────────────────────────────────────────── */
  const loadFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      setRawInput(text)
      setStatus({ msg: `Loaded "${file.name}" — rendering…`, type: 'loading' })
      renderDiagrams(text)
    }
    reader.readAsText(file)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) loadFile(file)
  }, [loadFile])

  /* ── Render ───────────────────────────────────────────────────────────── */
  const renderDiagrams = useCallback(async (raw?: string) => {
    const text = raw ?? rawInput
    if (!text.trim()) { setStatus({ msg: 'Nothing to render.', type: 'error' }); return }
    if (typeof window.mermaid === 'undefined') { setStatus({ msg: 'Mermaid.js still loading — try again in a moment.', type: 'error' }); return }

    const diagrams = splitDiagrams(text)
    if (!diagrams.length) { setStatus({ msg: 'No recognisable Mermaid diagrams found.', type: 'error' }); return }

    setStatus({ msg: `Rendering ${diagrams.length} diagram(s)…`, type: 'loading' })
    setCharts([])
    const results: RenderedChart[] = []

    for (let i = 0; i < diagrams.length; i++) {
      const code = diagrams[i]
      const id = `mmd-${Date.now()}-${i}`
      const type = detectType(code)
      try {
        const { svg } = await window.mermaid.render(id, code)
        results.push({ index: i + 1, type, code, svgHTML: svg })
      } catch (err) {
        results.push({ index: i + 1, type, code, svgHTML: '', error: String(err) })
      }
    }

    setCharts(results)
    const ok = results.filter(r => !r.error).length
    const fail = results.length - ok
    setStatus({ msg: `${ok} chart${ok !== 1 ? 's' : ''} rendered${fail ? `, ${fail} failed` : ''}.`, type: fail ? 'error' : 'ok' })
  }, [rawInput])

  /* ── Lightbox keyboard ────────────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!lbOpen) return
      const good = charts.filter(c => !c.error)
      if (e.key === 'Escape') { setLbOpen(false); return }
      if (e.key === 'ArrowLeft'  && lbIdx > 0)              { setLbIdx(i => i - 1); setLbZoom(1) }
      if (e.key === 'ArrowRight' && lbIdx < good.length - 1) { setLbIdx(i => i + 1); setLbZoom(1) }
      if (e.key === '+' || e.key === '=') setLbZoom(z => Math.min(z + 0.25, 4))
      if (e.key === '-') setLbZoom(z => Math.max(z - 0.25, 0.25))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lbOpen, lbIdx, charts])

  /* ── PPT ──────────────────────────────────────────────────────────────── */
  const generatePPT = useCallback(async () => {
    if (!geminiKey.trim()) { alert('Enter your Gemini API key first.'); return }
    const good = charts.filter(c => !c.error)
    if (!good.length) { alert('Render some charts first.'); return }
    if (typeof window.PptxGenJS === 'undefined') { alert('PptxGenJS still loading — try again.'); return }

    setPptProgress({ open: true, step: 'Starting…', pct: 0 })
    const prs = new window.PptxGenJS()
    prs.layout = 'LAYOUT_WIDE'

    // Title slide
    const ts = prs.addSlide()
    ts.background = { color: '0F1117' }
    ts.addText('Mermaid Chart Gallery', { x: 0.5, y: 2.8, w: 12.33, h: 1, fontSize: 36, bold: true, color: '7C85F5', align: 'center' } as object)
    ts.addText(`${good.length} diagram${good.length !== 1 ? 's' : ''} · ${new Date().toLocaleDateString()}`, { x: 0.5, y: 4, w: 12.33, h: 0.5, fontSize: 14, color: '64748B', align: 'center' } as object)

    for (let i = 0; i < good.length; i++) {
      const chart = good[i]
      const pct = Math.round(((i + 0.4) / good.length) * 100)
      setPptProgress({ open: true, step: `Chart ${i+1}/${good.length}: generating slide copy…`, pct })

      let title = `Chart ${i+1}: ${chart.type}`
      let bullets: string[] = []
      try {
        const raw = await callGemini(geminiKey, `You are a technical presentation writer. Given this Mermaid diagram code, write a slide title (one concise line, no markdown) and 3-5 bullet point insights (each starting with a dash). Be specific to the diagram content.\n\nDiagram type: ${chart.type}\n\nCode:\n${chart.code}`)
        const parsed = parseSlideContent(raw)
        title = parsed.title || title
        bullets = parsed.bullets
      } catch { bullets = [`${chart.type} diagram`, 'See visual for details'] }

      setPptProgress({ open: true, step: `Chart ${i+1}/${good.length}: exporting PNG…`, pct: Math.round(((i + 0.7) / good.length) * 100) })

      let imgData: string | null = null
      try {
        const blob = await svgToPNG(chart.svgHTML, 2)
        imgData = await blobToDataURL(blob)
      } catch { /* skip image */ }

      const slide = prs.addSlide()
      slide.background = { color: '0F1117' }
      slide.addText(`${i+1}/${good.length}`, { x: 12.5, y: 0.18, w: 0.7, h: 0.3, fontSize: 8, color: '64748B', align: 'right' } as object)
      slide.addText(chart.type.toUpperCase(), { x: 0.4, y: 0.18, w: 2, h: 0.3, fontSize: 8, bold: true, color: '7C85F5' } as object)

      if (imgData) {
        slide.addImage({ data: imgData, x: 0.4, y: 0.6, w: 7.2, h: 5.8, sizing: { type: 'contain', w: 7.2, h: 5.8 } })
        slide.addText(title, { x: 8.0, y: 0.7, w: 5.0, h: 0.8, fontSize: 18, bold: true, color: 'E2E8F0', wrap: true } as object)
        if (bullets.length) {
          slide.addText(
            bullets.map(b => ({ text: `• ${b}\n`, options: { color: '94A3B8', fontSize: 12 } })),
            { x: 8.0, y: 1.8, w: 5.0, h: 5.0, valign: 'top', wrap: true } as object
          )
        }
      } else {
        slide.addText(title, { x: 0.5, y: 1.2, w: 12.3, h: 0.8, fontSize: 22, bold: true, color: 'E2E8F0', wrap: true } as object)
        if (bullets.length) {
          slide.addText(
            bullets.map(b => ({ text: `• ${b}\n`, options: { color: '94A3B8', fontSize: 14 } })),
            { x: 0.5, y: 2.4, w: 12.3, h: 4.5, valign: 'top', wrap: true } as object
          )
        }
      }

      setPptProgress({ open: true, step: `Chart ${i+1}/${good.length}: done.`, pct: Math.round(((i + 1) / good.length) * 100) })
    }

    setPptProgress({ open: true, step: 'Saving .pptx…', pct: 100 })
    await prs.writeFile({ fileName: `mermaid-charts-${Date.now()}.pptx` })
    setPptProgress({ open: false, step: '', pct: 0 })
    setStatus({ msg: `✓ PPT saved — ${good.length} slides generated by Gemini.`, type: 'ok' })
  }, [geminiKey, charts])

  /* ── Download ─────────────────────────────────────────────────────────── */
  const downloadChart = async (chart: RenderedChart) => {
    try {
      const blob = await svgToPNG(chart.svgHTML, 2)
      triggerDownload(blob, `chart-${chart.index}-${chart.type}.png`)
    } catch (e) { alert('PNG export failed: ' + e) }
  }

  const downloadAll = async () => {
    const good = charts.filter(c => !c.error)
    for (const chart of good) {
      await downloadChart(chart)
      await new Promise(r => setTimeout(r, 130))
    }
  }

  /* ── Lightbox data ────────────────────────────────────────────────────── */
  const goodCharts = charts.filter(c => !c.error)
  const lbChart = goodCharts[lbIdx]

  const openLb = (idx: number) => { setLbIdx(idx); setLbZoom(1); setLbOpen(true) }

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <>
      {/* CDN scripts — loaded once, then mermaid init fires */}
      <Script
        src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"
        strategy="afterInteractive"
        onLoad={() => setScriptsReady(n => n + 1)}
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js"
        strategy="afterInteractive"
        onLoad={() => setScriptsReady(n => n + 1)}
      />

      <div className="min-h-screen bg-slate-950 text-white">

        {/* Nav */}
        <nav className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight">
                <span className="text-white">Programmer</span>
                <span className="text-indigo-400">Shop</span>
              </span>
              <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">beta</span>
            </Link>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <Link href="/" className="hover:text-white transition-colors">← All tools</Link>
            </div>
          </div>
        </nav>

        <div className="max-w-6xl mx-auto px-5 py-10 space-y-6">

          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-xl">📊</div>
              <div>
                <h1 className="text-2xl font-bold">Mermaid Chart Gallery</h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  Drop a <code className="text-pink-400">.md</code> · <code className="text-pink-400">.mmd</code> · <code className="text-pink-400">.txt</code> file — all diagrams auto-extracted, gallery view with zoom, PNG + Gemini-powered PPT export.
                </p>
              </div>
            </div>
          </div>

          {/* Input grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Paste */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Paste code or markdown</div>
              <textarea
                value={rawInput}
                onChange={e => setRawInput(e.target.value)}
                rows={10}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono text-xs p-3 resize-y outline-none focus:border-pink-500/60 placeholder:text-slate-700 leading-relaxed"
                placeholder={`Paste raw Mermaid or full Markdown file…\n\n── Raw .mmd ──────────────────────\ngraph TD\n  A --> B\n\n── Markdown .md ──────────────────\n\`\`\`mermaid\nflowchart TD\n  Start --> End\n\`\`\``}
              />
            </div>

            {/* Drop zone */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex flex-col">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Upload file</div>
              <div
                ref={dragRef}
                className="flex-1 border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer text-center p-6 transition-colors hover:border-pink-500/50 hover:bg-slate-800/30"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); dragRef.current?.classList.add('border-pink-500/50') }}
                onDragLeave={() => dragRef.current?.classList.remove('border-pink-500/50')}
                onDrop={onDrop}
              >
                <svg className="w-9 h-9 text-pink-500 opacity-50" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12M8 8l4-4 4 4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-sm text-slate-400">Drop file here or click to browse</span>
                <span className="text-xs text-slate-600">.md · .mmd · .txt · any plain-text</span>
                <span className="text-xs text-pink-400">Auto-renders on drop — no button needed</span>
              </div>
              <input ref={fileInputRef} type="file" accept=".mmd,.txt,.md,.mermaid,text/*" className="hidden"
                onChange={e => { if (e.target.files?.[0]) loadFile(e.target.files[0]) }}
              />
            </div>
          </div>

          {/* Gemini API key strip */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">✦ Gemini API</span>
            <div className="relative flex-1 min-w-52">
              <input
                type={showKey ? 'text' : 'password'}
                value={geminiKey}
                onChange={e => setGeminiKey(e.target.value)}
                placeholder="Paste Gemini API key to enable PPT export…"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-sm px-3 py-2 pr-9 outline-none focus:border-pink-500/60 placeholder:text-slate-700"
              />
              <button
                onClick={() => setShowKey(s => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  {showKey
                    ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                    : <><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></>
                  }
                </svg>
              </button>
            </div>
            <span className="text-xs text-slate-600">
              Free key at{' '}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:underline">
                aistudio.google.com
              </a>
            </span>
          </div>

          {/* Action bar */}
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => renderDiagrams()}
              disabled={scriptsReady < 1}
              className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Render Charts
            </button>
            <button
              onClick={() => { setRawInput(''); setCharts([]); setStatus({ msg: 'Ready.', type: 'idle' }) }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
            >
              Clear
            </button>
            {goodCharts.length > 0 && (
              <button
                onClick={downloadAll}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                Download All PNGs
              </button>
            )}
            {goodCharts.length > 0 && geminiKey.trim() && (
              <button
                onClick={generatePPT}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-red-500 hover:opacity-90 text-white text-sm font-semibold rounded-lg transition-opacity"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                Generate PPT with Gemini
              </button>
            )}
          </div>

          {/* Status */}
          <div className={`flex items-center gap-2 text-sm min-h-[20px] ${
            status.type === 'ok' ? 'text-emerald-400' :
            status.type === 'error' ? 'text-red-400' :
            status.type === 'loading' ? 'text-slate-400' : 'text-slate-500'
          }`}>
            {status.type === 'loading' && (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            )}
            {status.msg}
          </div>

          {/* Gallery */}
          {goodCharts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Chart Gallery</h2>
                <span className="text-xs text-slate-600">{goodCharts.length} chart{goodCharts.length !== 1 ? 's' : ''} · click to zoom</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {charts.map((chart, idx) => {
                  const goodIdx = goodCharts.findIndex(g => g.index === chart.index)
                  return (
                    <div
                      key={chart.index}
                      onClick={() => !chart.error && openLb(goodIdx)}
                      className={`rounded-xl border bg-slate-900/50 overflow-hidden transition-all duration-200 ${
                        chart.error
                          ? 'border-red-800/50'
                          : 'border-slate-800 hover:border-pink-500/50 hover:shadow-lg hover:shadow-pink-500/10 cursor-pointer'
                      }`}
                    >
                      {/* Card header */}
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800">
                        <span className="text-xs font-bold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded">
                          {chart.type}
                        </span>
                        <span className="text-xs text-slate-600 mr-auto">#{chart.index}</span>
                        {!chart.error && (
                          <span className="text-xs text-slate-700">click to zoom</span>
                        )}
                        {!chart.error && (
                          <button
                            onClick={e => { e.stopPropagation(); downloadChart(chart) }}
                            className="text-xs px-2 py-0.5 rounded border border-slate-700 text-slate-500 hover:border-pink-500/50 hover:text-pink-400 transition-colors"
                          >
                            ↓ PNG
                          </button>
                        )}
                      </div>

                      {/* SVG preview */}
                      {chart.error ? (
                        <div className="p-3 text-xs text-red-400 font-mono bg-red-950/20 break-all">{chart.error}</div>
                      ) : (
                        <div
                          className="bg-white p-3 flex justify-center items-center min-h-[140px] max-h-[280px] overflow-hidden"
                          dangerouslySetInnerHTML={{ __html: chart.svgHTML }}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Lightbox ────────────────────────────────────────────────────── */}
        {lbOpen && lbChart && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
            onClick={e => { if (e.target === e.currentTarget) setLbOpen(false) }}
          >
            {/* Prev */}
            <button
              disabled={lbIdx === 0}
              onClick={() => { setLbIdx(i => i - 1); setLbZoom(1) }}
              className="fixed left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:border-pink-500/50 disabled:opacity-20 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
            </button>

            {/* Next */}
            <button
              disabled={lbIdx === goodCharts.length - 1}
              onClick={() => { setLbIdx(i => i + 1); setLbZoom(1) }}
              className="fixed right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:border-pink-500/50 disabled:opacity-20 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
            </button>

            <div className="flex flex-col items-center gap-3 max-w-[90vw]">
              {/* Toolbar */}
              <div className="flex items-center gap-2 w-full">
                <span className="text-xs font-bold text-pink-400 bg-pink-500/10 border border-pink-500/20 px-2.5 py-1 rounded-md">
                  {lbChart.type}
                </span>
                <span className="text-xs text-slate-500 mr-auto">{lbIdx + 1} / {goodCharts.length}</span>

                {/* Zoom controls */}
                <button onClick={() => setLbZoom(z => Math.max(z - 0.25, 0.25))} className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:border-pink-500/50 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M8 11h6"/></svg>
                </button>
                <span className="text-xs text-slate-500 w-10 text-center">{Math.round(lbZoom * 100)}%</span>
                <button onClick={() => setLbZoom(z => Math.min(z + 0.25, 4))} className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:border-pink-500/50 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M11 8v6M8 11h6"/></svg>
                </button>
                <button onClick={() => setLbZoom(1)} className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:border-pink-500/50 transition-colors" title="Reset zoom">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M3 12a9 9 0 101.5-5M3 3v4h4"/></svg>
                </button>

                <button onClick={() => downloadChart(lbChart)} className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:border-pink-500/50 transition-colors" title="Download PNG">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                </button>
                <button onClick={() => setLbOpen(false)} className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:border-red-500/50 hover:text-red-400 transition-colors" title="Close (Esc)">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>

              {/* SVG canvas */}
              <div
                className="bg-white rounded-xl p-6 overflow-auto max-w-[88vw] max-h-[76vh] flex items-center justify-center"
                onWheel={e => {
                  e.preventDefault()
                  setLbZoom(z => e.deltaY < 0 ? Math.min(z + 0.15, 4) : Math.max(z - 0.15, 0.25))
                }}
              >
                <div
                  style={{ transform: `scale(${lbZoom})`, transformOrigin: 'top center', transition: 'transform 0.15s' }}
                  dangerouslySetInnerHTML={{ __html: lbChart.svgHTML }}
                />
              </div>

              <p className="text-xs text-slate-600">Scroll to zoom · ← → to navigate · Esc to close</p>
            </div>
          </div>
        )}

        {/* ── PPT progress modal ───────────────────────────────────────────── */}
        {pptProgress.open && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 w-80 text-center">
              <h3 className="font-bold text-lg mb-2">Generating Presentation…</h3>
              <p className="text-sm text-slate-400 mb-5">Asking Gemini to write slide content for each chart.</p>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 to-violet-500 rounded-full transition-all duration-300"
                  style={{ width: `${pptProgress.pct}%` }}
                />
              </div>
              <p className="text-xs text-slate-500">{pptProgress.step}</p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
