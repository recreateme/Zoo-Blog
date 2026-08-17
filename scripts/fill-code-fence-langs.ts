/**
 * 一次性：给 content 下 Markdown 中未标注语言的围栏回填启发式语言。
 * 拿不准的保持空，交给 defaultLang: plaintext。
 *
 *   npx tsx scripts/fill-code-fence-langs.ts
 *   npx tsx scripts/fill-code-fence-langs.ts --dry-run
 */
import fs from 'fs'
import path from 'path'

const CONTENT_DIR = path.resolve(process.cwd(), 'content')
const DRY = process.argv.includes('--dry-run')

function guessLang(body: string): string | null {
  const lines = body.replace(/\r\n/g, '\n').split('\n')
  const nonempty = lines.map((l) => l.trim()).filter(Boolean)
  const first = nonempty[0] ?? ''
  const joined = nonempty.slice(0, 12).join('\n')

  if (/^(flowchart|graph|sequenceDiagram|classDiagram|erDiagram|stateDiagram|mindmap|gantt)\b/i.test(first)) {
    return 'mermaid'
  }
  if (/^#!\s*\/bin\/(ba)?sh\b/.test(first) || /^\$\s/.test(first)) return 'bash'
  if (/^(sudo |apt |yum |systemctl |ufw |nginx |docker |ssh |curl |wget |chmod |chown |export |source )/.test(first)) {
    return 'bash'
  }
  if (/^(Switch|Router|R\d+|SW-[\w-]+)[>#]/.test(first) || /\(config[^)]*\)#/.test(first)) {
    return 'shellsession'
  }
  if (/^(ipconfig\b|ping |arp -a|netstat |tracert |pathping |route print|netsh |nslookup)/i.test(first)) {
    return 'cmd'
  }
  if (/^(auto |iface |nameserver )/i.test(first)) return 'ini'
  if (/^(from |import |def |class |async def |if __name__)/.test(first)) return 'python'
  if (/\b(print\(|np\.|cv2\.|torch\.|plt\.|self\.)/.test(joined) && /[:\[\]]/.test(joined)) return 'python'
  if (/^(const |let |var |function |import \{|export )/.test(first)) return 'javascript'
  if (/^(interface |type |enum )/.test(first) && /[:{]/.test(joined)) return 'typescript'
  if (/^(\{|\[)\s*$/.test(first) && /"[^"]+"\s*:/.test(joined)) return 'json'
  if (/^(server\s*\{|location\s+|upstream\s+)/.test(first)) return 'nginx'
  if (/^<(Directory|VirtualHost|IfModule)\b/i.test(first)) return 'apache'
  if (/^(apiVersion:|kind:|---\s*$)/.test(first) && /:\s/.test(joined)) return 'yaml'
  if (/^SELECT\s+|CREATE\s+TABLE|INSERT\s+INTO/i.test(first)) return 'sql'
  if (/^(procedure |function )\w+\s*\(/i.test(first)) return null
  if (/←|→/.test(joined) && /^(for |while |if |return )/i.test(first)) return null
  if (/^[A-Za-z0-9_./+\- ]+(→|->)[A-Za-z0-9_./+\- ]+/.test(first) && nonempty.length <= 4) return null
  return null
}

function fillFences(src: string): { text: string; filled: number; skipped: number } {
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  let i = 0
  let filled = 0
  let skipped = 0
  const out: string[] = []

  while (i < lines.length) {
    const line = lines[i]
    const open = /^(```+)([a-zA-Z0-9_+-]*)\s*$/.exec(line)
    if (!open) {
      out.push(line)
      i += 1
      continue
    }
    const ticks = open[1]
    const lang = open[2]
    const body: string[] = []
    i += 1
    while (i < lines.length && lines[i] !== ticks) {
      body.push(lines[i])
      i += 1
    }
    let nextLang = lang
    if (!lang) {
      const guessed = guessLang(body.join('\n'))
      if (guessed) {
        nextLang = guessed
        filled += 1
      } else {
        skipped += 1
      }
    }
    out.push(`${ticks}${nextLang}`)
    out.push(...body)
    if (i < lines.length && lines[i] === ticks) {
      out.push(ticks)
      i += 1
    }
  }

  return { text: out.join('\n'), filled, skipped }
}

function walk(dir: string): string[] {
  const acc: string[] = []
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) acc.push(...walk(full))
    else if (ent.name.endsWith('.md')) acc.push(full)
  }
  return acc
}

function main() {
  const files = walk(CONTENT_DIR)
  let totalFilled = 0
  let totalSkipped = 0
  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8')
    const { text, filled, skipped } = fillFences(raw)
    totalFilled += filled
    totalSkipped += skipped
    if (filled > 0) {
      const rel = path.relative(CONTENT_DIR, file)
      console.log(`${rel}: +${filled} lang, skip ${skipped}`)
      if (!DRY) {
        const ending = raw.endsWith('\n') ? '\n' : ''
        fs.writeFileSync(file, text.endsWith('\n') ? text : text + ending, 'utf8')
      }
    }
  }
  console.log(
    `${DRY ? '[dry-run] ' : ''}filled ${totalFilled}, left unlabeled ${totalSkipped} (plaintext fallback)`
  )
}

main()
