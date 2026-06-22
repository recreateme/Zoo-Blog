import { reindexAllVectors, getVectorIndexStats } from '../lib/vector-index'

async function main() {
  const stats = await getVectorIndexStats()
  console.log('vector index before:', stats)

  const result = await reindexAllVectors()
  console.log('reindex:', result)

  const after = await getVectorIndexStats()
  console.log('vector index after:', after)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
