/** 生成指向 Git 仓库中 Markdown 源的「编辑此页」链接 */
export function getEditOnGitHubUrl(filePath: string | null | undefined): string | null {
  const base = process.env.NEXT_PUBLIC_CONTENT_GITHUB_URL?.replace(/\/$/, '')
  if (!base || !filePath?.trim()) return null

  const normalized = filePath.startsWith('/') ? filePath.slice(1) : filePath
  const path = normalized.startsWith('content/')
    ? normalized
    : `content/${normalized}`

  return `${base}/${path}`
}
