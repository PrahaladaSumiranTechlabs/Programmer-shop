'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'

// ─── Static model database ────────────────────────────────────────────────────
interface ModelSpec {
  name: string
  params: number          // billions
  family: string
  contextWindow: number   // tokens
  vramFp16GB: number      // VRAM needed at fp16
  vramInt8GB: number
  vramInt4GB: number
  tokensPerSecPerGPU: {   // rough tokens/sec on each GPU at fp16
    [gpu: string]: number
  }
  notes: string
}

const MODEL_DB: Record<string, ModelSpec> = {
  'llama3-8b':   { name: 'Meta Llama 3 8B',   params: 8,   family: 'Llama 3',  contextWindow: 8192,   vramFp16GB: 16,  vramInt8GB: 9,   vramInt4GB: 5,   tokensPerSecPerGPU: { 'A10G 24GB': 80,  'A100 40GB': 130, 'A100 80GB': 180, 'H100 80GB': 280, 'RTX 4090 24GB': 90,  'RTX 3090 24GB': 55 }, notes: 'Great balance of speed/quality for most tasks' },
  'llama3-70b':  { name: 'Meta Llama 3 70B',  params: 70,  family: 'Llama 3',  contextWindow: 8192,   vramFp16GB: 140, vramInt8GB: 75,  vramInt4GB: 40,  tokensPerSecPerGPU: { 'A10G 24GB': 0,   'A100 40GB': 25,  'A100 80GB': 45,  'H100 80GB': 90,  'RTX 4090 24GB': 0,   'RTX 3090 24GB': 0  }, notes: 'Needs multi-GPU at fp16. Use int4 on single A100 80GB' },
  'llama3.1-8b': { name: 'Meta Llama 3.1 8B', params: 8,   family: 'Llama 3.1',contextWindow: 128000, vramFp16GB: 16,  vramInt8GB: 9,   vramInt4GB: 5,   tokensPerSecPerGPU: { 'A10G 24GB': 75,  'A100 40GB': 125, 'A100 80GB': 170, 'H100 80GB': 265, 'RTX 4090 24GB': 85,  'RTX 3090 24GB': 50 }, notes: '128K context; VRAM needs grow with long contexts' },
  'llama3.1-70b':{ name: 'Meta Llama 3.1 70B',params: 70,  family: 'Llama 3.1',contextWindow: 128000, vramFp16GB: 140, vramInt8GB: 75,  vramInt4GB: 40,  tokensPerSecPerGPU: { 'A10G 24GB': 0,   'A100 40GB': 22,  'A100 80GB': 42,  'H100 80GB': 85,  'RTX 4090 24GB': 0,   'RTX 3090 24GB': 0  }, notes: 'Long context at scale; tensor parallelism recommended' },
  'mistral-7b':  { name: 'Mistral 7B',         params: 7,   family: 'Mistral',  contextWindow: 32768,  vramFp16GB: 14,  vramInt8GB: 8,   vramInt4GB: 4.5, tokensPerSecPerGPU: { 'A10G 24GB': 90,  'A100 40GB': 140, 'A100 80GB': 190, 'H100 80GB': 300, 'RTX 4090 24GB': 100, 'RTX 3090 24GB': 60 }, notes: 'Excellent efficiency; fits single consumer GPU at int4' },
  'mixtral-8x7b':{ name: 'Mixtral 8×7B MoE',  params: 46,  family: 'Mistral',  contextWindow: 32768,  vramFp16GB: 90,  vramInt8GB: 48,  vramInt4GB: 26,  tokensPerSecPerGPU: { 'A10G 24GB': 0,   'A100 40GB': 35,  'A100 80GB': 60,  'H100 80GB': 110, 'RTX 4090 24GB': 0,   'RTX 3090 24GB': 0  }, notes: 'MoE: active params ~12B but needs full model in VRAM' },
  'phi3-mini':   { name: 'Phi-3 Mini 3.8B',    params: 3.8, family: 'Phi',      contextWindow: 128000, vramFp16GB: 7.6, vramInt8GB: 4.2, vramInt4GB: 2.5, tokensPerSecPerGPU: { 'A10G 24GB': 140, 'A100 40GB': 200, 'A100 80GB': 280, 'H100 80GB': 400, 'RTX 4090 24GB': 160, 'RTX 3090 24GB': 90 }, notes: 'Very efficient; runs on laptop GPUs at int4' },
  'phi3-medium': { name: 'Phi-3 Medium 14B',   params: 14,  family: 'Phi',      contextWindow: 128000, vramFp16GB: 28,  vramInt8GB: 16,  vramInt4GB: 9,   tokensPerSecPerGPU: { 'A10G 24GB': 55,  'A100 40GB': 90,  'A100 80GB': 130, 'H100 80GB': 210, 'RTX 4090 24GB': 60,  'RTX 3090 24GB': 35 }, notes: 'Strong reasoning at mid-size; great cost/perf ratio' },
  'gemma2-9b':   { name: 'Gemma 2 9B',         params: 9,   family: 'Gemma',    contextWindow: 8192,   vramFp16GB: 18,  vramInt8GB: 10,  vramInt4GB: 6,   tokensPerSecPerGPU: { 'A10G 24GB': 70,  'A100 40GB': 120, 'A100 80GB': 165, 'H100 80GB': 255, 'RTX 4090 24GB': 80,  'RTX 3090 24GB': 48 }, notes: 'Google architecture; strong MMLU benchmark scores' },
  'gemma2-27b':  { name: 'Gemma 2 27B',         params: 27,  family: 'Gemma',    contextWindow: 8192,   vramFp16GB: 54,  vramInt8GB: 30,  vramInt4GB: 16,  tokensPerSecPerGPU: { 'A10G 24GB': 0,   'A100 40GB': 50,  'A100 80GB': 80,  'H100 80GB': 140, 'RTX 4090 24GB': 25,  'RTX 3090 24GB': 0  }, notes: 'Strong 27B model; fits A100 40GB at int4' },
  'codellama-34b':{ name:'CodeLlama 34B',       params: 34,  family: 'CodeLlama',contextWindow: 16384,  vramFp16GB: 68,  vramInt8GB: 36,  vramInt4GB: 20,  tokensPerSecPerGPU: { 'A10G 24GB': 0,   'A100 40GB': 40,  'A100 80GB': 65,  'H100 80GB': 115, 'RTX 4090 24GB': 30,  'RTX 3090 24GB': 0  }, notes: 'Code-focused; best for code generation tasks' },
  'deepseek-r1-7b':{ name:'DeepSeek-R1 7B',    params: 7,   family: 'DeepSeek', contextWindow: 32768,  vramFp16GB: 14,  vramInt8GB: 8,   vramInt4GB: 4.5, tokensPerSecPerGPU: { 'A10G 24GB': 85,  'A100 40GB': 135, 'A100 80GB': 185, 'H100 80GB': 290, 'RTX 4090 24GB': 95,  'RTX 3090 24GB': 58 }, notes: 'Strong reasoning with chain-of-thought' },
  'deepseek-r1-70b':{ name:'DeepSeek-R1 70B',  params: 70,  family: 'DeepSeek', contextWindow: 32768,  vramFp16GB: 140, vramInt8GB: 75,  vramInt4GB: 40,  tokensPerSecPerGPU: { 'A10G 24GB': 0,   'A100 40GB': 22,  'A100 80GB': 42,  'H100 80GB': 85,  'RTX 4090 24GB': 0,   'RTX 3090 24GB': 0  }, notes: 'Best OSS reasoning model; needs multi-GPU at fp16' },
  'qwen2.5-7b':  { name: 'Qwen 2.5 7B',        params: 7,   family: 'Qwen',     contextWindow: 131072, vramFp16GB: 14,  vramInt8GB: 8,   vramInt4GB: 4.5, tokensPerSecPerGPU: { 'A10G 24GB': 88,  'A100 40GB': 138, 'A100 80GB': 188, 'H100 80GB': 295, 'RTX 4090 24GB': 98,  'RTX 3090 24GB': 60 }, notes: '128K context; multilingual excellence' },
  'qwen2.5-72b': { name: 'Qwen 2.5 72B',       params: 72,  family: 'Qwen',     contextWindow: 131072, vramFp16GB: 144, vramInt8GB: 78,  vramInt4GB: 42,  tokensPerSecPerGPU: { 'A10G 24GB': 0,   'A100 40GB': 20,  'A100 80GB': 40,  'H100 80GB': 82,  'RTX 4090 24GB': 0,   'RTX 3090 24GB': 0  }, notes: 'Top-tier OSS model; rivals GPT-4 class' },
  'whisper-large-v3':{ name:'Whisper Large v3', params: 1.5, family: 'Whisper',  contextWindow: 448,    vramFp16GB: 3,   vramInt8GB: 1.8, vramInt4GB: 1.2, tokensPerSecPerGPU: { 'A10G 24GB': 0,   'A100 40GB': 0,   'A100 80GB': 0,   'H100 80GB': 0,   'RTX 4090 24GB': 0,   'RTX 3090 24GB': 0  }, notes: 'Audio model: throughput is real-time factor (RTF), not tokens/sec' },
  'stable-diffusion-xl':{ name:'Stable Diffusion XL', params: 6.6, family: 'Diffusion', contextWindow: 0, vramFp16GB: 10, vramInt8GB: 6, vramInt4GB: 4, tokensPerSecPerGPU: { 'A10G 24GB': 0, 'A100 40GB': 0, 'A100 80GB': 0, 'H100 80GB': 0, 'RTX 4090 24GB': 0, 'RTX 3090 24GB': 0 }, notes: 'Image model: throughput is images/min, not tokens/sec' },
}

