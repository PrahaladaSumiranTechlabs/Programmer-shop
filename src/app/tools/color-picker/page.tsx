'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'

/* ── Color conversion utils ──────────────────────────────────── */
function hexToRgb(hex: string): [number, number, number] | null {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim())
  return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : null
}

function hexToRgbShort(hex: string): string {
  const rgb = hexToRgb(hex)
  return rgb ? `rgb(${rgb.join(', ')})` : ''
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return rgbToHex(Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255))
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c /= 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

function getContrastRatio(hex: string): { white: number; black: number } {
  const rgb = hexToRgb(hex)
  if (!rgb) return { white: 0, black: 0 }
  const lum = getLuminance(...rgb)
  const white = (1.05) / (lum + 0.05)
  const black = (lum + 0.05) / 0.05
  return { white: Math.round(white * 10) / 10, black: Math.round(black * 10) / 10 }
}

function generateShades(hex: string): { label: string; hex: string }[] {
  const rgb = hexToRgb(hex)
  if (!rgb) return []
  const [h, s] = rgbToHsl(...rgb)
  return [
    { label: '50', hex: hslToHex(h, Math.min(s, 90), 97) },
    { label: '100', hex: hslToHex(h, Math.min(s, 85), 93) },
    { label: '200', hex: hslToHex(h, Math.min(s, 80), 85) },
    { label: '300', hex: hslToHex(h, Math.min(s, 75), 74) },
    { label: '400', hex: hslToHex(h, Math.min(s, 72), 62) },
    { label: '500', hex: hex },
    { label: '600', hex: hslToHex(h, Math.min(s + 5, 90), 42) },
    { label: '700', hex: hslToHex(h, Math.min(s + 5, 88), 34) },
    { label: '800', hex: hslToHex(h, Math.min(s + 3, 84), 26) },
    { label: '900', hex: hslToHex(h, Math.min(s, 80), 18) },
    { label: '950', hex: hslToHex(h, Math.min(s, 78), 11) },
  ]
}

function toTailwindApprox(hex: string): string {
  // Map to nearest Tailwind 500 shade by hue
  const rgb = hexToRgb(hex)
  if (!rgb) return ''
  const [h] = rgbToHsl(...rgb)
  if (h < 15 || h >= 345) return 'red'
  if (h < 35) return 'orange'
  if (h < 55) return 'amber'
  if (h < 75) return 'yellow'
  if (h < 110) return 'lime'
  if (h < 150) return 'green'
  if (h < 175) return 'emerald'
  if (h < 200) return 'teal'
  if (h < 220) return 'cyan'
  if (h < 240) return 'sky'
  if (h < 265) return 'blue'
  if (h < 285) return 'indigo'
  if (h < 315) return 'violet'
  if (h < 330) return 'purple'
  return 'pink'
}

const PRESETS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b',
  '#000000', '#ffffff',
]

declare global {
  interface Window {
    EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> }
  }
}

