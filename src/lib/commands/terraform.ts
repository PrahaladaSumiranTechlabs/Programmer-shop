import { Command, FormValues } from '../types'

const s = (v: FormValues, k: string) => (v[k] as string) || ''
const b = (v: FormValues, k: string) => v[k] === true

export const terraformCommands: Command[] = [
  {
    id: 'tf-init',
    name: 'terraform init',
    description: 'Initialize a Terraform working directory',
    category: 'terraform',
    fields: [
      { id: 'backend', label: 'Backend config (-backend-config)', type: 'text', placeholder: 'bucket=my-tf-state' },
      { id: 'upgrade', label: 'Upgrade providers (-upgrade)', type: 'checkbox' },
      { id: 'reconfigure', label: 'Reconfigure backend (-reconfigure)', type: 'checkbox' },
      { id: 'migrate_state', label: 'Migrate state (-migrate-state)', type: 'checkbox' },
    ],
    generate(v) {
      const parts: string[] = ['terraform init']
      if (b(v, 'upgrade')) parts[0] += ' -upgrade'
      if (b(v, 'reconfigure')) parts[0] += ' -reconfigure'
      if (b(v, 'migrate_state')) parts[0] += ' -migrate-state'
      if (s(v, 'backend')) parts[0] += ` -backend-config="${s(v, 'backend')}"`
      return { parts }
    },
  },
  {
    id: 'tf-plan',
    name: 'terraform plan',
    description: 'Generate and show an execution plan',
    category: 'terraform',
    fields: [
      { id: 'out', label: 'Save plan to file (-out)', type: 'text', placeholder: 'tfplan' },
      { id: 'var_file', label: 'Var file (-var-file)', type: 'text', placeholder: 'prod.tfvars' },
      { id: 'var', label: 'Inline var (-var)', type: 'text', placeholder: 'env=prod' },
      { id: 'target', label: 'Target resource (-target)', type: 'text', placeholder: 'module.vpc' },
      { id: 'destroy', label: 'Plan destroy (-destroy)', type: 'checkbox' },
      { id: 'compact', label: 'Compact warnings (-compact-warnings)', type: 'checkbox' },
    ],
    generate(v) {
      const parts = ['terraform plan']
      if (b(v, 'destroy')) parts[0] += ' -destroy'
      if (b(v, 'compact')) parts[0] += ' -compact-warnings'
      if (s(v, 'var_file')) parts[0] += ` -var-file="${s(v, 'var_file')}"`
      if (s(v, 'var')) parts[0] += ` -var="${s(v, 'var')}"`
      if (s(v, 'target')) parts[0] += ` -target="${s(v, 'target')}"`
      if (s(v, 'out')) parts[0] += ` -out="${s(v, 'out')}"`
      return { parts }
    },
  },
  {
    id: 'tf-apply',
    name: 'terraform apply',
    description: 'Apply the Terraform plan',
    category: 'terraform',
    fields: [
      { id: 'plan_file', label: 'Plan file', type: 'text', placeholder: 'tfplan' },
      { id: 'var_file', label: 'Var file (-var-file)', type: 'text', placeholder: 'prod.tfvars' },
      { id: 'var', label: 'Inline var (-var)', type: 'text', placeholder: 'env=prod' },
      { id: 'target', label: 'Target resource (-target)', type: 'text', placeholder: 'module.vpc' },
      { id: 'auto_approve', label: 'Auto approve (-auto-approve)', type: 'checkbox' },
    ],
    generate(v) {
      const parts = ['terraform apply']
      if (b(v, 'auto_approve')) parts[0] += ' -auto-approve'
      if (s(v, 'var_file')) parts[0] += ` -var-file="${s(v, 'var_file')}"`
      if (s(v, 'var')) parts[0] += ` -var="${s(v, 'var')}"`
      if (s(v, 'target')) parts[0] += ` -target="${s(v, 'target')}"`
      if (s(v, 'plan_file')) parts[0] += ` ${s(v, 'plan_file')}`
      return { parts }
    },
  },
  {
    id: 'tf-destroy',
    name: 'terraform destroy',
    description: 'Destroy Terraform-managed infrastructure',
    category: 'terraform',
    fields: [
      { id: 'var_file', label: 'Var file (-var-file)', type: 'text', placeholder: 'prod.tfvars' },
      { id: 'target', label: 'Target resource (-target)', type: 'text', placeholder: 'module.rds' },
      { id: 'auto_approve', label: 'Auto approve', type: 'checkbox' },
    ],
    generate(v) {
      const parts = ['terraform destroy']
      if (b(v, 'auto_approve')) parts[0] += ' -auto-approve'
      if (s(v, 'var_file')) parts[0] += ` -var-file="${s(v, 'var_file')}"`
      if (s(v, 'target')) parts[0] += ` -target="${s(v, 'target')}"`
      return { parts }
    },
  },
  {
    id: 'tf-workspace',
    name: 'terraform workspace',
    description: 'Manage Terraform workspaces',
    category: 'terraform',
    fields: [
      { id: 'action', label: 'Action', type: 'select', options: ['list', 'new', 'select', 'show', 'delete'], default: 'list' },
      { id: 'name', label: 'Workspace name', type: 'text', placeholder: 'staging' },
    ],
    generate(v) {
      const action = s(v, 'action') || 'list'
      const name = s(v, 'name')
      const parts = [`terraform workspace ${action}${name ? ' ' + name : ''}`]
      return { parts }
    },
  },
  {
    id: 'tf-state',
    name: 'terraform state',
    description: 'Advanced state management commands',
    category: 'terraform',
    fields: [
      { id: 'action', label: 'Action', type: 'select', options: ['list', 'show', 'mv', 'rm', 'pull', 'push'], default: 'list' },
      { id: 'resource', label: 'Resource address', type: 'text', placeholder: 'aws_instance.web' },
      { id: 'dest', label: 'Destination (for mv)', type: 'text', placeholder: 'module.app.aws_instance.web' },
    ],
    generate(v) {
      const action = s(v, 'action') || 'list'
      const resource = s(v, 'resource')
      const dest = s(v, 'dest')
      let cmd = `terraform state ${action}`
      if (resource) cmd += ` ${resource}`
      if (action === 'mv' && dest) cmd += ` ${dest}`
      return { parts: [cmd] }
    },
  },
  {
    id: 'tf-import',
    name: 'terraform import',
    description: 'Import existing infrastructure into Terraform',
    category: 'terraform',
    fields: [
      { id: 'address', label: 'Resource address *', type: 'text', placeholder: 'aws_instance.web' },
      { id: 'id', label: 'Resource ID *', type: 'text', placeholder: 'i-0a1b2c3d4e5f' },
      { id: 'var_file', label: 'Var file', type: 'text', placeholder: 'prod.tfvars' },
    ],
    generate(v) {
      const parts = [`terraform import`]
      if (s(v, 'var_file')) parts[0] += ` -var-file="${s(v, 'var_file')}"`
      parts[0] += ` ${s(v, 'address') || 'RESOURCE_ADDRESS'} ${s(v, 'id') || 'RESOURCE_ID'}`
      return { parts }
    },
  },
  {
    id: 'tf-output',
    name: 'terraform output',
    description: 'Show output values from a Terraform state',
    category: 'terraform',
    fields: [
      { id: 'name', label: 'Output name (leave blank for all)', type: 'text', placeholder: 'vpc_id' },
      { id: 'json', label: 'JSON format (-json)', type: 'checkbox' },
      { id: 'raw', label: 'Raw value (-raw)', type: 'checkbox' },
    ],
    generate(v) {
      let cmd = 'terraform output'
      if (b(v, 'json')) cmd += ' -json'
      if (b(v, 'raw')) cmd += ' -raw'
      if (s(v, 'name')) cmd += ` ${s(v, 'name')}`
      return { parts: [cmd] }
    },
  },
]