// ─── GPU database ─────────────────────────────────────────────────────────────
interface GPUSpec {
  name: string
  vramGB: number
  fp16TFLOPS: number
  tier: 'cloud-high' | 'cloud-mid' | 'consumer'
  monthlyUSDApprox: number // cloud single-GPU cost approx
}

const GPU_DB: Record<string, GPUSpec> = {
  'H100 80GB':    { name: 'NVIDIA H100 SXM 80GB',  vramGB: 80, fp16TFLOPS: 989,  tier: 'cloud-high', monthlyUSDApprox: 3000 },
  'A100 80GB':    { name: 'NVIDIA A100 80GB',       vramGB: 80, fp16TFLOPS: 312,  tier: 'cloud-high', monthlyUSDApprox: 2000 },
  'A100 40GB':    { name: 'NVIDIA A100 40GB',       vramGB: 40, fp16TFLOPS: 312,  tier: 'cloud-mid',  monthlyUSDApprox: 1400 },
  'A10G 24GB':    { name: 'NVIDIA A10G 24GB',       vramGB: 24, fp16TFLOPS: 125,  tier: 'cloud-mid',  monthlyUSDApprox: 700 },
  'RTX 4090 24GB':{ name: 'NVIDIA RTX 4090 24GB',  vramGB: 24, fp16TFLOPS: 165,  tier: 'consumer',   monthlyUSDApprox: 0 },
  'RTX 3090 24GB':{ name: 'NVIDIA RTX 3090 24GB',  vramGB: 24, fp16TFLOPS: 71,   tier: 'consumer',   monthlyUSDApprox: 0 },
}

