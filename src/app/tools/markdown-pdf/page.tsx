'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Script from 'next/script'

declare global {
  interface Window {
    marked: {
      parse: (src: string, options?: Record<string, unknown>) => string
      setOptions: (options: Record<string, unknown>) => void
    }
    hljs: { highlightElement: (el: HTMLElement) => void }
    html2pdf: (element: HTMLElement, options: Record<string, unknown>) => { save: () => void }
  }
}

/* ── Themes ─────────────────────────────────────────────────── */
const THEMES = {
  github: {
    name: 'GitHub',
    bg: '#ffffff', text: '#1f2328', heading: '#1f2328', link: '#0969da',
    code: '#f6f8fa', codeBorder: '#d0d7de', border: '#d0d7de',
    blockquote: '#636e7b', blockquoteBg: '#f6f8fa',
    fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`,
  },
  dark: {
    name: 'Dark',
    bg: '#0d1117', text: '#e6edf3', heading: '#f0f6fc', link: '#58a6ff',
    code: '#161b22', codeBorder: '#30363d', border: '#30363d',
    blockquote: '#8b949e', blockquoteBg: '#161b22',
    fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`,
  },
  minimal: {
    name: 'Minimal',
    bg: '#fafafa', text: '#333333', heading: '#111111', link: '#3b82f6',
    code: '#f0f0f0', codeBorder: '#e0e0e0', border: '#e0e0e0',
    blockquote: '#666666', blockquoteBg: '#f5f5f5',
    fontFamily: `'Georgia', 'Times New Roman', serif`,
  },
  academic: {
    name: 'Academic',
    bg: '#fffef7', text: '#2c2c2c', heading: '#1a1a1a', link: '#8b0000',
    code: '#f4f4f0', codeBorder: '#cccccc', border: '#cccccc',
    blockquote: '#555555', blockquoteBg: '#f8f8f2',
    fontFamily: `'Palatino Linotype', 'Book Antiqua', Palatino, serif`,
  },
  notion: {
    name: 'Notion',
    bg: '#ffffff', text: '#37352f', heading: '#37352f', link: '#0f7b6c',
    code: '#f1f1ef', codeBorder: '#e3e2df', border: '#e3e2df',
    blockquote: '#9b9a97', blockquoteBg: '#f9f9f8',
    fontFamily: `ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`,
  },
}
type ThemeKey = keyof typeof THEMES

const SAMPLE_MD = `# Welcome to Markdown PDF

This tool converts your **Markdown** to a beautifully styled PDF — no accounts, no uploads, fully in-browser.

## Features

- 📄 Paste or upload any \`.md\` file
- 🎨 5 themes: GitHub, Dark, Minimal, Academic, Notion
- 🖨 One-click PDF download with smart page breaks
- 🔍 Live side-by-side preview with resizable split
- 💡 Syntax highlighted code blocks

## Code Example

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`
}

console.log(greet('Developer'))
\`\`\`

## Table Example

| Feature         | Status |
|-----------------|--------|
| Markdown parsing | ✅ |
| Syntax highlighting | ✅ |
| PDF export      | ✅ |
| Multiple themes | ✅ |
| Resizable panes | ✅ |

## Blockquote

> "Any sufficiently advanced technology is indistinguishable from magic."
> — Arthur C. Clarke

---

*Happy documenting!* 🚀
`

