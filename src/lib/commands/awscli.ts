import { Command, FormValues } from '../types'

const s = (v: FormValues, k: string) => (v[k] as string) || ''
const b = (v: FormValues, k: string) => v[k] === true

export const awsCommands: Command[] = [
  {
    id: 'aws-s3-cp',
    name: 'aws s3 cp / sync',
    description: 'Copy or sync files to/from S3',
    category: 'awscli',
    fields: [
      { id: 'op', label: 'Operation', type: 'select', options: ['cp', 'sync', 'mv', 'rm', 'ls'], default: 'cp' },
      { id: 'source', label: 'Source *', type: 'text', placeholder: './dist or s3://bucket/path' },
      { id: 'dest', label: 'Destination *', type: 'text', placeholder: 's3://my-bucket/dist' },
      { id: 'recursive', label: 'Recursive (--recursive)', type: 'checkbox' },
      { id: 'exclude', label: 'Exclude pattern (--exclude)', type: 'text', placeholder: '*.tmp' },
      { id: 'acl', label: 'ACL (--acl)', type: 'select', options: ['', 'private', 'public-read', 'public-read-write', 'authenticated-read'], default: '' },
      { id: 'profile', label: 'AWS profile (--profile)', type: 'text', placeholder: 'prod' },
      { id: 'region', label: 'Region (--region)', type: 'text', placeholder: 'us-east-1' },
    ],
    generate(v) {
      const op = s(v, 'op') || 'cp'
      const src = s(v, 'source') || 'SOURCE'
      const dest = s(v, 'dest') || 'DESTINATION'
      let cmd = `aws s3 ${op} ${src}`
      if (op !== 'ls' && op !== 'rm') cmd += ` ${dest}`
      if (b(v, 'recursive')) cmd += ' --recursive'
      if (s(v, 'exclude')) cmd += ` --exclude "${s(v, 'exclude')}"`
      if (s(v, 'acl')) cmd += ` --acl ${s(v, 'acl')}`
      if (s(v, 'profile')) cmd += ` --profile ${s(v, 'profile')}`
      if (s(v, 'region')) cmd += ` --region ${s(v, 'region')}`
      return { parts: [cmd] }
    },
  },
  {
    id: 'aws-ec2',
    name: 'aws ec2',
    description: 'Common EC2 operations',
    category: 'awscli',
    fields: [
      { id: 'op', label: 'Operation', type: 'select', options: ['describe-instances', 'start-instances', 'stop-instances', 'reboot-instances', 'terminate-instances', 'describe-instance-status', 'describe-security-groups', 'describe-key-pairs'], default: 'describe-instances' },
      { id: 'instance_id', label: 'Instance ID(s)', type: 'text', placeholder: 'i-0abc123def456' },
      { id: 'filter', label: 'Filter (--filters Name=...,Values=...)', type: 'text', placeholder: 'Name=instance-state-name,Values=running' },
      { id: 'query', label: 'JMESPath query (--query)', type: 'text', placeholder: 'Reservations[*].Instances[*].InstanceId' },
      { id: 'output', label: 'Output format', type: 'select', options: ['table', 'json', 'text', 'yaml'], default: 'table' },
      { id: 'profile', label: 'AWS profile', type: 'text', placeholder: 'prod' },
      { id: 'region', label: 'Region', type: 'text', placeholder: 'us-east-1' },
    ],
    generate(v) {
      const op = s(v, 'op') || 'describe-instances'
      let cmd = `aws ec2 ${op}`
      if (s(v, 'instance_id')) cmd += ` --instance-ids ${s(v, 'instance_id')}`
      if (s(v, 'filter')) cmd += ` --filters "${s(v, 'filter')}"`
      if (s(v, 'query')) cmd += ` --query "${s(v, 'query')}"`
      if (s(v, 'output')) cmd += ` --output ${s(v, 'output')}`
      if (s(v, 'profile')) cmd += ` --profile ${s(v, 'profile')}`
      if (s(v, 'region')) cmd += ` --region ${s(v, 'region')}`
      return { parts: [cmd] }
    },
  },
  {
    id: 'aws-ecr',
    name: 'aws ecr (login & push)',
    description: 'Authenticate to ECR and push Docker images',
    category: 'awscli',
    fields: [
      { id: 'account_id', label: 'AWS Account ID *', type: 'text', placeholder: '123456789012' },
      { id: 'region', label: 'Region *', type: 'text', placeholder: 'us-east-1', default: 'us-east-1' },
      { id: 'repo', label: 'ECR repository name *', type: 'text', placeholder: 'my-app' },
      { id: 'local_tag', label: 'Local image tag', type: 'text', placeholder: 'my-app:latest' },
      { id: 'profile', label: 'AWS profile', type: 'text', placeholder: 'prod' },
    ],
    generate(v) {
      const account = s(v, 'account_id') || 'ACCOUNT_ID'
      const region = s(v, 'region') || 'us-east-1'
      const repo = s(v, 'repo') || 'my-repo'
      const localTag = s(v, 'local_tag') || `${repo}:latest`
      const profile = s(v, 'profile') ? ` --profile ${s(v, 'profile')}` : ''
      const ecrUri = `${account}.dkr.ecr.${region}.amazonaws.com`
      return {
        parts: [
          `aws ecr get-login-password --region ${region}${profile} | docker login --username AWS --password-stdin ${ecrUri}`,
          `docker tag ${localTag} ${ecrUri}/${repo}:latest`,
          `docker push ${ecrUri}/${repo}:latest`,
        ],
      }
    },
  },
  {
    id: 'aws-ssm',
    name: 'aws ssm (Session Manager)',
    description: 'Connect to EC2 via SSM without SSH',
    category: 'awscli',
    fields: [
      { id: 'op', label: 'Operation', type: 'select', options: ['start-session', 'send-command', 'get-parameter', 'put-parameter', 'get-parameters-by-path'], default: 'start-session' },
      { id: 'instance_id', label: 'Instance ID', type: 'text', placeholder: 'i-0abc123def456' },
      { id: 'command', label: 'Shell command (send-command)', type: 'text', placeholder: 'systemctl status nginx' },
      { id: 'param_name', label: 'Parameter name', type: 'text', placeholder: '/prod/db/password' },
      { id: 'param_value', label: 'Parameter value (put-parameter)', type: 'text', placeholder: 'secretvalue' },
      { id: 'with_decryption', label: 'With decryption (--with-decryption)', type: 'checkbox', default: true },
      { id: 'profile', label: 'AWS profile', type: 'text', placeholder: 'prod' },
      { id: 'region', label: 'Region', type: 'text', placeholder: 'us-east-1' },
    ],
    generate(v) {
      const op = s(v, 'op') || 'start-session'
      const profile = s(v, 'profile') ? ` --profile ${s(v, 'profile')}` : ''
      const region = s(v, 'region') ? ` --region ${s(v, 'region')}` : ''
      if (op === 'start-session') {
        return { parts: [`aws ssm start-session --target ${s(v, 'instance_id') || 'INSTANCE_ID'}${profile}${region}`] }
      }
      if (op === 'send-command') {
        return { parts: [
          `aws ssm send-command`,
          `  --instance-ids "${s(v, 'instance_id') || 'INSTANCE_ID'}"`,
          `  --document-name "AWS-RunShellScript"`,
          `  --parameters 'commands=["${s(v, 'command') || 'echo hello'}"]'${profile}${region}`,
        ]}
      }
      if (op === 'get-parameter') {
        let cmd = `aws ssm get-parameter --name "${s(v, 'param_name') || '/path/param'}"`
        if (b(v, 'with_decryption')) cmd += ' --with-decryption'
        cmd += `${profile}${region}`
        return { parts: [cmd] }
      }
      if (op === 'put-parameter') {
        return { parts: [`aws ssm put-parameter --name "${s(v, 'param_name') || '/path/param'}" --value "${s(v, 'param_value') || 'VALUE'}" --type SecureString --overwrite${profile}${region}`] }
      }
      return { parts: [`aws ssm get-parameters-by-path --path "${s(v, 'param_name') || '/prod'}" --recursive${b(v, 'with_decryption') ? ' --with-decryption' : ''}${profile}${region}`] }
    },
  },
  {
    id: 'aws-logs',
    name: 'aws logs (CloudWatch)',
    description: 'Query and tail CloudWatch log groups',
    category: 'awscli',
    fields: [
      { id: 'op', label: 'Operation', type: 'select', options: ['describe-log-groups', 'describe-log-streams', 'get-log-events', 'tail'], default: 'tail' },
      { id: 'log_group', label: 'Log group name *', type: 'text', placeholder: '/aws/lambda/my-function' },
      { id: 'stream', label: 'Log stream name', type: 'text', placeholder: '2024/01/01/[$LATEST]abc123' },
      { id: 'follow', label: 'Follow (--follow, for tail)', type: 'checkbox', default: true },
      { id: 'since', label: 'Since (for tail)', type: 'text', placeholder: '1h' },
      { id: 'filter', label: 'Filter pattern (--filter-pattern)', type: 'text', placeholder: 'ERROR' },
      { id: 'profile', label: 'AWS profile', type: 'text', placeholder: 'prod' },
      { id: 'region', label: 'Region', type: 'text', placeholder: 'us-east-1' },
    ],
    generate(v) {
      const op = s(v, 'op') || 'tail'
      const group = s(v, 'log_group') || 'LOG_GROUP'
      const profile = s(v, 'profile') ? ` --profile ${s(v, 'profile')}` : ''
      const region = s(v, 'region') ? ` --region ${s(v, 'region')}` : ''
      if (op === 'tail') {
        let cmd = `aws logs tail "${group}"`
        if (b(v, 'follow')) cmd += ' --follow'
        if (s(v, 'since')) cmd += ` --since ${s(v, 'since')}`
        if (s(v, 'filter')) cmd += ` --filter-pattern "${s(v, 'filter')}"`
        cmd += `${profile}${region}`
        return { parts: [cmd] }
      }
      if (op === 'describe-log-groups') {
        return { parts: [`aws logs describe-log-groups --log-group-name-prefix "${group}"${profile}${region}`] }
      }
      if (op === 'get-log-events') {
        let cmd = `aws logs get-log-events --log-group-name "${group}"`
        if (s(v, 'stream')) cmd += ` --log-stream-name "${s(v, 'stream')}"`
        cmd += `${profile}${region}`
        return { parts: [cmd] }
      }
      return { parts: [`aws logs describe-log-streams --log-group-name "${group}"${profile}${region}`] }
    },
  },
  {
    id: 'aws-iam',
    name: 'aws iam',
    description: 'IAM user, role, and policy management',
    category: 'awscli',
    fields: [
      { id: 'op', label: 'Operation', type: 'select', options: ['list-users', 'list-roles', 'list-policies', 'get-user', 'get-role', 'create-user', 'delete-user', 'attach-user-policy', 'list-attached-user-policies', 'get-caller-identity'], default: 'get-caller-identity' },
      { id: 'user', label: 'Username (--user-name)', type: 'text', placeholder: 'deploy-bot' },
      { id: 'role', label: 'Role name (--role-name)', type: 'text', placeholder: 'ECSTaskRole' },
      { id: 'policy_arn', label: 'Policy ARN', type: 'text', placeholder: 'arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess' },
      { id: 'profile', label: 'AWS profile', type: 'text', placeholder: 'prod' },
    ],
    generate(v) {
      const op = s(v, 'op') || 'get-caller-identity'
      const profile = s(v, 'profile') ? ` --profile ${s(v, 'profile')}` : ''
      let cmd = `aws iam ${op}`
      if (s(v, 'user') && op.includes('user')) cmd += ` --user-name ${s(v, 'user')}`
      if (s(v, 'role') && op.includes('role')) cmd += ` --role-name ${s(v, 'role')}`
      if (s(v, 'policy_arn') && op.includes('policy')) cmd += ` --policy-arn ${s(v, 'policy_arn')}`
      if (op === 'get-caller-identity') cmd = `aws sts get-caller-identity`
      cmd += profile
      return { parts: [cmd] }
    },
  },
  {
    id: 'aws-rds',
    name: 'aws rds',
    description: 'RDS instance management',
    category: 'awscli',
    fields: [
      { id: 'op', label: 'Operation', type: 'select', options: ['describe-db-instances', 'start-db-instance', 'stop-db-instance', 'reboot-db-instance', 'create-db-snapshot', 'describe-db-snapshots', 'restore-db-instance-from-db-snapshot'], default: 'describe-db-instances' },
      { id: 'db_id', label: 'DB instance identifier', type: 'text', placeholder: 'my-prod-db' },
      { id: 'snapshot_id', label: 'Snapshot identifier', type: 'text', placeholder: 'my-db-snapshot-2024' },
      { id: 'profile', label: 'AWS profile', type: 'text', placeholder: 'prod' },
      { id: 'region', label: 'Region', type: 'text', placeholder: 'us-east-1' },
    ],
    generate(v) {
      const op = s(v, 'op') || 'describe-db-instances'
      const profile = s(v, 'profile') ? ` --profile ${s(v, 'profile')}` : ''
      const region = s(v, 'region') ? ` --region ${s(v, 'region')}` : ''
      const dbId = s(v, 'db_id')
      const snapId = s(v, 'snapshot_id')
      let cmd = `aws rds ${op}`
      if (dbId && op !== 'describe-db-snapshots') cmd += ` --db-instance-identifier ${dbId}`
      if (op === 'create-db-snapshot' && snapId) cmd += ` --db-snapshot-identifier ${snapId}`
      if (op === 'restore-db-instance-from-db-snapshot' && snapId && dbId) {
        cmd += ` --db-snapshot-identifier ${snapId} --db-instance-identifier ${dbId}-restored`
      }
      cmd += `${profile}${region}`
      return { parts: [cmd] }
    },
  },
  {
    id: 'aws-lambda',
    name: 'aws lambda',
    description: 'Lambda function management and invocation',
    category: 'awscli',
    fields: [
      { id: 'op', label: 'Operation', type: 'select', options: ['list-functions', 'invoke', 'update-function-code', 'get-function', 'delete-function', 'list-aliases', 'publish-version'], default: 'list-functions' },
      { id: 'function', label: 'Function name', type: 'text', placeholder: 'my-lambda-fn' },
      { id: 'payload', label: 'Invoke payload (JSON)', type: 'text', placeholder: '{"key":"value"}' },
      { id: 'zip_file', label: 'Zip file (update-function-code)', type: 'text', placeholder: 'fileb://function.zip' },
      { id: 'profile', label: 'AWS profile', type: 'text', placeholder: 'prod' },
      { id: 'region', label: 'Region', type: 'text', placeholder: 'us-east-1' },
    ],
    generate(v) {
      const op = s(v, 'op') || 'list-functions'
      const fn = s(v, 'function')
      const profile = s(v, 'profile') ? ` --profile ${s(v, 'profile')}` : ''
      const region = s(v, 'region') ? ` --region ${s(v, 'region')}` : ''
      let cmd = `aws lambda ${op}`
      if (fn) cmd += ` --function-name ${fn}`
      if (op === 'invoke') {
        cmd += ` --payload '${s(v, 'payload') || '{}'}' /tmp/lambda-output.json`
      }
      if (op === 'update-function-code' && s(v, 'zip_file')) {
        cmd += ` --zip-file ${s(v, 'zip_file')}`
      }
      cmd += `${profile}${region}`
      return { parts: [cmd] }
    },
  },
]