const QUANT_OPTIONS = ['fp16 (full precision)', 'int8 (8-bit)', 'int4 (4-bit / GGUF)']

const SERVING_FRAMEWORK: Record<string, string> = {
  'vLLM':     'Best for high-throughput cloud deployments. PagedAttention maximizes concurrent sessions.',
  'Ollama':   'Easiest local/dev setup. Single binary, auto quantization, REST API included.',
  'llama.cpp':'Maximum compatibility — runs on CPU+GPU, GGUF format, great for edge/local.',
  'TGI (Text Generation Inference)': 'Hugging Face production server; supports tensor parallelism, speculative decoding.',
  'Triton Inference Server': 'NVIDIA enterprise server; ideal when batching many model types together.',
  'LiteLLM':  'OpenAI-compatible proxy layer — works in front of any backend.',
}

function getVram(spec: ModelSpec, quant: string): number {
  if (quant.startsWith('int4')) return spec.vramInt4GB
  if (quant.startsWith('int8')) return spec.vramInt8GB
  return spec.vramFp16GB
}

function calcLatency(tokensPerSec: number, outputTokens: number): string {
  if (!tokensPerSec) return 'N/A'
  const sec = outputTokens / tokensPerSec
  return sec < 1 ? `${Math.round(sec * 1000)}ms` : `${sec.toFixed(1)}s`
}