export default function ColorPickerPage() {
  const [color, setColor] = useState('#6366f1')
  const [hexInput, setHexInput] = useState('#6366f1')
  const [copied, setCopied] = useState('')
  const [history, setHistory] = useState<string[]>(['#6366f1'])
  const [eyedropperSupported, setEyedropperSupported] = useState(false)
  const [picking, setPicking] = useState(false)
  const nativePickerRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setEyedropperSupported(!!window.EyeDropper)
  }, [])

  const applyColor = useCallback((hex: string) => {
    const clean = hex.startsWith('#') ? hex : '#' + hex
    if (!/^#[0-9a-fA-F]{6}$/.test(clean)) return
    setColor(clean)
    setHexInput(clean)
    setHistory(h => [clean, ...h.filter(x => x !== clean)].slice(0, 16))
  }, [])

  async function openEyedropper() {
    if (!window.EyeDropper) return
    setPicking(true)
    try {
      const dropper = new window.EyeDropper()
      const result = await dropper.open()
      applyColor(result.sRGBHex)
    } catch { /* user cancelled */ }
    setPicking(false)
  }

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => { setCopied(id); setTimeout(() => setCopied(''), 2000) })
  }

  const rgb = hexToRgb(color)
  const hsl = rgb ? rgbToHsl(...rgb) : [0, 0, 0]
  const shades = generateShades(color)
  const contrast = getContrastRatio(color)
  const tailwindName = toTailwindApprox(color)
  const textColor = (contrast.white > contrast.black) ? '#ffffff' : '#000000'

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <button onClick={() => copy(text, id)}
      className={`px-2 py-0.5 text-xs rounded border transition-colors ${copied === id ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-white hover:bg-slate-700'}`}>
      {copied === id ? '✓' : 'Copy'}
    </button>
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
          <span className="font-semibold text-sm">🎨 Smart Color Picker</span>
          {!eyedropperSupported && (
            <span className="text-xs text-amber-500 border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded-full">
              Eyedropper requires Chrome/Edge 95+
            </span>
          )}
        </div>
      </nav>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 flex flex-col gap-8">

        {/* Main picker row */}
        <div className="grid sm:grid-cols-2 gap-6">

          {/* Left: color swatch + controls */}
          <div className="flex flex-col gap-4">

            {/* Big swatch */}
            <div
              className="w-full h-36 rounded-2xl border border-slate-700/50 shadow-lg flex items-center justify-center gap-3 transition-colors"
              style={{ background: color }}
            >
              <span className="text-lg font-mono font-bold px-3 py-1.5 rounded-lg bg-black/20 backdrop-blur-sm"
                style={{ color: textColor }}>
                {color.toUpperCase()}
              </span>
            </div>

            {/* Eyedropper + native picker */}
            <div className="flex gap-2">
              {/* EyeDropper — grab from screen */}
              <button
                onClick={openEyedropper}
                disabled={!eyedropperSupported || picking}
                title={eyedropperSupported ? 'Pick any color from your screen' : 'EyeDropper not supported in this browser'}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  picking
                    ? 'bg-indigo-600/50 border-indigo-500 text-indigo-300 animate-pulse cursor-crosshair'
                    : eyedropperSupported
                      ? 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20 cursor-pointer'
                      : 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed'
                }`}
              >
                {/* Eyedropper icon */}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                {picking ? 'Click any pixel…' : 'Pick from screen'}
              </button>

              {/* Native color input */}
              <div className="relative">
                <button
                  onClick={() => nativePickerRef.current?.click()}
                  className="flex items-center justify-center w-12 h-full rounded-xl border border-slate-700 overflow-hidden hover:border-slate-500 transition-colors"
                  style={{ background: color }}
                  title="Open color wheel"
                />
                <input
                  ref={nativePickerRef}
                  type="color"
                  value={color}
                  onChange={e => applyColor(e.target.value)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
              </div>
            </div>

            {eyedropperSupported && (
              <p className="text-xs text-slate-600 -mt-2">
                💡 The eyedropper lets you grab any color from <strong className="text-slate-500">anywhere on your screen</strong> — even from other apps or browser tabs.
              </p>
            )}

            {/* Hex / RGB / HSL inputs */}
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-600">HEX</span>
                <input
                  type="text"
                  value={hexInput}
                  onChange={e => { setHexInput(e.target.value); applyColor(e.target.value) }}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              {rgb && (
                <>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-600">R / G / B</span>
                    <div className="flex gap-1">
                      {rgb.map((v, i) => (
                        <input key={i} type="number" min={0} max={255} value={v}
                          onChange={e => { const n = [...rgb]; n[i] = Math.min(255, Math.max(0, Number(e.target.value))); applyColor(rgbToHex(n[0], n[1], n[2])) }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1.5 text-xs font-mono text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center" />
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-600">H / S / L</span>
                    <div className="flex gap-1">
                      {hsl.map((v, i) => (
                        <input key={i} type="number" min={0} max={i === 0 ? 360 : 100} value={v}
                          onChange={e => { const n = [...hsl]; n[i] = Number(e.target.value); applyColor(hslToHex(n[0], n[1], n[2])) }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1.5 text-xs font-mono text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center" />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Presets */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-slate-600">Presets</span>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map(p => (
                  <button key={p} onClick={() => applyColor(p)}
                    className={`w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 ${color === p ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ background: p }}
                    title={p} />
                ))}
              </div>
            </div>
          </div>

          {/* Right: formats + contrast */}
          <div className="flex flex-col gap-4">

            {/* Color formats */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col gap-0">
              <h3 className="text-xs font-semibold text-slate-400 mb-3">Color formats</h3>
              {[
                { label: 'HEX', value: color.toUpperCase(), id: 'fmt-hex' },
                { label: 'RGB', value: hexToRgbShort(color), id: 'fmt-rgb' },
                { label: 'HSL', value: `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`, id: 'fmt-hsl' },
                { label: 'Tailwind', value: `${tailwindName}-500 (approx)`, id: 'fmt-tw' },
                { label: 'CSS var', value: `--color-accent: ${color};`, id: 'fmt-cssvar' },
                { label: 'Figma', value: `R:${rgb?.[0]} G:${rgb?.[1]} B:${rgb?.[2]}`, id: 'fmt-figma' },
              ].map(({ label, value, id }) => (
                <div key={id} className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0">
                  <span className="text-xs text-slate-600 w-20">{label}</span>
                  <code className="flex-1 text-xs font-mono text-slate-300">{value}</code>
                  <CopyBtn text={value} id={id} />
                </div>
              ))}
            </div>

            {/* Contrast checker (WCAG) */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
              <h3 className="text-xs font-semibold text-slate-400 mb-3">WCAG Contrast</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { bg: color, fg: '#ffffff', label: 'on White bg', ratio: contrast.black },
                  { bg: '#ffffff', fg: color, label: 'on Color bg', ratio: contrast.white },
                ].map(({ bg, fg, label, ratio }) => {
                  const aa = ratio >= 4.5, aaa = ratio >= 7
                  return (
                    <div key={label} className="rounded-xl p-3 flex flex-col gap-1" style={{ background: bg, border: '1px solid #334155' }}>
                      <span className="text-xs" style={{ color: fg }}>{label}</span>
                      <span className="text-lg font-bold" style={{ color: fg }}>{ratio}:1</span>
                      <div className="flex gap-1 flex-wrap">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${aa ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>AA {aa ? '✓' : '✗'}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${aaa ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300'}`}>AAA {aaa ? '✓' : '✗'}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Shade palette */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-300">Tailwind-style shade palette</h3>
            <button onClick={() => {
              const css = shades.map(s => `  --color-${tailwindName}-${s.label}: ${s.hex};`).join('\n')
              copy(`:root {\n${css}\n}`, 'shades-css')
            }} className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${copied === 'shades-css' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
              {copied === 'shades-css' ? '✓ Copied CSS vars' : 'Copy as CSS vars'}
            </button>
          </div>
          <div className="grid grid-cols-11 gap-1.5">
            {shades.map(shade => {
              const rgb = hexToRgb(shade.hex)
              const lum = rgb ? getLuminance(...rgb) : 0
              const fg = lum > 0.35 ? '#1e293b' : '#f8fafc'
              return (
                <button key={shade.label} onClick={() => applyColor(shade.hex)}
                  title={shade.hex}
                  className={`flex flex-col items-center justify-end rounded-xl pb-2 pt-8 transition-all hover:scale-105 hover:shadow-lg border-2 ${color === shade.hex ? 'border-white' : 'border-transparent'}`}
                  style={{ background: shade.hex }}>
                  <span className="text-xs font-semibold" style={{ color: fg }}>{shade.label}</span>
                  <span className="text-[10px] font-mono opacity-70" style={{ color: fg }}>{shade.hex}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* History */}
        {history.length > 1 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-slate-500">Picked history</h3>
            <div className="flex flex-wrap gap-2">
              {history.map((h, i) => (
                <button key={i} onClick={() => applyColor(h)}
                  className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${color === h ? 'border-white' : 'border-slate-700'}`}
                  style={{ background: h }} title={h} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
