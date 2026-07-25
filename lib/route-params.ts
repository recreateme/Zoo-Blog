/** 规范化动态路由参数（中文 slug 常以 percent-encoding 传入） */
export function decodeRouteParam(raw: string | undefined | null): string {
  const value = (raw ?? '').trim()
  if (!value) return ''
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/** 生成查找候选：原始值 + 解码值（去重） */
export function routeParamCandidates(raw: string | undefined | null): string[] {
  const value = (raw ?? '').trim()
  const out: string[] = []
  if (value) out.push(value)
  const decoded = decodeRouteParam(value)
  if (decoded && decoded !== value) out.push(decoded)
  return out
}
