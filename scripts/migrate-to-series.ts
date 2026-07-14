/**
 * 一次性迁移：旧 category / 字符串 series → Series + PostSeries，并补齐空标签。
 * 用法：npx tsx scripts/migrate-to-series.ts
 */
import { migrateLegacyCategoryAndSeries } from '../lib/series-ops'

async function main() {
  const result = await migrateLegacyCategoryAndSeries()
  console.log('[migrate-to-series]', result)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
