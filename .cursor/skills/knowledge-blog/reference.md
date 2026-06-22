# Knowledge Blog — Optimization Backlog

> Generated from project audit + [anthropics/skills](https://github.com/anthropics/skills) workflow patterns.  
> Current version: **0.2.1**

## Completion snapshot

| Module | ~% | Status |
|--------|-----|--------|
| Public reading | 90% | Pagination, SEO, series nav done |
| Admin | 80% | Editor + AI + attach upload done |
| Sync pipeline | 85% | SHA256, lock, Windows script done |
| Search | 75% | Meilisearch + highlight; SQLite fallback weak |
| Storage (OSS) | 20% | local only |
| RAG / Graph | 5% | Qdrant container only |
| Tests / CI | 15% | `test:sync` only |

---

## P0 — 高影响（建议 0.2.2）

### 1. 渲染性能与缓存
- **问题**: `app/(public)/page.tsx`、`[category]/page.tsx` 使用 `force-dynamic`，每请求打 DB
- **方案**: 文章页 ISR `revalidate: 3600`；首页/分类页 `unstable_cache` 或短 revalidate
- **文件**: `app/(public)/page.tsx`, `app/(public)/[category]/page.tsx`, `app/(public)/post/[slug]/page.tsx`

### 2. 测试与 CI
- **问题**: 无 Vitest/Playwright；大改无安全网
- **方案**: Vitest 覆盖 `lib/content-sync.ts`, `lib/markdown.ts`, `lib/search-index.ts`；GitHub Actions `lint + test:sync + build`
- **Skill**: 使用 `webapp-testing` 做 E2E 冒烟（首页、搜索、登录）

### 3. 阅读量写入优化
- **问题**: `incrementViewCount` 同步写 SQLite，高并发锁竞争
- **方案**: 内存缓冲批量 flush，或迁 PostgreSQL
- **文件**: `app/(public)/post/[slug]/page.tsx`, `prisma/schema.prisma`

---

## P1 — 中高影响（0.3.0 前置）

### 4. 对象存储实现
- **问题**: `STORAGE_PROVIDER=minio|s3` 直接抛错
- **文件**: `services/storage/minio.ts`, `services/storage/s3.ts`

### 5. 搜索体验统一
- 移除或启用 `fuse.js`；更新 README「Fuse.js Phase1」描述
- Meilisearch 正文截断 12k（`CONTENT_INDEX_LIMIT`）— 考虑分段或摘要字段
- SQLite 回退：中文分词弱，设置页提示「请配置 Meilisearch」

### 6. 双向链接闭环
- 接入 `resolveWikiLinks` 到 `MarkdownRenderer`
- 同步时写入 `PostLink` 表
- **依赖**: 0.4.0 知识图谱

### 7. 文档与代码对齐
- 更新 `docs/ARCHITECTURE.md` 目录树（补 `lib/search-index.ts` 等）
- 统一 `DATABASE_URL` 示例路径

---

## P2 — 中等影响

### 8. 分布式同步锁
- `lib/sync-lock.ts` 文件锁不适配多实例 Docker
- 方案: Redis `SET NX` 或 DB advisory lock

### 9. 安全加固
- API Rate Limit（`middleware.ts` 或 Nginx 增强）
- 2FA、EDITOR 角色 RBAC（Schema 已有未 enforcement）

### 10. 分类页分页
- 首页已分页；分类页仍一次加载全部

---

## P3 — 路线图功能

### 11. RAG 0.3.0
- `services/ai/provider.ts` 实现 `embed`
- Qdrant 向量写入 + `/ask` 页面
- docker-compose qdrant 改为 `profiles: [rag]`

### 12. 知识图谱 0.4.0
- `PostLink` + D3 力导向图

### 13. 运维 0.5.0
- PageView 细粒度统计 vs 移除死模型
- 访问仪表盘

---

## Suggested release train

| Version | Focus |
|---------|-------|
| **0.2.2** | ISR/缓存 + Vitest + CI + 文档对齐 |
| **0.3.0** | RAG（Qdrant + embed + /ask） |
| **0.3.1** | MinIO/S3 存储 + 分布式 sync lock |
| **0.4.0** | 双向链接 + 知识图谱 |
| **0.5.0** | 统计、2FA、Rate Limit |

---

## Installed Agent Skills

| Skill | Source | Use when |
|-------|--------|----------|
| `knowledge-blog` | Project | Any work in this repo |
| `webapp-testing` | [anthropics/skills](https://github.com/anthropics/skills) | E2E / Playwright testing |
| `doc-coauthoring` | anthropics/skills | Writing docs / blog posts |
| `skill-creator` | anthropics/skills | Creating new skills |
| `frontend-design` | anthropics/skills | UI polish |
