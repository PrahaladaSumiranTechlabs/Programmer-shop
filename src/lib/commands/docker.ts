import { Command, FormValues } from '../types'

const s = (v: FormValues, k: string, fb = '') => (v[k] as string) || fb
const b = (v: FormValues, k: string) => !!v[k]
const a = (v: FormValues, k: string): string[] => (v[k] as string[]) || []

export const dockerCommands: Command[] = [
  {
    id: 'docker-run',
    name: 'docker run',
    description: 'Create and start a container with full options',
    category: 'docker',
    fields: [
      { id: 'image', label: 'Image', type: 'text', placeholder: 'nginx:latest', required: true },
      { id: 'name', label: 'Container name (--name)', type: 'text', placeholder: 'my-app' },
      { id: 'detach', label: 'Run in background (-d)', type: 'checkbox', default: false },
      { id: 'interactive', label: 'Interactive TTY (-it)', type: 'checkbox', default: false },
      { id: 'rm', label: 'Auto-remove on exit (--rm)', type: 'checkbox', default: false },
      {
        id: 'ports',
        label: 'Port mappings (-p)',
        type: 'multi-text',
        placeholder: '8080:80',
        helpText: 'Format: host_port:container_port',
      },
      {
        id: 'envVars',
        label: 'Environment variables (-e)',
        type: 'multi-text',
        placeholder: 'DATABASE_URL=postgres://localhost:5432/db',
      },
      {
        id: 'volumes',
        label: 'Volume mounts (-v)',
        type: 'multi-text',
        placeholder: '/host/path:/container/path',
      },
      { id: 'network', label: 'Network (--network)', type: 'text', placeholder: 'my-network' },
      { id: 'user', label: 'User (-u)', type: 'text', placeholder: '1000:1000' },
      { id: 'workdir', label: 'Working directory (-w)', type: 'text', placeholder: '/app' },
      { id: 'entrypoint', label: 'Entrypoint override (--entrypoint)', type: 'text', placeholder: '/bin/bash' },
      {
        id: 'restart',
        label: 'Restart policy (--restart)',
        type: 'select',
        options: [
          { value: '', label: 'none (default)' },
          { value: 'always', label: 'always' },
          { value: 'unless-stopped', label: 'unless-stopped' },
          { value: 'on-failure', label: 'on-failure' },
          { value: 'on-failure:3', label: 'on-failure (max 3 retries)' },
        ],
        default: '',
      },
      { id: 'command', label: 'Override command', type: 'text', placeholder: 'bash' },
    ],
    generate: (v) => {
      const parts = ['docker run']
      if (b(v, 'detach')) parts.push('-d')
      if (b(v, 'interactive')) parts.push('-it')
      if (b(v, 'rm')) parts.push('--rm')
      const name = s(v, 'name')
      if (name) parts.push(`--name ${name}`)
      const restart = s(v, 'restart')
      if (restart) parts.push(`--restart ${restart}`)
      a(v, 'ports').filter(Boolean).forEach(p => parts.push(`-p ${p}`))
      a(v, 'envVars').filter(Boolean).forEach(e => parts.push(`-e "${e}"`))
      a(v, 'volumes').filter(Boolean).forEach(vol => parts.push(`-v ${vol}`))
      const network = s(v, 'network')
      if (network) parts.push(`--network ${network}`)
      const user = s(v, 'user')
      if (user) parts.push(`-u ${user}`)
      const workdir = s(v, 'workdir')
      if (workdir) parts.push(`-w ${workdir}`)
      const entrypoint = s(v, 'entrypoint')
      if (entrypoint) parts.push(`--entrypoint ${entrypoint}`)
      parts.push(s(v, 'image') || '<image>')
      const command = s(v, 'command')
      if (command) parts.push(command)
      return { parts }
    },
  },
  {
    id: 'docker-exec',
    name: 'docker exec',
    description: 'Execute a command in a running container — supports shell, SQL, and custom commands',
    category: 'docker',
    fields: [
      { id: 'container', label: 'Container name/ID', type: 'text', placeholder: 'my-container', required: true },
      {
        id: 'commandType',
        label: 'Command type',
        type: 'select',
        options: [
          { value: 'bash', label: 'Interactive bash shell' },
          { value: 'sh', label: 'Interactive sh shell' },
          { value: 'sql-postgres', label: 'PostgreSQL query' },
          { value: 'sql-mysql', label: 'MySQL query' },
          { value: 'custom', label: 'Custom command' },
        ],
        default: 'bash',
        required: true,
      },
      { id: 'user', label: 'Run as user (-u)', type: 'text', placeholder: 'root' },
      // PostgreSQL fields
      {
        id: 'pgUser',
        label: 'PostgreSQL user (-U)',
        type: 'text',
        placeholder: 'postgres',
        default: 'postgres',
        dependsOn: { field: 'commandType', value: 'sql-postgres' },
      },
      {
        id: 'pgDatabase',
        label: 'PostgreSQL database (-d)',
        type: 'text',
        placeholder: 'mydb',
        dependsOn: { field: 'commandType', value: 'sql-postgres' },
      },
      {
        id: 'sqlQuery',
        label: 'SQL Query',
        type: 'textarea',
        placeholder: 'SELECT * FROM users WHERE active = true LIMIT 10;',
        dependsOn: { field: 'commandType', value: 'sql-postgres' },
      },
      // MySQL fields
      {
        id: 'mysqlUser',
        label: 'MySQL user (-u)',
        type: 'text',
        placeholder: 'root',
        default: 'root',
        dependsOn: { field: 'commandType', value: 'sql-mysql' },
      },
      {
        id: 'mysqlDatabase',
        label: 'MySQL database',
        type: 'text',
        placeholder: 'mydb',
        dependsOn: { field: 'commandType', value: 'sql-mysql' },
      },
      {
        id: 'sqlQueryMysql',
        label: 'SQL Query',
        type: 'textarea',
        placeholder: 'SELECT * FROM users WHERE active = 1 LIMIT 10;',
        dependsOn: { field: 'commandType', value: 'sql-mysql' },
      },
      // Custom command field
      {
        id: 'customCommand',
        label: 'Command to run',
        type: 'text',
        placeholder: 'python manage.py migrate',
        dependsOn: { field: 'commandType', value: 'custom' },
      },
    ],
    generate: (v) => {
      const container = s(v, 'container') || '<container>'
      const cmdType = s(v, 'commandType', 'bash')
      const parts = ['docker exec']
      const user = s(v, 'user')
      if (user) parts.push(`-u ${user}`)

      switch (cmdType) {
        case 'bash':
          return { parts: [...parts, '-it', container, 'bash'] }
        case 'sh':
          return { parts: [...parts, '-it', container, 'sh'] }
        case 'sql-postgres': {
          const pgUser = s(v, 'pgUser', 'postgres')
          const pgDb = s(v, 'pgDatabase')
          const query = s(v, 'sqlQuery')
          let psql = `psql -U ${pgUser}`
          if (pgDb) psql += ` -d ${pgDb}`
          if (query) psql += ` -c '${query.replace(/'/g, "'\\''")}'`
          return { parts: [...parts, '-i', container, psql] }
        }
        case 'sql-mysql': {
          const mysqlUser = s(v, 'mysqlUser', 'root')
          const mysqlDb = s(v, 'mysqlDatabase')
          const query = s(v, 'sqlQueryMysql')
          let mysql = `mysql -u ${mysqlUser} -p`
          if (mysqlDb) mysql += ` ${mysqlDb}`
          if (query) mysql += ` -e '${query.replace(/'/g, "'\\''")}'`
          return { parts: [...parts, '-i', container, mysql] }
        }
        case 'custom': {
          const cmd = s(v, 'customCommand') || '<command>'
          return { parts: [...parts, '-it', container, cmd] }
        }
        default:
          return { parts: [...parts, '-it', container, 'bash'] }
      }
    },
  },
  {
    id: 'docker-build',
    name: 'docker build',
    description: 'Build a Docker image from a Dockerfile',
    category: 'docker',
    fields: [
      { id: 'tag', label: 'Image tag (-t)', type: 'text', placeholder: 'myapp:latest', required: true },
      { id: 'context', label: 'Build context', type: 'text', placeholder: '.', default: '.' },
      { id: 'file', label: 'Dockerfile (-f)', type: 'text', placeholder: 'Dockerfile.prod' },
      { id: 'target', label: 'Build stage (--target)', type: 'text', placeholder: 'production' },
      { id: 'buildArgs', label: 'Build arguments (--build-arg)', type: 'multi-text', placeholder: 'NODE_ENV=production' },
      { id: 'noCache', label: 'No cache (--no-cache)', type: 'checkbox', default: false },
      {
        id: 'platform',
        label: 'Platform (--platform)',
        type: 'select',
        options: [
          { value: '', label: 'Default (host platform)' },
          { value: 'linux/amd64', label: 'linux/amd64' },
          { value: 'linux/arm64', label: 'linux/arm64' },
          { value: 'linux/amd64,linux/arm64', label: 'Multi-platform' },
        ],
        default: '',
      },
    ],
    generate: (v) => {
      const parts = ['docker build']
      parts.push(`-t ${s(v, 'tag') || '<image:tag>'}`)
      const file = s(v, 'file')
      if (file) parts.push(`-f ${file}`)
      const target = s(v, 'target')
      if (target) parts.push(`--target ${target}`)
      if (b(v, 'noCache')) parts.push('--no-cache')
      const platform = s(v, 'platform')
      if (platform) parts.push(`--platform ${platform}`)
      a(v, 'buildArgs').filter(Boolean).forEach(arg => parts.push(`--build-arg ${arg}`))
      parts.push(s(v, 'context', '.'))
      return { parts }
    },
  },
  {
    id: 'docker-rm',
    name: 'docker rm',
    description: 'Remove one or more containers',
    category: 'docker',
    fields: [
      {
        id: 'containers',
        label: 'Container names / IDs',
        type: 'multi-text',
        placeholder: 'my-container',
        required: true,
        helpText: 'Add one container per entry',
      },
      { id: 'force', label: 'Force remove running containers (-f)', type: 'checkbox', default: false },
      { id: 'volumes', label: 'Remove associated volumes (-v)', type: 'checkbox', default: false },
    ],
    generate: (v) => {
      const containers = a(v, 'containers').filter(Boolean)
      let base = 'docker rm'
      if (b(v, 'force')) base += ' -f'
      if (b(v, 'volumes')) base += ' -v'
      return { parts: containers.length ? [base, ...containers] : [base, '<container>'] }
    },
  },
  {
    id: 'docker-rmi',
    name: 'docker rmi',
    description: 'Remove one or more images',
    category: 'docker',
    fields: [
      { id: 'images', label: 'Image names / IDs', type: 'multi-text', placeholder: 'myapp:latest', required: true },
      { id: 'force', label: 'Force remove (-f)', type: 'checkbox', default: false },
    ],
    generate: (v) => {
      const images = a(v, 'images').filter(Boolean)
      const base = b(v, 'force') ? 'docker rmi -f' : 'docker rmi'
      return { parts: images.length ? [base, ...images] : [base, '<image>'] }
    },
  },
  {
    id: 'docker-logs',
    name: 'docker logs',
    description: 'Fetch and stream container logs',
    category: 'docker',
    fields: [
      { id: 'container', label: 'Container name/ID', type: 'text', placeholder: 'my-container', required: true },
      { id: 'follow', label: 'Follow log output (-f)', type: 'checkbox', default: false },
      { id: 'tail', label: 'Last N lines (--tail)', type: 'number', placeholder: '100' },
      { id: 'since', label: 'Since (--since)', type: 'text', placeholder: '2h or 2024-01-01T00:00:00' },
      { id: 'timestamps', label: 'Show timestamps (-t)', type: 'checkbox', default: false },
    ],
    generate: (v) => {
      const parts = ['docker logs']
      if (b(v, 'follow')) parts.push('-f')
      if (b(v, 'timestamps')) parts.push('-t')
      const tail = s(v, 'tail')
      if (tail) parts.push(`--tail ${tail}`)
      const since = s(v, 'since')
      if (since) parts.push(`--since "${since}"`)
      parts.push(s(v, 'container') || '<container>')
      return { parts }
    },
  },
  {
    id: 'docker-cp',
    name: 'docker cp',
    description: 'Copy files/folders between host and container',
    category: 'docker',
    fields: [
      {
        id: 'direction',
        label: 'Direction',
        type: 'radio',
        options: [
          { value: 'to', label: 'Local → Container' },
          { value: 'from', label: 'Container → Local' },
        ],
        default: 'to',
        required: true,
      },
      { id: 'container', label: 'Container name/ID', type: 'text', placeholder: 'my-container', required: true },
      { id: 'localPath', label: 'Local path', type: 'text', placeholder: './config.json', required: true },
      { id: 'containerPath', label: 'Container path', type: 'text', placeholder: '/app/config.json', required: true },
    ],
    generate: (v) => {
      const dir = s(v, 'direction', 'to')
      const container = s(v, 'container') || '<container>'
      const local = s(v, 'localPath') || '<local>'
      const cpath = s(v, 'containerPath') || '<container-path>'
      if (dir === 'to') return { parts: ['docker cp', local, `${container}:${cpath}`] }
      return { parts: ['docker cp', `${container}:${cpath}`, local] }
    },
  },
  {
    id: 'docker-compose',
    name: 'docker compose',
    description: 'Manage multi-container applications with Compose',
    category: 'docker',
    fields: [
      {
        id: 'action',
        label: 'Action',
        type: 'select',
        options: [
          { value: 'up', label: 'up — start services' },
          { value: 'down', label: 'down — stop and remove' },
          { value: 'restart', label: 'restart — restart services' },
          { value: 'logs', label: 'logs — view output' },
          { value: 'ps', label: 'ps — list containers' },
          { value: 'exec', label: 'exec — run a command in service' },
          { value: 'build', label: 'build — build images' },
          { value: 'pull', label: 'pull — pull latest images' },
        ],
        default: 'up',
        required: true,
      },
      { id: 'file', label: 'Compose file (-f)', type: 'text', placeholder: 'docker-compose.prod.yml' },
      { id: 'services', label: 'Services (leave empty for all)', type: 'multi-text', placeholder: 'web' },
      { id: 'detach', label: 'Detached mode (-d)', type: 'checkbox', default: true, dependsOn: { field: 'action', value: 'up' } },
      { id: 'build', label: 'Build before starting (--build)', type: 'checkbox', default: false, dependsOn: { field: 'action', value: 'up' } },
      { id: 'forceRecreate', label: 'Force recreate containers (--force-recreate)', type: 'checkbox', default: false, dependsOn: { field: 'action', value: 'up' } },
      { id: 'removeVolumes', label: 'Remove volumes (-v)', type: 'checkbox', default: false, dependsOn: { field: 'action', value: 'down' } },
      { id: 'removeOrphans', label: 'Remove orphan containers (--remove-orphans)', type: 'checkbox', default: false, dependsOn: { field: 'action', value: 'down' } },
      { id: 'follow', label: 'Follow output (-f)', type: 'checkbox', default: false, dependsOn: { field: 'action', value: 'logs' } },
      { id: 'tail', label: 'Last N lines (--tail)', type: 'number', placeholder: '100', dependsOn: { field: 'action', value: 'logs' } },
      { id: 'execService', label: 'Service name', type: 'text', placeholder: 'web', dependsOn: { field: 'action', value: 'exec' } },
      { id: 'execCommand', label: 'Command', type: 'text', placeholder: 'bash', dependsOn: { field: 'action', value: 'exec' } },
    ],
    generate: (v) => {
      const action = s(v, 'action', 'up')
      const file = s(v, 'file')
      const base = file ? `docker compose -f ${file}` : 'docker compose'
      const services = a(v, 'services').filter(Boolean)

      switch (action) {
        case 'up': {
          const parts = [`${base} up`]
          if (b(v, 'detach')) parts.push('-d')
          if (b(v, 'build')) parts.push('--build')
          if (b(v, 'forceRecreate')) parts.push('--force-recreate')
          services.forEach(s => parts.push(s))
          return { parts }
        }
        case 'down': {
          const parts = [`${base} down`]
          if (b(v, 'removeVolumes')) parts.push('-v')
          if (b(v, 'removeOrphans')) parts.push('--remove-orphans')
          return { parts }
        }
        case 'logs': {
          const parts = [`${base} logs`]
          if (b(v, 'follow')) parts.push('-f')
          const tail = s(v, 'tail')
          if (tail) parts.push(`--tail=${tail}`)
          services.forEach(svc => parts.push(svc))
          return { parts }
        }
        case 'exec': {
          const svc = s(v, 'execService') || '<service>'
          const cmd = s(v, 'execCommand') || 'bash'
          return { parts: [`${base} exec`, svc, cmd] }
        }
        default: {
          const parts = [`${base} ${action}`]
          services.forEach(svc => parts.push(svc))
          return { parts }
        }
      }
    },
  },
]
