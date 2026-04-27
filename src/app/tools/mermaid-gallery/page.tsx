'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Script from 'next/script'
import Link from 'next/link'

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface DiagnosticIssue {
  severity: 'error' | 'warning'
  message: string
  fix: string
}

interface RenderedChart {
  index: number
  type: string
  code: string
  svgHTML: string
  error?: string
  diagnostics?: DiagnosticIssue[]
  fixedCode?: string
  fixApplied?: boolean
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

/* ─── Diagram type registry ──────────────────────────────────────────────── */
// Both current names and -beta aliases are kept for maximum file compatibility.
// Sorted longest-first so the alternation regex tries the most specific match first.
const DIAGRAM_TYPES: { keyword: string; label: string; example: string }[] = [
  // ── Flowcharts ────────────────────────────────────────────────────────
  {
    keyword: 'flowchart',
    label: 'Flowchart',
    example: `flowchart TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Do it]\n  B -->|No| D[Skip]`,
  },
  {
    keyword: 'graph',
    label: 'Graph (Flowchart alias)',
    example: `graph LR\n  A --> B --> C`,
  },
  // ── Sequence ──────────────────────────────────────────────────────────
  {
    keyword: 'sequenceDiagram',
    label: 'Sequence Diagram',
    example: `sequenceDiagram\n  Alice->>Bob: Hello\n  Bob-->>Alice: Hi there`,
  },
  // ── Class ─────────────────────────────────────────────────────────────
  {
    keyword: 'classDiagram',
    label: 'Class Diagram',
    example: `classDiagram\n  Animal <|-- Duck\n  Animal: +name\n  Animal: +speak()`,
  },
  // ── State ─────────────────────────────────────────────────────────────
  {
    keyword: 'stateDiagram-v2',
    label: 'State Diagram v2',
    example: `stateDiagram-v2\n  [*] --> Idle\n  Idle --> Running: start\n  Running --> [*]: stop`,
  },
  {
    keyword: 'stateDiagram',
    label: 'State Diagram',
    example: `stateDiagram\n  [*] --> Idle\n  Idle --> Running`,
  },
  // ── ER ────────────────────────────────────────────────────────────────
  {
    keyword: 'erDiagram',
    label: 'ER Diagram',
    example: `erDiagram\n  CUSTOMER ||--o{ ORDER : places\n  ORDER ||--|{ LINE-ITEM : contains`,
  },
  // ── Journey ───────────────────────────────────────────────────────────
  {
    keyword: 'journey',
    label: 'User Journey',
    example: `journey\n  title My day\n  section Morning\n    Wake up: 5: Me\n    Shower: 3: Me`,
  },
  // ── Gantt ─────────────────────────────────────────────────────────────
  {
    keyword: 'gantt',
    label: 'Gantt Chart',
    example: `gantt\n  title Project\n  dateFormat YYYY-MM-DD\n  section Phase 1\n    Task A: 2024-01-01, 7d`,
  },
  // ── Pie ───────────────────────────────────────────────────────────────
  {
    keyword: 'pie',
    label: 'Pie Chart',
    example: `pie title Pets\n  "Dogs" : 40\n  "Cats" : 35\n  "Birds" : 25`,
  },
  // ── Quadrant ──────────────────────────────────────────────────────────
  {
    keyword: 'quadrantChart',
    label: 'Quadrant Chart',
    example: `quadrantChart\n  x-axis Low --> High Effort\n  y-axis Low --> High Impact\n  Quick Win: [0.2, 0.8]\n  Big Bet: [0.8, 0.9]`,
  },
  // ── Requirement ───────────────────────────────────────────────────────
  {
    keyword: 'requirementDiagram',
    label: 'Requirement Diagram',
    example: `requirementDiagram\n  requirement req1 {\n    id: 1\n    text: System shall do X\n    risk: high\n    verifymethod: test\n  }`,
  },
  // ── Git ───────────────────────────────────────────────────────────────
  {
    keyword: 'gitGraph',
    label: 'Git Graph',
    example: `gitGraph\n  commit\n  branch feature\n  checkout feature\n  commit\n  checkout main\n  merge feature`,
  },
  // ── Mindmap ───────────────────────────────────────────────────────────
  {
    keyword: 'mindmap',
    label: 'Mind Map',
    example: `mindmap\n  root((Topic))\n    Branch A\n      Leaf 1\n    Branch B\n      Leaf 2`,
  },
  // ── Timeline ──────────────────────────────────────────────────────────
  {
    keyword: 'timeline',
    label: 'Timeline',
    example: `timeline\n  title History\n  section 2020\n    Event A : detail\n  section 2021\n    Event B : detail`,
  },
  // ── ZenUML ────────────────────────────────────────────────────────────
  {
    keyword: 'zenuml',
    label: 'ZenUML Sequence',
    example: `zenuml\n  Alice -> Bob: Hello\n  Bob --> Alice: World`,
  },
  // ── XY Chart (current name) ───────────────────────────────────────────
  {
    keyword: 'xychart-beta',
    label: 'XY Chart (beta alias)',
    example: `xychart-beta\n  title Sales\n  x-axis [Q1, Q2, Q3, Q4]\n  y-axis "Revenue" 0 --> 100\n  bar [20, 45, 70, 90]`,
  },
  {
    keyword: 'xychart',
    label: 'XY Chart',
    example: `xychart\n  title Sales\n  x-axis [Q1, Q2, Q3, Q4]\n  y-axis "Revenue" 0 --> 100\n  bar [20, 45, 70, 90]`,
  },
  // ── Block (current name) ──────────────────────────────────────────────
  {
    keyword: 'block-beta',
    label: 'Block Diagram (beta alias)',
    example: `block-beta\n  columns 3\n  A B C\n  D:2 E`,
  },
  {
    keyword: 'block',
    label: 'Block Diagram',
    example: `block\n  columns 3\n  A B C`,
  },
  // ── Sankey ────────────────────────────────────────────────────────────
  {
    keyword: 'sankey-beta',
    label: 'Sankey (beta alias)',
    example: `sankey-beta\n  A,B,10\n  A,C,20\n  B,D,10`,
  },
  {
    keyword: 'sankey',
    label: 'Sankey Diagram',
    example: `sankey\n  A,B,10\n  A,C,20`,
  },
  // ── Packet ────────────────────────────────────────────────────────────
  {
    keyword: 'packet-beta',
    label: 'Packet (beta alias)',
    example: `packet-beta\n  0-7: "Type"\n  8-15: "Code"\n  16-31: "Checksum"`,
  },
  {
    keyword: 'packet',
    label: 'Packet Diagram',
    example: `packet\n  0-7: "Type"\n  8-15: "Code"`,
  },
  // ── Architecture ──────────────────────────────────────────────────────
  {
    keyword: 'architecture-beta',
    label: 'Architecture (beta alias)',
    example: `architecture-beta\n  service api(internet)[API]\n  service db(database)[DB]\n  api --> db`,
  },
  {
    keyword: 'architecture',
    label: 'Architecture Diagram',
    example: `architecture\n  service api(internet)[API]\n  service db(database)[DB]\n  api --> db`,
  },
  // ── Kanban ────────────────────────────────────────────────────────────
  {
    keyword: 'kanban',
    label: 'Kanban Board',
    example: `kanban\n  Todo\n    id1[Task A]\n  In Progress\n    id2[Task B]\n  Done\n    id3[Task C]`,
  },
  // ── C4 ────────────────────────────────────────────────────────────────
  {
    keyword: 'C4Context',
    label: 'C4 Context',
    example: `C4Context\n  title System Context\n  Person(user, "User")\n  System(sys, "My System")\n  Rel(user, sys, "Uses")`,
  },
  {
    keyword: 'C4Container',
    label: 'C4 Container',
    example: `C4Container\n  title Container Diagram\n  Person(user, "User")\n  Container(app, "App", "React")`,
  },
  {
    keyword: 'C4Component',
    label: 'C4 Component',
    example: `C4Component\n  title Component Diagram\n  Container_Boundary(api, "API") {\n    Component(ctrl, "Controller")\n  }`,
  },
  {
    keyword: 'C4Dynamic',
    label: 'C4 Dynamic',
    example: `C4Dynamic\n  title Dynamic Diagram\n  Person(user, "User")\n  System(sys, "System")\n  Rel(user, sys, "1. Calls")`,
  },
  {
    keyword: 'C4Deployment',
    label: 'C4 Deployment',
    example: `C4Deployment\n  title Deployment\n  Deployment_Node(cloud, "Cloud") {\n    Container(app, "App")\n  }`,
  },
]

// Build sorted keyword list (longest first avoids prefix shadowing in regex)
const KEYWORDS = [...DIAGRAM_TYPES]
  .sort((a, b) => b.keyword.length - a.keyword.length)
  .map(d => d.keyword)

const KEYWORD_RE = new RegExp(
  `^(${KEYWORDS.map(k => k.replace(/[-]/g, '\\-')).join('|')})(?:[\\s:]|$)`,
  'im'
)

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function splitDiagrams(raw: string): string[] {
  // 1. Prefer markdown fenced blocks ```mermaid … ```
  const fenced: string[] = []
  const fenceRE = /```(?:mermaid)?\s*\n([\s\S]*?)```/gi
  let m: RegExpExecArray | null
  while ((m = fenceRE.exec(raw)) !== null) {
    const code = m[1].trim()
    if (KEYWORD_RE.test(code)) fenced.push(code)
  }
  if (fenced.length) return fenced

  // 2. Plain text: split on every line that starts a new diagram keyword
  const lines = raw.split('\n')
  const chunks: string[] = []
  let current: string[] = []
  for (const line of lines) {
    if (KEYWORD_RE.test(line.trim()) && current.length > 0) {
      const c = current.join('\n').trim()
      if (c) chunks.push(c)
      current = [line]
    } else {
      current.push(line)
    }
  }
  const last = current.join('\n').trim()
  if (last) chunks.push(last)
  return chunks.filter(c => KEYWORD_RE.test(c.trim()))
}

function detectType(code: string): string {
  return code.trim().split(/[\s:]/)[0]
}

/** Extract natural width & height from an SVG string.
 *  Prefers explicit width/height attrs, falls back to viewBox. */
function parseSVGDimensions(svgHTML: string): { w: number; h: number } {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgHTML, 'image/svg+xml')
  const svg = doc.querySelector('svg')
  if (!svg) return { w: 960, h: 640 }

