/** 是否允许未登录用户访问 /api/ask（默认 false，需登录） */
export function isAskPublic(): boolean {
  return process.env.ASK_PUBLIC === 'true'
}
