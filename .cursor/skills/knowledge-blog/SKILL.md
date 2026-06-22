---
name: knowledge-blog
description: >-
  Develop, deploy, and maintain the knowledge-blog Next.js project (v0.2.1).
  Covers content-sync, Meilisearch, Markdown pipeline, admin editor, rsync sync,
  and VPS operations. Use when working in this repo, planning features, fixing
  sync/search issues, writing frontmatter, or deploying to production.
---

# Knowledge Blog — Project Skill

Personal knowledge base on **Next.js 14 App Router + Prisma/SQLite + Meilisearch**.

## Architecture (read first)

```
content/*.md  ──sync──►  SQLite (Prisma)  ──index──►  Meilisearch
     ▲                         │
     │ rsync                   │ admin API
     └─────────────────────────┘
```

| Layer | Path | Notes |
|-------|------|-------|
| Public pages | `app/(public)/` | Home, category, post, search |
| Admin | `app/admin/` | Editor, posts, settings, files |
| Sync core | `lib/content-sync.ts` | SHA256 fingerprint, delete/slug drift |
| Search | `lib/search-index.ts` | Meilisearch first, SQLite fallback |
| Markdown | `lib/markdown.ts`, `lib/heading-slug.ts` | TOC slug must match `rehype-slug` |
| SEO | `lib/seo.ts`, `components/seo/JsonLd.tsx` | JSON-LD + og:image |
| Sync lock | `lib/sync-lock.ts` | File lock; 409 on concurrent POST /api/sync |

## Conventions

- **Content source**: `content/` is truth for file-bound posts; admin-only posts have no `filePath`
- **Delete**: `DELETE /api/posts/[slug]?deleteFile=1` removes MD when file-bound
- **Categories**: 7 presets in `lib/categories.ts` — do not add without migration plan
- **Frontmatter**: see `docs/WRITING.md` (`series`, `seriesOrder`, `outline`, tags)
- **Minimize diff**: match existing patterns; no over-engineering

## Commands

```bash
npm run dev              # local dev (3000 or 3001)
npm run build            # production build
npm test                 # Vitest 全量单元测试
npm run test:sync        # content-sync 测试
npm run search:reindex   # full Meilisearch rebuild
```

## Caching (0.2.2+)

- `lib/cached-queries.ts` — `unstable_cache` 包裹 Prisma 查询
- `lib/revalidate-content.ts` — 同步/CRUD 后调用
- `lib/view-count.ts` — 阅读量 30s 批量刷盘
- ISR: 首页/分类 300s，文章 3600s

```bash
./scripts/sync-local.sh          # Linux/macOS → VPS
.\scripts\sync-local.ps1         # Windows → VPS
```

## Env essentials

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | SQLite path |
| `SYNC_SECRET` | rsync script → `/api/sync` |
| `MEILISEARCH_HOST` / `MEILISEARCH_API_KEY` | Search |
| `NEXT_PUBLIC_SITE_URL` | SEO absolute URLs |

Local sync: copy `.sync.env.example` → `.sync.env` (gitignored).

## Verification checklist

After code changes:

1. `npm run test:sync`
2. `npm run build`
3. If sync/search touched: manual POST `/api/sync` or settings page

## Known gaps (do not assume implemented)

- `services/storage/minio.ts`, `s3.ts` — stubs only
- Qdrant in docker-compose — no app code (0.3.0 RAG)
- `resolveWikiLinks` — not wired to render
- `fuse.js` — unused dependency
- File sync lock — single-instance only (not Redis)

## Docs map

| Doc | When to read |
|-----|--------------|
| `docs/QUICKSTART.md` | Local setup |
| `docs/WRITING.md` | Frontmatter + sync workflow |
| `docs/CONFIGURATION.md` | All env vars |
| `docs/OPERATIONS.md` | Backup, migrate, troubleshoot |
| `docs/ARCHITECTURE.md` | System design (may lag code) |
| `CHANGELOG.md` | Version history + roadmap |

## Optimization priorities

See [reference.md](reference.md) for ranked backlog (P0–P3).
