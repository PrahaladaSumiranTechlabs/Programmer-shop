import Link from 'next/link'

const tools = [
  {
    id: 'command-generator',
    href: '/tools/command-generator',
    icon: '⌨',
    tag: 'Live',
    tagColor: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
    name: 'Command Generator',
    description: 'Stop googling flags. Build git, Docker, Kubernetes, Terraform, AWS CLI, Redis and 100+ other commands through a clean form — then copy in one click.',
    highlights: ['130+ commands · 15 categories', 'git status file picker', 'Multiline & single-line output'],
    gradient: 'from-indigo-500/10 to-violet-500/5',
    border: 'border-indigo-500/20 hover:border-indigo-500/50',
    iconBg: 'bg-indigo-500/10 text-indigo-400',
  },
  {
    id: 'ai-workload-calculator',
    href: '/tools/ai-workload-calculator',
    icon: '🧠',
    tag: 'Live',
    tagColor: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
    name: 'AI Workload Calculator',
    description: 'Pick a model (Llama 3, Mistral, DeepSeek, Qwen…), set your concurrency target and GPU, and instantly get VRAM requirements, tokens/sec, max concurrent sessions, and a deployment recipe.',
    highlights: ['15+ OSS models (Llama, Mistral, Qwen…)', 'GPU sizing & scaling table', 'vLLM / Ollama / llama.cpp recipes'],
    gradient: 'from-violet-500/10 to-purple-500/5',
    border: 'border-violet-500/20 hover:border-violet-500/50',
    iconBg: 'bg-violet-500/10 text-violet-400',
  },
  {
    id: 'mermaid-gallery',
    href: '/tools/mermaid-gallery',
    icon: '📊',
    tag: 'Live',
    tagColor: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
    name: 'Mermaid Chart Gallery',
    description: 'Drop any .md, .mmd, or .txt file — every Mermaid diagram is auto-extracted and rendered as a zoomable image gallery. Download PNGs individually or let Gemini write a full slide deck for you.',
    highlights: ['Supports all 20+ diagram types', 'Lightbox zoom + keyboard nav', 'Gemini-powered PPT export'],
    gradient: 'from-pink-500/10 to-rose-500/5',
    border: 'border-pink-500/20 hover:border-pink-500/50',
    iconBg: 'bg-pink-500/10 text-pink-400',
  },
  {
    id: 'regex-tester',
    href: '#',
    icon: '🔍',
    tag: 'Coming soon',
    tagColor: 'bg-slate-700/50 text-slate-400 border border-slate-600/50',
    name: 'Regex Tester',
    description: 'Write, test and explain regular expressions with live highlighting, named groups, and reusable pattern library.',
    highlights: ['Live match highlighting', 'Explain mode', 'Save patterns'],
    gradient: 'from-cyan-500/10 to-blue-500/5',
    border: 'border-slate-700/50 hover:border-slate-600',
    iconBg: 'bg-cyan-500/10 text-cyan-400',
  },
  {
    id: 'json-tools',
    href: '#',
    icon: '{}',
    tag: 'Coming soon',
    tagColor: 'bg-slate-700/50 text-slate-400 border border-slate-600/50',
    name: 'JSON Tools',
    description: 'Format, diff, validate, query with JMESPath, and convert JSON to TypeScript types or Python dataclasses in one place.',
    highlights: ['Format & minify', 'JSON diff viewer', 'Type generator'],
    gradient: 'from-amber-500/10 to-orange-500/5',
    border: 'border-slate-700/50 hover:border-slate-600',
    iconBg: 'bg-amber-500/10 text-amber-400',
  },
  {
    id: 'env-manager',
    href: '#',
    icon: '🔑',
    tag: 'Coming soon',
    tagColor: 'bg-slate-700/50 text-slate-400 border border-slate-600/50',
    name: 'ENV Generator',
    description: 'Generate .env files, validate required keys, diff environments and export Docker / Kubernetes secret manifests.',
    highlights: ['Multi-env diff', 'Secret manifest export', '.env validator'],
    gradient: 'from-rose-500/10 to-pink-500/5',
    border: 'border-slate-700/50 hover:border-slate-600',
    iconBg: 'bg-rose-500/10 text-rose-400',
  },
  {
    id: 'cron-builder',
    href: '#',
    icon: '⏰',
    tag: 'Coming soon',
    tagColor: 'bg-slate-700/50 text-slate-400 border border-slate-600/50',
    name: 'Cron Builder',
    description: 'Write and understand cron expressions visually. See the next 10 run times, convert to human language, and generate systemd timers.',
    highlights: ['Visual schedule picker', 'Next run preview', 'systemd export'],
    gradient: 'from-green-500/10 to-teal-500/5',
    border: 'border-slate-700/50 hover:border-slate-600',
    iconBg: 'bg-green-500/10 text-green-400',
  },
  {
    id: 'api-tester',
    href: '#',
    icon: '🌐',
    tag: 'Coming soon',
    tagColor: 'bg-slate-700/50 text-slate-400 border border-slate-600/50',
    name: 'API Tester',
    description: 'Lightweight Postman alternative. Send requests, inspect responses, chain calls, and export as curl commands — no account required.',
    highlights: ['No account needed', 'curl export', 'Response diff'],
    gradient: 'from-purple-500/10 to-violet-500/5',
    border: 'border-slate-700/50 hover:border-slate-600',
    iconBg: 'bg-purple-500/10 text-purple-400',
  },
]

