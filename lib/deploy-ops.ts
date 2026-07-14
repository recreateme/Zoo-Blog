import { spawn } from 'child_process'
import fs from 'fs/promises'
import path from 'path'

const ROOT = process.cwd()
const DEPLOY_ENV_FILE = path.join(ROOT, '.deploy.env')

export type DeployAction = 'git-sync' | 'deploy-vps'

export interface DeployStatus {
  gitReady: boolean
  vpsReady: boolean
  deployHookConfigured: boolean
  localScriptReady: boolean
  /** 是否检测到 .deploy.env（不含任何密钥内容） */
  deployEnvFilePresent: boolean
  hints: string[]
  last?: DeployRunResult | null
}

export interface DeployRunResult {
  action: DeployAction
  success: boolean
  message: string
  output?: string
  startedAt: string
  finishedAt: string
  actor?: string | null
}

let lastRun: DeployRunResult | null = null

export function getLastDeployRun(): DeployRunResult | null {
  return lastRun
}

function parseEnvText(text: string): Record<string, string> {
  const cfg: Record<string, string> = {}
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const i = trimmed.indexOf('=')
    const k = trimmed.slice(0, i).trim()
    let v = trimmed.slice(i + 1).trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    cfg[k] = v
  }
  return cfg
}

/** 合并 .deploy.env 与 process.env（后者优先） */
export async function loadDeployConfig(): Promise<Record<string, string>> {
  let fromFile: Record<string, string> = {}
  try {
    const text = await fs.readFile(DEPLOY_ENV_FILE, 'utf-8')
    fromFile = parseEnvText(text)
  } catch {
    // 无文件时仅用环境变量
  }

  const keys = [
    'VPS_HOST',
    'VPS_USER',
    'VPS_PASSWORD',
    'VPS_PORT',
    'VPS_REPO_DIR',
    'COMPOSE_ARGS',
    'TRIGGER_SYNC',
    'DEPLOY_HOOK_URL',
    'DEPLOY_HOOK_TOKEN',
    'GIT_SYNC_PATHS',
    'GIT_REMOTE',
    'GIT_BRANCH',
  ]

  const out = { ...fromFile }
  for (const k of keys) {
    const envVal = process.env[k]
    if (envVal != null && envVal !== '') out[k] = envVal
  }
  return out
}

export async function getDeployStatus(): Promise<DeployStatus> {
  const cfg = await loadDeployConfig()
  let deployEnvFilePresent = false
  try {
    await fs.access(DEPLOY_ENV_FILE)
    deployEnvFilePresent = true
  } catch {
    deployEnvFilePresent = false
  }

  const hasGitDir = await fs
    .access(path.join(ROOT, '.git'))
    .then(() => true)
    .catch(() => false)

  const scriptPath = path.join(ROOT, 'scripts', 'deploy-vps.py')
  const localScriptReady = await fs
    .access(scriptPath)
    .then(() => true)
    .catch(() => false)

  const deployHookConfigured = Boolean(cfg.DEPLOY_HOOK_URL?.trim())
  const vpsCreds = Boolean(cfg.VPS_HOST?.trim() && cfg.VPS_PASSWORD?.trim())
  const vpsReady = deployHookConfigured || (localScriptReady && vpsCreds)

  const hints: string[] = []
  if (!hasGitDir) hints.push('当前目录不是 git 仓库，无法推送 GitHub')
  if (!deployEnvFilePresent && !deployHookConfigured && !vpsCreds) {
    hints.push('未找到 .deploy.env，也未配置 DEPLOY_HOOK_URL / VPS_HOST')
  }
  if (vpsCreds && !localScriptReady) {
    hints.push('已配置 VPS 凭据，但缺少 scripts/deploy-vps.py')
  }
  if (!vpsReady) {
    hints.push('VPS 部署未就绪：配置 .deploy.env 或 DEPLOY_HOOK_URL')
  }

  return {
    gitReady: hasGitDir,
    vpsReady,
    deployHookConfigured,
    localScriptReady,
    deployEnvFilePresent,
    hints,
    last: lastRun,
  }
}

function runCommand(
  command: string,
  args: string[],
  timeoutMs: number
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      shell: true,
      env: process.env,
      windowsHide: true,
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      resolve({ code: 124, stdout, stderr: stderr + '\n[timeout]' })
    }, timeoutMs)

    child.stdout?.on('data', (d) => {
      stdout += String(d)
    })
    child.stderr?.on('data', (d) => {
      stderr += String(d)
    })
    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({ code: 1, stdout, stderr: String(err) })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ code: code ?? 1, stdout, stderr })
    })
  })
}

function clip(s: string, max = 8000): string {
  if (s.length <= max) return s
  return `${s.slice(0, max)}\n…(truncated)`
}

