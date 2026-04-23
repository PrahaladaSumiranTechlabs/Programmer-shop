import { Command, FormValues } from '../types'

const s = (v: FormValues, k: string, fb = '') => (v[k] as string) || fb
const b = (v: FormValues, k: string) => !!v[k]
const a = (v: FormValues, k: string): string[] => (v[k] as string[]) || []

export const kubernetesCommands: Command[] = [
  {
    id: 'kubectl-get',
    name: 'kubectl get',
    description: 'List Kubernetes resources',
    category: 'kubernetes',
    fields: [
      {
        id: 'resource',
        label: 'Resource type',
        type: 'select',
        options: [
          { value: 'pods', label: 'pods' },
          { value: 'deployments', label: 'deployments' },
          { value: 'services', label: 'services' },
          { value: 'ingresses', label: 'ingresses' },
          { value: 'configmaps', label: 'configmaps' },
          { value: 'secrets', label: 'secrets' },
          { value: 'nodes', label: 'nodes' },
          { value: 'namespaces', label: 'namespaces' },
          { value: 'persistentvolumeclaims', label: 'persistentvolumeclaims' },
          { value: 'jobs', label: 'jobs' },
          { value: 'cronjobs', label: 'cronjobs' },
          { value: 'statefulsets', label: 'statefulsets' },
          { value: 'daemonsets', label: 'daemonsets' },
        ],
        default: 'pods',
        required: true,
      },
      { id: 'name', label: 'Resource name (optional)', type: 'text', placeholder: 'my-pod' },
      { id: 'namespace', label: 'Namespace (-n)', type: 'text', placeholder: 'production' },
      { id: 'allNamespaces', label: 'All namespaces (-A)', type: 'checkbox', default: false },
      {
        id: 'output',
        label: 'Output format (-o)',
        type: 'select',
        options: [
          { value: '', label: 'Default (table)' },
          { value: 'wide', label: 'wide (extra columns)' },
          { value: 'yaml', label: 'yaml' },
          { value: 'json', label: 'json' },
          { value: 'name', label: 'name only' },
        ],
        default: '',
      },
      { id: 'selector', label: 'Label selector (-l)', type: 'text', placeholder: 'app=my-app,env=prod' },
      { id: 'watch', label: 'Watch for changes (-w)', type: 'checkbox', default: false },
    ],
    generate: (v) => {
      const parts = ['kubectl get', s(v, 'resource', 'pods')]
      const name = s(v, 'name')
      if (name) parts.push(name)
      if (b(v, 'allNamespaces')) {
        parts.push('-A')
      } else {
        const ns = s(v, 'namespace')
        if (ns) parts.push(`-n ${ns}`)
      }
      const output = s(v, 'output')
      if (output) parts.push(`-o ${output}`)
      const selector = s(v, 'selector')
      if (selector) parts.push(`-l "${selector}"`)
      if (b(v, 'watch')) parts.push('-w')
      return { parts }
    },
  },
  {
    id: 'kubectl-exec',
    name: 'kubectl exec',
    description: 'Execute a command in a pod container',
    category: 'kubernetes',
    fields: [
      { id: 'pod', label: 'Pod name', type: 'text', placeholder: 'my-pod-7d4f8c', required: true },
      { id: 'namespace', label: 'Namespace (-n)', type: 'text', placeholder: 'production' },
      { id: 'container', label: 'Container (-c)', type: 'text', placeholder: 'app', helpText: 'Required for multi-container pods' },
      {
        id: 'shell',
        label: 'Shell',
        type: 'select',
        options: [
          { value: 'bash', label: 'bash' },
          { value: 'sh', label: 'sh' },
          { value: 'custom', label: 'Custom command' },
        ],
        default: 'bash',
      },
      { id: 'customCmd', label: 'Command', type: 'text', placeholder: 'python manage.py shell', dependsOn: { field: 'shell', value: 'custom' } },
    ],
    generate: (v) => {
      const pod = s(v, 'pod') || '<pod-name>'
      const ns = s(v, 'namespace')
      const container = s(v, 'container')
      const shell = s(v, 'shell', 'bash')
      const parts = ['kubectl exec -it']
      if (ns) parts.push(`-n ${ns}`)
      parts.push(pod)
      if (container) parts.push(`-c ${container}`)
      const cmd = shell === 'custom' ? (s(v, 'customCmd') || '<command>') : shell
      parts.push(`-- ${cmd}`)
      return { parts }
    },
  },
  {
    id: 'kubectl-logs',
    name: 'kubectl logs',
    description: 'Print logs from a pod or deployment',
    category: 'kubernetes',
    fields: [
      { id: 'pod', label: 'Pod/Deployment name', type: 'text', placeholder: 'my-pod-7d4f8c or deploy/my-app', required: true },
      { id: 'namespace', label: 'Namespace (-n)', type: 'text', placeholder: 'production' },
      { id: 'container', label: 'Container (-c)', type: 'text', placeholder: 'app' },
      { id: 'follow', label: 'Follow log output (-f)', type: 'checkbox', default: false },
      { id: 'previous', label: 'Previous container logs (--previous)', type: 'checkbox', default: false },
      { id: 'tail', label: 'Last N lines (--tail)', type: 'number', placeholder: '100' },
      { id: 'since', label: 'Since duration (--since)', type: 'text', placeholder: '1h or 30m' },
      { id: 'timestamps', label: 'Show timestamps (--timestamps)', type: 'checkbox', default: false },
      { id: 'allContainers', label: 'All containers (--all-containers)', type: 'checkbox', default: false },
    ],
    generate: (v) => {
      const pod = s(v, 'pod') || '<pod>'
      const ns = s(v, 'namespace')
      const container = s(v, 'container')
      const parts = ['kubectl logs']
      if (ns) parts.push(`-n ${ns}`)
      parts.push(pod)
      if (container) parts.push(`-c ${container}`)
      if (b(v, 'follow')) parts.push('-f')
      if (b(v, 'previous')) parts.push('--previous')
      if (b(v, 'timestamps')) parts.push('--timestamps')
      if (b(v, 'allContainers')) parts.push('--all-containers')
      const tail = s(v, 'tail')
      if (tail) parts.push(`--tail=${tail}`)
      const since = s(v, 'since')
      if (since) parts.push(`--since=${since}`)
      return { parts }
    },
  },
  {
    id: 'kubectl-port-forward',
    name: 'kubectl port-forward',
    description: 'Forward local port to a pod or service',
    category: 'kubernetes',
    fields: [
      {
        id: 'resourceType',
        label: 'Resource type',
        type: 'select',
        options: [
          { value: 'pod', label: 'pod' },
          { value: 'deployment', label: 'deployment' },
          { value: 'service', label: 'service' },
        ],
        default: 'pod',
        required: true,
      },
      { id: 'name', label: 'Resource name', type: 'text', placeholder: 'my-pod-7d4f8c', required: true },
      { id: 'namespace', label: 'Namespace (-n)', type: 'text', placeholder: 'production' },
      {
        id: 'ports',
        label: 'Port mappings',
        type: 'multi-text',
        placeholder: '8080:80',
        helpText: 'Format: local_port:pod_port',
        required: true,
      },
      { id: 'address', label: 'Bind address (--address)', type: 'text', placeholder: '0.0.0.0', helpText: 'Use 0.0.0.0 to expose externally' },
    ],
    generate: (v) => {
      const type = s(v, 'resourceType', 'pod')
      const name = s(v, 'name') || '<name>'
      const ns = s(v, 'namespace')
      const ports = a(v, 'ports').filter(Boolean)
      const address = s(v, 'address')
      const parts = ['kubectl port-forward']
      if (ns) parts.push(`-n ${ns}`)
      parts.push(`${type}/${name}`)
      ports.forEach(p => parts.push(p))
      if (address) parts.push(`--address ${address}`)
      return { parts }
    },
  },
  {
    id: 'kubectl-apply',
    name: 'kubectl apply',
    description: 'Apply configuration from files or directories',
    category: 'kubernetes',
    fields: [
      { id: 'files', label: 'Files or directories (-f)', type: 'multi-text', placeholder: './k8s/deployment.yaml', required: true },
      { id: 'namespace', label: 'Namespace (-n)', type: 'text', placeholder: 'production' },
      {
        id: 'dryRun',
        label: 'Dry run mode (--dry-run)',
        type: 'select',
        options: [
          { value: '', label: 'Disabled' },
          { value: 'client', label: 'client (validate locally)' },
          { value: 'server', label: 'server (validate on cluster)' },
        ],
        default: '',
      },
      { id: 'recursive', label: 'Recursive directory (-R)', type: 'checkbox', default: false },
      { id: 'prune', label: 'Prune deleted resources (--prune)', type: 'checkbox', default: false },
    ],
    generate: (v) => {
      const files = a(v, 'files').filter(Boolean)
      const ns = s(v, 'namespace')
      const dryRun = s(v, 'dryRun')
      const parts = ['kubectl apply']
      if (ns) parts.push(`-n ${ns}`)
      if (b(v, 'recursive')) parts.push('-R')
      if (dryRun) parts.push(`--dry-run=${dryRun}`)
      if (b(v, 'prune')) parts.push('--prune')
      files.forEach(f => parts.push(`-f ${f}`))
      if (!files.length) parts.push('-f <file>')
      return { parts }
    },
  },
  {
    id: 'kubectl-delete',
    name: 'kubectl delete',
    description: 'Delete resources by file or type/name',
    category: 'kubernetes',
    fields: [
      {
        id: 'mode',
        label: 'Delete by',
        type: 'radio',
        options: [
          { value: 'file', label: 'File / directory' },
          { value: 'type', label: 'Resource type + name' },
        ],
        default: 'type',
        required: true,
      },
      { id: 'file', label: 'File (-f)', type: 'text', placeholder: './k8s/deployment.yaml', dependsOn: { field: 'mode', value: 'file' } },
      {
        id: 'resource',
        label: 'Resource type',
        type: 'select',
        options: [
          { value: 'pod', label: 'pod' },
          { value: 'deployment', label: 'deployment' },
          { value: 'service', label: 'service' },
          { value: 'ingress', label: 'ingress' },
          { value: 'configmap', label: 'configmap' },
          { value: 'secret', label: 'secret' },
          { value: 'job', label: 'job' },
        ],
        default: 'pod',
        dependsOn: { field: 'mode', value: 'type' },
      },
      { id: 'name', label: 'Resource name', type: 'text', placeholder: 'my-pod', dependsOn: { field: 'mode', value: 'type' } },
      { id: 'namespace', label: 'Namespace (-n)', type: 'text', placeholder: 'production' },
      { id: 'gracePeriod', label: 'Grace period in seconds (--grace-period)', type: 'number', placeholder: '0' },
      { id: 'force', label: 'Force delete (--force)', type: 'checkbox', default: false },
    ],
    generate: (v) => {
      const mode = s(v, 'mode', 'type')
      const ns = s(v, 'namespace')
      const gracePeriod = s(v, 'gracePeriod')
      const parts = ['kubectl delete']
      if (ns) parts.push(`-n ${ns}`)
      if (b(v, 'force')) parts.push('--force')
      if (gracePeriod) parts.push(`--grace-period=${gracePeriod}`)
      if (mode === 'file') {
        parts.push(`-f ${s(v, 'file') || '<file>'}`)
      } else {
        parts.push(`${s(v, 'resource', 'pod')} ${s(v, 'name') || '<name>'}`)
      }
      return { parts }
    },
  },
  {
    id: 'kubectl-rollout',
    name: 'kubectl rollout',
    description: 'Manage rollouts: restart, check status, or undo',
    category: 'kubernetes',
    fields: [
      {
        id: 'action',
        label: 'Action',
        type: 'select',
        options: [
          { value: 'restart', label: 'restart — rolling restart' },
          { value: 'status', label: 'status — watch rollout progress' },
          { value: 'undo', label: 'undo — roll back to previous' },
          { value: 'history', label: 'history — view revision history' },
          { value: 'pause', label: 'pause — pause rollout' },
          { value: 'resume', label: 'resume — resume rollout' },
        ],
        default: 'restart',
        required: true,
      },
      {
        id: 'resourceType',
        label: 'Resource type',
        type: 'select',
        options: [
          { value: 'deployment', label: 'deployment' },
          { value: 'statefulset', label: 'statefulset' },
          { value: 'daemonset', label: 'daemonset' },
        ],
        default: 'deployment',
        required: true,
      },
      { id: 'name', label: 'Resource name', type: 'text', placeholder: 'my-app', required: true },
      { id: 'namespace', label: 'Namespace (-n)', type: 'text', placeholder: 'production' },
      { id: 'revision', label: 'Revision to undo to (--to-revision)', type: 'number', placeholder: '2', dependsOn: { field: 'action', value: 'undo' } },
    ],
    generate: (v) => {
      const action = s(v, 'action', 'restart')
      const type = s(v, 'resourceType', 'deployment')
      const name = s(v, 'name') || '<name>'
      const ns = s(v, 'namespace')
      const parts = [`kubectl rollout ${action}`]
      if (ns) parts.push(`-n ${ns}`)
      parts.push(`${type}/${name}`)
      const revision = s(v, 'revision')
      if (action === 'undo' && revision) parts.push(`--to-revision=${revision}`)
      return { parts }
    },
  },
  {
    id: 'kubectl-scale',
    name: 'kubectl scale',
    description: 'Scale a deployment or statefulset replica count',
    category: 'kubernetes',
    fields: [
      {
        id: 'resource',
        label: 'Resource type',
        type: 'select',
        options: [
          { value: 'deployment', label: 'deployment' },
          { value: 'statefulset', label: 'statefulset' },
          { value: 'replicaset', label: 'replicaset' },
        ],
        default: 'deployment',
        required: true,
      },
      { id: 'name', label: 'Resource name', type: 'text', placeholder: 'my-app', required: true },
      { id: 'replicas', label: 'Replicas (--replicas)', type: 'number', placeholder: '3', required: true },
      { id: 'namespace', label: 'Namespace (-n)', type: 'text', placeholder: 'production' },
    ],
    generate: (v) => {
      const type = s(v, 'resource', 'deployment')
      const name = s(v, 'name') || '<name>'
      const replicas = s(v, 'replicas') || '<n>'
      const ns = s(v, 'namespace')
      const parts = ['kubectl scale']
      if (ns) parts.push(`-n ${ns}`)
      parts.push(`--replicas=${replicas}`)
      parts.push(`${type}/${name}`)
      return { parts }
    },
  },
]
