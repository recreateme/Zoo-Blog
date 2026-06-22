/** 从任意组件唤起全局命令搜索（⌃K 面板） */
export const OPEN_COMMAND_SEARCH_EVENT = 'knowledge-blog:open-command-search'

export function openCommandSearch() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OPEN_COMMAND_SEARCH_EVENT))
  }
}
