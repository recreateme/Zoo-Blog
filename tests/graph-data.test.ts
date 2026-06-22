import { describe, it, expect } from 'vitest'
import {
  buildTagCooccurrenceLinks,
  buildTagGraphFromPosts,
  buildLinkGraphFromData,
  buildTimelineSteps,
  buildTimelineGraphFromData,
  filterGraphByTimelineStep,
  applyGraphFilters,
  collectSeriesOptions,
  linkKey,
  monthLabel,
} from '@/lib/graph-data'

const d = (iso: string) => new Date(iso)

describe('graph-data', () => {
  it('builds tag co-occurrence edges without duplicates', () => {
    const links = buildTagCooccurrenceLinks([
      ['ai', 'nlp', 'ai'],
      ['nlp', 'cv'],
    ])
    expect(links).toHaveLength(2)
    expect(links).toContainEqual({ source: 'ai', target: 'nlp' })
    expect(links).toContainEqual({ source: 'nlp', target: 'cv' })
  })

  it('builds tag graph nodes with degree', () => {
    const graph = buildTagGraphFromPosts([
      { id: 'a', title: 'A', category: 'ai', tags: '["ml","ai"]' },
      { id: 'b', title: 'B', category: 'ai', tags: '["ml"]' },
    ])
    expect(graph.view).toBe('tags')
    expect(graph.nodes.find((n) => n.id === 'ml')?.degree).toBe(2)
    expect(graph.stats.linkCount).toBe(1)
  })

  it('builds link graph from posts and PostLink rows', () => {
    const graph = buildLinkGraphFromData(
      [
        { id: 'a', title: 'A', category: 'ai', tags: '[]' },
        { id: 'b', title: 'B', category: 'web-dev', tags: '[]' },
      ],
      [{ fromPostId: 'a', toPostId: 'b' }]
    )
    expect(graph.stats.nodeCount).toBe(2)
    expect(graph.stats.linkCount).toBe(1)
    expect(graph.nodes.find((n) => n.id === 'a')?.degree).toBe(1)
  })

  it('ignores links to unpublished or missing posts', () => {
    const graph = buildLinkGraphFromData(
      [{ id: 'a', title: 'A', category: 'ai', tags: '[]' }],
      [{ fromPostId: 'a', toPostId: 'missing' }]
    )
    expect(graph.stats.linkCount).toBe(0)
  })

  it('builds monthly timeline steps cumulatively', () => {
    const posts = [
      {
        id: 'a',
        title: 'A',
        category: 'ai',
        tags: '[]',
        publishedAt: d('2024-01-15'),
        createdAt: d('2024-01-10'),
      },
      {
        id: 'b',
        title: 'B',
        category: 'ai',
        tags: '[]',
        publishedAt: d('2024-03-10'),
        createdAt: d('2024-03-01'),
      },
    ]
    const { steps } = buildTimelineSteps(posts, [{ fromPostId: 'a', toPostId: 'b' }])

    expect(steps).toHaveLength(2)
    expect(steps[0].label).toBe(monthLabel('2024-01'))
    expect(steps[0].nodeIds).toEqual(['a'])
    expect(steps[0].linkKeys).toHaveLength(0)

    expect(steps[1].nodeIds).toEqual(['a', 'b'])
    expect(steps[1].linkKeys).toEqual([linkKey('a', 'b')])
  })

  it('filters graph payload by timeline step', () => {
    const graph = buildTimelineGraphFromData(
      [
        {
          id: 'a',
          title: 'A',
          category: 'ai',
          tags: '[]',
          publishedAt: d('2024-01-15'),
          createdAt: d('2024-01-10'),
        },
        {
          id: 'b',
          title: 'B',
          category: 'ai',
          tags: '[]',
          publishedAt: d('2024-02-15'),
          createdAt: d('2024-02-01'),
        },
      ],
      [{ fromPostId: 'a', toPostId: 'b' }]
    )

    const early = filterGraphByTimelineStep(graph, 0)
    expect(early.nodes).toHaveLength(1)
    expect(early.links).toHaveLength(0)

    const later = filterGraphByTimelineStep(graph, 1)
    expect(later.nodes).toHaveLength(2)
    expect(later.links).toHaveLength(1)
  })

  it('filters by category and hides isolated nodes', () => {
    const graph = buildLinkGraphFromData(
      [
        { id: 'a', title: 'A', category: 'ai', series: 'RAG', tags: '[]' },
        { id: 'b', title: 'B', category: 'ai', tags: '[]' },
        { id: 'c', title: 'C', category: 'web-dev', tags: '[]' },
      ],
      [
        { fromPostId: 'a', toPostId: 'b' },
      ]
    )

    const byCat = applyGraphFilters(graph, { category: 'ai' })
    expect(byCat.nodes.map((n) => n.id).sort()).toEqual(['a', 'b'])
    expect(byCat.links).toHaveLength(1)

    const isolated = applyGraphFilters(graph, { category: 'ai', hideIsolated: true })
    expect(isolated.nodes.map((n) => n.id).sort()).toEqual(['a', 'b'])

    const lone = applyGraphFilters(graph, { category: 'web-dev', hideIsolated: true })
    expect(lone.nodes).toHaveLength(0)
  })

  it('filters tag graph by category metadata', () => {
    const graph = buildTagGraphFromPosts([
      { id: 'a', title: 'A', category: 'ai', series: null, tags: '["ml","nlp"]' },
      { id: 'b', title: 'B', category: 'web-dev', series: null, tags: '["css"]' },
    ])

    const filtered = applyGraphFilters(graph, { category: 'ai' })
    expect(filtered.nodes.map((n) => n.id).sort()).toEqual(['ml', 'nlp'])
    expect(collectSeriesOptions(graph.nodes)).toEqual([])
  })

  it('collects series from post nodes', () => {
    const graph = buildLinkGraphFromData(
      [
        { id: 'a', title: 'A', category: 'ai', series: 'OSPF', tags: '[]' },
        { id: 'b', title: 'B', category: 'ai', series: 'BGP', tags: '[]' },
      ],
      []
    )
    expect(collectSeriesOptions(graph.nodes)).toEqual(['BGP', 'OSPF'])
  })
})
