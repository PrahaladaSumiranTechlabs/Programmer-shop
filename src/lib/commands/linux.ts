import { Command, FormValues } from '../types'

const s = (v: FormValues, k: string, fb = '') => (v[k] as string) || fb
const b = (v: FormValues, k: string) => !!v[k]
const a = (v: FormValues, k: string): string[] => (v[k] as string[]) || []

export const linuxCommands: Command[] = [
  // ─── Package Management ───────────────────────────────────────────────────
  {
    id: 'apt',
    name: 'apt / yum / dnf',
    description: 'Install, remove or update packages on Debian/RHEL-based systems',
    category: 'linux',
    fields: [
      {
        id: 'manager',
        label: 'Package manager',
        type: 'radio',
        options: [
          { value: 'apt', label: 'apt (Debian / Ubuntu)' },
          { value: 'yum', label: 'yum (CentOS / RHEL 7)' },
          { value: 'dnf', label: 'dnf (Fedora / RHEL 8+)' },
          { value: 'pacman', label: 'pacman (Arch Linux)' },
          { value: 'apk', label: 'apk (Alpine Linux)' },
        ],
        default: 'apt',
        required: true,
      },
      {
        id: 'action',
        label: 'Action',
        type: 'select',
        options: [
          { value: 'install', label: 'install' },
          { value: 'remove', label: 'remove / uninstall' },
          { value: 'purge', label: 'purge (remove + config files)' },
          { value: 'update', label: 'update package lists' },
          { value: 'upgrade', label: 'upgrade all packages' },
          { value: 'search', label: 'search' },
          { value: 'info', label: 'show info / info' },
          { value: 'list', label: 'list installed packages' },
          { value: 'autoremove', label: 'autoremove unused deps' },
        ],
        default: 'install',
        required: true,
      },
      { id: 'packages', label: 'Package names', type: 'multi-text', placeholder: 'nginx' },
      { id: 'yes', label: 'Auto-confirm (-y)', type: 'checkbox', default: true },
      { id: 'noRecommends', label: 'No recommended packages (apt --no-install-recommends)', type: 'checkbox', default: false },
    ],
    generate: (v) => {
      const mgr = s(v, 'manager', 'apt')
      const action = s(v, 'action', 'install')
      const pkgs = a(v, 'pkgs').filter(Boolean)
      const packages = a(v, 'packages').filter(Boolean)

      const yesFlag: Record<string, string> = { apt: '-y', yum: '-y', dnf: '-y', pacman: '--noconfirm', apk: '' }
      const actionMap: Record<string, Record<string, string>> = {
        apt:    { install: 'install', remove: 'remove', purge: 'purge', update: 'update', upgrade: 'upgrade', search: 'search', info: 'show', list: 'list --installed', autoremove: 'autoremove' },
        yum:    { install: 'install', remove: 'remove', purge: 'remove', update: 'check-update', upgrade: 'update', search: 'search', info: 'info', list: 'list installed', autoremove: 'autoremove' },
        dnf:    { install: 'install', remove: 'remove', purge: 'remove', update: 'check-update', upgrade: 'upgrade', search: 'search', info: 'info', list: 'list installed', autoremove: 'autoremove' },
        pacman: { install: '-S', remove: '-R', purge: '-Rns', update: '-Sy', upgrade: '-Syu', search: '-Ss', info: '-Qi', list: '-Q', autoremove: '-Qdtq | pacman -Rs -' },
        apk:    { install: 'add', remove: 'del', purge: 'del --purge', update: 'update', upgrade: 'upgrade', search: 'search', info: 'info', list: 'list --installed', autoremove: '' },
      }

      const cmd = actionMap[mgr]?.[action] || action
      const parts = [`${mgr} ${cmd}`]
      const yes = b(v, 'yes') && yesFlag[mgr] ? yesFlag[mgr] : ''
      if (yes) parts.push(yes)
      if (b(v, 'noRecommends') && mgr === 'apt') parts.push('--no-install-recommends')
      packages.forEach(p => parts.push(p))
      return { parts }
    },
  },
  {
    id: 'systemctl',
    name: 'systemctl',
    description: 'Control systemd services and units',
    category: 'linux',
    fields: [
      {
        id: 'action',
        label: 'Action',
        type: 'select',
        options: [
          { value: 'start', label: 'start' },
          { value: 'stop', label: 'stop' },
          { value: 'restart', label: 'restart' },
          { value: 'reload', label: 'reload (reload config without restart)' },
          { value: 'status', label: 'status' },
          { value: 'enable', label: 'enable (start on boot)' },
          { value: 'disable', label: 'disable (remove from boot)' },
          { value: 'is-active', label: 'is-active (check if running)' },
          { value: 'is-enabled', label: 'is-enabled (check boot status)' },
          { value: 'list-units', label: 'list-units (list running units)' },
          { value: 'list-unit-files', label: 'list-unit-files (all units)' },
          { value: 'daemon-reload', label: 'daemon-reload (reload unit files)' },
          { value: 'mask', label: 'mask (prevent starting)' },
          { value: 'unmask', label: 'unmask' },
        ],
        default: 'status',
        required: true,
      },
      { id: 'service', label: 'Service / unit name', type: 'text', placeholder: 'nginx or docker.service' },
      { id: 'userMode', label: 'User mode (--user)', type: 'checkbox', default: false },
      { id: 'now', label: 'Apply immediately too (--now)', type: 'checkbox', default: false, helpText: 'Use with enable/disable to also start/stop' },
    ],
    generate: (v) => {
      const action = s(v, 'action', 'status')
      const service = s(v, 'service')
      const parts = ['systemctl']
      if (b(v, 'userMode')) parts.push('--user')
      parts.push(action)
      if (b(v, 'now') && ['enable', 'disable'].includes(action)) parts.push('--now')
      if (service && !['list-units', 'list-unit-files', 'daemon-reload'].includes(action)) parts.push(service)
      return { parts }
    },
  },
  // ─── Firewall ─────────────────────────────────────────────────────────────
  {
    id: 'ufw',
    name: 'ufw',
    description: 'Manage the Uncomplicated Firewall (Ubuntu/Debian)',
    category: 'linux',
    fields: [
      {
        id: 'action',
        label: 'Action',
        type: 'select',
        options: [
          { value: 'enable', label: 'enable firewall' },
          { value: 'disable', label: 'disable firewall' },
          { value: 'status verbose', label: 'status (verbose)' },
          { value: 'allow', label: 'allow port/service' },
          { value: 'deny', label: 'deny port/service' },
          { value: 'delete allow', label: 'delete allow rule' },
          { value: 'delete deny', label: 'delete deny rule' },
          { value: 'reset', label: 'reset all rules' },
          { value: 'reload', label: 'reload rules' },
        ],
        default: 'allow',
        required: true,
      },
      {
        id: 'portOrService',
        label: 'Port / service / IP',
        type: 'text',
        placeholder: '80 or 443/tcp or 22/tcp or nginx or from 192.168.1.0/24',
        helpText: 'Examples: 80, 443/tcp, 8080:8090/tcp, nginx, from 10.0.0.1 to any port 22',
      },
    ],
    generate: (v) => {
      const action = s(v, 'action', 'allow')
      const port = s(v, 'portOrService')
      const parts = [`ufw ${action}`]
      if (port && !['enable', 'disable', 'reset', 'reload', 'status verbose'].includes(action)) parts.push(port)
      return { parts }
    },
  },
  {
    id: 'iptables',
    name: 'iptables',
    description: 'Configure Linux kernel firewall rules',
    category: 'linux',
    fields: [
      {
        id: 'action',
        label: 'Action',
        type: 'select',
        options: [
          { value: '-L -n -v', label: 'List all rules (verbose)' },
          { value: '-A INPUT', label: 'Append INPUT rule' },
          { value: '-A OUTPUT', label: 'Append OUTPUT rule' },
          { value: '-A FORWARD', label: 'Append FORWARD rule' },
          { value: '-D INPUT', label: 'Delete INPUT rule' },
          { value: '-F', label: 'Flush (delete all rules)' },
          { value: '-F INPUT', label: 'Flush INPUT chain' },
          { value: '-I INPUT 1', label: 'Insert at top of INPUT' },
        ],
        default: '-L -n -v',
        required: true,
      },
      {
        id: 'protocol',
        label: 'Protocol (-p)',
        type: 'select',
        options: [
          { value: '', label: 'Any' },
          { value: 'tcp', label: 'TCP' },
          { value: 'udp', label: 'UDP' },
          { value: 'icmp', label: 'ICMP' },
        ],
        default: 'tcp',
      },
      { id: 'dport', label: 'Destination port (--dport)', type: 'text', placeholder: '80 or 8080:8090' },
      { id: 'sport', label: 'Source port (--sport)', type: 'text', placeholder: '1024:65535' },
      { id: 'source', label: 'Source IP (-s)', type: 'text', placeholder: '192.168.1.0/24' },
      { id: 'dest', label: 'Destination IP (-d)', type: 'text', placeholder: '10.0.0.1' },
      {
        id: 'target',
        label: 'Target (-j)',
        type: 'select',
        options: [
          { value: 'ACCEPT', label: 'ACCEPT' },
          { value: 'DROP', label: 'DROP' },
          { value: 'REJECT', label: 'REJECT' },
          { value: 'LOG', label: 'LOG' },
          { value: 'MASQUERADE', label: 'MASQUERADE (NAT)' },
        ],
        default: 'ACCEPT',
      },
    ],
    generate: (v) => {
      const action = s(v, 'action', '-L -n -v')
      const parts = [`iptables ${action}`]
      const proto = s(v, 'protocol')
      if (proto && !action.includes('-L') && !action.includes('-F')) parts.push(`-p ${proto}`)
      const src = s(v, 'source')
      if (src) parts.push(`-s ${src}`)
      const dst = s(v, 'dest')
      if (dst) parts.push(`-d ${dst}`)
      const dport = s(v, 'dport')
      if (dport) parts.push(`--dport ${dport}`)
      const sport = s(v, 'sport')
      if (sport) parts.push(`--sport ${sport}`)
      const target = s(v, 'target', 'ACCEPT')
      if (!action.includes('-L') && !action.includes('-F')) parts.push(`-j ${target}`)
      return { parts }
    },
  },
  // ─── Disk / Storage ───────────────────────────────────────────────────────
  {
    id: 'df-du',
    name: 'df / du',
    description: 'Check disk usage — free space (df) or directory size (du)',
    category: 'linux',
    fields: [
      {
        id: 'tool',
        label: 'Tool',
        type: 'radio',
        options: [
          { value: 'df', label: 'df — filesystem free space' },
          { value: 'du', label: 'du — directory/file sizes' },
        ],
        default: 'df',
        required: true,
      },
      { id: 'path', label: 'Path (du only)', type: 'text', placeholder: '/var/log', dependsOn: { field: 'tool', value: 'du' } },
      { id: 'humanReadable', label: 'Human-readable sizes (-h)', type: 'checkbox', default: true },
      { id: 'total', label: 'Show total (-c)', type: 'checkbox', default: false, dependsOn: { field: 'tool', value: 'du' } },
      { id: 'maxDepth', label: 'Max depth (--max-depth)', type: 'number', placeholder: '1', dependsOn: { field: 'tool', value: 'du' } },
      { id: 'sortBySize', label: 'Sort by size (pipe to sort)', type: 'checkbox', default: false, dependsOn: { field: 'tool', value: 'du' } },
      { id: 'inodes', label: 'Show inodes (-i)', type: 'checkbox', default: false, dependsOn: { field: 'tool', value: 'df' } },
    ],
    generate: (v) => {
      const tool = s(v, 'tool', 'df')
      if (tool === 'df') {
        const parts = ['df']
        if (b(v, 'humanReadable')) parts.push('-h')
        if (b(v, 'inodes')) parts.push('-i')
        return { parts }
      } else {
        const parts = ['du']
        if (b(v, 'humanReadable')) parts.push('-h')
        if (b(v, 'total')) parts.push('-c')
        const depth = s(v, 'maxDepth')
        if (depth) parts.push(`--max-depth=${depth}`)
        const path = s(v, 'path', '.')
        parts.push(path)
        if (b(v, 'sortBySize')) parts.push('| sort -rh')
        return { parts }
      }
    },
  },
  {
    id: 'lsblk-mount',
    name: 'lsblk / mount',
    description: 'List block devices or mount a filesystem',
    category: 'linux',
    fields: [
      {
        id: 'tool',
        label: 'Tool',
        type: 'radio',
        options: [
          { value: 'lsblk', label: 'lsblk — list block devices' },
          { value: 'mount', label: 'mount — mount a device' },
          { value: 'umount', label: 'umount — unmount' },
          { value: 'blkid', label: 'blkid — show UUIDs & types' },
        ],
        default: 'lsblk',
        required: true,
      },
      { id: 'device', label: 'Device', type: 'text', placeholder: '/dev/sdb1', dependsOn: { field: 'tool', value: 'mount' } },
      { id: 'deviceU', label: 'Device / mount point', type: 'text', placeholder: '/dev/sdb1 or /mnt/data', dependsOn: { field: 'tool', value: 'umount' } },
      { id: 'mountPoint', label: 'Mount point', type: 'text', placeholder: '/mnt/data', dependsOn: { field: 'tool', value: 'mount' } },
      {
        id: 'fsType',
        label: 'Filesystem type (-t)',
        type: 'select',
        options: [
          { value: '', label: 'Auto-detect' },
          { value: 'ext4', label: 'ext4' },
          { value: 'xfs', label: 'xfs' },
          { value: 'ntfs', label: 'ntfs' },
          { value: 'vfat', label: 'vfat (FAT32)' },
          { value: 'tmpfs', label: 'tmpfs' },
          { value: 'nfs', label: 'nfs' },
          { value: 'cifs', label: 'cifs (SMB)' },
        ],
        default: '',
        dependsOn: { field: 'tool', value: 'mount' },
      },
      { id: 'readOnly', label: 'Read-only (-o ro)', type: 'checkbox', default: false, dependsOn: { field: 'tool', value: 'mount' } },
      { id: 'output', label: 'Show columns (-o)', type: 'text', placeholder: 'NAME,SIZE,TYPE,MOUNTPOINT', dependsOn: { field: 'tool', value: 'lsblk' } },
    ],
    generate: (v) => {
      const tool = s(v, 'tool', 'lsblk')
      if (tool === 'lsblk') {
        const parts = ['lsblk']
        const out = s(v, 'output')
        if (out) parts.push(`-o ${out}`)
        return { parts }
      } else if (tool === 'mount') {
        const device = s(v, 'device') || '<device>'
        const mp = s(v, 'mountPoint') || '<mount-point>'
        const parts = ['mount']
        const fsType = s(v, 'fsType')
        if (fsType) parts.push(`-t ${fsType}`)
        if (b(v, 'readOnly')) parts.push('-o ro')
        parts.push(device)
        parts.push(mp)
        return { parts }
      } else if (tool === 'umount') {
        return { parts: ['umount', s(v, 'deviceU') || '<device-or-mountpoint>'] }
      } else {
        return { parts: ['blkid'] }
      }
    },
  },
  // ─── Memory & Resources ───────────────────────────────────────────────────
  {
    id: 'free',
    name: 'free / vmstat',
    description: 'Show memory usage and virtual memory statistics',
    category: 'linux',
    fields: [
      {
        id: 'tool',
        label: 'Tool',
        type: 'radio',
        options: [
          { value: 'free', label: 'free — memory overview' },
          { value: 'vmstat', label: 'vmstat — virtual memory stats' },
        ],
        default: 'free',
        required: true,
      },
      { id: 'humanReadable', label: 'Human-readable (-h)', type: 'checkbox', default: true, dependsOn: { field: 'tool', value: 'free' } },
      { id: 'total', label: 'Show total row (-t)', type: 'checkbox', default: false, dependsOn: { field: 'tool', value: 'free' } },
      { id: 'interval', label: 'Repeat every N seconds', type: 'number', placeholder: '2', dependsOn: { field: 'tool', value: 'vmstat' } },
      { id: 'count', label: 'Repeat N times', type: 'number', placeholder: '5', dependsOn: { field: 'tool', value: 'vmstat' } },
    ],
    generate: (v) => {
      const tool = s(v, 'tool', 'free')
      if (tool === 'free') {
        const parts = ['free']
        if (b(v, 'humanReadable')) parts.push('-h')
        if (b(v, 'total')) parts.push('-t')
        return { parts }
      } else {
        const parts = ['vmstat']
        const interval = s(v, 'interval')
        if (interval) parts.push(interval)
        const count = s(v, 'count')
        if (count) parts.push(count)
        return { parts }
      }
    },
  },
  // ─── Networking ───────────────────────────────────────────────────────────
  {
    id: 'ping-traceroute',
    name: 'ping / traceroute',
    description: 'Test network connectivity and trace packet routes',
    category: 'linux',
    fields: [
      {
        id: 'tool',
        label: 'Tool',
        type: 'radio',
        options: [
          { value: 'ping', label: 'ping' },
          { value: 'traceroute', label: 'traceroute' },
          { value: 'mtr', label: 'mtr (combined ping + trace)' },
        ],
        default: 'ping',
        required: true,
      },
      { id: 'host', label: 'Host / IP', type: 'text', placeholder: 'google.com or 8.8.8.8', required: true },
      { id: 'count', label: 'Packet count (-c)', type: 'number', placeholder: '4', dependsOn: { field: 'tool', value: 'ping' } },
      { id: 'interval', label: 'Interval seconds (-i)', type: 'number', placeholder: '1', dependsOn: { field: 'tool', value: 'ping' } },
      { id: 'size', label: 'Packet size bytes (-s)', type: 'number', placeholder: '56', dependsOn: { field: 'tool', value: 'ping' } },
      { id: 'udp', label: 'Use UDP (-U)', type: 'checkbox', default: false, dependsOn: { field: 'tool', value: 'traceroute' } },
      { id: 'noResolve', label: 'No DNS resolve (-n)', type: 'checkbox', default: false },
    ],
    generate: (v) => {
      const tool = s(v, 'tool', 'ping')
      const host = s(v, 'host') || '<host>'
      if (tool === 'ping') {
        const parts = ['ping']
        const count = s(v, 'count')
        if (count) parts.push(`-c ${count}`)
        const interval = s(v, 'interval')
        if (interval) parts.push(`-i ${interval}`)
        const size = s(v, 'size')
        if (size) parts.push(`-s ${size}`)
        if (b(v, 'noResolve')) parts.push('-n')
        parts.push(host)
        return { parts }
      } else if (tool === 'traceroute') {
        const parts = ['traceroute']
        if (b(v, 'udp')) parts.push('-U')
        if (b(v, 'noResolve')) parts.push('-n')
        parts.push(host)
        return { parts }
      } else {
        return { parts: ['mtr', host] }
      }
    },
  },
  {
    id: 'dig',
    name: 'dig / nslookup',
    description: 'Query DNS records for a domain',
    category: 'linux',
    fields: [
      {
        id: 'tool',
        label: 'Tool',
        type: 'radio',
        options: [
          { value: 'dig', label: 'dig (detailed)' },
          { value: 'nslookup', label: 'nslookup' },
          { value: 'host', label: 'host (simple)' },
        ],
        default: 'dig',
        required: true,
      },
      { id: 'domain', label: 'Domain', type: 'text', placeholder: 'example.com', required: true },
      {
        id: 'recordType',
        label: 'Record type',
        type: 'select',
        options: [
          { value: '', label: 'Default (A)' },
          { value: 'A', label: 'A (IPv4)' },
          { value: 'AAAA', label: 'AAAA (IPv6)' },
          { value: 'MX', label: 'MX (mail)' },
          { value: 'TXT', label: 'TXT' },
          { value: 'NS', label: 'NS (nameservers)' },
          { value: 'CNAME', label: 'CNAME' },
          { value: 'SOA', label: 'SOA' },
          { value: 'PTR', label: 'PTR (reverse)' },
          { value: 'ANY', label: 'ANY' },
        ],
        default: 'A',
      },
      { id: 'nameserver', label: 'Use specific nameserver (@)', type: 'text', placeholder: '8.8.8.8 or 1.1.1.1' },
      { id: 'short', label: 'Short output (+short)', type: 'checkbox', default: false, dependsOn: { field: 'tool', value: 'dig' } },
    ],
    generate: (v) => {
      const tool = s(v, 'tool', 'dig')
      const domain = s(v, 'domain') || '<domain>'
      const type = s(v, 'recordType', 'A')
      const ns = s(v, 'nameserver')
      if (tool === 'dig') {
        const parts = ['dig']
        if (ns) parts.push(`@${ns}`)
        parts.push(domain)
        if (type) parts.push(type)
        if (b(v, 'short')) parts.push('+short')
        return { parts }
      } else if (tool === 'nslookup') {
        const parts = ['nslookup']
        if (type && type !== 'A') parts.push(`-type=${type}`)
        parts.push(domain)
        if (ns) parts.push(ns)
        return { parts }
      } else {
        const parts = ['host']
        if (type && type !== 'A') parts.push(`-t ${type}`)
        parts.push(domain)
        if (ns) parts.push(ns)
        return { parts }
      }
    },
  },
  {
    id: 'ss-netstat',
    name: 'ss / netstat',
    description: 'Show network connections and listening ports',
    category: 'linux',
    fields: [
      {
        id: 'tool',
        label: 'Tool',
        type: 'radio',
        options: [
          { value: 'ss', label: 'ss (modern, faster)' },
          { value: 'netstat', label: 'netstat (classic)' },
        ],
        default: 'ss',
        required: true,
      },
      { id: 'tcp', label: 'TCP connections (-t)', type: 'checkbox', default: true },
      { id: 'udp', label: 'UDP connections (-u)', type: 'checkbox', default: false },
      { id: 'listen', label: 'Listening only (-l)', type: 'checkbox', default: true },
      { id: 'numeric', label: 'Numeric ports (-n)', type: 'checkbox', default: true },
      { id: 'process', label: 'Show process (-p)', type: 'checkbox', default: true },
      { id: 'port', label: 'Filter by port', type: 'number', placeholder: '80' },
    ],
    generate: (v) => {
      const tool = s(v, 'tool', 'ss')
      let flags = '-'
      if (b(v, 'tcp')) flags += 't'
      if (b(v, 'udp')) flags += 'u'
      if (b(v, 'listen')) flags += 'l'
      if (b(v, 'numeric')) flags += 'n'
      if (b(v, 'process')) flags += 'p'
      if (flags === '-') flags = ''
      const port = s(v, 'port')
      if (tool === 'ss') {
        const parts = [`ss ${flags}`]
        if (port) parts.push(`| grep :${port}`)
        return { parts }
      } else {
        const parts = [`netstat ${flags}`]
        if (port) parts.push(`| grep :${port}`)
        return { parts }
      }
    },
  },
  {
    id: 'nc-netcat',
    name: 'nc (netcat)',
    description: 'Network utility — port scan, banner grab, or simple data transfer',
    category: 'linux',
    fields: [
      {
        id: 'mode',
        label: 'Mode',
        type: 'select',
        options: [
          { value: 'port-check', label: 'Check if port is open' },
          { value: 'scan', label: 'Port range scan' },
          { value: 'listen', label: 'Listen on a port' },
          { value: 'send', label: 'Send data to host:port' },
          { value: 'banner', label: 'Banner grab' },
        ],
        default: 'port-check',
        required: true,
      },
      { id: 'host', label: 'Host', type: 'text', placeholder: '192.168.1.1' },
      { id: 'port', label: 'Port', type: 'number', placeholder: '22' },
      { id: 'portEnd', label: 'End port (scan range)', type: 'number', placeholder: '1024', dependsOn: { field: 'mode', value: 'scan' } },
      { id: 'timeout', label: 'Timeout seconds (-w)', type: 'number', placeholder: '3' },
      { id: 'udp', label: 'UDP mode (-u)', type: 'checkbox', default: false },
    ],
    generate: (v) => {
      const mode = s(v, 'mode', 'port-check')
      const host = s(v, 'host') || '<host>'
      const port = s(v, 'port') || '<port>'
      const timeout = s(v, 'timeout')
      const udpFlag = b(v, 'udp') ? ' -u' : ''
      switch (mode) {
        case 'port-check': return { parts: [`nc -zv${udpFlag}`, timeout ? `-w ${timeout}` : '', host, port].filter(Boolean) }
        case 'scan': return { parts: [`nc -zv${udpFlag}`, host, `${port}-${s(v, 'portEnd') || '<end>'}`] }
        case 'listen': return { parts: [`nc -lvp${udpFlag}`, port] }
        case 'send': return { parts: [`nc${udpFlag}`, host, port] }
        case 'banner': return { parts: [`nc -v${udpFlag}`, timeout ? `-w ${timeout}` : '', host, port].filter(Boolean) }
        default: return { parts: ['nc', host, port] }
      }
    },
  },
  {
    id: 'nmap',
    name: 'nmap',
    description: 'Network port scanner and host discovery',
    category: 'linux',
    fields: [
      {
        id: 'scanType',
        label: 'Scan type',
        type: 'select',
        options: [
          { value: '-sS', label: 'SYN scan (-sS) — stealthy, requires root' },
          { value: '-sT', label: 'TCP connect scan (-sT)' },
          { value: '-sU', label: 'UDP scan (-sU)' },
          { value: '-sn', label: 'Ping scan only (-sn) — host discovery' },
          { value: '-sV', label: 'Version detection (-sV)' },
          { value: '-A', label: 'Aggressive (-A) — OS + version + scripts' },
        ],
        default: '-sT',
        required: true,
      },
      { id: 'target', label: 'Target host / subnet', type: 'text', placeholder: '192.168.1.1 or 192.168.1.0/24', required: true },
      {
        id: 'ports',
        label: 'Port range (-p)',
        type: 'text',
        placeholder: '80,443,8080 or 1-1024 or — (all)',
        helpText: 'Leave empty to scan top 1000 ports',
      },
      { id: 'oN', label: 'Save output to file (-oN)', type: 'text', placeholder: 'scan_results.txt' },
      { id: 'timing', label: 'Timing template (-T)', type: 'select', options: [{ value: '', label: 'Default (T3)' }, { value: '-T0', label: 'T0 — paranoid (IDS evasion)' }, { value: '-T1', label: 'T1 — sneaky' }, { value: '-T2', label: 'T2 — polite' }, { value: '-T3', label: 'T3 — normal' }, { value: '-T4', label: 'T4 — aggressive' }, { value: '-T5', label: 'T5 — insane' }], default: '' },
    ],
    generate: (v) => {
      const scanType = s(v, 'scanType', '-sT')
      const target = s(v, 'target') || '<target>'
      const parts = ['nmap', scanType]
      const ports = s(v, 'ports')
      if (ports) parts.push(`-p ${ports}`)
      const timing = s(v, 'timing')
      if (timing) parts.push(timing)
      const out = s(v, 'oN')
      if (out) parts.push(`-oN ${out}`)
      parts.push(target)
      return { parts }
    },
  },
  // ─── User Management ──────────────────────────────────────────────────────
  {
    id: 'useradd',
    name: 'useradd / usermod',
    description: 'Create or modify Linux user accounts',
    category: 'linux',
    fields: [
      {
        id: 'action',
        label: 'Action',
        type: 'select',
        options: [
          { value: 'useradd', label: 'useradd — create user' },
          { value: 'usermod', label: 'usermod — modify user' },
          { value: 'userdel', label: 'userdel — delete user' },
          { value: 'passwd', label: 'passwd — change password' },
          { value: 'id', label: 'id — show user info' },
          { value: 'groups', label: 'groups — list user groups' },
        ],
        default: 'useradd',
        required: true,
      },
      { id: 'username', label: 'Username', type: 'text', placeholder: 'johndoe', required: true },
      { id: 'createHome', label: 'Create home directory (-m)', type: 'checkbox', default: true, dependsOn: { field: 'action', value: 'useradd' } },
      { id: 'shell', label: 'Login shell (-s)', type: 'text', placeholder: '/bin/bash', dependsOn: { field: 'action', value: 'useradd' } },
      { id: 'groups', label: 'Supplementary groups (-G)', type: 'text', placeholder: 'sudo,docker', helpText: 'Comma-separated' },
      { id: 'appendGroups', label: 'Append groups (don\'t overwrite) (-a)', type: 'checkbox', default: true, dependsOn: { field: 'action', value: 'usermod' } },
      { id: 'deleteHome', label: 'Delete home directory (-r)', type: 'checkbox', default: false, dependsOn: { field: 'action', value: 'userdel' } },
      { id: 'lockAccount', label: 'Lock account (-L)', type: 'checkbox', default: false, dependsOn: { field: 'action', value: 'usermod' } },
      { id: 'unlockAccount', label: 'Unlock account (-U)', type: 'checkbox', default: false, dependsOn: { field: 'action', value: 'usermod' } },
    ],
    generate: (v) => {
      const action = s(v, 'action', 'useradd')
      const username = s(v, 'username') || '<username>'
      if (['passwd', 'id', 'groups'].includes(action)) return { parts: [action, username] }
      const parts = [action]
      if (action === 'useradd') {
        if (b(v, 'createHome')) parts.push('-m')
        const shell = s(v, 'shell')
        if (shell) parts.push(`-s ${shell}`)
        const groups = s(v, 'groups')
        if (groups) parts.push(`-G ${groups}`)
      } else if (action === 'usermod') {
        if (b(v, 'lockAccount')) parts.push('-L')
        if (b(v, 'unlockAccount')) parts.push('-U')
        const groups = s(v, 'groups')
        if (groups) {
          if (b(v, 'appendGroups')) parts.push('-a')
          parts.push(`-G ${groups}`)
        }
      } else if (action === 'userdel') {
        if (b(v, 'deleteHome')) parts.push('-r')
      }
      parts.push(username)
      return { parts }
    },
  },
  // ─── Text Processing ──────────────────────────────────────────────────────
  {
    id: 'sed',
    name: 'sed',
    description: 'Stream editor — search & replace, delete lines, in-place edits',
    category: 'linux',
    fields: [
      {
        id: 'mode',
        label: 'Mode',
        type: 'select',
        options: [
          { value: 'replace', label: 'Find & replace' },
          { value: 'delete', label: 'Delete matching lines' },
          { value: 'print', label: 'Print matching lines' },
          { value: 'insert', label: 'Insert line before/after pattern' },
          { value: 'range-delete', label: 'Delete line range' },
        ],
        default: 'replace',
        required: true,
      },
      { id: 'pattern', label: 'Search pattern', type: 'text', placeholder: 'old_text', required: true },
      { id: 'replacement', label: 'Replacement', type: 'text', placeholder: 'new_text', dependsOn: { field: 'mode', value: 'replace' } },
      { id: 'insertText', label: 'Text to insert', type: 'text', placeholder: 'new line text', dependsOn: { field: 'mode', value: 'insert' } },
      { id: 'lineStart', label: 'Start line', type: 'number', placeholder: '1', dependsOn: { field: 'mode', value: 'range-delete' } },
      { id: 'lineEnd', label: 'End line', type: 'number', placeholder: '5', dependsOn: { field: 'mode', value: 'range-delete' } },
      { id: 'inPlace', label: 'Edit in-place (-i)', type: 'checkbox', default: false },
      { id: 'backup', label: 'Backup extension (e.g. .bak)', type: 'text', placeholder: '.bak', helpText: 'Used with -i to keep backup', dependsOn: { field: 'inPlace', value: true } },
      { id: 'global', label: 'Replace all occurrences per line (g)', type: 'checkbox', default: true, dependsOn: { field: 'mode', value: 'replace' } },
      { id: 'ignoreCase', label: 'Case-insensitive (I)', type: 'checkbox', default: false },
      { id: 'file', label: 'File to process', type: 'text', placeholder: 'config.txt' },
    ],
    generate: (v) => {
      const mode = s(v, 'mode', 'replace')
      const pattern = s(v, 'pattern') || '<pattern>'
      const file = s(v, 'file')
      const inPlace = b(v, 'inPlace')
      const backup = s(v, 'backup')
      const iFlag = inPlace ? (backup ? `-i${backup}` : '-i') : ''
      const iCase = b(v, 'ignoreCase') ? 'I' : ''

      let expr = ''
      switch (mode) {
        case 'replace': {
          const repl = s(v, 'replacement')
          const gFlag = b(v, 'global') ? 'g' : ''
          expr = `s/${pattern}/${repl}/${gFlag}${iCase}`
          break
        }
        case 'delete': expr = `/${pattern}/d`; break
        case 'print': expr = `/${pattern}/p`; break
        case 'insert': {
          const text = s(v, 'insertText') || '<text>'
          expr = `/${pattern}/i\\${text}`
          break
        }
        case 'range-delete': {
          const start = s(v, 'lineStart', '1')
          const end = s(v, 'lineEnd', '1')
          expr = `${start},${end}d`
          break
        }
      }

      const parts = ['sed']
      if (iFlag) parts.push(iFlag)
      parts.push(`'${expr}'`)
      if (file) parts.push(file)
      return { parts }
    },
  },
  {
    id: 'awk',
    name: 'awk',
    description: 'Text processing — extract columns, filter rows, calculate totals',
    category: 'linux',
    fields: [
      {
        id: 'mode',
        label: 'Use case',
        type: 'select',
        options: [
          { value: 'print-col', label: 'Print specific columns' },
          { value: 'filter', label: 'Filter rows by pattern' },
          { value: 'filter-col', label: 'Filter by column value' },
          { value: 'sum-col', label: 'Sum a numeric column' },
          { value: 'custom', label: 'Custom awk program' },
        ],
        default: 'print-col',
        required: true,
      },
      { id: 'delimiter', label: 'Field separator (-F)', type: 'text', placeholder: ':', helpText: 'Default is whitespace. Use : for /etc/passwd, , for CSV' },
      { id: 'columns', label: 'Column numbers', type: 'text', placeholder: '1,3', helpText: 'e.g. 1 or 1,3 or NF for last', dependsOn: { field: 'mode', value: 'print-col' } },
      { id: 'pattern', label: 'Pattern to match', type: 'text', placeholder: 'ERROR', dependsOn: { field: 'mode', value: 'filter' } },
      { id: 'colNum', label: 'Column number to filter', type: 'number', placeholder: '3', dependsOn: { field: 'mode', value: 'filter-col' } },
      { id: 'colVal', label: 'Column value', type: 'text', placeholder: 'active', dependsOn: { field: 'mode', value: 'filter-col' } },
      { id: 'sumCol', label: 'Column to sum', type: 'number', placeholder: '5', dependsOn: { field: 'mode', value: 'sum-col' } },
      { id: 'custom', label: 'awk program', type: 'textarea', placeholder: '{print $1, $NF}', dependsOn: { field: 'mode', value: 'custom' } },
      { id: 'file', label: 'File / command', type: 'text', placeholder: '/etc/passwd or leave empty to pipe' },
    ],
    generate: (v) => {
      const mode = s(v, 'mode', 'print-col')
      const delim = s(v, 'delimiter')
      const file = s(v, 'file')
      const parts = ['awk']
      if (delim) parts.push(`-F '${delim}'`)
      let program = ''
      switch (mode) {
        case 'print-col': {
          const cols = (s(v, 'columns') || '1').split(',').map(c => `$${c.trim()}`).join(', ')
          program = `{print ${cols}}`
          break
        }
        case 'filter': program = `/${s(v, 'pattern') || '<pattern>'}/ {print}`; break
        case 'filter-col': {
          const col = s(v, 'colNum', '1')
          const val = s(v, 'colVal') || '<value>'
          program = `$${col} == "${val}" {print}`
          break
        }
        case 'sum-col': {
          const col = s(v, 'sumCol', '1')
          program = `{sum+=$${col}} END {print sum}`
          break
        }
        case 'custom': program = s(v, 'custom') || '{print}'
      }
      parts.push(`'${program}'`)
      if (file) parts.push(file)
      return { parts }
    },
  },
  // ─── File Operations ──────────────────────────────────────────────────────
  {
    id: 'head-tail',
    name: 'head / tail',
    description: 'View the beginning or end of a file, with live log following',
    category: 'linux',
    fields: [
      {
        id: 'tool',
        label: 'Tool',
        type: 'radio',
        options: [
          { value: 'head', label: 'head — first N lines' },
          { value: 'tail', label: 'tail — last N lines' },
        ],
        default: 'tail',
        required: true,
      },
      { id: 'file', label: 'File', type: 'text', placeholder: '/var/log/nginx/error.log', required: true },
      { id: 'lines', label: 'Number of lines (-n)', type: 'number', placeholder: '50', default: '50' },
      { id: 'follow', label: 'Follow new output (-f)', type: 'checkbox', default: false, dependsOn: { field: 'tool', value: 'tail' } },
      { id: 'retry', label: 'Retry if file disappears (-F)', type: 'checkbox', default: false, dependsOn: { field: 'tool', value: 'tail' } },
      { id: 'bytes', label: 'Show N bytes instead (-c)', type: 'number', placeholder: '1024' },
    ],
    generate: (v) => {
      const tool = s(v, 'tool', 'tail')
      const file = s(v, 'file') || '<file>'
      const parts = [tool]
      const bytes = s(v, 'bytes')
      if (bytes) {
        parts.push(`-c ${bytes}`)
      } else {
        const lines = s(v, 'lines', '10')
        parts.push(`-n ${lines}`)
      }
      if (tool === 'tail') {
        if (b(v, 'retry')) parts.push('-F')
        else if (b(v, 'follow')) parts.push('-f')
      }
      parts.push(file)
      return { parts }
    },
  },
  {
    id: 'ln',
    name: 'ln',
    description: 'Create symbolic or hard links',
    category: 'linux',
    fields: [
      {
        id: 'type',
        label: 'Link type',
        type: 'radio',
        options: [
          { value: 'symbolic', label: 'Symbolic (symlink) — most common' },
          { value: 'hard', label: 'Hard link' },
        ],
        default: 'symbolic',
        required: true,
      },
      { id: 'target', label: 'Target (what to point to)', type: 'text', placeholder: '/usr/local/bin/node-v20/bin/node', required: true },
      { id: 'linkName', label: 'Link name (where to create)', type: 'text', placeholder: '/usr/local/bin/node', required: true },
      { id: 'force', label: 'Force overwrite (-f)', type: 'checkbox', default: false },
      { id: 'verbose', label: 'Verbose (-v)', type: 'checkbox', default: false },
    ],
    generate: (v) => {
      const parts = ['ln']
      if (s(v, 'type', 'symbolic') === 'symbolic') parts.push('-s')
      if (b(v, 'force')) parts.push('-f')
      if (b(v, 'verbose')) parts.push('-v')
      parts.push(s(v, 'target') || '<target>')
      parts.push(s(v, 'linkName') || '<link-name>')
      return { parts }
    },
  },
  {
    id: 'zip-unzip',
    name: 'zip / unzip',
    description: 'Compress files into a zip archive or extract one',
    category: 'linux',
    fields: [
      {
        id: 'action',
        label: 'Action',
        type: 'radio',
        options: [
          { value: 'zip', label: 'zip — compress' },
          { value: 'unzip', label: 'unzip — extract' },
        ],
        default: 'zip',
        required: true,
      },
      { id: 'archive', label: 'Archive file', type: 'text', placeholder: 'archive.zip', required: true },
      { id: 'sources', label: 'Files / directory to zip', type: 'multi-text', placeholder: './dist/', dependsOn: { field: 'action', value: 'zip' } },
      { id: 'outputDir', label: 'Extract to directory (-d)', type: 'text', placeholder: '/tmp/extracted', dependsOn: { field: 'action', value: 'unzip' } },
      { id: 'recursive', label: 'Recursive (-r)', type: 'checkbox', default: true, dependsOn: { field: 'action', value: 'zip' } },
      { id: 'list', label: 'List contents only (-l)', type: 'checkbox', default: false, dependsOn: { field: 'action', value: 'unzip' } },
    ],
    generate: (v) => {
      const action = s(v, 'action', 'zip')
      const archive = s(v, 'archive') || '<archive.zip>'
      if (action === 'zip') {
        const parts = ['zip']
        if (b(v, 'recursive')) parts.push('-r')
        parts.push(archive)
        a(v, 'sources').filter(Boolean).forEach(src => parts.push(src))
        return { parts }
      } else {
        const parts = ['unzip']
        if (b(v, 'list')) parts.push('-l')
        parts.push(archive)
        const dir = s(v, 'outputDir')
        if (dir) parts.push(`-d ${dir}`)
        return { parts }
      }
    },
  },
  {
    id: 'sort-uniq',
    name: 'sort / uniq',
    description: 'Sort lines, remove duplicates, count occurrences',
    category: 'linux',
    fields: [
      {
        id: 'mode',
        label: 'Mode',
        type: 'select',
        options: [
          { value: 'sort', label: 'sort only' },
          { value: 'sort-uniq', label: 'sort | uniq — deduplicate' },
          { value: 'sort-uniq-c', label: 'sort | uniq -c — count occurrences' },
          { value: 'sort-uniq-c-sort', label: 'sort | uniq -c | sort -rn — most frequent first' },
        ],
        default: 'sort-uniq-c-sort',
        required: true,
      },
      { id: 'file', label: 'Input file', type: 'text', placeholder: 'access.log' },
      { id: 'numeric', label: 'Numeric sort (-n)', type: 'checkbox', default: false },
      { id: 'reverse', label: 'Reverse order (-r)', type: 'checkbox', default: false },
      { id: 'field', label: 'Sort by field (-k)', type: 'text', placeholder: '2 or 2,2', helpText: 'e.g. sort by second column' },
      { id: 'fieldSep', label: 'Field separator (-t)', type: 'text', placeholder: ',', helpText: 'Default: whitespace' },
    ],
    generate: (v) => {
      const mode = s(v, 'mode', 'sort-uniq-c-sort')
      const file = s(v, 'file')
      const sortFlags = ['-']
      if (b(v, 'numeric')) sortFlags.push('n')
      if (b(v, 'reverse')) sortFlags.push('r')
      const sortFlagStr = sortFlags.length > 1 ? sortFlags.join('') : ''
      const fieldSep = s(v, 'fieldSep')
      const field = s(v, 'field')
      let sortCmd = 'sort'
      if (sortFlagStr) sortCmd += ` ${sortFlagStr}`
      if (fieldSep) sortCmd += ` -t '${fieldSep}'`
      if (field) sortCmd += ` -k ${field}`
      if (file) sortCmd += ` ${file}`

      switch (mode) {
        case 'sort': return { parts: [sortCmd] }
        case 'sort-uniq': return { parts: [sortCmd, '| uniq'] }
        case 'sort-uniq-c': return { parts: [sortCmd, '| uniq -c'] }
        case 'sort-uniq-c-sort': return { parts: [sortCmd, '| uniq -c', '| sort -rn'] }
        default: return { parts: [sortCmd] }
      }
    },
  },
  {
    id: 'watch',
    name: 'watch',
    description: 'Repeat a command on an interval and display output',
    category: 'linux',
    fields: [
      { id: 'command', label: 'Command to watch', type: 'text', placeholder: 'df -h', required: true },
      { id: 'interval', label: 'Interval in seconds (-n)', type: 'number', placeholder: '2', default: '2' },
      { id: 'diff', label: 'Highlight changes (-d)', type: 'checkbox', default: false },
      { id: 'noTitle', label: 'No title bar (--no-title)', type: 'checkbox', default: false },
    ],
    generate: (v) => {
      const parts = ['watch']
      const interval = s(v, 'interval', '2')
      parts.push(`-n ${interval}`)
      if (b(v, 'diff')) parts.push('-d')
      if (b(v, 'noTitle')) parts.push('--no-title')
      parts.push(`"${s(v, 'command') || '<command>'}"`)
      return { parts }
    },
  },
  {
    id: 'tmux',
    name: 'tmux',
    description: 'Terminal multiplexer — create, attach, split and manage sessions',
    category: 'linux',
    fields: [
      {
        id: 'action',
        label: 'Action',
        type: 'select',
        options: [
          { value: 'new', label: 'new-session — start new session' },
          { value: 'attach', label: 'attach-session — attach to existing' },
          { value: 'list', label: 'list-sessions — list all' },
          { value: 'kill', label: 'kill-session — kill a session' },
          { value: 'kill-server', label: 'kill-server — kill tmux server' },
          { value: 'new-window', label: 'new-window' },
          { value: 'split-h', label: 'split-window horizontal' },
          { value: 'split-v', label: 'split-window vertical' },
        ],
        default: 'new',
        required: true,
      },
      { id: 'sessionName', label: 'Session name (-s)', type: 'text', placeholder: 'my-session' },
      { id: 'detach', label: 'Start detached (-d)', type: 'checkbox', default: false },
    ],
    generate: (v) => {
      const action = s(v, 'action', 'new')
      const name = s(v, 'sessionName')
      const actionMap: Record<string, string> = {
        new: 'new-session', attach: 'attach-session', list: 'list-sessions',
        kill: 'kill-session', 'kill-server': 'kill-server', 'new-window': 'new-window',
        'split-h': 'split-window -h', 'split-v': 'split-window -v',
      }
      const parts = [`tmux ${actionMap[action] || action}`]
      if (name && ['new', 'attach', 'kill'].includes(action)) parts.push(`-s ${name}`)
      if (b(v, 'detach') && action === 'new') parts.push('-d')
      return { parts }
    },
  },
  {
    id: 'nohup',
    name: 'nohup / background',
    description: 'Run a process that persists after logout',
    category: 'linux',
    fields: [
      { id: 'command', label: 'Command to run', type: 'text', placeholder: 'python3 server.py', required: true },
      { id: 'outputFile', label: 'Log output to file', type: 'text', placeholder: 'app.log', default: 'nohup.out' },
      { id: 'background', label: 'Run in background (&)', type: 'checkbox', default: true },
      { id: 'redirectStderr', label: 'Redirect stderr to stdout (2>&1)', type: 'checkbox', default: true },
    ],
    generate: (v) => {
      const cmd = s(v, 'command') || '<command>'
      const out = s(v, 'outputFile', 'nohup.out')
      const parts = [`nohup ${cmd}`]
      if (b(v, 'redirectStderr')) parts.push('2>&1')
      parts.push(`> ${out}`)
      if (b(v, 'background')) parts.push('&')
      return { parts }
    },
  },
  // ─── SSL / Security ───────────────────────────────────────────────────────
  {
    id: 'openssl',
    name: 'openssl',
    description: 'Inspect, generate or verify SSL/TLS certificates',
    category: 'linux',
    fields: [
      {
        id: 'mode',
        label: 'Operation',
        type: 'select',
        options: [
          { value: 'check-remote', label: 'Check remote certificate' },
          { value: 'check-file', label: 'Inspect certificate file' },
          { value: 'check-key', label: 'Inspect private key' },
          { value: 'generate-csr', label: 'Generate CSR + private key' },
          { value: 'self-signed', label: 'Generate self-signed cert' },
          { value: 'verify', label: 'Verify cert against CA bundle' },
          { value: 'convert-pem', label: 'Convert PFX/P12 → PEM' },
        ],
        default: 'check-remote',
        required: true,
      },
      { id: 'host', label: 'Host:port', type: 'text', placeholder: 'example.com:443', dependsOn: { field: 'mode', value: 'check-remote' } },
      { id: 'certFile', label: 'Certificate file (.crt/.pem)', type: 'text', placeholder: 'server.crt' },
      { id: 'keyFile', label: 'Private key file', type: 'text', placeholder: 'server.key' },
      { id: 'days', label: 'Validity days (-days)', type: 'number', placeholder: '365', default: '365' },
      { id: 'cn', label: 'Common Name (CN)', type: 'text', placeholder: 'example.com' },
      { id: 'pfxFile', label: 'PFX/P12 file', type: 'text', placeholder: 'cert.pfx', dependsOn: { field: 'mode', value: 'convert-pem' } },
    ],
    generate: (v) => {
      const mode = s(v, 'mode', 'check-remote')
      switch (mode) {
        case 'check-remote': {
          const host = s(v, 'host', 'example.com:443')
          return { parts: [`echo | openssl s_client -connect ${host} 2>/dev/null`, '| openssl x509 -noout -text', '| grep -E "Subject:|Issuer:|Not After"'] }
        }
        case 'check-file': {
          const cert = s(v, 'certFile') || '<cert.crt>'
          return { parts: [`openssl x509 -in ${cert} -noout -text`] }
        }
        case 'check-key': {
          const key = s(v, 'keyFile') || '<key.pem>'
          return { parts: [`openssl rsa -in ${key} -check`] }
        }
        case 'generate-csr': {
          const key = s(v, 'keyFile') || 'server.key'
          const cn = s(v, 'cn') || '<domain>'
          return { parts: [`openssl req -new -newkey rsa:2048 -nodes`, `-keyout ${key}`, `-out server.csr`, `-subj "/CN=${cn}"`] }
        }
        case 'self-signed': {
          const key = s(v, 'keyFile') || 'server.key'
          const cert = s(v, 'certFile') || 'server.crt'
          const days = s(v, 'days', '365')
          const cn = s(v, 'cn') || 'localhost'
          return { parts: [`openssl req -x509 -newkey rsa:4096 -nodes`, `-keyout ${key}`, `-out ${cert}`, `-days ${days}`, `-subj "/CN=${cn}"`] }
        }
        case 'verify': {
          const cert = s(v, 'certFile') || '<cert.crt>'
          return { parts: [`openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt`, cert] }
        }
        case 'convert-pem': {
          const pfx = s(v, 'pfxFile') || '<cert.pfx>'
          return { parts: [`openssl pkcs12 -in ${pfx} -out cert.pem -nodes`] }
        }
        default: return { parts: ['openssl'] }
      }
    },
  },
  {
    id: 'certbot',
    name: 'certbot',
    description: "Obtain and renew Let's Encrypt SSL certificates",
    category: 'linux',
    fields: [
      {
        id: 'mode',
        label: 'Mode',
        type: 'select',
        options: [
          { value: 'nginx', label: 'Nginx — auto configure' },
          { value: 'apache', label: 'Apache — auto configure' },
          { value: 'standalone', label: 'Standalone (no web server)' },
          { value: 'certonly', label: 'Cert only (manual)' },
          { value: 'renew', label: 'Renew all certs' },
          { value: 'renew-dry', label: 'Dry-run renewal' },
          { value: 'list', label: 'List certificates' },
          { value: 'delete', label: 'Delete certificate' },
        ],
        default: 'nginx',
        required: true,
      },
      { id: 'domains', label: 'Domains (-d)', type: 'multi-text', placeholder: 'example.com' },
      { id: 'email', label: 'Email (--email)', type: 'text', placeholder: 'admin@example.com' },
      { id: 'noEff', label: 'No EFF email sharing (--no-eff-email)', type: 'checkbox', default: true },
      { id: 'agree', label: 'Agree to TOS (--agree-tos)', type: 'checkbox', default: true },
    ],
    generate: (v) => {
      const mode = s(v, 'mode', 'nginx')
      const domains = a(v, 'domains').filter(Boolean)
      if (['renew', 'renew-dry', 'list'].includes(mode)) {
        const cmd = mode === 'renew-dry' ? 'certbot renew --dry-run' : mode === 'list' ? 'certbot certificates' : 'certbot renew'
        return { parts: [cmd] }
      }
      if (mode === 'delete') {
        return { parts: ['certbot delete', domains.length ? `--cert-name ${domains[0]}` : '--cert-name <domain>'] }
      }
      const flagMap: Record<string, string> = { nginx: '--nginx', apache: '--apache', standalone: '--standalone', certonly: 'certonly --standalone' }
      const parts = [`certbot ${flagMap[mode] || mode}`]
      domains.forEach(d => parts.push(`-d ${d}`))
      const email = s(v, 'email')
      if (email) parts.push(`--email ${email}`)
      if (b(v, 'agree')) parts.push('--agree-tos')
      if (b(v, 'noEff')) parts.push('--no-eff-email')
      return { parts }
    },
  },
  // ─── Utilities ────────────────────────────────────────────────────────────
  {
    id: 'diff',
    name: 'diff',
    description: 'Compare files or directories line by line',
    category: 'linux',
    fields: [
      { id: 'file1', label: 'File / directory 1', type: 'text', placeholder: 'old_config.conf', required: true },
      { id: 'file2', label: 'File / directory 2', type: 'text', placeholder: 'new_config.conf', required: true },
      { id: 'unified', label: 'Unified diff (-u)', type: 'checkbox', default: true },
      { id: 'context', label: 'Context lines', type: 'number', placeholder: '3', default: '3' },
      { id: 'recursive', label: 'Recursive (-r)', type: 'checkbox', default: false },
      { id: 'ignoreCase', label: 'Ignore case (-i)', type: 'checkbox', default: false },
      { id: 'ignoreWhitespace', label: 'Ignore whitespace (-b)', type: 'checkbox', default: false },
      { id: 'color', label: 'Colorize output (--color)', type: 'checkbox', default: true },
    ],
    generate: (v) => {
      const f1 = s(v, 'file1') || '<file1>'
      const f2 = s(v, 'file2') || '<file2>'
      const parts = ['diff']
      if (b(v, 'unified')) { const ctx = s(v, 'context', '3'); parts.push(`-u${ctx}`) }
      if (b(v, 'recursive')) parts.push('-r')
      if (b(v, 'ignoreCase')) parts.push('-i')
      if (b(v, 'ignoreWhitespace')) parts.push('-b')
      if (b(v, 'color')) parts.push('--color=always')
      parts.push(f1, f2)
      return { parts }
    },
  },
  {
    id: 'wc-xargs',
    name: 'wc / xargs',
    description: 'Word/line counts or build commands from piped input',
    category: 'linux',
    fields: [
      {
        id: 'tool',
        label: 'Tool',
        type: 'radio',
        options: [
          { value: 'wc', label: 'wc — count lines/words/chars' },
          { value: 'xargs', label: 'xargs — build & execute commands' },
        ],
        default: 'wc',
        required: true,
      },
      { id: 'file', label: 'File (wc)', type: 'text', placeholder: 'access.log', dependsOn: { field: 'tool', value: 'wc' } },
      { id: 'linesOnly', label: 'Lines only (-l)', type: 'checkbox', default: true, dependsOn: { field: 'tool', value: 'wc' } },
      { id: 'xargsCmd', label: 'Command to run (xargs)', type: 'text', placeholder: 'rm -rf', dependsOn: { field: 'tool', value: 'xargs' } },
      { id: 'parallel', label: 'Parallel jobs (-P)', type: 'number', placeholder: '4', dependsOn: { field: 'tool', value: 'xargs' } },
      { id: 'batchSize', label: 'Items per command (-n)', type: 'number', placeholder: '1', dependsOn: { field: 'tool', value: 'xargs' } },
      { id: 'null', label: 'Null-delimited input (-0)', type: 'checkbox', default: false, dependsOn: { field: 'tool', value: 'xargs' } },
    ],
    generate: (v) => {
      const tool = s(v, 'tool', 'wc')
      if (tool === 'wc') {
        const parts = ['wc']
        if (b(v, 'linesOnly')) parts.push('-l')
        const file = s(v, 'file')
        if (file) parts.push(file)
        return { parts }
      } else {
        const parts = ['xargs']
        if (b(v, 'null')) parts.push('-0')
        const n = s(v, 'batchSize')
        if (n) parts.push(`-n ${n}`)
        const p = s(v, 'parallel')
        if (p) parts.push(`-P ${p}`)
        const cmd = s(v, 'xargsCmd')
        if (cmd) parts.push(cmd)
        return { parts }
      }
    },
  },
]
