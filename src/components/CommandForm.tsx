'use client'
import { Command, Field, FieldOption, FormValues } from '@/lib/types'
import GitStatusInput from './GitStatusInput'

function normalizeOption(opt: FieldOption): { value: string; label: string } {
  return typeof opt === 'string' ? { value: opt, label: opt } : opt
}

interface Props {
  command: Command
  values: FormValues
  onChange: (fieldId: string, value: string | boolean | string[]) => void
}

function isVisible(field: Field, values: FormValues): boolean {
  if (!field.dependsOn) return true
  return values[field.dependsOn.field] === field.dependsOn.value
}

interface FieldProps {
  field: Field
  value: string | boolean | string[]
  onChange: (v: string | boolean | string[]) => void
}

function MultiTextInput({ field, value, onChange }: FieldProps) {
  const items = (value as string[]) || ['']
  const update = (idx: number, val: string) => {
    const next = [...items]
    next[idx] = val
    onChange(next)
  }
  const add = () => onChange([...items, ''])
  const remove = (idx: number) => {
    const next = items.filter((_, i) => i !== idx)
    onChange(next.length ? next : [''])
  }
  return (
    <div className="space-y-1.5">
      {items.map((item, idx) => (
        <div key={idx} className="flex gap-1.5">
          <input
            type="text"
            value={item}
            placeholder={field.placeholder}
            onChange={e => update(idx, e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-600 rounded px-2.5 py-1.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={() => remove(idx)}
            className="px-2 text-slate-500 hover:text-red-400 transition-colors text-sm"
            title="Remove"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
      >
        + Add another
      </button>
    </div>
  )
}

function FieldRenderer({ field, value, onChange }: FieldProps) {
  const baseInput = 'bg-slate-900 border border-slate-600 rounded px-2.5 py-1.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 w-full'

  switch (field.type) {
    case 'text':
      return (
        <input
          type="text"
          value={(value as string) || ''}
          placeholder={field.placeholder}
          onChange={e => onChange(e.target.value)}
          className={baseInput}
        />
      )

    case 'number':
      return (
        <input
          type="number"
          value={(value as string) || ''}
          placeholder={field.placeholder}
          onChange={e => onChange(e.target.value)}
          className={baseInput}
        />
      )

    case 'textarea':
      return (
        <textarea
          value={(value as string) || ''}
          placeholder={field.placeholder}
          onChange={e => onChange(e.target.value)}
          rows={4}
          className={`${baseInput} resize-y font-mono text-xs`}
        />
      )

    case 'select':
      return (
        <select
          value={(value as string) || ''}
          onChange={e => onChange(e.target.value)}
          className={`${baseInput} cursor-pointer`}
        >
          {field.options?.map(raw => { const opt = normalizeOption(raw); return (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          )})}
        </select>
      )

    case 'checkbox':
      return (
        <label className="flex items-center gap-2 cursor-pointer group">
          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${value ? 'bg-indigo-600 border-indigo-600' : 'border-slate-600 group-hover:border-slate-400'}`}>
            {value && <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-white fill-current"><path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
          </div>
          <input
            type="checkbox"
            checked={!!(value)}
            onChange={e => onChange(e.target.checked)}
            className="sr-only"
          />
        </label>
      )

    case 'radio':
      return (
        <div className="space-y-1.5">
          {field.options?.map(raw => { const opt = normalizeOption(raw); return (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer group">
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${value === opt.value ? 'border-indigo-500' : 'border-slate-600 group-hover:border-slate-400'}`}>
                {value === opt.value && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
              </div>
              <input
                type="radio"
                name={field.id}
                value={opt.value}
                checked={value === opt.value}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              <span className="text-sm text-slate-300 font-mono">{opt.label}</span>
            </label>
          )})}
        </div>
      )

    case 'multi-text':
      return <MultiTextInput field={field} value={value} onChange={onChange} />

    case 'git-status-input':
      return (
        <GitStatusInput
          value={(value as string[]) || []}
          onChange={files => onChange(files)}
        />
      )

    default:
      return null
  }
}

export default function CommandForm({ command, values, onChange }: Props) {
  const visibleFields = command.fields.filter(f => isVisible(f, values))

  return (
    <div className="space-y-4">
      <div className="pb-3 border-b border-slate-700">
        <h2 className="text-base font-semibold text-white font-mono">{command.name}</h2>
        <p className="text-sm text-slate-400 mt-0.5">{command.description}</p>
      </div>

      {visibleFields.map(field => (
        <div key={field.id} className="space-y-1.5">
          {field.type !== 'checkbox' ? (
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-300">
              {field.label}
              {field.required && <span className="text-red-400 text-xs">*</span>}
            </label>
          ) : (
            <div className="flex items-center gap-2">
              <FieldRenderer
                field={field}
                value={values[field.id] ?? (field.default ?? false)}
                onChange={v => onChange(field.id, v)}
              />
              <label className="text-sm text-slate-300 cursor-pointer" onClick={() => onChange(field.id, !(values[field.id] ?? field.default ?? false))}>
                {field.label}
              </label>
            </div>
          )}

          {field.type !== 'checkbox' && (
            <FieldRenderer
              field={field}
              value={values[field.id] ?? (field.default ?? (field.type === 'multi-text' ? [''] : field.type === 'git-status-input' ? [] : ''))}
              onChange={v => onChange(field.id, v)}
            />
          )}

          {field.helpText && (
            <p className="text-xs text-slate-500">{field.helpText}</p>
          )}
        </div>
      ))}
    </div>
  )
}
