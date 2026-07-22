/**
 * 一次性迁移：旧 category / 字符串 series → Series + PostSeries，并补齐空标签。
 * 另将非 ASCII 专题 id 改为 ascii，避免专题页 URL 编码导致 404。
 * 用法：npx tsx scripts/migrate-to-series.ts
 */
import {
  migrateLegacyCategoryAndSeries,
  migrateNonAsciiSeriesIds,
} from '../lib/series-ops'

async function main() {
  const result = await migrateLegacyCategoryAndSeries()
  console.log('[migrate-to-series]', result)
  const renamed = await migrateNonAsciiSeriesIds()
  console.log('[migrate-series-ids]', renamed)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