export default function AIWorkloadCalculator() {
  const [modelKey, setModelKey]         = useState('llama3-8b')
  const [gpuKey, setGpuKey]             = useState('A100 40GB')
  const [quant, setQuant]               = useState('int8 (8-bit)')
  const [concurrentUsers, setConcurrentUsers] = useState(10)
  const [avgOutputTokens, setAvgOutputTokens] = useState(512)
  const [avgInputTokens, setAvgInputTokens]   = useState(256)
  const [framework, setFramework]       = useState('vLLM')
  const [replicaCount, setReplicaCount] = useState(1)

  const model = MODEL_DB[modelKey]
  const gpu   = GPU_DB[gpuKey]

  const result = useMemo(() => {
    const vramNeeded = getVram(model, quant)
    // KV cache overhead per concurrent session (rough: 0.5 MB per token per session at fp16, ~0.25 at int8)
    const kvBytesPerToken = quant.startsWith('int4') ? 0.125e6 : quant.startsWith('int8') ? 0.25e6 : 0.5e6
    const kvVramGB = (concurrentUsers * avgInputTokens * kvBytesPerToken) / 1e9
    const totalVramNeeded = vramNeeded + kvVramGB

    // GPUs needed
    const gpusNeeded = Math.ceil(totalVramNeeded / gpu.vramGB)

    // Tokens/sec per GPU
    const gpuKey2 = gpuKey as keyof typeof model.tokensPerSecPerGPU
    const rawTPS = model.tokensPerSecPerGPU[gpuKey2] || 0
    // Quantization boost
    const quantMultiplier = quant.startsWith('int4') ? 1.6 : quant.startsWith('int8') ? 1.2 : 1.0
    const tpsPerGPU = Math.round(rawTPS * quantMultiplier)
    const totalTPS = tpsPerGPU * replicaCount * gpusNeeded

    // Concurrent sessions estimate: TPS / (output tokens / latency budget seconds)
    // Assume 5s latency budget per user
    const latencyBudgetSec = 5
    const tpsNeededPerUser = avgOutputTokens / latencyBudgetSec
    const maxConcurrent = tpsPerGPU > 0 ? Math.floor(totalTPS / tpsNeededPerUser) : 0

    // P50 latency (time to first token ~100ms + generation time)
    const ttft = 100 // ms estimate
    const genTimeMs = tpsPerGPU > 0 ? Math.round((avgOutputTokens / tpsPerGPU) * 1000) : 0
    const p50LatencyMs = ttft + genTimeMs

    // Cost estimate
    const monthlyGPUCost = gpu.monthlyUSDApprox > 0
      ? gpu.monthlyUSDApprox * gpusNeeded * replicaCount
      : null

    return {
      vramNeeded,
      kvVramGB: Math.round(kvVramGB * 100) / 100,
      totalVramNeeded: Math.round(totalVramNeeded * 10) / 10,
      gpusNeeded,
      tpsPerGPU,
      totalTPS,
      maxConcurrent,
      p50LatencyMs,
      ttft,
      genTimeMs,
      monthlyGPUCost,
      fits: totalVramNeeded <= gpu.vramGB * gpusNeeded,
    }
  }, [model, gpu, quant, concurrentUsers, avgOutputTokens, avgInputTokens, replicaCount, gpuKey])

  const statusColor = result.fits && result.tpsPerGPU > 0
    ? 'text-emerald-400' : 'text-red-400'

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950">
      {/* Nav */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 h-9 bg-slate-950 border-b border-slate-800/60">
        <Link href="/" className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors text-xs">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          ProgrammerShop
        </Link>
        <span className="text-slate-700">·</span>
        <span className="text-slate-400 text-xs font-medium">AI Workload Calculator</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-5 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">AI Workload Calculator</h1>
            <p className="text-slate-400 text-sm">Estimate GPU requirements, concurrent sessions, and latency for self-hosted LLM deployments — no API calls, all offline math.</p>
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            {/* ── Left: Inputs ─────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-5">

              {/* Model */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-lg">🤖</span> Model
                </h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Select model</label>
                    <select
                      value={modelKey}
                      onChange={e => setModelKey(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      {Object.entries(MODEL_DB).map(([k, m]) => (
                        <option key={k} value={k}>{m.name} ({m.params}B)</option>
                      ))}
                    </select>
                  </div>
                  <div className="text-xs text-slate-500 bg-slate-800/50 rounded-lg p-2.5">
                    <div className="flex gap-4 flex-wrap">
                      <span>Family: <span className="text-slate-300">{model.family}</span></span>
                      <span>Params: <span className="text-slate-300">{model.params}B</span></span>
                      <span>Context: <span className="text-slate-300">{model.contextWindow.toLocaleString()} tokens</span></span>
                    </div>
                    <p className="mt-1.5 text-slate-500">{model.notes}</p>
                  </div>
                </div>
              </div>

              {/* Quantization */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-lg">⚖️</span> Quantization
                </h2>
                <div className="space-y-2">
                  {QUANT_OPTIONS.map(q => (
                    <label key={q} className="flex items-center gap-2.5 cursor-pointer">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${quant === q ? 'border-indigo-500 bg-indigo-500' : 'border-slate-600'}`}>
                        {quant === q && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="text-sm text-slate-300">{q}</span>
                      <span className="ml-auto text-xs text-slate-500">
                        {q.startsWith('fp16') ? `${model.vramFp16GB} GB` : q.startsWith('int8') ? `${model.vramInt8GB} GB` : `${model.vramInt4GB} GB`}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* GPU */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-lg">🖥️</span> GPU
                </h2>
                <div className="space-y-2">
                  {Object.entries(GPU_DB).map(([k, g]) => (
                    <label key={k} className="flex items-center gap-2.5 cursor-pointer">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${gpuKey === k ? 'border-indigo-500 bg-indigo-500' : 'border-slate-600'}`}
                        onClick={() => setGpuKey(k)}>
                        {gpuKey === k && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="text-sm text-slate-300">{g.name}</span>
                      <span className="ml-auto text-xs text-slate-500">{g.vramGB} GB</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Workload */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-lg">📊</span> Workload
                </h2>
                <div className="space-y-3">
                  {[
                    { label: 'Concurrent users (target)', key: 'cu', value: concurrentUsers, set: setConcurrentUsers, min: 1, max: 500 },
                    { label: 'Avg input tokens', key: 'it', value: avgInputTokens, set: setAvgInputTokens, min: 64, max: 16384 },
                    { label: 'Avg output tokens', key: 'ot', value: avgOutputTokens, set: setAvgOutputTokens, min: 64, max: 4096 },
                    { label: 'Replicas (horizontal scale)', key: 'r', value: replicaCount, set: setReplicaCount, min: 1, max: 16 },
                  ].map(({ label, key, value, set, min, max }) => (
                    <div key={key}>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs text-slate-400">{label}</label>
                        <span className="text-xs font-mono text-indigo-400">{value.toLocaleString()}</span>
                      </div>
                      <input
                        type="range" min={min} max={max}
                        value={value}
                        onChange={e => set(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Serving framework */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-lg">🚀</span> Serving Framework
                </h2>
                <select
                  value={framework}
                  onChange={e => setFramework(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 mb-2"
                >
                  {Object.keys(SERVING_FRAMEWORK).map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">{SERVING_FRAMEWORK[framework]}</p>
              </div>
            </div>

            {/* ── Right: Results ───────────────────────────────────── */}
            <div className="lg:col-span-3 space-y-5">

              {/* Status banner */}
              <div className={`rounded-xl border p-4 ${result.fits && result.tpsPerGPU > 0 ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-red-500/5 border-red-500/30'}`}>
                <div className={`text-lg font-bold mb-1 ${statusColor}`}>
                  {result.fits && result.tpsPerGPU > 0
                    ? `✅ Feasible — ${result.gpusNeeded} × ${gpuKey} per replica`
                    : result.tpsPerGPU === 0
                      ? `⚠️ GPU too small — model does not fit`
                      : `❌ Insufficient VRAM — increase GPU count or use lower quantization`}
                </div>
                <p className="text-xs text-slate-400">
                  Model weights need <span className="text-white font-mono">{result.vramNeeded} GB</span> + KV cache <span className="text-white font-mono">{result.kvVramGB} GB</span> = <span className="text-white font-mono">{result.totalVramNeeded} GB</span> total VRAM
                  {result.gpusNeeded > 1 && ` across ${result.gpusNeeded} GPUs (tensor parallelism)`}
                </p>
              </div>

              {/* Key metrics grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'GPUs per replica', value: result.gpusNeeded.toString(), icon: '🖥️', sub: `${gpu.vramGB} GB each` },
                  { label: 'Throughput', value: result.tpsPerGPU > 0 ? `${result.totalTPS.toLocaleString()}` : 'N/A', icon: '⚡', sub: 'tokens/sec total' },
                  { label: 'Max concurrent sessions', value: result.maxConcurrent > 0 ? result.maxConcurrent.toString() : 'N/A', icon: '👥', sub: `at ≤5s latency` },
                  { label: 'P50 latency', value: result.p50LatencyMs > 0 ? calcLatency(result.tpsPerGPU, avgOutputTokens) : 'N/A', icon: '⏱️', sub: `${avgOutputTokens} output tokens` },
                  { label: 'TTFT estimate', value: '~100ms', icon: '🎯', sub: 'time to first token' },
                  { label: 'VRAM per replica', value: `${result.totalVramNeeded} GB`, icon: '💾', sub: `model + KV cache` },
                ].map(m => (
                  <div key={m.label} className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                    <div className="text-lg mb-1">{m.icon}</div>
                    <div className="text-xl font-bold text-white font-mono">{m.value}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{m.label}</div>
                    <div className="text-xs text-slate-600 mt-0.5">{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* Scaling table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800">
                  <h3 className="text-sm font-semibold text-white">Scaling options</h3>
                  <p className="text-xs text-slate-500 mt-0.5">What you get at different replica counts</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500">
                        <th className="text-left px-4 py-2">Replicas</th>
                        <th className="text-right px-4 py-2">Total GPUs</th>
                        <th className="text-right px-4 py-2">Total TPS</th>
                        <th className="text-right px-4 py-2">Max Concurrent</th>
                        {gpu.monthlyUSDApprox > 0 && <th className="text-right px-4 py-2">Est. $/month</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 4, 8, 16].map(r => {
                        const tTPS = result.tpsPerGPU * r * result.gpusNeeded
                        const mc = result.tpsPerGPU > 0 ? Math.floor(tTPS / (avgOutputTokens / 5)) : 0
                        const cost = gpu.monthlyUSDApprox > 0 ? gpu.monthlyUSDApprox * result.gpusNeeded * r : null
                        return (
                          <tr key={r} className={`border-b border-slate-800/50 ${r === replicaCount ? 'bg-indigo-500/10' : 'hover:bg-slate-800/30'}`}>
                            <td className="px-4 py-2 font-mono text-slate-300">{r} {r === replicaCount && <span className="text-indigo-400">(current)</span>}</td>
                            <td className="px-4 py-2 text-right text-slate-400">{r * result.gpusNeeded}</td>
                            <td className="px-4 py-2 text-right text-slate-300 font-mono">{tTPS > 0 ? tTPS.toLocaleString() : 'N/A'}</td>
                            <td className="px-4 py-2 text-right text-slate-300 font-mono">{mc > 0 ? mc : 'N/A'}</td>
                            {gpu.monthlyUSDApprox > 0 && <td className="px-4 py-2 text-right text-slate-400">{cost ? `$${cost.toLocaleString()}` : '—'}</td>}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Deployment recipe */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  📋 Suggested deployment ({framework})
                </h3>
                <div className="bg-slate-950 rounded-lg p-3 font-mono text-xs space-y-1">
                  {framework === 'vLLM' && <>
                    <div><span className="text-slate-600"># Pull & run with vLLM</span></div>
                    <div><span className="text-emerald-400">pip install vllm</span></div>
                    <div className="text-emerald-400">python -m vllm.entrypoints.openai.api_server \</div>
                    <div className="text-emerald-400 pl-4">  --model {model.name.toLowerCase().replace(/\s+/g,'-')} \</div>
                    <div className="text-emerald-400 pl-4">  --dtype {quant.startsWith('fp16') ? 'float16' : 'auto'} \</div>
                    {result.gpusNeeded > 1 && <div className="text-emerald-400 pl-4">  --tensor-parallel-size {result.gpusNeeded} \</div>}
                    <div className="text-emerald-400 pl-4">  --max-num-seqs {Math.min(result.maxConcurrent || 8, 64)} \</div>
                    <div className="text-emerald-400 pl-4">  --port 8000</div>
                  </>}
                  {framework === 'Ollama' && <>
                    <div><span className="text-slate-600"># Install Ollama and run model</span></div>
                    <div className="text-emerald-400">curl -fsSL https://ollama.com/install.sh | sh</div>
                    <div className="text-emerald-400">ollama pull {modelKey.replace(/-/g,':').replace('llama3','llama3')}</div>
                    <div className="text-emerald-400">ollama serve  # starts on :11434</div>
                    <div className="text-slate-600 mt-1"># OpenAI-compatible endpoint:</div>
                    <div className="text-emerald-400">curl http://localhost:11434/v1/chat/completions \</div>
                    <div className="text-emerald-400 pl-4">  -d '{`{"model":"${modelKey}","messages":[{"role":"user","content":"hi"}]}`}'</div>
                  </>}
                  {framework === 'llama.cpp' && <>
                    <div><span className="text-slate-600"># Build llama.cpp with CUDA</span></div>
                    <div className="text-emerald-400">git clone https://github.com/ggerganov/llama.cpp && cd llama.cpp</div>
                    <div className="text-emerald-400">make GGML_CUDA=1 -j$(nproc)</div>
                    <div className="text-slate-600"># Download GGUF model then serve:</div>
                    <div className="text-emerald-400">./llama-server -m model.gguf \</div>
                    <div className="text-emerald-400 pl-4">  -ngl {result.gpusNeeded > 1 ? 99 : 35} \</div>
                    <div className="text-emerald-400 pl-4">  --parallel {Math.min(result.maxConcurrent || 4, 16)} \</div>
                    <div className="text-emerald-400 pl-4">  --port 8080</div>
                  </>}
                  {!['vLLM','Ollama','llama.cpp'].includes(framework) && <>
                    <div className="text-slate-400"># See {framework} documentation for deployment steps</div>
                    <div className="text-emerald-400">Model: {model.name}</div>
                    <div className="text-emerald-400">GPUs needed: {result.gpusNeeded} × {gpuKey}</div>
                    <div className="text-emerald-400">Quantization: {quant}</div>
                    <div className="text-emerald-400">Max concurrent: {result.maxConcurrent}</div>
                  </>}
                </div>
              </div>

              {/* Notes */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-200/70 space-y-1">
                <p className="font-semibold text-amber-400 mb-2">⚠️ Estimates & assumptions</p>
                <p>• Tokens/sec numbers are empirical estimates based on published benchmarks — actual results vary ±30% by batch size, sequence length, hardware config, and driver version.</p>
                <p>• KV cache VRAM scales with sequence length. Long-context requests will consume significantly more VRAM than shown.</p>
                <p>• &quot;Max concurrent sessions&quot; assumes 5-second latency budget. Lower budgets reduce concurrency linearly.</p>
                <p>• Quantized models (int4/int8) may show slightly reduced output quality. Always benchmark on your target use case.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
