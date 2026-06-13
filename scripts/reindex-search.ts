import { reindexAllPosts, searchPosts } from '../lib/search-index'

async function main() {
  const r = await reindexAllPosts()
  console.log('reindex:', r)
  const s = await searchPosts({ recent: true })
  console.log('search engine:', s.engine, 'total:', s.total)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
