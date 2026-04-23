import { Command, FormValues } from '../types'

const s = (v: FormValues, k: string, fb = '') => (v[k] as string) || fb
const b = (v: FormValues, k: string) => !!v[k]

export const databaseCommands: Command[] = [
  {
    id: 'psql-connect',
    name: 'psql connect',
    description: 'Connect to a PostgreSQL database and optionally run a command or file',
    category: 'database',
    fields: [
      { id: 'host', label: 'Host (-h)', type: 'text', placeholder: 'localhost', default: 'localhost' },
      { id: 'port', label: 'Port (-p)', type: 'number', placeholder: '5432', default: '5432' },
      { id: 'user', label: 'User (-U)', type: 'text', placeholder: 'postgres', required: true },
      { id: 'database', label: 'Database (-d)', type: 'text', placeholder: 'mydb', required: true },
      {
        id: 'mode',
        label: 'Run',
        type: 'select',
        options: [
          { value: 'interactive', label: 'Interactive shell' },
          { value: 'command', label: 'Single SQL command (-c)' },
          { value: 'file', label: 'SQL file (-f)' },
        ],
        default: 'interactive',
      },
      { id: 'command', label: 'SQL command', type: 'textarea', placeholder: 'SELECT COUNT(*) FROM users;', dependsOn: { field: 'mode', value: 'command' } },
      { id: 'file', label: 'SQL file path', type: 'text', placeholder: './migrations/001_init.sql', dependsOn: { field: 'mode', value: 'file' } },
      { id: 'noPassword', label: 'No password prompt (-w)', type: 'checkbox', default: false },
      { id: 'echo', label: 'Echo commands (-e)', type: 'checkbox', default: false },
    ],
    generate: (v) => {
      const host = s(v, 'host', 'localhost')
      const port = s(v, 'port', '5432')
      const user = s(v, 'user') || '<user>'
      const db = s(v, 'database') || '<database>'
      const mode = s(v, 'mode', 'interactive')
      const parts = ['psql']
      parts.push(`-h ${host}`)
      if (port !== '5432') parts.push(`-p ${port}`)
      parts.push(`-U ${user}`)
      parts.push(`-d ${db}`)
      if (b(v, 'noPassword')) parts.push('-w')
      if (b(v, 'echo')) parts.push('-e')
      if (mode === 'command') {
        const cmd = s(v, 'command')
        parts.push(`-c "${cmd.replace(/"/g, '\\"')}"`)
      } else if (mode === 'file') {
        parts.push(`-f ${s(v, 'file') || '<file.sql>'}`)
      }
      return { parts }
    },
  },
  {
    id: 'pg-dump',
    name: 'pg_dump',
    description: 'Backup a PostgreSQL database',
    category: 'database',
    fields: [
      { id: 'host', label: 'Host (-h)', type: 'text', placeholder: 'localhost', default: 'localhost' },
      { id: 'port', label: 'Port (-p)', type: 'number', placeholder: '5432' },
      { id: 'user', label: 'User (-U)', type: 'text', placeholder: 'postgres', required: true },
      { id: 'database', label: 'Database', type: 'text', placeholder: 'mydb', required: true },
      { id: 'outputFile', label: 'Output file (-f)', type: 'text', placeholder: 'backup.dump', required: true },
      {
        id: 'format',
        label: 'Format (-F)',
        type: 'select',
        options: [
          { value: 'c', label: 'Custom (.dump) — recommended' },
          { value: 'p', label: 'Plain SQL (.sql)' },
          { value: 't', label: 'Tar (.tar)' },
          { value: 'd', label: 'Directory' },
        ],
        default: 'c',
      },
      { id: 'schemaOnly', label: 'Schema only (--schema-only)', type: 'checkbox', default: false },
      { id: 'dataOnly', label: 'Data only (--data-only)', type: 'checkbox', default: false },
      { id: 'table', label: 'Specific table (-t)', type: 'text', placeholder: 'users' },
      { id: 'noOwner', label: 'No ownership commands (--no-owner)', type: 'checkbox', default: false },
      { id: 'verbose', label: 'Verbose (-v)', type: 'checkbox', default: false },
    ],
    generate: (v) => {
      const host = s(v, 'host', 'localhost')
      const port = s(v, 'port')
      const user = s(v, 'user') || '<user>'
      const db = s(v, 'database') || '<database>'
      const out = s(v, 'outputFile') || '<output>'
      const fmt = s(v, 'format', 'c')
      const parts = ['pg_dump']
      parts.push(`-h ${host}`)
      if (port && port !== '5432') parts.push(`-p ${port}`)
      parts.push(`-U ${user}`)
      parts.push(`-F ${fmt}`)
      if (b(v, 'schemaOnly')) parts.push('--schema-only')
      if (b(v, 'dataOnly')) parts.push('--data-only')
      if (b(v, 'noOwner')) parts.push('--no-owner')
      if (b(v, 'verbose')) parts.push('-v')
      const table = s(v, 'table')
      if (table) parts.push(`-t ${table}`)
      parts.push(`-f ${out}`)
      parts.push(db)
      return { parts }
    },
  },
  {
    id: 'pg-restore',
    name: 'pg_restore',
    description: 'Restore a PostgreSQL backup',
    category: 'database',
    fields: [
      { id: 'host', label: 'Host (-h)', type: 'text', placeholder: 'localhost', default: 'localhost' },
      { id: 'port', label: 'Port (-p)', type: 'number', placeholder: '5432' },
      { id: 'user', label: 'User (-U)', type: 'text', placeholder: 'postgres', required: true },
      { id: 'database', label: 'Target database (-d)', type: 'text', placeholder: 'mydb', required: true },
      { id: 'file', label: 'Backup file', type: 'text', placeholder: 'backup.dump', required: true },
      { id: 'clean', label: 'Drop objects before restore (-c)', type: 'checkbox', default: false },
      { id: 'create', label: 'Create database (--create)', type: 'checkbox', default: false },
      { id: 'noOwner', label: 'No ownership (--no-owner)', type: 'checkbox', default: false },
      { id: 'jobs', label: 'Parallel jobs (-j)', type: 'number', placeholder: '4' },
      { id: 'verbose', label: 'Verbose (-v)', type: 'checkbox', default: false },
    ],
    generate: (v) => {
      const host = s(v, 'host', 'localhost')
      const port = s(v, 'port')
      const user = s(v, 'user') || '<user>'
      const db = s(v, 'database') || '<database>'
      const file = s(v, 'file') || '<backup.dump>'
      const parts = ['pg_restore']
      parts.push(`-h ${host}`)
      if (port && port !== '5432') parts.push(`-p ${port}`)
      parts.push(`-U ${user}`)
      parts.push(`-d ${db}`)
      if (b(v, 'clean')) parts.push('-c')
      if (b(v, 'create')) parts.push('--create')
      if (b(v, 'noOwner')) parts.push('--no-owner')
      if (b(v, 'verbose')) parts.push('-v')
      const jobs = s(v, 'jobs')
      if (jobs) parts.push(`-j ${jobs}`)
      parts.push(file)
      return { parts }
    },
  },
  {
    id: 'mysql-connect',
    name: 'mysql connect',
    description: 'Connect to a MySQL / MariaDB database',
    category: 'database',
    fields: [
      { id: 'host', label: 'Host (-h)', type: 'text', placeholder: 'localhost', default: 'localhost' },
      { id: 'port', label: 'Port (-P)', type: 'number', placeholder: '3306' },
      { id: 'user', label: 'User (-u)', type: 'text', placeholder: 'root', required: true },
      { id: 'database', label: 'Database (-D)', type: 'text', placeholder: 'mydb' },
      {
        id: 'mode',
        label: 'Run',
        type: 'select',
        options: [
          { value: 'interactive', label: 'Interactive shell' },
          { value: 'command', label: 'Single SQL (-e)' },
          { value: 'file', label: 'SQL file (< file)' },
        ],
        default: 'interactive',
      },
      { id: 'command', label: 'SQL command (-e)', type: 'textarea', placeholder: 'SHOW TABLES;', dependsOn: { field: 'mode', value: 'command' } },
      { id: 'file', label: 'SQL file', type: 'text', placeholder: './schema.sql', dependsOn: { field: 'mode', value: 'file' } },
    ],
    generate: (v) => {
      const host = s(v, 'host', 'localhost')
      const port = s(v, 'port')
      const user = s(v, 'user') || '<user>'
      const db = s(v, 'database')
      const mode = s(v, 'mode', 'interactive')
      const parts = [`mysql -h ${host}`]
      if (port && port !== '3306') parts.push(`-P ${port}`)
      parts.push(`-u ${user}`)
      parts.push('-p')
      if (db) parts.push(`-D ${db}`)
      if (mode === 'command') {
        parts.push(`-e "${s(v, 'command').replace(/"/g, '\\"')}"`)
      } else if (mode === 'file') {
        return { parts: [...parts, `< ${s(v, 'file') || '<file.sql>'}`] }
      }
      return { parts }
    },
  },
  {
    id: 'mysqldump',
    name: 'mysqldump',
    description: 'Backup a MySQL / MariaDB database',
    category: 'database',
    fields: [
      { id: 'host', label: 'Host (-h)', type: 'text', placeholder: 'localhost', default: 'localhost' },
      { id: 'port', label: 'Port (-P)', type: 'number', placeholder: '3306' },
      { id: 'user', label: 'User (-u)', type: 'text', placeholder: 'root', required: true },
      { id: 'database', label: 'Database', type: 'text', placeholder: 'mydb', required: true },
      { id: 'outputFile', label: 'Output file', type: 'text', placeholder: 'backup.sql' },
      { id: 'schemaOnly', label: 'Schema only (--no-data)', type: 'checkbox', default: false },
      { id: 'dataOnly', label: 'Data only (--no-create-info)', type: 'checkbox', default: false },
      { id: 'singleTransaction', label: 'Single transaction (--single-transaction)', type: 'checkbox', default: true },
      { id: 'routines', label: 'Include routines/procedures (--routines)', type: 'checkbox', default: false },
    ],
    generate: (v) => {
      const host = s(v, 'host', 'localhost')
      const port = s(v, 'port')
      const user = s(v, 'user') || '<user>'
      const db = s(v, 'database') || '<database>'
      const out = s(v, 'outputFile')
      const parts = [`mysqldump -h ${host}`]
      if (port && port !== '3306') parts.push(`-P ${port}`)
      parts.push(`-u ${user} -p`)
      if (b(v, 'singleTransaction')) parts.push('--single-transaction')
      if (b(v, 'schemaOnly')) parts.push('--no-data')
      if (b(v, 'dataOnly')) parts.push('--no-create-info')
      if (b(v, 'routines')) parts.push('--routines')
      parts.push(db)
      if (out) parts.push(`> ${out}`)
      return { parts }
    },
  },
]
