import { Command, FormValues } from '../types'

const s = (v: FormValues, k: string, fb = '') => (v[k] as string) || fb
const b = (v: FormValues, k: string) => !!v[k]
const a = (v: FormValues, k: string): string[] => (v[k] as string[]) || []

export const gitCommands: Command[] = [
  {
    id: 'git-add',
    name: 'git add',
    description: 'Stage files — paste git status output to pick files by status',
    category: 'git',
    fields: [
      {
        id: 'files',
        label: 'Files to Stage',
        type: 'git-status-input',
        helpText: 'Paste your git status output, then select the files to stage',
        required: true,
      },
      {
        id: 'patch',
        label: 'Interactive patch mode (-p)',
        type: 'checkbox',
        default: false,
      },
    ],
    generate: (v) => {
      const files = a(v, 'files')
      const base = b(v, 'patch') ? 'git add -p' : 'git add'
      return { parts: files.length ? [base, ...files] : [base, '<files>'] }
    },
  },
  {
    id: 'git-rm',
    name: 'git rm',
    description: 'Remove files from working tree and index',
    category: 'git',
    fields: [
      {
        id: 'files',
        label: 'Files to Remove',
        type: 'git-status-input',
        helpText: 'Paste your git status output to select files',
        required: true,
      },
      { id: 'cached', label: 'Only remove from index (--cached)', type: 'checkbox', default: false },
      { id: 'force', label: 'Force remove (-f)', type: 'checkbox', default: false },
    ],
    generate: (v) => {
      const files = a(v, 'files')
      let base = 'git rm'
      if (b(v, 'cached')) base += ' --cached'
      if (b(v, 'force')) base += ' -f'
      return { parts: files.length ? [base, ...files] : [base, '<files>'] }
    },
  },
  {
    id: 'git-commit',
    name: 'git commit',
    description: 'Record staged changes with a commit message',
    category: 'git',
    fields: [
      {
        id: 'message',
        label: 'Commit Message',
        type: 'textarea',
        placeholder: 'feat: add user authentication\n\nImplemented JWT-based auth with refresh tokens.',
        helpText: 'Supports multiline commit messages',
      },
      { id: 'all', label: 'Stage all tracked files (-a)', type: 'checkbox', default: false },
      { id: 'amend', label: 'Amend last commit (--amend)', type: 'checkbox', default: false },
      {
        id: 'noEdit',
        label: 'Keep last commit message (--no-edit)',
        type: 'checkbox',
        default: false,
        dependsOn: { field: 'amend', value: true },
      },
      { id: 'noVerify', label: 'Skip hooks (--no-verify)', type: 'checkbox', default: false },
      { id: 'signoff', label: 'Add Signed-off-by (-s)', type: 'checkbox', default: false },
    ],
    generate: (v) => {
      const parts = ['git commit']
      if (b(v, 'all')) parts.push('-a')
      if (b(v, 'amend')) parts.push('--amend')
      if (b(v, 'noEdit')) parts.push('--no-edit')
      if (b(v, 'noVerify')) parts.push('--no-verify')
      if (b(v, 'signoff')) parts.push('-s')
      const msg = s(v, 'message')
      if (msg) {
        const escaped = msg.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
        parts.push(`-m "${escaped}"`)
      }
      return { parts }
    },
  },
  {
    id: 'git-push',
    name: 'git push',
    description: 'Upload local commits to a remote repository',
    category: 'git',
    fields: [
      { id: 'remote', label: 'Remote', type: 'text', placeholder: 'origin', default: 'origin' },
      { id: 'branch', label: 'Branch', type: 'text', placeholder: 'main' },
      { id: 'setUpstream', label: 'Set upstream tracking (-u)', type: 'checkbox', default: false },
      { id: 'forceWithLease', label: 'Force with lease (--force-with-lease)', type: 'checkbox', default: false },
      { id: 'tags', label: 'Push all tags (--tags)', type: 'checkbox', default: false },
      { id: 'dryRun', label: 'Dry run (--dry-run)', type: 'checkbox', default: false },
    ],
    generate: (v) => {
      const parts = ['git push']
      if (b(v, 'setUpstream')) parts.push('-u')
      if (b(v, 'forceWithLease')) parts.push('--force-with-lease')
      if (b(v, 'tags')) parts.push('--tags')
      if (b(v, 'dryRun')) parts.push('--dry-run')
      const remote = s(v, 'remote', 'origin')
      const branch = s(v, 'branch')
      parts.push(branch ? `${remote} ${branch}` : remote)
      return { parts }
    },
  },
  {
    id: 'git-pull',
    name: 'git pull',
    description: 'Fetch and merge changes from a remote branch',
    category: 'git',
    fields: [
      { id: 'remote', label: 'Remote', type: 'text', placeholder: 'origin' },
      { id: 'branch', label: 'Branch', type: 'text', placeholder: 'main' },
      { id: 'rebase', label: 'Rebase instead of merge (--rebase)', type: 'checkbox', default: false },
      { id: 'ffOnly', label: 'Fast-forward only (--ff-only)', type: 'checkbox', default: false },
      { id: 'noCommit', label: 'Merge without committing (--no-commit)', type: 'checkbox', default: false },
    ],
    generate: (v) => {
      const parts = ['git pull']
      if (b(v, 'rebase')) parts.push('--rebase')
      if (b(v, 'ffOnly')) parts.push('--ff-only')
      if (b(v, 'noCommit')) parts.push('--no-commit')
      const remote = s(v, 'remote')
      const branch = s(v, 'branch')
      if (remote) parts.push(branch ? `${remote} ${branch}` : remote)
      return { parts }
    },
  },
  {
    id: 'git-log',
    name: 'git log',
    description: 'Show commit history with custom formatting and filters',
    category: 'git',
    fields: [
      { id: 'count', label: 'Number of commits (-n)', type: 'number', placeholder: '10' },
      {
        id: 'format',
        label: 'Format',
        type: 'select',
        options: [
          { value: '', label: 'Default' },
          { value: '--oneline', label: 'Oneline (compact)' },
          { value: '--format="%h %an %ar %s"', label: 'Short: hash + author + date + subject' },
          { value: '--format="%H %ae %aI %s"', label: 'Full: hash + email + ISO date + subject' },
          { value: '--pretty=format:"%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%ar) %C(bold blue)<%an>%Creset"', label: 'Colored compact' },
        ],
        default: '',
      },
      { id: 'graph', label: 'Show branch graph (--graph)', type: 'checkbox', default: false },
      { id: 'all', label: 'All branches (--all)', type: 'checkbox', default: false },
      { id: 'author', label: 'Filter by author', type: 'text', placeholder: 'john@example.com' },
      { id: 'since', label: 'Since date', type: 'text', placeholder: '2 weeks ago' },
      { id: 'until', label: 'Until date', type: 'text', placeholder: 'yesterday' },
      { id: 'grep', label: 'Search commit messages (--grep)', type: 'text', placeholder: 'fix:' },
      { id: 'file', label: 'Limit to file/path', type: 'text', placeholder: 'src/app.ts' },
      { id: 'patch', label: 'Show diffs (-p)', type: 'checkbox', default: false },
      { id: 'stat', label: 'Show file stats (--stat)', type: 'checkbox', default: false },
    ],
    generate: (v) => {
      const parts = ['git log']
      const count = s(v, 'count')
      if (count) parts.push(`-n ${count}`)
      const format = s(v, 'format')
      if (format) parts.push(format)
      if (b(v, 'graph')) parts.push('--graph')
      if (b(v, 'all')) parts.push('--all')
      if (b(v, 'patch')) parts.push('-p')
      if (b(v, 'stat')) parts.push('--stat')
      const author = s(v, 'author')
      if (author) parts.push(`--author="${author}"`)
      const since = s(v, 'since')
      if (since) parts.push(`--since="${since}"`)
      const until = s(v, 'until')
      if (until) parts.push(`--until="${until}"`)
      const grep = s(v, 'grep')
      if (grep) parts.push(`--grep="${grep}"`)
      const file = s(v, 'file')
      if (file) parts.push(`-- ${file}`)
      return { parts }
    },
  },
  {
    id: 'git-stash',
    name: 'git stash',
    description: 'Temporarily shelve or restore uncommitted changes',
    category: 'git',
    fields: [
      {
        id: 'action',
        label: 'Action',
        type: 'select',
        options: [
          { value: 'push', label: 'push — save current work' },
          { value: 'pop', label: 'pop — apply latest & remove from list' },
          { value: 'apply', label: 'apply — apply without removing' },
          { value: 'list', label: 'list — show all stashes' },
          { value: 'drop', label: 'drop — delete a stash' },
          { value: 'clear', label: 'clear — delete all stashes' },
          { value: 'show', label: 'show — inspect a stash' },
        ],
        default: 'push',
        required: true,
      },
      {
        id: 'message',
        label: 'Stash message (-m)',
        type: 'text',
        placeholder: 'WIP: feature in progress',
        dependsOn: { field: 'action', value: 'push' },
      },
      {
        id: 'includeUntracked',
        label: 'Include untracked files (-u)',
        type: 'checkbox',
        default: false,
        dependsOn: { field: 'action', value: 'push' },
      },
      {
        id: 'keepIndex',
        label: 'Keep staged changes (--keep-index)',
        type: 'checkbox',
        default: false,
        dependsOn: { field: 'action', value: 'push' },
      },
      {
        id: 'stashRef',
        label: 'Stash reference',
        type: 'text',
        placeholder: 'stash@{1}',
        helpText: 'Optional — defaults to stash@{0}',
      },
    ],
    generate: (v) => {
      const action = s(v, 'action', 'push')
      const parts = [`git stash ${action}`]
      if (action === 'push') {
        if (b(v, 'includeUntracked')) parts.push('-u')
        if (b(v, 'keepIndex')) parts.push('--keep-index')
        const msg = s(v, 'message')
        if (msg) parts.push(`-m "${msg}"`)
      }
      const ref = s(v, 'stashRef')
      if (ref && ['pop', 'apply', 'drop', 'show'].includes(action)) parts.push(ref)
      return { parts }
    },
  },
  {
    id: 'git-reset',
    name: 'git reset',
    description: 'Undo commits or unstage files',
    category: 'git',
    fields: [
      {
        id: 'mode',
        label: 'Mode',
        type: 'radio',
        options: [
          { value: '--soft', label: '--soft  (keep changes staged)' },
          { value: '--mixed', label: '--mixed  (keep changes unstaged)' },
          { value: '--hard', label: '--hard  (discard all changes)' },
        ],
        default: '--mixed',
        required: true,
      },
      {
        id: 'commit',
        label: 'Commit reference',
        type: 'text',
        placeholder: 'HEAD~1',
        default: 'HEAD~1',
        required: true,
      },
    ],
    generate: (v) => {
      const mode = s(v, 'mode', '--mixed')
      const commit = s(v, 'commit', 'HEAD~1')
      return { parts: [`git reset ${mode}`, commit] }
    },
  },
  {
    id: 'git-cherry-pick',
    name: 'git cherry-pick',
    description: 'Apply one or more commits from another branch',
    category: 'git',
    fields: [
      {
        id: 'commits',
        label: 'Commit hashes',
        type: 'multi-text',
        placeholder: 'abc1234',
        helpText: 'Add one commit hash per entry',
        required: true,
      },
      { id: 'noCommit', label: 'Stage without committing (-n)', type: 'checkbox', default: false },
      { id: 'edit', label: 'Edit commit message (-e)', type: 'checkbox', default: false },
    ],
    generate: (v) => {
      const commits = a(v, 'commits').filter(Boolean)
      let base = 'git cherry-pick'
      if (b(v, 'noCommit')) base += ' -n'
      if (b(v, 'edit')) base += ' -e'
      return { parts: commits.length ? [base, ...commits] : [base, '<commit>'] }
    },
  },
  {
    id: 'git-branch',
    name: 'git branch',
    description: 'Create, rename, delete, or list branches',
    category: 'git',
    fields: [
      {
        id: 'action',
        label: 'Action',
        type: 'select',
        options: [
          { value: 'create', label: 'Create branch' },
          { value: 'delete', label: 'Delete branch' },
          { value: 'rename', label: 'Rename branch' },
          { value: 'list', label: 'List branches' },
        ],
        default: 'create',
        required: true,
      },
      { id: 'branchName', label: 'Branch name', type: 'text', placeholder: 'feature/my-feature' },
      {
        id: 'newName',
        label: 'New name',
        type: 'text',
        placeholder: 'feature/new-name',
        dependsOn: { field: 'action', value: 'rename' },
      },
      {
        id: 'force',
        label: 'Force delete (-D)',
        type: 'checkbox',
        default: false,
        dependsOn: { field: 'action', value: 'delete' },
      },
      {
        id: 'all',
        label: 'Show remote branches (-a)',
        type: 'checkbox',
        default: false,
        dependsOn: { field: 'action', value: 'list' },
      },
      {
        id: 'verbose',
        label: 'Verbose with tracking info (-vv)',
        type: 'checkbox',
        default: false,
        dependsOn: { field: 'action', value: 'list' },
      },
    ],
    generate: (v) => {
      const action = s(v, 'action', 'create')
      const name = s(v, 'branchName')
      switch (action) {
        case 'create':
          return { parts: ['git branch', name || '<branch-name>'] }
        case 'delete': {
          const flag = b(v, 'force') ? '-D' : '-d'
          return { parts: [`git branch ${flag}`, name || '<branch-name>'] }
        }
        case 'rename': {
          const newName = s(v, 'newName')
          return { parts: ['git branch -m', name || '<old-name>', newName || '<new-name>'] }
        }
        case 'list': {
          let cmd = 'git branch'
          if (b(v, 'all')) cmd += ' -a'
          if (b(v, 'verbose')) cmd += ' -vv'
          return { parts: [cmd] }
        }
        default:
          return { parts: ['git branch'] }
      }
    },
  },
]
