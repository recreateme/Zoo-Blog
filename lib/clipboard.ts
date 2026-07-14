/**
 * 复制文本到剪贴板。
 *
 * Clipboard API 仅在安全上下文可用（HTTPS / localhost）。
 * 通过 http://公网IP 访问时 navigator.clipboard 为 undefined，
 * 需回退到 textarea + document.execCommand('copy')。
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false

  if (typeof window !== 'undefined' && window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // 继续走回退
    }
  }

  return copyTextLegacy(text)
}

function copyTextLegacy(text: string): boolean {
  const active = document.activeElement as HTMLElement | null
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.top = '0'
  textarea.style.left = '0'
  textarea.style.width = '1px'
  textarea.style.height = '1px'
  textarea.style.padding = '0'
  textarea.style.border = 'none'
  textarea.style.outline = 'none'
  textarea.style.boxShadow = 'none'
  textarea.style.background = 'transparent'
  textarea.style.opacity = '0'
  textarea.style.zIndex = '-1'

  document.body.appendChild(textarea)

  const range = document.createRange()
  range.selectNodeContents(textarea)
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
  textarea.setSelectionRange(0, textarea.value.length)
  textarea.focus()

  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  } finally {
    selection?.removeAllRanges()
    textarea.remove()
    active?.focus?.()
  }
  return ok
}