const stats = [
  { value: '130+', label: 'Commands' },
  { value: '15', label: 'Categories' },
  { value: '3', label: 'Live tools' },
  { value: '100%', label: 'Free forever' },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight">
              <span className="text-white">Programmer</span>
              <span className="text-indigo-400">Shop</span>
            </span>
            <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">beta</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#tools" className="text-sm text-slate-400 hover:text-white transition-colors hidden sm:block">Tools</a>
            <a href="https://github.com/PrahaladaSumiranTechlabs/Programmer-shop" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </a>
            <Link
              href="/tools/command-generator"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-sm font-medium rounded-lg transition-colors"
            >
              Open App
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl" />
          <div className="absolute top-20 left-1/4 w-[300px] h-[300px] bg-violet-600/8 rounded-full blur-3xl" />
        </div>

        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:64px_64px]" />

        <div className="relative max-w-6xl mx-auto px-5 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-sm mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Command Generator · AI Workload Calc · Mermaid Gallery — all live now
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6 leading-tight">
            Tools that{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
              developers
            </span>
            <br />
            actually use every day
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            No bloat. No accounts. No AI black boxes. Just sharp, focused tools that solve the
            repetitive parts of your workflow — instantly, in your browser.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/tools/command-generator"
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-indigo-500/25 text-sm"
            >
              <span>⌨</span>
              Command Generator
            </Link>
            <Link
              href="/tools/ai-workload-calculator"
              className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-violet-500/25 text-sm"
            >
              <span>🧠</span>
              AI Workload Calc
            </Link>
            <a
              href="#tools"
              className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-colors text-sm border border-slate-700"
            >
              See all tools
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-slate-800/60 bg-slate-900/30">
        <div className="max-w-6xl mx-auto px-5 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {stats.map(stat => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Preview — command generator */}
      <section className="max-w-6xl mx-auto px-5 py-16">
        <div className="relative rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900/50">
          {/* Window chrome */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/60 bg-slate-900">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
            <span className="ml-3 text-xs text-slate-500 font-mono">programmershop.com/tools/command-generator</span>
          </div>
          {/* Fake UI preview */}
          <div className="p-0 overflow-hidden">
            <div className="flex text-xs font-mono">
              {/* Sidebar */}
              <div className="w-36 bg-slate-900 border-r border-slate-800 p-2 space-y-0.5 flex-shrink-0">
                {['🌿 Git', '🐳 Docker', '☸ Kubernetes', '🌐 cURL', '🔒 SSH & SCP', '📦 Packages', '🗄 Database', '📂 Filesystem', '⚙ System'].map((item, i) => (
                  <div key={i} className={`px-2 py-1.5 rounded text-slate-400 ${i === 0 ? 'bg-slate-800 text-white' : ''}`}>{item}</div>
                ))}
              </div>
              {/* Command list */}
              <div className="w-40 border-r border-slate-800 flex-shrink-0">
                {['git add', 'git commit', 'git push', 'git pull', 'git log', 'git stash', 'git reset', 'git cherry-pick'].map((cmd, i) => (
                  <div key={i} className={`px-3 py-2 border-b border-slate-800/50 ${i === 0 ? 'bg-slate-800 border-l-2 border-l-indigo-500 text-white' : 'text-slate-400'}`}>{cmd}</div>
                ))}
              </div>
              {/* Form + output */}
              <div className="flex-1 p-4 space-y-3 min-w-0">
                <div>
                  <div className="text-slate-400 text-xs mb-1">Files to Stage *</div>
                  <div className="bg-slate-950 border border-slate-700 rounded p-2 text-slate-500 text-xs h-12 flex items-start">Paste git status output here…</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-slate-700" />
                  <span className="text-slate-500">Interactive patch mode (-p)</span>
                </div>
                <div className="mt-3">
                  <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide">Generated Command</div>
                  <div className="bg-slate-950 border border-slate-700 rounded p-3">
                    <span className="text-slate-600">$ </span>
                    <span className="text-emerald-400">git add \</span>
                    <br />
                    <span className="text-emerald-400 pl-4">  backend/fastapi-ai/app/api/grading_copilot.py \</span>
                    <br />
                    <span className="text-emerald-400 pl-4">  backend/flask-api/app/models.py \</span>
                    <br />
                    <span className="text-emerald-400 pl-4">  docker-compose.yml</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tools grid */}
      <section id="tools" className="max-w-6xl mx-auto px-5 pb-20">
        <div className="mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Developer tools</h2>
          <p className="text-slate-400">Each tool is a focused, standalone utility. No login, no data sent anywhere.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map(tool => (
            <Link
              key={tool.id}
              href={tool.href}
              className={`relative group flex flex-col p-5 rounded-2xl border bg-gradient-to-br ${tool.gradient} ${tool.border} transition-all duration-200 ${tool.href === '#' ? 'cursor-default pointer-events-none opacity-60' : 'hover:scale-[1.01]'}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${tool.iconBg}`}>
                  {tool.icon}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tool.tagColor}`}>
                  {tool.tag}
                </span>
              </div>

              <h3 className="font-semibold text-white mb-2">{tool.name}</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4 flex-1">{tool.description}</p>

              <ul className="space-y-1">
                {tool.highlights.map((h, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="w-1 h-1 rounded-full bg-slate-600 flex-shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>

              {tool.href !== '#' && (
                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-indigo-400 group-hover:text-indigo-300 transition-colors">
                  Open tool
                  <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* CTA strip */}
      <section className="border-t border-slate-800/60 bg-gradient-to-b from-slate-900/50 to-slate-950">
        <div className="max-w-6xl mx-auto px-5 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Something missing?</h2>
          <p className="text-slate-400 mb-6 max-w-xl mx-auto">
            Got a repetitive command or workflow that deserves its own tool? Open an issue on GitHub and it might ship next.
          </p>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            Request a tool on GitHub
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-8">
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Programmer<span className="text-indigo-400">Shop</span></span>
            <span>·</span>
            <span>Built for developers</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/tools/command-generator" className="hover:text-slate-300 transition-colors">Command Generator</Link>
            <Link href="/tools/ai-workload-calculator" className="hover:text-slate-300 transition-colors">AI Calc</Link>
            <a href="https://github.com/PrahaladaSumiranTechlabs/Programmer-shop" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
