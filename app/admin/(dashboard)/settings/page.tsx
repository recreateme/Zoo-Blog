'use client'

import { useState, useEffect } from 'react'
import { Loader2, RefreshCw, CheckCircle, AlertCircle, Database, FolderSync, Bot, Search, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SyncStatus {
  contentFileCount: number
  dbPostCount: number
  fileBoundCount: number
  orphanCount: number
  parseErrorCount: number
  contentDir: string
  search?: {
    enabled: boolean
    documentCount: number | null
  }
  vector?: {
    enabled: boolean
    pointCount: number | null
  }
}

function StatusBadge({ enabled, onLabel, offLabel }: { enabled: boolean; onLabel: string; offLabel: string }) {
  return (
    <span className={cn('badge shrink-0', enabled ? 'admin-status-on' : 'admin-status-off')}>
      {enabled ? onLabel : offLabel}
    </span>
  )
}

export default function SettingsPage() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{
    success: boolean
    message: string
    errors?: string[]
    indexErrors?: string[]
  } | null>(null)
  const [reindexing, setReindexing] = useState(false)
  const [vectorReindexing, setVectorReindexing] = useState(false)
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
      setSyncResult({
        success: data.success,
        message: data.message ?? data.error,
        errors: data.errors,
        indexErrors: data.indexErrors,
      })
      if (data.success) fetchStatus()
    } catch {
      setSyncResult({ success: false, message: '同步请求失败' })
    }
    setSyncing(false)
  }

  const handleReindex = async () => {
    setReindexing(true)
    try {
      const res = await fetch('/api/search/reindex', { method: 'POST' })
      const data = await res.json()
      setSyncResult({
        success: data.success,
        message: data.success ? `搜索索引已重建：${data.indexed} 篇` : (data.error ?? '重建失败'),
      })
      if (data.success) fetchStatus()
    } catch {
      setSyncResult({ success: false, message: '索引重建请求失败' })
    }
    setReindexing(false)
  }

  const handleVectorReindex = async () => {
    if (!syncStatus?.vector?.enabled) {
      setSyncResult({
        success: false,
        message: 'RAG 未启用，请配置 QDRANT_URL 与 Embedding API 后重试',
      })
      return
    }

    if (!window.confirm('将清空并全量重建向量索引，可能需要数分钟。确定继续？')) {
      return
    }

    setVectorReindexing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/vector/reindex', { method: 'POST' })
      const data = await res.json()
      setSyncResult({
        success: data.success,
        message: data.success
          ? `向量索引已重建：${data.indexed} 篇 · ${data.chunks} 个向量块`
          : (data.error ?? '向量索引重建失败'),
      })
      if (data.success) fetchStatus()
    } catch {
      setSyncResult({ success: false, message: '向量索引重建请求失败' })
    }
    setVectorReindexing(false)
  }

  const envVars = [
    { key: 'LLM_PROVIDER', label: 'AI 提供商', desc: 'claude | openai | deepseek | ollama | openrouter' },
    { key: 'STORAGE_PROVIDER', label: '文件存储', desc: 'local | minio | s3' },
    { key: 'NEXT_PUBLIC_SITE_NAME', label: '站点名称', desc: '显示在博客标题' },
    { key: 'NEXT_PUBLIC_SITE_URL', label: '站点 URL', desc: 'https://yourdomain.com' },
  ]

  return (
    <div className="admin-page admin-page-narrow">
      <header className="admin-page-header">
        <h1 className="admin-page-title">系统设置</h1>
        <p className="admin-page-lead">内容同步、搜索与 RAG 向量索引（仅管理员）</p>
      </header>

      <section className="admin-section">
        <h2 className="admin-section-title">
          <FolderSync size={16} style={{ color: 'var(--accent)' }} />
          内容同步
        </h2>

        <div className="admin-panel">
          {loadingStatus ? (
            <div className="flex items-center gap-2 text-lead text-sm">
              <Loader2 size={14} className="animate-spin" /> 加载中...
            </div>
          ) : syncStatus ? (
            <div className="admin-stat-grid">
              <div>
                <p className="admin-stat-label">MD 文件</p>
                <p className="admin-stat-value">{syncStatus.contentFileCount}</p>
              </div>
              <div>
                <p className="admin-stat-label">数据库记录</p>
                <p className="admin-stat-value">{syncStatus.dbPostCount}</p>
              </div>
              <div>
                <p className="admin-stat-label">文件绑定</p>
                <p className="admin-stat-value">{syncStatus.fileBoundCount}</p>
              </div>
              <div>
                <p className="admin-stat-label">待清理</p>
                <p className={cn('admin-stat-value', syncStatus.orphanCount > 0 && 'admin-stat-value-warn')}>
                  {syncStatus.orphanCount}
                </p>
              </div>
              <div>
                <p className="admin-stat-label">解析失败</p>
                <p className={cn('admin-stat-value', syncStatus.parseErrorCount > 0 && 'admin-stat-value-warn')}>
                  {syncStatus.parseErrorCount}
                </p>
              </div>
            </div>
          ) : null}

          {syncResult && (
            <div
              className={cn(
                'admin-feedback',
                syncResult.success ? 'admin-feedback-success' : 'admin-feedback-error'
              )}
            >
              <div className="flex items-center gap-2">
                {syncResult.success ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                {syncResult.message}
              </div>
              {(syncResult.errors?.length ?? 0) > 0 && (
                <ul className="text-xs list-disc list-inside opacity-90 max-h-32 overflow-y-auto mt-2">
                  {syncResult.errors!.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              )}
              {(syncResult.indexErrors?.length ?? 0) > 0 && (
                <ul className="text-xs list-disc list-inside opacity-90 max-h-24 overflow-y-auto mt-2">
                  {syncResult.indexErrors!.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button onClick={handleSync} disabled={syncing} className="btn btn-primary text-sm">
              {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {syncing ? '同步中...' : '从文件系统同步'}
            </button>
            <button onClick={fetchStatus} className="btn btn-secondary text-sm">
              刷新状态
            </button>
            <button onClick={handleReindex} disabled={reindexing} className="btn btn-secondary text-sm">
              {reindexing ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              {reindexing ? '重建中...' : '重建搜索索引'}
            </button>
          </div>

          <div className="mt-4 space-y-2 text-xs text-meta">
            <p className="text-lead text-sm font-medium">同步策略（文件优先）</p>
            <ul className="list-disc list-inside space-y-1">
              <li>新 MD 文件 → 入库并绑定 filePath</li>
              <li>已绑定 filePath 的笔记 → 文件更新后覆盖数据库</li>
              <li>本地删除 MD 或 rsync --delete → 同步时删除对应 DB 记录</li>
              <li>同文件修改 slug → 删除旧 slug 记录，以新 slug 入库</li>
              <li>解析失败但文件仍在 → 保留 DB 记录，不会误删</li>
              <li>仅在后台创建、无 filePath 的记录 → 永不覆盖或删除</li>
              <li>同步后有变更时全量重建 Meilisearch 索引</li>
              <li>rsync 自动触发需在 .env 与 .sync.env 配置相同的 SYNC_SECRET</li>
            </ul>
            <p className="pt-1">
              目录：<span className="font-mono">{syncStatus?.contentDir ?? './content'}</span>
            </p>
          </div>
        </div>
      </section>

      <section className="admin-section">
        <h2 className="admin-section-title">
          <Search size={16} style={{ color: 'var(--accent)' }} />
          全文搜索
        </h2>
        <div className="admin-panel">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>
                Meilisearch
              </p>
              <p className="text-xs text-meta">
                {syncStatus?.search?.enabled
                  ? `已连接 · 索引文档 ${syncStatus.search.documentCount ?? '—'} 篇`
                  : '未配置 MEILISEARCH_HOST / MEILISEARCH_API_KEY，当前使用 SQLite 模糊搜索'}
              </p>
            </div>
            <StatusBadge
              enabled={!!syncStatus?.search?.enabled}
              onLabel="已启用"
              offLabel="SQLite 回退"
            />
          </div>
        </div>
      </section>

      <section className="admin-section">
        <h2 className="admin-section-title">
          <Brain size={16} style={{ color: 'var(--accent)' }} />
          RAG 向量索引
        </h2>
        <div className="admin-panel">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>
                Qdrant · /ask 语义问答
              </p>
              <p className="text-xs text-meta">
                {syncStatus?.vector?.enabled
                  ? `已连接 · 向量块 ${syncStatus.vector.pointCount ?? '—'} 个`
                  : '未配置 QDRANT_URL 或 Embedding API，问答页不可用'}
              </p>
            </div>
            <StatusBadge
              enabled={!!syncStatus?.vector?.enabled}
              onLabel="已启用"
              offLabel="未启用"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={handleVectorReindex}
              disabled={vectorReindexing || !syncStatus?.vector?.enabled}
              className="btn btn-secondary text-sm"
              title={syncStatus?.vector?.enabled ? undefined : '请先配置 QDRANT 与 Embedding'}
            >
              {vectorReindexing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Brain size={14} />
              )}
              {vectorReindexing ? '重建中...' : '重建向量索引'}
            </button>
            <button onClick={fetchStatus} className="btn btn-ghost text-sm">
              刷新状态
            </button>
          </div>

          <p className="text-xs text-meta mt-4">
            全量重建会清空 Qdrant 集合并重新向量化所有已发布笔记。切换 Embedding 模型/维度后必须执行此操作。
            同步与后台 CRUD 会自动增量更新向量；本操作仅管理员可用。
          </p>
        </div>
      </section>

      <section className="admin-section">
        <h2 className="admin-section-title">
          <Database size={16} style={{ color: 'var(--accent)' }} />
          数据库
        </h2>
        <div className="admin-panel">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>SQLite</p>
              <p className="text-xs text-meta">
                prisma/dev.db · 可迁移至 PostgreSQL（修改 DATABASE_URL 即可）
              </p>
            </div>
            <StatusBadge enabled onLabel="运行中" offLabel="离线" />
          </div>
        </div>
      </section>

      <section className="admin-section">
        <h2 className="admin-section-title">
          <Bot size={16} style={{ color: 'var(--accent)' }} />
          关键配置
        </h2>
        <div className="admin-panel p-0 overflow-hidden">
          {envVars.map((v) => (
            <div key={v.key} className="admin-config-row">
              <div className="flex-1">
                <p className="text-sm font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
                  {v.key}
                </p>
                <p className="text-xs text-meta">{v.desc}</p>
              </div>
              <p className="text-sm font-mono" style={{ color: 'var(--accent)' }}>
                {process.env[`NEXT_PUBLIC_${v.key.replace('NEXT_PUBLIC_', '')}`] ?? (
                  <span className="text-meta">（服务端变量，此处不展示）</span>
                )}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-meta mt-3">
          修改配置请编辑 .env 文件，然后重启服务。敏感变量仅在服务端可用，不会暴露到浏览器。
        </p>
      </section>

      <section>
        <h2 className="admin-section-title">本地笔记同步命令</h2>
        <div className="admin-panel-sunken">
          <p className="text-xs text-meta mb-2"># 配置后执行（一次性）</p>
          <p className="text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
            cp .sync.env.example .sync.env && nano .sync.env
          </p>
          <p className="text-xs text-meta mb-2"># 手动同步本地笔记到 VPS（含 --delete）</p>
          <p className="text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
            ./scripts/sync-local.sh
          </p>
          <p className="text-xs text-meta mb-2"># 同步后在后台「从文件系统同步」或等待自动触发</p>
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
            watch -n 30 ./scripts/sync-local.sh
          </p>
        </div>
      </section>
    </div>
  )
}
