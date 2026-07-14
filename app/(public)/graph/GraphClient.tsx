'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Network, Play, Pause, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import KnowledgeGraph from '@/components/graph/KnowledgeGraph'
import EmptyState from '@/components/ui/EmptyState'
import {
  applyGraphFilters,
  collectSeriesOptions,
  EMPTY_GRAPH_FILTERS,
  filterGraphByTimelineStep,
  type GraphFilters,
  type GraphPayload,
  type GraphView,
} from '@/lib/graph-data'

export default function GraphClient() {
  const [view, setView] = useState<GraphView>('links')
  const [payload, setPayload] = useState<GraphPayload | null>(null)
  const [filters, setFilters] = useState<GraphFilters>(EMPTY_GRAPH_FILTERS)
  const [timelineStep, setTimelineStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const steps = payload?.timeline?.steps ?? []
  const maxStep = Math.max(0, steps.length - 1)

  useEffect(() => {
    setPlaying(false)
    setFilters(EMPTY_GRAPH_FILTERS)
  }, [view])

  useEffect(() => {
    if (view === 'timeline' && payload?.timeline?.steps.length) {
      setTimelineStep(payload.timeline.steps.length - 1)
    }
  }, [view, payload])

  const stopPlay = useCallback(() => {
    if (playRef.current) {
      clearInterval(playRef.current)
      playRef.current = null
    }
    setPlaying(false)
  }, [])

  const startPlay = useCallback(() => {
    if (steps.length < 2) return
    stopPlay()
    setTimelineStep(0)
    setPlaying(true)
    playRef.current = setInterval(() => {
      setTimelineStep((i) => {
        if (i >= maxStep) {
          stopPlay()
          return i
        }
        return i + 1
      })
    }, 900)
  }, [maxStep, steps.length, stopPlay])

  useEffect(() => () => stopPlay(), [stopPlay])

  const currentStep = steps[timelineStep]
  const loaded = payload !== null && payload.view === view
  const noData = loaded && payload.nodes.length === 0
  const noTimeline = view === 'timeline' && loaded && steps.length === 0
  const showEmpty = loaded && ((noData && view !== 'timeline') || noTimeline)

  const seriesOptions = useMemo(
    () => (loaded ? collectSeriesOptions(payload.nodes) : []),
    [loaded, payload]
  )

  const filteredStats = useMemo(() => {
    if (!loaded) return null
    let nodes = payload.nodes
    let links = payload.links
    if (view === 'timeline' && payload.timeline?.steps.length) {
      const sliced = filterGraphByTimelineStep(payload, timelineStep)
      nodes = sliced.nodes
      links = sliced.links
    }
    const filtered = applyGraphFilters({ nodes, links }, filters)
    return { nodes: filtered.nodes.length, links: filtered.links.length }
  }, [loaded, payload, view, timelineStep, filters])

  const hasActiveFilters = Boolean(filters.series || filters.hideIsolated)

  const setSeries = (series: string) => {
    setFilters((f) => ({
      ...f,
      series: series || undefined,
    }))
  }

  const toggleHideIsolated = () => {
    setFilters((f) => ({ ...f, hideIsolated: !f.hideIsolated }))
  }

  const clearFilters = () => setFilters(EMPTY_GRAPH_FILTERS)

  return (
    <div className="graph-page">
      <header className="graph-header">
        <h1 className="text-display text-2xl mb-1 flex items-center gap-2">
          <Network size={22} style={{ color: 'var(--accent)' }} />
          知识图谱
        </h1>
        <p className="text-lead text-sm">
          可视化笔记之间的 <code className="text-xs font-mono">[[双向链接]]</code>、标签关联与时间演化
        </p>
      </header>

      <div className="graph-toolbar">
        <div className="graph-view-tabs" role="tablist" aria-label="图谱视图">
          {(
            [
              ['links', '笔记链接'],
              ['tags', '标签关联'],
              ['timeline', '时间演化'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              className={cn('graph-view-tab', view === id && 'graph-view-tab-active')}
              onClick={() => setView(id)}
            >
              {label}
            </button>
          ))}
        </div>
        {filteredStats && (
          <p className="graph-stats">
            {filteredStats.nodes} 节点 · {filteredStats.links} 边
            {view === 'timeline' && currentStep ? ` · ${currentStep.label}` : ''}
            {hasActiveFilters ? ' · 已筛选' : ''}
          </p>
        )}
      </div>

      {loaded && !showEmpty && (
        <div className="graph-filters">
          <SlidersHorizontal size={14} className="shrink-0 text-meta" />
          {seriesOptions.length > 0 && (
            <select
              value={filters.series ?? ''}
              onChange={(e) => setSeries(e.target.value)}
              className="input graph-series-select"
              aria-label="按专题筛选"
            >
              <option value="">全部专题</option>
              {seriesOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={toggleHideIsolated}
            className={cn(
              'badge graph-filter-chip graph-filter-toggle',
              filters.hideIsolated && 'graph-filter-chip-active'
            )}
          >
            隐藏孤立节点
          </button>
          {hasActiveFilters && (
            <button type="button" onClick={clearFilters} className="btn btn-ghost text-xs px-2">
              清除
            </button>
          )}
        </div>
      )}

      {view === 'timeline' && steps.length > 0 && (
        <div className="graph-timeline-controls">
          <button
            type="button"
            className="btn btn-secondary text-sm px-3"
            onClick={() => (playing ? stopPlay() : startPlay())}
            disabled={steps.length < 2}
            aria-label={playing ? '暂停演化' : '播放演化'}
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
            {playing ? '暂停' : '播放'}
          </button>
          <input
            type="range"
            min={0}
            max={maxStep}
            value={timelineStep}
            onChange={(e) => {
              stopPlay()
              setTimelineStep(Number(e.target.value))
            }}
            className="graph-timeline-slider flex-1"
            aria-label="时间轴"
          />
          <span className="graph-timeline-label">{currentStep?.label ?? '—'}</span>
        </div>
      )}

      {!showEmpty && (
        <KnowledgeGraph
          view={view}
          timelineStep={timelineStep}
          filters={filters}
          onLoaded={setPayload}
        />
      )}

      {noTimeline && (
        <EmptyState
          compact
          title="暂无时间轴数据"
          description="发布笔记后将按月份累积展示知识网络的增长过程"
          actionHref="/admin/editor"
          actionLabel="新建笔记"
        />
      )}

      {noData && view !== 'timeline' && (
        <EmptyState
          compact
          title={view === 'tags' ? '暂无标签数据' : '暂无双向链接'}
          description={
            view === 'tags'
              ? '为笔记添加标签后，可在此查看标签共现网络'
              : '在 Markdown 中使用 [[笔记标题]] 语法链接其他笔记，同步后自动生成图谱'
          }
          actionHref={view === 'tags' ? '/admin/editor' : '/admin/settings'}
          actionLabel={view === 'tags' ? '新建笔记' : '前往同步'}
        />
      )}
    </div>
  )
}
