import { Command, FormValues } from '../types'

const s = (v: FormValues, k: string, fb = '') => (v[k] as string) || fb
const b = (v: FormValues, k: string) => !!v[k]

export const sshCommands: Command[] = [
  {
    id: 'ssh-connect',
    name: 'ssh',
    description: 'Connect to a remote server via SSH',
    category: 'ssh',
    fields: [
      { id: 'user', label: 'Username', type: 'text', placeholder: 'ubuntu', required: true },
      { id: 'host', label: 'Host / IP', type: 'text', placeholder: '192.168.1.100 or server.example.com', required: true },
      { id: 'port', label: 'Port (-p)', type: 'number', placeholder: '22' },
      { id: 'identityFile', label: 'Identity file (-i)', type: 'text', placeholder: '~/.ssh/id_rsa' },
      { id: 'command', label: 'Remote command to run', type: 'text', placeholder: 'ls -la /var/log', helpText: 'Leave empty for interactive shell' },
      { id: 'verbose', label: 'Verbose output (-v)', type: 'checkbox', default: false },
      { id: 'noStrictHostKey', label: 'Skip host key check (-o StrictHostKeyChecking=no)', type: 'checkbox', default: false },
      { id: 'agentForward', label: 'Agent forwarding (-A)', type: 'checkbox', default: false },
    ],
    generate: (v) => {
      const user = s(v, 'user') || '<user>'
      const host = s(v, 'host') || '<host>'
      const parts = ['ssh']
      if (b(v, 'verbose')) parts.push('-v')
      if (b(v, 'agentForward')) parts.push('-A')
      const port = s(v, 'port')
      if (port && port !== '22') parts.push(`-p ${port}`)
      const identity = s(v, 'identityFile')
      if (identity) parts.push(`-i ${identity}`)
      if (b(v, 'noStrictHostKey')) parts.push('-o StrictHostKeyChecking=no')
      parts.push(`${user}@${host}`)
      const cmd = s(v, 'command')
      if (cmd) parts.push(`"${cmd}"`)
      return { parts }
    },
  },
  {
    id: 'ssh-tunnel',
    name: 'ssh tunnel',
    description: 'Create SSH port-forwarding tunnels (local or remote)',
    category: 'ssh',
    fields: [
      {
        id: 'tunnelType',
        label: 'Tunnel type',
        type: 'radio',
        options: [
          { value: 'local', label: 'Local (-L): forward local port to remote destination' },
          { value: 'remote', label: 'Remote (-R): expose local port on remote server' },
          { value: 'dynamic', label: 'Dynamic (-D): SOCKS proxy' },
        ],
        default: 'local',
        required: true,
      },
      { id: 'localPort', label: 'Local port', type: 'number', placeholder: '5432', required: true },
      { id: 'remoteHost', label: 'Remote destination host', type: 'text', placeholder: 'localhost or db.internal', dependsOn: { field: 'tunnelType', value: 'local' } },
      { id: 'remotePort', label: 'Remote destination port', type: 'number', placeholder: '5432', dependsOn: { field: 'tunnelType', value: 'local' } },
      { id: 'remoteHostR', label: 'Remote destination host', type: 'text', placeholder: 'localhost', dependsOn: { field: 'tunnelType', value: 'remote' } },
      { id: 'remotePortR', label: 'Remote destination port', type: 'number', placeholder: '3000', dependsOn: { field: 'tunnelType', value: 'remote' } },
      { id: 'user', label: 'SSH user', type: 'text', placeholder: 'ubuntu', required: true },
      { id: 'jumpHost', label: 'SSH jump server', type: 'text', placeholder: 'bastion.example.com', required: true },
      { id: 'jumpPort', label: 'SSH jump server port', type: 'number', placeholder: '22' },
      { id: 'identityFile', label: 'Identity file (-i)', type: 'text', placeholder: '~/.ssh/id_rsa' },
      { id: 'noShell', label: 'No shell / background (-N)', type: 'checkbox', default: true },
      { id: 'background', label: 'Go to background (-f)', type: 'checkbox', default: false },
    ],
    generate: (v) => {
      const type = s(v, 'tunnelType', 'local')
      const localPort = s(v, 'localPort') || '<local-port>'
      const user = s(v, 'user') || '<user>'
      const jumpHost = s(v, 'jumpHost') || '<host>'
      const jumpPort = s(v, 'jumpPort')
      const identity = s(v, 'identityFile')
      const parts = ['ssh']

      if (b(v, 'background')) parts.push('-f')
      if (b(v, 'noShell')) parts.push('-N')
      if (identity) parts.push(`-i ${identity}`)

      if (type === 'local') {
        const rHost = s(v, 'remoteHost', 'localhost')
        const rPort = s(v, 'remotePort') || localPort
        parts.push(`-L ${localPort}:${rHost}:${rPort}`)
      } else if (type === 'remote') {
        const rHost = s(v, 'remoteHostR', 'localhost')
        const rPort = s(v, 'remotePortR') || '<remote-port>'
        parts.push(`-R ${localPort}:${rHost}:${rPort}`)
      } else {
        parts.push(`-D ${localPort}`)
      }

      const sshDest = jumpPort && jumpPort !== '22'
        ? `-p ${jumpPort} ${user}@${jumpHost}`
        : `${user}@${jumpHost}`
      parts.push(sshDest)
      return { parts }
    },
  },
  {
    id: 'scp-transfer',
    name: 'scp',
    description: 'Securely copy files to or from a remote server',
    category: 'ssh',
    fields: [
      {
        id: 'direction',
        label: 'Direction',
        type: 'radio',
        options: [
          { value: 'upload', label: 'Upload: Local → Remote' },
          { value: 'download', label: 'Download: Remote → Local' },
        ],
        default: 'upload',
        required: true,
      },
      { id: 'localPath', label: 'Local path', type: 'text', placeholder: './dist/', required: true },
      { id: 'user', label: 'Remote user', type: 'text', placeholder: 'ubuntu', required: true },
      { id: 'host', label: 'Remote host', type: 'text', placeholder: 'server.example.com', required: true },
      { id: 'remotePath', label: 'Remote path', type: 'text', placeholder: '/var/www/html/', required: true },
      { id: 'port', label: 'Port (-P)', type: 'number', placeholder: '22' },
      { id: 'identityFile', label: 'Identity file (-i)', type: 'text', placeholder: '~/.ssh/id_rsa' },
      { id: 'recursive', label: 'Recursive (-r)', type: 'checkbox', default: false },
      { id: 'preserve', label: 'Preserve timestamps/permissions (-p)', type: 'checkbox', default: false },
      { id: 'compress', label: 'Compress (-C)', type: 'checkbox', default: false },
    ],
    generate: (v) => {
      const dir = s(v, 'direction', 'upload')
      const local = s(v, 'localPath') || '<local>'
      const user = s(v, 'user') || '<user>'
      const host = s(v, 'host') || '<host>'
      const remote = s(v, 'remotePath') || '<remote>'
      const port = s(v, 'port')
      const identity = s(v, 'identityFile')
      const parts = ['scp']
      if (b(v, 'recursive')) parts.push('-r')
      if (b(v, 'preserve')) parts.push('-p')
      if (b(v, 'compress')) parts.push('-C')
      if (port && port !== '22') parts.push(`-P ${port}`)
      if (identity) parts.push(`-i ${identity}`)
      if (dir === 'upload') {
        parts.push(local)
        parts.push(`${user}@${host}:${remote}`)
      } else {
        parts.push(`${user}@${host}:${remote}`)
        parts.push(local)
      }
      return { parts }
    },
  },
  {
    id: 'ssh-keygen',
    name: 'ssh-keygen',
    description: 'Generate a new SSH key pair',
    category: 'ssh',
    fields: [
      {
        id: 'type',
        label: 'Key type (-t)',
        type: 'select',
        options: [
          { value: 'ed25519', label: 'ed25519 (recommended, modern)' },
          { value: 'rsa', label: 'rsa (widely supported)' },
          { value: 'ecdsa', label: 'ecdsa' },
        ],
        default: 'ed25519',
        required: true,
      },
      { id: 'bits', label: 'Key bits (-b)', type: 'number', placeholder: '4096', helpText: 'Only for RSA keys', dependsOn: { field: 'type', value: 'rsa' } },
      { id: 'comment', label: 'Comment (-C)', type: 'text', placeholder: 'user@hostname or purpose' },
      { id: 'filename', label: 'Output file (-f)', type: 'text', placeholder: '~/.ssh/id_ed25519' },
      { id: 'noPassphrase', label: 'No passphrase (-N "")', type: 'checkbox', default: false },
    ],
    generate: (v) => {
      const keyType = s(v, 'type', 'ed25519')
      const parts = [`ssh-keygen -t ${keyType}`]
      const bits = s(v, 'bits')
      if (keyType === 'rsa' && bits) parts.push(`-b ${bits}`)
      const comment = s(v, 'comment')
      if (comment) parts.push(`-C "${comment}"`)
      const filename = s(v, 'filename')
      if (filename) parts.push(`-f ${filename}`)
      if (b(v, 'noPassphrase')) parts.push('-N ""')
      return { parts }
    },
  },
]
