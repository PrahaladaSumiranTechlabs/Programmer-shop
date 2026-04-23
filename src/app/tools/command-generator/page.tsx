'use client'
import { useState, useMemo, useEffect } from 'react'
import { categories, commandsByCategory, allCommands, findCommand } from '@/lib/commands'
import { FormValues, GeneratedCommand } from '@/lib/types'
import CommandForm from '@/components/CommandForm'
import OutputBox from '@/components/OutputBox'

function initValues(commandId: string): FormValues {
  const cmd = findCommand(commandId)
  if (!cmd) return {}
  const vals: FormValues = {}
  for (const field of cmd.fields) {
    if (field.default !== undefined) vals[field.id] = field.default
    else if (field.type === 'multi-text' || field.type === 'git-status-input') vals[field.id] = []
    else if (field.type === 'checkbox') vals[field.id] = false
    else vals[field.id] = ''
  }
  return vals
}

export default function Page() {
  const [selectedCategory, setSelectedCategory] = useState('git')
  const [selectedCommandId, setSelectedCommandId] = useState<string>('git-add')
  const [formValues, setFormValues] = useState<Record<string, FormValues>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Initialize form values for selected command if not yet loaded
  useEffect(() => {
    if (selectedCommandId && !formValues[selectedCommandId]) {
      setFormValues(prev => ({ ...prev, [selectedCommandId]: initValues(selectedCommandId) }))
    }
  }, [selectedCommandId])

  const selectCommand = (id: string, catId: string) => {
    setSelectedCommandId(id)
    setSelectedCategory(catId)
    if (!formValues[id]) {
      setFormValues(prev => ({ ...prev, [id]: initValues(id) }))
    }
  }

  const updateField = (fieldId: string, value: string | boolean | string[]) => {
    setFormValues(prev => ({
      ...prev,
      [selectedCommandId]: { ...prev[selectedCommandId], [fieldId]: value },
    }))
  }

  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) return commandsByCategory(selectedCategory)
    const q = searchQuery.toLowerCase()
    return allCommands.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
    )
  }, [selectedCategory, searchQuery])

  const selectedCommand = findCommand(selectedCommandId)
  const currentValues = formValues[selectedCommandId] || {}

  const generated: GeneratedCommand | null = useMemo(() => {
    if (!selectedCommand) return null
    try { return selectedCommand.generate(currentValues) }
    catch { return null }
  }, [selectedCommand, currentValues])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950">
      {/* ProgrammerShop nav bar */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 h-9 bg-slate-950 border-b border-slate-800/60">
        <a href="/" className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors text-xs">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          ProgrammerShop
        </a>
        <span className="text-slate-700">·</span>
        <span className="text-slate-400 text-xs font-medium">Command Generator</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-52' : 'w-0 overflow-hidden'} flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-200`}>
        <div className="p-4 border-b border-slate-800">
          <h1 className="text-base font-bold text-white tracking-tight">Command Gen</h1>
          <p className="text-xs text-slate-500 mt-0.5">{allCommands.length} commands · {categories.length} categories</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => { setSelectedCategory(cat.id); setSearchQuery('') }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-slate-800 group ${selectedCategory === cat.id && !searchQuery ? 'bg-slate-800' : ''}`}
            >
              <span className="text-base leading-none">{cat.icon}</span>
              <div className="min-w-0">
                <div className={`text-sm font-medium truncate ${selectedCategory === cat.id && !searchQuery ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                  {cat.name}
                </div>
                <div className="text-xs text-slate-600 truncate">{cat.description}</div>
              </div>
              <span className="ml-auto text-xs text-slate-600 tabular-nums">
                {commandsByCategory(cat.id).length}
              </span>
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-800 text-xs text-slate-600">
          {allCommands.length} commands
        </div>
      </aside>

      {/* Command list */}
      <div className="w-56 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
        {/* Search */}
        <div className="p-3 border-b border-slate-800">
          <div className="relative">
            <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search commands..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded pl-7 pr-2 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">×</button>
            )}
          </div>
        </div>

        {/* Command list */}
        <div className="flex-1 overflow-y-auto">
          {searchQuery && (
            <div className="px-3 py-2 text-xs text-slate-500">{filteredCommands.length} results</div>
          )}
          {filteredCommands.map(cmd => (
            <button
              key={cmd.id}
              onClick={() => selectCommand(cmd.id, cmd.category)}
              className={`w-full text-left px-3 py-2.5 transition-colors hover:bg-slate-800 border-b border-slate-800/50 group ${selectedCommandId === cmd.id ? 'bg-slate-800 border-l-2 border-l-indigo-500' : ''}`}
            >
              {searchQuery && (
                <div className="text-xs text-slate-500 mb-0.5">
                  {categories.find(c => c.id === cmd.category)?.icon} {cmd.category}
                </div>
              )}
              <div className={`text-sm font-mono font-medium ${selectedCommandId === cmd.id ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                {cmd.name}
              </div>
              <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{cmd.description}</div>
            </button>
          ))}
          {filteredCommands.length === 0 && (
            <div className="p-4 text-center text-sm text-slate-600">No commands found</div>
          )}
        </div>
      </div>

      {/* Main form + output */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-900/50">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded"
            title="Toggle sidebar"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {selectedCommand && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">{categories.find(c => c.id === selectedCommand.category)?.icon}</span>
              <span className="text-slate-500">{selectedCommand.category}</span>
              <span className="text-slate-700">/</span>
              <span className="font-mono font-medium text-white">{selectedCommand.name}</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {selectedCommand ? (
            <>
              <CommandForm
                command={selectedCommand}
                values={currentValues}
                onChange={updateField}
              />
              <div className="border-t border-slate-800 pt-5">
                <OutputBox generated={generated} />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-600">
              Select a command from the list
            </div>
          )}
        </div>
      </main>
      </div>{/* end flex-1 */}
    </div>
  )
}
