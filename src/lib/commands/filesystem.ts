import { Command, FormValues } from '../types'

const s = (v: FormValues, k: string, fb = '') => (v[k] as string) || fb
const b = (v: FormValues, k: string) => !!v[k]
const a = (v: FormValues, k: string): string[] => (v[k] as string[]) || []

export const filesystemCommands: Command[] = [
  {
    id: 'find',
    name: 'find',
    description: 'Search for files and directories with complex criteria',
    category: 'filesystem',
    fields: [
      { id: 'path', label: 'Search path', type: 'text', placeholder: '.', default: '.' },
      {
        id: 'type',
        label: 'Type (-type)',
        type: 'select',
        options: [
          { value: '', label: 'Any' },
          { value: 'f', label: 'f — regular files' },
          { value: 'd', label: 'd — directories' },
          { value: 'l', label: 'l — symbolic links' },
        ],
        default: 'f',
      },
      { id: 'name', label: 'Name pattern (-name)', type: 'text', placeholder: '*.log', helpText: 'Case-sensitive. Use -iname for case-insensitive' },
      { id: 'iname', label: 'Case-insensitive name (-iname)', type: 'text', placeholder: '*.txt' },
      { id: 'mtime', label: 'Modified N days ago (-mtime)', type: 'text', placeholder: '-7 (last 7 days) or +30 (older than 30 days)' },
      { id: 'size', label: 'Size (-size)', type: 'text', placeholder: '+10M (>10MB) or -1k (<1KB)' },
      { id: 'maxDepth', label: 'Max depth (-maxdepth)', type: 'number', placeholder: '2' },
      { id: 'exec', label: 'Execute command (-exec)', type: 'text', placeholder: 'rm {} \\;', helpText: 'Use {} as placeholder, end with \\;' },
      { id: 'print0', label: 'Null-delimited output (for xargs -0)', type: 'checkbox', default: false },
      { id: 'excludeDirs', label: 'Exclude directories', type: 'multi-text', placeholder: 'node_modules' },
    ],
    generate: (v) => {
      const path = s(v, 'path', '.')
      const type = s(v, 'type', 'f')
      const excludeDirs = a(v, 'excludeDirs').filter(Boolean)
      const parts = [`find ${path}`]

      // Exclude dirs first (must come before other predicates)
      excludeDirs.forEach(dir => {
        parts.push(`-not -path "*/${dir}/*"`)
      })

      if (type) parts.push(`-type ${type}`)
      const name = s(v, 'name')
      if (name) parts.push(`-name "${name}"`)
      const iname = s(v, 'iname')
      if (iname) parts.push(`-iname "${iname}"`)
      const mtime = s(v, 'mtime')
      if (mtime) parts.push(`-mtime ${mtime}`)
      const size = s(v, 'size')
      if (size) parts.push(`-size ${size}`)
      const maxDepth = s(v, 'maxDepth')
      if (maxDepth) parts.push(`-maxdepth ${maxDepth}`)
      if (b(v, 'print0')) parts.push('-print0')
      const exec = s(v, 'exec')
      if (exec) parts.push(`-exec ${exec}`)
      return { parts }
    },
  },
  {
    id: 'grep',
    name: 'grep',
    description: 'Search file contents with patterns',
    category: 'filesystem',
    fields: [
      { id: 'pattern', label: 'Pattern', type: 'text', placeholder: 'ERROR|WARN', required: true },
      { id: 'path', label: 'File / directory / glob', type: 'text', placeholder: './logs/', required: true },
      { id: 'recursive', label: 'Recursive (-r)', type: 'checkbox', default: false },
      { id: 'ignoreCase', label: 'Case-insensitive (-i)', type: 'checkbox', default: false },
      { id: 'lineNumbers', label: 'Show line numbers (-n)', type: 'checkbox', default: true },
      { id: 'filesOnly', label: 'Only print file names (-l)', type: 'checkbox', default: false },
      { id: 'invert', label: 'Invert match (-v)', type: 'checkbox', default: false },
      { id: 'extendedRegex', label: 'Extended regex (-E)', type: 'checkbox', default: false },
      { id: 'context', label: 'Lines of context (-C)', type: 'number', placeholder: '3' },
      { id: 'include', label: 'Include files (--include)', type: 'text', placeholder: '*.py' },
      { id: 'exclude', label: 'Exclude files (--exclude)', type: 'text', placeholder: '*.min.js' },
      { id: 'excludeDir', label: 'Exclude directories (--exclude-dir)', type: 'text', placeholder: 'node_modules' },
      { id: 'count', label: 'Count matches (-c)', type: 'checkbox', default: false },
    ],
    generate: (v) => {
      const pattern = s(v, 'pattern') || '<pattern>'
      const path = s(v, 'path') || '.'
      const parts = ['grep']
      if (b(v, 'extendedRegex')) parts.push('-E')
      if (b(v, 'recursive')) parts.push('-r')
      if (b(v, 'ignoreCase')) parts.push('-i')
      if (b(v, 'lineNumbers')) parts.push('-n')
      if (b(v, 'filesOnly')) parts.push('-l')
      if (b(v, 'invert')) parts.push('-v')
      if (b(v, 'count')) parts.push('-c')
      const ctx = s(v, 'context')
      if (ctx) parts.push(`-C ${ctx}`)
      const include = s(v, 'include')
      if (include) parts.push(`--include="${include}"`)
      const exclude = s(v, 'exclude')
      if (exclude) parts.push(`--exclude="${exclude}"`)
      const excludeDir = s(v, 'excludeDir')
      if (excludeDir) parts.push(`--exclude-dir="${excludeDir}"`)
      parts.push(`"${pattern}"`)
      parts.push(path)
      return { parts }
    },
  },
  {
    id: 'tar',
    name: 'tar',
    description: 'Create or extract archives with optional compression',
    category: 'filesystem',
    fields: [
      {
        id: 'action',
        label: 'Action',
        type: 'radio',
        options: [
          { value: 'create', label: 'Create archive' },
          { value: 'extract', label: 'Extract archive' },
          { value: 'list', label: 'List contents' },
        ],
        default: 'create',
        required: true,
      },
      { id: 'file', label: 'Archive file', type: 'text', placeholder: 'archive.tar.gz', required: true },
      { id: 'source', label: 'Source path(s)', type: 'text', placeholder: './dist/', helpText: 'For create: what to archive', dependsOn: { field: 'action', value: 'create' } },
      { id: 'outputDir', label: 'Extract to directory (-C)', type: 'text', placeholder: '/tmp/extracted', dependsOn: { field: 'action', value: 'extract' } },
      {
        id: 'compression',
        label: 'Compression',
        type: 'select',
        options: [
          { value: 'z', label: 'gzip (.gz)' },
          { value: 'j', label: 'bzip2 (.bz2)' },
          { value: 'J', label: 'xz (.xz)' },
          { value: '', label: 'None (.tar)' },
        ],
        default: 'z',
      },
      { id: 'verbose', label: 'Verbose output (-v)', type: 'checkbox', default: true },
      { id: 'exclude', label: 'Exclude pattern (--exclude)', type: 'text', placeholder: '*.log' },
    ],
    generate: (v) => {
      const action = s(v, 'action', 'create')
      const file = s(v, 'file') || '<archive.tar.gz>'
      const comp = s(v, 'compression', 'z')
      const verbose = b(v, 'verbose') ? 'v' : ''
      const parts: string[] = []

      if (action === 'create') {
        const flags = `tar -c${comp}${verbose}f`
        const exclude = s(v, 'exclude')
        const src = s(v, 'source') || '<source>'
        parts.push(flags)
        if (exclude) parts.push(`--exclude="${exclude}"`)
        parts.push(file)
        parts.push(src)
      } else if (action === 'extract') {
        const flags = `tar -x${comp}${verbose}f`
        const outDir = s(v, 'outputDir')
        parts.push(flags)
        parts.push(file)
        if (outDir) parts.push(`-C ${outDir}`)
      } else {
        parts.push(`tar -t${comp}${verbose}f`)
        parts.push(file)
      }

      return { parts }
    },
  },
  {
    id: 'rsync',
    name: 'rsync',
    description: 'Sync files locally or over SSH with delta transfer',
    category: 'filesystem',
    fields: [
      { id: 'source', label: 'Source', type: 'text', placeholder: './dist/', required: true },
      { id: 'destination', label: 'Destination', type: 'text', placeholder: 'user@server:/var/www/ or /backup/', required: true },
      { id: 'archive', label: 'Archive mode (-a)', type: 'checkbox', default: true, helpText: 'Preserves permissions, timestamps, symlinks' },
      { id: 'verbose', label: 'Verbose (-v)', type: 'checkbox', default: true },
      { id: 'compress', label: 'Compress (-z)', type: 'checkbox', default: false },
      { id: 'progress', label: 'Show progress (--progress)', type: 'checkbox', default: false },
      { id: 'delete', label: 'Delete remote files not in source (--delete)', type: 'checkbox', default: false },
      { id: 'dryRun', label: 'Dry run (-n / --dry-run)', type: 'checkbox', default: false },
      { id: 'exclude', label: 'Exclude patterns (--exclude)', type: 'multi-text', placeholder: 'node_modules' },
      { id: 'sshPort', label: 'SSH port (-e "ssh -p")', type: 'number', placeholder: '22' },
      { id: 'sshKey', label: 'SSH key (-e "ssh -i")', type: 'text', placeholder: '~/.ssh/deploy_key' },
    ],
    generate: (v) => {
      const src = s(v, 'source') || '<source>'
      const dest = s(v, 'destination') || '<destination>'
      let flags = 'rsync'
      if (b(v, 'archive')) flags += ' -a'
      if (b(v, 'verbose')) flags += ' -v'
      if (b(v, 'compress')) flags += ' -z'
      if (b(v, 'progress')) flags += ' --progress'
      if (b(v, 'delete')) flags += ' --delete'
      if (b(v, 'dryRun')) flags += ' -n'
      const parts = [flags]
      const excludes = a(v, 'exclude').filter(Boolean)
      excludes.forEach(e => parts.push(`--exclude="${e}"`))
      const sshPort = s(v, 'sshPort')
      const sshKey = s(v, 'sshKey')
      if (sshPort && sshPort !== '22') {
        parts.push(`-e "ssh -p ${sshPort}"`)
      } else if (sshKey) {
        parts.push(`-e "ssh -i ${sshKey}"`)
      }
      parts.push(src)
      parts.push(dest)
      return { parts }
    },
  },
]
