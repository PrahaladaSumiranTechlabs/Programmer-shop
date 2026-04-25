export type FieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'multi-text'
  | 'key-value'
  | 'git-status-input'
  | 'number'

export type FieldOption = string | { value: string; label: string }

export interface Field {
  id: string
  label: string
  type: FieldType
  placeholder?: string
  options?: FieldOption[]
  required?: boolean
  default?: string | boolean | string[]
  helpText?: string
  dependsOn?: { field: string; value: string | boolean }
}

export interface GeneratedCommand {
  parts: string[]
}

export interface Command {
  id: string
  name: string
  description: string
  category: string
  fields: Field[]
  generate: (values: FormValues) => GeneratedCommand
}

export interface Category {
  id: string
  name: string
  icon: string
  description: string
}

export type FormValues = Record<string, string | boolean | string[]>

export interface ParsedGitFile {
  status: string
  file: string
}
