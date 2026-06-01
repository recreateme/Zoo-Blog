'use client'

import { useState, useEffect } from 'react'
import { Loader2, RefreshCw, CheckCircle, AlertCircle, Database, FolderSync, Bot } from 'lucide-react'

interface SyncStatus {
  contentFileCount: number
  dbPostCount: number
  contentDir: string
}

export default function SettingsPage() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)

  const fetchStatus = async () => {
    setLoadingStatus(true)
    try {
      const res = await fetch('/api/sync')
      const data = await res.json()
      setSyncStatus(data)
    } catch { /* ignore */ }
    setLoadingStatus(false)
  }

  useEffect(() => { fetchStatus() }, [])

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      const data = await res.json()
      setSyncResult({ success: data.success, message: data.message ?? data.error })
      if (data.success) fetchStatus()
    } catch {
      setSyncResult({ success: false, message: '同步请求失败' })
    }
    setSyncing(false)
  }

  const envVars = [
    { key: 'LLM_PROVIDER', label: 'AI 提供商', desc: 'claude | openai | deepseek | ollama' },
    { key: 'STORAGE_PROVIDER', label: '文件存储', desc: 'local | minio | s3 | oss' },
    { key: 'NEXT_PUBLIC_SITE_NAME', label: '站点名称', desc: '显示在博客标题' },
    { key: 'NEXT_PUBLIC_SITE_URL', label: '站点 URL', desc: 'https://yourdomain.com' },
  ]

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <h1
        className="text-2xl mb-1"
        style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, color: 'var(--text-primary)' }}
      >
        系统设置
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text-tertiary)' }}>
        内容同步、环境配置与系统信息
      </p>

      {/* 内容同步 */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <FolderSync size={16} style={{ color: 'var(--accent)' }} />
          <h2 className="font-medium" style={{ color: 'var(--text-primary)' }}>内容同步</h2>
        </div>

        <div
          className="rounded-xl p-5"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
        >
          {loadingStatus ? (
            <div className="flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
              <Loader2 size={14} className="animate-spin" /> 加载中...
            </div>
          ) : syncStatus ? (
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>内容目录</p>
                <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {syncStatus.contentDir}
                </p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>MD 文件数</p>
                <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {syncStatus.contentFileCount}
                </p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>数据库记录</p>
                <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {syncStatus.dbPostCount}
                </p>
              </div>
            </div>
          ) : null}

          {syncResult && (
            <div
              className="flex items-center gap-2 p-3 rounded-lg mb-4 text-sm"
              style={{
                background: syncResult.success ? '#f0fdf4' : '#fef2f2',
                color: syncResult.success ? '#16a34a' : '#dc2626',
              }}
            >
              {syncResult.success ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
              {syncResult.message}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="btn btn-primary text-sm"
            >
              {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {syncing ? '同步中...' : '从文件系统同步'}
            </button>
            <button onClick={fetchStatus} className="btn btn-secondary text-sm">
              刷新状态
            </button>
          </div>

          <p className="text-xs mt-3" style={{ color: 'var(--text-tertiary)' }}>
            将 content/ 目录下的 Markdown 文件（尚未入库的）同步到数据库。
            本地 rsync 同步后点击此按钮可快速更新。
          </p>
        </div>
      </section>

      {/* 数据库信息 */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Database size={16} style={{ color: 'var(--accent)' }} />
          <h2 className="font-medium" style={{ color: 'var(--text-primary)' }}>数据库</h2>
        </div>
        <div
          className="rounded-xl p-5"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>SQLite</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                prisma/dev.db · 可迁移至 PostgreSQL（修改 DATABASE_URL 即可）
              </p>
            </div>
            <span
              className="badge"
              style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}
            >
              运行中
            </span>
          </div>
        </div>
      </section>

      {/* 环境变量预览 */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Bot size={16} style={{ color: 'var(--accent)' }} />
          <h2 className="font-medium" style={{ color: 'var(--text-primary)' }}>关键配置</h2>
        </div>
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border-subtle)' }}
        >
          {envVars.map((v, i) => (
            <div
              key={v.key}
              className="flex items-center gap-4 px-5 py-3"
              style={{
                background: 'var(--bg-elevated)',
                borderBottom: i < envVars.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              }}
            >
              <div className="flex-1">
                <p className="text-sm font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
                  {v.key}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{v.desc}</p>
              </div>
              <p className="text-sm font-mono" style={{ color: 'var(--accent)' }}>
                {process.env[`NEXT_PUBLIC_${v.key.replace('NEXT_PUBLIC_', '')}`] ??
                  <span style={{ color: 'var(--text-tertiary)' }}>（服务端变量，此处不展示）</span>
                }
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs mt-3" style={{ color: 'var(--text-tertiary)' }}>
          修改配置请编辑 .env 文件，然后重启服务。敏感变量仅在服务端可用，不会暴露到浏览器。
        </p>
      </section>

      {/* 本地同步命令 */}
      <section>
        <h2 className="font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
          本地笔记同步命令
        </h2>
        <div
          className="rounded-xl p-5"
          style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)' }}
        >
          <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}># 配置后执行（一次性）</p>
          <p className="text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
            cp .sync.env.example .sync.env && nano .sync.env
          </p>
          <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}># 手动同步本地笔记到 VPS</p>
          <p className="text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
            ./scripts/sync-local.sh
          </p>
          <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}># 每 30 秒自动同步（开发时使用）</p>
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
            watch -n 30 ./scripts/sync-local.sh
          </p>
        </div>
      </section>
    </div>
  )
}
