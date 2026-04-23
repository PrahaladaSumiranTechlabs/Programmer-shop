import { Command, FormValues } from '../types'

const s = (v: FormValues, k: string, fb = '') => (v[k] as string) || fb
const b = (v: FormValues, k: string) => !!v[k]
const a = (v: FormValues, k: string): string[] => (v[k] as string[]) || []

export const windowsCommands: Command[] = [
  // ─── User & Group Management ──────────────────────────────────────────────
  {
    id: 'win-net-user',
    name: 'net user',
    description: 'Create, modify, or list local Windows user accounts',
    category: 'windows',
    fields: [
      {
        id: 'action',
        label: 'Action',
        type: 'select',
        options: [
          { value: 'list', label: 'List all users' },
          { value: 'create', label: 'Create user' },
          { value: 'delete', label: 'Delete user' },
          { value: 'setpassword', label: 'Set password' },
          { value: 'info', label: 'Show user details' },
          { value: 'activate', label: 'Activate / deactivate account' },
        ],
        default: 'list',
        required: true,
      },
      { id: 'username', label: 'Username', type: 'text', placeholder: 'john.doe' },
      { id: 'password', label: 'Password', type: 'text', placeholder: 'P@ssw0rd!', dependsOn: { field: 'action', value: 'create' } },
      { id: 'fullname', label: 'Full name (/fullname)', type: 'text', placeholder: 'John Doe', dependsOn: { field: 'action', value: 'create' } },
      { id: 'comment', label: 'Comment (/comment)', type: 'text', placeholder: 'Service account', dependsOn: { field: 'action', value: 'create' } },
      { id: 'active', label: 'Account state', type: 'select', options: [{ value: 'yes', label: 'Active (yes)' }, { value: 'no', label: 'Inactive (no)' }], default: 'yes', dependsOn: { field: 'action', value: 'activate' } },
      { id: 'passwordChangeDate', label: 'Password never expires (/passwordchg:no)', type: 'checkbox', default: false, dependsOn: { field: 'action', value: 'create' } },
    ],
    generate: (v) => {
      const action = s(v, 'action', 'list')
      const user = s(v, 'username')
      if (action === 'list') return { parts: ['net user'] }
      if (action === 'info') return { parts: [`net user ${user || '<username>'}`] }
      if (action === 'delete') return { parts: [`net user ${user || '<username>'} /delete`] }
      if (action === 'setpassword') return { parts: [`net user ${user || '<username>'} *`] }
      if (action === 'activate') return { parts: [`net user ${user || '<username>'} /active:${s(v, 'active', 'yes')}`] }
      // create
      const pw = s(v, 'password') || '*'
      const parts = [`net user ${user || '<username>'} ${pw} /add`]
      const fullname = s(v, 'fullname')
      if (fullname) parts.push(`/fullname:"${fullname}"`)
      const comment = s(v, 'comment')
      if (comment) parts.push(`/comment:"${comment}"`)
      if (b(v, 'passwordChangeDate')) parts.push('/passwordchg:no')
      return { parts }
    },
  },
  {
    id: 'win-net-localgroup',
    name: 'net localgroup',
    description: 'Manage local Windows groups and group membership',
    category: 'windows',
    fields: [
      {
        id: 'action',
        label: 'Action',
        type: 'select',
        options: [
          { value: 'list', label: 'List all groups' },
          { value: 'members', label: 'List group members' },
          { value: 'add-member', label: 'Add user to group' },
          { value: 'remove-member', label: 'Remove user from group' },
          { value: 'create', label: 'Create group' },
          { value: 'delete', label: 'Delete group' },
        ],
        default: 'list',
        required: true,
      },
      { id: 'group', label: 'Group name', type: 'text', placeholder: 'Administrators' },
      { id: 'username', label: 'Username', type: 'text', placeholder: 'DOMAIN\\john.doe or john.doe' },
    ],
    generate: (v) => {
      const action = s(v, 'action', 'list')
      const group = s(v, 'group') || '<group>'
      const user = s(v, 'username') || '<user>'
      switch (action) {
        case 'list': return { parts: ['net localgroup'] }
        case 'members': return { parts: [`net localgroup "${group}"`] }
        case 'add-member': return { parts: [`net localgroup "${group}" "${user}" /add`] }
        case 'remove-member': return { parts: [`net localgroup "${group}" "${user}" /delete`] }
        case 'create': return { parts: [`net localgroup "${group}" /add`] }
        case 'delete': return { parts: [`net localgroup "${group}" /delete`] }
        default: return { parts: ['net localgroup'] }
      }
    },
  },
  // ─── Service Management ───────────────────────────────────────────────────
  {
    id: 'win-sc',
    name: 'sc / net start',
    description: 'Control Windows services via sc.exe or net commands',
    category: 'windows',
    fields: [
      {
        id: 'tool',
        label: 'Tool',
        type: 'radio',
        options: [
          { value: 'sc', label: 'sc.exe (full control)' },
          { value: 'net', label: 'net start/stop (simple)' },
          { value: 'ps', label: 'PowerShell Get-Service' },
        ],
        default: 'sc',
        required: true,
      },
      {
        id: 'action',
        label: 'Action',
        type: 'select',
        options: [
          { value: 'query', label: 'query / list services' },
          { value: 'start', label: 'start' },
          { value: 'stop', label: 'stop' },
          { value: 'restart', label: 'stop then start' },
          { value: 'config', label: 'config (change startup type)' },
          { value: 'delete', label: 'delete service' },
          { value: 'create', label: 'create service' },
        ],
        default: 'query',
        required: true,
      },
      { id: 'service', label: 'Service name', type: 'text', placeholder: 'wuauserv' },
      {
        id: 'startType',
        label: 'Startup type',
        type: 'select',
        options: [
          { value: 'auto', label: 'auto (start at boot)' },
          { value: 'demand', label: 'demand (manual)' },
          { value: 'disabled', label: 'disabled' },
          { value: 'delayed-auto', label: 'delayed-auto' },
        ],
        default: 'auto',
        dependsOn: { field: 'action', value: 'config' },
      },
      { id: 'binPath', label: 'Binary path', type: 'text', placeholder: 'C:\\MyApp\\service.exe', dependsOn: { field: 'action', value: 'create' } },
    ],
    generate: (v) => {
      const tool = s(v, 'tool', 'sc')
      const action = s(v, 'action', 'query')
      const svc = s(v, 'service')

      if (tool === 'net') {
        if (action === 'start') return { parts: [`net start "${svc || '<service>'}"`] }
        if (action === 'stop') return { parts: [`net stop "${svc || '<service>'}"`] }
        if (action === 'restart') return { parts: [`net stop "${svc || '<service>'}" && net start "${svc || '<service>'}"`] }
        if (action === 'query') return { parts: ['net start'] }
        return { parts: ['net start'] }
      }
      if (tool === 'ps') {
        if (action === 'query') return { parts: ['Get-Service', svc ? `| Where-Object {$_.Name -like "*${svc}*"}` : '| Sort-Object Status'] }
        if (action === 'start') return { parts: [`Start-Service "${svc || '<service>'}"`] }
        if (action === 'stop') return { parts: [`Stop-Service "${svc || '<service>'}"`] }
        if (action === 'restart') return { parts: [`Restart-Service "${svc || '<service>'}"`] }
        return { parts: ['Get-Service'] }
      }
      // sc.exe
      if (action === 'query') return { parts: [`sc query${svc ? ` "${svc}"` : ' type= all state= all'}`] }
      if (action === 'start') return { parts: [`sc start "${svc || '<service>'}"`] }
      if (action === 'stop') return { parts: [`sc stop "${svc || '<service>'}"`] }
      if (action === 'restart') return { parts: [`sc stop "${svc || '<service>'}" && sc start "${svc || '<service>'}"`] }
      if (action === 'delete') return { parts: [`sc delete "${svc || '<service>'}"`] }
      if (action === 'config') return { parts: [`sc config "${svc || '<service>'}" start= ${s(v, 'startType', 'auto')}`] }
      if (action === 'create') {
        const bin = s(v, 'binPath') || '<C:\\path\\to\\service.exe>'
        return { parts: [`sc create "${svc || '<service>'}"`, `binPath= "${bin}"`, `start= auto`] }
      }
      return { parts: ['sc query'] }
    },
  },
  // ─── Process Management ───────────────────────────────────────────────────
  {
    id: 'win-tasklist',
    name: 'tasklist / taskkill',
    description: 'List running processes or kill them by name or PID',
    category: 'windows',
    fields: [
      {
        id: 'action',
        label: 'Action',
        type: 'radio',
        options: [
          { value: 'list', label: 'tasklist — list processes' },
          { value: 'kill', label: 'taskkill — kill process' },
        ],
        default: 'list',
        required: true,
      },
      { id: 'filter', label: 'Filter by name (list)', type: 'text', placeholder: 'node.exe', dependsOn: { field: 'action', value: 'list' } },
      { id: 'processName', label: 'Process name (/IM)', type: 'text', placeholder: 'node.exe', dependsOn: { field: 'action', value: 'kill' } },
      { id: 'pid', label: 'PID (/PID)', type: 'number', placeholder: '12345', dependsOn: { field: 'action', value: 'kill' } },
      { id: 'force', label: 'Force kill (/F)', type: 'checkbox', default: true, dependsOn: { field: 'action', value: 'kill' } },
      { id: 'tree', label: 'Kill process tree (/T)', type: 'checkbox', default: false, dependsOn: { field: 'action', value: 'kill' } },
      { id: 'verbose', label: 'Verbose output (/V)', type: 'checkbox', default: false, dependsOn: { field: 'action', value: 'list' } },
    ],
    generate: (v) => {
      const action = s(v, 'action', 'list')
      if (action === 'list') {
        const parts = ['tasklist']
        if (b(v, 'verbose')) parts.push('/V')
        const filter = s(v, 'filter')
        if (filter) parts.push(`/FI "IMAGENAME eq ${filter}"`)
        return { parts }
      } else {
        const parts = ['taskkill']
        const name = s(v, 'processName')
        const pid = s(v, 'pid')
        if (name) parts.push(`/IM "${name}"`)
        if (pid) parts.push(`/PID ${pid}`)
        if (b(v, 'force')) parts.push('/F')
        if (b(v, 'tree')) parts.push('/T')
        return { parts }
      }
    },
  },
  // ─── Network ──────────────────────────────────────────────────────────────
  {
    id: 'win-ipconfig',
    name: 'ipconfig / netstat',
    description: 'View and manage Windows network configuration',
    category: 'windows',
    fields: [
      {
        id: 'tool',
        label: 'Tool',
        type: 'select',
        options: [
          { value: 'ipconfig', label: 'ipconfig — show IP config' },
          { value: 'ipconfig-all', label: 'ipconfig /all — full details' },
          { value: 'ipconfig-flush', label: 'ipconfig /flushdns — clear DNS cache' },
          { value: 'ipconfig-release', label: 'ipconfig /release + /renew — DHCP refresh' },
          { value: 'netstat', label: 'netstat — connections' },
          { value: 'netstat-port', label: 'netstat — find port' },
          { value: 'arp', label: 'arp -a — ARP table' },
          { value: 'route', label: 'route print — routing table' },
        ],
        default: 'ipconfig',
        required: true,
      },
      { id: 'port', label: 'Port number', type: 'number', placeholder: '8080', dependsOn: { field: 'tool', value: 'netstat-port' } },
    ],
    generate: (v) => {
      const tool = s(v, 'tool', 'ipconfig')
      switch (tool) {
        case 'ipconfig': return { parts: ['ipconfig'] }
        case 'ipconfig-all': return { parts: ['ipconfig /all'] }
        case 'ipconfig-flush': return { parts: ['ipconfig /flushdns'] }
        case 'ipconfig-release': return { parts: ['ipconfig /release', '&& ipconfig /renew'] }
        case 'netstat': return { parts: ['netstat -ano'] }
        case 'netstat-port': {
          const port = s(v, 'port') || '<port>'
          return { parts: [`netstat -ano | findstr :${port}`] }
        }
        case 'arp': return { parts: ['arp -a'] }
        case 'route': return { parts: ['route print'] }
        default: return { parts: ['ipconfig'] }
      }
    },
  },
  {
    id: 'win-netsh',
    name: 'netsh',
    description: 'Windows network configuration — firewall, Wi-Fi, interfaces',
    category: 'windows',
    fields: [
      {
        id: 'mode',
        label: 'Operation',
        type: 'select',
        options: [
          { value: 'fw-list', label: 'Firewall — list rules' },
          { value: 'fw-allow-port', label: 'Firewall — allow port' },
          { value: 'fw-block-port', label: 'Firewall — block port' },
          { value: 'fw-delete', label: 'Firewall — delete rule' },
          { value: 'fw-on', label: 'Firewall — turn on' },
          { value: 'fw-off', label: 'Firewall — turn off (⚠️)' },
          { value: 'wifi-list', label: 'Wi-Fi — list profiles' },
          { value: 'wifi-password', label: 'Wi-Fi — show saved password' },
          { value: 'wifi-delete', label: 'Wi-Fi — delete profile' },
          { value: 'interface-list', label: 'Interface — list adapters' },
          { value: 'portproxy-add', label: 'Port proxy — forward port' },
          { value: 'portproxy-list', label: 'Port proxy — list rules' },
        ],
        default: 'fw-allow-port',
        required: true,
      },
      { id: 'ruleName', label: 'Rule name', type: 'text', placeholder: 'Allow NodeJS Port 3000' },
      { id: 'port', label: 'Port', type: 'number', placeholder: '3000' },
      { id: 'protocol', label: 'Protocol', type: 'select', options: [{ value: 'TCP', label: 'TCP' }, { value: 'UDP', label: 'UDP' }, { value: 'ANY', label: 'Any' }], default: 'TCP' },
      { id: 'direction', label: 'Direction', type: 'select', options: [{ value: 'in', label: 'Inbound' }, { value: 'out', label: 'Outbound' }], default: 'in' },
      { id: 'profile', label: 'Firewall profile', type: 'select', options: [{ value: 'any', label: 'All profiles' }, { value: 'domain', label: 'Domain' }, { value: 'private', label: 'Private' }, { value: 'public', label: 'Public' }], default: 'any' },
      { id: 'wifiProfile', label: 'Wi-Fi profile name', type: 'text', placeholder: 'MyWiFiNetwork' },
      { id: 'listenAddr', label: 'Listen address', type: 'text', placeholder: '0.0.0.0', dependsOn: { field: 'mode', value: 'portproxy-add' } },
      { id: 'listenPort', label: 'Listen port', type: 'number', placeholder: '80', dependsOn: { field: 'mode', value: 'portproxy-add' } },
      { id: 'connectAddr', label: 'Forward to address', type: 'text', placeholder: '192.168.1.10', dependsOn: { field: 'mode', value: 'portproxy-add' } },
      { id: 'connectPort', label: 'Forward to port', type: 'number', placeholder: '8080', dependsOn: { field: 'mode', value: 'portproxy-add' } },
    ],
    generate: (v) => {
      const mode = s(v, 'mode', 'fw-allow-port')
      const name = s(v, 'ruleName') || '<rule-name>'
      const port = s(v, 'port') || '<port>'
      const proto = s(v, 'protocol', 'TCP')
      const dir = s(v, 'direction', 'in')
      const profile = s(v, 'profile', 'any')
      switch (mode) {
        case 'fw-list': return { parts: ['netsh advfirewall firewall show rule name=all'] }
        case 'fw-allow-port': return { parts: [`netsh advfirewall firewall add rule`, `name="${name}"`, `protocol=${proto}`, `dir=${dir}`, `localport=${port}`, `action=allow`, `profile=${profile}`] }
        case 'fw-block-port': return { parts: [`netsh advfirewall firewall add rule`, `name="${name}"`, `protocol=${proto}`, `dir=${dir}`, `localport=${port}`, `action=block`, `profile=${profile}`] }
        case 'fw-delete': return { parts: [`netsh advfirewall firewall delete rule name="${name}"`] }
        case 'fw-on': return { parts: ['netsh advfirewall set allprofiles state on'] }
        case 'fw-off': return { parts: ['netsh advfirewall set allprofiles state off'] }
        case 'wifi-list': return { parts: ['netsh wlan show profiles'] }
        case 'wifi-password': return { parts: [`netsh wlan show profile name="${s(v, 'wifiProfile') || '<profile>'}" key=clear`] }
        case 'wifi-delete': return { parts: [`netsh wlan delete profile name="${s(v, 'wifiProfile') || '<profile>'}"`] }
        case 'interface-list': return { parts: ['netsh interface show interface'] }
        case 'portproxy-add': return { parts: [`netsh interface portproxy add v4tov4`, `listenaddress=${s(v, 'listenAddr', '0.0.0.0')}`, `listenport=${s(v, 'listenPort') || '<listen-port>'}`, `connectaddress=${s(v, 'connectAddr') || '<target-ip>'}`, `connectport=${s(v, 'connectPort') || '<target-port>'}`] }
        case 'portproxy-list': return { parts: ['netsh interface portproxy show all'] }
        default: return { parts: ['netsh'] }
      }
    },
  },
  // ─── File & Permission Management ─────────────────────────────────────────
  {
    id: 'win-robocopy',
    name: 'robocopy',
    description: 'Robust file copy — mirror directories, sync, resume interrupted transfers',
    category: 'windows',
    fields: [
      { id: 'source', label: 'Source path', type: 'text', placeholder: 'C:\\source\\folder', required: true },
      { id: 'dest', label: 'Destination path', type: 'text', placeholder: 'D:\\backup\\folder or \\\\server\\share', required: true },
      { id: 'files', label: 'File filter', type: 'text', placeholder: '*.* or *.log', default: '*.*' },
      {
        id: 'mode',
        label: 'Copy mode',
        type: 'select',
        options: [
          { value: '/E', label: '/E — copy all subdirs (including empty)' },
          { value: '/S', label: '/S — copy subdirs (excluding empty)' },
          { value: '/MIR', label: '/MIR — mirror (delete extras in dest)' },
          { value: '/MOVE', label: '/MOVE — move files (delete source after)' },
          { value: '', label: 'Single directory only' },
        ],
        default: '/E',
      },
      { id: 'restartable', label: 'Restartable mode (/Z)', type: 'checkbox', default: false },
      { id: 'backup', label: 'Backup mode (/B)', type: 'checkbox', default: false },
      { id: 'logFile', label: 'Log to file (/LOG)', type: 'text', placeholder: 'C:\\robocopy.log' },
      { id: 'excludeDirs', label: 'Exclude directories (/XD)', type: 'multi-text', placeholder: 'node_modules' },
      { id: 'excludeFiles', label: 'Exclude files (/XF)', type: 'multi-text', placeholder: '*.tmp' },
      { id: 'retries', label: 'Retries (/R)', type: 'number', placeholder: '3', default: '3' },
      { id: 'threads', label: 'Parallel threads (/MT)', type: 'number', placeholder: '8' },
    ],
    generate: (v) => {
      const src = s(v, 'source') || '<source>'
      const dst = s(v, 'dest') || '<destination>'
      const files = s(v, 'files', '*.*')
      const mode = s(v, 'mode', '/E')
      const parts = [`robocopy "${src}" "${dst}" ${files}`]
      if (mode) parts.push(mode)
      if (b(v, 'restartable')) parts.push('/Z')
      if (b(v, 'backup')) parts.push('/B')
      const retries = s(v, 'retries', '3')
      if (retries) parts.push(`/R:${retries} /W:5`)
      const threads = s(v, 'threads')
      if (threads) parts.push(`/MT:${threads}`)
      a(v, 'excludeDirs').filter(Boolean).forEach(d => parts.push(`/XD "${d}"`))
      a(v, 'excludeFiles').filter(Boolean).forEach(f => parts.push(`/XF "${f}"`))
      const log = s(v, 'logFile')
      if (log) parts.push(`/LOG:"${log}"`)
      return { parts }
    },
  },
  {
    id: 'win-icacls',
    name: 'icacls',
    description: 'View and modify NTFS file/folder permissions (ACLs)',
    category: 'windows',
    fields: [
      {
        id: 'action',
        label: 'Action',
        type: 'select',
        options: [
          { value: 'view', label: 'View permissions' },
          { value: 'grant', label: 'Grant permissions' },
          { value: 'deny', label: 'Deny permissions' },
          { value: 'remove', label: 'Remove user permissions' },
          { value: 'reset', label: 'Reset to inherited' },
          { value: 'take-ownership', label: 'Take ownership (takeown)' },
        ],
        default: 'view',
        required: true,
      },
      { id: 'path', label: 'File / folder path', type: 'text', placeholder: 'C:\\inetpub\\wwwroot', required: true },
      { id: 'user', label: 'User / group', type: 'text', placeholder: 'Everyone or DOMAIN\\user or IIS_IUSRS' },
      {
        id: 'permission',
        label: 'Permission',
        type: 'select',
        options: [
          { value: '(F)', label: '(F) Full control' },
          { value: '(M)', label: '(M) Modify' },
          { value: '(RX)', label: '(RX) Read & execute' },
          { value: '(R)', label: '(R) Read only' },
          { value: '(W)', label: '(W) Write' },
          { value: '(OI)(CI)(F)', label: '(OI)(CI)(F) Full incl. subfolders' },
          { value: '(OI)(CI)(M)', label: '(OI)(CI)(M) Modify incl. subfolders' },
        ],
        default: '(RX)',
      },
      { id: 'inherit', label: 'Apply to subfolders & files (/T)', type: 'checkbox', default: true },
    ],
    generate: (v) => {
      const action = s(v, 'action', 'view')
      const path = s(v, 'path') || '<path>'
      const user = s(v, 'user') || '<user>'
      const perm = s(v, 'permission', '(RX)')
      const t = b(v, 'inherit') ? ' /T' : ''
      switch (action) {
        case 'view': return { parts: [`icacls "${path}"`] }
        case 'grant': return { parts: [`icacls "${path}" /grant "${user}":${perm}${t}`] }
        case 'deny': return { parts: [`icacls "${path}" /deny "${user}":${perm}${t}`] }
        case 'remove': return { parts: [`icacls "${path}" /remove "${user}"${t}`] }
        case 'reset': return { parts: [`icacls "${path}" /reset${t}`] }
        case 'take-ownership': return { parts: [`takeown /f "${path}" /r /d y`] }
        default: return { parts: [`icacls "${path}"`] }
      }
    },
  },
  {
    id: 'win-mklink',
    name: 'mklink',
    description: 'Create symbolic or hard links on Windows (run as Admin)',
    category: 'windows',
    fields: [
      {
        id: 'type',
        label: 'Link type',
        type: 'select',
        options: [
          { value: '', label: 'Symbolic link (file)' },
          { value: '/D', label: '/D — Symbolic link (directory)' },
          { value: '/H', label: '/H — Hard link (file)' },
          { value: '/J', label: '/J — Junction (directory)' },
        ],
        default: '/D',
        required: true,
      },
      { id: 'link', label: 'Link path (new)', type: 'text', placeholder: 'C:\\app\\current', required: true },
      { id: 'target', label: 'Target path (existing)', type: 'text', placeholder: 'C:\\app\\v2.1.0', required: true },
    ],
    generate: (v) => {
      const type = s(v, 'type', '/D')
      const link = s(v, 'link') || '<link>'
      const target = s(v, 'target') || '<target>'
      const parts = ['mklink']
      if (type) parts.push(type)
      parts.push(`"${link}"`)
      parts.push(`"${target}"`)
      return { parts }
    },
  },
  // ─── Registry ─────────────────────────────────────────────────────────────
  {
    id: 'win-reg',
    name: 'reg',
    description: 'Query, add, delete or export Windows registry keys',
    category: 'windows',
    fields: [
      {
        id: 'action',
        label: 'Action',
        type: 'select',
        options: [
          { value: 'query', label: 'query — read a key/value' },
          { value: 'add', label: 'add — set a value' },
          { value: 'delete', label: 'delete — remove key or value' },
          { value: 'export', label: 'export — backup key to .reg file' },
          { value: 'import', label: 'import — restore from .reg file' },
          { value: 'copy', label: 'copy — copy key tree' },
        ],
        default: 'query',
        required: true,
      },
      { id: 'key', label: 'Registry key', type: 'text', placeholder: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\MyApp', required: true },
      { id: 'valueName', label: 'Value name (/v)', type: 'text', placeholder: 'InstallPath' },
      { id: 'valueData', label: 'Value data (/d)', type: 'text', placeholder: 'C:\\Program Files\\MyApp', dependsOn: { field: 'action', value: 'add' } },
      {
        id: 'valueType',
        label: 'Value type (/t)',
        type: 'select',
        options: [
          { value: 'REG_SZ', label: 'REG_SZ (string)' },
          { value: 'REG_DWORD', label: 'REG_DWORD (number)' },
          { value: 'REG_EXPAND_SZ', label: 'REG_EXPAND_SZ (expandable string)' },
          { value: 'REG_BINARY', label: 'REG_BINARY' },
          { value: 'REG_MULTI_SZ', label: 'REG_MULTI_SZ (multi-string)' },
        ],
        default: 'REG_SZ',
        dependsOn: { field: 'action', value: 'add' },
      },
      { id: 'file', label: '.reg file path', type: 'text', placeholder: 'C:\\backup\\myapp.reg' },
      { id: 'recursive', label: 'Recursive (/s)', type: 'checkbox', default: false },
      { id: 'force', label: 'Force without prompt (/f)', type: 'checkbox', default: false },
    ],
    generate: (v) => {
      const action = s(v, 'action', 'query')
      const key = s(v, 'key') || '<HKLM\\...>'
      const valName = s(v, 'valueName')
      const recursive = b(v, 'recursive')
      const force = b(v, 'force')
      switch (action) {
        case 'query': {
          const parts = [`reg query "${key}"`]
          if (valName) parts.push(`/v "${valName}"`)
          if (recursive) parts.push('/s')
          return { parts }
        }
        case 'add': {
          const parts = [`reg add "${key}"`]
          if (valName) parts.push(`/v "${valName}"`)
          parts.push(`/t ${s(v, 'valueType', 'REG_SZ')}`)
          const data = s(v, 'valueData')
          if (data) parts.push(`/d "${data}"`)
          if (force) parts.push('/f')
          return { parts }
        }
        case 'delete': {
          const parts = [`reg delete "${key}"`]
          if (valName) parts.push(`/v "${valName}"`)
          if (recursive) parts.push('/s')
          if (force) parts.push('/f')
          return { parts }
        }
        case 'export': return { parts: [`reg export "${key}" "${s(v, 'file') || '<output.reg>'}"`] }
        case 'import': return { parts: [`reg import "${s(v, 'file') || '<file.reg>'}"`] }
        case 'copy': return { parts: [`reg copy "${key}" "<destination-key>" /s`] }
        default: return { parts: [`reg ${action} "${key}"`] }
      }
    },
  },
  // ─── Scheduled Tasks ──────────────────────────────────────────────────────
  {
    id: 'win-schtasks',
    name: 'schtasks',
    description: 'Create, view, run and delete Windows scheduled tasks',
    category: 'windows',
    fields: [
      {
        id: 'action',
        label: 'Action',
        type: 'select',
        options: [
          { value: '/query', label: 'query — list tasks' },
          { value: '/create', label: 'create — new task' },
          { value: '/delete', label: 'delete — remove task' },
          { value: '/run', label: 'run — trigger immediately' },
          { value: '/end', label: 'end — stop running task' },
          { value: '/change', label: 'change — modify task' },
        ],
        default: '/query',
        required: true,
      },
      { id: 'taskName', label: 'Task name (/TN)', type: 'text', placeholder: '\\MyApp\\DailyBackup' },
      { id: 'command', label: 'Program to run (/TR)', type: 'text', placeholder: 'C:\\scripts\\backup.ps1', dependsOn: { field: 'action', value: '/create' } },
      {
        id: 'schedule',
        label: 'Schedule (/SC)',
        type: 'select',
        options: [
          { value: 'DAILY', label: 'Daily' },
          { value: 'WEEKLY', label: 'Weekly' },
          { value: 'MONTHLY', label: 'Monthly' },
          { value: 'HOURLY', label: 'Hourly' },
          { value: 'MINUTE', label: 'Every N minutes' },
          { value: 'ONSTART', label: 'On system startup' },
          { value: 'ONLOGON', label: 'On user logon' },
          { value: 'ONCE', label: 'Once' },
        ],
        default: 'DAILY',
        dependsOn: { field: 'action', value: '/create' },
      },
      { id: 'startTime', label: 'Start time (/ST)', type: 'text', placeholder: '02:00', helpText: 'Format: HH:MM (24h)', dependsOn: { field: 'action', value: '/create' } },
      { id: 'runAs', label: 'Run as user (/RU)', type: 'text', placeholder: 'SYSTEM or DOMAIN\\user', dependsOn: { field: 'action', value: '/create' } },
      { id: 'force', label: 'Force overwrite (/F)', type: 'checkbox', default: true, dependsOn: { field: 'action', value: '/create' } },
    ],
    generate: (v) => {
      const action = s(v, 'action', '/query')
      const task = s(v, 'taskName')
      if (action === '/query') return { parts: [`schtasks /query /FO LIST${task ? ` /TN "${task}"` : ''}`] }
      if (action === '/run') return { parts: [`schtasks /run /TN "${task || '<task>'}"`] }
      if (action === '/end') return { parts: [`schtasks /end /TN "${task || '<task>'}"`] }
      if (action === '/delete') return { parts: [`schtasks /delete /TN "${task || '<task>'}" /F`] }
      if (action === '/create') {
        const parts = ['schtasks /create']
        parts.push(`/TN "${task || '<task-name>'}"`)
        parts.push(`/TR "${s(v, 'command') || '<command>'}"`)
        parts.push(`/SC ${s(v, 'schedule', 'DAILY')}`)
        const st = s(v, 'startTime')
        if (st) parts.push(`/ST ${st}`)
        const ru = s(v, 'runAs')
        if (ru) parts.push(`/RU "${ru}"`)
        if (b(v, 'force')) parts.push('/F')
        return { parts }
      }
      return { parts: [`schtasks ${action}`] }
    },
  },
  // ─── Event Logs ───────────────────────────────────────────────────────────
  {
    id: 'win-eventlog',
    name: 'wevtutil / Get-EventLog',
    description: 'Query Windows Event Logs from CMD or PowerShell',
    category: 'windows',
    fields: [
      {
        id: 'tool',
        label: 'Tool',
        type: 'radio',
        options: [
          { value: 'wevtutil', label: 'wevtutil (CMD)' },
          { value: 'ps', label: 'Get-WinEvent (PowerShell)' },
        ],
        default: 'wevtutil',
        required: true,
      },
      {
        id: 'log',
        label: 'Log name',
        type: 'select',
        options: [
          { value: 'System', label: 'System' },
          { value: 'Application', label: 'Application' },
          { value: 'Security', label: 'Security' },
          { value: 'Microsoft-Windows-IIS-Logging/Logs', label: 'IIS' },
          { value: 'Microsoft-Windows-PowerShell/Operational', label: 'PowerShell' },
          { value: 'Microsoft-Windows-Hyper-V-Worker', label: 'Hyper-V' },
        ],
        default: 'System',
        required: true,
      },
      { id: 'count', label: 'Max events (/c or -MaxEvents)', type: 'number', placeholder: '50', default: '50' },
      {
        id: 'level',
        label: 'Severity level',
        type: 'select',
        options: [
          { value: '', label: 'All' },
          { value: '1', label: '1 — Critical' },
          { value: '2', label: '2 — Error' },
          { value: '3', label: '3 — Warning' },
          { value: '4', label: '4 — Information' },
        ],
        default: '2',
      },
      { id: 'eventId', label: 'Filter by Event ID', type: 'number', placeholder: '4625' },
    ],
    generate: (v) => {
      const tool = s(v, 'tool', 'wevtutil')
      const log = s(v, 'log', 'System')
      const count = s(v, 'count', '50')
      const level = s(v, 'level')
      const eventId = s(v, 'eventId')
      if (tool === 'wevtutil') {
        let query = '*'
        const conditions: string[] = []
        if (level) conditions.push(`Level=${level}`)
        if (eventId) conditions.push(`EventID=${eventId}`)
        if (conditions.length) query = `*[System[(${conditions.join(' and ')})]]`
        return { parts: [`wevtutil qe ${log}`, `/q:"${query}"`, `/c:${count}`, `/rd:true`, `/f:text`] }
      } else {
        const parts = [`Get-WinEvent -LogName "${log}" -MaxEvents ${count}`]
        const filters: string[] = []
        if (level) filters.push(`$_.Level -eq ${level}`)
        if (eventId) filters.push(`$_.Id -eq ${eventId}`)
        if (filters.length) parts.push(`| Where-Object {${filters.join(' -and ')}}`)
        parts.push('| Format-List TimeCreated, Id, LevelDisplayName, Message')
        return { parts }
      }
    },
  },
  // ─── PowerShell Utilities ─────────────────────────────────────────────────
  {
    id: 'win-powershell-exec',
    name: 'PowerShell exec policy',
    description: 'Set PowerShell execution policy to allow scripts to run',
    category: 'windows',
    fields: [
      {
        id: 'policy',
        label: 'Execution policy',
        type: 'select',
        options: [
          { value: 'RemoteSigned', label: 'RemoteSigned — run local scripts, sign remote (recommended)' },
          { value: 'Unrestricted', label: 'Unrestricted — run all scripts' },
          { value: 'Bypass', label: 'Bypass — no restriction, no prompt' },
          { value: 'Restricted', label: 'Restricted — no scripts allowed' },
          { value: 'AllSigned', label: 'AllSigned — all scripts must be signed' },
        ],
        default: 'RemoteSigned',
        required: true,
      },
      {
        id: 'scope',
        label: 'Scope',
        type: 'select',
        options: [
          { value: 'CurrentUser', label: 'CurrentUser' },
          { value: 'LocalMachine', label: 'LocalMachine (requires Admin)' },
          { value: 'Process', label: 'Process (current session only)' },
        ],
        default: 'CurrentUser',
        required: true,
      },
    ],
    generate: (v) => {
      const policy = s(v, 'policy', 'RemoteSigned')
      const scope = s(v, 'scope', 'CurrentUser')
      return { parts: [`Set-ExecutionPolicy -ExecutionPolicy ${policy}`, `-Scope ${scope} -Force`] }
    },
  },
  {
    id: 'win-invoke-webrequest',
    name: 'Invoke-WebRequest',
    description: 'HTTP requests from PowerShell (curl equivalent)',
    category: 'windows',
    fields: [
      { id: 'url', label: 'URL', type: 'text', placeholder: 'https://api.example.com/data', required: true },
      {
        id: 'method',
        label: 'Method',
        type: 'select',
        options: [
          { value: 'GET', label: 'GET' },
          { value: 'POST', label: 'POST' },
          { value: 'PUT', label: 'PUT' },
          { value: 'DELETE', label: 'DELETE' },
          { value: 'PATCH', label: 'PATCH' },
        ],
        default: 'GET',
      },
      { id: 'body', label: 'Request body (-Body)', type: 'textarea', placeholder: '{"key": "value"}' },
      { id: 'contentType', label: 'Content-Type', type: 'text', placeholder: 'application/json', default: 'application/json' },
      { id: 'headers', label: 'Headers (-Headers)', type: 'multi-text', placeholder: 'Authorization=Bearer <token>' },
      { id: 'outFile', label: 'Save to file (-OutFile)', type: 'text', placeholder: 'C:\\downloads\\file.zip' },
      { id: 'useBasicParsing', label: 'Use basic parsing (-UseBasicParsing)', type: 'checkbox', default: true },
    ],
    generate: (v) => {
      const url = s(v, 'url') || '<url>'
      const method = s(v, 'method', 'GET')
      const parts = ['Invoke-WebRequest']
      parts.push(`-Uri "${url}"`)
      if (method !== 'GET') parts.push(`-Method ${method}`)
      const ct = s(v, 'contentType', 'application/json')
      if (ct) parts.push(`-ContentType "${ct}"`)
      const headers = a(v, 'headers').filter(Boolean)
      if (headers.length) {
        const hObj = headers.map(h => h.replace('=', "='") + "'").join('; ')
        parts.push(`-Headers @{${hObj}}`)
      }
      const body = s(v, 'body')
      if (body) parts.push(`-Body '${body}'`)
      const out = s(v, 'outFile')
      if (out) parts.push(`-OutFile "${out}"`)
      if (b(v, 'useBasicParsing')) parts.push('-UseBasicParsing')
      return { parts }
    },
  },
  // ─── Disk & System Repair ─────────────────────────────────────────────────
  {
    id: 'win-disk',
    name: 'diskpart / chkdsk / sfc',
    description: 'Windows disk management and system file repair tools',
    category: 'windows',
    fields: [
      {
        id: 'tool',
        label: 'Tool',
        type: 'select',
        options: [
          { value: 'diskpart-list', label: 'diskpart — list volumes' },
          { value: 'diskpart-clean', label: 'diskpart — clean a disk ⚠️' },
          { value: 'chkdsk', label: 'chkdsk — check & repair disk' },
          { value: 'sfc', label: 'sfc /scannow — repair system files' },
          { value: 'dism-health', label: 'DISM — check image health' },
          { value: 'dism-repair', label: 'DISM — repair image (online)' },
        ],
        default: 'chkdsk',
        required: true,
      },
      { id: 'drive', label: 'Drive letter', type: 'text', placeholder: 'C:', helpText: 'e.g. C: or D:' },
      { id: 'fix', label: 'Fix errors (/F)', type: 'checkbox', default: false, dependsOn: { field: 'tool', value: 'chkdsk' } },
      { id: 'recover', label: 'Recover bad sectors (/R)', type: 'checkbox', default: false, dependsOn: { field: 'tool', value: 'chkdsk' } },
    ],
    generate: (v) => {
      const tool = s(v, 'tool', 'chkdsk')
      const drive = s(v, 'drive', 'C:')
      switch (tool) {
        case 'diskpart-list': return { parts: ['echo list volume | diskpart'] }
        case 'diskpart-clean': return { parts: ['diskpart\nlist disk\nselect disk <N>\nclean\ncreate partition primary\nformat fs=ntfs quick\nassign'] }
        case 'chkdsk': {
          const parts = [`chkdsk ${drive}`]
          if (b(v, 'fix')) parts.push('/F')
          if (b(v, 'recover')) parts.push('/R')
          return { parts }
        }
        case 'sfc': return { parts: ['sfc /scannow'] }
        case 'dism-health': return { parts: ['DISM /Online /Cleanup-Image /CheckHealth'] }
        case 'dism-repair': return { parts: ['DISM /Online /Cleanup-Image /RestoreHealth'] }
        default: return { parts: ['chkdsk'] }
      }
    },
  },
  // ─── IIS ──────────────────────────────────────────────────────────────────
  {
    id: 'win-iis',
    name: 'IIS (iisreset / appcmd)',
    description: 'Manage Internet Information Services (IIS) web server',
    category: 'windows',
    fields: [
      {
        id: 'action',
        label: 'Action',
        type: 'select',
        options: [
          { value: 'iisreset', label: 'iisreset — restart IIS' },
          { value: 'iisreset-stop', label: 'iisreset /stop' },
          { value: 'iisreset-start', label: 'iisreset /start' },
          { value: 'list-sites', label: 'appcmd — list sites' },
          { value: 'list-pools', label: 'appcmd — list app pools' },
          { value: 'start-site', label: 'appcmd — start site' },
          { value: 'stop-site', label: 'appcmd — stop site' },
          { value: 'recycle-pool', label: 'appcmd — recycle app pool' },
          { value: 'start-pool', label: 'appcmd — start app pool' },
          { value: 'stop-pool', label: 'appcmd — stop app pool' },
        ],
        default: 'iisreset',
        required: true,
      },
      { id: 'siteName', label: 'Site name', type: 'text', placeholder: 'Default Web Site' },
      { id: 'poolName', label: 'App Pool name', type: 'text', placeholder: 'DefaultAppPool' },
    ],
    generate: (v) => {
      const action = s(v, 'action', 'iisreset')
      const site = s(v, 'siteName') || '<site>'
      const pool = s(v, 'poolName') || '<pool>'
      switch (action) {
        case 'iisreset': return { parts: ['iisreset'] }
        case 'iisreset-stop': return { parts: ['iisreset /stop'] }
        case 'iisreset-start': return { parts: ['iisreset /start'] }
        case 'list-sites': return { parts: ['%windir%\\system32\\inetsrv\\appcmd list site'] }
        case 'list-pools': return { parts: ['%windir%\\system32\\inetsrv\\appcmd list apppool'] }
        case 'start-site': return { parts: [`%windir%\\system32\\inetsrv\\appcmd start site /site.name:"${site}"`] }
        case 'stop-site': return { parts: [`%windir%\\system32\\inetsrv\\appcmd stop site /site.name:"${site}"`] }
        case 'recycle-pool': return { parts: [`%windir%\\system32\\inetsrv\\appcmd recycle apppool /apppool.name:"${pool}"`] }
        case 'start-pool': return { parts: [`%windir%\\system32\\inetsrv\\appcmd start apppool /apppool.name:"${pool}"`] }
        case 'stop-pool': return { parts: [`%windir%\\system32\\inetsrv\\appcmd stop apppool /apppool.name:"${pool}"`] }
        default: return { parts: ['iisreset'] }
      }
    },
  },
  // ─── Remote ───────────────────────────────────────────────────────────────
  {
    id: 'win-remote',
    name: 'WinRM / mstsc / psexec',
    description: 'Remote management — RDP, WinRM sessions, PsExec',
    category: 'windows',
    fields: [
      {
        id: 'tool',
        label: 'Tool',
        type: 'select',
        options: [
          { value: 'mstsc', label: 'mstsc — Remote Desktop (RDP)' },
          { value: 'winrm-enable', label: 'WinRM — enable on this machine' },
          { value: 'winrm-test', label: 'WinRM — test connection to remote' },
          { value: 'enter-pssession', label: 'Enter-PSSession — PowerShell remoting' },
          { value: 'invoke-command', label: 'Invoke-Command — run command remotely' },
          { value: 'psexec', label: 'PsExec — run command on remote (Sysinternals)' },
        ],
        default: 'mstsc',
        required: true,
      },
      { id: 'host', label: 'Remote host / IP', type: 'text', placeholder: '192.168.1.10 or server.domain.com' },
      { id: 'user', label: 'Username', type: 'text', placeholder: 'DOMAIN\\Administrator' },
      { id: 'port', label: 'RDP port', type: 'number', placeholder: '3389', default: '3389', dependsOn: { field: 'tool', value: 'mstsc' } },
      { id: 'fullscreen', label: 'Full screen (/f)', type: 'checkbox', default: false, dependsOn: { field: 'tool', value: 'mstsc' } },
      { id: 'remoteCommand', label: 'Command to run remotely', type: 'text', placeholder: 'ipconfig /all' },
    ],
    generate: (v) => {
      const tool = s(v, 'tool', 'mstsc')
      const host = s(v, 'host') || '<host>'
      const user = s(v, 'user')
      const cmd = s(v, 'remoteCommand') || '<command>'
      switch (tool) {
        case 'mstsc': {
          const port = s(v, 'port', '3389')
          const parts = [`mstsc /v:${host}${port !== '3389' ? `:${port}` : ''}`]
          if (b(v, 'fullscreen')) parts.push('/f')
          return { parts }
        }
        case 'winrm-enable': return { parts: ['winrm quickconfig -y'] }
        case 'winrm-test': return { parts: [`winrm identify -r:http://${host}:5985/wsman`] }
        case 'enter-pssession': {
          const parts = [`Enter-PSSession -ComputerName ${host}`]
          if (user) parts.push(`-Credential "${user}"`)
          return { parts }
        }
        case 'invoke-command': {
          const parts = [`Invoke-Command -ComputerName ${host}`]
          if (user) parts.push(`-Credential "${user}"`)
          parts.push(`-ScriptBlock { ${cmd} }`)
          return { parts }
        }
        case 'psexec': {
          const parts = [`psexec \\\\${host}`]
          if (user) parts.push(`-u "${user}"`)
          parts.push(cmd)
          return { parts }
        }
        default: return { parts: ['mstsc'] }
      }
    },
  },
  // ─── Environment Variables ────────────────────────────────────────────────
  {
    id: 'win-env',
    name: 'Environment variables',
    description: 'View and set Windows environment variables via CMD or PowerShell',
    category: 'windows',
    fields: [
      {
        id: 'tool',
        label: 'Tool',
        type: 'radio',
        options: [
          { value: 'cmd', label: 'CMD (set / setx)' },
          { value: 'ps', label: 'PowerShell' },
        ],
        default: 'cmd',
        required: true,
      },
      {
        id: 'action',
        label: 'Action',
        type: 'select',
        options: [
          { value: 'list', label: 'List all' },
          { value: 'get', label: 'Get value' },
          { value: 'set-session', label: 'Set (current session only)' },
          { value: 'set-permanent', label: 'Set permanently (system-wide)' },
          { value: 'delete', label: 'Delete variable' },
        ],
        default: 'set-session',
        required: true,
      },
      { id: 'name', label: 'Variable name', type: 'text', placeholder: 'DATABASE_URL' },
      { id: 'value', label: 'Value', type: 'text', placeholder: 'postgres://localhost:5432/mydb' },
      {
        id: 'scope',
        label: 'Scope (PowerShell)',
        type: 'select',
        options: [
          { value: 'User', label: 'User' },
          { value: 'Machine', label: 'Machine (requires Admin)' },
          { value: 'Process', label: 'Process (current session)' },
        ],
        default: 'User',
        dependsOn: { field: 'tool', value: 'ps' },
      },
    ],
    generate: (v) => {
      const tool = s(v, 'tool', 'cmd')
      const action = s(v, 'action', 'set-session')
      const name = s(v, 'name') || '<VAR_NAME>'
      const value = s(v, 'value') || '<value>'
      const scope = s(v, 'scope', 'User')
      if (tool === 'cmd') {
        switch (action) {
          case 'list': return { parts: ['set'] }
          case 'get': return { parts: [`echo %${name}%`] }
          case 'set-session': return { parts: [`set ${name}=${value}`] }
          case 'set-permanent': return { parts: [`setx ${name} "${value}"`] }
          case 'delete': return { parts: [`reg delete "HKCU\\Environment" /v ${name} /f`] }
        }
      } else {
        switch (action) {
          case 'list': return { parts: ['Get-ChildItem Env:'] }
          case 'get': return { parts: [`$env:${name}`] }
          case 'set-session': return { parts: [`$env:${name} = "${value}"`] }
          case 'set-permanent': return { parts: [`[System.Environment]::SetEnvironmentVariable("${name}", "${value}", "${scope}")`] }
          case 'delete': return { parts: [`[System.Environment]::SetEnvironmentVariable("${name}", $null, "${scope}")`] }
        }
      }
      return { parts: ['set'] }
    },
  },
  // ─── certutil ─────────────────────────────────────────────────────────────
  {
    id: 'win-certutil',
    name: 'certutil',
    description: 'Windows certificate utility — hash files, manage certs, decode base64',
    category: 'windows',
    fields: [
      {
        id: 'mode',
        label: 'Operation',
        type: 'select',
        options: [
          { value: 'hash-md5', label: 'MD5 file hash' },
          { value: 'hash-sha1', label: 'SHA1 file hash' },
          { value: 'hash-sha256', label: 'SHA256 file hash' },
          { value: 'decode', label: 'Base64 decode file' },
          { value: 'encode', label: 'Base64 encode file' },
          { value: 'list-certs', label: 'List certificates in store' },
          { value: 'import-cert', label: 'Import certificate' },
          { value: 'delete-cert', label: 'Delete certificate' },
          { value: 'urlcache-flush', label: 'Flush URL cache' },
        ],
        default: 'hash-sha256',
        required: true,
      },
      { id: 'file', label: 'File path', type: 'text', placeholder: 'C:\\downloads\\installer.exe' },
      { id: 'outFile', label: 'Output file', type: 'text', placeholder: 'C:\\decoded.bin' },
      {
        id: 'store',
        label: 'Certificate store',
        type: 'select',
        options: [
          { value: 'My', label: 'Personal (My)' },
          { value: 'Root', label: 'Trusted Root CAs' },
          { value: 'CA', label: 'Intermediate CAs' },
          { value: 'TrustedPublisher', label: 'Trusted Publishers' },
        ],
        default: 'My',
      },
    ],
    generate: (v) => {
      const mode = s(v, 'mode', 'hash-sha256')
      const file = s(v, 'file') || '<file>'
      const out = s(v, 'outFile')
      const store = s(v, 'store', 'My')
      switch (mode) {
        case 'hash-md5': return { parts: [`certutil -hashfile "${file}" MD5`] }
        case 'hash-sha1': return { parts: [`certutil -hashfile "${file}" SHA1`] }
        case 'hash-sha256': return { parts: [`certutil -hashfile "${file}" SHA256`] }
        case 'decode': return { parts: [`certutil -decode "${file}" "${out || '<output>'}"`] }
        case 'encode': return { parts: [`certutil -encode "${file}" "${out || '<output>'}"`] }
        case 'list-certs': return { parts: [`certutil -store ${store}`] }
        case 'import-cert': return { parts: [`certutil -addstore ${store} "${file}"`] }
        case 'delete-cert': return { parts: [`certutil -delstore ${store} "<thumbprint-or-serial>"`] }
        case 'urlcache-flush': return { parts: ['certutil -urlcache * delete'] }
        default: return { parts: ['certutil'] }
      }
    },
  },
]
