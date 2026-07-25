import { describe, expect, it } from 'vitest'
import { decodeRouteParam, routeParamCandidates } from '@/lib/route-params'

describe('route-params', () => {
  it('decodes percent-encoded chinese slug', () => {
    const encoded = encodeURIComponent('最短路径算法')
    expect(decodeRouteParam(encoded)).toBe('最短路径算法')
    expect(routeParamCandidates(encoded)).toEqual([encoded, '最短路径算法'])
  })

  it('keeps plain slug', () => {
    expect(decodeRouteParam('vps-v2ray')).toBe('vps-v2ray')
    expect(routeParamCandidates('vps-v2ray')).toEqual(['vps-v2ray'])
  })
})
