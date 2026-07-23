import { spawn } from 'child_process'
import fs from 'fs/promises'
import path from 'path'

const ROOT = process.cwd()
const DEPLOY_ENV_FILE = path.join(ROOT, '.deploy.env')

export type DeployAction = 'git-sync' | 'deploy-vps'
export type GitSyncMode = 'local' | 'hook' | 'none'

export interface DeployStatus {
  /** 是否可以发起 GitHub 推送（本地 .git 或 Hook） */
  gitReady: boolean
  /** 本机工作目录是否含 .git */
  gitLocalReady: boolean
  /** 是否配置了可用于 git-sync 的 Hook */
  gitSyncHookConfigured: boolean
  /** 实际推送路径 */
  gitSyncMode: GitSyncMode
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
  mode?: GitSyncMode | 'script'
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
    'GIT_SYNC_HOOK_URL',
    'GIT_SYNC_FORCE_HOOK',
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

function resolveGitSyncHookUrl(cfg: Record<string, string>): string {
  return (cfg.GIT_SYNC_HOOK_URL?.trim() || cfg.DEPLOY_HOOK_URL?.trim() || '')
}

function resolveGitSyncMode(
  hasGitDir: boolean,
  hookConfigured: boolean,
  forceHook: boolean
): GitSyncMode {
  if (forceHook && hookConfigured) return 'hook'
  if (hasGitDir) return 'local'
  if (hookConfigured) return 'hook'
  return 'none'
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
  const gitSyncHookConfigured = Boolean(resolveGitSyncHookUrl(cfg))
  const forceHook = (cfg.GIT_SYNC_FORCE_HOOK || '').toLowerCase() === 'true'
  const gitSyncMode = resolveGitSyncMode(hasGitDir, gitSyncHookConfigured, forceHook)
  const gitReady = gitSyncMode !== 'none'

  const vpsCreds = Boolean(cfg.VPS_HOST?.trim() && cfg.VPS_PASSWORD?.trim())
  const vpsReady = deployHookConfigured || (localScriptReady && vpsCreds)

  const hints: string[] = []
  if (gitSyncMode === 'none') {
    hints.push(
      'GitHub 推送未就绪：本地无 .git，且未配置 DEPLOY_HOOK_URL / GIT_SYNC_HOOK_URL（Docker 请在宿主机运行 scripts/admin-hook-server.py）'
    )
  } else if (gitSyncMode === 'hook') {
    hints.push('将通过宿主机 Hook 推送 content/ 与 public/images/ 到 GitHub')
  }
  if (!deployEnvFilePresent && !deployHookConfigured && !vpsCreds && !gitSyncHookConfigured) {
    hints.push('未找到 .deploy.env，也未配置 DEPLOY_HOOK_URL / VPS_HOST')
  }
  if (vpsCreds && !localScriptReady && !deployHookConfigured) {
    hints.push('已配置 VPS 凭据，但缺少 scripts/deploy-vps.py')
  }
  if (!vpsReady) {
    hints.push('VPS 部署未就绪：配置 .deploy.env 或 DEPLOY_HOOK_URL')
  }

  return {
    gitReady,
    gitLocalReady: hasGitDir,
    gitSyncHookConfigured,
    gitSyncMode,
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

async function callDeployHook(options: {
  url: string
  token?: string
  action: DeployAction
  actor?: string | null
  message?: string
  startedAt: string
  timeoutMs?: number
}): Promise<DeployRunResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 180_000)

  try {
    const res = await fetch(options.url, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        action: options.action,
        message: options.message ?? null,
        actor: options.actor ?? null,
        at: options.startedAt,
      }),
    })
    const text = await res.text()
    let parsed: { success?: boolean; message?: string; output?: string; error?: string } | null =
      null
    try {
      parsed = JSON.parse(text) as typeof parsed
    } catch {
      parsed = null
    }

    const success =
      parsed?.success === true || (parsed?.success == null && res.ok)
    const message =
      parsed?.message ||
      parsed?.error ||
      (res.ok ? `已触发 Hook（${options.action}）` : `Hook 返回 ${res.status}`)

    return {
      action: options.action,
      success,
      message,
      output: clip(parsed?.output || text),
      startedAt: options.startedAt,
      finishedAt: new Date().toISOString(),
      actor: options.actor,
      mode: 'hook',
    }
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError'
    return {
      action: options.action,
      success: false,
      message: aborted ? '调用 Hook 超时' : '调用 Hook 失败',
      output: clip(String(err)),
      startedAt: options.startedAt,
      finishedAt: new Date().toISOString(),
      actor: options.actor,
      mode: 'hook',
    }
  } finally {
    clearTimeout(timer)
  }
}

