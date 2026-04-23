import { Command, FormValues } from '../types'

const s = (v: FormValues, k: string) => (v[k] as string) || ''
const b = (v: FormValues, k: string) => v[k] === true

export const redisCommands: Command[] = [
  {
    id: 'redis-cli-connect',
    name: 'redis-cli connect',
    description: 'Connect to a Redis server',
    category: 'redis',
    fields: [
      { id: 'host', label: 'Host (-h)', type: 'text', placeholder: '127.0.0.1', default: '127.0.0.1' },
      { id: 'port', label: 'Port (-p)', type: 'text', placeholder: '6379', default: '6379' },
      { id: 'db', label: 'Database index (-n)', type: 'text', placeholder: '0' },
      { id: 'auth', label: 'Password (-a)', type: 'text', placeholder: 'your_password' },
      { id: 'tls', label: 'Use TLS (--tls)', type: 'checkbox' },
      { id: 'url', label: 'Use URL format (redis://)', type: 'checkbox' },
    ],
    generate(v) {
      if (b(v, 'url')) {
        const auth = s(v, 'auth') ? `:${s(v, 'auth')}@` : ''
        const host = s(v, 'host') || '127.0.0.1'
        const port = s(v, 'port') || '6379'
        const proto = b(v, 'tls') ? 'rediss' : 'redis'
        return { parts: [`redis-cli -u ${proto}://${auth}${host}:${port}`] }
      }
      let cmd = `redis-cli -h ${s(v, 'host') || '127.0.0.1'} -p ${s(v, 'port') || '6379'}`
      if (s(v, 'db')) cmd += ` -n ${s(v, 'db')}`
      if (s(v, 'auth')) cmd += ` -a ${s(v, 'auth')}`
      if (b(v, 'tls')) cmd += ' --tls'
      return { parts: [cmd] }
    },
  },
  {
    id: 'redis-keys',
    name: 'keys / scan',
    description: 'Search or scan Redis keys',
    category: 'redis',
    fields: [
      { id: 'method', label: 'Method', type: 'select', options: ['SCAN (safe)', 'KEYS (blocking)'], default: 'SCAN (safe)' },
      { id: 'pattern', label: 'Pattern', type: 'text', placeholder: 'user:*', default: '*' },
      { id: 'count', label: 'Scan count hint', type: 'text', placeholder: '100' },
      { id: 'type', label: 'Filter by type (SCAN only)', type: 'select', options: ['', 'string', 'list', 'set', 'zset', 'hash', 'stream'], default: '' },
    ],
    generate(v) {
      const pattern = s(v, 'pattern') || '*'
      const method = s(v, 'method') || 'SCAN (safe)'
      if (method.startsWith('KEYS')) {
        return { parts: [`redis-cli KEYS "${pattern}"`] }
      }
      let cmd = `redis-cli SCAN 0 MATCH "${pattern}"`
      if (s(v, 'count')) cmd += ` COUNT ${s(v, 'count')}`
      if (s(v, 'type')) cmd += ` TYPE ${s(v, 'type')}`
      return { parts: [cmd] }
    },
  },
  {
    id: 'redis-get-set',
    name: 'GET / SET / DEL',
    description: 'Basic Redis key-value operations',
    category: 'redis',
    fields: [
      { id: 'op', label: 'Operation', type: 'select', options: ['GET', 'SET', 'DEL', 'EXISTS', 'TTL', 'PERSIST', 'EXPIRE', 'TYPE', 'RENAME'], default: 'GET' },
      { id: 'key', label: 'Key *', type: 'text', placeholder: 'session:abc123' },
      { id: 'value', label: 'Value (SET)', type: 'text', placeholder: 'my_value' },
      { id: 'ex', label: 'Expiry seconds (EX)', type: 'text', placeholder: '3600' },
      { id: 'nx', label: 'SET only if not exists (NX)', type: 'checkbox' },
    ],
    generate(v) {
      const op = s(v, 'op') || 'GET'
      const key = s(v, 'key') || 'KEY'
      let cmd = `redis-cli ${op} ${key}`
      if (op === 'SET') {
        cmd += ` "${s(v, 'value') || 'VALUE'}"`
        if (s(v, 'ex')) cmd += ` EX ${s(v, 'ex')}`
        if (b(v, 'nx')) cmd += ' NX'
      } else if (op === 'EXPIRE') {
        cmd += ` ${s(v, 'ex') || '3600'}`
      } else if (op === 'RENAME') {
        cmd += ` ${s(v, 'value') || 'NEW_KEY'}`
      }
      return { parts: [cmd] }
    },
  },
  {
    id: 'redis-hash',
    name: 'Hash operations (HGET/HSET)',
    description: 'Work with Redis hash data structures',
    category: 'redis',
    fields: [
      { id: 'op', label: 'Operation', type: 'select', options: ['HGETALL', 'HGET', 'HSET', 'HDEL', 'HMGET', 'HKEYS', 'HVALS', 'HLEN'], default: 'HGETALL' },
      { id: 'key', label: 'Hash key *', type: 'text', placeholder: 'user:1001' },
      { id: 'field', label: 'Field', type: 'text', placeholder: 'email' },
      { id: 'value', label: 'Value (HSET)', type: 'text', placeholder: 'user@example.com' },
    ],
    generate(v) {
      const op = s(v, 'op') || 'HGETALL'
      const key = s(v, 'key') || 'HASH_KEY'
      let cmd = `redis-cli ${op} ${key}`
      if (['HGET', 'HDEL', 'HMGET'].includes(op) && s(v, 'field')) cmd += ` ${s(v, 'field')}`
      if (op === 'HSET' && s(v, 'field')) cmd += ` ${s(v, 'field')} "${s(v, 'value') || 'VALUE'}"`
      return { parts: [cmd] }
    },
  },
  {
    id: 'redis-pub-sub',
    name: 'Pub/Sub',
    description: 'Redis publish/subscribe messaging',
    category: 'redis',
    fields: [
      { id: 'op', label: 'Operation', type: 'select', options: ['SUBSCRIBE', 'PSUBSCRIBE', 'PUBLISH'], default: 'SUBSCRIBE' },
      { id: 'channel', label: 'Channel *', type: 'text', placeholder: 'notifications' },
      { id: 'message', label: 'Message (PUBLISH)', type: 'text', placeholder: 'Hello World' },
    ],
    generate(v) {
      const op = s(v, 'op') || 'SUBSCRIBE'
      const channel = s(v, 'channel') || 'CHANNEL'
      if (op === 'PUBLISH') {
        return { parts: [`redis-cli PUBLISH ${channel} "${s(v, 'message') || 'MESSAGE'}"`] }
      }
      return { parts: [`redis-cli ${op} ${channel}`] }
    },
  },
  {
    id: 'redis-monitor',
    name: 'monitor / info / debug',
    description: 'Redis server monitoring and diagnostics',
    category: 'redis',
    fields: [
      { id: 'op', label: 'Command', type: 'select', options: ['MONITOR', 'INFO all', 'INFO memory', 'INFO stats', 'INFO replication', 'INFO clients', 'DEBUG SLEEP', 'SLOWLOG GET', 'CONFIG GET maxmemory'], default: 'INFO all' },
      { id: 'sleep_sec', label: 'Sleep seconds (DEBUG SLEEP)', type: 'text', placeholder: '5' },
    ],
    generate(v) {
      const op = s(v, 'op') || 'INFO all'
      if (op === 'DEBUG SLEEP') {
        return { parts: [`redis-cli DEBUG SLEEP ${s(v, 'sleep_sec') || '5'}`] }
      }
      return { parts: [`redis-cli ${op}`] }
    },
  },
  {
    id: 'redis-flush',
    name: 'flush / del pattern',
    description: 'Flush databases or delete keys by pattern',
    category: 'redis',
    fields: [
      { id: 'op', label: 'Operation', type: 'select', options: ['FLUSHDB (current db)', 'FLUSHALL (all dbs)', 'Delete by pattern'], default: 'FLUSHDB (current db)' },
      { id: 'pattern', label: 'Pattern (Delete by pattern)', type: 'text', placeholder: 'session:*' },
      { id: 'async', label: 'Async mode (ASYNC)', type: 'checkbox' },
    ],
    generate(v) {
      const op = s(v, 'op') || 'FLUSHDB (current db)'
      const async_ = b(v, 'async') ? ' ASYNC' : ''
      if (op.startsWith('FLUSHDB')) return { parts: [`redis-cli FLUSHDB${async_}`] }
      if (op.startsWith('FLUSHALL')) return { parts: [`redis-cli FLUSHALL${async_}`] }
      const pattern = s(v, 'pattern') || 'KEY:*'
      return { parts: [`redis-cli --scan --pattern "${pattern}" | xargs redis-cli DEL`] }
    },
  },
]
