'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as d3 from 'd3'
import type { SimulationNodeDatum } from 'd3'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  applyGraphFilters,
  filterGraphByTimelineStep,
  type GraphFilters,
  type GraphLink,
  type GraphNode,
  type GraphPayload,
  type GraphView,
} from '@/lib/graph-data'

interface SimNode extends GraphNode, SimulationNodeDatum {
  x?: number
  y?: number
}

interface KnowledgeGraphProps {
  view: GraphView
  timelineStep?: number
  filters?: GraphFilters
  onLoaded?: (payload: GraphPayload) => void
}

export default function KnowledgeGraph({
  view,
  timelineStep = 0,
  filters = {},
  onLoaded,
}: KnowledgeGraphProps) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const simRef = useRef<d3.Simulation<SimNode, d3.SimulationLinkDatum<SimNode>> | null>(null)
  const onLoadedRef = useRef(onLoaded)
  onLoadedRef.current = onLoaded
  const [rawData, setRawData] = useState<GraphPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [size, setSize] = useState({ width: 800, height: 500 })

  const displayData = useMemo(() => {
    if (!rawData) return null

    let nodes = rawData.nodes
    let links = rawData.links

    if (view === 'timeline' && rawData.timeline?.steps.length) {
      const sliced = filterGraphByTimelineStep(rawData, timelineStep)
      nodes = sliced.nodes
      links = sliced.links
    }

    const filtered = applyGraphFilters({ nodes, links }, filters)

    return {
      ...rawData,
      nodes: filtered.nodes,
      links: filtered.links,
      stats: { nodeCount: filtered.nodes.length, linkCount: filtered.links.length },
    }
  }, [rawData, view, timelineStep, filters])

  const loadData = useCallback(async (v: GraphView) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/graph?view=${v}`)
      if (!res.ok) throw new Error('load failed')
      const payload = (await res.json()) as GraphPayload
      setRawData(payload)
      onLoadedRef.current?.(payload)
    } catch {
      setError('图谱数据加载失败')
      setRawData(null)
      onLoadedRef.current?.({ view: v, nodes: [], links: [], stats: { nodeCount: 0, linkCount: 0 } })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData(view)
  }, [view, loadData])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) setSize({ width, height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const data = displayData
    if (!data || !svgRef.current || data.nodes.length === 0) return

    simRef.current?.stop()

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const g = svg.append('g').attr('class', 'graph-root')

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.35, 2.5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom)

    const nodes: SimNode[] = data.nodes.map((n) => ({ ...n }))
    const nodeById = new Map(nodes.map((n) => [n.id, n]))

    const simLinks = data.links.reduce<d3.SimulationLinkDatum<SimNode>[]>((acc, l) => {
      const source = nodeById.get(l.source)
      const target = nodeById.get(l.target)
      if (source && target) acc.push({ source, target })
      return acc
    }, [])

    const linkSelection = g
      .append('g')
      .attr('class', 'graph-links')
      .selectAll('line')
      .data(simLinks)
      .join('line')
      .attr('class', 'graph-edge')

    const nodeSelection = g
      .append('g')
      .attr('class', 'graph-nodes')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')

    nodeSelection.each(function (d) {
      const group = d3.select(this)
      const fo = group
        .append('foreignObject')
        .attr('x', -60)
        .attr('y', -20)
        .attr('width', 120)
        .attr('height', 40)

      fo.append('xhtml:div')
        .attr('xmlns', 'http://www.w3.org/1999/xhtml')
        .attr('class', cn(
          'graph-node',
          d.kind === 'tag' && 'graph-node-tag',
          d.category && `badge-cat-${d.category}`
        ))
        .text(d.label)
    })

    const isTagView = view === 'tags'
    const sim = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink<SimNode, d3.SimulationLinkDatum<SimNode>>(simLinks)
          .id((d) => d.id)
          .distance(isTagView ? 70 : 100)
      )
      .force('charge', d3.forceManyBody().strength(isTagView ? -180 : -220))
      .force('center', d3.forceCenter(size.width / 2, size.height / 2))
      .force('collision', d3.forceCollide().radius(48))

    const dragBehavior = d3
      .drag<SVGGElement, SimNode>()
      .on('start', (event, d) => {
        if (!event.active) sim.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) sim.alphaTarget(0)
        d.fx = null
        d.fy = null
      })

    nodeSelection.call(dragBehavior as never)

    const highlight = (id: string | null) => {
      setActiveId(id)
      const neighborIds = new Set<string>()
      if (id) {
        neighborIds.add(id)
        for (const l of simLinks) {
          const s = l.source as SimNode
          const t = l.target as SimNode
          if (s.id === id) neighborIds.add(t.id)
          if (t.id === id) neighborIds.add(s.id)
        }
      }

      linkSelection.attr('class', (l) => {
        if (!id) return 'graph-edge'
        const s = l.source as SimNode
        const t = l.target as SimNode
        return s.id === id || t.id === id ? 'graph-edge graph-edge-highlight' : 'graph-edge graph-edge-dimmed'
      })

      nodeSelection.select('foreignObject div').attr('class', (d) =>
        cn(
          'graph-node',
          d.kind === 'tag' && 'graph-node-tag',
          d.category && `badge-cat-${d.category}`,
          id && (d.id === id || neighborIds.has(d.id)) && 'graph-node-active'
        )
      )
    }

    nodeSelection
      .on('mouseenter', (_, d) => highlight(d.id))
      .on('mouseleave', () => highlight(null))
      .on('click', (_, d) => {
        if (d.kind === 'tag') {
          router.push(`/search?tag=${encodeURIComponent(d.id)}`)
        } else {
          router.push(`/post/${d.id}`)
        }
      })

    sim.on('tick', () => {
      linkSelection
        .attr('x1', (d) => (d.source as SimNode).x ?? 0)
        .attr('y1', (d) => (d.source as SimNode).y ?? 0)
        .attr('x2', (d) => (d.target as SimNode).x ?? 0)
        .attr('y2', (d) => (d.target as SimNode).y ?? 0)

      nodeSelection.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    simRef.current = sim

    return () => {
      sim.stop()
      simRef.current = null
    }
  }, [displayData, size.width, size.height, view, router])

  const hintViewLabel =
    view === 'tags' ? '标签' : view === 'timeline' ? '笔记' : '笔记'

  const showEmptyCanvas = !loading && displayData && displayData.nodes.length === 0

  return (
    <div ref={containerRef} className="graph-canvas-wrap">
      {(loading || !displayData) && !error && (
        <div className="graph-loading">
          <Loader2 size={18} className="animate-spin" />
          加载图谱…
        </div>
      )}
      {error && <div className="graph-loading">{error}</div>}
      {showEmptyCanvas && (
        <div className="graph-loading">
          {rawData && rawData.nodes.length > 0 ? '无符合筛选条件的节点' : '该时段尚无已发布笔记'}
        </div>
      )}
      <svg ref={svgRef} viewBox={`0 0 ${size.width} ${size.height}`} aria-label="知识图谱" />
      {displayData && displayData.nodes.length > 0 && (
        <p className="graph-hint absolute bottom-2 left-0 right-0 pointer-events-none">
          拖拽节点 · 滚轮缩放 · 点击{hintViewLabel}跳转
          {activeId ? ` · 高亮：${displayData.nodes.find((n) => n.id === activeId)?.label ?? ''}` : ''}
        </p>
      )}
    </div>
  )
}