/** git add → commit → push（无变更时视为成功跳过） */
export async function runGitSync(options: {
  message?: string
  actor?: string | null
}): Promise<DeployRunResult> {
  const startedAt = new Date().toISOString()
  const cfg = await loadDeployConfig()
  const remote = cfg.GIT_REMOTE?.trim() || 'origin'
  const branch = cfg.GIT_BRANCH?.trim() || 'main'
  const paths = (cfg.GIT_SYNC_PATHS || 'content public/images')
    .split(/[\s,]+/)
    .map((p) => p.trim())
    .filter(Boolean)

  const add = await runCommand('git', ['add', '--', ...paths], 60_000)
  if (add.code !== 0) {
    const result: DeployRunResult = {
      action: 'git-sync',
      success: false,
      message: 'git add 失败',
      output: clip(add.stderr || add.stdout),
      startedAt,
      finishedAt: new Date().toISOString(),
      actor: options.actor,
    }
    lastRun = result
    return result
  }

  const status = await runCommand('git', ['status', '--porcelain', '--', ...paths], 30_000)
  const staged = await runCommand('git', ['diff', '--cached', '--name-only'], 30_000)
  const hasStaged = staged.stdout.trim().length > 0

  if (!hasStaged && !status.stdout.trim()) {
    const result: DeployRunResult = {
      action: 'git-sync',
      success: true,
      message: '无内容变更，已跳过 commit/push',
      output: clip(status.stdout),
      startedAt,
      finishedAt: new Date().toISOString(),
      actor: options.actor,
    }
    lastRun = result
    return result
  }

  if (!hasStaged) {
    // 工作区有改动但未进暂存（路径外）——仅提示
    const result: DeployRunResult = {
      action: 'git-sync',
      success: true,
      message: `监控路径无暂存变更（${paths.join(', ')}）`,
      output: clip(status.stdout),
      startedAt,
      finishedAt: new Date().toISOString(),
      actor: options.actor,
    }
    lastRun = result
    return result
  }

  const msg =
    options.message?.trim() ||
    `chore: publish content ${new Date().toISOString().slice(0, 10)}`
  const commit = await runCommand('git', ['commit', '-m', msg], 60_000)
  if (commit.code !== 0) {
    const result: DeployRunResult = {
      action: 'git-sync',
      success: false,
      message: 'git commit 失败',
      output: clip(commit.stderr || commit.stdout),
      startedAt,
      finishedAt: new Date().toISOString(),
      actor: options.actor,
    }
    lastRun = result
    return result
  }

  const push = await runCommand('git', ['push', remote, branch], 120_000)
  const result: DeployRunResult = {
    action: 'git-sync',
    success: push.code === 0,
    message: push.code === 0 ? `已推送到 ${remote}/${branch}` : 'git push 失败',
    output: clip([commit.stdout, push.stdout, push.stderr].filter(Boolean).join('\n')),
    startedAt,
    finishedAt: new Date().toISOString(),
    actor: options.actor,
  }
  lastRun = result
  return result
}

/** 触发 VPS 部署：优先 DEPLOY_HOOK_URL，否则执行 scripts/deploy-vps.py */
export async function runDeployVps(options: {
  actor?: string | null
}): Promise<DeployRunResult> {
  const startedAt = new Date().toISOString()
  const cfg = await loadDeployConfig()
  const hook = cfg.DEPLOY_HOOK_URL?.trim()

  if (hook) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (cfg.DEPLOY_HOOK_TOKEN) {
        headers.Authorization = `Bearer ${cfg.DEPLOY_HOOK_TOKEN}`
      }
      const res = await fetch(hook, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'deploy-vps',
          actor: options.actor ?? null,
          at: startedAt,
        }),
      })
      const text = await res.text()
      const result: DeployRunResult = {
        action: 'deploy-vps',
        success: res.ok,
        message: res.ok ? '已触发 DEPLOY_HOOK_URL' : `Hook 返回 ${res.status}`,
        output: clip(text),
        startedAt,
        finishedAt: new Date().toISOString(),
        actor: options.actor,
      }
      lastRun = result
      return result
    } catch (err) {
      const result: DeployRunResult = {
        action: 'deploy-vps',
        success: false,
        message: '调用 DEPLOY_HOOK_URL 失败',
        output: clip(String(err)),
        startedAt,
        finishedAt: new Date().toISOString(),
        actor: options.actor,
      }
      lastRun = result
      return result
    }
  }

  if (!cfg.VPS_HOST?.trim() || !cfg.VPS_PASSWORD?.trim()) {
    const result: DeployRunResult = {
      action: 'deploy-vps',
      success: false,
      message: '未配置 VPS 凭据或 DEPLOY_HOOK_URL',
      startedAt,
      finishedAt: new Date().toISOString(),
      actor: options.actor,
    }
    lastRun = result
    return result
  }

  const script = path.join(ROOT, 'scripts', 'deploy-vps.py')
  const py = process.env.PYTHON || process.env.PYTHON_PATH || 'python'
  const run = await runCommand(py, [script], 900_000)
  const result: DeployRunResult = {
    action: 'deploy-vps',
    success: run.code === 0,
    message: run.code === 0 ? 'VPS 部署完成' : `部署脚本退出码 ${run.code}`,
    output: clip([run.stdout, run.stderr].filter(Boolean).join('\n')),
    startedAt,
    finishedAt: new Date().toISOString(),
    actor: options.actor,
  }
  lastRun = result
  return result
}