function buildCSS(themeKey: ThemeKey, fontSize: string): string {
  const t = THEMES[themeKey]
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: ${t.bg};
      color: ${t.text};
      font-family: ${t.fontFamily};
      font-size: ${fontSize};
      line-height: 1.7;
      padding: 48px 56px;
      max-width: 860px;
      margin: 0 auto;
    }
    h1,h2,h3,h4,h5,h6 { color: ${t.heading}; font-weight: 600; line-height: 1.3; margin: 1.5em 0 0.5em; }
    h1 { font-size: 2em; border-bottom: 2px solid ${t.border}; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid ${t.border}; padding-bottom: 0.25em; }
    h3 { font-size: 1.25em; }
    h4 { font-size: 1em; }
    p { margin: 0.85em 0; }
    a { color: ${t.link}; text-decoration: none; }
    a:hover { text-decoration: underline; }
    strong { font-weight: 600; }
    em { font-style: italic; }
    ul, ol { padding-left: 2em; margin: 0.85em 0; }
    li { margin: 0.3em 0; }
    li > ul, li > ol { margin: 0.2em 0; }
    code {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 0.875em;
      background: ${t.code};
      border: 1px solid ${t.codeBorder};
      padding: 0.2em 0.4em;
      border-radius: 4px;
    }
    pre {
      background: ${t.code};
      border: 1px solid ${t.codeBorder};
      border-radius: 6px;
      padding: 16px;
      overflow-x: auto;
      margin: 1em 0;
    }
    pre code { background: none; border: none; padding: 0; font-size: 0.875em; line-height: 1.6; }
    blockquote {
      border-left: 4px solid ${t.link};
      background: ${t.blockquoteBg};
      color: ${t.blockquote};
      margin: 1em 0;
      padding: 0.75em 1.25em;
      border-radius: 0 4px 4px 0;
    }
    blockquote p { margin: 0.3em 0; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 0.95em; }
    th, td { border: 1px solid ${t.border}; padding: 10px 14px; text-align: left; }
    th { background: ${t.code}; font-weight: 600; color: ${t.heading}; }
    tr:nth-child(even) td { background: ${t.blockquoteBg}; }
    img { max-width: 100%; border-radius: 4px; }
    hr { border: none; border-top: 2px solid ${t.border}; margin: 1.5em 0; }
    @media print {
      body { padding: 0; }
      pre { page-break-inside: avoid; }
      h1,h2,h3 { page-break-after: avoid; }
      table { page-break-inside: avoid; }
    }
  `
}

export default function MarkdownPDFPage() {
  const [markdown, setMarkdown] = useState(SAMPLE_MD)
  const [theme, setTheme] = useState<ThemeKey>('github')
  const [fontSize, setFontSize] = useState('16px')
  const [renderedHTML, setRenderedHTML] = useState('')
  const [markedReady, setMarkedReady] = useState(false)
  const [html2pdfReady, setHtml2pdfReady] = useState(false)
  const [hljsReady, setHljsReady] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [view, setView] = useState<'split' | 'preview' | 'editor'>('split')
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'a3'>('a4')
  const [margins, setMargins] = useState('1in')
  const [fileName, setFileName] = useState('document')
  const [showSettings, setShowSettings] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  // Resizable split — stored as left pane % (10–90)
  const [splitPct, setSplitPct] = useState(50)
  const dragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const previewRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)

  /* ── Drag-to-resize ───────────────────────────────────────── */
  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((e.clientX - rect.left) / rect.width) * 100
      setSplitPct(Math.min(90, Math.max(10, pct)))
    }
    function onMouseUp() {
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  /* ── Close settings on outside click ─────────────────────── */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  /* ── Fullscreen (F key) ───────────────────────────────────── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'F11' || (e.key === 'f' && e.ctrlKey && e.shiftKey)) {
        e.preventDefault()
        setFullscreen(f => !f)
      }
      if (e.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* ── Render markdown ──────────────────────────────────────── */
  const render = useCallback(() => {
    if (!markedReady || !window.marked) return
    try {
      window.marked.setOptions({ breaks: true, gfm: true })
      setRenderedHTML(window.marked.parse(markdown))
    } catch { /* ignore */ }
  }, [markdown, markedReady])

  useEffect(() => { render() }, [render])

  /* ── Syntax highlight ─────────────────────────────────────── */
  useEffect(() => {
    if (!hljsReady || !previewRef.current) return
    previewRef.current.querySelectorAll('pre code').forEach(el => {
      window.hljs.highlightElement(el as HTMLElement)
    })
  }, [renderedHTML, hljsReady])

  /* ── File handling ────────────────────────────────────────── */
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name.replace(/\.[^.]+$/, ''))
    const reader = new FileReader()
    reader.onload = ev => setMarkdown(ev.target?.result as string || '')
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    setFileName(file.name.replace(/\.[^.]+$/, ''))
    const reader = new FileReader()
    reader.onload = ev => setMarkdown(ev.target?.result as string || '')
    reader.readAsText(file)
  }

  /* ── PDF download ─────────────────────────────────────────── */
  async function downloadPDF() {
    if (!html2pdfReady) return
    setExporting(true)
    try {
      const wrapper = document.createElement('div')
      wrapper.style.cssText = `background:${THEMES[theme].bg};position:fixed;left:-9999px;top:0;`
      const style = document.createElement('style')
      style.textContent = buildCSS(theme, fontSize)
      wrapper.appendChild(style)
      const content = document.createElement('div')
      content.innerHTML = renderedHTML
      wrapper.appendChild(content)
      document.body.appendChild(wrapper)
      await new Promise<void>(resolve => {
        window.html2pdf(wrapper, {
          margin: margins,
          filename: `${fileName || 'document'}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: THEMES[theme].bg },
          jsPDF: { unit: 'in', format: pageSize, orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'] },
        }).save()
        setTimeout(resolve, 2500)
      })
      document.body.removeChild(wrapper)
    } catch (err) { console.error(err) }
    setExporting(false)
  }

  /* ── Print ────────────────────────────────────────────────── */
  function printPreview() {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fileName}</title><style>${buildCSS(theme, fontSize)}</style></head><body>${renderedHTML}</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 400)
  }

  /* ── Copy HTML ────────────────────────────────────────────── */
  function copyHTML() {
    const html = `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n<style>\n${buildCSS(theme, fontSize)}\n</style>\n</head>\n<body>\n${renderedHTML}\n</body>\n</html>`
    navigator.clipboard.writeText(html).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const wordCount = markdown.trim() ? markdown.trim().split(/\s+/).length : 0
  const lineCount = markdown.split('\n').length
  const ready = markedReady && html2pdfReady

  return (
    <>
      <Script src="https://cdn.jsdelivr.net/npm/marked@9.1.6/marked.min.js" strategy="afterInteractive" onLoad={() => setMarkedReady(true)} />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js" strategy="afterInteractive" onLoad={() => setHljsReady(true)} />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js" strategy="afterInteractive" onLoad={() => setHtml2pdfReady(true)} />
      <link rel="stylesheet" href={theme === 'dark'
        ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css'
        : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css'} />

      {/*
        Root shell: uses 100dvh so mobile chrome bar is excluded.
        overflow:hidden is critical — it prevents ANY outer scroll,
        making the toolbar always visible and each pane scroll independently.
      */}
      <div
        className="bg-slate-950 text-white flex flex-col"
        style={{ height: '100dvh', overflow: 'hidden' }}
      >

        {/* ── Toolbar (always visible, never scrolls) ──────── */}
        <div className="shrink-0 border-b border-slate-800 bg-slate-900 px-3 h-12 flex items-center gap-2 z-40">

          {/* Back */}
          {!fullscreen && (
            <Link href="/" className="shrink-0 flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-xs font-medium pr-2 border-r border-slate-700">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Home
            </Link>
          )}

          {/* Title */}
          <span className="shrink-0 text-xs font-semibold text-slate-200 hidden sm:block">📄 MD → PDF</span>
          <div className="shrink-0 w-px h-4 bg-slate-700 hidden sm:block" />

          {/* Upload */}
          <button onClick={() => fileRef.current?.click()}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload .md
          </button>
          <input ref={fileRef} type="file" accept=".md,.txt,.markdown" className="hidden" onChange={handleFile} />

          {/* Theme */}
          <select value={theme} onChange={e => setTheme(e.target.value as ThemeKey)}
            className="shrink-0 text-xs bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500">
            {Object.entries(THEMES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
          </select>

          {/* View toggle */}
          <div className="shrink-0 flex rounded-md border border-slate-700 overflow-hidden">
            {(['split', 'editor', 'preview'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                title={v === 'split' ? 'Split view (drag divider to resize)' : `${v} only`}
                className={`px-2.5 py-1 text-xs font-medium capitalize transition-colors ${view === v ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
                {v === 'split' ? (
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="3" width="8" height="18" rx="1" strokeLinecap="round" strokeLinejoin="round" />
                      <rect x="13" y="3" width="8" height="18" rx="1" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Split
                  </span>
                ) : v}
              </button>
            ))}
          </div>

          {/* Settings popover */}
          <div className="shrink-0 relative" ref={settingsRef}>
            <button onClick={() => setShowSettings(s => !s)}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${showSettings ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </button>

            {showSettings && (
              <div className="absolute left-0 top-full mt-1.5 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 w-68 flex flex-col gap-3" style={{ width: 260 }}>
                <div className="text-xs font-semibold text-slate-300 mb-0.5">PDF Export Settings</div>

                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500">Filename</span>
                  <input type="text" value={fileName} onChange={e => setFileName(e.target.value)} placeholder="document"
                    className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500">Font size</span>
                  <select value={fontSize} onChange={e => setFontSize(e.target.value)}
                    className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    {['13px', '14px', '15px', '16px', '17px', '18px', '20px'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500">Page size</span>
                  <select value={pageSize} onChange={e => setPageSize(e.target.value as 'a4' | 'letter' | 'a3')}
                    className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    <option value="a4">A4</option>
                    <option value="letter">Letter (US)</option>
                    <option value="a3">A3</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500">Margins</span>
                  <select value={margins} onChange={e => setMargins(e.target.value)}
                    className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    <option value="0.5in">Narrow (0.5 in)</option>
                    <option value="1in">Normal (1 in)</option>
                    <option value="1.25in">Wide (1.25 in)</option>
                  </select>
                </label>
              </div>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Stats */}
          <span className="hidden lg:flex items-center gap-2 text-xs text-slate-600 shrink-0">
            <span>{wordCount.toLocaleString()} words · {lineCount.toLocaleString()} lines</span>
          </span>

          <div className="shrink-0 w-px h-4 bg-slate-700 hidden lg:block" />

          {/* Ready dot */}
          <span className={`shrink-0 flex items-center gap-1 text-xs ${ready ? 'text-emerald-500' : 'text-yellow-500 animate-pulse'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${ready ? 'bg-emerald-500' : 'bg-yellow-400 animate-pulse'}`} />
            {ready ? 'Ready' : 'Loading…'}
          </span>

          <div className="shrink-0 w-px h-4 bg-slate-700" />

          {/* Copy HTML */}
          <button onClick={copyHTML}
            className="shrink-0 hidden sm:flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors">
            {copied ? '✓ Copied' : 'Copy HTML'}
          </button>

          {/* Print */}
          <button onClick={printPreview}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span className="hidden sm:block">Print</span>
          </button>

          {/* Fullscreen toggle */}
          <button onClick={() => setFullscreen(f => !f)}
            title={fullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen (Ctrl+Shift+F)'}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors">
            {fullscreen ? (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M15 9h4.5M15 9V4.5M9 15v4.5M9 15H4.5M15 15h4.5M15 15v4.5" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
            <span className="hidden sm:block">{fullscreen ? 'Exit' : 'Fullscreen'}</span>
          </button>

          {/* Download PDF */}
          <button onClick={downloadPDF} disabled={exporting || !ready || !renderedHTML}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all">
            {exporting ? (
              <>
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating…
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </>
            )}
          </button>
        </div>

        {/* ── Editor + Preview area ────────────────────────────── */}
        {/*
          This div is the flex-1 container.
          overflow:hidden is set so children scroll independently.
          We capture drag-and-drop here.
        */}
        <div
          ref={containerRef}
          className="flex-1 flex overflow-hidden relative"
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
        >

          {/* ── Editor pane ─────────────────────────────────── */}
          {(view === 'split' || view === 'editor') && (
            <div
              className="flex flex-col overflow-hidden"
              style={{ width: view === 'split' ? `${splitPct}%` : '100%' }}
            >
              {/* Pane header */}
              <div className="shrink-0 flex items-center justify-between px-4 py-1.5 bg-slate-900/70 border-b border-slate-800">
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                  Markdown editor
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-700">{wordCount} words</span>
                  <button onClick={() => setMarkdown('')} className="text-xs text-slate-700 hover:text-slate-400 transition-colors">
                    Clear
                  </button>
                </div>
              </div>

              {/* Editor — overflow:auto so it scrolls independently */}
              <textarea
                value={markdown}
                onChange={e => setMarkdown(e.target.value)}
                spellCheck={false}
                placeholder="Paste or type Markdown here… or drop a .md file anywhere"
                className="flex-1 w-full bg-slate-950 text-slate-300 font-mono text-[13px] resize-none px-5 py-4 focus:outline-none leading-relaxed placeholder-slate-700 overflow-auto"
                style={{ tabSize: 2 }}
              />
            </div>
          )}

          {/* ── Drag divider ────────────────────────────────── */}
          {view === 'split' && (
            <div
              onMouseDown={onDividerMouseDown}
              className="shrink-0 w-1.5 bg-slate-800 hover:bg-indigo-500 cursor-col-resize transition-colors flex items-center justify-center group relative z-10"
              title="Drag to resize"
            >
              {/* Grip dots */}
              <div className="flex flex-col gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                {[0,1,2,3].map(i => (
                  <div key={i} className="w-0.5 h-0.5 rounded-full bg-white" />
                ))}
              </div>
            </div>
          )}

          {/* ── Preview pane ────────────────────────────────── */}
          {(view === 'split' || view === 'preview') && (
            <div
              className="flex flex-col overflow-hidden"
              style={{ width: view === 'split' ? `${100 - splitPct}%` : '100%' }}
            >
              {/* Pane header */}
              <div className="shrink-0 flex items-center justify-between px-4 py-1.5 bg-slate-900/70 border-b border-slate-800">
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Preview · <span className="text-slate-600">{THEMES[theme].name} theme</span>
                </span>
                {view === 'split' && (
                  <span className="text-xs text-slate-700">drag divider to resize</span>
                )}
              </div>

              {/* Preview — overflow:auto scrolls independently */}
              <div className="flex-1 overflow-auto bg-slate-800/30 p-4">
                <div style={{
                  background: THEMES[theme].bg,
                  borderRadius: '10px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  minHeight: '100%',
                }}>
                  <style dangerouslySetInnerHTML={{ __html: buildCSS(theme, fontSize) }} />
                  <div
                    ref={previewRef}
                    dangerouslySetInnerHTML={{ __html: renderedHTML }}
                    style={{ fontFamily: THEMES[theme].fontFamily, fontSize, color: THEMES[theme].text }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Status bar ────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-slate-800 bg-slate-900/60 px-4 py-1 flex items-center gap-2 text-[11px] text-slate-600 overflow-hidden">
          <span className="shrink-0">{wordCount} words · {markdown.length} chars · {lineCount} lines</span>
          <span>·</span>
          <span className="shrink-0">Theme: {THEMES[theme].name}</span>
          <span>·</span>
          <span className="shrink-0">Page: {pageSize.toUpperCase()} · Margins: {margins} · Font: {fontSize}</span>
          {view === 'split' && (
            <><span>·</span><span className="shrink-0">Split: {Math.round(splitPct)}% / {Math.round(100 - splitPct)}%</span></>
          )}
          {!markedReady && <span className="ml-auto shrink-0 text-yellow-500 animate-pulse">Loading markdown parser…</span>}
          {markedReady && !html2pdfReady && <span className="ml-auto shrink-0 text-yellow-500 animate-pulse">Loading PDF engine…</span>}
        </div>
      </div>
    </>
  )
}
