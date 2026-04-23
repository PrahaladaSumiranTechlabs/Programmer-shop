import { Command, FormValues } from '../types'

const s = (v: FormValues, k: string) => (v[k] as string) || ''
const b = (v: FormValues, k: string) => v[k] === true

export const nginxCommands: Command[] = [
  {
    id: 'nginx-test',
    name: 'nginx -t',
    description: 'Test Nginx configuration for syntax errors',
    category: 'nginx',
    fields: [
      { id: 'config', label: 'Config file path (-c)', type: 'text', placeholder: '/etc/nginx/nginx.conf' },
    ],
    generate(v) {
      let cmd = 'nginx -t'
      if (s(v, 'config')) cmd = `nginx -t -c ${s(v, 'config')}`
      return { parts: [cmd] }
    },
  },
  {
    id: 'nginx-reload',
    name: 'nginx reload / restart',
    description: 'Reload or restart the Nginx service',
    category: 'nginx',
    fields: [
      { id: 'action', label: 'Action', type: 'select', options: ['reload', 'restart', 'stop', 'start', 'status'], default: 'reload' },
      { id: 'use_nginx', label: 'Use nginx -s signal (instead of systemctl)', type: 'checkbox' },
    ],
    generate(v) {
      const action = s(v, 'action') || 'reload'
      if (b(v, 'use_nginx') && (action === 'reload' || action === 'stop')) {
        return { parts: [`nginx -s ${action}`] }
      }
      return { parts: [`systemctl ${action} nginx`] }
    },
  },
  {
    id: 'nginx-enable-site',
    name: 'enable site (symlink)',
    description: 'Enable an Nginx site by creating symlink in sites-enabled',
    category: 'nginx',
    fields: [
      { id: 'site', label: 'Site config name *', type: 'text', placeholder: 'myapp.conf' },
    ],
    generate(v) {
      const site = s(v, 'site') || 'myapp.conf'
      return {
        parts: [
          `ln -s /etc/nginx/sites-available/${site} /etc/nginx/sites-enabled/${site}`,
          `nginx -t`,
          `systemctl reload nginx`,
        ],
      }
    },
  },
  {
    id: 'nginx-disable-site',
    name: 'disable site',
    description: 'Disable an Nginx site by removing its symlink',
    category: 'nginx',
    fields: [
      { id: 'site', label: 'Site config name *', type: 'text', placeholder: 'myapp.conf' },
    ],
    generate(v) {
      const site = s(v, 'site') || 'myapp.conf'
      return { parts: [`rm /etc/nginx/sites-enabled/${site}`, `systemctl reload nginx`] }
    },
  },
  {
    id: 'nginx-certbot',
    name: 'certbot (Let\'s Encrypt)',
    description: 'Issue or renew SSL certificate via Certbot for Nginx',
    category: 'nginx',
    fields: [
      { id: 'action', label: 'Action', type: 'select', options: ['certonly --nginx', 'renew', 'renew --dry-run', 'delete'], default: 'certonly --nginx' },
      { id: 'domain', label: 'Domain (-d)', type: 'text', placeholder: 'example.com' },
      { id: 'email', label: 'Email (--email)', type: 'text', placeholder: 'admin@example.com' },
      { id: 'staging', label: 'Staging (--staging)', type: 'checkbox' },
    ],
    generate(v) {
      const action = s(v, 'action') || 'certonly --nginx'
      let cmd = `certbot ${action}`
      if (s(v, 'domain')) cmd += ` -d ${s(v, 'domain')}`
      if (s(v, 'email')) cmd += ` --email ${s(v, 'email')} --agree-tos --no-eff-email`
      if (b(v, 'staging')) cmd += ' --staging'
      return { parts: [cmd] }
    },
  },
  {
    id: 'nginx-logs',
    name: 'nginx logs',
    description: 'Tail or filter Nginx access and error logs',
    category: 'nginx',
    fields: [
      { id: 'log_type', label: 'Log type', type: 'select', options: ['access', 'error', 'both'], default: 'access' },
      { id: 'lines', label: 'Lines to show (-n)', type: 'number', default: '50' },
      { id: 'follow', label: 'Follow (-f)', type: 'checkbox', default: true },
      { id: 'filter', label: 'grep filter', type: 'text', placeholder: '500' },
      { id: 'log_dir', label: 'Log directory', type: 'text', placeholder: '/var/log/nginx' },
    ],
    generate(v) {
      const dir = s(v, 'log_dir') || '/var/log/nginx'
      const lines = s(v, 'lines') || '50'
      const follow = b(v, 'follow')
      const filter = s(v, 'filter')
      const logType = s(v, 'log_type') || 'access'
      const parts: string[] = []
      const buildTail = (file: string) => {
        let cmd = `tail -n ${lines}${follow ? ' -f' : ''} ${dir}/${file}.log`
        if (filter) cmd += ` | grep "${filter}"`
        return cmd
      }
      if (logType === 'both') {
        parts.push(buildTail('access'), buildTail('error'))
      } else {
        parts.push(buildTail(logType))
      }
      return { parts }
    },
  },
  {
    id: 'nginx-upstream',
    name: 'upstream health check',
    description: 'Check if upstream servers are responding',
    category: 'nginx',
    fields: [
      { id: 'host', label: 'Host *', type: 'text', placeholder: '127.0.0.1' },
      { id: 'port', label: 'Port *', type: 'text', placeholder: '3000' },
      { id: 'path', label: 'Health check path', type: 'text', placeholder: '/health' },
    ],
    generate(v) {
      const host = s(v, 'host') || '127.0.0.1'
      const port = s(v, 'port') || '3000'
      const path = s(v, 'path') || '/'
      return { parts: [`curl -sf http://${host}:${port}${path} && echo "UP" || echo "DOWN"`] }
    },
  },
  {
    id: 'apache-ctl',
    name: 'apachectl / a2ensite',
    description: 'Apache HTTP Server management commands',
    category: 'nginx',
    fields: [
      { id: 'action', label: 'Action', type: 'select', options: ['configtest', 'restart', 'reload', 'stop', 'start', 'a2ensite', 'a2dissite', 'a2enmod', 'a2dismod'], default: 'configtest' },
      { id: 'target', label: 'Site / module name (for a2* actions)', type: 'text', placeholder: 'myapp' },
    ],
    generate(v) {
      const action = s(v, 'action') || 'configtest'
      const target = s(v, 'target')
      if (action.startsWith('a2')) {
        const parts = [`${action} ${target || 'SITE_OR_MODULE'}`, `systemctl reload apache2`]
        return { parts }
      }
      return { parts: [`apachectl ${action}`] }
    },
  },
]
