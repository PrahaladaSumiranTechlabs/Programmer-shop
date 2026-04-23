import { Category, Command } from '../types'
import { gitCommands } from './git'
import { dockerCommands } from './docker'
import { kubernetesCommands } from './kubernetes'
import { curlCommands } from './curl'
import { sshCommands } from './ssh'
import { packageCommands } from './packages'
import { databaseCommands } from './database'
import { filesystemCommands } from './filesystem'
import { systemCommands } from './system'
import { linuxCommands } from './linux'
import { windowsCommands } from './windows'
import { terraformCommands } from './terraform'
import { nginxCommands } from './nginx'
import { redisCommands } from './redis'
import { awsCommands } from './awscli'

export const categories: Category[] = [
  { id: 'git',        name: 'Git',            icon: '🌿', description: 'Version control' },
  { id: 'docker',     name: 'Docker',         icon: '🐳', description: 'Containers' },
  { id: 'kubernetes', name: 'Kubernetes',     icon: '☸',  description: 'K8s cluster' },
  { id: 'curl',       name: 'cURL',           icon: '🌐', description: 'HTTP requests' },
  { id: 'ssh',        name: 'SSH & SCP',      icon: '🔒', description: 'Remote access' },
  { id: 'packages',   name: 'Packages',       icon: '📦', description: 'npm, yarn, pip' },
  { id: 'database',   name: 'Database',       icon: '🗄',  description: 'psql, mysql' },
  { id: 'filesystem', name: 'Filesystem',     icon: '📂', description: 'find, grep, tar, rsync' },
  { id: 'linux',      name: 'Linux',          icon: '🐧', description: 'System admin & networking' },
  { id: 'windows',    name: 'Windows',        icon: '🪟', description: 'Server admin & PowerShell' },
  { id: 'terraform',  name: 'Terraform',      icon: '🏗',  description: 'IaC — plan, apply, state' },
  { id: 'nginx',      name: 'Nginx / Apache', icon: '🔀', description: 'Web server & proxy' },
  { id: 'redis',      name: 'Redis',          icon: '🟥', description: 'Cache & pub/sub' },
  { id: 'awscli',     name: 'AWS CLI',        icon: '☁',  description: 'S3, EC2, Lambda, ECS' },
  { id: 'system',     name: 'System',         icon: '⚙',  description: 'Ports, processes, cron' },
]

export const allCommands: Command[] = [
  ...gitCommands,
  ...dockerCommands,
  ...kubernetesCommands,
  ...curlCommands,
  ...sshCommands,
  ...packageCommands,
  ...databaseCommands,
  ...filesystemCommands,
  ...linuxCommands,
  ...windowsCommands,
  ...terraformCommands,
  ...nginxCommands,
  ...redisCommands,
  ...awsCommands,
  ...systemCommands,
]

export const commandsByCategory = (categoryId: string): Command[] =>
  allCommands.filter(c => c.category === categoryId)

export const findCommand = (id: string): Command | undefined =>
  allCommands.find(c => c.id === id)
