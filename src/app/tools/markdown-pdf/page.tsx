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
    hljs: {
      highlightAll: () => void
      highlightElement: (el: HTMLElement) => void
    }
    html2pdf: (element: HTMLElement, options: Record<string, unknown>) => { save: () => void; outputPdf?: () => Blob }
  }
}

/* ── Themes ─────────────────────────────────────────────────── */
const THEMES = {
  github: {
    name: 'GitHub',
    bg: '#ffffff',
    text: '#1f2328',
    heading: '#1f2328',
    link: '#0969da',
    code: '#f6f8fa',
    codeBorder: '#d0d7de',
    border: '#d0d7de',
    blockquote: '#636e7b',
    blockquoteBg: '#f6f8fa',
    fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`,
    fontSize: '16px',
  },
  dark: {
    name: 'Dark',
    bg: '#0d1117',
    text: '#e6edf3',
    heading: '#f0f6fc',
    link: '#58a6ff',
    code: '#161b22',
    codeBorder: '#30363d',
    border: '#30363d',
    blockquote: '#8b949e',
    blockquoteBg: '#161b22',
    fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`,
    fontSize: '16px',
  },
  minimal: {
    name: 'Minimal',
    bg: '#fafafa',
    text: '#333333',
    heading: '#111111',
    link: '#3b82f6',
    code: '#f0f0f0',
    codeBorder: '#e0e0e0',
    border: '#e0e0e0',
    blockquote: '#666666',
    blockquoteBg: '#f5f5f5',
    fontFamily: `'Georgia', 'Times New Roman', serif`,
    fontSize: '17px',
  },
  academic: {
    name: 'Academic',
    bg: '#fffef7',
    text: '#2c2c2c',
    heading: '#1a1a1a',
    link: '#8b0000',
    code: '#f4f4f0',
    codeBorder: '#cccccc',
    border: '#cccccc',
    blockquote: '#555555',
    blockquoteBg: '#f8f8f2',
    fontFamily: `'Palatino Linotype', 'Book Antiqua', Palatino, serif`,
    fontSize: '17px',
  },
  notion: {
    name: 'Notion',
    bg: '#ffffff',
    text: '#37352f',
    heading: '#37352f',
    link: '#0f7b6c',
    code: '#f1f1ef',
    codeBorder: '#e3e2df',
    border: '#e3e2df',
    blockquote: '#9b9a97',
    blockquoteBg: '#f9f9f8',
    fontFamily: `ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, 'Apple Color Emoji', Arial, sans-serif`,
    fontSize: '16px',
  },
}

type ThemeKey = keyof typeof THEMES

const SAMPLE_MD = `# Welcome to Markdown PDF

This tool converts your Markdown to a **beautifully styled PDF** — no accounts, no uploads, fully in-browser.

## Features

- 📄 Paste or upload any \`.md\` file
- 🎨 5 themes: GitHub, Dark, Minimal, Academic, Notion
- 🖨 One-click PDF download (with page breaks)
- 🔍 Live side-by-side preview
- 💡 Syntax highlighted code blocks

## Code Example

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`
}

