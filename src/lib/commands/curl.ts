import { Command, FormValues } from '../types'

const s = (v: FormValues, k: string, fb = '') => (v[k] as string) || fb
const b = (v: FormValues, k: string) => !!v[k]
const a = (v: FormValues, k: string): string[] => (v[k] as string[]) || []

export const curlCommands: Command[] = [
  {
    id: 'curl-request',
    name: 'curl request',
    description: 'Build any HTTP request — GET, POST, PUT, DELETE with headers, body, auth',
    category: 'curl',
    fields: [
      {
        id: 'method',
        label: 'Method',
        type: 'select',
        options: [
          { value: 'GET', label: 'GET' },
          { value: 'POST', label: 'POST' },
          { value: 'PUT', label: 'PUT' },
          { value: 'PATCH', label: 'PATCH' },
          { value: 'DELETE', label: 'DELETE' },
          { value: 'HEAD', label: 'HEAD' },
          { value: 'OPTIONS', label: 'OPTIONS' },
        ],
        default: 'GET',
        required: true,
      },
      { id: 'url', label: 'URL', type: 'text', placeholder: 'https://api.example.com/users', required: true },
      {
        id: 'headers',
        label: 'Headers (-H)',
        type: 'multi-text',
        placeholder: 'Content-Type: application/json',
        helpText: 'Format: Header-Name: value',
      },
      {
        id: 'body',
        label: 'Request body (-d)',
        type: 'textarea',
        placeholder: '{"email": "user@example.com", "name": "John"}',
        helpText: 'JSON, form data, or any string',
      },
      {
        id: 'authType',
        label: 'Authentication',
        type: 'select',
        options: [
          { value: '', label: 'None' },
          { value: 'bearer', label: 'Bearer token' },
          { value: 'basic', label: 'Basic auth (user:pass)' },
          { value: 'apikey', label: 'API key header' },
        ],
        default: '',
      },
      { id: 'bearerToken', label: 'Bearer token', type: 'text', placeholder: 'eyJhbGciOi...', dependsOn: { field: 'authType', value: 'bearer' } },
      { id: 'basicAuth', label: 'Basic auth credentials', type: 'text', placeholder: 'username:password', dependsOn: { field: 'authType', value: 'basic' } },
      { id: 'apiKeyHeader', label: 'API key header name', type: 'text', placeholder: 'X-API-Key', dependsOn: { field: 'authType', value: 'apikey' } },
      { id: 'apiKeyValue', label: 'API key value', type: 'text', placeholder: 'your-api-key', dependsOn: { field: 'authType', value: 'apikey' } },
      { id: 'followRedirects', label: 'Follow redirects (-L)', type: 'checkbox', default: false },
      { id: 'insecure', label: 'Ignore SSL errors (-k)', type: 'checkbox', default: false },
      { id: 'verbose', label: 'Verbose output (-v)', type: 'checkbox', default: false },
      { id: 'silent', label: 'Silent mode (-s)', type: 'checkbox', default: false },
      { id: 'includeHeaders', label: 'Show response headers (-i)', type: 'checkbox', default: false },
      { id: 'outputFile', label: 'Save to file (-o)', type: 'text', placeholder: 'response.json' },
      { id: 'timeout', label: 'Max time in seconds (--max-time)', type: 'number', placeholder: '30' },
      { id: 'proxy', label: 'Proxy (--proxy)', type: 'text', placeholder: 'http://proxy:8080' },
    ],
    generate: (v) => {
      const method = s(v, 'method', 'GET')
      const url = s(v, 'url') || '<url>'
      const parts = ['curl']

      if (method !== 'GET') parts.push(`-X ${method}`)
      if (b(v, 'followRedirects')) parts.push('-L')
      if (b(v, 'insecure')) parts.push('-k')
      if (b(v, 'verbose')) parts.push('-v')
      if (b(v, 'silent')) parts.push('-s')
      if (b(v, 'includeHeaders')) parts.push('-i')

      // Auth
      const authType = s(v, 'authType')
      if (authType === 'bearer') {
        const token = s(v, 'bearerToken') || '<token>'
        parts.push(`-H "Authorization: Bearer ${token}"`)
      } else if (authType === 'basic') {
        parts.push(`-u "${s(v, 'basicAuth') || '<user:pass>'}"`)
      } else if (authType === 'apikey') {
        const headerName = s(v, 'apiKeyHeader') || 'X-API-Key'
        const headerVal = s(v, 'apiKeyValue') || '<key>'
        parts.push(`-H "${headerName}: ${headerVal}"`)
      }

      // Headers
      a(v, 'headers').filter(Boolean).forEach(h => parts.push(`-H "${h}"`))

      // Body
      const body = s(v, 'body')
      if (body) {
        const escaped = body.replace(/'/g, "'\\''")
        parts.push(`-d '${escaped}'`)
      }

      const timeout = s(v, 'timeout')
      if (timeout) parts.push(`--max-time ${timeout}`)
      const proxy = s(v, 'proxy')
      if (proxy) parts.push(`--proxy ${proxy}`)
      const output = s(v, 'outputFile')
      if (output) parts.push(`-o ${output}`)

      parts.push(`"${url}"`)
      return { parts }
    },
  },
]