async function runGitSyncLocal(options: {
  message?: string
  actor?: string | null
  startedAt: string
  cfg: Record<string, string>
}): Promise<DeployRunResult> {
  const remote = options.cfg.GIT_REMOTE?.trim() || 'origin'
  const branch = options.cfg.GIT_BRANCH?.trim() || 'main'
  const paths = (options.cfg.GIT_SYNC_PATHS || 'content public/images')
    .split(/[\s,]+/)
    .map((p) => p.trim())
    .filter(Boolean)

  const add = await runCommand('git', ['add', '--', ...paths], 60_000)
  if (add.code !== 0) {
    return {
      action: 'git-sync',
      success: false,
      message: 'git add 失败',
      output: clip(add.stderr || add.stdout),
      startedAt: options.startedAt,
      finishedAt: new Date().toISOString(),
      actor: options.actor,
      mode: 'local',
    }
  }

  const status = await runCommand('git', ['status', '--porcelain', '--', ...paths], 30_000)
  const staged = await runCommand('git', ['diff', '--cached', '--name-only'], 30_000)
  const hasStaged = staged.stdout.trim().length > 0

  if (!hasStaged && !status.stdout.trim()) {
    return {
      action: 'git-sync',
      success: true,
      message: '无内容变更，已跳过 commit/push',
      output: clip(status.stdout),
      startedAt: options.startedAt,
      finishedAt: new Date().toISOString(),
      actor: options.actor,
      mode: 'local',
    }
  }

  if (!hasStaged) {
    return {
      action: 'git-sync',
      success: true,
      message: `监控路径无暂存变更（${paths.join(', ')}）`,
      output: clip(status.stdout),
      startedAt: options.startedAt,
      finishedAt: new Date().toISOString(),
      actor: options.actor,
      mode: 'local',
    }
  }

  const msg =
    options.message?.trim() ||
    `chore: publish content ${new Date().toISOString().slice(0, 10)}`
  const commit = await runCommand('git', ['commit', '-m', msg], 60_000)
  if (commit.code !== 0) {
    return {
      action: 'git-sync',
      success: false,
      message: 'git commit 失败',
      output: clip(commit.stderr || commit.stdout),
      startedAt: options.startedAt,
      finishedAt: new Date().toISOString(),
      actor: options.actor,
      mode: 'local',
    }
  }

  const push = await runCommand('git', ['push', remote, branch], 120_000)
  return {
    action: 'git-sync',
    success: push.code === 0,
    message: push.code === 0 ? `已推送到 ${remote}/${branch}` : 'git push 失败',
    output: clip([commit.stdout, push.stdout, push.stderr].filter(Boolean).join('\n')),
    startedAt: options.startedAt,
    finishedAt: new Date().toISOString(),
    actor: options.actor,
    mode: 'local',
  }
}

/** git add → commit → push；Docker 无 .git 时走宿主机 Hook */
export async function runGitSync(options: {
  message?: string
  actor?: string | null
}): Promise<DeployRunResult> {
  const startedAt = new Date().toISOString()
  const cfg = await loadDeployConfig()
  const status = await getDeployStatus()

  if (status.gitSyncMode === 'none') {
    const result: DeployRunResult = {
      action: 'git-sync',
      success: false,
      message:
        '无法推送：当前环境无 .git，且未配置 DEPLOY_HOOK_URL / GIT_SYNC_HOOK_URL',
      startedAt,
      finishedAt: new Date().toISOString(),
      actor: options.actor,
      mode: 'none',
    }
    lastRun = result
    return result
  }

  if (status.gitSyncMode === 'hook') {
    const hook = resolveGitSyncHookUrl(cfg)
    const result = await callDeployHook({
      url: hook,
      token: cfg.DEPLOY_HOOK_TOKEN,
      action: 'git-sync',
      actor: options.actor,
      message: options.message,
      startedAt,
      timeoutMs: 180_000,
    })
    lastRun = result
    return result
  }

  const result = await runGitSyncLocal({
    message: options.message,
    actor: options.actor,
    startedAt,
    cfg,
  })
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
    const result = await callDeployHook({
      url: hook,
      token: cfg.DEPLOY_HOOK_TOKEN,
      action: 'deploy-vps',
      actor: options.actor,
      startedAt,
      timeoutMs: 900_000,
    })
    if (result.success && result.message.startsWith('已触发 Hook')) {
      result.message = '已触发 DEPLOY_HOOK_URL'
    }
    lastRun = result
    return result
  }

  if (!cfg.VPS_HOST?.trim() || !cfg.VPS_PASSWORD?.trim()) {
    const result: DeployRunResult = {
      action: 'deploy-vps',
      success: false,
      message: '未配置 VPS 凭据或 DEPLOY_HOOK_URL',
      startedAt,
      finishedAt: new Date().toISOString(),
      actor: options.actor,
      mode: 'script',
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
    mode: 'script',
  }
  lastRun = result
  return result
}