console.log(greet('Developer'))
\`\`\`

## Table Example

| Feature | Status |
|---------|--------|
| Markdown parsing | ✅ |
| Syntax highlighting | ✅ |
| PDF export | ✅ |
| Multiple themes | ✅ |

## Blockquote

> "Any sufficiently advanced technology is indistinguishable from magic."
> — Arthur C. Clarke

## Math-friendly spacing

1. Write your markdown
2. Choose a theme
3. Download as PDF

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
    h1,h2,h3,h4,h5,h6 {
      color: ${t.heading};
      font-weight: 600;
      line-height: 1.3;
      margin: 1.5em 0 0.5em;
    }
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
    pre code {
      background: none;
      border: none;
      padding: 0;
      font-size: 0.875em;
      line-height: 1.6;
    }
    blockquote {
      border-left: 4px solid ${t.link};
      background: ${t.blockquoteBg};
      color: ${t.blockquote};
      margin: 1em 0;
      padding: 0.75em 1.25em;
      border-radius: 0 4px 4px 0;
    }
    blockquote p { margin: 0.3em 0; }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
      font-size: 0.95em;
    }
    th, td {
      border: 1px solid ${t.border};
      padding: 10px 14px;
      text-align: left;
    }
    th {
      background: ${t.code};
      font-weight: 600;
      color: ${t.heading};
    }
    tr:nth-child(even) td { background: ${t.blockquoteBg}; }
    img { max-width: 100%; border-radius: 4px; }
    hr {
      border: none;
      border-top: 2px solid ${t.border};
      margin: 1.5em 0;
    }
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
  const previewRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const render = useCallback(() => {
    if (!markedReady || !window.marked) return
    try {
      window.marked.setOptions({ breaks: true, gfm: true })
      const html = window.marked.parse(markdown)
      setRenderedHTML(html)
    } catch { /* ignore */ }
  }, [markdown, markedReady])

  useEffect(() => { render() }, [render])

  useEffect(() => {
    if (!hljsReady || !previewRef.current) return
    previewRef.current.querySelectorAll('pre code').forEach(el => {
      window.hljs.highlightElement(el as HTMLElement)
    })
  }, [renderedHTML, hljsReady])

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

  async function downloadPDF() {
    if (!html2pdfReady || !previewRef.current) return
    setExporting(true)
    try {
      const css = buildCSS(theme, fontSize)
      const wrapper = document.createElement('div')
      wrapper.style.cssText = `background:${THEMES[theme].bg};`
      const style = document.createElement('style')
      style.textContent = css
      wrapper.appendChild(style)
      const content = document.createElement('div')
      content.innerHTML = renderedHTML
      wrapper.appendChild(content)
      document.body.appendChild(wrapper)

      const options = {
        margin: margins,
        filename: `${fileName || 'document'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: THEMES[theme].bg },
        jsPDF: { unit: 'in', format: pageSize, orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      }

      await new Promise<void>((resolve) => {
        window.html2pdf(wrapper, { ...options, filename: `${fileName || 'document'}.pdf` }).save()
        setTimeout(() => resolve(), 2000)
      })
      document.body.removeChild(wrapper)
    } catch (err) {
      console.error(err)
    }
    setExporting(false)
  }

  function printPreview() {
    const css = buildCSS(theme, fontSize)
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fileName}</title><style>${css}</style></head><body>${renderedHTML}</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print() }, 400)
  }

  function copyHTML() {
    const fullHTML = `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n<style>\n${buildCSS(theme, fontSize)}\n</style>\n</head>\n<body>\n${renderedHTML}\n</body>\n</html>`
    navigator.clipboard.writeText(fullHTML).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function loadSample() {
    setMarkdown(SAMPLE_MD)
    setFileName('document')
  }

  const wordCount = markdown.trim() ? markdown.trim().split(/\s+/).length : 0
  const charCount = markdown.length

  return (
    <>
      {/* Scripts */}
      <Script
        src="https://cdn.jsdelivr.net/npm/marked@9.1.6/marked.min.js"
        strategy="afterInteractive"
        onLoad={() => setMarkedReady(true)}
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"
        strategy="afterInteractive"
        onLoad={() => setHljsReady(true)}
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"
        strategy="afterInteractive"
        onLoad={() => setHtml2pdfReady(true)}
      />

      {/* hljs theme — loaded via link for light/dark */}
      {typeof document !== 'undefined' && (
        <link
          rel="stylesheet"
          href={
            theme === 'dark'
              ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css'
              : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css'
          }
        />
      )}

      <div className="min-h-screen bg-slate-950 text-white flex flex-col">

        {/* Nav */}
        <nav className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md">
          <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Home
            </Link>
            <span className="text-slate-700">·</span>
            <span className="text-sm font-semibold text-white">📄 Markdown → PDF</span>
            <div className="ml-auto flex items-center gap-2">
              {/* Stats */}
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
                <span>{wordCount.toLocaleString()} words</span>
                <span>·</span>
                <span>{charCount.toLocaleString()} chars</span>
              </span>
            </div>
          </div>
        </nav>

        {/* Toolbar */}
        <div className="border-b border-slate-800/60 bg-slate-900/50">
          <div className="max-w-screen-xl mx-auto px-4 py-2.5 flex flex-wrap items-center gap-2">

            {/* File upload */}
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload .md
            </button>
            <input ref={fileRef} type="file" accept=".md,.txt,.markdown" className="hidden" onChange={handleFile} />

            <button
              onClick={loadSample}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            >
              Sample
            </button>

            <div className="w-px h-5 bg-slate-700" />

            {/* Theme */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 shrink-0">Theme:</span>
              <select
                value={theme}
                onChange={e => setTheme(e.target.value as ThemeKey)}
                className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {Object.entries(THEMES).map(([k, v]) => (
                  <option key={k} value={k}>{v.name}</option>
                ))}
              </select>
            </div>

            {/* Font size */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 shrink-0">Font:</span>
              <select
                value={fontSize}
                onChange={e => setFontSize(e.target.value)}
                className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {['13px','14px','15px','16px','17px','18px','20px'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Page */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 shrink-0">Page:</span>
              <select
                value={pageSize}
                onChange={e => setPageSize(e.target.value as 'a4' | 'letter' | 'a3')}
                className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="a4">A4</option>
                <option value="letter">Letter</option>
                <option value="a3">A3</option>
              </select>
            </div>

            {/* Margins */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 shrink-0">Margins:</span>
              <select
                value={margins}
                onChange={e => setMargins(e.target.value)}
                className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="0.5in">Narrow (0.5in)</option>
                <option value="1in">Normal (1in)</option>
                <option value="1.25in">Wide (1.25in)</option>
              </select>
            </div>

            <div className="w-px h-5 bg-slate-700" />

            {/* View toggle */}
            <div className="flex items-center rounded-lg border border-slate-700 overflow-hidden">
              {(['split','editor','preview'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-2.5 py-1.5 text-xs font-medium transition-colors capitalize ${
                    view === v ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2 flex-wrap">
              {/* Filename */}
              <input
                type="text"
                value={fileName}
                onChange={e => setFileName(e.target.value)}
                placeholder="filename"
                className="hidden sm:block w-28 text-xs bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />

              {/* Copy HTML */}
              <button
                onClick={copyHTML}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              >
                {copied ? '✓ Copied' : 'Copy HTML'}
              </button>

              {/* Print */}
              <button
                onClick={printPreview}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>

              {/* Download PDF */}
              <button
                onClick={downloadPDF}
                disabled={exporting || !html2pdfReady || !renderedHTML}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all shadow-lg shadow-indigo-500/20"
              >
                {exporting ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Generating…
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div
          className="flex-1 flex overflow-hidden"
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
        >
          {/* Editor pane */}
          {(view === 'split' || view === 'editor') && (
            <div className={`flex flex-col ${view === 'split' ? 'w-1/2 border-r border-slate-800' : 'flex-1'}`}>
              <div className="flex items-center justify-between px-4 py-2 bg-slate-900/40 border-b border-slate-800 shrink-0">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  Markdown
                </span>
                <button
                  onClick={() => setMarkdown('')}
                  className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
                >
                  Clear
                </button>
              </div>
              <textarea
                value={markdown}
                onChange={e => setMarkdown(e.target.value)}
                spellCheck={false}
                placeholder="Paste or type your Markdown here…"
                className="flex-1 w-full bg-slate-950 text-slate-300 font-mono text-sm resize-none p-4 focus:outline-none leading-relaxed placeholder-slate-700"
                style={{ tabSize: 2 }}
              />
            </div>
          )}

          {/* Preview pane */}
          {(view === 'split' || view === 'preview') && (
            <div className={`flex flex-col ${view === 'split' ? 'w-1/2' : 'flex-1'} overflow-hidden`}>
              <div className="flex items-center px-4 py-2 bg-slate-900/40 border-b border-slate-800 shrink-0">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Preview
                  <span className="ml-2 text-slate-600">({THEMES[theme].name} theme)</span>
                </span>
              </div>

              {/* Scrollable preview with theme background */}
              <div className="flex-1 overflow-auto p-4" style={{ background: '#1e293b' }}>
                <div
                  style={{
                    background: THEMES[theme].bg,
                    borderRadius: '8px',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                    minHeight: '100%',
                  }}
                >
                  <style dangerouslySetInnerHTML={{ __html: buildCSS(theme, fontSize) }} />
                  <div
                    ref={previewRef}
                    dangerouslySetInnerHTML={{ __html: renderedHTML }}
                    style={{
                      fontFamily: THEMES[theme].fontFamily,
                      fontSize,
                      color: THEMES[theme].text,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Drop overlay hint when empty */}
          {!markdown && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-slate-600">
                <div className="text-4xl mb-3">📄</div>
                <div className="text-sm">Drop a .md file or start typing</div>
              </div>
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="border-t border-slate-800/60 bg-slate-900/40 px-4 py-1.5 flex items-center gap-4 text-xs text-slate-600">
          <span>{wordCount} words · {charCount} characters</span>
          <span>·</span>
          <span>{markdown.split('\n').length} lines</span>
          <span>·</span>
          <span>Theme: {THEMES[theme].name}</span>
          <span>·</span>
          <span>Page: {pageSize.toUpperCase()}</span>
          {!markedReady && <span className="ml-auto text-yellow-600 animate-pulse">Loading parser…</span>}
          {!html2pdfReady && markedReady && <span className="ml-auto text-yellow-600 animate-pulse">Loading PDF engine…</span>}
          {html2pdfReady && markedReady && (
            <span className="ml-auto text-emerald-600">✓ Ready</span>
          )}
        </div>
      </div>
    </>
  )
}
