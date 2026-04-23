import { Command, FormValues } from '../types'

const s = (v: FormValues, k: string, fb = '') => (v[k] as string) || fb
const b = (v: FormValues, k: string) => !!v[k]

export const systemCommands: Command[] = [
  {
    id: 'port-check',
    name: 'port check',
    description: 'Find what process is using a port (lsof / ss)',
    category: 'system',
    fields: [
      { id: 'port', label: 'Port number', type: 'number', placeholder: '8080', required: true },
      {
        id: 'tool',
        label: 'Tool',
        type: 'radio',
        options: [
          { value: 'lsof', label: 'lsof (macOS & Linux)' },
          { value: 'ss', label: 'ss (Linux — faster)' },
          { value: 'netstat', label: 'netstat (cross-platform)' },
        ],
        default: 'lsof',
        required: true,
      },
    ],
    generate: (v) => {
      const port = s(v, 'port') || '<port>'
      const tool = s(v, 'tool', 'lsof')
      switch (tool) {
        case 'lsof':
          return { parts: [`lsof -ti :${port}`] }
        case 'ss':
          return { parts: [`ss -tulnp | grep :${port}`] }
        case 'netstat':
          return { parts: [`netstat -tulnp | grep :${port}`] }
        default:
          return { parts: [`lsof -ti :${port}`] }
      }
    },
  },
  {
    id: 'kill-port',
    name: 'kill by port',
    description: 'Kill the process running on a specific port',
    category: 'system',
    fields: [
      { id: 'port', label: 'Port number', type: 'number', placeholder: '8080', required: true },
      {
        id: 'signal',
        label: 'Signal',
        type: 'select',
        options: [
          { value: '15', label: 'SIGTERM (15) — graceful shutdown' },
          { value: '9', label: 'SIGKILL (9) — force kill' },
        ],
        default: '15',
      },
    ],
    generate: (v) => {
      const port = s(v, 'port') || '<port>'
      const sig = s(v, 'signal', '15')
      return { parts: [`kill -${sig} $(lsof -ti :${port})`] }
    },
  },
  {
    id: 'chmod',
    name: 'chmod',
    description: 'Change file or directory permissions',
    category: 'system',
    fields: [
      { id: 'path', label: 'File / directory', type: 'text', placeholder: './scripts/', required: true },
      {
        id: 'mode',
        label: 'Permission mode',
        type: 'select',
        options: [
          { value: '+x', label: '+x — make executable' },
          { value: '-x', label: '-x — remove executable' },
          { value: '644', label: '644 — rw-r--r-- (files)' },
          { value: '755', label: '755 — rwxr-xr-x (executables/dirs)' },
          { value: '600', label: '600 — rw------- (private keys)' },
          { value: '700', label: '700 — rwx------ (private dirs)' },
          { value: '777', label: '777 — rwxrwxrwx (full access)' },
          { value: 'custom', label: 'Custom' },
        ],
        default: '755',
        required: true,
      },
      { id: 'customMode', label: 'Custom mode', type: 'text', placeholder: 'u+rw,go-w', dependsOn: { field: 'mode', value: 'custom' } },
      { id: 'recursive', label: 'Recursive (-R)', type: 'checkbox', default: false },
      { id: 'verbose', label: 'Verbose (-v)', type: 'checkbox', default: false },
    ],
    generate: (v) => {
      const path = s(v, 'path') || '<path>'
      const modeKey = s(v, 'mode', '755')
      const mode = modeKey === 'custom' ? (s(v, 'customMode') || '<mode>') : modeKey
      const parts = ['chmod']
      if (b(v, 'recursive')) parts.push('-R')
      if (b(v, 'verbose')) parts.push('-v')
      parts.push(mode)
      parts.push(path)
      return { parts }
    },
  },
  {
    id: 'cron-entry',
    name: 'crontab entry',
    description: 'Build a cron schedule expression',
    category: 'system',
    fields: [
      {
        id: 'preset',
        label: 'Preset schedule',
        type: 'select',
        options: [
          { value: 'custom', label: 'Custom (define below)' },
          { value: '* * * * *', label: 'Every minute' },
          { value: '*/5 * * * *', label: 'Every 5 minutes' },
          { value: '*/15 * * * *', label: 'Every 15 minutes' },
          { value: '0 * * * *', label: 'Every hour' },
          { value: '0 */6 * * *', label: 'Every 6 hours' },
          { value: '0 0 * * *', label: 'Daily at midnight' },
          { value: '0 2 * * *', label: 'Daily at 2am' },
          { value: '0 0 * * 0', label: 'Weekly (Sunday midnight)' },
          { value: '0 0 1 * *', label: 'Monthly (1st at midnight)' },
          { value: '0 0 1 1 *', label: 'Yearly (Jan 1st midnight)' },
        ],
        default: '0 0 * * *',
        required: true,
      },
      { id: 'minute', label: 'Minute (0-59)', type: 'text', placeholder: '0', default: '0', dependsOn: { field: 'preset', value: 'custom' } },
      { id: 'hour', label: 'Hour (0-23)', type: 'text', placeholder: '*', default: '*', dependsOn: { field: 'preset', value: 'custom' } },
      { id: 'dayOfMonth', label: 'Day of month (1-31)', type: 'text', placeholder: '*', default: '*', dependsOn: { field: 'preset', value: 'custom' } },
      { id: 'month', label: 'Month (1-12)', type: 'text', placeholder: '*', default: '*', dependsOn: { field: 'preset', value: 'custom' } },
      { id: 'dayOfWeek', label: 'Day of week (0-7, 0=Sun)', type: 'text', placeholder: '*', default: '*', dependsOn: { field: 'preset', value: 'custom' } },
      { id: 'command', label: 'Command to run', type: 'text', placeholder: '/usr/bin/python3 /home/user/backup.py >> /var/log/backup.log 2>&1', required: true },
    ],
    generate: (v) => {
      const preset = s(v, 'preset', '0 0 * * *')
      const cmd = s(v, 'command') || '<command>'
      let schedule: string
      if (preset === 'custom') {
        const min = s(v, 'minute', '0')
        const hour = s(v, 'hour', '*')
        const dom = s(v, 'dayOfMonth', '*')
        const month = s(v, 'month', '*')
        const dow = s(v, 'dayOfWeek', '*')
        schedule = `${min} ${hour} ${dom} ${month} ${dow}`
      } else {
        schedule = preset
      }
      return { parts: [`${schedule} ${cmd}`] }
    },
  },
  {
    id: 'process-find',
    name: 'ps / kill',
    description: 'Find and kill processes by name or PID',
    category: 'system',
    fields: [
      {
        id: 'action',
        label: 'Action',
        type: 'radio',
        options: [
          { value: 'find', label: 'Find process' },
          { value: 'kill-name', label: 'Kill by process name' },
          { value: 'kill-pid', label: 'Kill by PID' },
        ],
        default: 'find',
        required: true,
      },
      { id: 'processName', label: 'Process name', type: 'text', placeholder: 'node', dependsOn: { field: 'action', value: 'find' } },
      { id: 'killName', label: 'Process name', type: 'text', placeholder: 'node', dependsOn: { field: 'action', value: 'kill-name' } },
      { id: 'pid', label: 'PID', type: 'number', placeholder: '12345', dependsOn: { field: 'action', value: 'kill-pid' } },
      {
        id: 'signal',
        label: 'Signal',
        type: 'select',
        options: [
          { value: '15', label: 'SIGTERM (15) — graceful' },
          { value: '9', label: 'SIGKILL (9) — force' },
          { value: '1', label: 'SIGHUP (1) — reload config' },
        ],
        default: '15',
      },
    ],
    generate: (v) => {
      const action = s(v, 'action', 'find')
      const sig = s(v, 'signal', '15')
      switch (action) {
        case 'find':
          return { parts: [`ps aux | grep ${s(v, 'processName') || '<name>'}`] }
        case 'kill-name':
          return { parts: [`pkill -${sig} ${s(v, 'killName') || '<name>'}`] }
        case 'kill-pid':
          return { parts: [`kill -${sig} ${s(v, 'pid') || '<pid>'}`] }
        default:
          return { parts: ['ps aux'] }
      }
    },
  },
  {
    id: 'journalctl',
    name: 'journalctl',
    description: 'Query and follow systemd journal logs',
    category: 'system',
    fields: [
      { id: 'unit', label: 'Service/unit name (-u)', type: 'text', placeholder: 'nginx or docker' },
      { id: 'follow', label: 'Follow (-f)', type: 'checkbox', default: false },
      { id: 'lines', label: 'Last N lines (-n)', type: 'number', placeholder: '100' },
      { id: 'since', label: 'Since (--since)', type: 'text', placeholder: '"2024-01-01" or "1 hour ago"' },
      { id: 'until', label: 'Until (--until)', type: 'text', placeholder: '"2024-01-02" or "now"' },
      {
        id: 'priority',
        label: 'Priority (-p)',
        type: 'select',
        options: [
          { value: '', label: 'All' },
          { value: 'err', label: 'err — errors only' },
          { value: 'warning', label: 'warning — warnings+' },
          { value: 'info', label: 'info — informational+' },
          { value: 'debug', label: 'debug — all' },
        ],
        default: '',
      },
      { id: 'reverse', label: 'Newest first (-r)', type: 'checkbox', default: false },
      { id: 'noPage', label: 'No pager (--no-pager)', type: 'checkbox', default: false },
    ],
    generate: (v) => {
      const parts = ['journalctl']
      const unit = s(v, 'unit')
      if (unit) parts.push(`-u ${unit}`)
      if (b(v, 'follow')) parts.push('-f')
      if (b(v, 'reverse')) parts.push('-r')
      if (b(v, 'noPage')) parts.push('--no-pager')
      const lines = s(v, 'lines')
      if (lines) parts.push(`-n ${lines}`)
      const priority = s(v, 'priority')
      if (priority) parts.push(`-p ${priority}`)
      const since = s(v, 'since')
      if (since) parts.push(`--since ${since}`)
      const until = s(v, 'until')
      if (until) parts.push(`--until ${until}`)
      return { parts }
    },
  },
]
