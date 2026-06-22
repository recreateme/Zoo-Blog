export const DEFAULT_SITE_NAME = 'PLAIN MLOG'
export const DEFAULT_SITE_DESCRIPTION = '学习笔记与技术沉淀'
export const HOME_NAV_LABEL = '所有内容'

export function getSiteName(): string {
  return process.env.NEXT_PUBLIC_SITE_NAME ?? DEFAULT_SITE_NAME
}

export function getSiteDescription(): string {
  return process.env.NEXT_PUBLIC_SITE_DESCRIPTION ?? DEFAULT_SITE_DESCRIPTION
}