  const attrW = parseFloat(svg.getAttribute('width') ?? '')
  const attrH = parseFloat(svg.getAttribute('height') ?? '')
  if (attrW > 0 && attrH > 0) return { w: attrW, h: attrH }

  // Mermaid v10 sets style="max-width: Xpx;" — try to parse that
  const styleW = svg.style?.maxWidth?.replace('px', '')
  if (styleW && parseFloat(styleW) > 0) {
    const vb = svg.getAttribute('viewBox')?.split(/[\s,]+/).map(Number)
    const ratio = vb && vb.length >= 4 && vb[3] > 0 ? vb[3] / vb[2] : 0.6
    const w = parseFloat(styleW)
    return { w, h: Math.round(w * ratio) }
  }

  // Fall back to viewBox
  const vb = svg.getAttribute('viewBox')?.split(/[\s,]+/).map(Number)
  if (vb && vb.length >= 4 && vb[2] > 0 && vb[3] > 0) return { w: vb[2], h: vb[3] }

  return { w: 960, h: 640 }
}

function svgToPNG(svgHTML: string, scale = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const { w, h } = parseSVGDimensions(svgHTML)
    const pw = Math.round(w * scale)
    const ph = Math.round(h * scale)

    const blob = new Blob([svgHTML], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = pw; canvas.height = ph
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, pw, ph)
      ctx.drawImage(img, 0, 0, pw, ph)
      URL.revokeObjectURL(url)
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png')
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG image load failed')) }
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
  a.download = filename
  a.click()
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

/* ─── Smart diagnostics ──────────────────────────────────────────────────── */
interface DiagnosticResult {
  issues: DiagnosticIssue[]
  fixedCode: string
}

const DIAGNOSTIC_RULES: {
  test: (code: string, type: string) => DiagnosticIssue | null
  fix: (code: string) => string
}[] = [
  // Markdown links [text](url) — break timeline, gantt, sequence, etc.
  {
    test: (code) =>
      /\[.+?\]\(https?:\/\/.+?\)/.test(code)
        ? {
            severity: 'error',
            message: 'Markdown links `[text](url)` are not valid Mermaid syntax.',
            fix: 'Replace `[file.py](http://...)` with plain text, e.g. just `file.py`',
          }
        : null,
    fix: (code) => code.replace(/\[(.+?)\]\(https?:\/\/.+?\)/g, '$1'),
  },
  // \n inside quoted strings (xychart axis labels)
  {
    test: (code, type) =>
      (type === 'xychart-beta' || type === 'xychart') && /"[^"]*\\n[^"]*"/.test(code)
        ? {
            severity: 'error',
            message: '`\\n` newlines inside axis label strings are not supported in XY charts.',
            fix: 'Remove `\\n` from axis labels, e.g. `"Random\\ninit"` → `"Random init"`',
          }
        : null,
    fix: (code) => code.replace(/"([^"]*)\\n([^"]*)"/g, (_, a, b) => `"${a} ${b}"`),
  },
  // Em dash — can crash certain parsers
  {
    test: (code, type) =>
      ['timeline', 'gantt', 'sequenceDiagram'].includes(type) && /—/.test(code)
        ? {
            severity: 'warning',
            message: 'Em dash `—` can cause parse errors in some diagram types.',
            fix: 'Replace `—` with a regular dash `-` or `--`',
          }
        : null,
    fix: (code) => code.replace(/—/g, '-'),
  },
  // Timeline: multi-space indented continuation lines with bad alignment
  {
    test: (code, type) =>
      type === 'timeline' && /^ {8,}: /.test(code)
        ? {
            severity: 'warning',
            message: 'Timeline continuation lines (`: text`) need consistent 4-space or 8-space indentation.',
            fix: 'Normalise continuation lines to exactly 8 spaces before `:`',
          }
        : null,
    fix: (code) =>
      code
        .split('\n')
        .map(line => (/^ +: /.test(line) ? '        ' + line.trimStart() : line))
        .join('\n'),
  },
  // HTML-style links or anchor tags
  {
    test: (code) =>
      /<a\s+href/.test(code)
        ? {
            severity: 'error',
            message: 'HTML anchor tags `<a href>` are not supported in diagram text.',
            fix: 'Use plain text or Mermaid `click` interactions instead',
          }
        : null,
    fix: (code) => code.replace(/<a\s[^>]*>(.+?)<\/a>/g, '$1'),
  },
  // Unquoted special chars in node labels (flowchart/graph)
  {
    test: (code, type) =>
      ['flowchart', 'graph'].includes(type) && /\[[^\]]*[<>{}#][^\]]*\]/.test(code)
        ? {
            severity: 'warning',
            message: 'Node labels containing `<`, `>`, `{`, `}`, or `#` should be wrapped in quotes.',
            fix: 'Change `[Label with <special>]` to `["Label with <special>"]`',
          }
        : null,
    fix: (code) => code, // too complex to auto-fix safely
  },
  // Very long single-line labels (>120 chars)
  {
    test: (code) => {
      const longLine = code.split('\n').find(l => l.trim().length > 140)
      return longLine
        ? {
            severity: 'warning',
            message: `Very long line detected (${longLine.trim().length} chars). May overflow the diagram.`,
            fix: 'Break long labels with `\\n` inside quoted strings, e.g. `["Line 1\\nLine 2"]`',
          }
        : null
    },
    fix: (code) => code,
  },
]

function diagnose(code: string, type: string): DiagnosticResult {
  const issues: DiagnosticIssue[] = []
  let fixedCode = code

  for (const rule of DIAGNOSTIC_RULES) {
    const issue = rule.test(code, type)
    if (issue) {
      issues.push(issue)
      fixedCode = rule.fix(fixedCode)
    }
  }

  return { issues, fixedCode }
}

/* ─── Syntax reference data (embedded locally) ───────────────────────────── */
const SYNTAX_GROUPS = [
  {
    group: 'Flowcharts & Graphs',
    color: 'indigo',
    items: [
      { label: 'Flowchart', keyword: 'flowchart TD / LR / BT / RL', note: 'Directional node graphs. `graph` is an alias.' },
      { label: 'Graph', keyword: 'graph TD', note: 'Alias for flowchart. Same syntax.' },
    ],
  },
  {
    group: 'UML Diagrams',
    color: 'violet',
    items: [
      { label: 'Sequence', keyword: 'sequenceDiagram', note: 'Actors, messages, loops, notes, alt/opt/par blocks.' },
      { label: 'Class', keyword: 'classDiagram', note: 'Classes, inheritance, associations, methods & fields.' },
      { label: 'State v2', keyword: 'stateDiagram-v2', note: 'States, transitions, forks, notes. Prefer v2.' },
      { label: 'ER Diagram', keyword: 'erDiagram', note: 'Entities, relationships, cardinality labels.' },
      { label: 'Use Case / Journey', keyword: 'journey', note: 'User journey with sections and experience scores.' },
    ],
  },
  {
    group: 'Planning & Process',
    color: 'emerald',
    items: [
      { label: 'Gantt', keyword: 'gantt', note: 'dateFormat, sections, task durations, dependencies.' },
      { label: 'Kanban', keyword: 'kanban', note: 'Columns and task cards. No directions needed.' },
      { label: 'Timeline', keyword: 'timeline', note: 'Chronological events grouped by section.' },
      { label: 'Requirement', keyword: 'requirementDiagram', note: 'Requirements, elements, satisfy/trace relationships.' },
    ],
  },
  {
    group: 'Data & Charts',
    color: 'amber',
    items: [
      { label: 'Pie Chart', keyword: 'pie', note: '`pie title X` then key-value pairs.' },
      { label: 'XY Chart', keyword: 'xychart', note: 'Bar/line charts with axis labels. `xychart-beta` also works.' },
      { label: 'Quadrant', keyword: 'quadrantChart', note: 'Four-quadrant scatter with named axes.' },
      { label: 'Sankey', keyword: 'sankey', note: 'Flow values: `Source,Target,Value` per line.' },
    ],
  },
  {
    group: 'Infrastructure & Architecture',
    color: 'cyan',
    items: [
      { label: 'Git Graph', keyword: 'gitGraph', note: 'commit, branch, checkout, merge, cherry-pick.' },
      { label: 'Architecture', keyword: 'architecture', note: 'Services, groups, edges. `architecture-beta` also works.' },
      { label: 'C4 Context', keyword: 'C4Context', note: 'Persons, systems, relationships. C4 model level 1.' },
      { label: 'C4 Container', keyword: 'C4Container', note: 'Containers inside systems. C4 level 2.' },
      { label: 'C4 Component', keyword: 'C4Component', note: 'Components inside containers. C4 level 3.' },
      { label: 'C4 Dynamic', keyword: 'C4Dynamic', note: 'Runtime/sequence view of C4 components.' },
      { label: 'C4 Deployment', keyword: 'C4Deployment', note: 'Deployment nodes and containers. C4 level 4.' },
      { label: 'Packet', keyword: 'packet', note: 'Network packet byte-field layouts.' },
    ],
  },
  {
    group: 'Other',
    color: 'rose',
    items: [
      { label: 'Mind Map', keyword: 'mindmap', note: 'Hierarchical tree via indentation.' },
      { label: 'Block', keyword: 'block', note: 'Grid-based layout blocks. `block-beta` also works.' },
      { label: 'ZenUML', keyword: 'zenuml', note: 'Alternative sequence syntax (DSL style).' },
    ],
  },
]

const COLOR_MAP: Record<string, string> = {
  indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
}

/* ─── Diagnostics Panel component ───────────────────────────────────────── */
function DiagnosticsPanel({ charts }: { charts: RenderedChart[] }) {
  const [open, setOpen] = useState(true)
  const ok      = charts.filter(c => !c.error)
  const failed  = charts.filter(c => !!c.error)
  const warned  = ok.filter(c => c.diagnostics?.length)
  const autoFixed = charts.filter(c => c.fixApplied)

  const allClean = failed.length === 0 && warned.length === 0 && autoFixed.length === 0
  if (allClean) return null // nothing to report

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Diagnostics</span>
          <div className="flex items-center gap-1.5">
            {ok.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {ok.length} rendered
              </span>
            )}
            {autoFixed.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {autoFixed.length} auto-fixed
              </span>
            )}
            {warned.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {warned.length} warnings
              </span>
            )}
            {failed.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                {failed.length} failed
              </span>
            )}
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
        >
          <path d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {open && (
        <div className="border-t border-slate-800 divide-y divide-slate-800/60">
          {charts.map(chart => {
            const hasIssues = (chart.diagnostics?.length ?? 0) > 0
            const isFailed  = !!chart.error
            const isFixed   = !!chart.fixApplied

            const rowColor = isFailed && !isFixed
              ? 'bg-red-950/10'
              : isFixed
              ? 'bg-blue-950/10'
              : hasIssues
              ? 'bg-amber-950/10'
              : ''

            const statusIcon = isFailed && !isFixed
              ? <span className="text-red-400">✗</span>
              : isFixed
              ? <span className="text-blue-400">⚡ auto-fixed</span>
              : hasIssues
              ? <span className="text-amber-400">⚠</span>
              : <span className="text-emerald-400">✓</span>

            return (
              <div key={chart.index} className={`px-5 py-3 ${rowColor}`}>
                {/* Row header */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-slate-500">#{chart.index}</span>
                  <span className="text-xs font-bold text-pink-400 bg-pink-500/10 px-1.5 py-0.5 rounded">
                    {chart.type}
                  </span>
                  <span className="text-xs font-medium">{statusIcon}</span>
                  {isFailed && !isFixed && chart.fixedCode && chart.fixedCode !== chart.code && (
                    <span className="text-xs text-slate-500 italic">auto-fix available but render still failed</span>
                  )}
                </div>

                {/* Error message */}
                {isFailed && !isFixed && chart.error && (
                  <div className="mb-2 text-xs font-mono text-red-400 bg-red-950/30 border border-red-800/30 rounded px-3 py-2 leading-relaxed break-all">
                    {chart.error.split('\n').slice(0, 3).join('\n')}
                  </div>
                )}

                {/* Diagnostic issues */}
                {hasIssues && (
                  <div className="space-y-1.5">
                    {chart.diagnostics!.map((issue, ii) => (
                      <div key={ii} className={`rounded-lg px-3 py-2 text-xs leading-relaxed border ${
                        issue.severity === 'error'
                          ? 'bg-red-950/20 border-red-800/30 text-red-300'
                          : 'bg-amber-950/20 border-amber-800/30 text-amber-300'
                      }`}>
                        <div className="flex items-start gap-2">
                          <span className="flex-shrink-0 mt-0.5">
                            {issue.severity === 'error' ? '🔴' : '🟡'}
                          </span>
                          <div className="space-y-1 min-w-0">
                            <p className="font-medium">{issue.message}</p>
                            <p className="text-slate-400">
                              <span className="font-semibold text-white">Fix: </span>
                              {issue.fix}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Auto-fix banner */}
                {isFixed && (
                  <div className="mt-1.5 text-xs text-blue-300 bg-blue-950/20 border border-blue-800/30 rounded px-3 py-2">
                    ⚡ Issues were automatically fixed and the diagram rendered successfully. The fixed code is shown above.
                  </div>
                )}

                {/* Clean row — no issues */}
                {!isFailed && !hasIssues && !isFixed && (
                  <p className="text-xs text-slate-600">No issues detected.</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function MermaidGalleryPage() {
  const [mermaidReady, setMermaidReady] = useState(false)
  const [pptxReady, setPptxReady] = useState(false)
  const [rawInput, setRawInput] = useState('')
  const [charts, setCharts] = useState<RenderedChart[]>([])
  const [status, setStatus] = useState<{ msg: string; type: 'idle' | 'loading' | 'ok' | 'error' }>({
    msg: 'Drop a file or paste Mermaid code above.',
    type: 'idle',
  })
  const [geminiKey, setGeminiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [pptProgress, setPptProgress] = useState<{ open: boolean; step: string; pct: number }>({
    open: false, step: '', pct: 0,
  })
  const [showRef, setShowRef] = useState(false)
  const [refSearch, setRefSearch] = useState('')
  const [copyIdx, setCopyIdx] = useState<number | null>(null)

  // Lightbox
  const [lbOpen, setLbOpen] = useState(false)
  const [lbIdx, setLbIdx] = useState(0)
  const [lbZoom, setLbZoom] = useState(1)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<HTMLDivElement>(null)

  // Init mermaid exactly once when its script is ready
  useEffect(() => {
    if (!mermaidReady) return
    if (typeof window.mermaid !== 'undefined') {
      window.mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        deterministicIds: false,
        suppressErrorRendering: false,
      })
    }
  }, [mermaidReady])

  /* ── File handling ────────────────────────────────────────────────────── */
  const handleFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const text = (e.target?.result as string) ?? ''
      setRawInput(text)
      setStatus({ msg: `Loaded "${file.name}" — rendering…`, type: 'loading' })
      doRender(text)
    }
    reader.readAsText(file)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragRef.current?.classList.remove('border-pink-500/50')
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  /* ── Core render ──────────────────────────────────────────────────────── */
  // Declared as plain async function so it can be called both from button and from loadFile
  async function doRender(text: string) {
    if (!text.trim()) { setStatus({ msg: 'Nothing to render.', type: 'error' }); return }
    if (typeof window.mermaid === 'undefined') {
      setStatus({ msg: 'Mermaid.js still loading — try again in a moment.', type: 'error' })
      return
    }

    const diagrams = splitDiagrams(text)
    if (!diagrams.length) {
      setStatus({ msg: 'No recognisable Mermaid diagrams found. Check the Syntax Reference below.', type: 'error' })
      return
    }

    setStatus({ msg: `Rendering ${diagrams.length} diagram(s)…`, type: 'loading' })
    setCharts([])
    const results: RenderedChart[] = []

    for (let i = 0; i < diagrams.length; i++) {
      const code = diagrams[i]
      const id = `mmd-${Date.now()}-${i}`
      const type = detectType(code)

      // Run diagnostics on raw code (before any fix attempt)
      const { issues, fixedCode } = diagnose(code, type)

      try {
        const { svg } = await window.mermaid.render(id, code)
        results.push({ index: i + 1, type, code, svgHTML: svg, diagnostics: issues, fixedCode })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)

        // Auto-fix: try rendering the cleaned version if we found fixable issues
        if (fixedCode !== code) {
          try {
            const { svg } = await window.mermaid.render(`${id}-fix`, fixedCode)
            results.push({
              index: i + 1, type, code: fixedCode, svgHTML: svg,
              diagnostics: issues, fixedCode, fixApplied: true,
            })
            continue
          } catch { /* fall through to error */ }
        }

        results.push({ index: i + 1, type, code, svgHTML: '', error: msg, diagnostics: issues, fixedCode })
      }
    }

    setCharts(results)
    const ok = results.filter(r => !r.error).length
    const fail = results.length - ok
    setStatus({
      msg: `${ok} chart${ok !== 1 ? 's' : ''} rendered${fail ? `, ${fail} failed` : ''}.`,
      type: fail && ok === 0 ? 'error' : fail ? 'idle' : 'ok',
    })
  }

  /* ── Lightbox keyboard ────────────────────────────────────────────────── */
  const goodCharts = charts.filter(c => !c.error)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!lbOpen) return
      if (e.key === 'Escape') { setLbOpen(false); return }
      if (e.key === 'ArrowLeft'  && lbIdx > 0)                    { setLbIdx(i => i - 1); setLbZoom(1) }
      if (e.key === 'ArrowRight' && lbIdx < goodCharts.length - 1) { setLbIdx(i => i + 1); setLbZoom(1) }
      if (e.key === '+' || e.key === '=') setLbZoom(z => Math.min(z + 0.25, 4))
      if (e.key === '-') setLbZoom(z => Math.max(z - 0.25, 0.25))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lbOpen, lbIdx, goodCharts.length])

  /* ── PPT export ───────────────────────────────────────────────────────── */
  const generatePPT = useCallback(async () => {
    if (!geminiKey.trim()) { alert('Enter your Gemini API key first.'); return }
    if (!goodCharts.length) { alert('Render some charts first.'); return }
    if (!pptxReady || typeof window.PptxGenJS === 'undefined') {
      alert('PptxGenJS still loading — try again in a moment.'); return
    }

    setPptProgress({ open: true, step: 'Starting…', pct: 0 })
    const prs = new window.PptxGenJS()
    prs.layout = 'LAYOUT_WIDE'

    // Title slide
    const ts = prs.addSlide()
    ts.background = { color: '0F1117' }
    ts.addText('Mermaid Chart Gallery', { x: 0.5, y: 2.8, w: 12.33, h: 1, fontSize: 36, bold: true, color: '7C85F5', align: 'center' } as object)
    ts.addText(`${goodCharts.length} diagram${goodCharts.length !== 1 ? 's' : ''} · ${new Date().toLocaleDateString()}`, { x: 0.5, y: 4, w: 12.33, h: 0.5, fontSize: 14, color: '64748B', align: 'center' } as object)

    for (let i = 0; i < goodCharts.length; i++) {
      const chart = goodCharts[i]
      setPptProgress({ open: true, step: `Chart ${i + 1}/${goodCharts.length}: asking Gemini…`, pct: Math.round(((i + 0.3) / goodCharts.length) * 100) })

      let title = `Chart ${i + 1}: ${chart.type}`
      let bullets: string[] = []
      try {
        const raw = await callGemini(
          geminiKey,
          `You are a technical presentation writer. Given this Mermaid diagram code, write a slide title (one concise line, no markdown) and 3-5 bullet point insights (each starting with a dash). Be specific to the diagram content.\n\nDiagram type: ${chart.type}\n\nCode:\n${chart.code}`
        )
        const parsed = parseSlideContent(raw)
        title = parsed.title || title
        bullets = parsed.bullets
      } catch {
        bullets = [`${chart.type} diagram`, 'See visual for details']
      }

      setPptProgress({ open: true, step: `Chart ${i + 1}/${goodCharts.length}: exporting image…`, pct: Math.round(((i + 0.7) / goodCharts.length) * 100) })

      let imgData: string | null = null
      try {
        const blob = await svgToPNG(chart.svgHTML, 2)
        imgData = await blobToDataURL(blob)
      } catch { /* skip image on failure */ }

      const slide = prs.addSlide()
      slide.background = { color: '0F1117' }
      slide.addText(`${i + 1}/${goodCharts.length}`, { x: 12.5, y: 0.18, w: 0.7, h: 0.3, fontSize: 8, color: '64748B', align: 'right' } as object)
      slide.addText(chart.type.toUpperCase(), { x: 0.4, y: 0.18, w: 2.5, h: 0.3, fontSize: 8, bold: true, color: '7C85F5' } as object)

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

      setPptProgress({ open: true, step: `Chart ${i + 1}/${goodCharts.length}: done.`, pct: Math.round(((i + 1) / goodCharts.length) * 100) })
    }

    setPptProgress({ open: true, step: 'Saving .pptx…', pct: 100 })
    await prs.writeFile({ fileName: `mermaid-charts-${Date.now()}.pptx` })
    setPptProgress({ open: false, step: '', pct: 0 })
    setStatus({ msg: `✓ PPT saved — ${goodCharts.length} slides generated by Gemini.`, type: 'ok' })
  }, [geminiKey, goodCharts, pptxReady])

  /* ── Download ─────────────────────────────────────────────────────────── */
  const downloadChart = async (chart: RenderedChart) => {
    try {
      const blob = await svgToPNG(chart.svgHTML, 2)
      triggerDownload(blob, `chart-${chart.index}-${chart.type}.png`)
    } catch (e) { alert('PNG export failed: ' + e) }
  }

  const downloadAll = async () => {
    for (const chart of goodCharts) {
      await downloadChart(chart)
      await new Promise(r => setTimeout(r, 130))
    }
  }

  /* ── Copy example ─────────────────────────────────────────────────────── */
  const copyExample = async (idx: number, code: string) => {
    await navigator.clipboard.writeText(code)
    setCopyIdx(idx)
    setTimeout(() => setCopyIdx(null), 1500)
  }

  /* ── Syntax ref filter ────────────────────────────────────────────────── */
  const filteredRef = SYNTAX_GROUPS.map(g => ({
    ...g,
    items: g.items.filter(
      it =>
        it.label.toLowerCase().includes(refSearch.toLowerCase()) ||
        it.keyword.toLowerCase().includes(refSearch.toLowerCase()) ||
        it.note.toLowerCase().includes(refSearch.toLowerCase())
    ),
  })).filter(g => g.items.length > 0)

  const lbChart = goodCharts[lbIdx]

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"
        strategy="afterInteractive"
        onLoad={() => setMermaidReady(true)}
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js"
        strategy="afterInteractive"
        onLoad={() => setPptxReady(true)}
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
              <button
                onClick={() => setShowRef(s => !s)}
                className={`flex items-center gap-1.5 text-sm transition-colors ${showRef ? 'text-pink-400' : 'hover:text-white'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                Syntax Ref
              </button>
              <Link href="/" className="hover:text-white transition-colors">← All tools</Link>
            </div>
          </div>
        </nav>

        <div className="max-w-6xl mx-auto px-5 py-10 space-y-6">

          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-2xl flex-shrink-0">📊</div>
            <div>
              <h1 className="text-2xl font-bold">Mermaid Chart Gallery</h1>
              <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                Drop any <code className="text-pink-400 bg-pink-500/10 px-1 py-0.5 rounded text-xs">.md</code>{' '}
                <code className="text-pink-400 bg-pink-500/10 px-1 py-0.5 rounded text-xs">.mmd</code>{' '}
                <code className="text-pink-400 bg-pink-500/10 px-1 py-0.5 rounded text-xs">.txt</code>{' '}
                file — all diagrams auto-extracted, gallery view with zoom, PNG download &amp; Gemini-powered PPT export.
                Supports <span className="text-white font-medium">{DIAGRAM_TYPES.length} diagram types</span> including all C4, XY, Sankey, Architecture &amp; more.
              </p>
            </div>
          </div>

          {/* Input grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Paste code or markdown</div>
              <textarea
                value={rawInput}
                onChange={e => setRawInput(e.target.value)}
                rows={10}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono text-xs p-3 resize-y outline-none focus:border-pink-500/60 placeholder:text-slate-700 leading-relaxed"
                placeholder={`Paste raw Mermaid or a full Markdown file…\n\n── Raw .mmd ──────────────────────\nflowchart TD\n  A --> B\n\n── Markdown .md ──────────────────\n\`\`\`mermaid\nsequenceDiagram\n  Alice->>Bob: Hello\n\`\`\``}
              />
            </div>

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
                <svg className="w-9 h-9 text-pink-500 opacity-40" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12M8 8l4-4 4 4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-sm text-slate-400">Drop file here or click to browse</span>
                <span className="text-xs text-slate-600">.md · .mmd · .txt · any plain-text</span>
                <span className="text-xs text-pink-400">Auto-renders on drop</span>
              </div>
              <input ref={fileInputRef} type="file" accept=".mmd,.txt,.md,.mermaid,text/*" className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
              />
            </div>
          </div>

          {/* Gemini strip */}
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
              <button onClick={() => setShowKey(s => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  {showKey
                    ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                    : <><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></>}
                </svg>
              </button>
            </div>
            <span className="text-xs text-slate-600">
              Free key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:underline">aistudio.google.com</a>
            </span>
          </div>

          {/* Action bar */}
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => doRender(rawInput)}
              disabled={!mermaidReady}
              className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {!mermaidReady
                ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                : <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              }
              {mermaidReady ? 'Render Charts' : 'Loading…'}
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
            <button
              onClick={() => setShowRef(s => !s)}
              className={`flex items-center gap-1.5 px-4 py-2 border text-sm font-medium rounded-lg transition-colors ml-auto ${showRef ? 'border-pink-500/40 text-pink-400 bg-pink-500/10' : 'border-slate-700 text-slate-400 bg-slate-800 hover:bg-slate-700'}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
              Syntax Reference
            </button>
          </div>

          {/* Status */}
          <div className={`flex items-center gap-2 text-sm min-h-[20px] ${
            status.type === 'ok' ? 'text-emerald-400' :
            status.type === 'error' ? 'text-red-400' :
            status.type === 'loading' ? 'text-slate-400' : 'text-slate-500'
          }`}>
            {status.type === 'loading' && (
              <svg className="w-3.5 h-3.5 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            )}
            {status.msg}
          </div>

          {/* ── Gallery ──────────────────────────────────────────────────── */}
          {goodCharts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Chart Gallery</h2>
                <span className="text-xs text-slate-600">{goodCharts.length} chart{goodCharts.length !== 1 ? 's' : ''} · click any to zoom</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {charts.map(chart => {
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
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800">
                        <span className="text-xs font-bold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded">{chart.type}</span>
                        <span className="text-xs text-slate-600 mr-auto">#{chart.index}</span>
                        {!chart.error && <span className="text-xs text-slate-700">zoom</span>}
                        {!chart.error && (
                          <button
                            onClick={e => { e.stopPropagation(); downloadChart(chart) }}
                            className="text-xs px-2 py-0.5 rounded border border-slate-700 text-slate-500 hover:border-pink-500/50 hover:text-pink-400 transition-colors"
                          >
                            ↓ PNG
                          </button>
                        )}
                      </div>
                      {chart.error ? (
                        <div className="p-3 text-xs text-red-400 font-mono bg-red-950/20 break-all leading-relaxed">{chart.error}</div>
                      ) : (
                        <div
                          className="bg-white p-3 flex justify-center items-start min-h-[140px] max-h-[280px] overflow-hidden"
                          dangerouslySetInnerHTML={{ __html: chart.svgHTML }}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Diagnostics panel ────────────────────────────────────────── */}
          {charts.length > 0 && (
            <DiagnosticsPanel charts={charts} />
          )}

          {/* ── Syntax Reference (local docs) ────────────────────────────── */}
          {showRef && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                <div>
                  <h2 className="font-bold text-white">Syntax Reference</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    All {DIAGRAM_TYPES.length} diagram types · click any example to copy it
                  </p>
                </div>
                <input
                  type="text"
                  value={refSearch}
                  onChange={e => setRefSearch(e.target.value)}
                  placeholder="Search…"
                  className="bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs px-3 py-2 outline-none focus:border-pink-500/60 placeholder:text-slate-600 w-48"
                />
              </div>

              <div className="p-5 space-y-8">
                {filteredRef.map(group => (
                  <div key={group.group}>
                    <h3 className={`text-xs font-bold uppercase tracking-widest mb-3 ${COLOR_MAP[group.color].split(' ')[0]}`}>
                      {group.group}
                    </h3>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {group.items.map((item, itemIdx) => {
                        const diagramEntry = DIAGRAM_TYPES.find(d => d.label === item.label)
                        const globalIdx = DIAGRAM_TYPES.indexOf(diagramEntry!)
                        return (
                          <div
                            key={item.label}
                            className={`rounded-lg border p-3 space-y-2 ${COLOR_MAP[group.color].split(' ').slice(1).join(' ')}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className={`text-xs font-bold ${COLOR_MAP[group.color].split(' ')[0]}`}>{item.label}</div>
                                <code className="text-xs text-slate-400 font-mono">{item.keyword}</code>
                              </div>
                              {diagramEntry && (
                                <button
                                  onClick={() => copyExample(globalIdx, diagramEntry.example)}
                                  className="flex-shrink-0 text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
                                  title="Copy example"
                                >
                                  {copyIdx === globalIdx ? '✓' : 'Copy'}
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">{item.note}</p>
                            {diagramEntry && (
                              <pre className="text-xs font-mono text-slate-600 bg-slate-950/60 rounded p-2 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                                {diagramEntry.example}
                              </pre>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {filteredRef.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-8">No results for &quot;{refSearch}&quot;</p>
                )}
              </div>

              {/* Quick cheat-sheet footer */}
              <div className="border-t border-slate-800 px-5 py-4 bg-slate-950/40">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-3">Quick Tips</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-slate-500">
                  <span>• Markdown: wrap in <code className="text-slate-400">```mermaid</code> fences</span>
                  <span>• Directions: <code className="text-slate-400">TD BT LR RL</code> (flowchart/graph)</span>
                  <span>• Comments: <code className="text-slate-400">%% this is a comment</code></span>
                  <span>• Node shapes: <code className="text-slate-400">[ ] ( ) &#123; &#125; (( ))</code></span>
                  <span>• Themes: default · dark · forest · neutral · base</span>
                  <span>• Max edges default: 500 — use <code className="text-slate-400">maxEdges</code> to increase</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Lightbox ──────────────────────────────────────────────────────── */}
        {lbOpen && lbChart && (
          <div
            className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center"
            onClick={e => { if (e.target === e.currentTarget) setLbOpen(false) }}
          >
            <button disabled={lbIdx === 0} onClick={() => { setLbIdx(i => i - 1); setLbZoom(1) }}
              className="fixed left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:border-pink-500/50 disabled:opacity-20 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button disabled={lbIdx === goodCharts.length - 1} onClick={() => { setLbIdx(i => i + 1); setLbZoom(1) }}
              className="fixed right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:border-pink-500/50 disabled:opacity-20 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
            </button>

            <div className="flex flex-col items-center gap-3 max-w-[90vw]">
              <div className="flex items-center gap-2 w-full">
                <span className="text-xs font-bold text-pink-400 bg-pink-500/10 border border-pink-500/20 px-2.5 py-1 rounded-md">{lbChart.type}</span>
                <span className="text-xs text-slate-500 mr-auto">{lbIdx + 1} / {goodCharts.length}</span>
                <button onClick={() => setLbZoom(z => Math.max(z - 0.25, 0.25))} className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:border-pink-500/50 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M8 11h6"/></svg>
                </button>
                <span className="text-xs text-slate-500 w-10 text-center">{Math.round(lbZoom * 100)}%</span>
                <button onClick={() => setLbZoom(z => Math.min(z + 0.25, 4))} className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:border-pink-500/50 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M11 8v6M8 11h6"/></svg>
                </button>
                <button onClick={() => setLbZoom(1)} className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:border-pink-500/50 transition-colors" title="Reset">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M3 12a9 9 0 101.5-5M3 3v4h4"/></svg>
                </button>
                <button onClick={() => downloadChart(lbChart)} className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:border-pink-500/50 transition-colors" title="Download PNG">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                </button>
                <button onClick={() => setLbOpen(false)} className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:border-red-500/50 hover:text-red-400 transition-colors" title="Close (Esc)">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>

              <div
                className="bg-white rounded-xl p-6 overflow-auto max-w-[88vw] max-h-[76vh] flex items-start justify-center"
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

              <p className="text-xs text-slate-600">Scroll to zoom · ← → navigate · Esc close</p>
            </div>
          </div>
        )}

        {/* ── PPT progress modal ─────────────────────────────────────────────── */}
        {pptProgress.open && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 w-80 text-center">
              <h3 className="font-bold text-lg mb-2">Generating Presentation…</h3>
              <p className="text-sm text-slate-400 mb-5">Asking Gemini to write slide content for each chart.</p>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-gradient-to-r from-pink-500 to-violet-500 rounded-full transition-all duration-300" style={{ width: `${pptProgress.pct}%` }} />
              </div>
              <p className="text-xs text-slate-500">{pptProgress.step}</p>
            </div>
          </div>
        )}
      </div>
    </>
  )

  function openLb(idx: number) { setLbIdx(idx); setLbZoom(1); setLbOpen(true) }
}
