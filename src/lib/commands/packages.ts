import { Command, FormValues } from '../types'

const s = (v: FormValues, k: string, fb = '') => (v[k] as string) || fb
const b = (v: FormValues, k: string) => !!v[k]
const a = (v: FormValues, k: string): string[] => (v[k] as string[]) || []

export const packageCommands: Command[] = [
  {
    id: 'npm-install',
    name: 'npm / yarn / pnpm install',
    description: 'Install packages with your preferred package manager',
    category: 'packages',
    fields: [
      {
        id: 'manager',
        label: 'Package manager',
        type: 'radio',
        options: [
          { value: 'npm', label: 'npm' },
          { value: 'yarn', label: 'yarn' },
          { value: 'pnpm', label: 'pnpm' },
          { value: 'bun', label: 'bun' },
        ],
        default: 'npm',
        required: true,
      },
      {
        id: 'packages',
        label: 'Packages to install',
        type: 'multi-text',
        placeholder: 'express@4.18.2',
        helpText: 'Leave empty to install from package.json (npm install)',
      },
      { id: 'dev', label: 'Save as devDependency (-D / --save-dev)', type: 'checkbox', default: false },
      { id: 'exact', label: 'Exact version (-E / --save-exact)', type: 'checkbox', default: false },
      { id: 'global', label: 'Global install (-g)', type: 'checkbox', default: false },
      { id: 'legacy', label: 'Legacy peer deps (--legacy-peer-deps)', type: 'checkbox', default: false, dependsOn: { field: 'manager', value: 'npm' } },
      { id: 'frozen', label: 'Frozen lockfile (CI mode)', type: 'checkbox', default: false },
    ],
    generate: (v) => {
      const mgr = s(v, 'manager', 'npm')
      const packages = a(v, 'packages').filter(Boolean)
      let base = mgr

      // Install command name differs per manager
      const installCmd = mgr === 'bun' ? 'add' : 'install'

      if (packages.length === 0) {
        // Install from lockfile
        if (b(v, 'frozen')) {
          const frozenFlag: Record<string, string> = {
            npm: 'npm ci',
            yarn: 'yarn install --frozen-lockfile',
            pnpm: 'pnpm install --frozen-lockfile',
            bun: 'bun install --frozen-lockfile',
          }
          return { parts: [frozenFlag[mgr] || `${mgr} install`] }
        }
        return { parts: [`${base} ${installCmd}`] }
      }

      const parts = [`${base} ${mgr === 'npm' ? 'install' : 'add'}`]
      if (b(v, 'dev')) parts.push(mgr === 'npm' ? '--save-dev' : '-D')
      if (b(v, 'exact')) parts.push(mgr === 'npm' ? '--save-exact' : '-E')
      if (b(v, 'global')) parts.push('-g')
      if (b(v, 'legacy') && mgr === 'npm') parts.push('--legacy-peer-deps')
      packages.forEach(p => parts.push(p))
      return { parts }
    },
  },
  {
    id: 'npm-run',
    name: 'npm run / npx',
    description: 'Run a package.json script or execute a package with npx',
    category: 'packages',
    fields: [
      {
        id: 'mode',
        label: 'Mode',
        type: 'radio',
        options: [
          { value: 'run', label: 'npm run (script from package.json)' },
          { value: 'npx', label: 'npx (run a package directly)' },
        ],
        default: 'run',
        required: true,
      },
      {
        id: 'manager',
        label: 'Package manager',
        type: 'select',
        options: [
          { value: 'npm', label: 'npm' },
          { value: 'yarn', label: 'yarn' },
          { value: 'pnpm', label: 'pnpm' },
          { value: 'bun', label: 'bun' },
        ],
        default: 'npm',
        dependsOn: { field: 'mode', value: 'run' },
      },
      { id: 'script', label: 'Script / package name', type: 'text', placeholder: 'build', required: true },
      { id: 'args', label: 'Extra arguments', type: 'text', placeholder: '--watch --port 3001' },
    ],
    generate: (v) => {
      const mode = s(v, 'mode', 'run')
      const script = s(v, 'script') || '<script>'
      const args = s(v, 'args')
      if (mode === 'npx') {
        const parts = ['npx', script]
        if (args) parts.push(args)
        return { parts }
      }
      const mgr = s(v, 'manager', 'npm')
      const runCmd = mgr === 'yarn' || mgr === 'bun' ? `${mgr} ${script}` : `${mgr} run ${script}`
      const parts = [runCmd]
      if (args) parts.push(`-- ${args}`)
      return { parts }
    },
  },
  {
    id: 'pip-install',
    name: 'pip install',
    description: 'Install Python packages',
    category: 'packages',
    fields: [
      { id: 'packages', label: 'Packages', type: 'multi-text', placeholder: 'requests==2.31.0', helpText: 'Leave empty to use -r flag' },
      { id: 'requirementsFile', label: 'Requirements file (-r)', type: 'text', placeholder: 'requirements.txt' },
      { id: 'upgrade', label: 'Upgrade packages (-U / --upgrade)', type: 'checkbox', default: false },
      { id: 'userInstall', label: 'Install in user space (--user)', type: 'checkbox', default: false },
      { id: 'noCache', label: 'No cache (--no-cache-dir)', type: 'checkbox', default: false },
      { id: 'indexUrl', label: 'Custom index URL (-i)', type: 'text', placeholder: 'https://pypi.company.com/simple' },
      { id: 'editable', label: 'Editable install (-e)', type: 'checkbox', default: false },
      { id: 'editablePath', label: 'Package path', type: 'text', placeholder: '.', dependsOn: { field: 'editable', value: true } },
    ],
    generate: (v) => {
      const packages = a(v, 'packages').filter(Boolean)
      const parts = ['pip install']
      if (b(v, 'upgrade')) parts.push('-U')
      if (b(v, 'userInstall')) parts.push('--user')
      if (b(v, 'noCache')) parts.push('--no-cache-dir')
      const indexUrl = s(v, 'indexUrl')
      if (indexUrl) parts.push(`-i ${indexUrl}`)
      const reqFile = s(v, 'requirementsFile')
      if (reqFile) parts.push(`-r ${reqFile}`)
      if (b(v, 'editable')) {
        parts.push(`-e ${s(v, 'editablePath', '.')}`)
      }
      packages.forEach(p => parts.push(p))
      return { parts }
    },
  },
  {
    id: 'pip-freeze',
    name: 'pip freeze',
    description: 'Generate or update a requirements.txt file',
    category: 'packages',
    fields: [
      { id: 'outputFile', label: 'Output file', type: 'text', placeholder: 'requirements.txt' },
      { id: 'local', label: 'Only local packages (--local)', type: 'checkbox', default: false },
    ],
    generate: (v) => {
      const parts = ['pip freeze']
      if (b(v, 'local')) parts.push('--local')
      const out = s(v, 'outputFile')
      if (out) parts.push(`> ${out}`)
      return { parts }
    },
  },
]
